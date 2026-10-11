import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { adminEmails, isAdminEmail } from "./admin-env.ts";

describe("admin-env", () => {
  it("parses comma-separated emails, trimmed and lowercased", () => {
    process.env.ADMIN_EMAILS = " Boss@Example.com , ops@example.com ,,";
    assert.deepEqual(adminEmails(), ["boss@example.com", "ops@example.com"]);
  });

  it("matches addresses case-insensitively", () => {
    process.env.ADMIN_EMAILS = "boss@example.com";
    assert.equal(isAdminEmail("BOSS@Example.com"), true);
    assert.equal(isAdminEmail("  boss@example.com "), true);
    assert.equal(isAdminEmail("rando@example.com"), false);
    assert.equal(isAdminEmail(null), false);
    assert.equal(isAdminEmail(undefined), false);
  });

  it("grants nobody when unset or blank", () => {
    delete process.env.ADMIN_EMAILS;
    assert.deepEqual(adminEmails(), []);
    assert.equal(isAdminEmail("boss@example.com"), false);
    process.env.ADMIN_EMAILS = "   ";
    assert.deepEqual(adminEmails(), []);
  });
});
