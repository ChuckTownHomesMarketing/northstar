"use server";

import { revalidatePath } from "next/cache";
import { dueOnForTemplate, isoToUtcDate, periodKeyFor, type RecurrenceName } from "@/lib/dates";
import { clip, oneOf, optionalDate, read } from "@/lib/forms";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { canMutateOwned } from "@/lib/permissions";
import { requireUser } from "@/server/session";
import { fail, saved, type ActionState } from "@/server/state";

const STATUSES = TASK_STATUSES.map((item) => item.value);
const PRIORITIES = TASK_PRIORITIES.map((item) => item.value);
const RECURRENCES = ["DAILY", "WEEKLY", "MONTHLY"] as const;

function tasksPath(formData?: FormData): string {
  if (!formData) return "/tasks";
  const params = new URLSearchParams();
  const view = read(formData, "view");
  const market = read(formData, "filterMarket");
  const owner = read(formData, "filterOwner");
  if (view) params.set("view", view);
  if (market) params.set("market", market);
  if (owner) params.set("owner", owner);
  const query = params.toString();
  return query ? `/tasks?${query}` : "/tasks";
}

export async function ensureRecurringTasks(today: string) {
  const templates = await prisma.taskTemplate.findMany({ where: { active: true } });
  for (const template of templates) {
    const recurrence = template.recurrence as RecurrenceName;
    const periodKey = periodKeyFor(recurrence, today);
    const existing = await prisma.task.findUnique({
      where: { templateId_periodKey: { templateId: template.id, periodKey } },
    });
    if (existing) continue;
    await prisma.task.create({
      data: {
        title: template.title,
        details: template.details,
        marketId: template.marketId,
        ownerId: template.ownerId,
        priority: template.priority,
        dueOn: isoToUtcDate(
          dueOnForTemplate({
            recurrence,
            weekday: template.weekday,
            dayOfMonth: template.dayOfMonth,
            today,
          }),
        ),
        status: "TODO",
        templateId: template.id,
        periodKey,
        isDemo: template.isDemo,
      },
    });
  }
}

export async function saveTask(_state: ActionState, formData: FormData): Promise<ActionState> {
  const title = clip(read(formData, "title"), 180, "Task");
  if (!title) return fail("Name the task.");
  const priority = oneOf(read(formData, "priority"), PRIORITIES) ?? "MEDIUM";
  const status = oneOf(read(formData, "status"), STATUSES) ?? "TODO";
  let dueOn: Date | null;
  try {
    dueOn = optionalDate(read(formData, "dueOn"));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Check the due date.");
  }
  const user = await requireUser();
  const marketId = read(formData, "marketId") || null;
  const requestedOwner = read(formData, "ownerId") || null;
  const ownerId = user.role === "VA" ? user.id : requestedOwner;
  const existingId = read(formData, "id");
  if (existingId) {
    const existing = await prisma.task.findUnique({ where: { id: existingId } });
    if (!existing || !canMutateOwned(user, existing.ownerId)) return fail("That task is not yours.");
  }
  const data = {
    title,
    details: clip(read(formData, "details"), 4000, "Details") || null,
    marketId,
    ownerId,
    dueOn,
    priority,
    status,
    isDemo: false,
  };
  if (existingId) await prisma.task.update({ where: { id: existingId }, data });
  else await prisma.task.create({ data });
  revalidatePath("/tasks");
  revalidatePath("/");
  saved(tasksPath(formData), existingId ? "Task updated." : "Task added.");
}

export async function moveTask(id: string, status: string) {
  const user = await requireUser();
  const next = oneOf(status, STATUSES);
  if (!id || !next) return;
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing || !canMutateOwned(user, existing.ownerId)) return;
  await prisma.task.update({ where: { id }, data: { status: next } }).catch(() => null);
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function updateTaskStatus(formData: FormData) {
  await moveTask(read(formData, "id"), read(formData, "status"));
}

export async function deleteTask(formData: FormData) {
  const user = await requireUser();
  const existing = await prisma.task.findUnique({ where: { id: read(formData, "id") } });
  if (!existing || !canMutateOwned(user, existing.ownerId)) return;
  await prisma.task.delete({ where: { id: existing.id } }).catch(() => null);
  revalidatePath("/tasks");
  revalidatePath("/");
  saved(tasksPath(formData), "Task removed.");
}

export async function saveTemplate(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return fail("Avery manages recurring templates.");
  const title = clip(read(formData, "title"), 180, "Template");
  if (!title) return fail("Name the recurring task.");
  const recurrence = oneOf(read(formData, "recurrence"), RECURRENCES);
  if (!recurrence) return fail("Choose daily, weekly, or monthly.");
  const priority = oneOf(read(formData, "priority"), PRIORITIES) ?? "MEDIUM";
  const weekday = Number(read(formData, "weekday") || "1");
  const dayOfMonth = Number(read(formData, "dayOfMonth") || "1");
  if (recurrence === "WEEKLY" && (weekday < 1 || weekday > 7)) return fail("Choose a weekday.");
  if (recurrence === "MONTHLY" && (dayOfMonth < 1 || dayOfMonth > 28)) {
    return fail("Use a day from 1 to 28 so February still gets the task.");
  }
  await prisma.taskTemplate.create({
    data: {
      title,
      details: clip(read(formData, "details"), 4000, "Details") || null,
      marketId: read(formData, "marketId") || null,
      ownerId: read(formData, "ownerId") || null,
      priority,
      recurrence,
      weekday: recurrence === "WEEKLY" ? weekday : null,
      dayOfMonth: recurrence === "MONTHLY" ? dayOfMonth : null,
      active: true,
      isDemo: false,
    },
  });
  revalidatePath("/tasks");
  saved("/tasks?view=list", "Recurring template added. It will show up on the board for this period.");
}

export async function toggleTemplate(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "ADMIN") return;
  const id = read(formData, "id");
  const template = await prisma.taskTemplate.findUnique({ where: { id } });
  if (!template) return;
  await prisma.taskTemplate.update({ where: { id }, data: { active: !template.active } });
  revalidatePath("/tasks");
}
