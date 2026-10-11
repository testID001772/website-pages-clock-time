import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { projectRoot } from "./with-app-env.mjs";

/**
 * The Motion toggle only pauses decorative animation. Clock time is always
 * actual system time: the home tick and countdown helpers must never depend
 * on the motion setting, and the motion-off CSS must never hide time output.
 */

const homeView = readFileSync(join(projectRoot(), "src/components/home-view.tsx"), "utf8");
const countdown = readFileSync(join(projectRoot(), "src/lib/countdown.ts"), "utf8");
const css = readFileSync(join(projectRoot(), "src/styles.css"), "utf8");

test("home clock tick does not depend on the Motion setting", () => {
  assert.doesNotMatch(homeView, /motion/i, "home-view must not reference motion");
  assert.doesNotMatch(homeView, /useTheme/, "home-view must not consume the theme");
});

test("countdown helpers are pure functions of real time", () => {
  assert.doesNotMatch(countdown, /motion/i, "countdown.ts must not reference motion");
  assert.match(countdown, /formatNow|formatTarget/, "date formatters still present");
});

test("home tick reads actual system time", () => {
  assert.match(homeView, /new Date\(\)|Date\.now\(\)/, "tick must read the system clock");
  assert.match(homeView, /setInterval/, "tick must run on an interval");
});

test("motion-off CSS only kills animation, never time output", () => {
  const block = css.match(/html\[data-motion="off"\][\s\S]*?\{([\s\S]*?)\}/);
  assert.ok(block, "motion-off rule still present");
  assert.doesNotMatch(block[1], /display|visibility/, "must not hide elements");
  assert.match(block[1], /animation:\s*none/, "must only stop animation");
});

test("space-off keeps the solar system visible (static lineup, no void)", () => {
  assert.doesNotMatch(
    css,
    /data-space="off"[\s\S]{0,160}?\.solar-wrap/,
    "space-off must not hide the solar system",
  );
});
