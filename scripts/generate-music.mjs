#!/usr/bin/env node
/**
 * Starter music for the playlist — thirty royalty-free ambient tracks, three
 * minutes each, synthesized from seeded recipes and encoded to
 * `public/music/*.mp3` (~41 MB of audio, so a fresh clone gets a full playlist
 * without a download).
 *
 *   node scripts/generate-music.mjs           # write (or rewrite) the tracks
 *   node scripts/generate-music.mjs --check   # verify what is on disk
 *
 * Besides the mp3s it writes `public/music/library.json`, the same rows in the
 * shape the client reads (`{ tracks: [...] }`). The database is the source of
 * truth everywhere a server is running; that file is what the static GitHub
 * Pages build — which has no database at all — loads into the playlist panel.
 * Both are written from `migrations/0010_music_library.sql` (the seed that
 * installs this catalogue; 0009 shipped the first three tracks and stays as
 * history), so the shipped playlist and the seeded one cannot drift apart.
 *
 * The app ships no *dead* tracks: every row seeded by
 * `migrations/0009_music_seed.sql` points at a file this script produces, and
 * `--check` (also run by `scripts/music-schema.test.mjs`) fails if a file is
 * missing, empty, or not the length the seed claims.
 *
 * Deterministic: the same seed always produces the same bytes, so the committed
 * mp3s can be regenerated exactly. Three styles, one each:
 *   pad   — slow chord washes
 *   arp   — plucked arpeggio over a pad with a dotted-eighth echo
 *   pulse — soft bass pulse + ticks + arp (the countdown vibe)
 *
 * Tracks are ordinary library rows: staff can rename, reorder or delete them in
 * the admin music editor like any other track.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import lamejs from "@breezystack/lamejs";
import { projectRoot } from "./with-app-env.mjs";

const SR = 44100;
const BITRATE = 64; // kbps mono — plenty for pads at this length
const OUT_DIR = "public/music";
/** Where the files are served from (the `source` stored in the library). */
const SERVE_PATH = "/music";
const MIGRATION = "migrations/0010_music_library.sql";
/** The catalogue the static (serverless) build reads. */
const LIBRARY_FILE = "public/music/library.json";

