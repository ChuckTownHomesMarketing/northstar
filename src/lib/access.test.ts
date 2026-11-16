import { describe, expect, it } from "vitest";
import { canSignIn, devLoginEnabled, isCompanyEmail, normalizeEmail } from "./access";

describe("company email gate", () => {
  it("accepts the ChuckTown domain in any case", () => {
    expect(isCompanyEmail("Avery.French@ChuckTownHomes.com")).toBe(true);
    expect(normalizeEmail("  Avery@ChuckTownHomes.com ")).toBe("avery@chucktownhomes.com");
  });

  it("rejects lookalike domains", () => {
    expect(isCompanyEmail("avery@chucktownhomes.com.evil.com")).toBe(false);
    expect(isCompanyEmail("avery@evilchucktownhomes.com")).toBe(false);
    expect(isCompanyEmail("avery@chucktownhomes.co")).toBe(false);
    expect(isCompanyEmail("chucktownhomes.com")).toBe(false);
    expect(isCompanyEmail("avery french@chucktownhomes.com")).toBe(false);
    expect(isCompanyEmail("avery@chucktownhomes.com@other.com")).toBe(false);
  });

  it("requires an active allowlist entry after the domain check", () => {
    expect(canSignIn("avery@chucktownhomes.com", { active: true })).toEqual({ ok: true });
    expect(canSignIn("va@chucktownhomes.com", { active: false }).ok).toBe(false);
    expect(canSignIn("va@chucktownhomes.com", null)).toEqual({ ok: false, reason: "allowlist" });
    expect(canSignIn("avery@gmail.com", { active: true })).toEqual({ ok: false, reason: "domain" });
    expect(canSignIn("former@chucktownhomes.com", { active: false })).toEqual({ ok: false, reason: "inactive" });
  });

  it("keeps the local sign-in switch off in production", () => {
    expect(devLoginEnabled({ NODE_ENV: "production", ENABLE_DEV_LOGIN: "true" })).toBe(false);
    expect(devLoginEnabled({ NODE_ENV: "development", ENABLE_DEV_LOGIN: "true" })).toBe(true);
    expect(devLoginEnabled({ NODE_ENV: "development", ENABLE_DEV_LOGIN: "false" })).toBe(false);
  });
});
