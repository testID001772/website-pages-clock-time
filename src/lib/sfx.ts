/**
 * Tiny synthesized UI sound effects — Web Audio oscillators, no audio files.
 *
 * UI effects are independent of background music: muting the playlist does not
 * silence clicks. They share the volume slider, are synthesized in Web Audio,
 * and create the AudioContext lazily on a user gesture (so SSR and autoplay
 * policies never start audio unexpectedly).
 */
import { readVolume } from "./volume";

export type SfxName = "click" | "pop" | "open" | "close" | "chime";

let ctx: AudioContext | null = null;
let explicitSfxThisTask = false;

/** Lets the delegated UI listener avoid adding a generic click on top. */
export function sfxWasPlayedInCurrentTask(): boolean {
  return explicitSfxThisTask;
}

function audioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  return ctx;
}

/**
 * The app's single AudioContext, shared by the UI effects and the ambient
 * music. Creating/resuming outside a user gesture is allowed — a suspended
 * context simply waits for the first gesture.
 */
export function getAudioContext(): AudioContext | null {
  return audioCtx();
}

/** `clock-time-music`, exported so the music picker shares one key. */
export const MUSIC_PREF = "music";

type Tone = {
  /** Start frequency (Hz). */
  from: number;
  /** End frequency (Hz) — swept exponentially over the tone. */
  to: number;
  /** Seconds. */
  dur: number;
  /** Peak gain (0–1) — kept low so effects stay subtle. */
  gain: number;
  /** Seconds to wait before this tone starts. */
  delay?: number;
  type?: OscillatorType;
};

function tone(ac: AudioContext, { from, to, dur, gain, delay = 0, type = "sine" }: Tone) {
  // The reader's volume scales the effects too — at 100% they are exactly the
  // gains below (deliberately subtle); at 30% they are quietly proportional.
  const at = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), at + dur);
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(gain, at + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

const SOUNDS: Record<Exclude<SfxName, "click">, Tone[]> = {
  /** Friendly pop — picking a game, choosing a language. */
  pop: [{ from: 480, to: 840, dur: 0.09, gain: 0.07, type: "triangle" }],
  /** Rising sweep — opening the release list / language menu. */
  open: [{ from: 320, to: 720, dur: 0.12, gain: 0.05, type: "triangle" }],
  /** Falling sweep — collapsing again. */
  close: [{ from: 720, to: 320, dur: 0.12, gain: 0.05, type: "triangle" }],
  /** Little fanfare — the finale (midnight + preview). */
  chime: [
    { from: 523, to: 523, dur: 0.16, gain: 0.06 },
    { from: 659, to: 659, dur: 0.16, gain: 0.06, delay: 0.12 },
    { from: 784, to: 784, dur: 0.16, gain: 0.06, delay: 0.24 },
    { from: 1047, to: 1047, dur: 0.34, gain: 0.07, delay: 0.36 },
  ],
};

/** A short, non-musical noise transient for a tactile click. */
function click(ac: AudioContext, volume: number) {
  const at = ac.currentTime;
  const dur = 0.028;
  const sampleCount = Math.ceil(ac.sampleRate * dur);
  const buffer = ac.createBuffer(1, sampleCount, ac.sampleRate);
  const samples = buffer.getChannelData(0);
  const decay = ac.sampleRate * 0.0035;
  for (let i = 0; i < sampleCount; i++) {
    samples[i] = (Math.random() * 2 - 1) * Math.exp(-i / decay);
  }

  const source = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const amp = ac.createGain();
  source.buffer = buffer;
  filter.type = "highpass";
  filter.frequency.setValueAtTime(900, at);
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(0.045 * volume, at + 0.001);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  source.connect(filter).connect(amp).connect(ac.destination);
  source.start(at);
  source.stop(at + dur);
}

/** Play a UI sound. Silent at volume 0, on SSR, or without Web Audio. */
export function playSfx(name: SfxName) {
  if (typeof window !== "undefined") {
    explicitSfxThisTask = true;
    queueMicrotask(() => {
      explicitSfxThisTask = false;
    });
  }
  const volume = readVolume();
  if (volume <= 0) return;
  const ac = audioCtx();
  if (!ac) return;
  if (name === "click") {
    click(ac, volume);
    return;
  }
  for (const t of SOUNDS[name]) tone(ac, { ...t, gain: t.gain * volume });
}
