"use server";

import { revalidatePath } from "next/cache";
import { parseKpiCsv } from "@/lib/csv";
import { monthInputValue, parseMonthKey } from "@/lib/dates";
import { clip, read } from "@/lib/forms";
import { dollarsToCents, parseOptionalInt, parseRating } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";
import { fail, saved, type ActionState } from "@/server/state";

export async function saveKpi(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const marketId = read(formData, "marketId");
  const monthValue = read(formData, "month");
  if (!/^\d{4}-\d{2}$/.test(monthValue)) return fail("Choose a month.");
  const { year, month } = parseMonthKey(monthValue);
  const market = await prisma.market.findUnique({ where: { id: marketId } });
  if (!market) return fail("Choose a market.");
  try {
    const data = {
      leads: parseOptionalInt(read(formData, "leads")),
      adSpendCents: dollarsToCents(read(formData, "adSpend")),
      costPerLeadCents: dollarsToCents(read(formData, "costPerLead")),
      appointments: parseOptionalInt(read(formData, "appointments")),
      closings: parseOptionalInt(read(formData, "closings")),
      websiteSessions: parseOptionalInt(read(formData, "websiteSessions")),
      socialFollowers: parseOptionalInt(read(formData, "socialFollowers")),
      socialEngagement: parseOptionalInt(read(formData, "socialEngagement")),
      newGoogleReviews: parseOptionalInt(read(formData, "newGoogleReviews")),
      avgRating: parseRating(read(formData, "avgRating")),
      notes: clip(read(formData, "notes"), 2000, "Notes") || null,
      origin: "MANUAL" as const,
      isDemo: false,
    };
    await prisma.marketMonthKpi.upsert({
      where: { marketId_year_month: { marketId: market.id, year, month } },
      update: data,
      create: { marketId: market.id, year, month, ...data },
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Check the numbers and try again.");
  }
  revalidatePath("/kpis");
  revalidatePath("/");
  revalidatePath("/reports");
  saved(`/kpis?month=${monthInputValue(year, month)}&market=${market.slug}`, `Saved ${market.name} for ${monthInputValue(year, month)}.`);
}

export async function importKpiCsv(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a CSV file.");
  if (file.size > 1_000_000) return fail("Use a file under 1 MB.");
  const markets = await prisma.market.findMany();
  const parsed = parseKpiCsv(await file.text(), markets);
  if (parsed.rows.length === 0) {
    return fail(parsed.issues[0]?.message ?? "Nothing in that file could be imported.");
  }
  for (const row of parsed.rows) {
    const market = markets.find((item) => item.slug === row.marketSlug);
    if (!market) continue;
    await prisma.marketMonthKpi.upsert({
      where: { marketId_year_month: { marketId: market.id, year: row.year, month: row.month } },
      update: {
        leads: row.leads,
        adSpendCents: row.adSpendCents,
        costPerLeadCents: row.costPerLeadCents,
        appointments: row.appointments,
        closings: row.closings,
        websiteSessions: row.websiteSessions,
        socialFollowers: row.socialFollowers,
        socialEngagement: row.socialEngagement,
        newGoogleReviews: row.newGoogleReviews,
        avgRating: row.avgRating,
        notes: row.notes,
        origin: "CSV",
        isDemo: false,
      },
      create: {
        marketId: market.id,
        year: row.year,
        month: row.month,
        leads: row.leads,
        adSpendCents: row.adSpendCents,
        costPerLeadCents: row.costPerLeadCents,
        appointments: row.appointments,
        closings: row.closings,
        websiteSessions: row.websiteSessions,
        socialFollowers: row.socialFollowers,
        socialEngagement: row.socialEngagement,
        newGoogleReviews: row.newGoogleReviews,
        avgRating: row.avgRating,
        notes: row.notes,
        origin: "CSV",
        isDemo: false,
      },
    });
  }
  revalidatePath("/kpis");
  revalidatePath("/");
  const skipped = parsed.issues.slice(0, 3).map((issue) => `Line ${issue.line}: ${issue.message}`).join(" ");
  saved("/kpis", skipped ? `Imported ${parsed.rows.length} rows. ${skipped}` : `Imported ${parsed.rows.length} rows.`);
}
