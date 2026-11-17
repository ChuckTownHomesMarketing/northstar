import { describe, expect, it } from "vitest";
import { leadRates, parseWebhookLead, share, summarizeLeads } from "./leads";

describe("lead reporting math", () => {
  it("calculates CPL, appointment rate, and conversion rate from volume", () => {
    const rates = leadRates({ leads: 10, spendCents: 25000, appointments: 4, conversions: 1 });
    expect(rates.cplCents).toBe(2500);
    expect(rates.appointmentRate).toBe(0.4);
    expect(rates.conversionRate).toBe(0.1);
    expect(rates.costPerAppointmentCents).toBe(6250);
  });

  it("leaves rates blank when there are no leads", () => {
    expect(share(1, 0)).toBeNull();
    expect(leadRates({ leads: 0, spendCents: 100, appointments: 0, conversions: 0 })).toEqual({
      cplCents: null,
      appointmentRate: null,
      conversionRate: null,
      costPerAppointmentCents: null,
    });
  });

  it("rolls rows up by source", () => {
    const groups = summarizeLeads([
      { key: "meta", leads: 4, spendCents: 800, appointments: 1, conversions: 0 },
      { key: "meta", leads: 6, spendCents: 1200, appointments: 2, conversions: 1 },
      { key: "ai-leads", leads: 2, spendCents: 0, appointments: 1, conversions: 1 },
    ]);
    const meta = groups.find((group) => group.key === "meta");
    expect(meta).toMatchObject({ leads: 10, spendCents: 2000, appointments: 3, conversions: 1, cplCents: 200 });
    expect(groups.find((group) => group.key === "ai-leads")?.cplCents).toBe(0);
  });

  it("accepts a webhook lead and rejects a missing source", () => {
    const parsed = parseWebhookLead({
      source: "google-ppc",
      market: "charleston",
      occurredOn: "2026-11-16",
      leads: 2,
      spend: "25.00",
      appointments: 1,
      externalId: "zap-1",
    });
    expect(parsed.ok && parsed.lead).toMatchObject({
      sourceSlug: "google-ppc",
      marketSlug: "charleston",
      spendCents: 2500,
      origin: "WEBHOOK",
      externalId: "zap-1",
    });
    expect(parseWebhookLead({ occurredOn: "2026-11-16" }).ok).toBe(false);
    expect(parseWebhookLead({ source: "meta", occurredOn: "November 16" }).ok).toBe(false);
  });
});
