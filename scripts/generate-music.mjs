#!/usr/bin/env node
/**
 * Generate the playlist mp3 library: 100 unique royalty-free tracks,
 * synthesized from seeded recipes and encoded to public/music/*.mp3,
 * plus the src/lib/playlist-tracks.ts manifest for the app.
 *
 *   node scripts/generate-music.mjs [--count 100] [--seed 20260917]
 *
 * Three styles (picked per track): "pad" (slow chord washes), "arp"
 * (plucked arpeggio over a pad, with a dotted-eighth echo) and "pulse"
 * (soft bass pulse + ticks + arp). Everything is deterministic: the same
 * seed always produces the same library.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import lamejs from "@breezystack/lamejs";

const SR = 44100;
const SECONDS = 24;
const BITRATE = 64;
const OUT_DIR = "public/music";
const MANIFEST = "src/lib/playlist-tracks.ts";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : fallback;
};
const COUNT = Math.max(1, flag("count", 100));
const SEED = flag("seed", 20260917);

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

/** Add a sine or triangle voice with a linear attack/hold/release env. */
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

function renderTrack(seed, index) {
  const rand = rng(seed + index * 7919);
  const buf = new Float32Array(SR * SECONDS);
  const rootMidi = 45 + Math.floor(rand() * 7); // A2..E3
  const progIndex = Math.floor(rand() * CHORDS.length);
  const bpm = 92 + Math.floor(rand() * 36);
  const style = index % 3 === 0 ? "pulse" : index % 3 === 1 ? "arp" : "pad";
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
    const steps = Math.floor(SECONDS / step);
    for (let s = 0; s < steps; s++) {
      const chord = prog[Math.floor((s * step) / chordDur) % 4];
      const base = rootMidi + 24 + chord[s % chord.length];
      const note = base + (PENTA[pattern[s % 8]] % 12);
      pluck(buf, s * step, midiToFreq(note), 0.09, 0.22 + rand() * 0.08);
    }
    echo(buf, step * 1.5, 0.34, 0.3);
  }

  if (style === "pulse") {
    const beats = Math.floor(SECONDS / beat);
    for (let b = 0; b < beats; b++) {
      if (b % 2 === 0) thump(buf, b * beat, 0.32);
      if (b % 2 === 1) tick(buf, b * beat, 0.05, rand);
    }
    // Low root drone under everything.
    prog.forEach((_, ci) =>
      padVoice(buf, ci * chordDur, chordDur - 1, midiToFreq(rootMidi - 12 + 12), 0.05, 0.8, 1.5, false),
    );
  }

  // Master: soft clip, normalize, fades.
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
    if (t > SECONDS - fadeOut) g *= Math.max(0, (SECONDS - t) / fadeOut);
    buf[i] *= g;
  }

  // Encode: PCM16 → mp3.
  const pcm = new Int16Array(buf.length);
  for (let i = 0; i < buf.length; i++) pcm[i] = Math.max(-32768, Math.min(32767, Math.round(buf[i] * 32767)));
  const enc = new lamejs.Mp3Encoder(1, SR, BITRATE);
  const chunks = [];
  for (let i = 0; i < pcm.length; i += 1152) chunks.push(enc.encodeBuffer(pcm.subarray(i, i + 1152)));
  chunks.push(enc.flush());
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

/** Unique two-word titles. */
const ADJ = [
  "Neon", "Violet", "Midnight", "Crystal", "Silent", "Lunar", "Electric", "Velvet",
  "Cosmic", "Amber", "Hidden", "Solar", "Glass", "Deep", "Slow", "Golden",
  "Faint", "Restless", "Paper", "Iron",
];
const NOUN = [
  "Drift", "Orbit", "Circuit", "Tide", "Mirage", "Voyage", "Signal", "Horizon",
  "Cascade", "Echo", "Bloom", "Current", "Harbor", "Lantern", "Meadow", "Static",
  "Fractal", "Compass", "Aurora", "Undertow",
];
function titles(count, seed) {
  const rand = rng(seed ^ 0x5f3759df);
  const combos = [];
  for (const a of ADJ) for (const n of NOUN) combos.push(`${a} ${n}`);
  for (let i = combos.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [combos[i], combos[j]] = [combos[j], combos[i]];
  }
  return combos.slice(0, count);
}

// ---- main -----------------------------------------------------------------

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const list = titles(COUNT, SEED)
  .map((title) => ({ title, slug: title.toLowerCase().replace(/[^a-z]+/g, "-") }))
  .sort((a, b) => a.slug.localeCompare(b.slug));

const manifest = [];
let bytes = 0;
for (let i = 0; i < list.length; i++) {
  const { title, slug } = list[i];
  const mp3 = renderTrack(SEED, i);
  writeFileSync(join(OUT_DIR, `${slug}.mp3`), mp3);
  manifest.push({ id: slug, file: `${slug}.mp3`, title, seconds: SECONDS });
  bytes += mp3.length;
  if ((i + 1) % 10 === 0 || i === list.length - 1) {
    console.log(`[music] ${i + 1}/${list.length} tracks (${(bytes / 1e6).toFixed(1)} MB)`);
  }
}

const seen = readdirSync(OUT_DIR).length;
if (seen !== manifest.length) throw new Error(`expected ${manifest.length} files, found ${seen}`);

const ts = `/** AUTO-GENERATED by scripts/generate-music.mjs — do not edit by hand. */
export type PlaylistTrack = { id: string; file: string; title: string; seconds: number };

export const PLAYLIST_TRACKS: readonly PlaylistTrack[] = [
${manifest.map((m) => `  { id: "${m.id}", file: "${m.file}", title: "${m.title}", seconds: ${m.seconds} },`).join("\n")}
];

export const PLAYLIST_COUNT = PLAYLIST_TRACKS.length;
`;
writeFileSync(MANIFEST, ts);
console.log(`[music] wrote ${manifest.length} mp3s to ${OUT_DIR}/ and ${MANIFEST}`);
