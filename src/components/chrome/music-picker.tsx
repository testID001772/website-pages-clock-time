import { Link } from "@tanstack/react-router";
import { Pause, Play, Radio, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { setAmbientVolume, startAmbient, stopAmbient } from "@/lib/ambient";
import { STATIC_SITE } from "@/lib/base-url";
import { useLocale } from "@/lib/i18n";
import {
  loadStaticTracks,
  playableTrackUrl,
  trackDurationLabel,
  trackLabel,
  type MusicTrack,
} from "@/lib/music";
import { formatInteger, formatPercent } from "@/lib/numbers";
import { readPref, writePref } from "@/lib/prefs";
import { listTracks } from "@/lib/server/music";
import { getMyProfile } from "@/lib/server/profiles";
import { MUSIC_PREF, playSfx } from "@/lib/sfx";
import { DEFAULT_VOLUME, readVolume, writeVolume } from "@/lib/volume";
import { isStaff } from "@/lib/types";

/** `m:ss` — the visitor's digits, like every other number in the app. */
const fmt = (seconds: number, locale: string) =>
  `${formatInteger(Math.floor(seconds / 60), locale)}:${formatInteger(Math.floor(seconds % 60), locale, 2)}`;

/**
 * Music button + playlist panel. The first row is the live generative ambience
 * (no file); below it is the library staff maintain in the admin music editor,
 * which ships with 30 starter tracks, three minutes each. Play state follows the
 * shared audio
 * intent (`clock-time-music`), so unpausing also re-enables the UI sound
 * effects. If a track fails to load, playback falls back to the live ambience
 * and the row is flagged.
 *
 * `STATIC_SITE` (the GitHub Pages build) has no `listTracks` to call, so the
 * panel reads the shipped `music/library.json` instead — same rows, no
 * database, and never an "ask staff to add tracks" link that cannot work.
 */
export function MusicPicker() {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  /** True when the signed-in visitor is staff and the library is empty. */
  const [canEdit, setCanEdit] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  /** 0–1, shared with the ambience and the UI effects. Full by default. */
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  /** null = the live generative ambience. */
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  /** Playback position of the current file track (live ambience has none). */
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const intentRef = useRef(true);
  const currentRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const playRef = useRef<(id: string | null) => void>(() => undefined);
  /** Latest library, readable from the audio handlers registered once. */
  const tracksRef = useRef<MusicTrack[]>([]);
  /** Track ids that already got their one automatic retry. */
  const retriedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const intent = readPref(MUSIC_PREF) !== "false";
    intentRef.current = intent;
    setMusicOn(intent);
    if (intent) startAmbient();

    const storedVolume = readVolume();
    setVolume(storedVolume);
    const audio = new Audio();
    audio.preload = "none"; // fetch a track only when it is picked
    audio.volume = storedVolume;
    audio.addEventListener("error", () => {
      const id = currentRef.current;
      if (id === null) return;
      // One automatic retry — flaky mobile networks often fail the first
      // fetch of a track and succeed immediately after.
      if (!retriedRef.current.has(id)) {
        retriedRef.current.add(id);
        const src = audio.getAttribute("src");
        window.setTimeout(() => {
          if (currentRef.current !== id || !intentRef.current || !src) return;
          audio.src = src; // fresh load, not the errored element state
          void audio.play().catch(() => undefined);
        }, 700);
        return;
      }
      setFailedId(id);
      setCurrentId(null);
      currentRef.current = null;
      // Keep the music alive: fall back to the live ambience.
      if (intentRef.current) startAmbient();
    });
    audio.addEventListener("timeupdate", () => {
      setElapsed(audio.currentTime);
      if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
    });
    audio.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
    });
    // A finished track advances to the next one (wrapping around the list).
    audio.addEventListener("ended", () => {
      const id = currentRef.current;
      if (id === null) return;
      const i = tracksRef.current.findIndex((track) => track.id === id);
      const next = tracksRef.current[(i + 1) % tracksRef.current.length];
      if (next) playRef.current(next.id);
    });
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.removeAttribute("src");
    };
  }, []);

  /**
   * Load the library every time the panel opens — that is what makes a track
   * added in the admin editor show up without reloading the page. An empty
   * library additionally asks whether this visitor may add tracks, so staff
   * get a link straight to the editor.
   */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadLibrary: () => Promise<MusicTrack[]> = STATIC_SITE
      ? loadStaticTracks
      : (listTracks as () => Promise<MusicTrack[]>);
    void loadLibrary()
      .then((next) => {
        if (cancelled) return;
        tracksRef.current = next;
        setTracks(next);
        if (next.length > 0 || STATIC_SITE) return;
        return getMyProfile()
          .then((profile) => {
            if (!cancelled) setCanEdit(isStaff(profile.role));
          })
          .catch(() => undefined);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /** Pick a track (null = live ambience). Always counts as intent to play. */
  const play = (id: string | null) => {
    if (id !== currentId) playSfx("pop");
    setFailedId((prev) => (prev === id ? null : prev));
    setCurrentId(id);
    currentRef.current = id;
    setElapsed(0);
    const track = tracksRef.current.find((item) => item.id === id);
    setDuration(track?.seconds ?? 0);
    if (!intentRef.current) {
      intentRef.current = true;
      setMusicOn(true);
      writePref(MUSIC_PREF, "true");
    }
    const audio = audioRef.current;
    if (id === null) {
      audio?.pause();
      if (audio) audio.removeAttribute("src");
      startAmbient();
      return;
    }
    stopAmbient();
    if (!track || !audio) return;
    audio.src = playableTrackUrl(track);
    void audio.play().catch(() => undefined);
  };
  playRef.current = play;
  tracksRef.current = tracks;

  // The file player and the generative ambience share one volume.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    setAmbientVolume(volume);
  }, [volume]);

  /** Slider handler: store the value, and let the sound change underneath it. */
  const onVolume = (next: number) => {
    const applied = writeVolume(next);
    setVolume(applied);
  };

  /** Click / tap on the seek bar jumps to that position. */
  const seekTo = (clientX: number, bar: HTMLElement) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
    setElapsed(audio.currentTime);
  };

  const onSeekKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const total = Number.isFinite(audio.duration) ? audio.duration : duration;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      audio.currentTime = Math.min(total, audio.currentTime + 2);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      audio.currentTime = Math.max(0, audio.currentTime - 2);
    } else if (e.key === "Home") {
      e.preventDefault();
      audio.currentTime = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      audio.currentTime = total;
    }
  };

  /** Pause/resume whatever is current — the shared audio intent. */
  const togglePlay = () => {
    const next = !musicOn;
    playSfx("click");
    intentRef.current = next;
    setMusicOn(next);
    writePref(MUSIC_PREF, String(next));
    const audio = audioRef.current;
    if (next) {
      if (currentRef.current === null) startAmbient();
      else if (audio) void audio.play().catch(() => undefined);
    } else {
      audio?.pause();
      stopAmbient();
    }
  };

  const rowClass = (current: boolean) => `music-option${current ? " current" : ""}`;
  const currentTrack = currentId ? tracks.find((track) => track.id === currentId) : undefined;

  return (
    <div className="music-picker" ref={rootRef}>
      <button
        type="button"
        className="icon-btn glass"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.playlist.title}
        onClick={() => {
          playSfx(open ? "close" : "open");
          setOpen((o) => !o);
        }}
      >
        {musicOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
        <span className="hidden sm:inline">{t.chrome.music}</span>
      </button>

      {open ? (
        <div className="music-menu glass" role="menu" aria-label={t.playlist.title}>
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 pb-2 pt-1">
            <p className="text-xs font-bold tracking-[0.18em] text-muted uppercase">
              {t.playlist.title}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[0.65rem] tracking-wide text-muted">
                {t.playlist.count(formatInteger(tracks.length, locale))}
              </span>
              <button
                type="button"
                className="icon-btn glass !h-8 !px-2.5"
                onClick={togglePlay}
                aria-label={musicOn ? t.playlist.pause : t.playlist.play}
              >
                {musicOn ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              </button>
            </div>
          </div>

          <div className="volume-row">
            <Volume2 className="size-3.5 flex-none text-muted" aria-hidden="true" />
            <input
              type="range"
              className="volume-range"
              min={0}
              max={100}
              step={5}
              value={Math.round(volume * 100)}
              onChange={(e) => onVolume(Number(e.target.value) / 100)}
              aria-label={t.playlist.volume}
            />
            <span className="volume-value tabular-nums">{formatPercent(volume, locale)}</span>
          </div>

          {currentId ? (
            <div className="now-playing">
              <div className="flex items-baseline justify-between gap-2">
                <p className="music-title text-xs font-medium text-ink">
                  {currentTrack ? trackLabel(currentTrack) : ""}
                </p>
                <p className="flex-none text-[0.65rem] tabular-nums text-muted">
                  {fmt(Math.min(elapsed, duration), locale)} / {fmt(duration, locale)}
                </p>
              </div>
              <div
                className="now-bar"
                role="slider"
                tabIndex={0}
                aria-label={t.playlist.seek}
                aria-valuemin={0}
                aria-valuemax={Math.round(duration)}
                aria-valuenow={Math.round(Math.min(elapsed, duration))}
                onClick={(e) => seekTo(e.clientX, e.currentTarget)}
                onKeyDown={onSeekKey}
              >
                <div
                  className="now-bar-fill"
                  style={{
                    width: `${duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          <ul className="m-0 max-h-[56vh] list-none overflow-y-auto p-1.5">
            <li>
              <button
                type="button"
                className={rowClass(currentId === null)}
                aria-current={currentId === null ? "true" : undefined}
                onClick={() => play(null)}
              >
                <Radio className="size-3.5 flex-none text-muted" aria-hidden="true" />
                <span className="music-title">{t.playlist.live}</span>
                {currentId === null && musicOn ? (
                  <span className="eq" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                ) : null}
              </button>
            </li>
            {tracks.length === 0 ? (
              <li className="px-3 py-3">
                <p className="text-xs text-muted">{t.playlist.empty}</p>
                {canEdit ? (
                  <Link
                    to="/admin"
                    hash="music"
                    className="mt-1 inline-block text-[0.65rem] text-ice underline"
                    onClick={() => setOpen(false)}
                  >
                    {t.playlist.emptyAction}
                  </Link>
                ) : (
                  <p className="mt-1 text-[0.65rem] text-muted">{t.playlist.emptyHint}</p>
                )}
              </li>
            ) : null}
            {tracks.map((track, i) => {
              const current = track.id === currentId;
              const failed = track.id === failedId;
              return (
                <li key={track.id}>
                  <button
                    type="button"
                    className={rowClass(current)}
                    aria-current={current ? "true" : undefined}
                    title={failed ? t.playlist.failed : undefined}
                    onClick={() => play(track.id)}
                  >
                    <span className="w-6 flex-none text-right text-[0.65rem] tabular-nums text-muted">
                      {failed ? "!" : formatInteger(i + 1, locale, 2)}
                    </span>
                    <span className={`music-title${failed ? " text-muted" : ""}`}>
                      {trackLabel(track)}
                    </span>
                    <span className="flex flex-none items-center gap-2">
                      {current && musicOn ? (
                        <span className="eq" aria-hidden="true">
                          <span />
                          <span />
                          <span />
                        </span>
                      ) : null}
                      {failed ? (
                        <span className="text-[0.65rem] font-bold tracking-[0.12em] text-sun uppercase">
                          {t.playlist.retry}
                        </span>
                      ) : trackDurationLabel(track.seconds) ? (
                        <span className="text-[0.65rem] tabular-nums text-muted">
                          {trackDurationLabel(track.seconds, locale)}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