/** The library the app ships with. One row per file in the seed migration. */
export const TRACKS = [
  {
    id: "starter-first-light",
    file: "first-light.mp3",
    title: "First Light",
    artist: "Clock Time",
    style: "pad",
    seed: 1107,
    seconds: 180,
  },
  {
    id: "starter-starfall",
    file: "starfall.mp3",
    title: "Starfall",
    artist: "Clock Time",
    style: "arp",
    seed: 2027,
    seconds: 180,
  },
  {
    id: "starter-midnight-pulse",
    file: "midnight-pulse.mp3",
    title: "Midnight Pulse",
    artist: "Clock Time",
    style: "pulse",
    seed: 3141,
    seconds: 180,
  },
  {
    id: "starter-northern-drift",
    file: "northern-drift.mp3",
    title: "Northern Drift",
    artist: "Clock Time",
    style: "pad",
    seed: 4099,
    seconds: 180,
  },
  {
    id: "starter-cobalt-hours",
    file: "cobalt-hours.mp3",
    title: "Cobalt Hours",
    artist: "Clock Time",
    style: "arp",
    seed: 5153,
    seconds: 180,
  },
  {
    id: "starter-slow-orbit",
    file: "slow-orbit.mp3",
    title: "Slow Orbit",
    artist: "Clock Time",
    style: "pad",
    seed: 6203,
    seconds: 180,
  },
  {
    id: "starter-lantern-tide",
    file: "lantern-tide.mp3",
    title: "Lantern Tide",
    artist: "Clock Time",
    style: "arp",
    seed: 7211,
    seconds: 180,
  },
  {
    id: "starter-paper-sky",
    file: "paper-sky.mp3",
    title: "Paper Sky",
    artist: "Clock Time",
    style: "pad",
    seed: 8191,
    seconds: 180,
  },
  {
    id: "starter-quiet-machines",
    file: "quiet-machines.mp3",
    title: "Quiet Machines",
    artist: "Clock Time",
    style: "pulse",
    seed: 9209,
    seconds: 180,
  },
  {
    id: "starter-glass-horizon",
    file: "glass-horizon.mp3",
    title: "Glass Horizon",
    artist: "Clock Time",
    style: "pad",
    seed: 10211,
    seconds: 180,
  },
  {
    id: "starter-ember-line",
    file: "ember-line.mp3",
    title: "Ember Line",
    artist: "Clock Time",
    style: "arp",
    seed: 11213,
    seconds: 180,
  },
  {
    id: "starter-low-gravity",
    file: "low-gravity.mp3",
    title: "Low Gravity",
    artist: "Clock Time",
    style: "pad",
    seed: 12227,
    seconds: 180,
  },
  {
    id: "starter-night-ferry",
    file: "night-ferry.mp3",
    title: "Night Ferry",
    artist: "Clock Time",
    style: "arp",
    seed: 13217,
    seconds: 180,
  },
  {
    id: "starter-amber-static",
    file: "amber-static.mp3",
    title: "Amber Static",
    artist: "Clock Time",
    style: "pulse",
    seed: 14221,
    seconds: 180,
  },
  {
    id: "starter-long-exposure",
    file: "long-exposure.mp3",
    title: "Long Exposure",
    artist: "Clock Time",
    style: "pad",
    seed: 15227,
    seconds: 180,
  },
  {
    id: "starter-silver-hours",
    file: "silver-hours.mp3",
    title: "Silver Hours",
    artist: "Clock Time",
    style: "arp",
    seed: 16231,
    seconds: 180,
  },
  {
    id: "starter-deep-field",
    file: "deep-field.mp3",
    title: "Deep Field",
    artist: "Clock Time",
    style: "pad",
    seed: 17239,
    seconds: 180,
  },
  {
    id: "starter-tidal-glass",
    file: "tidal-glass.mp3",
    title: "Tidal Glass",
    artist: "Clock Time",
    style: "arp",
    seed: 18253,
    seconds: 180,
  },
  {
    id: "starter-neon-rainfall",
    file: "neon-rainfall.mp3",
    title: "Neon Rainfall",
    artist: "Clock Time",
    style: "pulse",
    seed: 19259,
    seconds: 180,
  },
  {
    id: "starter-cold-sun",
    file: "cold-sun.mp3",
    title: "Cold Sun",
    artist: "Clock Time",
    style: "pad",
    seed: 20261,
    seconds: 180,
  },
  {
    id: "starter-harbour-lights",
    file: "harbour-lights.mp3",
    title: "Harbour Lights",
    artist: "Clock Time",
    style: "arp",
    seed: 21269,
    seconds: 180,
  },
  {
    id: "starter-slow-comet",
    file: "slow-comet.mp3",
    title: "Slow Comet",
    artist: "Clock Time",
    style: "pad",
    seed: 22271,
    seconds: 180,
  },
  {
    id: "starter-wire-and-rain",
    file: "wire-and-rain.mp3",
    title: "Wire & Rain",
    artist: "Clock Time",
    style: "pulse",
    seed: 23279,
    seconds: 180,
  },
  {
    id: "starter-aurora-fold",
    file: "aurora-fold.mp3",
    title: "Aurora Fold",
    artist: "Clock Time",
    style: "pad",
    seed: 24281,
    seconds: 180,
  },
  {
    id: "starter-palm-static",
    file: "palm-static.mp3",
    title: "Palm Static",
    artist: "Clock Time",
    style: "arp",
    seed: 25289,
    seconds: 180,
  },
  {
    id: "starter-blanket-fog",
    file: "blanket-fog.mp3",
    title: "Blanket Fog",
    artist: "Clock Time",
    style: "pad",
    seed: 26293,
    seconds: 180,
  },
  {
    id: "starter-solar-tide",
    file: "solar-tide.mp3",
    title: "Solar Tide",
    artist: "Clock Time",
    style: "pulse",
    seed: 27301,
    seconds: 180,
  },
  {
    id: "starter-last-train-home",
    file: "last-train-home.mp3",
    title: "Last Train Home",
    artist: "Clock Time",
    style: "arp",
    seed: 28307,
    seconds: 180,
  },
  {
    id: "starter-years-end",
    file: "years-end.mp3",
    title: "Year\'s End",
    artist: "Clock Time",
    style: "pad",
    seed: 29303,
    seconds: 180,
  },
  {
    id: "starter-countdown",
    file: "countdown.mp3",
    title: "Countdown",
    artist: "Clock Time",
    style: "pulse",
    seed: 30307,
    seconds: 180,
  },
];

