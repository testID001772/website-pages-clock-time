import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_NEWS_TAG,
  excerpt,
  formatNewsDate,
  formatNewsDateTime,
  isNewsTag,
  newsLead,
  newsTagLabel,
  NEWS_LIMITS,
  NEWS_TAGS,
  sortNews,
  type NewsPost,
} from "./news.ts";
import { en } from "./i18n/locales/en.ts";

function post(over: Partial<NewsPost> = {}): NewsPost {
  return {
    id: "a",
    title: "Title",
    summary: "Summary",
    body: "Body",
    tag: "update",
    pinned: false,
    published: true,
    authorId: null,
    authorName: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

describe("news helpers", () => {
  it("sorts pinned first, then newest first, without mutating the input", () => {
    const input = [
      post({ id: "old", createdAt: "2026-01-01T00:00:00.000Z" }),
      post({ id: "newer", createdAt: "2026-06-01T00:00:00.000Z" }),
      post({ id: "pinned", pinned: true, createdAt: "2025-01-01T00:00:00.000Z" }),
    ];
    const before = input.map((p) => p.id);
    const sorted = sortNews(input);
    assert.deepEqual(sorted.map((p) => p.id), ["pinned", "newer", "old"]);
    assert.deepEqual(input.map((p) => p.id), before, "input order preserved");
    assert.notEqual(sorted, input, "returns a copy");
  });

  it("breaks ties by id so both SQL backends agree", () => {
    const at = "2026-05-05T12:00:00.000Z";
    const sorted = sortNews([post({ id: "b", createdAt: at }), post({ id: "a", createdAt: at })]);
    assert.deepEqual(sorted.map((p) => p.id), ["a", "b"]);
  });

  it("accepts only known tags", () => {
    for (const tag of NEWS_TAGS) assert.equal(isNewsTag(tag), true);
    assert.equal(isNewsTag("gossip"), false);
    assert.equal(isNewsTag(""), false);
    assert.equal(isNewsTag(7), false);
    assert.equal(DEFAULT_NEWS_TAG, "update");
  });

  it("labels every tag in every shipped locale", () => {
    for (const tag of NEWS_TAGS) {
      assert.notEqual(newsTagLabel(tag, en), "");
    }
  });

  it("collapses whitespace and cuts an excerpt on a word boundary", () => {
    assert.equal(excerpt("  two\n\nlines  "), "two lines");
    assert.equal(excerpt("short", 40), "short");
    const long = excerpt(`${"word ".repeat(60)}end`, 40);
    assert.ok(long.length <= 41, `excerpt kept short: ${long.length}`);
    assert.match(long, /…$/);
    assert.ok(!/\s…$/.test(long), "no dangling space before the ellipsis");
  });

  it("falls back to an excerpt when a post has no summary", () => {
    assert.equal(newsLead({ summary: "  Given  ", body: "ignored" }), "Given");
    assert.match(newsLead({ summary: "", body: "Body text here" }), /^Body text here$/);
  });

  it("formats dates per locale and degrades instead of throwing", () => {
    const iso = "2026-09-05T11:15:00.000Z";
    assert.match(formatNewsDate(iso, "en"), /2026/);
    assert.notEqual(formatNewsDate(iso, "de"), "");
    // An unknown locale tag must not take the feed down.
    assert.notEqual(formatNewsDate(iso, "not a tag"), "");
    assert.notEqual(formatNewsDateTime(iso, "not a tag"), "");
    // An unparseable timestamp is returned as-is rather than an Invalid Date.
    assert.equal(formatNewsDate("garbage", "en"), "garbage");
  });

  it("keeps the schema limits in one place", () => {
    assert.ok(NEWS_LIMITS.titleMin < NEWS_LIMITS.title);
    assert.ok(NEWS_LIMITS.title <= 200 && NEWS_LIMITS.summary <= 500);
    assert.ok(NEWS_LIMITS.feed > 0);
  });
});
