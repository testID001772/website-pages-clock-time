import { Pause, Play, Radio, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { startAmbient, stopAmbient } from "@/lib/ambient";
import { useLocale } from "@/lib/i18n";
import { PLAYLIST_TRACKS } from "@/lib/playlist-tracks";
import { playSfx } from "@/lib/sfx";

const fmt = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * Music button + playlist panel. Track 0 is the live generative ambience
 * (no file); the other 100 are mp3s in /public/music (see
 * scripts/generate-music.mjs). Play state follows the shared audio intent
 * (`system-space-music`), so unpausing also re-enables the UI sound
 * effects. If an mp3 fails to load, playback falls back to the live
 * ambience and the row is flagged.
 */
export function MusicPicker() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
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
  /** Track ids that already got their one automatic retry. */
  const retriedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const intent = localStorage.getItem("system-space-music") !== "false";
    intentRef.current = intent;
    setMusicOn(intent);
    if (intent) startAmbient();

    const audio = new Audio();
    audio.preload = "none"; // fetch a track only when it is picked
    audio.volume = 0.6;
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
      const i = PLAYLIST_TRACKS.findIndex((track) => track.id === id);
      const next = PLAYLIST_TRACKS[(i + 1) % PLAYLIST_TRACKS.length];
      playRef.current(next.id);
    });
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.removeAttribute("src");
    };
  }, []);

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
    const track = PLAYLIST_TRACKS.find((item) => item.id === id);
    setDuration(track?.seconds ?? 0);
    if (!intentRef.current) {
      intentRef.current = true;
      setMusicOn(true);
      localStorage.setItem("system-space-music", "true");
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
    audio.src = `/music/${track.file}`;
    void audio.play().catch(() => undefined);
  };
  playRef.current = play;

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
    localStorage.setItem("system-space-music", String(next));
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
                {t.playlist.count(PLAYLIST_TRACKS.length)}
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

          {currentId ? (
            <div className="now-playing">
              <div className="flex items-baseline justify-between gap-2">
                <p className="music-title text-xs font-medium text-ink">
                  {PLAYLIST_TRACKS.find((track) => track.id === currentId)?.title}
                </p>
                <p className="flex-none text-[0.65rem] tabular-nums text-muted">
                  {fmt(Math.min(elapsed, duration))} / {fmt(duration)}
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
            {PLAYLIST_TRACKS.map((track, i) => {
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
                      {failed ? "!" : String(i + 1).padStart(2, "0")}
                    </span>
                    <span className={`music-title${failed ? " text-muted" : ""}`}>
                      {track.title}
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
                      ) : (
                        <span className="text-[0.65rem] tabular-nums text-muted">
                          {fmt(track.seconds)}
                        </span>
                      )}
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
