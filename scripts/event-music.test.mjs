#!/usr/bin/env node
import assert from "node:assert/strict";
import { test } from "node:test";
import { EVENT_TRACKS } from "./generate-event-music.mjs";
import {
  analyse,
  assertDistinctScores,
  renderTrack,
  scoreFor,
} from "./generate-music.mjs";

test("every Coming Up event has a distinct medium-bass soundtrack recipe", () => {
  assert.equal(assertDistinctScores(EVENT_TRACKS), EVENT_TRACKS.length);
  assert.equal(
    new Set(EVENT_TRACKS.map((track) => track.id)).size,
    EVENT_TRACKS.length,
  );
  assert.ok(EVENT_TRACKS.every((track) => track.bassProfile === "medium"));
  assert.ok(EVENT_TRACKS.every((track) => track.seconds === 180));
});

test("the medium-bass mix suppresses the sustained 124 Hz bass harmonic", () => {
  const track = EVENT_TRACKS.find((entry) => entry.id === "wow-forever");
  assert.ok(track);
  const score = scoreFor(track);
  // This seed's opening root is E1; its third harmonic is about 123.6 Hz.
  assert.equal(score.key, 40);
  assert.equal(score.progression[0], 0);
  const rootHz = 440 * 2 ** ((score.key - 12 - 69) / 12);
  const toneHz = rootHz * 3;
  const standard = renderTrack({
    ...track,
    seconds: 12,
    bassProfile: "standard",
  });
  const medium = renderTrack({ ...track, seconds: 12 });
  const toneMagnitude = (samples) => {
    const sampleRate = 44100;
    const start = 2 * sampleRate;
    const count = 6 * sampleRate;
    let real = 0;
    let imaginary = 0;
    for (let i = 0; i < count; i++) {
      const phase = (2 * Math.PI * toneHz * i) / sampleRate;
      const sample = samples[start + i];
      real += sample * Math.cos(phase);
      imaginary -= sample * Math.sin(phase);
    }
    return (2 * Math.hypot(real, imaginary)) / count;
  };
  assert.ok(
    toneMagnitude(medium) < toneMagnitude(standard) * 0.45,
    "the 123.6 Hz harmonic should be at least 55% quieter in the event mix",
  );
});

test("the medium-bass event mix renders audible, finite audio", () => {
  const track = EVENT_TRACKS[0];
  const rendered = renderTrack({ ...track, seconds: 10 });
  const { peak, rms } = analyse(rendered);
  assert.ok(Number.isFinite(peak) && Number.isFinite(rms));
  assert.ok(peak > 0.5 && peak <= 0.95);
  assert.ok(rms > 0.02);
  assert.throws(
    () => renderTrack({ ...track, seconds: 2, bassProfile: "unknown" }),
    /Unknown bass profile/,
  );
});
