/**
 * Tiny synthesized UI sound effects — Web Audio oscillators, no audio files.
 *
 * Effects follow the site's audio intent: when background music is muted
 * (`system-space-music === "false"` in localStorage), effects stay silent
 * too. The AudioContext is created lazily inside the first gesture-driven
 * call, so autoplay policies never block it and SSR never touches it.
 */

export type SfxName = "click" | "pop" | "open" | "close" | "chime";

let ctx: AudioContext | null = null;

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

function sfxEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("system-space-music") !== "false";
}

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

const SOUNDS: Record<SfxName, Tone[]> = {
  /** Soft tick — header toggles. */
  click: [{ from: 660, to: 440, dur: 0.07, gain: 0.05 }],
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

/** Play a UI sound. Silent when muted, on SSR, or without Web Audio. */
export function playSfx(name: SfxName) {
  if (!sfxEnabled()) return;
  const ac = audioCtx();
  if (!ac) return;
  for (const t of SOUNDS[name]) tone(ac, t);
}
