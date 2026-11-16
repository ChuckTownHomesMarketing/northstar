import { addDays, formatMonth, isoToUtcDate, weekRangeLabel } from "@/lib/dates";
import { averageNullable, costPerCents, effectiveCpl, sumNullable } from "@/lib/metrics";
import { prisma } from "@/lib/prisma";
import { buildEmailReport, type MarketWeekSnapshot, type ReportDraft } from "@/lib/report";

function asNumber(value: unknown): number | null {
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function loadReport(weekStart: string): Promise<{
  draft: ReportDraft;
  email: string;
  saved: { wins: string; issues: string; priorities: string; isDemo: boolean } | null;
}> {
  const weekEnd = addDays(weekStart, 6);
  const startDate = isoToUtcDate(weekStart);
  const endDate = isoToUtcDate(weekEnd);
  const year = Number(weekStart.slice(0, 4));
  const month = Number(weekStart.slice(5, 7));
  const [markets, kpis, spend, content, report] = await Promise.all([
    prisma.market.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.marketMonthKpi.findMany({ where: { year, month } }),
    prisma.spendEntry.findMany({ where: { weekStart: startDate } }),
    prisma.contentItem.findMany({
      where: { scheduledFor: { gte: startDate, lte: endDate } },
    }),
    prisma.weeklyReport.findUnique({ where: { weekStart: startDate } }),
  ]);

  const snapshots: MarketWeekSnapshot[] = markets.map((market) => {
    const kpi = kpis.find((row) => row.marketId === market.id);
    const marketSpend = spend.filter((row) => row.marketId === market.id);
    const spendCents = marketSpend.reduce((total, row) => total + row.spendCents, 0);
    const leads = marketSpend.reduce((total, row) => total + row.leads, 0);
    const appointments = marketSpend.reduce((total, row) => total + row.appointments, 0);
    const pieces = content.filter((row) => row.marketId === market.id);
    return {
      marketName: market.name,
      state: market.state,
      monthly: {
        entered: Boolean(kpi),
        leads: kpi?.leads ?? null,
        adSpendCents: kpi?.adSpendCents ?? null,
        cplCents: kpi
          ? effectiveCpl({
              leads: kpi.leads,
              adSpendCents: kpi.adSpendCents,
              costPerLeadCents: kpi.costPerLeadCents,
            })
          : null,
        appointments: kpi?.appointments ?? null,
        closings: kpi?.closings ?? null,
        websiteSessions: kpi?.websiteSessions ?? null,
        socialFollowers: kpi?.socialFollowers ?? null,
        socialEngagement: kpi?.socialEngagement ?? null,
        newGoogleReviews: kpi?.newGoogleReviews ?? null,
        avgRating: kpi ? asNumber(kpi.avgRating) : null,
      },
      weeklySpend: {
        hasEntries: marketSpend.length > 0,
        spendCents,
        leads,
        appointments,
        cplCents: marketSpend.length ? costPerCents(spendCents, leads) : null,
        cpaCents: marketSpend.length ? costPerCents(spendCents, appointments) : null,
      },
      contentScheduled: pieces.filter((piece) => piece.status === "SCHEDULED").length,
      contentPosted: pieces.filter((piece) => piece.status === "POSTED").length,
    };
  });

  const entered = snapshots.filter((row) => row.monthly.entered);
  const spendSum = sumNullable(entered.map((row) => row.monthly.adSpendCents));
  const leadSum = sumNullable(entered.map((row) => row.monthly.leads));
  const draft: ReportDraft = {
    weekLabel: weekRangeLabel(weekStart),
    monthLabel: formatMonth(year, month),
    markets: snapshots,
    totals: {
      leads: leadSum,
      adSpendCents: spendSum,
      cplCents: spendSum != null && leadSum != null ? costPerCents(spendSum, leadSum) : null,
      appointments: sumNullable(entered.map((row) => row.monthly.appointments)),
      closings: sumNullable(entered.map((row) => row.monthly.closings)),
      websiteSessions: sumNullable(entered.map((row) => row.monthly.websiteSessions)),
      newGoogleReviews: sumNullable(entered.map((row) => row.monthly.newGoogleReviews)),
      avgRating: averageNullable(entered.map((row) => row.monthly.avgRating)),
    },
    wins: report?.wins ?? "",
    issues: report?.issues ?? "",
    priorities: report?.priorities ?? "",
    demo:
      Boolean(report?.isDemo) ||
      kpis.some((row) => row.isDemo) ||
      spend.some((row) => row.isDemo) ||
      content.some((row) => row.isDemo),
  };

  return {
    draft,
    email: buildEmailReport(draft),
    saved: report
      ? { wins: report.wins, issues: report.issues, priorities: report.priorities, isDemo: report.isDemo }
      : null,
  };
}
