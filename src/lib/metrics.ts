export type MomChange = {
  absolute: number | null;
  percent: number | null;
};

export type Polarity = "up-good" | "down-good" | "neutral";

export function costPerCents(spendCents: number, outcomes: number): number | null {
  if (!Number.isFinite(spendCents) || !Number.isFinite(outcomes)) return null;
  if (spendCents < 0 || outcomes < 0) return null;
  if (outcomes === 0) return null;
  return spendCents / outcomes;
}

export function monthOverMonth(
  current: number | null | undefined,
  previous: number | null | undefined,
): MomChange {
  if (current == null || previous == null) return { absolute: null, percent: null };
  const absolute = current - previous;
  if (previous === 0) return { absolute, percent: null };
  return { absolute, percent: (absolute / previous) * 100 };
}

export function momTone(percent: number | null, polarity: Polarity): "good" | "bad" | "neutral" {
  if (percent == null || percent === 0 || polarity === "neutral") return "neutral";
  const up = percent > 0;
  if (polarity === "up-good") return up ? "good" : "bad";
  return up ? "bad" : "good";
}

export type KpiNumbers = {
  leads: number | null;
  adSpendCents: number | null;
  costPerLeadCents: number | null;
  appointments: number | null;
  closings: number | null;
  websiteSessions: number | null;
  socialFollowers: number | null;
  socialEngagement: number | null;
  newGoogleReviews: number | null;
  avgRating: number | null;
};

export function effectiveCpl(
  row: Pick<KpiNumbers, "leads" | "adSpendCents" | "costPerLeadCents">,
): number | null {
  if (row.adSpendCents != null && row.leads != null) {
    const derived = costPerCents(row.adSpendCents, row.leads);
    if (derived != null) return derived;
  }
  return row.costPerLeadCents;
}

export function sumNullable(values: Array<number | null | undefined>): number | null {
  const present = values.filter((value): value is number => value != null);
  if (present.length === 0) return null;
  return present.reduce((total, value) => total + value, 0);
}

export function averageNullable(values: Array<number | null | undefined>): number | null {
  const present = values.filter((value): value is number => value != null);
  if (present.length === 0) return null;
  return present.reduce((total, value) => total + value, 0) / present.length;
}

export type SpendNumbers = {
  spendCents: number;
  leads: number;
  appointments: number;
};

export type SpendGroup<K> = SpendNumbers & {
  key: K;
  cplCents: number | null;
  cpaCents: number | null;
};

export function summarizeSpend<K>(rows: Array<SpendNumbers & { key: K }>): SpendGroup<K>[] {
  const map = new Map<K, SpendNumbers>();
  for (const row of rows) {
    const current = map.get(row.key) ?? { spendCents: 0, leads: 0, appointments: 0 };
    current.spendCents += row.spendCents;
    current.leads += row.leads;
    current.appointments += row.appointments;
    map.set(row.key, current);
  }
  return [...map.entries()].map(([key, totals]) => ({
    key,
    ...totals,
    cplCents: costPerCents(totals.spendCents, totals.leads),
    cpaCents: costPerCents(totals.spendCents, totals.appointments),
  }));
}

export function blendedFromSpend(rows: SpendNumbers[]): SpendGroup<string> | null {
  if (rows.length === 0) return null;
  const [group] = summarizeSpend(rows.map((row) => ({ ...row, key: "all" })));
  return group ?? null;
}
