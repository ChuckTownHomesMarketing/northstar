import { spendCsvTemplate, toCsv } from "@/lib/csv";
import { currentWeekStart, dateToIso, isoToUtcDate, mondayOf, parseIsoDate } from "@/lib/dates";
import { centsToDollarInput } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/server/session";

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return new Response("Sign in required.", { status: 401 });
  const url = new URL(request.url);
  if (url.searchParams.get("template") === "1") {
    return csvResponse(spendCsvTemplate(), "northstar-spend-template.csv");
  }
  const requested = url.searchParams.get("week");
  const week = requested && parseIsoDate(requested) ? mondayOf(requested) : currentWeekStart();
  const range = url.searchParams.get("range") === "month" ? "month" : "week";
  const year = Number(week.slice(0, 4));
  const month = Number(week.slice(5, 7));
  const monthStart = isoToUtcDate(`${year}-${String(month).padStart(2, "0")}-01`);
  const monthEnd = new Date(Date.UTC(year, month, 0));
  const marketSlug = url.searchParams.get("market");
  const rows = await prisma.spendEntry.findMany({
    where: {
      ...(marketSlug ? { market: { slug: marketSlug } } : {}),
      weekStart: range === "week" ? isoToUtcDate(week) : { gte: monthStart, lte: monthEnd },
    },
    include: { market: true },
    orderBy: [{ weekStart: "asc" }, { market: { sortOrder: "asc" } }],
  });
  const body = toCsv(
    ["market", "week_start", "source", "source_detail", "spend", "leads", "appointments", "notes"],
    rows.map((row) => [
      row.market.slug,
      dateToIso(row.weekStart),
      row.source,
      row.sourceDetail,
      centsToDollarInput(row.spendCents),
      String(row.leads),
      String(row.appointments),
      row.notes ?? "",
    ]),
  );
  return csvResponse(body, `northstar-spend-${week}.csv`);
}

function csvResponse(body: string, filename: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
