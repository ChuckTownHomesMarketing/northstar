import { formatCount, formatMoneyFromCents, formatRating } from "./money";

export type MarketWeekSnapshot = {
  marketName: string;
  state: string;
  monthly: {
    leads: number | null;
    cplCents: number | null;
    adSpendCents: number | null;
    appointments: number | null;
    closings: number | null;
    websiteSessions: number | null;
    socialFollowers: number | null;
    socialEngagement: number | null;
    newGoogleReviews: number | null;
    avgRating: number | null;
    entered: boolean;
  };
  weeklySpend: {
    hasEntries: boolean;
    spendCents: number;
    leads: number;
    appointments: number;
    cplCents: number | null;
    cpaCents: number | null;
  };
  contentScheduled: number;
  contentPosted: number;
};

export type ReportDraft = {
  weekLabel: string;
  monthLabel: string;
  markets: MarketWeekSnapshot[];
  totals: {
    leads: number | null;
    cplCents: number | null;
    adSpendCents: number | null;
    appointments: number | null;
    closings: number | null;
    websiteSessions: number | null;
    newGoogleReviews: number | null;
    avgRating: number | null;
  };
  wins: string;
  issues: string;
  priorities: string;
  demo: boolean;
};

function line(label: string, value: string): string {
  return `${label}: ${value}`;
}

function monthlyBlock(market: MarketWeekSnapshot): string[] {
  if (!market.monthly.entered) return ["No monthly KPI row yet."];
  return [
    line("Leads", formatCount(market.monthly.leads)),
    line("Cost per lead", formatMoneyFromCents(market.monthly.cplCents)),
    line("Ad spend", formatMoneyFromCents(market.monthly.adSpendCents)),
    line("Appointments", formatCount(market.monthly.appointments)),
    line("Closings", formatCount(market.monthly.closings)),
    line("Website sessions", formatCount(market.monthly.websiteSessions)),
    line("Social followers", formatCount(market.monthly.socialFollowers)),
    line("Social engagement", formatCount(market.monthly.socialEngagement)),
    line("New Google reviews", formatCount(market.monthly.newGoogleReviews)),
    line("Average rating", formatRating(market.monthly.avgRating)),
  ];
}

export function buildEmailReport(report: ReportDraft): string {
  const lines: string[] = [
    "NORTHSTAR WEEKLY MARKETING REPORT",
    "ChuckTown Homes",
    `Week of ${report.weekLabel}`,
    "",
  ];
  if (report.demo) {
    lines.push(
      "SAMPLE DATA",
      "Figures marked as sample data are for training. They are not ChuckTown performance.",
      "",
    );
  }
  lines.push(
    `ALL MARKETS — ${report.monthLabel} KPIs`,
    "These are month-level numbers, not a one-week slice. Blank metrics stay blank.",
    line("Leads", formatCount(report.totals.leads)),
    line("Blended cost per lead", formatMoneyFromCents(report.totals.cplCents)),
    line("Ad spend", formatMoneyFromCents(report.totals.adSpendCents)),
    line("Appointments", formatCount(report.totals.appointments)),
    line("Closings", formatCount(report.totals.closings)),
    line("Website sessions", formatCount(report.totals.websiteSessions)),
    line("New Google reviews", formatCount(report.totals.newGoogleReviews)),
    line("Average rating (unweighted)", formatRating(report.totals.avgRating)),
    "Social followers are listed by market and are not added together.",
    "",
    `BY MARKET — ${report.monthLabel}`,
  );
  for (const market of report.markets) {
    lines.push("", `${market.marketName}, ${market.state}`, ...monthlyBlock(market));
  }
  lines.push("", "THIS WEEK'S AD SPEND");
  const withSpend = report.markets.filter((market) => market.weeklySpend.hasEntries);
  if (withSpend.length === 0) {
    lines.push("Nothing entered for this week yet.");
  } else {
    for (const market of withSpend) {
      lines.push(
        "",
        `${market.marketName}, ${market.state}`,
        line("Spend", formatMoneyFromCents(market.weeklySpend.spendCents)),
        line("Leads", formatCount(market.weeklySpend.leads)),
        line("Appointments", formatCount(market.weeklySpend.appointments)),
        line("Cost per lead", formatMoneyFromCents(market.weeklySpend.cplCents)),
        line("Cost per appointment", formatMoneyFromCents(market.weeklySpend.cpaCents)),
      );
    }
  }
  lines.push("", "CONTENT THIS WEEK");
  const withContent = report.markets.filter((market) => market.contentScheduled + market.contentPosted > 0);
  if (withContent.length === 0) {
    lines.push("Nothing scheduled or posted this week yet.");
  } else {
    for (const market of withContent) {
      lines.push(`${market.marketName}, ${market.state}: ${market.contentScheduled} scheduled, ${market.contentPosted} posted`);
    }
  }
  lines.push(
    "",
    "WINS",
    report.wins.trim() || "Not written yet.",
    "",
    "ISSUES",
    report.issues.trim() || "Not written yet.",
    "",
    "NEXT WEEK'S PRIORITIES",
    report.priorities.trim() || "Not written yet.",
    "",
  );
  return lines.join("\n");
}
