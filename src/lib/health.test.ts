import { describe, expect, it } from "vitest";
import { HEALTH_DEFAULTS, overallHealth, scoreAgainstTarget, scoreHealth, scaledTarget } from "./health";

const facts = {
  marketCount: 1,
  leads: 40,
  cplDollars: 150,
  contentPieces: 8,
  taskCompletion: 0.8,
  auditCompletion: 0.8,
  avgRating: 4.5,
  newReviews: 4,
  fulfillment: 0.8,
};

describe("marketing health scores", () => {
  it("scores a higher-is-better metric up to 10 and caps anything past the target", () => {
    expect(scoreAgainstTarget(40, 40, "higher")).toBe(10);
    expect(scoreAgainstTarget(20, 40, "higher")).toBe(5);
    expect(scoreAgainstTarget(80, 40, "higher")).toBe(10);
  });

  it("treats a lower cost per lead as a better score", () => {
    expect(scoreAgainstTarget(150, 150, "lower")).toBe(10);
    expect(scoreAgainstTarget(300, 150, "lower")).toBe(5);
    expect(scoreAgainstTarget(75, 150, "lower")).toBe(10);
    expect(scoreAgainstTarget(0, 150, "lower")).toBe(10);
  });

  it("gives a full score when every dimension meets its default target", () => {
    const dimensions = scoreHealth(facts, HEALTH_DEFAULTS);
    expect(dimensions.every((dimension) => dimension.status === "scored" && dimension.score === 10)).toBe(true);
    expect(overallHealth(dimensions)).toBe(10);
  });

  it("leaves a dimension as no data instead of inventing a zero", () => {
    const dimensions = scoreHealth(
      { ...facts, leads: null, cplDollars: null, avgRating: null, newReviews: null, fulfillment: null, taskCompletion: null, auditCompletion: null },
      HEALTH_DEFAULTS,
    );
    expect(dimensions.find((dimension) => dimension.key === "leadVolume")?.status).toBe("no-data");
    expect(dimensions.find((dimension) => dimension.key === "costEfficiency")?.score).toBeNull();
    expect(dimensions.find((dimension) => dimension.key === "reviews")?.actualLabel).toBe("No data");
    expect(dimensions.find((dimension) => dimension.key === "ordering")?.status).toBe("no-data");
    expect(dimensions.find((dimension) => dimension.key === "taskAudit")?.status).toBe("no-data");
    const scored = dimensions.filter((dimension) => dimension.status === "scored");
    expect(scored.map((dimension) => dimension.key)).toEqual(["contentOutput"]);
    expect(overallHealth(dimensions.filter((dimension) => dimension.key !== "contentOutput"))).toBeNull();
  });

  it("scales count targets by the number of markets and keeps rates as rates", () => {
    expect(scaledTarget(40, "leads", 8)).toBe(320);
    expect(scaledTarget(150, "dollars", 8)).toBe(150);
    const dimensions = scoreHealth({ ...facts, marketCount: 2, leads: 40 }, HEALTH_DEFAULTS);
    expect(dimensions.find((dimension) => dimension.key === "leadVolume")?.score).toBe(5);
  });

  it("averages task and audit completion and ignores a missing half", () => {
    const both = scoreHealth({ ...facts, taskCompletion: 1, auditCompletion: 0.6 }, HEALTH_DEFAULTS);
    expect(both.find((dimension) => dimension.key === "taskAudit")?.score).toBe(10);
    const tasksOnly = scoreHealth({ ...facts, taskCompletion: 0.4, auditCompletion: null }, HEALTH_DEFAULTS);
    expect(tasksOnly.find((dimension) => dimension.key === "taskAudit")?.score).toBe(5);
  });
});
