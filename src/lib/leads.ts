import { costPerCents } from "./metrics";

export type LeadBucket = {
  leads: number;
  spendCents: number;
  appointments: number;
  conversions: number;
};

export type LeadRates = {
  cplCents: number | null;
  appointmentRate: number | null;
  conversionRate: number | null;
  costPerAppointmentCents: number | null;
};

export function emptyBucket(): LeadBucket {
  return { leads: 0, spendCents: 0, appointments: 0, conversions: 0 };
}

export function addLeadBucket(left: LeadBucket, right: LeadBucket): LeadBucket {
  return {
    leads: left.leads + right.leads,
    spendCents: left.spendCents + right.spendCents,
    appointments: left.appointments + right.appointments,
    conversions: left.conversions + right.conversions,
  };
}

/** Appointment rate and conversion rate are shares of lead volume. Missing volume stays blank. */
export function leadRates(bucket: LeadBucket): LeadRates {
  return {
    cplCents: costPerCents(bucket.spendCents, bucket.leads),
    appointmentRate: share(bucket.appointments, bucket.leads),
    conversionRate: share(bucket.conversions, bucket.leads),
    costPerAppointmentCents: costPerCents(bucket.spendCents, bucket.appointments),
  };
}

export function share(part: number, whole: number): number | null {
  if (!Number.isFinite(part) || !Number.isFinite(whole)) return null;
  if (part < 0 || whole <= 0) return null;
  return part / whole;
}

export function summarizeLeads<K>(rows: Array<LeadBucket & { key: K }>): Array<LeadBucket & { key: K } & LeadRates> {
  const map = new Map<K, LeadBucket>();
  for (const row of rows) {
    const current = map.get(row.key) ?? emptyBucket();
    map.set(row.key, addLeadBucket(current, row));
  }
  return [...map.entries()].map(([key, bucket]) => ({ key, ...bucket, ...leadRates(bucket) }));
}

export type NormalizedLead = {
  sourceSlug: string;
  marketSlug: string | null;
  occurredOn: string;
  leads: number;
  spendCents: number;
  appointments: number;
  conversions: number;
  externalId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  notes: string | null;
  origin: "MANUAL" | "CSV" | "WEBHOOK" | "INTEGRATION" | "DEMO";
};

export class LeadAdapterNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`${provider} is not connected. Lead reporting still accepts manual entry, CSV, and the webhook.`);
    this.name = "LeadAdapterNotConfiguredError";
  }
}

export interface LeadIngestAdapter {
  id: "manual" | "csv" | "webhook" | "google_ads" | "meta_lead_ads";
  pull(): Promise<NormalizedLead[]>;
}

export const futureLeadAdapters: LeadIngestAdapter[] = [
  {
    id: "google_ads",
    pull() {
      return Promise.reject(new LeadAdapterNotConfiguredError("Google Ads"));
    },
  },
  {
    id: "meta_lead_ads",
    pull() {
      return Promise.reject(new LeadAdapterNotConfiguredError("Meta Lead Ads"));
    },
  },
];

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseWebhookLead(body: unknown): { ok: true; lead: NormalizedLead } | { ok: false; message: string } {
  if (!body || typeof body !== "object") return { ok: false, message: "Send a JSON object." };
  const record = body as Record<string, unknown>;
  const sourceSlug = stringField(record.source ?? record.sourceSlug);
  if (!sourceSlug) return { ok: false, message: "source is required." };
  const occurredOn = stringField(record.occurredOn ?? record.date);
  if (!occurredOn || !DATE.test(occurredOn)) return { ok: false, message: "occurredOn must be YYYY-MM-DD." };
  const leads = countField(record.leads ?? record.count ?? 1, "leads");
  if (!leads.ok) return leads;
  const spend = moneyField(record.spendCents ?? record.spend ?? 0);
  if (!spend.ok) return spend;
  const appointments = countField(record.appointments ?? 0, "appointments");
  if (!appointments.ok) return appointments;
  const conversions = countField(record.conversions ?? 0, "conversions");
  if (!conversions.ok) return conversions;
  return {
    ok: true,
    lead: {
      sourceSlug,
      marketSlug: stringField(record.market ?? record.marketSlug),
      occurredOn,
      leads: leads.value,
      spendCents: spend.value,
      appointments: appointments.value,
      conversions: conversions.value,
      externalId: stringField(record.externalId),
      contactName: stringField(record.contactName),
      contactEmail: stringField(record.contactEmail),
      notes: stringField(record.notes),
      origin: "WEBHOOK",
    },
  };
}

function stringField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function countField(value: unknown, label: string): { ok: true; value: number } | { ok: false; message: string } {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < 0) return { ok: false, message: `${label} needs a whole number.` };
  return { ok: true, value: number };
}

function moneyField(value: unknown): { ok: true; value: number } | { ok: false; message: string } {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return { ok: true, value };
  if (typeof value === "string" && /^\d+(\.\d{1,2})?$/.test(value.trim())) {
    const [dollars, cents = ""] = value.trim().split(".");
    return { ok: true, value: Number(dollars) * 100 + Number(cents.padEnd(2, "0").slice(0, 2)) };
  }
  return { ok: false, message: "spend needs cents as a whole number, or dollars like 12.50." };
}
