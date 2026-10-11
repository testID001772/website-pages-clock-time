#!/usr/bin/env node
/**
 * `migrations/0005_news.sql` against a real Postgres (PGLite, the same WASM
 * engine the sandbox preview runs on).
 *
 * The news schema is the one part of the feature that has no compiler and no
 * typechecker behind it: a typo in a check constraint, a seed insert that does
 * not match its column list, or a feed query whose ORDER BY disagrees with
 * `sortNews` would all ship silently. This test applies the migration files the
 * way `src/lib/db.ts` does and exercises the exact statements
 * `src/lib/server/news.ts` runs.
 *
 * Not a substitute for the app's own end-to-end pass — purely a guard on the
 * SQL, so it runs without a server, a request context or a DATABASE_URL.
 */
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { pendingMigrations } from "./migration-plan.mjs";
import { projectRoot } from "./with-app-env.mjs";

const MIGRATIONS_DIR = join(projectRoot(), "migrations");

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

const FEED_SQL = `
  select id, title, summary, body, tag, pinned, published, author_id,
         author_name, created_at, updated_at
  from news_posts
  where published = true
  order by pinned desc, created_at desc, id asc
  limit 30
`;

test("news migration applies cleanly on a fresh database", async () => {
  const db = await migratedDb();
  try {
    const columns = await db.query(`
      select column_name, is_nullable, data_type
      from information_schema.columns
      where table_name = 'news_posts'
      order by ordinal_position
    `);
    assert.deepEqual(
      columns.rows.map((r) => r.column_name),
      [
        "id",
        "title",
        "summary",
        "body",
        "tag",
        "pinned",
        "published",
        "author_id",
        "author_name",
        "created_at",
        "updated_at",
      ],
    );

    const seeded = await db.query("select count(*)::int as n from news_posts");
    assert.equal(seeded.rows[0].n, 4, "the starter posts are seeded");

    const applied = await db.query("select name from _migrations order by name");
    assert.ok(
      applied.rows.some((r) => r.name === "0005_news.sql"),
      "the migration is recorded so it never re-runs",
    );
  } finally {
    await db.close();
  }
});

test("the feed returns published posts, pinned first then newest first", async () => {
  const db = await migratedDb();
  try {
    const { rows } = await db.query(FEED_SQL);
    assert.equal(rows.length, 4);
    assert.equal(rows[0].pinned, true, "the pinned post leads the feed");
    assert.equal(rows[0].id, "welcome-v2");
    const rest = rows.slice(1).map((r) => r.created_at.getTime());
    assert.deepEqual(rest, [...rest].sort((a, b) => b - a), "then newest first");
    for (const row of rows) {
      assert.equal(row.published, true);
      assert.ok(row.title.length > 0);
    }
    assert.ok(rows[0].created_at instanceof Date, "timestamptz arrives as a Date");
  } finally {
    await db.close();
  }
});

test("drafts stay out of the public feed but show up for staff", async () => {
  const db = await migratedDb();
  try {
    await db.query(
      `insert into news_posts (id, title, tag, published, author_name)
       values ('draft-1', 'Unreleased announcement', 'note', false, 'Ada')`,
    );
    const feed = await db.query(FEED_SQL);
    assert.equal(feed.rows.length, 4, "the draft is not published");
    const admin = await db.query(
      "select id from news_posts order by updated_at desc, created_at desc, id asc limit 30",
    );
    assert.equal(admin.rows[0].id, "draft-1", "staff list leads with the newest edit");
  } finally {
    await db.close();
  }
});

test("constraints reject what the server functions validate", async () => {
  const db = await migratedDb();
  try {
    const insert = (columns) =>
      db.query(
        `insert into news_posts (id, title, summary, body, tag, pinned, published, author_name)
         values ('x', $1, $2, $3, $4, false, true, 'Ada')`,
        columns,
      );

    // A tag outside the enum.
    await assert.rejects(insert(["T", "", "", "gossip"]), /news_posts_tag_chk/);
    // A title shorter than the zod minimum.
    await assert.rejects(insert(["ab", "", "", "update"]), /news_posts_title_len_chk/);
    // A summary longer than the zod maximum.
    await assert.rejects(
      insert(["Title", "s".repeat(241), "", "update"]),
      /news_posts_summary_len_chk/,
    );
    // The bounds themselves are accepted.
    await db.query("delete from news_posts where id = 'x'");
    await insert(["abc", "s".repeat(240), "", "note"]);
    const stored = await db.query("select title, summary from news_posts where id = 'x'");
    assert.equal(stored.rows[0].title, "abc");
    assert.equal(stored.rows[0].summary.length, 240);
  } finally {
    await db.close();
  }
});

