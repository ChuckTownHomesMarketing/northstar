import { isoToUtcDate, parseIsoDate } from "@/lib/dates";
import { parseWebhookLead } from "@/lib/leads";
import { prisma } from "@/lib/prisma";
import { hashToken, parseBearer, parseScopes, tokenHasScope } from "@/lib/tokens";

export async function POST(request: Request) {
  const actor = await actorFromRequest(request);
  if (!actor) return Response.json({ error: "A bearer token with leads:write is required." }, { status: 401 });
  if (!tokenHasScope(actor.scopes, "leads:write")) {
    return Response.json({ error: "This token cannot write leads." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send JSON." }, { status: 400 });
  }
  const parsed = parseWebhookLead(body);
  if (!parsed.ok) return Response.json({ error: parsed.message }, { status: 400 });
  if (!parseIsoDate(parsed.lead.occurredOn)) return Response.json({ error: "occurredOn is not a real date." }, { status: 400 });
  const source = await prisma.leadSourceDefinition.findFirst({
    where: { slug: parsed.lead.sourceSlug.toLowerCase(), active: true },
  });
  if (!source) return Response.json({ error: "That lead source is not in Northstar." }, { status: 422 });
  const market = parsed.lead.marketSlug
    ? await prisma.market.findFirst({ where: { slug: parsed.lead.marketSlug.toLowerCase() } })
    : null;
  if (parsed.lead.marketSlug && !market) return Response.json({ error: "That market is not in Northstar." }, { status: 422 });
  if (parsed.lead.externalId) {
    const existing = await prisma.leadRecord.findUnique({
      where: { sourceId_externalId: { sourceId: source.id, externalId: parsed.lead.externalId } },
    });
    if (existing) return Response.json({ id: existing.id, duplicate: true });
  }
  const created = await prisma.leadRecord.create({
    data: {
      sourceId: source.id,
      marketId: market?.id ?? null,
      occurredOn: isoToUtcDate(parsed.lead.occurredOn),
      leads: parsed.lead.leads,
      spendCents: parsed.lead.spendCents,
      appointments: parsed.lead.appointments,
      conversions: parsed.lead.conversions,
      externalId: parsed.lead.externalId,
      contactName: parsed.lead.contactName,
      contactEmail: parsed.lead.contactEmail,
      notes: parsed.lead.notes,
      origin: "WEBHOOK",
      createdById: actor.userId,
    },
  });
  return Response.json({ id: created.id, duplicate: false }, { status: 201 });
}

async function actorFromRequest(request: Request) {
  const raw = parseBearer(request.headers.get("authorization"));
  if (!raw) return null;
  const token = await prisma.apiToken.findUnique({ where: { tokenHash: hashToken(raw) }, include: { user: true } });
  if (!token || token.revokedAt) return null;
  if (token.user && !token.user.active) return null;
  await prisma.apiToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } });
  return { userId: token.userId, scopes: parseScopes(token.scopes), role: token.user?.role ?? "ADMIN" };
}
