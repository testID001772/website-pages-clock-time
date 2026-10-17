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
 * Every track is scored from its own seed — key, mode, tempo, chord progression,
 * register, brightness, reverb, delay, which layers play — and each seed's score
 * must be unique (`assertDistinctScores`). The library shipped three
 * byte-identical pairs once, because the old renderer varied only (root note ×
 * chord shape) for its pad tracks.
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
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import lamejs from "@breezystack/lamejs";
import { projectRoot } from "./with-app-env.mjs";

const SR = 44100;
const BITRATE = 80; // kbps mono — the reverb tails want the extra headroom
const OUT_DIR = "public/music";
/** Where the files are served from (the `source` stored in the library). */
const SERVE_PATH = "/music";
const MIGRATION = "migrations/0010_music_library.sql";
/** Added later: the ten long tracks. A separate file, so 0010 never changes. */
const EXTRA_MIGRATION = "migrations/0011_music_extra.sql";
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
    title: "Year's End",
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

/** Ten longer tracks, added after the 30 starters. Rendered with `--extra`. */
export const EXTRA_TRACKS = [
  {
    id: "extra-years-end-sad-friends",
    file: "years-end-sad-friends.mp3",
    title: "Years End: Sad Friends",
    artist: "Clock Time",
    style: "pad",
    seed: 5101,
    seconds: 600,
  },
  {
    id: "extra-years-end-happy-friends",
    file: "years-end-happy-friends.mp3",
    title: "Years End: Happy Friends",
    artist: "Clock Time",
    style: "arp",
    seed: 5102,
    seconds: 420,
  },
  {
    id: "extra-the-end-sad-leaving",
    file: "the-end-sad-leaving.mp3",
    title: "The End: Sad Leaving",
    artist: "Clock Time",
    style: "pad",
    seed: 5103,
    seconds: 720,
  },
  {
    id: "extra-minecraft-steve-herobrine-2010-2026",
    file: "minecraft-steve-herobrine-2010-2026.mp3",
    title: "Minecraft: Steve & Herobrine 2010–2026",
    artist: "Clock Time",
    style: "pulse",
    seed: 5104,
    seconds: 1800,
  },
  {
    id: "extra-minecraft-the-end-steve-herobrine-2010-2026",
    file: "minecraft-the-end-steve-herobrine-2010-2026.mp3",
    title: "Minecraft: The End, Steve & Herobrine 2010–2026",
    artist: "Clock Time",
    style: "pad",
    seed: 5105,
    seconds: 1800,
  },
  {
    id: "extra-minecraft-found-herobrine-2010",
    file: "minecraft-found-herobrine-2010.mp3",
    title: "Minecraft: Found Herobrine 2010",
    artist: "Clock Time",
    style: "arp",
    seed: 5106,
    seconds: 1500,
  },
  {
    id: "extra-minecraft-sad-friends-years-end",
    file: "minecraft-sad-friends-years-end.mp3",
    title: "Minecraft: Sad Friends, Years End",
    artist: "Clock Time",
    style: "pad",
    seed: 5107,
    seconds: 960,
  },
  {
    id: "extra-minecraft-sad-leaving",
    file: "minecraft-sad-leaving.mp3",
    title: "Minecraft: Sad Leaving",
    artist: "Clock Time",
    style: "pad",
    seed: 5108,
    seconds: 1080,
  },
  {
    id: "extra-minecraft-play-world-end",
    file: "minecraft-play-world-end.mp3",
    title: "Minecraft: Play World End",
    artist: "Clock Time",
    style: "pulse",
    seed: 5109,
    seconds: 1560,
  },
  {
    id: "extra-leaving-the-end",
    file: "leaving-the-end.mp3",
    title: "Leaving the End",
    artist: "Clock Time",
    style: "arp",
    seed: 5110,
    seconds: 420,
  },
];

/** Every track the app ships: the starters first, then the extras. */
export const ALL_TRACKS = [...TRACKS, ...EXTRA_TRACKS];

const args = process.argv.slice(2);
const CHECK = args.includes("--check");
/** `--extra` renders only the ten long tracks, leaving the starter files alone. */
const EXTRA_ONLY = args.includes("--extra");

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

