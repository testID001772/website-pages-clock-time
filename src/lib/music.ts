import type { Dictionary } from "./i18n";

/**
 * Music library — the shared vocabulary for the playlist panel, the admin music
 * editor and the `/api/music/<id>` audio endpoint. Everything here is pure and
 * importable from both the client bundle and a server function; the SQL lives in
 * `@/lib/server/music`.
 *
 * The app ships **no** tracks: the old 100-entry generated manifest pointed at
 * mp3s that were never in the repository, so every one of them failed to play.
 * Staff add real tracks in the editor and they are stored in `music_tracks`.
 */

export type MusicTrack = {
  id: string;
  title: string;
  /** `""` when the track carries no artist. */
  artist: string;
  /**
   * Playable URL. An uploaded track is served from `/api/music/<id>`; a linked
   * one keeps its own address (site path or `http(s)://`).
   */
  url: string;
  /** True when the audio itself is stored in the database. */
  uploaded: boolean;
  /** Display length in seconds; `0` means unknown. */
  seconds: number;
  /** 1-based position, as shown in the playlist panel. */
  order: number;
};

/** Field limits, mirrored by the zod validator and the SQL check constraints. */
export const MUSIC_LIMITS = {
  title: 120,
  artist: 120,
  /** Longest uploaded audio file (bytes). */
  uploadBytes: 3_000_000,
  /**
   * Longest uploaded source string (characters). base64 inflates by 4/3 and the
   * server function body carries a little JSON on top, so leave headroom.
   */
  uploadChars: 4_100_000,
  /** Ceiling on library size — a playlist panel, not a streaming service. */
  tracks: 200,
  /** Longest track we will label: 6 hours. */
  seconds: 21_600,
} as const;

/**
 * Uploaded audio, as a data URL. `video/*` is allowed on purpose: browsers
 * report `.m4a` (the usual phone voice-note/audio format) as `video/mp4`.
 */
export const UPLOAD_DATA_URL = /^data:(?:audio|video)\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i;
/**
 * Extensions we accept when the browser does not tell us a usable type, and the
 * content type to stamp on the upload. This map is the single list of allowed
 * extensions — a name that misses it is not accepted as audio.
 */
const MIME_BY_EXTENSION: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  wav: "audio/wav",
  flac: "audio/flac",
  weba: "audio/webm",
  aiff: "audio/aiff",
  aif: "audio/aiff",
  wma: "audio/x-ms-wma",
  mka: "audio/x-matroska",
};

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

/**
 * The content type to store for a picked file, or `null` when it does not look
 * like audio at all. Falls back to the file extension, because plenty of
 * browsers hand over `""` (or `application/octet-stream`) for a local file.
 */
export function audioMimeForFile(name: string, type: string): string | null {
  if (type.startsWith("audio/") || type.startsWith("video/")) return type;
  return MIME_BY_EXTENSION[extensionOf(name)] ?? null;
}

/** True when a picked file may be uploaded as a track. */
export function isAudioFile(name: string, type: string): boolean {
  return audioMimeForFile(name, type) !== null;
}

/**
 * The source to store for a picked file. A data URL the browser typed as audio
 * is kept as-is; one it could not type (empty/octet-stream mime) is re-labelled
 * from the extension so the server-side check accepts it. Returns `null` when
 * the bytes cannot be turned into an acceptable audio data URL.
 */
export function normalizeUploadSource(dataUrl: string, name: string, type: string): string | null {
  if (UPLOAD_DATA_URL.test(dataUrl)) return dataUrl;
  const mime = audioMimeForFile(name, type);
  const comma = dataUrl.indexOf(",");
  if (!mime || comma === -1) return null;
  const body = dataUrl.slice(comma + 1);
  if (!/^[a-z0-9+/=\s]+$/i.test(body)) return null;
  return `data:${mime};base64,${body}`;
}
/** A playable link: `http(s)://…` or a site path such as `/music/song.mp3`. */
export const AUDIO_URL = /^(https?:\/\/[^\s<>"']+|\/[A-Za-z0-9._~\-/%+]*)$/;

/** Path prefix for stored uploads. */
export const MUSIC_API_PREFIX = "/api/music/";

export function isUploadedSource(source: string): boolean {
  return UPLOAD_DATA_URL.test(source);
}

/** True when `source` may be stored and played. */
export function isAudioSource(source: string): boolean {
  return isUploadedSource(source) || AUDIO_URL.test(source);
}

/**
 * The URL a client should play for a track. Uploads are addressed by id so the
 * base64 payload never travels in a page payload or a server response — only
 * the bytes, from `/api/music/<id>`.
 */
export function publicTrackUrl(id: string, source: string): string {
  return isUploadedSource(source) ? `${MUSIC_API_PREFIX}${id}` : source;
}

/** Why a value cannot be used, as a stable error code the UI can translate. */
export function audioSourceError(source: string): "MUSIC_BAD_SOURCE" | "MUSIC_TOO_LARGE" | null {
  if (!isAudioSource(source)) return "MUSIC_BAD_SOURCE";
  if (source.length > MUSIC_LIMITS.uploadChars) return "MUSIC_TOO_LARGE";
  return null;
}

/** `m:ss`, or `""` when the length is unknown (a link we could not probe). */
export function trackDurationLabel(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** `Title · Artist`, or just the title. */
export function trackLabel(track: Pick<MusicTrack, "title" | "artist">): string {
  return track.artist ? `${track.title} · ${track.artist}` : track.title;
}

/**
 * Playlist order: `order` first, ties broken by id so the list is stable across
 * the two SQL backends and when a reorder is in flight. Returns a copy — never
 * mutates input.
 */
export function sortTracks<T extends { order: number; id: string }>(tracks: readonly T[]): T[] {
  return [...tracks].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/**
 * Single-range `Range: bytes=…` parser for the audio endpoint, so seeking works
 * on an uploaded track. Returns inclusive indices clamped to the resource, or
 * `null` when the header is absent/unsatisfiable (the caller then sends 200).
 */
export function parseByteRange(
  header: string | null,
  size: number,
): { start: number; end: number } | null {
  if (!header || size <= 0) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (rawStart === "" && rawEnd === "") return null;
  if (rawStart === "") {
    // `bytes=-N`: the last N bytes.
    const length = Number(rawEnd);
    if (length <= 0) return null;
    return { start: Math.max(0, size - length), end: size - 1 };
  }
  const start = Number(rawStart);
  if (start >= size) return null;
  const end = rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);
  if (end < start) return null;
  return { start, end };
}

/** Label for the editor's upload/link badge. */
export function trackKindLabel(track: Pick<MusicTrack, "uploaded">, t: Dictionary): string {
  return track.uploaded ? t.music.kindFile : t.music.kindLink;
}