const args = process.argv.slice(2);
const CHECK = args.includes("--check");

/** Deterministic RNG (mulberry32). */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const midiToFreq = (m) => 440 * 2 ** ((m - 69) / 12);

/** Chord shapes, semitone offsets stacked from the root. */
const CHORDS = [
  [0, 3, 7, 10], // m9
  [0, 4, 7, 11], // maj7
  [0, 3, 7, 14], // m add9
  [0, 5, 9, 12], // m7b5 wash
  [0, 4, 9, 14], // 6/9
  [0, 5, 7, 12], // sus shimmer
];
const PENTA = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22];

/** A sine or triangle voice with a linear attack/hold/release envelope. */
function padVoice(buf, start, dur, freq, gain, attack, release, triangle) {
  const i0 = Math.floor(start * SR);
  const i1 = Math.min(buf.length, Math.floor((start + dur + release) * SR));
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / SR;
    const phase = 2 * Math.PI * freq * t;
    const s = triangle ? Math.abs(((freq * t) % 1) * 4 - 2) - 1 : Math.sin(phase);
    let env;
    if (t < attack) env = t / attack;
    else if (t < dur) env = 1;
    else env = Math.max(0, 1 - (t - dur) / release);
    buf[i] += s * gain * env;
  }
}

/** Plucked note: exponential decay. */
function pluck(buf, start, freq, gain, decay) {
  const i0 = Math.floor(start * SR);
  const n = Math.floor(decay * 4 * SR);
  for (let k = 0; k < n && i0 + k < buf.length; k++) {
    const t = k / SR;
    buf[i0 + k] += Math.sin(2 * Math.PI * freq * t) * gain * Math.exp(-t / decay);
  }
}

/** Soft bass thump: pitch sweep + decay. */
function thump(buf, start, gain) {
  const i0 = Math.floor(start * SR);
  const dur = 0.3;
  let phase = 0;
  for (let k = 0; k < dur * SR && i0 + k < buf.length; k++) {
    const t = k / SR;
    const f = 95 * Math.exp(-t * 9) + 42;
    phase += (2 * Math.PI * f) / SR;
    buf[i0 + k] += Math.sin(phase) * gain * Math.exp(-t / 0.11);
  }
}

/** Noise tick (hat). */
function tick(buf, start, gain, rand) {
  const i0 = Math.floor(start * SR);
  let last = 0;
  for (let k = 0; k < 0.05 * SR && i0 + k < buf.length; k++) {
    const t = k / SR;
    const white = rand() * 2 - 1;
    const hp = white - last; // cheap high-pass
    last = white;
    buf[i0 + k] += hp * gain * Math.exp(-t / 0.012);
  }
}

/** Simple feedback delay (dotted eighth), written back into the buffer. */
function echo(buf, timeSec, feedback, wet) {
  const d = Math.floor(timeSec * SR);
  for (let i = d; i < buf.length; i++) buf[i] += buf[i - d] * feedback * wet;
}

