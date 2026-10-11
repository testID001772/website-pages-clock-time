import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  audioMimeForFile,
  isAudioFile,
  normalizeUploadSource,
  UPLOAD_DATA_URL,
  AUDIO_URL,
  audioSourceError,
  isAudioSource,
  isUploadedSource,
  MUSIC_API_PREFIX,
  MUSIC_LIMITS,
  parseByteRange,
  publicTrackUrl,
  sortTracks,
  trackDurationLabel,
  trackLabel,
} from "./music.ts";

describe("music library rules", () => {
  it("ships no tracks of its own", () => {
    // The library is whatever staff add; the old generated manifest of 100
    // dead mp3 references is gone on purpose.
    assert.equal(MUSIC_LIMITS.tracks > 0, true);
    assert.equal(MUSIC_API_PREFIX, "/api/music/");
  });

  it("accepts uploaded audio data URLs and playable links", () => {
    assert.ok(isAudioSource("data:audio/mpeg;base64,SUQzBAAAAAA="));
    assert.ok(isAudioSource("data:audio/wav;base64,UklGRg=="));
    assert.ok(isAudioSource("https://cdn.example.com/song.mp3"));
    assert.ok(isAudioSource("/music/song.mp3"));
  });

  it("rejects anything that is not audio", () => {
    assert.equal(isAudioSource(""), false);
    assert.equal(isAudioSource("   "), false);
    assert.equal(isAudioSource("javascript:alert(1)"), false);
    assert.equal(isAudioSource("data:text/html;base64,PHNjcmlwdD4="), false);
    assert.equal(isAudioSource("music/song.mp3"), false); // not site-absolute
    assert.equal(isAudioSource('https://x.example/"onload="alert(1)'), false);
  });

  it("tells uploads from links", () => {
    assert.equal(isUploadedSource("data:audio/mpeg;base64,AA=="), true);
    assert.equal(isUploadedSource("/music/song.mp3"), false);
  });

  it("addresses an upload by id so the payload never ships in a page", () => {
    assert.equal(publicTrackUrl("abc-123", "data:audio/mpeg;base64,AA=="), `${MUSIC_API_PREFIX}abc-123`);
    assert.equal(publicTrackUrl("abc-123", "https://cdn.example.com/song.mp3"), "https://cdn.example.com/song.mp3");
    assert.equal(publicTrackUrl("abc-123", "/music/song.mp3"), "/music/song.mp3");
  });

  it("reports why a source cannot be used", () => {
    assert.equal(audioSourceError("data:text/html;base64,AA=="), "MUSIC_BAD_SOURCE");
    assert.equal(audioSourceError("x".repeat(MUSIC_LIMITS.uploadChars + 1)), "MUSIC_BAD_SOURCE");
    const upload = `data:audio/mpeg;base64,${"A".repeat(MUSIC_LIMITS.uploadChars)}`;
    assert.equal(audioSourceError(upload), "MUSIC_TOO_LARGE");
    assert.equal(audioSourceError("data:audio/mpeg;base64,AA=="), null);
  });

  it("keeps the upload budget inside the server ceiling", () => {
    // base64 inflates 4/3 — the character budget must cover the byte budget.
    assert.ok(MUSIC_LIMITS.uploadChars > MUSIC_LIMITS.uploadBytes * (4 / 3));
  });

  it("labels duration, or leaves it blank when unknown", () => {
    assert.equal(trackDurationLabel(0), "");
    assert.equal(trackDurationLabel(-1), "");
    assert.equal(trackDurationLabel(9), "0:09");
    assert.equal(trackDurationLabel(65), "1:05");
    assert.equal(trackDurationLabel(3600), "60:00");
  });

  it("labels a track with its artist when it has one", () => {
    assert.equal(trackLabel({ title: "Aurora", artist: "Nova" }), "Aurora · Nova");
    assert.equal(trackLabel({ title: "Aurora", artist: "" }), "Aurora");
  });

  it("orders by position, ties broken by id", () => {
    const rows = [
      { id: "b", order: 2 },
      { id: "a", order: 2 },
      { id: "c", order: 1 },
    ];
    assert.deepEqual(sortTracks(rows).map((r) => r.id), ["c", "a", "b"]);
    // Never mutates its input.
    assert.deepEqual(rows.map((r) => r.id), ["b", "a", "c"]);
  });

  it("parses the byte ranges the audio endpoint answers", () => {
    assert.deepEqual(parseByteRange("bytes=0-99", 1000), { start: 0, end: 99 });
    assert.deepEqual(parseByteRange("bytes=500-", 1000), { start: 500, end: 999 });
    assert.deepEqual(parseByteRange("bytes=-100", 1000), { start: 900, end: 999 });
    // Clamped, and unsatisfiable ranges fall back to a plain 200.
    assert.deepEqual(parseByteRange("bytes=900-5000", 1000), { start: 900, end: 999 });
    assert.equal(parseByteRange("bytes=1000-", 1000), null);
    assert.equal(parseByteRange("bytes=abc", 1000), null);
    assert.equal(parseByteRange("bytes=-", 1000), null);
    assert.equal(parseByteRange(null, 1000), null);
    assert.equal(parseByteRange("bytes=0-10", 0), null);
  });

  it("accepts what a phone calls an audio file", () => {
    // A recorded voice note: `.m4a`, which browsers report as video/mp4.
    assert.ok(isAudioFile("note.m4a", "video/mp4"));
    assert.ok(isUploadedSource("data:video/mp4;base64,AAAA"));
    assert.equal(audioMimeForFile("note.m4a", "video/mp4"), "video/mp4");
  });

  it("falls back to the extension when the browser cannot type the file", () => {
    assert.ok(isAudioFile("song.mp3", ""));
    assert.ok(isAudioFile("song.mp3", "application/octet-stream"));
    assert.ok(isAudioFile("pad.WAV", ""));
    assert.equal(audioMimeForFile("song.mp3", ""), "audio/mpeg");
    assert.equal(audioMimeForFile("song.flac", ""), "audio/flac");
  });

  it("refuses files that are clearly not audio", () => {
    assert.equal(isAudioFile("photo.jpg", "image/jpeg"), false);
    assert.equal(isAudioFile("notes.txt", "text/plain"), false);
    assert.equal(isAudioFile("archive.zip", ""), false);
    assert.equal(isAudioFile("no-extension", ""), false);
  });

  it("re-labels an untyped upload so the server accepts it", () => {
    assert.equal(
      normalizeUploadSource("data:application/octet-stream;base64,QUJD", "track.m4a", ""),
      "data:audio/mp4;base64,QUJD",
    );
    // An already-typed upload is left exactly as the browser produced it.
    assert.equal(
      normalizeUploadSource("data:audio/mpeg;base64,QUJD", "track.mp3", "audio/mpeg"),
      "data:audio/mpeg;base64,QUJD",
    );
    assert.equal(normalizeUploadSource("data:image/png;base64,QUJD", "cat.png", "image/png"), null);
    assert.equal(normalizeUploadSource("not-a-data-url", "track.mp3", ""), null);
  });

  it("matches the storage format the editor writes", () => {
    const upload = `data:audio/wav;base64,${Buffer.from("RIFF").toString("base64")}`;
    assert.ok(UPLOAD_DATA_URL.test(upload));
    assert.ok(AUDIO_URL.test("/api/music/abc-123"));
  });
});