/**
 * The harmonic colours a track can be written in. A mode is a semitone set from
 * the tonic; the chords are built by stacking thirds inside it, so every
 * progression stays in key whatever the seed picks.
 */
const MODES = {
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  ionian: [0, 2, 4, 5, 7, 9, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};
const MODE_NAMES = Object.keys(MODES);

/** Chord progressions as scale degrees — the four bars a track loops over. */
const PROGRESSIONS = [
  [0, 5, 3, 4],
  [0, 4, 5, 3],
  [0, 3, 4, 3],
  [5, 3, 0, 4],
  [0, 6, 3, 4],
  [1, 4, 0, 0],
  [0, 2, 5, 4],
  [3, 4, 0, 5],
];

const REVERB_COMBS = [1687, 1601, 2053, 2251];
const REVERB_ALLPASS = [347, 113];

/** One-pole low-pass, in place — the brightness ceiling of the whole mix. */
function lowpass(buf, cutoff) {
  const a = Math.exp((-2 * Math.PI * cutoff) / SR);
  let y = 0;
  for (let i = 0; i < buf.length; i++) {
    y = buf[i] * (1 - a) + y * a;
    buf[i] = y;
  }
}

/** One damped feedback comb, summed into `out`. */
function comb(out, input, delay, feedback) {
  const line = new Float32Array(delay);
  let idx = 0;
  let damp = 0;
  for (let i = 0; i < input.length; i++) {
    const delayed = line[idx];
    const y = input[i] + delayed * feedback;
    // One-pole damping inside the loop: high frequencies die first, which is
    // what makes a synthetic tail sound like a room instead of a metal pipe.
    damp = y * 0.32 + damp * 0.68;
    line[idx] = damp;
    out[i] += y;
    idx = idx + 1 === delay ? 0 : idx + 1;
  }
}

/** Schroeder allpass, in place. */
function allpass(buf, delay, g) {
  const line = new Float32Array(delay);
  let idx = 0;
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i];
    const delayed = line[idx];
    const y = -g * x + delayed;
    line[idx] = x + g * y;
    buf[i] = y;
    idx = idx + 1 === delay ? 0 : idx + 1;
  }
}

/**
 * A room around the mix: four parallel damped combs into two allpasses, mixed
 * back over the dry signal. Cheap enough for 180 s of audio (a handful of
 * O(n) passes) and the single biggest reason these tracks sound like music
 * rather than like oscillators.
 */
function reverb(buf, mix, decay) {
  const wet = new Float32Array(buf.length);
  const feedback = Math.min(0.88, 0.6 + decay * 0.07);
  for (const delay of REVERB_COMBS) comb(wet, buf, delay, feedback);
  const trim = 0.3;
  for (let i = 0; i < wet.length; i++) wet[i] *= trim;
  for (const delay of REVERB_ALLPASS) allpass(wet, delay, 0.68);
  const dry = 1 - mix * 0.45;
  for (let i = 0; i < buf.length; i++) buf[i] = buf[i] * dry + wet[i] * mix;
}

/** Slow detune chorus: widens the otherwise mono image without extra bytes. */
function chorus(buf, rate, depthSec, mix) {
  const dry = Float32Array.from(buf);
  const base = 0.011 * SR;
  const depth = depthSec * SR;
  for (let i = 0; i < buf.length; i++) {
    const read = i - (base + depth * Math.sin(2 * Math.PI * rate * (i / SR)));
    const i0 = Math.floor(read);
    if (i0 < 1 || i0 + 1 >= dry.length) continue;
    const frac = read - i0;
    buf[i] = dry[i] * (1 - mix) + (dry[i0] * (1 - frac) + dry[i0 + 1] * frac) * mix;
  }
}

