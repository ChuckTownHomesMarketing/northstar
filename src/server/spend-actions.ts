"use server";

import { revalidatePath } from "next/cache";
import { parseSpendCsv } from "@/lib/csv";
import { isoToUtcDate, mondayOf, parseIsoDate } from "@/lib/dates";
import { clip, oneOf, read } from "@/lib/forms";
import { LEAD_SOURCES, type LeadSourceValue } from "@/lib/labels";
import { dollarsToCents, parseOptionalInt } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";
import { fail, saved, type ActionState } from "@/server/state";

const SOURCES = LEAD_SOURCES.map((source) => source.value);

function back(week: string, market = ""): string {
  const params = new URLSearchParams({ week });
  if (market) params.set("market", market);
  return `/spend?${params.toString()}`;
}

export async function saveSpend(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const marketId = read(formData, "marketId");
  const weekRaw = read(formData, "weekStart");
  const source = oneOf(read(formData, "source"), SOURCES);
  const market = await prisma.market.findUnique({ where: { id: marketId } });
  if (!market) return fail("Choose a market.");
  if (!source) return fail("Choose a source.");
  if (!parseIsoDate(weekRaw)) return fail("Choose the week.");
  const weekStart = mondayOf(weekRaw);
  const sourceDetail = source === "OTHER" ? clip(read(formData, "sourceDetail"), 80, "Source detail") : "";
  if (source === "OTHER" && !sourceDetail) return fail("Name the other source, like Homes.com.");
  let spendCents: number | null;
  let leads: number | null;
  let appointments: number | null;
  try {
    spendCents = dollarsToCents(read(formData, "spend"));
    leads = parseOptionalInt(read(formData, "leads"));
    appointments = parseOptionalInt(read(formData, "appointments"));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Check the numbers.");
  }
  if (spendCents == null) return fail("Enter the spend. Use 0 if this source was free.");
  if (leads == null || appointments == null) return fail("Enter leads and appointments. Use 0 if there were none.");
  const notes = clip(read(formData, "notes"), 2000, "Notes") || null;
  await prisma.spendEntry.upsert({
    where: {
      marketId_source_sourceDetail_weekStart: {
        marketId: market.id,
        source,
        sourceDetail,
        weekStart: isoToUtcDate(weekStart),
      },
    },
    update: { spendCents, leads, appointments, notes, origin: "MANUAL", isDemo: false },
    create: {
      marketId: market.id,
      source,
      sourceDetail,
      weekStart: isoToUtcDate(weekStart),
      spendCents,
      leads,
      appointments,
      notes,
      origin: "MANUAL",
      isDemo: false,
    },
  });
  revalidatePath("/spend");
  revalidatePath("/");
  revalidatePath("/reports");
  saved(back(weekStart, market.slug), "Saved this week's source.");
}

export async function deleteSpend(formData: FormData) {
  await requireUser();
  const id = read(formData, "id");
  const week = read(formData, "week");
  await prisma.spendEntry.delete({ where: { id } }).catch(() => null);
  revalidatePath("/spend");
  revalidatePath("/reports");
  saved(back(parseIsoDate(week) ? mondayOf(week) : week), "Entry removed.");
}

export async function importSpendCsv(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a CSV file.");
  if (file.size > 1_000_000) return fail("Use a file under 1 MB.");
  const markets = await prisma.market.findMany();
  const parsed = parseSpendCsv(await file.text(), markets, mondayOf);
  if (parsed.rows.length === 0) return fail(parsed.issues[0]?.message ?? "Nothing in that file could be imported.");
  for (const row of parsed.rows) {
    const market = markets.find((item) => item.slug === row.marketSlug);
    if (!market) continue;
    const source = row.source as LeadSourceValue;
    await prisma.spendEntry.upsert({
      where: {
        marketId_source_sourceDetail_weekStart: {
          marketId: market.id,
          source,
          sourceDetail: row.sourceDetail,
          weekStart: isoToUtcDate(row.weekStart),
        },
      },
      update: {
        spendCents: row.spendCents,
        leads: row.leads,
        appointments: row.appointments,
        notes: row.notes,
        origin: "CSV",
        isDemo: false,
      },
      create: {
        marketId: market.id,
        source,
        sourceDetail: row.sourceDetail,
        weekStart: isoToUtcDate(row.weekStart),
        spendCents: row.spendCents,
        leads: row.leads,
        appointments: row.appointments,
        notes: row.notes,
        origin: "CSV",
        isDemo: false,
      },
    });
  }
  revalidatePath("/spend");
  const snapped = parsed.rows.filter((row) => row.snappedToMonday).length;
  const skipped = parsed.issues.slice(0, 3).map((issue) => `Line ${issue.line}: ${issue.message}`).join(" ");
  const note = [
    `Imported ${parsed.rows.length} rows.`,
    snapped ? `${snapped} dates moved to that week's Monday.` : "",
    skipped,
  ]
    .filter(Boolean)
    .join(" ");
  saved("/spend", note);
}
