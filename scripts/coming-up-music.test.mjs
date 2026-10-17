#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { analyse, parseMp3Duration, renderTrack } from "./generate-music.mjs";
import { COMING_UP_TRACK } from "./generate-coming-up-music.mjs";

test("Coming Up has one two-minute, medium-bass instrumental recipe", () => {
  assert.equal(COMING_UP_TRACK.seconds, 120);
  assert.equal(COMING_UP_TRACK.bassProfile, "medium");
});

test("the generated Coming Up MP3 is a complete two-minute track", () => {
  const bytes = readFileSync(
    new URL("../public/event/coming-up.mp3", import.meta.url),
  );
  assert.ok(bytes.length > 100_000);
  assert.ok(Math.abs(parseMp3Duration(bytes) - COMING_UP_TRACK.seconds) < 1);
});

test("the Coming Up medium-bass recipe renders audible music", () => {
  const samples = renderTrack({ ...COMING_UP_TRACK, seconds: 10 });
  const { peak, rms } = analyse(samples);
  assert.ok(Number.isFinite(peak) && Number.isFinite(rms));
  assert.ok(peak > 0.5 && peak <= 0.95);
  assert.ok(rms > 0.02);
});