/** Slow, detuned chord voice: three sines and a triangle an octave down. */
function padVoice(
  buf,
  at,
  dur,
  freq,
  gain,
  { attack = 1.4, release = 2.6, detune = 0.003, lfo = 0.07, lfoDepth = 0.05 } = {},
) {
  const i0 = Math.floor(at * SR);
  const i1 = Math.min(buf.length, Math.floor((at + dur + release) * SR));
  const spread = [0, detune, -detune];
  for (let i = Math.max(0, i0); i < i1; i++) {
    const t = (i - i0) / SR;
    if (t < 0) continue;
    let env;
    if (t < attack) env = t / attack;
    else if (t < dur) env = 1;
    else env = Math.max(0, 1 - (t - dur) / release);
    if (env <= 0) continue;
    const tremolo = 1 - lfoDepth + lfoDepth * (0.5 + 0.5 * Math.sin(2 * Math.PI * lfo * t));
    let s = 0;
    for (const cents of spread) s += Math.sin(2 * Math.PI * freq * (1 + cents) * t);
    s += 0.24 * (Math.abs(((freq * 0.5 * t) % 1) * 4 - 2) - 1);
    buf[i] += (s / spread.length) * gain * env * tremolo;
  }
}

/** Bell / glass voice: a sine pair through an exponential decay. */
function bellVoice(buf, at, freq, gain, decay, ratio) {
  const i0 = Math.floor(at * SR);
  const n = Math.floor(decay * 5 * SR);
  let phase = 0;
  let modPhase = 0;
  for (let k = 0; k < n && i0 + k < buf.length; k++) {
    if (i0 + k < 0) continue;
    const t = k / SR;
    const env = Math.exp(-t / decay);
    modPhase += (2 * Math.PI * freq * ratio) / SR;
    phase += (2 * Math.PI * freq) / SR;
    buf[i0 + k] += Math.sin(phase + 0.8 * env * Math.sin(modPhase)) * gain * env;
  }
}

/** Plucked note: exponential decay, a touch of second harmonic. */
function pluck(buf, at, freq, gain, decay) {
  const i0 = Math.floor(at * SR);
  const n = Math.floor(decay * 4 * SR);
  for (let k = 0; k < n && i0 + k < buf.length; k++) {
    const t = k / SR;
    const env = Math.exp(-t / decay);
    buf[i0 + k] += (Math.sin(2 * Math.PI * freq * t) + 0.18 * Math.sin(4 * Math.PI * freq * t)) * gain * env;
  }
}

/** Bass voice: sine fundamental with quiet harmonics and a soft envelope. */
function bassVoice(buf, at, dur, freq, gain, profile = "standard") {
  const i0 = Math.floor(at * SR);
  const i1 = Math.min(buf.length, Math.floor((at + dur) * SR));
  const attack = Math.min(0.6, dur * 0.3);
  const release = Math.min(1.2, dur * 0.4);
  let phase = 0;
  for (let i = Math.max(0, i0); i < i1; i++) {
    const t = (i - i0) / SR;
    if (t < 0) continue;
    const env =
      t < attack ? t / attack : t < dur - release ? 1 : Math.max(0, (dur - t) / release);
    if (env <= 0) continue;
    phase += (2 * Math.PI * freq) / SR;
    // The event mix uses less of the third harmonic: on small speakers it can
    // read as a narrow ~124 Hz tone instead of a rounded bass note.
    const secondHarmonic = profile === "medium" ? 0.3 : 0.26;
    const thirdHarmonic = profile === "medium" ? 0.02 : 0.07;
    const s = Math.sin(phase) + secondHarmonic * Math.sin(phase * 2) + thirdHarmonic * Math.sin(phase * 3);
    buf[i] += s * gain * env;
  }
}

/** Soft bass thump: pitch sweep + decay. */
function thump(buf, at, gain) {
  const i0 = Math.floor(at * SR);
  const dur = 0.3;
  let phase = 0;
  for (let k = 0; k < dur * SR && i0 + k < buf.length; k++) {
    if (i0 + k < 0) continue;
    const t = k / SR;
    const f = 95 * Math.exp(-t * 9) + 42;
    phase += (2 * Math.PI * f) / SR;
    buf[i0 + k] += Math.sin(phase) * gain * Math.exp(-t / 0.11);
  }
}

