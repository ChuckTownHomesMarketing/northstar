"use server";

import { revalidatePath } from "next/cache";
import { clip, oneOf, read } from "@/lib/forms";
import { safeHref } from "@/lib/links";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/session";
import { fail, saved, type ActionState } from "@/server/state";
import { generateApiToken, TOKEN_SCOPES } from "@/lib/tokens";

export async function saveApp(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = clip(read(formData, "name"), 80, "Name");
  const url = safeHref(read(formData, "url"));
  const openMode = oneOf(read(formData, "openMode"), ["EMBED", "EXTERNAL"] as const);
  if (!name || !url || !openMode) return fail("Name, an https link, and how it opens are required.");
  const data = {
    name,
    url,
    icon: clip(read(formData, "icon"), 8, "Icon") || "",
    openMode,
    active: formData.get("active") === "on",
    visibleToAdmins: formData.get("visibleToAdmins") === "on",
    visibleToVas: formData.get("visibleToVas") === "on",
  };
  const id = read(formData, "id");
  if (id) await prisma.externalApp.update({ where: { id }, data });
  else {
    const count = await prisma.externalApp.count();
    await prisma.externalApp.create({ data: { ...data, sortOrder: count + 1 } });
  }
  revalidatePath("/apps");
  saved("/apps", "App saved.");
}

export async function saveAccess(formData: FormData) {
  const admin = await requireAdmin();
  const userId = read(formData, "userId");
  const person = await prisma.user.findUnique({ where: { id: userId } });
  if (!person) return;
  const modules = ["marketing", "ordering"].filter((key) => formData.get(`module:${key}`) === "on");
  const apps = await prisma.externalApp.findMany();
  const appIds = apps.filter((app) => formData.get(`app:${app.id}`) === "on").map((app) => app.id);
  await prisma.$transaction([
    prisma.userModuleGrant.deleteMany({ where: { userId } }),
    prisma.userAppGrant.deleteMany({ where: { userId } }),
    ...(modules.length
      ? [prisma.userModuleGrant.createMany({ data: modules.map((moduleKey) => ({ userId, moduleKey })) })]
      : []),
    ...(appIds.length ? [prisma.userAppGrant.createMany({ data: appIds.map((appId) => ({ userId, appId })) })] : []),
  ]);
  void admin;
  revalidatePath("/settings");
  saved("/settings#people", `${person.name}'s access saved.`);
}

export async function toggleModule(formData: FormData) {
  await requireAdmin();
  const key = read(formData, "key");
  const moduleSetting = await prisma.moduleSetting.findUnique({ where: { key } });
  if (!moduleSetting) return;
  await prisma.moduleSetting.update({ where: { key }, data: { enabled: !moduleSetting.enabled } });
  revalidatePath("/");
  saved("/settings#modules", `${moduleSetting.name} is now ${moduleSetting.enabled ? "off" : "on"}.`);
}

export async function issueToken(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const name = clip(read(formData, "name"), 80, "Name");
  if (!name) return fail("Name the token so you can tell them apart.");
  const scopes = TOKEN_SCOPES.filter((scope) => formData.get(`scope:${scope}`) === "on");
  if (scopes.length === 0) return fail("Choose at least one scope.");
  const userId = read(formData, "userId") || null;
  if (userId) {
    const person = await prisma.user.findUnique({ where: { id: userId } });
    if (!person) return fail("That person is not on the list.");
  }
  const issued = generateApiToken();
  await prisma.apiToken.create({
    data: {
      name,
      tokenHash: issued.hash,
      prefix: issued.prefix,
      userId,
      scopes: scopes.join(" "),
      createdById: admin.id,
    },
  });
  revalidatePath("/settings");
  return {
    ok: true,
    message: `Copy this token now. It will not be shown again: ${issued.token}`,
  };
}

export async function revokeToken(formData: FormData) {
  await requireAdmin();
  await prisma.apiToken.update({ where: { id: read(formData, "id") }, data: { revokedAt: new Date() } }).catch(() => null);
  revalidatePath("/settings");
  saved("/settings#tokens", "Token revoked.");
}
