/**
 * Generative ambient background music — synthesized with Web Audio, no file
 * to fetch. A fetched mp3 can silently fail to load (flaky preview networks,
 * strict mobile proxies), while code always plays. Four soft chords
 * (Am9 → Fmaj9 → Cmaj7 → G6) crossfade on a slow loop under a drifting
 * low-pass filter — quiet enough to sit under the UI. Follows the same
 * mute intent as the SFX (`system-space-music` in localStorage).
 */
import { getAudioContext } from "./sfx";

const CHORD_SECONDS = 8;
const ATTACK = 2.5;
const RELEASE = 3;
const FADE_IN = 3;
const FADE_OUT = 0.6;
const MASTER_GAIN = 0.045;

/** Am9 → Fmaj9 → Cmaj7 → G6, root frequencies in Hz. */
const CHORDS: readonly (readonly number[])[] = [
  [110.0, 164.81, 246.94, 329.63],
  [87.31, 130.81, 164.81, 261.63],
  [130.81, 196.0, 246.94, 392.0],
  [98.0, 146.83, 246.94, 293.66],
];

/** Per chord note: a sine at pitch plus a faint triangle an octave up. */
const VOICES: ReadonlyArray<readonly [OscillatorType, number, number]> = [
  ["sine", 1, 0.3],
  ["triangle", 2, 0.05],
];

let master: GainNode | null = null;
let filter: BiquadFilterNode | null = null;
let lfo: OscillatorNode | null = null;
let pumpTimer: number | null = null;
let nextChordAt = 0;
let step = 0;
let resumeCleanups: Array<() => void> = [];

function scheduleChord(ac: AudioContext, at: number, freqs: readonly number[]) {
  const holdUntil = at + CHORD_SECONDS - ATTACK;
  const end = at + CHORD_SECONDS + RELEASE; // tail overlaps the next chord
  for (const freq of freqs) {
    for (const [type, mult, vol] of VOICES) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.value = freq * mult;
      osc.detune.value = Math.random() * 7 - 3.5; // gentle chorus shimmer
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.linearRampToValueAtTime(vol, at + ATTACK);
      gain.gain.setValueAtTime(vol, holdUntil);
      gain.gain.linearRampToValueAtTime(0.0001, end);
      osc.connect(gain).connect(filter!);
      osc.start(at);
      osc.stop(end + 0.1);
    }
  }
}

/** A suspended context (autoplay not yet unlocked) waits for the first
 *  gesture — several events, because Safari skips pointerdown. */
function unlockWhenGestured(ac: AudioContext) {
  const resume = () => {
    void ac.resume().catch(() => undefined);
    for (const off of resumeCleanups) off();
    resumeCleanups = [];
  };
  for (const type of ["pointerdown", "touchend", "click", "keydown"] as const) {
    window.addEventListener(type, resume, { once: true });
    resumeCleanups.push(() => window.removeEventListener(type, resume));
  }
}

/** Start the ambient loop (no-op when already playing or no Web Audio). */
export function startAmbient() {
  const ac = getAudioContext();
  if (!ac || master) return;

  master = ac.createGain();
  filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  filter.Q.value = 0.7;
  lfo = ac.createOscillator();
  const lfoDepth = ac.createGain();
  lfo.frequency.value = 0.05;
  lfoDepth.gain.value = 300;
  lfo.connect(lfoDepth).connect(filter.frequency);
  filter.connect(master).connect(ac.destination);
  lfo.start();

  const now = ac.currentTime;
  master.gain.setValueAtTime(0.0001, now);
  master.gain.linearRampToValueAtTime(MASTER_GAIN, now + FADE_IN);

  step = 0;
  nextChordAt = now + 0.05;
  const pump = () => {
    if (!master) return;
    while (nextChordAt < ac.currentTime + CHORD_SECONDS - 2) {
      scheduleChord(ac, nextChordAt, CHORDS[step % CHORDS.length]);
      step += 1;
      nextChordAt += CHORD_SECONDS;
    }
  };
  pump();
  pumpTimer = window.setInterval(pump, 1000);

  if (ac.state === "suspended") unlockWhenGestured(ac);
}

/** Stop the loop and fade out; the shared context stays for the SFX. */
export function stopAmbient() {
  const ac = getAudioContext();
  if (pumpTimer !== null) {
    window.clearInterval(pumpTimer);
    pumpTimer = null;
  }
  for (const off of resumeCleanups) off();
  resumeCleanups = [];
  if (!master || !ac) return;
  const now = ac.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
  master.gain.linearRampToValueAtTime(0.0001, now + FADE_OUT);
  const oldMaster = master;
  const oldLfo = lfo;
  master = null;
  filter = null;
  lfo = null;
  window.setTimeout(() => {
    try {
      oldMaster.disconnect();
      oldLfo?.stop();
    } catch {
      /* already torn down */
    }
  }, (FADE_OUT + 0.4) * 1000);
}
