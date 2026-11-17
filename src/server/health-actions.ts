"use server";

import { revalidatePath } from "next/cache";
import { HEALTH_DEFAULTS } from "@/lib/health";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/session";
import { fail, saved, type ActionState } from "@/server/state";

export async function saveHealthTargets(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  for (const target of HEALTH_DEFAULTS) {
    const value = Number(String(formData.get(target.key) ?? ""));
    if (!Number.isFinite(value) || value <= 0) return fail(`${target.label} needs a target above zero.`);
    const secondaryRaw = String(formData.get(`${target.key}:secondary`) ?? "");
    const secondary = secondaryRaw === "" ? null : Number(secondaryRaw);
    if (secondary != null && (!Number.isFinite(secondary) || secondary <= 0)) {
      return fail(`${target.label} has a second target that is not a positive number.`);
    }
    await prisma.healthTarget.upsert({
      where: { key: target.key },
      update: { target: value, secondaryTarget: secondary, label: target.label, direction: target.direction, unit: target.unit },
      create: {
        key: target.key,
        label: target.label,
        target: value,
        secondaryTarget: secondary,
        direction: target.direction,
        unit: target.unit,
      },
    });
  }
  revalidatePath("/marketing");
  saved("/settings#health", "Health targets saved.");
}