/** Noise tick (hat). */
function tick(buf, at, gain, rand) {
  const i0 = Math.floor(at * SR);
  let last = 0;
  for (let k = 0; k < 0.05 * SR && i0 + k < buf.length; k++) {
    if (i0 + k < 0) continue;
    const t = k / SR;
    const white = rand() * 2 - 1;
    const hp = white - last; // cheap high-pass
    last = white;
    buf[i0 + k] += hp * gain * Math.exp(-t / 0.012);
  }
}

/** Noise riser: a rising one-pole under a t² envelope, into a transition. */
function sweep(buf, at, dur, gain, rand) {
  const i0 = Math.floor(at * SR);
  const n = Math.floor(dur * SR);
  let y = 0;
  for (let k = 0; k < n && i0 + k < buf.length; k++) {
    if (i0 + k < 0) continue;
    const t = k / n;
    const cutoff = 260 * 22 ** t;
    const a = Math.exp((-2 * Math.PI * cutoff) / SR);
    y = (rand() * 2 - 1) * (1 - a) + y * a;
    buf[i0 + k] += y * gain * t * t;
  }
}

/** Simple feedback delay (dotted eighth), written back into the buffer. */
function echo(buf, timeSec, feedback, wet) {
  const d = Math.floor(timeSec * SR);
  for (let i = d; i < buf.length; i++) buf[i] += buf[i - d] * feedback * wet;
}

/**
 * The score of one track — every parameter the music is built from, drawn from
 * the track's seed.
 *
 * This is the fix for the shipped library's one real defect: the old renderer
 * used the seed for three things (root note, one of six chord shapes, tempo),
 * and tempo only reached the two styles with drums — so two "pad" seeds that
 * landed on the same root and chord shape produced *byte-identical files*. Three
 * of the thirty shipped tracks were duplicates for exactly that reason. Every
 * value here is drawn from the seed, and `assertDistinctScores` refuses to ship
 * a catalogue where two tracks would come out the same.
 */
export function scoreFor({ seed, style, seconds }) {
  const rand = rng(seed);
  const key = 40 + Math.floor(rand() * 13); // E2..E3
  const mode = MODE_NAMES[Math.floor(rand() * MODE_NAMES.length)];
  const bpm = 56 + Math.floor(rand() * 46); // 56..101, ambient is slow
  const progression = PROGRESSIONS[Math.floor(rand() * PROGRESSIONS.length)];
  const barsPerChord = rand() < 0.4 ? 2 : 4;
  const padOctave = rand() < 0.5 ? 12 : 24;
  const detune = 0.0016 + rand() * 0.0044;
  const padLfo = 0.03 + rand() * 0.11;
  const brightness = 1400 + Math.floor(rand() * 3200);
  const reverbMix = 0.18 + rand() * 0.24;
  const reverbDecay = 2.2 + rand() * 2.6;
  const chorusRate = 0.05 + rand() * 0.22;
  const chorusDepth = 0.004 + rand() * 0.008;
  const delayBeats = rand() < 0.5 ? 0.75 : 0.375;
  const delayFeedback = 0.22 + rand() * 0.2;
  const arpLevel = 0.05 + rand() * 0.045;
  const bellDecay = 1.6 + rand() * 2.4;
  const bellRatio = 2 + rand() * 1.6;
  const bassLevel = 0.05 + rand() * 0.05;
  const swing = rand() * 0.05;
  const padLevel = 0.042 + rand() * 0.026;
  // Which layers exist. The style family decides the skeleton; the draws above
  // decide how each one sounds.
  const layers = {
    bass: rand() < 0.85,
    bells: style === "pad" ? rand() < 0.8 : rand() < 0.45,
    arp: style === "arp" || (style === "pulse" && rand() < 0.5),
    rhythm: style === "pulse",
    sweep: rand() < 0.5,
  };
  return {
    seed,
    style,
    seconds,
    key,
    mode,
    bpm,
    progression,
    barsPerChord,
    padOctave,
    detune,
    padLfo,
    brightness,
    reverbMix,
    reverbDecay,
    chorusRate,
    chorusDepth,
    delayBeats,
    delayFeedback,
    arpLevel,
    bellDecay,
    bellRatio,
    bassLevel,
    swing,
    padLevel,
    layers,
  };
}

