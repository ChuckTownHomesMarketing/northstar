import { describe, expect, it } from "vitest";
import { addDays, dueOnForTemplate, mondayOf, monthGrid, periodKeyFor, todayIso } from "./dates";

describe("marketing weeks", () => {
  it("treats Monday November 16, 2026 as the start of that week", () => {
    expect(mondayOf("2026-11-16")).toBe("2026-11-16");
    expect(mondayOf("2026-11-22")).toBe("2026-11-16");
    expect(mondayOf("2026-11-15")).toBe("2026-11-09");
    expect(addDays("2026-11-16", 6)).toBe("2026-11-22");
  });

  it("uses Eastern Time, including the November daylight-saving change", () => {
    expect(todayIso(new Date("2026-11-16T15:00:00.000Z"))).toBe("2026-11-16");
    expect(todayIso(new Date("2026-11-16T04:00:00.000Z"))).toBe("2026-11-15");
    expect(todayIso(new Date("2026-11-01T05:30:00.000Z"))).toBe("2026-11-01");
    expect(todayIso(new Date("2026-11-01T06:30:00.000Z"))).toBe("2026-11-01");
    expect(todayIso(new Date("2026-03-08T06:30:00.000Z"))).toBe("2026-03-08");
    expect(todayIso(new Date("2026-03-08T07:30:00.000Z"))).toBe("2026-03-08");
  });

  it("builds a Monday-first month that covers November 2026", () => {
    const cells = monthGrid(2026, 11);
    expect(cells[0]?.iso).toBe("2026-10-26");
    expect(cells.at(-1)?.iso).toBe("2026-12-06");
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(30);
    expect(cells.length % 7).toBe(0);
  });

  it("names recurring periods and their due dates", () => {
    expect(periodKeyFor("DAILY", "2026-11-16")).toBe("day:2026-11-16");
    expect(periodKeyFor("WEEKLY", "2026-11-19")).toBe("week:2026-11-16");
    expect(periodKeyFor("MONTHLY", "2026-11-02")).toBe("month:2026-11");
    expect(
      dueOnForTemplate({ recurrence: "WEEKLY", weekday: 3, dayOfMonth: null, today: "2026-11-19" }),
    ).toBe("2026-11-18");
    expect(
      dueOnForTemplate({ recurrence: "MONTHLY", weekday: null, dayOfMonth: 31, today: "2026-11-02" }),
    ).toBe("2026-11-28");
  });
});
