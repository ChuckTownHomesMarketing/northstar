import { describe, expect, it } from "vitest";
import { dollarsToCents } from "./money";
import {
  averageNullable,
  blendedFromSpend,
  costPerCents,
  effectiveCpl,
  monthOverMonth,
  momTone,
  sumNullable,
  summarizeSpend,
} from "./metrics";

describe("cost and month-over-month math", () => {
  it("calculates cost per lead and cost per appointment without dividing by zero", () => {
    expect(costPerCents(10000, 4)).toBe(2500);
    expect(costPerCents(0, 5)).toBe(0);
    expect(costPerCents(10000, 0)).toBeNull();
    expect(costPerCents(-1, 4)).toBeNull();
  });

  it("prefers spend divided by leads, then a manually entered cost per lead", () => {
    expect(effectiveCpl({ leads: 4, adSpendCents: 10000, costPerLeadCents: 999 })).toBe(2500);
    expect(effectiveCpl({ leads: 0, adSpendCents: 10000, costPerLeadCents: 1800 })).toBe(1800);
    expect(effectiveCpl({ leads: null, adSpendCents: null, costPerLeadCents: 1800 })).toBe(1800);
    expect(effectiveCpl({ leads: null, adSpendCents: null, costPerLeadCents: null })).toBeNull();
  });

  it("does not treat a missing month as zero", () => {
    expect(monthOverMonth(110, 100)).toEqual({ absolute: 10, percent: 10 });
    expect(monthOverMonth(0, 0)).toEqual({ absolute: 0, percent: null });
    expect(monthOverMonth(null, 10)).toEqual({ absolute: null, percent: null });
    expect(monthOverMonth(10, 0)).toEqual({ absolute: 10, percent: null });
    expect(momTone(10, "up-good")).toBe("good");
    expect(momTone(10, "down-good")).toBe("bad");
    expect(momTone(-5, "down-good")).toBe("good");
    expect(momTone(null, "up-good")).toBe("neutral");
  });

  it("sums only markets that have a number and averages ratings without inventing blanks", () => {
    expect(sumNullable([10, null, 5])).toBe(15);
    expect(sumNullable([null, null])).toBeNull();
    expect(averageNullable([4, 5, null])).toBe(4.5);
    expect(averageNullable([null])).toBeNull();
  });

  it("rolls spend up by source with cost per lead and cost per appointment", () => {
    const groups = summarizeSpend([
      { key: "META", spendCents: 5000, leads: 2, appointments: 1 },
      { key: "META", spendCents: 5000, leads: 2, appointments: 0 },
      { key: "ORGANIC", spendCents: 0, leads: 3, appointments: 1 },
    ]);
    const meta = groups.find((group) => group.key === "META");
    const organic = groups.find((group) => group.key === "ORGANIC");
    expect(meta).toMatchObject({ spendCents: 10000, leads: 4, appointments: 1, cplCents: 2500, cpaCents: 10000 });
    expect(organic).toMatchObject({ spendCents: 0, leads: 3, cplCents: 0, cpaCents: 0 });
    expect(blendedFromSpend([])).toBeNull();
    expect(blendedFromSpend([{ spendCents: 3000, leads: 0, appointments: 2 }])).toMatchObject({
      cplCents: null,
      cpaCents: 1500,
    });
  });

  it("parses dollar amounts the way a VA would type them", () => {
    expect(dollarsToCents("1250.50")).toBe(125050);
    expect(dollarsToCents("$1,250.5")).toBe(125050);
    expect(dollarsToCents("")).toBeNull();
    expect(dollarsToCents("10")).toBe(1000);
    expect(() => dollarsToCents("12.345")).toThrow();
    expect(() => dollarsToCents("-5")).toThrow();
  });
});