/** A stable one-line fingerprint of a score, for the uniqueness check. */
export function scoreSignature(track) {
  const score = scoreFor(track);
  return [
    score.key,
    score.mode,
    score.bpm,
    score.progression.join("."),
    score.barsPerChord,
    score.padOctave,
    score.detune.toFixed(5),
    score.padLfo.toFixed(4),
    score.brightness,
    score.reverbMix.toFixed(4),
    score.reverbDecay.toFixed(3),
    score.chorusRate.toFixed(4),
    score.chorusDepth.toFixed(5),
    score.delayBeats,
    score.delayFeedback.toFixed(4),
    score.arpLevel.toFixed(5),
    score.bellDecay.toFixed(3),
    score.bellRatio.toFixed(3),
    score.bassLevel.toFixed(5),
    score.swing.toFixed(4),
    score.padLevel.toFixed(5),
    Object.entries(score.layers)
      .map(([name, on]) => (on ? name[0] : "-"))
      .join(""),
  ].join("|");
}

/**
 * Refuse to ship two tracks whose music would be identical. Called by both the
 * write and the check path, so a colliding seed is caught before it is encoded
 * rather than after someone notices two playlist rows sound the same.
 */
export function assertDistinctScores(tracks = TRACKS) {
  const seen = new Map();
  for (const track of tracks) {
    const signature = scoreSignature(track);
    const previous = seen.get(signature);
    if (previous) {
      throw new Error(
        `${track.id} and ${previous} would render identical music (${signature}) — change one seed`,
      );
    }
    seen.set(signature, track.id);
  }
  return seen.size;
}

