"use server";

import { revalidatePath } from "next/cache";
import { mondayOf, parseIsoDate } from "@/lib/dates";
import { clip, read } from "@/lib/forms";
import { isoToUtcDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";
import { fail, saved, type ActionState } from "@/server/state";

export async function saveReport(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const raw = read(formData, "weekStart");
  if (!parseIsoDate(raw)) return fail("That week is not valid.");
  const weekStart = mondayOf(raw);
  try {
    const data = {
      wins: clip(read(formData, "wins"), 8000, "Wins"),
      issues: clip(read(formData, "issues"), 8000, "Issues"),
      priorities: clip(read(formData, "priorities"), 8000, "Priorities"),
      isDemo: false,
      updatedById: user.id,
    };
    await prisma.weeklyReport.upsert({
      where: { weekStart: isoToUtcDate(weekStart) },
      update: data,
      create: { weekStart: isoToUtcDate(weekStart), ...data },
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "The report could not be saved.");
  }
  revalidatePath(`/reports/${weekStart}`);
  revalidatePath("/reports");
  saved(`/reports/${weekStart}`, "Report notes saved.");
}
