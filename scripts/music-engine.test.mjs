#!/usr/bin/env node
/**
 * The music engine, exercised on short renders.
 *
 * The shipped library once contained three *byte-identical* pairs, because the
 * old renderer drew only (root note × chord shape) for its pad tracks and let
 * tempo — the one value that did vary — reach nothing but the drums. These
 * tests are the guard: scores must all differ, the engine must be deterministic,
 * and every render must actually contain music rather than silence or a crackle.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  analyse,
  assertDistinctScores,
  renderTrack,
  scoreFor,
  scoreSignature,
  TRACKS,
} from "./generate-music.mjs";

/** A short render of a track's own score — the engine, at a tenth of the cost. */
const shortRender = (track, seconds = 12) =>
  renderTrack({ seed: track.seed, style: track.style, seconds });

test("no two shipped tracks would render the same music", () => {
  assert.equal(assertDistinctScores(), TRACKS.length);
  const signatures = new Set(TRACKS.map((track) => scoreSignature(track)));
  assert.equal(signatures.size, TRACKS.length, "every track has its own score");
});

test("the pairs that shipped as duplicates are distinct now", () => {
  // These three pairs were byte-identical files: same root note, same chord
  // shape, and a tempo that never reached the pad at all.
  const pairs = [
    ["starter-northern-drift", "starter-low-gravity"],
    ["starter-long-exposure", "starter-deep-field"],
    ["starter-slow-orbit", "starter-glass-horizon"],
  ];
  const byId = new Map(TRACKS.map((track) => [track.id, track]));
  for (const [a, b] of pairs) {
    const one = byId.get(a);
    const two = byId.get(b);
    assert.ok(one && two, `${a} / ${b} are still in the catalogue`);
    assert.notEqual(
      scoreSignature(one),
      scoreSignature(two),
      `${a} and ${b} would still come out the same`,
    );
    assert.notDeepEqual(shortRender(one).slice(0, 44100), shortRender(two).slice(0, 44100));
  }
});

test("the same seed always renders the same audio", () => {
  const track = TRACKS[3];
  const first = shortRender(track);
  const second = shortRender(track);
  assert.deepEqual(Array.from(first.slice(0, 8820)), Array.from(second.slice(0, 8820)));
});

test("a score stays inside the ranges the music depends on", () => {
  for (const track of TRACKS) {
    const score = scoreFor(track);
    assert.ok(score.key >= 40 && score.key <= 52, `${track.id} key ${score.key}`);
    assert.ok(score.bpm >= 56 && score.bpm <= 101, `${track.id} bpm ${score.bpm}`);
    assert.ok(score.brightness >= 1400 && score.brightness <= 4600, `${track.id} brightness`);
    assert.ok(score.reverbMix > 0.1 && score.reverbMix < 0.5, `${track.id} reverb mix`);
    assert.equal(score.progression.length, 4, `${track.id} loops four chords`);
    assert.ok(
      score.progression.every((degree) => degree >= 0 && degree <= 6),
      `${track.id} stays inside the mode`,
    );
    assert.ok(score.layers.arp || score.layers.rhythm || score.layers.bells, `${track.id} has a voice`);
  }
});

test("every render is music: audible, dynamic, and free of blow-ups", () => {
  for (const track of TRACKS.slice(0, 6)) {
    const buf = shortRender(track, 20);
    const { peak, rms } = analyse(buf);
    assert.ok(Number.isFinite(peak) && Number.isFinite(rms), `${track.id} produced a non-finite sample`);
    assert.ok(peak > 0.5 && peak <= 0.95, `${track.id} peak ${peak.toFixed(3)}`);
    assert.ok(rms > 0.02, `${track.id} is effectively silent (rms ${rms.toFixed(4)})`);
    // Never a click: no single-sample jump bigger than a 5 kHz sine's.
    let biggest = 0;
    for (let i = 1; i < buf.length; i++) biggest = Math.max(biggest, Math.abs(buf[i] - buf[i - 1]));
    assert.ok(biggest < 0.5, `${track.id} has a discontinuity of ${biggest.toFixed(3)}`);
  }
});
