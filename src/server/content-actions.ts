"use server";

import { revalidatePath } from "next/cache";
import { CONTENT_CHANNELS, CONTENT_STATUSES, CONTENT_TYPES } from "@/lib/labels";
import { clip, oneOf, optionalDate, read } from "@/lib/forms";
import { safeHref } from "@/lib/links";
import { prisma } from "@/lib/prisma";
import { canMutateOwned } from "@/lib/permissions";
import { requireUser } from "@/server/session";
import { fail, saved, type ActionState } from "@/server/state";

const CHANNELS = CONTENT_CHANNELS.map((item) => item.value);
const TYPES = CONTENT_TYPES.map((item) => item.value);
const STATUSES = CONTENT_STATUSES.map((item) => item.value);

function calendarPath(formData: FormData): string {
  const month = read(formData, "month");
  const view = read(formData, "view") || "month";
  const params = new URLSearchParams({ view });
  if (month) params.set("month", month);
  const market = read(formData, "filterMarket");
  const owner = read(formData, "filterOwner");
  const status = read(formData, "filterStatus");
  if (market) params.set("market", market);
  if (owner) params.set("owner", owner);
  if (status) params.set("status", status);
  return `/calendar?${params.toString()}`;
}

export async function saveContent(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const topic = clip(read(formData, "topic"), 180, "Topic");
  if (!topic) return fail("Add a topic so the team knows what this is.");
  const channel = oneOf(read(formData, "channel"), CHANNELS);
  const contentType = oneOf(read(formData, "contentType"), TYPES);
  const status = oneOf(read(formData, "status"), STATUSES);
  if (!channel || !contentType || !status) return fail("Choose a channel, type, and status.");
  const linkRaw = read(formData, "link");
  const link = linkRaw ? safeHref(linkRaw) : null;
  if (linkRaw && !link) return fail("The link needs to start with https://.");
  let scheduledFor: Date | null;
  try {
    scheduledFor = optionalDate(read(formData, "scheduledFor"));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Check the date.");
  }
  const marketId = read(formData, "marketId") || null;
  const ownerId = user.role === "VA" ? user.id : read(formData, "ownerId") || null;
  const campaignId = read(formData, "campaignId") || null;
  if (marketId && !(await prisma.market.findUnique({ where: { id: marketId } }))) return fail("Choose a market from the list.");
  if (ownerId && !(await prisma.user.findUnique({ where: { id: ownerId } }))) return fail("Choose an owner from the list.");
  if (campaignId && !(await prisma.campaign.findUnique({ where: { id: campaignId } }))) return fail("Choose a campaign from the list.");
  const data = {
    topic,
    channel,
    contentType,
    status,
    marketId,
    ownerId,
    campaignId,
    scheduledFor,
    link,
    notes: clip(read(formData, "notes"), 4000, "Notes") || null,
    isDemo: false,
  };
  const id = read(formData, "id");
  if (id) {
    const existing = await prisma.contentItem.findUnique({ where: { id } });
    if (!existing || !canMutateOwned(user, existing.ownerId)) return fail("That piece is not yours.");
    await prisma.contentItem.update({ where: { id }, data });
  } else {
    await prisma.contentItem.create({ data });
  }
  revalidatePath("/calendar");
  revalidatePath("/");
  revalidatePath("/reports");
  saved(calendarPath(formData), id ? "Content updated." : "Content added.");
}

export async function updateContentStatus(formData: FormData) {
  const user = await requireUser();
  const id = read(formData, "id");
  const status = oneOf(read(formData, "status"), STATUSES);
  if (!id || !status) return;
  const existing = await prisma.contentItem.findUnique({ where: { id } });
  if (!existing || !canMutateOwned(user, existing.ownerId)) return;
  await prisma.contentItem.update({ where: { id }, data: { status, isDemo: false } }).catch(() => null);
  revalidatePath("/calendar");
  revalidatePath("/");
  revalidatePath("/reports");
}

export async function deleteContent(formData: FormData) {
  const user = await requireUser();
  const id = read(formData, "id");
  const existing = await prisma.contentItem.findUnique({ where: { id } });
  if (!existing || !canMutateOwned(user, existing.ownerId)) return;
  await prisma.contentItem.delete({ where: { id } }).catch(() => null);
  revalidatePath("/calendar");
  revalidatePath("/");
  saved(calendarPath(formData), "Content removed.");
}

export async function saveCampaign(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return fail("Avery manages campaigns.");
  const name = clip(read(formData, "name"), 140, "Campaign name");
  if (!name) return fail("Name the campaign.");
  let startsOn: Date | null;
  let endsOn: Date | null;
  try {
    startsOn = optionalDate(read(formData, "startsOn"));
    endsOn = optionalDate(read(formData, "endsOn"));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Check the dates.");
  }
  const marketId = read(formData, "marketId") || null;
  await prisma.campaign.create({
    data: {
      name,
      marketId,
      description: clip(read(formData, "description"), 2000, "Description") || null,
      startsOn,
      endsOn,
      isDemo: false,
    },
  });
  revalidatePath("/calendar");
  saved(calendarPath(formData), "Campaign added.");
}
