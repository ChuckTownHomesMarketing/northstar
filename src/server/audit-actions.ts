"use server";

import { revalidatePath } from "next/cache";
import { isoToUtcDate, parseIsoDate } from "@/lib/dates";
import { clip, oneOf, read } from "@/lib/forms";
import { auditAppliesTo } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/server/session";
import { fail, saved, type ActionState } from "@/server/state";

export async function toggleAudit(formData: FormData) {
  const user = await requireUser();
  const templateId = read(formData, "templateId");
  const day = read(formData, "day");
  if (!parseIsoDate(day)) return;
  const template = await prisma.auditTemplate.findUnique({ where: { id: templateId }, include: { assignees: true } });
  if (
    !template ||
    !auditAppliesTo(
      { active: template.active, assignRole: template.assignRole, assigneeIds: template.assignees.map((seat) => seat.userId) },
      user,
    )
  ) {
    return;
  }
  const done = formData.get("done") === "on";
  await prisma.auditCheck.upsert({
    where: { templateId_userId_day: { templateId, userId: user.id, day: isoToUtcDate(day) } },
    update: { done, completedAt: done ? new Date() : null },
    create: { templateId, userId: user.id, day: isoToUtcDate(day), done, completedAt: done ? new Date() : null },
  });
  revalidatePath("/");
  revalidatePath("/audit");
}

export async function saveAuditTemplate(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const title = clip(read(formData, "title"), 180, "Audit item");
  if (!title) return fail("Name the audit item.");
  const assignRole = oneOf(read(formData, "assignRole"), ["ADMIN", "VA"] as const);
  const count = await prisma.auditTemplate.count();
  await prisma.auditTemplate.create({
    data: {
      title,
      details: clip(read(formData, "details"), 500, "Details") || null,
      assignRole,
      sortOrder: count + 1,
    },
  });
  revalidatePath("/");
  saved("/", "Audit item added.");
}
