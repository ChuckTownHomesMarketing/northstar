"use server";

import { revalidatePath } from "next/cache";
import { allowedDomain, isCompanyEmail, normalizeEmail } from "@/lib/access";
import { loadDemoData, wipeDemoData } from "@/lib/demo";
import { clip, oneOf, read } from "@/lib/forms";
import { safeHref } from "@/lib/links";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/session";
import { fail, saved, type ActionState } from "@/server/state";

export async function saveMarket(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = read(formData, "id");
  const market = await prisma.market.findUnique({ where: { id } });
  if (!market) return fail("That market is not in Northstar.");
  const active = formData.get("active") === "on";
  if (!active) {
    const others = await prisma.market.count({ where: { active: true, id: { not: id } } });
    if (others === 0) return fail("Keep at least one market active.");
  }
  await prisma.market.update({
    where: { id },
    data: {
      address: clip(read(formData, "address"), 240, "Address") || null,
      phone: clip(read(formData, "phone"), 40, "Phone") || null,
      openingNote: clip(read(formData, "openingNote"), 400, "Opening note") || null,
      active,
    },
  });
  revalidatePath("/settings");
  revalidatePath("/");
  saved("/settings#markets", `${market.name} saved.`);
}

export async function addPerson(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const email = normalizeEmail(read(formData, "email"));
  const name = clip(read(formData, "name"), 120, "Name");
  const role = oneOf(read(formData, "role"), ["ADMIN", "VA"] as const) ?? "VA";
  if (!name) return fail("Add the person's name.");
  if (!isCompanyEmail(email, allowedDomain())) {
    return fail(`Use an @${allowedDomain()} email.`);
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return fail("That email is already on the list. You can change the role below.");
  await prisma.user.create({ data: { email, name, role, active: true } });
  revalidatePath("/settings");
  saved("/settings#people", `${name} can sign in with Google.`);
}

export async function updatePerson(formData: FormData) {
  const actor = await requireAdmin();
  const id = read(formData, "id");
  const role = oneOf(read(formData, "role"), ["ADMIN", "VA"] as const);
  if (!role) return;
  const active = formData.get("active") === "on";
  const person = await prisma.user.findUnique({ where: { id } });
  if (!person) return;
  const losingAdmin = person.role === "ADMIN" && person.active && (role !== "ADMIN" || !active);
  if (losingAdmin) {
    const others = await prisma.user.count({
      where: { role: "ADMIN", active: true, isDemo: false, id: { not: id } },
    });
    if (others === 0) {
      saved("/settings#people", "Northstar needs at least one real admin.");
    }
  }
  if (actor.id === id && !active) {
    saved("/settings#people", "Ask another admin to turn off your access.");
  }
  await prisma.user.update({ where: { id }, data: { role, active } });
  revalidatePath("/settings");
  saved("/settings#people", `${person.name} updated.`);
}

export async function saveTeammate(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = read(formData, "id");
  const name = clip(read(formData, "name"), 80, "Name");
  const title = clip(read(formData, "title"), 140, "Title");
  const askFor = clip(read(formData, "askFor"), 2000, "Ask for");
  if (!name || !title || !askFor) return fail("Name, title, and what to ask for are all required.");
  await prisma.aiTeammate.update({
    where: { id },
    data: { name, title, askFor, active: formData.get("active") === "on" },
  });
  revalidatePath("/settings");
  revalidatePath("/");
  saved("/settings#team", `${name} saved.`);
}

export async function saveLink(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const label = clip(read(formData, "label"), 80, "Label");
  const href = safeHref(read(formData, "href"));
  if (!label) return fail("Name the link.");
  if (!href) return fail("The link needs to start with https:// or mailto:.");
  const description = clip(read(formData, "description"), 180, "Description") || null;
  const id = read(formData, "id");
  if (id) {
    await prisma.quickLink.update({ where: { id }, data: { label, href, description, active: formData.get("active") === "on" } });
  } else {
    const count = await prisma.quickLink.count();
    await prisma.quickLink.create({ data: { label, href, description, sortOrder: count + 1, active: true } });
  }
  revalidatePath("/settings");
  revalidatePath("/");
  saved("/settings#links", "Link saved.");
}

export async function deleteLink(formData: FormData) {
  await requireAdmin();
  await prisma.quickLink.delete({ where: { id: read(formData, "id") } }).catch(() => null);
  revalidatePath("/");
  saved("/settings#links", "Link removed.");
}

export async function loadSample(state: ActionState, formData: FormData): Promise<ActionState> {
  void state;
  void formData;
  await requireAdmin();
  const result = await loadDemoData(prisma);
  revalidatePath("/");
  revalidatePath("/kpis");
  revalidatePath("/spend");
  revalidatePath("/calendar");
  revalidatePath("/reports");
  revalidatePath("/tasks");
  saved(
    "/settings#sample",
    `Sample data loaded (${result.written} rows). Real rows were left alone (${result.skipped} skipped).`,
  );
}

export async function wipeSample(state: ActionState, formData: FormData): Promise<ActionState> {
  void state;
  void formData;
  await requireAdmin();
  const realAdmins = await prisma.user.count({ where: { role: "ADMIN", active: true, isDemo: false } });
  if (realAdmins === 0) return fail("Add a real admin before wiping sample people.");
  await wipeDemoData(prisma);
  revalidatePath("/");
  revalidatePath("/kpis");
  revalidatePath("/spend");
  revalidatePath("/calendar");
  revalidatePath("/reports");
  revalidatePath("/tasks");
  saved("/settings#sample", "Sample data removed. Real entries are still here.");
}
