import { describe, expect, it } from "vitest";
import { mondayOf } from "./dates";
import { parseCsv, parseKpiCsv, parseSpendCsv, toCsv } from "./csv";

const markets = [
  { slug: "charleston", name: "Charleston", state: "SC" },
  { slug: "chattanooga", name: "Chattanooga", state: "TN" },
];

describe("csv import and export", () => {
  it("round-trips quotes and commas", () => {
    const csv = toCsv(["market", "notes"], [["charleston", 'Say "hello", then pause']]);
    expect(parseCsv(csv)).toEqual([
      ["market", "notes"],
      ["charleston", 'Say "hello", then pause'],
    ]);
  });

  it("keeps blank KPI cells empty and rejects a bad market", () => {
    const text = [
      "market,year,month,leads,ad_spend,cost_per_lead,appointments,closings,website_sessions,social_followers,social_engagement,new_google_reviews,avg_rating,notes",
      "Charleston,2026,11,10,1000.00,,4,1,800,5000,120,3,4.8,Launch week",
      "Nowhere,2026,11,1,,,,,,,,,,,,",
      "Chattanooga,2026,11,,,,,,,,,,,,,",
    ].join("\n");
    const parsed = parseKpiCsv(text, markets);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({
      marketSlug: "charleston",
      leads: 10,
      adSpendCents: 100000,
      costPerLeadCents: null,
      avgRating: 4.8,
      notes: "Launch week",
    });
    expect(parsed.rows[1]?.leads).toBeNull();
    expect(parsed.issues).toEqual([{ line: 3, message: 'No market named "Nowhere".' }]);
  });

  it("snaps spend weeks to Monday and requires a detail for Other", () => {
    const text = [
      "market,week_start,source,source_detail,spend,leads,appointments,notes",
      "charleston,2026-11-18,Meta,,250,2,1,",
      "Chattanooga, TN,2026-11-16,Other,,10,1,0,",
      "charleston,2026-11-16,Organic,,0,4,1,Blog",
    ].join("\n");
    const parsed = parseSpendCsv(text, markets, mondayOf);
    expect(parsed.rows[0]).toMatchObject({
      weekStart: "2026-11-16",
      snappedToMonday: true,
      source: "META",
      spendCents: 25000,
      leads: 2,
    });
    expect(parsed.issues.some((issue) => issue.line === 3)).toBe(true);
    expect(parsed.rows[1]).toMatchObject({ source: "ORGANIC", spendCents: 0, leads: 4 });
  });
});
