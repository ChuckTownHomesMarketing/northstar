import { describe, expect, it } from "vitest";
import { buildEmailReport, type MarketWeekSnapshot } from "./report";

function market(overrides: Partial<MarketWeekSnapshot> = {}): MarketWeekSnapshot {
  return {
    marketName: "Charleston",
    state: "SC",
    monthly: {
      leads: null,
      cplCents: null,
      adSpendCents: null,
      appointments: null,
      closings: null,
      websiteSessions: null,
      socialFollowers: null,
      socialEngagement: null,
      newGoogleReviews: null,
      avgRating: null,
      entered: false,
    },
    weeklySpend: {
      hasEntries: false,
      spendCents: 0,
      leads: 0,
      appointments: 0,
      cplCents: null,
      cpaCents: null,
    },
    contentScheduled: 0,
    contentPosted: 0,
    ...overrides,
  };
}

describe("weekly email report", () => {
  it("prints calculated costs and leaves missing metrics blank", () => {
    const text = buildEmailReport({
      weekLabel: "November 16, 2026 – November 22, 2026",
      monthLabel: "November 2026",
      markets: [
        market({
          monthly: {
            leads: 4,
            cplCents: 2500,
            adSpendCents: 10000,
            appointments: 1,
            closings: null,
            websiteSessions: null,
            socialFollowers: 500,
            socialEngagement: null,
            newGoogleReviews: null,
            avgRating: 4.8,
            entered: true,
          },
          weeklySpend: {
            hasEntries: true,
            spendCents: 10000,
            leads: 4,
            appointments: 1,
            cplCents: 2500,
            cpaCents: 10000,
          },
          contentScheduled: 2,
          contentPosted: 1,
        }),
      ],
      totals: {
        leads: 4,
        cplCents: 2500,
        adSpendCents: 10000,
        appointments: 1,
        closings: null,
        websiteSessions: null,
        newGoogleReviews: null,
        avgRating: 4.8,
      },
      wins: "Listing reel shipped.",
      issues: "",
      priorities: "Finish the Chattanooga intro.",
      demo: false,
    });

    expect(text).toContain("Charleston, SC");
    expect(text).toContain("Cost per lead: $25.00");
    expect(text).toContain("Cost per appointment: $100.00");
    expect(text).toContain("Closings: —");
    expect(text).not.toContain("SAMPLE DATA");
    expect(text).toContain("Not written yet.");
    expect(text).toContain("2 scheduled, 1 posted");
    expect(text).not.toContain("0 leads");
  });

  it("labels sample figures and does not invent a spend section", () => {
    const text = buildEmailReport({
      weekLabel: "November 16, 2026 – November 22, 2026",
      monthLabel: "November 2026",
      markets: [market()],
      totals: {
        leads: null,
        cplCents: null,
        adSpendCents: null,
        appointments: null,
        closings: null,
        websiteSessions: null,
        newGoogleReviews: null,
        avgRating: null,
      },
      wins: "",
      issues: "",
      priorities: "",
      demo: true,
    });
    expect(text).toContain("SAMPLE DATA");
    expect(text).toContain("No monthly KPI row yet.");
    expect(text).toContain("Nothing entered for this week yet.");
    expect(text).toContain("Leads: —");
  });
});