/** Render one track to mono float samples (exported for analysis/checks). */
export function renderTrack({ seed, style, seconds }) {
  const rand = rng(seed);
  const buf = new Float32Array(SR * seconds);
  const rootMidi = 45 + Math.floor(rand() * 7); // A2..E3
  const progIndex = Math.floor(rand() * CHORDS.length);
  const bpm = 92 + Math.floor(rand() * 36);
  const beat = 60 / bpm;
  const step = beat / 2; // eighth notes

  // Chord loop: 4 chords, 6 s each (pads), reused as the arp harmony.
  const chordDur = 6;
  const prog = [0, 1, 2, 3].map((i) => CHORDS[(progIndex + i) % CHORDS.length]);
  prog.forEach((shape, ci) => {
    const at = ci * chordDur;
    shape.forEach((semi, si) => {
      const f = midiToFreq(rootMidi + 12 + semi);
      padVoice(buf, at, chordDur - 1.2, f, 0.05, 1.4, 2.4, false);
      padVoice(buf, at, chordDur - 1.2, f * 2, si === 0 ? 0.012 : 0.007, 1.8, 2.6, true);
    });
  });

  if (style === "arp" || style === "pulse") {
    // 8-step arpeggio pattern over the pentatonic scale, chord-aware.
    const pattern = Array.from({ length: 8 }, () => Math.floor(rand() * PENTA.length));
    const steps = Math.floor(seconds / step);
    for (let s = 0; s < steps; s++) {
      const chord = prog[Math.floor((s * step) / chordDur) % 4];
      const base = rootMidi + 24 + chord[s % chord.length];
      const note = base + (PENTA[pattern[s % 8]] % 12);
      pluck(buf, s * step, midiToFreq(note), 0.09, 0.22 + rand() * 0.08);
    }
    echo(buf, step * 1.5, 0.34, 0.3);
  }

  if (style === "pulse") {
    const beats = Math.floor(seconds / beat);
    for (let b = 0; b < beats; b++) {
      if (b % 2 === 0) thump(buf, b * beat, 0.32);
      if (b % 2 === 1) tick(buf, b * beat, 0.05, rand);
    }
    // Low root drone under everything.
    prog.forEach((_, ci) =>
      padVoice(buf, ci * chordDur, chordDur - 1, midiToFreq(rootMidi), 0.05, 0.8, 1.5, false),
    );
  }

  // Master: soft clip, normalize, fades so the track does not click in or out.
  let peak = 0;
  for (let i = 0; i < buf.length; i++) {
    buf[i] = Math.tanh(buf[i] * 1.1);
    peak = Math.max(peak, Math.abs(buf[i]));
  }
  const norm = peak > 0 ? 0.82 / peak : 1;
  const fadeOut = 2.5;
  const fadeIn = 0.4;
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR;
    let g = norm;
    if (t < fadeIn) g *= t / fadeIn;
    if (t > seconds - fadeOut) g *= Math.max(0, (seconds - t) / fadeOut);
    buf[i] *= g;
  }
  return buf;
}

