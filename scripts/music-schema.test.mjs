#!/usr/bin/env node
/**
 * `migrations/0008_music.sql` against a real Postgres (PGLite, the same WASM
 * engine the sandbox preview runs on), plus the two statements the audio
 * endpoint depends on.
 *
 * The music library is the part of the feature with no compiler behind it: a
 * typo in a check constraint, a library that silently ships seeded rows again,
 * or an upload whose bytes do not survive the base64 round-trip would all ship
 * quietly. This test applies the migration files the way `src/lib/db.ts` does
 * and runs the exact statements `src/lib/server/music.ts` runs.
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  ALL_TRACKS,
  libraryRows,
  parseMp3Duration,
  readSeedRows,
  readTrackDurations,
  TRACKS,
} from "./generate-music.mjs";
import { pendingMigrations } from "./migration-plan.mjs";
import { projectRoot } from "./with-app-env.mjs";

const ROOT = projectRoot();
const MIGRATIONS_DIR = join(ROOT, "migrations");
/** The seed the generator owns (0009 shipped the first three tracks). */
const MIGRATION_NAME = "migrations/0010_music_library.sql";

/** A fresh embedded Postgres with every migration applied, oldest first. */
async function migratedDb() {
  const files = (await readdir(MIGRATIONS_DIR)).filter((name) => name.endsWith(".sql"));
  const db = new PGlite();
  await db.exec(
    "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  for (const { name } of pendingMigrations(files, [])) {
    await db.transaction(async (tx) => {
      await tx.exec(await readFile(join(MIGRATIONS_DIR, name), "utf8"));
      await tx.query("insert into _migrations (name) values ($1)", [name]);
    });
  }
  return db;
}

/** The library query from `src/lib/server/music.ts`. */
const LIST_SQL = `
  select id, title, artist, source, seconds, sort_order
  from music_tracks
  order by sort_order asc, id asc
  limit 200
`;

test("the library ships exactly the catalogue, starters then extras", async () => {
  const db = await migratedDb();
  const rows = await db.query(LIST_SQL);
  assert.deepEqual(
    rows.rows.map((row) => row.id),
    ALL_TRACKS.map((track) => track.id),
    "a fresh database must ship the starter tracks in playlist order",
  );
  assert.equal(
    rows.rows.length,
    ALL_TRACKS.length,
    "the shipped playlist is exactly the catalogue, not the old 100-row manifest",
  );
  await db.close();
});

test("no shipped track is a dead link", async () => {
  const db = await migratedDb();
  const rows = await db.query(LIST_SQL);
  const durations = readTrackDurations();
  for (const row of rows.rows) {
    assert.ok(
      row.source.startsWith("/music/"),
      `${row.id} must point at a shipped file, not ${row.source.slice(0, 32)}`,
    );
    const file = row.source.replace("/music/", "");
    const size = (await stat(join(ROOT, "public/music", file))).size;
    assert.ok(size > 10_000, `${file} looks empty (${size} bytes)`);
    const seconds = durations[file];
    assert.ok(seconds !== null, `${file} must be a readable mp3`);
    assert.ok(
      Math.abs(seconds - row.seconds) <= 1,
      `${row.id}: row says ${row.seconds}s, file holds ${seconds?.toFixed(1)}s`,
    );
  }
  await db.close();
});

test("the seed migration, the generator recipes and the rows agree", async () => {
  const rows = readSeedRows();
  assert.equal(Object.keys(rows).length, ALL_TRACKS.length);
  for (const track of ALL_TRACKS) {
    const row = rows[track.id];
    assert.ok(row, `${track.id} is missing from ${MIGRATION_NAME}`);
    assert.equal(row.title, track.title);
    assert.equal(row.artist, track.artist);
    assert.equal(row.source, `/music/${track.file}`);
    assert.equal(row.seconds, track.seconds);
  }
  const bytes = await readFile(join(ROOT, "public/music", TRACKS[0].file));
  assert.ok(parseMp3Duration(bytes) > 25, "a starter track must hold real audio");
});

test("the static catalogue mirrors the seeded library", async () => {
  // The GitHub Pages build has no database: it plays `public/music/library.json`
  // (see `parseStaticTracks`). The rows there must be the seeded ones, or the
  // static site would ship a playlist the app does not have.
  const file = join(ROOT, "public/music/library.json");
  const document = JSON.parse(await readFile(file, "utf8"));
  assert.deepEqual(document.tracks, libraryRows());
  for (const row of document.tracks) {
    assert.ok(row.source.startsWith("/music/"), `${row.id} must point at a shipped file`);
    assert.ok(
      existsSync(join(ROOT, "public/music", row.source.replace("/music/", ""))),
      `${row.id} → ${row.source} is not in public/music`,
    );
  }
});

test("the generated 100-track manifest stays gone", async () => {
  await assert.rejects(
    stat(join(ROOT, "src/lib/playlist-tracks.ts")),
    "expected src/lib/playlist-tracks.ts to be removed — it listed 100 mp3s that never existed",
  );
});

