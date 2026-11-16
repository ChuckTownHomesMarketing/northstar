import { describe, expect, it } from "vitest";
import { auditAppliesTo, canSeeApp, canSeeOwned, canUseModule, filterOwned } from "./permissions";

const va = { id: "va-1", role: "VA" as const };
const other = { id: "va-2", role: "VA" as const };
const admin = { id: "admin-1", role: "ADMIN" as const };

describe("personal data permissions", () => {
  it("lets a VA see only their own rows", () => {
    const rows = [
      { id: "a", ownerId: "va-1" },
      { id: "b", ownerId: "va-2" },
      { id: "c", ownerId: null },
    ];
    expect(filterOwned(va, rows).map((row) => row.id)).toEqual(["a"]);
    expect(filterOwned(admin, rows)).toHaveLength(3);
    expect(canSeeOwned(va, "va-2")).toBe(false);
    expect(canSeeOwned(va, null)).toBe(false);
    expect(canSeeOwned(other, "va-2")).toBe(true);
  });

  it("hides a module that is off, and hides it from a VA without a grant", () => {
    expect(canUseModule(admin, { enabled: true }, false)).toBe(true);
    expect(canUseModule(admin, { enabled: false }, true)).toBe(false);
    expect(canUseModule(va, { enabled: true }, false)).toBe(false);
    expect(canUseModule(va, { enabled: true }, true)).toBe(true);
    expect(canUseModule(va, null, true)).toBe(false);
  });

  it("shows an app by role or by a direct grant", () => {
    const app = { active: true, visibleToAdmins: true, visibleToVas: false };
    expect(canSeeApp(va, app, false)).toBe(false);
    expect(canSeeApp(va, app, true)).toBe(true);
    expect(canSeeApp(admin, app, false)).toBe(true);
    expect(canSeeApp(va, { ...app, active: false }, true)).toBe(false);
  });

  it("assigns an audit by role or by a named person", () => {
    const template = { active: true, assignRole: "VA" as const, assigneeIds: [] as string[] };
    expect(auditAppliesTo(template, va)).toBe(true);
    expect(auditAppliesTo(template, admin)).toBe(false);
    expect(auditAppliesTo({ ...template, assignRole: null, assigneeIds: ["admin-1"] }, admin)).toBe(true);
    expect(auditAppliesTo({ ...template, active: false }, va)).toBe(false);
  });
});
