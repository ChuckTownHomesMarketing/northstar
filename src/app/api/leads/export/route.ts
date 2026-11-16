import { toCsv } from "@/lib/csv";
import { dateToIso, daysInMonth, parseIsoDate, zonedParts } from "@/lib/dates";
import { centsToDollarInput } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/server/session";

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return new Response("Sign in required.", { status: 401 });
  const url = new URL(request.url);
  if (url.searchParams.get("template") === "1") {
    const body = toCsv(
      ["source", "market", "occurred_on", "leads", "spend", "appointments", "conversions", "notes"],
      [["google-ppc", "charleston", "2026-11-16", "1", "0", "0", "0", ""]],
    );
    return csv(body, "northstar-leads-template.csv");
  }
  const today = zonedParts(new Date());
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const start = from && parseIsoDate(from) ? from : `${today.year}-${String(today.month).padStart(2, "0")}-01`;
  const end = to && parseIsoDate(to) ? to : `${today.year}-${String(today.month).padStart(2, "0")}-${String(daysInMonth(today.year, today.month)).padStart(2, "0")}`;
  const rows = await prisma.leadRecord.findMany({
    where: { occurredOn: { gte: new Date(`${start}T00:00:00.000Z`), lte: new Date(`${end}T00:00:00.000Z`) } },
    include: { source: true, market: true },
    orderBy: { occurredOn: "asc" },
  });
  const body = toCsv(
    ["source", "market", "occurred_on", "leads", "spend", "appointments", "conversions", "notes"],
    rows.map((row) => [
      row.source.slug,
      row.market?.slug ?? "",
      dateToIso(row.occurredOn),
      String(row.leads),
      centsToDollarInput(row.spendCents),
      String(row.appointments),
      String(row.conversions),
      row.notes ?? "",
    ]),
  );
  return csv(body, `northstar-leads-${start}.csv`);
}

function csv(body: string, filename: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
