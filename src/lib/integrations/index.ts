/**
 * Extension point for later data feeds.
 * v1 keeps the shapes and a not-connected catalog. Nothing here returns numbers.
 */

export type IntegrationProviderId = "meta_ads" | "google_ads" | "ga4" | "crm";

export type DateRange = { start: string; end: string };

export type NormalizedSpend = {
  marketSlug: string;
  source: "META" | "GOOGLE_ADS" | "ZILLOW" | "REALTOR" | "REFERRAL" | "ORGANIC" | "OTHER";
  sourceDetail: string;
  weekStart: string;
  spendCents: number;
  leads: number;
  appointments: number;
};

export interface SpendIntegration {
  id: "meta_ads" | "google_ads";
  pullWeeklySpend(range: DateRange): Promise<NormalizedSpend[]>;
}

export interface AnalyticsIntegration {
  id: "ga4";
  pullMonthlySessions(year: number, month: number): Promise<{ marketSlug: string; sessions: number }[]>;
}

export interface CrmIntegration {
  id: "crm";
  pullMonthlyOutcomes(
    year: number,
    month: number,
  ): Promise<{ marketSlug: string; leads: number; appointments: number; closings: number }[]>;
}

export class IntegrationNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`${provider} is not connected. Northstar v1 only reserves the slot.`);
    this.name = "IntegrationNotConfiguredError";
  }
}

export const INTEGRATION_CATALOG: {
  id: IntegrationProviderId;
  name: string;
  feeds: string;
  landsIn: string;
}[] = [
  {
    id: "meta_ads",
    name: "Meta Ads",
    feeds: "Weekly spend, leads, and appointments by market.",
    landsIn: "Lead source and ad spend tracker, origin set to integration.",
  },
  {
    id: "google_ads",
    name: "Google Ads",
    feeds: "Weekly spend, leads, and appointments by market.",
    landsIn: "Lead source and ad spend tracker, origin set to integration.",
  },
  {
    id: "ga4",
    name: "GA4",
    feeds: "Website sessions by market and month.",
    landsIn: "KPI dashboard, website sessions column.",
  },
  {
    id: "crm",
    name: "CRM",
    feeds: "Leads, appointments, and closings by market and month.",
    landsIn: "KPI dashboard.",
  },
];
