import { kpiCsvTemplate, toCsv } from "@/lib/csv";
import { centsToDollarInput } from "@/lib/money";
import { monthInputValue, parseMonthKey } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/server/session";

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return new Response("Sign in required.", { status: 401 });
  const url = new URL(request.url);
  if (url.searchParams.get("template") === "1") {
    return csvResponse(kpiCsvTemplate(), "northstar-kpi-template.csv");
  }
  const { year, month } = parseMonthKey(url.searchParams.get("month") ?? undefined);
  const rows = await prisma.marketMonthKpi.findMany({
    where: { year, month },
    include: { market: true },
    orderBy: { market: { sortOrder: "asc" } },
  });
  const body = toCsv(
    [
      "market",
      "year",
      "month",
      "leads",
      "ad_spend",
      "cost_per_lead",
      "appointments",
      "closings",
      "website_sessions",
      "social_followers",
      "social_engagement",
      "new_google_reviews",
      "avg_rating",
      "notes",
    ],
    rows.map((row) => [
      row.market.slug,
      String(row.year),
      String(row.month),
      row.leads?.toString() ?? "",
      centsToDollarInput(row.adSpendCents),
      centsToDollarInput(row.costPerLeadCents),
      row.appointments?.toString() ?? "",
      row.closings?.toString() ?? "",
      row.websiteSessions?.toString() ?? "",
      row.socialFollowers?.toString() ?? "",
      row.socialEngagement?.toString() ?? "",
      row.newGoogleReviews?.toString() ?? "",
      row.avgRating?.toString() ?? "",
      row.notes ?? "",
    ]),
  );
  return csvResponse(body, `northstar-kpis-${monthInputValue(year, month)}.csv`);
}

function csvResponse(body: string, filename: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