test("create, edit, publish and delete round-trip", async () => {
  const db = await migratedDb();
  try {
    const created = await db.query(
      `insert into news_posts (id, title, summary, body, tag, pinned, published, author_id, author_name)
       values ($1, $2, $3, $4, 'update', true, false, 'dev-user', 'Ada')
       returning id, title, published, pinned, tag, author_name, created_at, updated_at`,
      ["post-1", "Hello orbit", "One line", "Full body"],
    );
    assert.equal(created.rows[0].published, false);
    assert.equal(created.rows[0].author_name, "Ada");

    const updated = await db.query(
      `update news_posts
       set title = $2, summary = $3, body = $4, tag = $5, pinned = $6, published = $7, updated_at = now()
       where id = $1
       returning id, title, published, pinned, tag`,
      ["post-1", "Hello orbit, again", "", "Full body", "release", false, true],
    );
    assert.equal(updated.rows[0].title, "Hello orbit, again");
    assert.equal(updated.rows[0].published, true);
    assert.equal(updated.rows[0].pinned, false);
    assert.equal(updated.rows[0].tag, "release");

    // An update against a missing id returns no row — the server function turns
    // that into `NEWS_NOT_FOUND`.
    const missing = await db.query("update news_posts set title = 'x' where id = 'nope' returning id");
    assert.equal(missing.rows.length, 0);

    await db.query("delete from news_posts where id = $1", ["post-1"]);
    const gone = await db.query("select id from news_posts where id = 'post-1'");
    assert.equal(gone.rows.length, 0);
  } finally {
    await db.close();
  }
});

test("the rebrand migration rewrites legacy seed rows and is idempotent", async () => {
  const db = await migratedDb();
  try {
    // Simulate a database that ran the ORIGINAL seed (pre-rename): put the old
    // brand back, exactly where 0006 expects to find it.
    await db.query(`
      update news_posts set
        title = replace(title, 'Clock Time', 'System Space'),
        summary = replace(summary, 'Clock Time', 'System Space'),
        body = replace(body, 'Clock Time', 'System Space'),
        author_name = replace(author_name, 'Clock Time', 'System Space')
      where id in ('welcome-v2', 'install-on-your-phone')
    `);
    await db.query("update news_posts set title = 'System Space v2 is live' where id = 'welcome-v2'");
    // A post a staff member wrote must never be touched by the rebrand.
    await db.query(
      `insert into news_posts (id, title, tag, published, author_name)
       values ('staff-post', 'System Space is my favourite', 'note', true, 'Ada')`,
    );

    // Scoped to the seeded ids: the staff post below also mentions the old
    // name, and the rebrand must leave it alone.
    const legacy = await db.query(
      `select count(*)::int as n from news_posts
       where id in ('welcome-v2', 'install-on-your-phone')
         and (title like '%System Space%' or author_name like '%System Space%')`,
    );
    assert.equal(legacy.rows[0].n, 2, "two legacy rows to rebrand");

    const migration = await readFile(join(MIGRATIONS_DIR, "0006_rebrand.sql"), "utf8");
    await db.exec(migration);

    const rebranded = await db.query(
      "select id, title, author_name from news_posts where id in ('welcome-v2', 'install-on-your-phone') order by id",
    );
    // Ordered by id: 'install-on-your-phone' sorts before 'welcome-v2'.
    assert.deepEqual(rebranded.rows.map((r) => r.title), [
      "Install Clock Time on your phone",
      "Clock Time v1 is live",
    ]);
    for (const row of rebranded.rows) assert.equal(row.author_name, "Clock Time");

    const staff = await db.query("select title from news_posts where id = 'staff-post'");
    assert.equal(staff.rows[0].title, "System Space is my favourite", "staff posts untouched");

    // Second run changes nothing (the guard makes it a no-op).
    await db.exec(migration);
    const after = await db.query("select count(*)::int as n from news_posts where author_name = 'Clock Time'");
    assert.equal(after.rows[0].n, 4, "still four seeded bylines, no double edit");
  } finally {
    await db.close();
  }
});

test("no shipped seed text is left on the old brand", async () => {
  const db = await migratedDb();
  try {
    const { rows } = await db.query(
      "select id from news_posts where title like '%System Space%' or body like '%System Space%' or author_name like '%System Space%'",
    );
    assert.deepEqual(rows, [], "the seeded feed speaks the current brand");
  } finally {
    await db.close();
  }
});
