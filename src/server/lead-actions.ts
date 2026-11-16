"use server";

import { revalidatePath } from "next/cache";
import { isoToUtcDate, parseIsoDate } from "@/lib/dates";
import { clip, read } from "@/lib/forms";
import { dollarsToCents, parseOptionalInt } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/server/session";
import { fail, saved, type ActionState } from "@/server/state";
import { parseCsv } from "@/lib/csv";

export async function saveLead(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const sourceId = read(formData, "sourceId");
  const marketId = read(formData, "marketId") || null;
  const occurredOn = read(formData, "occurredOn");
  if (!parseIsoDate(occurredOn)) return fail("Choose the date.");
  const source = await prisma.leadSourceDefinition.findUnique({ where: { id: sourceId } });
  if (!source || !source.active) return fail("Choose a lead source.");
  try {
    const leads = parseOptionalInt(read(formData, "leads"));
    const spendCents = dollarsToCents(read(formData, "spend"));
    const appointments = parseOptionalInt(read(formData, "appointments"));
    const conversions = parseOptionalInt(read(formData, "conversions"));
    if (leads == null || spendCents == null || appointments == null || conversions == null) {
      return fail("Enter leads, spend, appointments, and conversions. Use 0 when the number is zero.");
    }
    await prisma.leadRecord.create({
      data: {
        sourceId: source.id,
        marketId,
        occurredOn: isoToUtcDate(occurredOn),
        leads,
        spendCents,
        appointments,
        conversions,
        notes: clip(read(formData, "notes"), 2000, "Notes") || null,
        origin: "MANUAL",
        createdById: user.id,
      },
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Check the numbers.");
  }
  revalidatePath("/leads");
  saved("/leads", "Lead row saved.");
}

export async function importLeads(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a CSV file.");
  const [sources, markets] = await Promise.all([
    prisma.leadSourceDefinition.findMany(),
    prisma.market.findMany(),
  ]);
  const table = parseCsv(await file.text());
  if (table.length < 2) return fail("The file needs a header and at least one row.");
  const header = table[0].map((cell) => cell.trim().toLowerCase());
  const index = (name: string) => header.indexOf(name);
  let written = 0;
  const issues: string[] = [];
  for (const [offset, row] of table.slice(1).entries()) {
    const line = offset + 2;
    const rawSource = (row[index("source")] ?? "").trim().toLowerCase();
    const source = sources.find((item) => item.slug === rawSource || item.name.toLowerCase() === rawSource);
    const marketValue = (row[index("market")] ?? "").trim().toLowerCase();
    const market = markets.find((item) => item.slug === marketValue || item.name.toLowerCase() === marketValue);
    const occurredOn = (row[index("occurred_on")] ?? row[index("date")] ?? "").trim();
    if (!source || !parseIsoDate(occurredOn)) {
      issues.push(`Line ${line} skipped.`);
      continue;
    }
    const leads = Number(row[index("leads")] || "0");
    const spend = row[index("spend")] || "0";
    const appointments = Number(row[index("appointments")] || "0");
    const conversions = Number(row[index("conversions")] || "0");
    if (![leads, appointments, conversions].every((value) => Number.isInteger(value) && value >= 0)) {
      issues.push(`Line ${line} has a bad count.`);
      continue;
    }
    let spendCents = 0;
    try {
      spendCents = dollarsToCents(spend) ?? 0;
    } catch {
      issues.push(`Line ${line} has a bad spend.`);
      continue;
    }
    await prisma.leadRecord.create({
      data: {
        sourceId: source.id,
        marketId: market?.id ?? null,
        occurredOn: isoToUtcDate(occurredOn),
        leads,
        spendCents,
        appointments,
        conversions,
        notes: row[index("notes")] || null,
        origin: "CSV",
        createdById: user.id,
      },
    });
    written += 1;
  }
  revalidatePath("/leads");
  saved("/leads", `Imported ${written} rows. ${issues.slice(0, 3).join(" ")}`.trim());
}

export async function saveLeadSource(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = clip(read(formData, "name"), 80, "Name");
  const slug = clip(read(formData, "slug"), 40, "Slug").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const kind = read(formData, "kind") || "custom";
  if (!name || !slug) return fail("Name and a short slug are required.");
  const id = read(formData, "id");
  const data = {
    name,
    slug,
    kind,
    description: clip(read(formData, "description"), 500, "Description") || null,
    active: formData.get("active") === "on",
  };
  if (id) await prisma.leadSourceDefinition.update({ where: { id }, data });
  else {
    const count = await prisma.leadSourceDefinition.count();
    await prisma.leadSourceDefinition.create({ data: { ...data, sortOrder: count + 1 } });
  }
  revalidatePath("/leads");
  saved("/leads", "Lead source saved.");
}