test("a track inserted the way the editor does comes back in playlist order", async () => {
  const db = await migratedDb();
  const source = `data:audio/wav;base64,${Buffer.from("RIFF....WAVE").toString("base64")}`;
  await db.query(
    `insert into music_tracks (id, title, artist, source, seconds, sort_order)
     values ($1, $2, $3, $4, $5, $6)`,
    ["t-second", "Second", "Nova", source, 24, 2],
  );
  await db.query(
    `insert into music_tracks (id, title, artist, source, seconds, sort_order)
     values ($1, $2, $3, $4, $5, $6)`,
    ["t-first", "First", "", "https://cdn.example.com/song.mp3", 0, 1],
  );
  const rows = await db.query(LIST_SQL);
  // The hand-added rows keep their own relative order alongside the starters.
  assert.deepEqual(
    rows.rows
      .filter((row) => ["t-first", "t-second"].includes(row.id))
      .map((row) => [row.id, row.sort_order, row.seconds]),
    [
      ["t-first", 1, 0],
      ["t-second", 2, 24],
    ],
  );
  // `artist` defaults to "" — the column is never null for the UI.
  assert.equal(rows.rows.find((row) => row.id === "t-first").artist, "");
  await db.close();
});

test("the stored upload survives base64 and matches what /api/music/<id> serves", async () => {
  const db = await migratedDb();
  const bytes = Buffer.from("RIFF\x00\x01\x02\xfe\xffWAVEfmt ");
  const source = `data:audio/wav;base64,${bytes.toString("base64")}`;
  await db.query(
    `insert into music_tracks (id, title, artist, source, seconds, sort_order)
     values ($1, $2, '', $3, 2, 1)`,
    ["t-audio", "Blip", source],
  );
  const rows = await db.query("select source from music_tracks where id = $1", ["t-audio"]);
  const match = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([\s\S]*)$/i.exec(rows.rows[0].source);
  assert.ok(match, "stored source must stay a parseable data URL");
  assert.equal(match[1], "audio/wav");
  assert.deepEqual(Buffer.from(match[2], "base64"), bytes);
  await db.close();
});

test("the check constraints reject a track the editor could not render", async () => {
  const db = await migratedDb();
  const insert = (title, artist, seconds) =>
    db.query(
      `insert into music_tracks (id, title, artist, source, seconds)
       values ($1, $2, $3, '/music/x.mp3', $4)`,
      [`id-${Math.random().toString(36).slice(2)}`, title, artist, seconds],
    );
  await assert.rejects(insert("", "", 0), /check|violates/i);
  await assert.rejects(insert("x".repeat(121), "", 0), /check|violates/i);
  await assert.rejects(insert("ok", "y".repeat(121), 0), /check|violates/i);
  await assert.rejects(insert("ok", "", -1), /check|violates/i);
  await assert.rejects(insert("ok", "", 21_601), /check|violates/i);
  await insert("Long Enough", "", 2_000); // the boundaries themselves are fine
  const rows = await db.query("select count(*) as n from music_tracks");
  assert.equal(Number(rows.rows[0].n), 1 + ALL_TRACKS.length);
  await db.close();
});

test("a duplicate id is rejected so a reorder can never fork a row", async () => {
  const db = await migratedDb();
  await db.query(
    `insert into music_tracks (id, title, artist, source, seconds, sort_order)
     values ('dup', 'One', '', '/music/a.mp3', 0, 1)`,
  );
  await assert.rejects(
    db.query(
      `insert into music_tracks (id, title, artist, source, seconds, sort_order)
       values ('dup', 'Two', '', '/music/b.mp3', 0, 2)`,
    ),
    /duplicate key|unique/i,
  );
  await db.close();
});

test("move-up swaps neighbours by rewriting the whole order", async () => {
  const db = await migratedDb();
  for (const [index, id] of ["a", "b", "c"].entries()) {
    await db.query(
      `insert into music_tracks (id, title, artist, source, seconds, sort_order)
       values ($1, $2, '', '/music/x.mp3', 0, $3)`,
      [id, id.toUpperCase(), index + 1],
    );
  }
  // The exact loop `moveTrack` runs after swapping `b` up.
  const order = ["b", "a", "c"];
  for (const [position, id] of order.entries()) {
    await db.query("update music_tracks set sort_order = $1 where id = $2", [position + 1, id]);
  }
  const rows = await db.query(LIST_SQL);
  const added = rows.rows.map((row) => row.id).filter((id) => ["a", "b", "c"].includes(id));
  assert.deepEqual(added, ["b", "a", "c"]);
  await db.query("delete from music_tracks where id = 'b'");
  const after = await db.query(LIST_SQL);
  assert.deepEqual(
    after.rows.map((row) => row.id).filter((id) => ["a", "b", "c"].includes(id)),
    ["a", "c"],
  );
  await db.close();
});