/** Float samples → mp3 bytes (mono, MPEG1 Layer III). */
function encodeMp3(buf) {
  const pcm = new Int16Array(buf.length);
  for (let i = 0; i < buf.length; i++) {
    pcm[i] = Math.max(-32768, Math.min(32767, Math.round(buf[i] * 32767)));
  }
  const enc = new lamejs.Mp3Encoder(1, SR, BITRATE);
  const chunks = [];
  for (let i = 0; i < pcm.length; i += 1152) chunks.push(enc.encodeBuffer(pcm.subarray(i, i + 1152)));
  chunks.push(enc.flush());
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

/** MPEG1 Layer III bitrate table (kbps) by header index. */
const BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const SAMPLE_RATES = [44100, 48000, 32000, 0];

/**
 * Length of an MPEG1 Layer III file, in seconds, by walking its frames. Used to
 * prove a seeded track really contains as much audio as the row claims.
 */
export function parseMp3Duration(bytes) {
  let i = 0;
  // Skip an ID3v2 tag when the encoder wrote one.
  if (bytes.length > 10 && bytes.toString("latin1", 0, 3) === "ID3") {
    const size = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
    i = 10 + size;
  }
  let samples = 0;
  let frames = 0;
  while (i + 4 <= bytes.length) {
    const header = bytes.readUInt32BE(i);
    // `header >>> 21` sidesteps the classic JS trap of comparing the sign-extended
    // result of `&` against a positive literal — that comparison is never equal.
    if (header >>> 21 !== 0x7ff) {
      i++; // resync past padding/junk
      continue;
    }
    const versionBits = (header >> 19) & 0b11; // 3 = MPEG1
    const layerBits = (header >> 17) & 0b11; // 1 = Layer III
    const bitrateIndex = (header >> 12) & 0b1111;
    const sampleRateIndex = (header >> 10) & 0b11;
    const padding = (header >> 9) & 1;
    if (versionBits !== 3 || layerBits !== 1) return 0; // not the format we write
    const bitrate = BITRATES[bitrateIndex] * 1000;
    const sampleRate = SAMPLE_RATES[sampleRateIndex];
    if (!bitrate || !sampleRate) return 0;
    const length = Math.floor((144 * bitrate) / sampleRate) + padding;
    if (length <= 4) return 0;
    samples += 1152;
    frames++;
    i += length;
  }
  if (!frames) return 0;
  return samples / SR;
}

/** Duration of each track on disk, or `null` when the file is missing/short. */
export function readTrackDurations(root = projectRoot()) {
  const out = {};
  for (const track of TRACKS) {
    const path = join(root, OUT_DIR, track.file);
    try {
      const bytes = readFileSync(path);
      out[track.file] = bytes.length < 10_000 ? null : parseMp3Duration(bytes);
    } catch {
      out[track.file] = null;
    }
  }
  return out;
}

/** Seed rows read back out of the migration, keyed by track id. */
export function readSeedRows(root = projectRoot()) {
  const sql = readFileSync(join(root, MIGRATION), "utf8");
  const rows = {};
  const pattern = /\(\s*'([a-z0-9-]+)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'([^']+)'\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g;
  let match;
  while ((match = pattern.exec(sql))) {
    rows[match[1]] = {
      title: match[2].replace(/''/g, "'"),
      artist: match[3].replace(/''/g, "'"),
      source: match[4],
      seconds: Number(match[5]),
      order: Number(match[6]),
    };
  }
  return rows;
}

/**
 * The starter tracks as client-facing rows, in playing order: the seed row for
 * each recipe (title/artist/source/seconds/order), keyed by the id the database
 * would use. This is both what `library.json` holds and what `--check` compares
 * against the migration.
 */
export function libraryRows(root = projectRoot()) {
  const rows = readSeedRows(root);
  return TRACKS.map((track) => {
    const row = rows[track.id];
    if (!row) return null;
    return {
      id: track.id,
      title: row.title,
      artist: row.artist,
      source: row.source,
      seconds: row.seconds,
      order: row.order,
    };
  }).filter(Boolean);
}

/** The library document as it is written to disk (stable, pretty-printed). */
export function libraryDocument(root = projectRoot()) {
  return `${JSON.stringify({ tracks: libraryRows(root) }, null, 2)}\n`;
}

/**
 * The seed migration that installs this catalogue, rendered from `TRACKS`.
 *
 * 0009 shipped the first three tracks and stays in history; this is the file the
 * generator owns now. The `delete` makes it re-runnable on a database that
 * already applied 0009: the starter rows are replaced wholesale, staff-added
 * tracks are untouched.
 */
export function seedMigrationDocument() {
  const rows = TRACKS.map((track, index) => {
    const id = `starter-${track.file.replace(/\.mp3$/, "")}`;
    const quote = (value) => `'${value.replace(/'/g, "''")}'`;
    return `  (${quote(id)}, ${quote(track.title)}, ${quote(track.artist)}, ${quote(
      `${SERVE_PATH}/${track.file}`,
    )}, ${track.seconds}, ${index + 1})`;
  });
  return [
    "-- Music library.",
    "--",
    `-- ${TRACKS.length} tracks, three minutes each, synthesized deterministically by`,
    "-- `scripts/generate-music.mjs` (which writes this file) and served from",
    "-- `public/music/`. 0009 seeded the first three; this replaces every starter",
    "-- row with the full catalogue, so a database that ran the old seed ends up",
    "-- with the same library the app ships.",
    "--",
    "-- They are ordinary library rows: staff can rename, reorder or delete them in",
    "-- the admin music editor. `on conflict ... do nothing` keeps the insert safe",
    "-- to re-run and leaves an edited track alone.",
    "--",
    "-- Keep in sync with the generator: `node scripts/generate-music.mjs --check`",
    "-- (and `scripts/music-schema.test.mjs`) fails when a file is missing, empty,",
    "-- or not the length this file claims.",
    "delete from music_tracks where id like 'starter-%';",
    "insert into music_tracks (id, title, artist, source, seconds, sort_order) values",
    `${rows.join(",\n")}`,
    "on conflict (id) do nothing;",
    "",
  ].join("\n");
}

function writeLibrary() {
  const path = join(projectRoot(), LIBRARY_FILE);
  writeFileSync(path, libraryDocument());
  console.log(`${LIBRARY_FILE}  ${libraryRows().length} tracks`);
}

function writeTracks() {
  mkdirSync(join(projectRoot(), OUT_DIR), { recursive: true });
  const started = Date.now();
  for (const track of TRACKS) {
    const bytes = encodeMp3(renderTrack(track));
    const path = join(projectRoot(), OUT_DIR, track.file);
    writeFileSync(path, bytes);
    const seconds = parseMp3Duration(bytes);
    console.log(
      `${track.file.padEnd(20)} ${(bytes.length / 1024).toFixed(0).padStart(4)} KB  ` +
        `${seconds.toFixed(1)}s  ${track.title}`,
    );
  }
  const path = join(projectRoot(), MIGRATION);
  writeFileSync(path, seedMigrationDocument());
  console.log(`${MIGRATION}  ${TRACKS.length} rows`);
  writeLibrary();
  console.log(`${TRACKS.length} tracks in ${((Date.now() - started) / 1000).toFixed(0)}s`);
}

function checkTracks() {
  const durations = readTrackDurations();
  const rows = readSeedRows();
  let bad = 0;
  for (const track of TRACKS) {
    const row = rows[track.id];
    const seconds = durations[track.file];
    if (!row) {
      console.error(`MISSING ROW  ${track.id} in ${MIGRATION}`);
      bad++;
      continue;
    }
    if (seconds === null) {
      console.error(`MISSING FILE ${OUT_DIR}/${track.file} (run: node scripts/generate-music.mjs)`);
      bad++;
      continue;
    }
    if (row.source !== `${SERVE_PATH}/${track.file}`) {
      console.error(`BAD SOURCE   ${track.id} → ${row.source}`);
      bad++;
    }
    if (Math.abs(seconds - row.seconds) > 1) {
      console.error(`BAD LENGTH   ${track.id}: row says ${row.seconds}s, file is ${seconds.toFixed(1)}s`);
      bad++;
    }
    if (row.title !== track.title) {
      console.error(`BAD TITLE    ${track.id}: row "${row.title}" vs "${track.title}"`);
      bad++;
    }
  }
  if (bad) {
    console.error(`\n${bad} problem(s) found`);
    process.exitCode = 1;
    return;
  }
  let library = null;
  try {
    library = readFileSync(join(projectRoot(), LIBRARY_FILE), "utf8");
  } catch {
    console.error(`MISSING FILE ${LIBRARY_FILE} (run: node scripts/generate-music.mjs)`);
    process.exitCode = 1;
    return;
  }
  if (library !== libraryDocument()) {
    console.error(`STALE FILE   ${LIBRARY_FILE} — regenerate with: node scripts/generate-music.mjs`);
    process.exitCode = 1;
    return;
  }
  const sql = readFileSync(join(projectRoot(), MIGRATION), "utf8");
  if (sql !== seedMigrationDocument()) {
    console.error(`STALE FILE   ${MIGRATION} — regenerate with: node scripts/generate-music.mjs`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `${TRACKS.length} starter tracks match ${MIGRATION} (and ${LIBRARY_FILE})`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  if (CHECK) checkTracks();
  else writeTracks();
}
