export type HealthDirection = "higher" | "lower";

export type HealthTargetConfig = {
  key: string;
  label: string;
  target: number;
  secondaryTarget?: number | null;
  direction: HealthDirection;
  unit: string;
};

export type HealthFacts = {
  marketCount: number;
  leads: number | null;
  cplDollars: number | null;
  contentPieces: number;
  taskCompletion: number | null;
  auditCompletion: number | null;
  avgRating: number | null;
  newReviews: number | null;
  fulfillment: number | null;
};

export type DimensionScore = {
  key: string;
  label: string;
  score: number | null;
  actualLabel: string;
  targetLabel: string;
  status: "scored" | "no-data";
};

export const HEALTH_DEFAULTS: HealthTargetConfig[] = [
  { key: "leadVolume", label: "Lead volume", target: 40, direction: "higher", unit: "leads" },
  { key: "costEfficiency", label: "Cost efficiency", target: 150, direction: "lower", unit: "dollars" },
  { key: "contentOutput", label: "Content output", target: 8, direction: "higher", unit: "pieces" },
  { key: "taskAudit", label: "Task and audit completion", target: 80, direction: "higher", unit: "percent" },
  { key: "reviews", label: "Reviews and reputation", target: 4.5, secondaryTarget: 4, direction: "higher", unit: "rating" },
  { key: "ordering", label: "Ordering fulfillment", target: 80, direction: "higher", unit: "percent" },
];

const SCALE = 10;

export function scoreAgainstTarget(actual: number, target: number, direction: HealthDirection): number | null {
  if (!Number.isFinite(actual) || !Number.isFinite(target) || target <= 0) return null;
  if (actual < 0) return null;
  const ratio = direction === "lower" ? (actual === 0 ? SCALE : (target / actual) * SCALE) : (actual / target) * SCALE;
  return roundScore(Math.min(SCALE, Math.max(0, ratio)));
}

export function overallHealth(dimensions: DimensionScore[]): number | null {
  const scored = dimensions.filter((dimension) => dimension.status === "scored" && dimension.score != null);
  if (scored.length === 0) return null;
  const total = scored.reduce((sum, dimension) => sum + (dimension.score ?? 0), 0);
  return roundScore(total / scored.length);
}

export function scaledTarget(target: number, unit: string, marketCount: number): number {
  if (unit === "leads" || unit === "pieces" || unit === "reviews") {
    return target * Math.max(marketCount, 1);
  }
  return target;
}

export function scoreHealth(facts: HealthFacts, targets: HealthTargetConfig[]): DimensionScore[] {
  const byKey = new Map(targets.map((target) => [target.key, target]));
  return [
    scoreCount("leadVolume", "Lead volume", facts.leads, byKey, facts.marketCount, "leads"),
    scoreMoney("costEfficiency", "Cost efficiency", facts.cplDollars, byKey),
    scoreCount("contentOutput", "Content output", facts.contentPieces, byKey, facts.marketCount, "pieces"),
    scoreRate("taskAudit", "Task and audit completion", combineRates(facts.taskCompletion, facts.auditCompletion), byKey),
    scoreReviews(facts, byKey),
    scoreRate("ordering", "Ordering fulfillment", facts.fulfillment, byKey),
  ];
}

function scoreCount(
  key: string,
  fallbackLabel: string,
  actual: number | null,
  targets: Map<string, HealthTargetConfig>,
  marketCount: number,
  unit: string,
): DimensionScore {
  const config = targets.get(key);
  const label = config?.label ?? fallbackLabel;
  const perMarket = config?.target ?? HEALTH_DEFAULTS.find((item) => item.key === key)?.target ?? 1;
  const target = scaledTarget(perMarket, unit, marketCount);
  if (actual == null) return blank(key, label, target, unit);
  const score = scoreAgainstTarget(actual, target, "higher");
  return {
    key,
    label,
    score,
    status: score == null ? "no-data" : "scored",
    actualLabel: `${formatActual(actual, unit)} across ${marketCount} market${marketCount === 1 ? "" : "s"}`,
    targetLabel: `Target ${formatActual(target, unit)}`,
  };
}

function scoreMoney(key: string, fallbackLabel: string, actual: number | null, targets: Map<string, HealthTargetConfig>): DimensionScore {
  const config = targets.get(key);
  const label = config?.label ?? fallbackLabel;
  const target = config?.target ?? 150;
  if (actual == null) return blank(key, label, target, "dollars");
  const score = scoreAgainstTarget(actual, target, "lower");
  return {
    key,
    label,
    score,
    status: score == null ? "no-data" : "scored",
    actualLabel: `$${actual.toFixed(2)} cost per lead`,
    targetLabel: `Target $${target.toFixed(2)} or lower`,
  };
}

function scoreRate(key: string, fallbackLabel: string, rate: number | null, targets: Map<string, HealthTargetConfig>): DimensionScore {
  const config = targets.get(key);
  const label = config?.label ?? fallbackLabel;
  const targetPercent = config?.target ?? 80;
  if (rate == null) return blank(key, label, targetPercent, "percent");
  const score = scoreAgainstTarget(rate * 100, targetPercent, "higher");
  return {
    key,
    label,
    score,
    status: score == null ? "no-data" : "scored",
    actualLabel: `${Math.round(rate * 100)}% complete`,
    targetLabel: `Target ${targetPercent}%`,
  };
}

function scoreReviews(facts: HealthFacts, targets: Map<string, HealthTargetConfig>): DimensionScore {
  const config = targets.get("reviews");
  const label = config?.label ?? "Reviews and reputation";
  const ratingTarget = config?.target ?? 4.5;
  const reviewTarget = scaledTarget(config?.secondaryTarget ?? 4, "reviews", facts.marketCount);
  const parts: number[] = [];
  const details: string[] = [];
  if (facts.avgRating != null) {
    const ratingScore = scoreAgainstTarget(facts.avgRating, ratingTarget, "higher");
    if (ratingScore != null) parts.push(ratingScore);
    details.push(`${facts.avgRating.toFixed(2)} average rating`);
  }
  if (facts.newReviews != null) {
    const reviewScore = scoreAgainstTarget(facts.newReviews, reviewTarget, "higher");
    if (reviewScore != null) parts.push(reviewScore);
    details.push(`${facts.newReviews} new reviews`);
  }
  if (parts.length === 0) {
    return {
      key: "reviews",
      label,
      score: null,
      status: "no-data",
      actualLabel: "No data",
      targetLabel: `Target ${ratingTarget.toFixed(1)} rating`,
    };
  }
  return {
    key: "reviews",
    label,
    score: roundScore(parts.reduce((sum, part) => sum + part, 0) / parts.length),
    status: "scored",
    actualLabel: details.join(" · "),
    targetLabel: `Target ${ratingTarget.toFixed(1)} rating and ${reviewTarget} reviews`,
  };
}

function combineRates(task: number | null, audit: number | null): number | null {
  const present = [task, audit].filter((value): value is number => value != null);
  if (present.length === 0) return null;
  return present.reduce((sum, value) => sum + value, 0) / present.length;
}

function blank(key: string, label: string, target: number, unit: string): DimensionScore {
  return {
    key,
    label,
    score: null,
    status: "no-data",
    actualLabel: "No data",
    targetLabel: `Target ${formatActual(target, unit)}`,
  };
}

function formatActual(value: number, unit: string): string {
  if (unit === "dollars") return `$${value.toFixed(2)}`;
  if (unit === "percent") return `${value}%`;
  if (unit === "rating") return value.toFixed(1);
  return `${Math.round(value)}`;
}

function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}