/** Render one track to mono float samples (exported for analysis/checks). */
export function renderTrack({ seed, style, seconds, bassProfile = "standard" }) {
  if (bassProfile !== "standard" && bassProfile !== "medium") {
    throw new Error(`Unknown bass profile: ${bassProfile}`);
  }
  const score = scoreFor({ seed, style, seconds });
  // Event previews should all carry a balanced, audible bass line rather than
  // relying on the standard catalogue's seeded on/off bass-layer draw.
  if (bassProfile === "medium") score.layers.bass = true;
  const rand = rng((seed ^ 0x9e3779b9) >>> 0);
  const buf = new Float32Array(SR * seconds);
  // Melodic layers are rendered separately so the delay and the reverb sit
  // behind them and never muddy the pad.
  const mel = new Float32Array(buf.length);

  const scale = MODES[score.mode];
  const beat = 60 / score.bpm;
  const bar = beat * 4;
  const chordDur = bar * score.barsPerChord;
  const chords = Math.ceil(seconds / chordDur);

  /** The seventh chord on a scale degree, stacked in thirds inside the mode. */
  const chordNotes = (degree) =>
    [0, 2, 4, 6].map((step) => {
      const index = degree + step;
      return scale[index % 7] + 12 * Math.floor(index / 7);
    });

  // ── Pads: the whole harmony, chord by chord ────────────────────────────────
  for (let c = 0; c < chords; c++) {
    const at = c * chordDur;
    const degree = score.progression[c % score.progression.length];
    for (const [index, offset] of chordNotes(degree).entries()) {
      const freq = midiToFreq(score.key + score.padOctave + offset);
      padVoice(buf, at, chordDur - bar * 0.4, freq, score.padLevel, {
        attack: 1.1 + index * 0.25,
        release: 2.2 + index * 0.3,
        detune: score.detune,
        lfo: score.padLfo,
        lfoDepth: 0.05,
      });
    }
  }

  // ── Bass: the root of each chord, an octave under the pad ─────────────────
  if (score.layers.bass) {
    for (let c = 0; c < chords; c++) {
      const at = c * chordDur;
      const degree = score.progression[c % score.progression.length];
      const freq = midiToFreq(score.key - 12 + scale[degree % 7]);
      const duration = chordDur * (bassProfile === "medium" ? 0.76 : 0.92);
      const level = score.bassLevel * (bassProfile === "medium" ? 0.72 : 1);
      bassVoice(buf, at, duration, freq, level, bassProfile);
    }
  }

  // ── Bells: sparse FM notes on the chord, high above ───────────────────────
  if (score.layers.bells) {
    const every = 6 + Math.floor(rand() * 8);
    for (let t = 4; t < seconds - 6; t += every + rand() * 4) {
      const degree = score.progression[Math.floor(t / chordDur) % score.progression.length];
      const notes = chordNotes(degree);
      const offset = notes[Math.floor(rand() * notes.length)] + 12 * (rand() < 0.5 ? 1 : 2);
      bellVoice(
        mel,
        t,
        midiToFreq(score.key + score.padOctave + offset),
        0.05 + rand() * 0.03,
        score.bellDecay,
        score.bellRatio,
      );
    }
  }

  // ── Arp: eighth notes through the chord, delay behind them ────────────────
  if (score.layers.arp) {
    const step = beat / 2;
    const steps = Math.floor(seconds / step);
    const pattern = Array.from({ length: 8 }, () => Math.floor(rand() * 5));
    for (let s = 0; s < steps; s++) {
      const at = s * step + (s % 2 === 1 ? score.swing * step : 0);
      const degree = score.progression[Math.floor(at / chordDur) % score.progression.length];
      const notes = chordNotes(degree);
      const offset = notes[pattern[s % 8] % notes.length] + 12;
      pluck(mel, at, midiToFreq(score.key + score.padOctave + offset), score.arpLevel * (0.7 + rand() * 0.5), 0.9 + rand() * 0.8);
    }
  }

  // ── Pulse: a slow heartbeat of thumps and ticks ───────────────────────────
  if (score.layers.rhythm) {
    const beats = Math.floor(seconds / beat);
    for (let b = 0; b < beats; b++) {
      const strong = b % 4 === 0;
      if (strong || b % 2 === 0) {
        const thumpLevel = strong ? 0.22 : 0.12;
        thump(buf, b * beat, thumpLevel * (bassProfile === "medium" ? 0.8 : 1));
      }
      if (b % 2 === 1) tick(buf, b * beat, 0.028 + rand() * 0.014, rand);
    }
  }

  // ── One or two risers, into a later chord ─────────────────────────────────
  if (score.layers.sweep) {
    for (let t = 40 + rand() * 40; t < seconds - 20; t += 70 + rand() * 40) {
      sweep(buf, t, 6 + rand() * 5, 0.05 + rand() * 0.03, rand);
    }
  }

  // ── Effects, in the order a mix would use them ────────────────────────────
  echo(mel, beat * score.delayBeats, score.delayFeedback, 0.9);
  for (let i = 0; i < buf.length; i++) buf[i] += mel[i];
  reverb(buf, score.reverbMix, score.reverbDecay);
  chorus(buf, score.chorusRate, score.chorusDepth, 0.28);
  lowpass(buf, score.brightness);

  // ── Master: soft clip, normalize, fades so nothing clicks in or out ───────
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
export function encodeMp3(buf) {
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
  for (const track of ALL_TRACKS) {
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
  const rows = {};
  const pattern = /\(\s*'([a-z0-9-]+)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'([^']+)'\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g;
  for (const file of [MIGRATION, EXTRA_MIGRATION]) {
    let sql;
    try {
      sql = readFileSync(join(root, file), "utf8");
    } catch {
      continue; // 0011 is optional for a checkout that predates the extra tracks
    }
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(sql))) {
      rows[match[1]] = {
        title: match[2].replace(/''/g, "'"),
        artist: match[3].replace(/''/g, "'"),
        source: match[4],
        seconds: Number(match[5]),
        order: Number(match[6]),
      };
    }
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
  return ALL_TRACKS.map((track) => {
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

/**
 * Migration 0011: the ten long tracks. Plain inserts (no delete), so the rows
 * already in a database are never touched and the starter seed stays as it was.
 */
export function extraMigrationDocument() {
  const quote = (value) => `'${value.replace(/'/g, "''")}'`;
  const rows = EXTRA_TRACKS.map((track, index) =>
    `  (${quote(track.id)}, ${quote(track.title)}, ${quote(track.artist)}, ${quote(
      `${SERVE_PATH}/${track.file}`,
    )}, ${track.seconds}, ${TRACKS.length + index + 1})`,
  );
  return [
    "-- Music library: ten longer tracks (10–30 minutes each).",
    "--",
    "-- Synthesized by `scripts/generate-music.mjs --extra` and served from",
    "-- `public/music/`. Plain inserts: a row that already exists is left alone.",
    "--",
    "-- Keep in sync with the generator: `node scripts/generate-music.mjs --check`.",
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

/** Peak / RMS of a rendered buffer, so a broken render cannot ship. */
export function analyse(buf) {
  let peak = 0;
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = buf[i];
    peak = Math.max(peak, Math.abs(v));
    sum += v * v;
  }
  return { peak, rms: Math.sqrt(sum / buf.length) };
}

function writeTracks() {
  mkdirSync(join(projectRoot(), OUT_DIR), { recursive: true });
  assertDistinctScores(ALL_TRACKS);
  const started = Date.now();
  const batch = EXTRA_ONLY ? EXTRA_TRACKS : ALL_TRACKS;
  for (const track of batch) {
    const rendered = renderTrack(track);
    const { peak, rms } = analyse(rendered);
    if (!(peak > 0.5 && peak <= 0.95) || rms < 0.03) {
      throw new Error(
        `${track.id} rendered badly (peak ${peak.toFixed(3)}, rms ${rms.toFixed(4)}) — refusing to encode silence`,
      );
    }
    const bytes = encodeMp3(rendered);
    const path = join(projectRoot(), OUT_DIR, track.file);
    writeFileSync(path, bytes);
    const seconds = parseMp3Duration(bytes);
    console.log(
      `${track.file.padEnd(48)} ${(bytes.length / 1024).toFixed(0).padStart(6)} KB  ` +
        `${seconds.toFixed(1)}s  ${track.title}`,
    );
  }
  if (!EXTRA_ONLY) {
    writeFileSync(join(projectRoot(), MIGRATION), seedMigrationDocument());
    console.log(`${MIGRATION}  ${TRACKS.length} rows`);
  }
  writeFileSync(join(projectRoot(), EXTRA_MIGRATION), extraMigrationDocument());
  console.log(`${EXTRA_MIGRATION}  ${EXTRA_TRACKS.length} rows`);
  writeLibrary();
  console.log(`${batch.length} tracks in ${((Date.now() - started) / 1000).toFixed(0)}s`);
}

function checkTracks() {
  const durations = readTrackDurations();
  const rows = readSeedRows();
  let bad = 0;
  try {
    assertDistinctScores(ALL_TRACKS);
  } catch (error) {
    console.error(`DUPLICATE SCORE ${error.message}`);
    bad++;
  }
  for (const track of ALL_TRACKS) {
    const row = rows[track.id];
    const seconds = durations[track.file];
    if (!row) {
      console.error(`MISSING ROW  ${track.id} in the seed migrations`);
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
  // The files themselves must differ: two rows that play the same audio was the
  // defect this check exists to keep out (three pairs shipped that way once).
  const digests = new Map();
  for (const track of ALL_TRACKS) {
    let digest = null;
    try {
      digest = createHash("sha256").update(readFileSync(join(projectRoot(), OUT_DIR, track.file))).digest("hex");
    } catch {
      continue; // already reported as MISSING FILE above
    }
    const twin = digests.get(digest);
    if (twin) {
      console.error(`DUPLICATE AUDIO ${OUT_DIR}/${track.file} is byte-identical to ${twin}`);
      bad++;
    }
    digests.set(digest, track.file);
  }
  if (digests.size !== ALL_TRACKS.length) {
    console.error(`DISTINCT FILES ${digests.size} of ${ALL_TRACKS.length} tracks are unique`);
    bad++;
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
  const extraSql = readFileSync(join(projectRoot(), EXTRA_MIGRATION), "utf8");
  if (extraSql !== extraMigrationDocument()) {
    console.error(`STALE FILE   ${EXTRA_MIGRATION} — regenerate with: node scripts/generate-music.mjs --extra`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `${ALL_TRACKS.length} tracks match ${MIGRATION} + ${EXTRA_MIGRATION} (and ${LIBRARY_FILE})`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  if (CHECK) checkTracks();
  else writeTracks();
}
