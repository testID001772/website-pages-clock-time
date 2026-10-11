import { Check, ChevronDown, ChevronUp, Pause, Play, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale } from "@/lib/i18n";
import { MUSIC_LIMITS, trackDurationLabel, trackKindLabel, type MusicTrack } from "@/lib/music";
import { deleteTrack, listTracks, moveTrack, saveTrack } from "@/lib/server/music";
import { serverErrorText } from "@/lib/types";

/**
 * Music editor — the staff side of the playlist.
 *
 * The app ships no tracks, so this is where the library comes from: add one by
 * uploading an audio file (stored in the database and served back from
 * `/api/music/<id>`) or by linking to one. Rows can be renamed, reordered,
 * previewed and deleted; every action returns the refreshed library.
 */

/** Read a picked file as a data URL (the storage format for uploads). */
function readAsDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/** Ask the browser for a duration; `0` (unknown) when it cannot be probed. */
function probeDuration(src: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const settle = (value: number) => {
      audio.removeAttribute("src");
      resolve(Number.isFinite(value) && value > 0 ? Math.round(value) : 0);
    };
    audio.addEventListener("loadedmetadata", () => settle(audio.duration), { once: true });
    audio.addEventListener("error", () => settle(0), { once: true });
    window.setTimeout(() => settle(0), 5000);
    audio.preload = "metadata";
    audio.src = src;
  });
}

type Draft = { title: string; artist: string };

function draftsFrom(tracks: MusicTrack[]): Record<string, Draft> {
  return Object.fromEntries(
    tracks.map((track) => [track.id, { title: track.title, artist: track.artist }]),
  );
}

export function MusicEditor() {
  const { t } = useLocale();
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void listTracks()
      .then((next) => {
        if (cancelled) return;
        setTracks(next);
        setDrafts(draftsFrom(next));
      })
      .catch(() => undefined);
    const audio = new Audio();
    audio.volume = 0.6;
    audio.addEventListener("ended", () => setPreviewId(null));
    audioRef.current = audio;
    return () => {
      cancelled = true;
      audio.pause();
      audio.removeAttribute("src");
    };
  }, []);

  function apply(next: MusicTrack[]) {
    setTracks(next);
    setDrafts(draftsFrom(next));
  }

  /** Run a library action, then show its result. */
  async function run(action: () => Promise<MusicTrack[]>, ok: string) {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      apply(await action());
      setStatus(ok);
    } catch (err) {
      setError(
        err instanceof Error ? (serverErrorText(err.message, t) ?? t.music.saveError) : t.music.saveError,
      );
    } finally {
      setBusy(false);
    }
  }

  /** Play/pause the one preview element every row shares. */
  function togglePreview(track: MusicTrack) {
    const audio = audioRef.current;
    if (!audio) return;
    if (previewId === track.id) {
      audio.pause();
      setPreviewId(null);
      return;
    }
    audio.src = track.url;
    setPreviewId(track.id);
    void audio.play().catch(() => setPreviewId(null));
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);

    let source = link.trim();
    let seconds = 0;
    if (file) {
      if (!file.type.startsWith("audio/")) {
        setError(t.music.badFile);
        return;
      }
      if (file.size > MUSIC_LIMITS.uploadBytes) {
        setError(t.music.tooLarge);
        return;
      }
      const dataUrl = await readAsDataUrl(file);
      if (!dataUrl) {
        setError(t.music.badFile);
        return;
      }
      source = dataUrl;
      seconds = await probeDuration(dataUrl);
    }
    if (!source) {
      setError(t.music.badFile);
      return;
    }
    const fallbackTitle = file ? file.name.replace(/\.[^.]+$/, "") : "";
    await run(
      () =>
        saveTrack({
          data: {
            title: title.trim() || fallbackTitle || t.music.title,
            artist: artist.trim(),
            source,
            seconds,
          },
        }),
      t.music.saved,
    );
    setTitle("");
    setArtist("");
    setLink("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="mt-6">
      {tracks.length === 0 ? (
        <p className="text-sm text-muted">{t.music.empty}</p>
      ) : (
        <ul className="m-0 list-none space-y-3 p-0">
          {tracks.map((track, i) => {
            const draft = drafts[track.id] ?? { title: track.title, artist: track.artist };
            const dirty = draft.title !== track.title || draft.artist !== track.artist;
            const playing = previewId === track.id;
            return (
              <li
                key={track.id}
                className="flex flex-wrap items-center gap-3 rounded-[18px] bg-white/5 p-3"
              >
                <span className="w-7 flex-none text-right text-[0.65rem] tabular-nums text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <input
                  className="min-h-11 min-w-[9rem] flex-1 rounded-xl bg-black/30 px-3 text-sm"
                  aria-label={t.music.titleLabel}
                  value={draft.title}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [track.id]: { ...draft, title: e.target.value } }))
                  }
                />
                <input
                  className="min-h-11 min-w-[7rem] flex-1 rounded-xl bg-black/30 px-3 text-sm"
                  aria-label={t.music.artistLabel}
                  placeholder={t.music.artistLabel}
                  value={draft.artist}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [track.id]: { ...draft, artist: e.target.value } }))
                  }
                />
                <span className="text-[0.65rem] tracking-[0.12em] text-muted uppercase">
                  {trackKindLabel(track, t)}
                </span>
                <span className="text-xs tabular-nums text-muted">
                  {trackDurationLabel(track.seconds) || "—"}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="icon-btn glass !h-8 !px-2"
                    aria-label={playing ? t.playlist.pause : t.playlist.play}
                    disabled={busy}
                    onClick={() => togglePreview(track)}
                  >
                    {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                  </button>
                  <button
                    type="button"
                    className="icon-btn glass !h-8 !px-2"
                    aria-label={t.music.up}
                    disabled={busy || i === 0}
                    onClick={() => void run(() => moveTrack({ data: { id: track.id, direction: "up" } }), t.music.saved)}
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn glass !h-8 !px-2"
                    aria-label={t.music.down}
                    disabled={busy || i === tracks.length - 1}
                    onClick={() => void run(() => moveTrack({ data: { id: track.id, direction: "down" } }), t.music.saved)}
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn glass !h-8 !px-2"
                    aria-label={t.music.save}
                    disabled={busy || !dirty}
                    onClick={() =>
                      void run(
                        () =>
                          saveTrack({
                            data: {
                              id: track.id,
                              title: draft.title.trim(),
                              artist: draft.artist.trim(),
                              source: null,
                              seconds: track.seconds,
                            },
                          }),
                        t.music.saved,
                      )
                    }
                  >
                    <Check className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn glass !h-8 !px-2"
                    aria-label={t.music.remove}
                    disabled={busy}
                    onClick={() => void run(() => deleteTrack({ data: { id: track.id } }), t.music.saved)}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form className="mt-6 space-y-4" onSubmit={(e) => void onAdd(e)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span>{t.music.titleLabel}</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={MUSIC_LIMITS.title} />
          </label>
          <label className="field">
            <span>{t.music.artistLabel}</span>
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              maxLength={MUSIC_LIMITS.artist}
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span>{t.music.upload}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="field">
            <span>{t.music.urlLabel}</span>
            <input
              value={link}
              placeholder="/music/song.mp3"
              onChange={(e) => setLink(e.target.value)}
            />
          </label>
        </div>
        <p className="text-xs text-muted">{t.music.fileKinds}</p>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {status ? <p className="text-sm text-ice">{status}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? t.admin.saving : t.music.add}
        </button>
      </form>
    </div>
  );
}
