import { isoToUtcDate, parseIsoDate, todayIso } from "@/lib/dates";
import { leadRates, summarizeLeads } from "@/lib/leads";
import { canSeeOwned } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { authorizeTool, hashToken, parseBearer, parseScopes, scopesForTool } from "@/lib/tokens";

type Actor = { id: string; role: "ADMIN" | "VA"; scopes: string[] };

export async function GET() {
  return Response.json({
    name: "northstar",
    endpoint: "/api/mcp",
    auth: "Authorization: Bearer <token>",
    tools: Object.keys({
      list_tasks: true,
      create_task: true,
      read_lead_metrics: true,
      read_kpi_metrics: true,
      list_content: true,
      create_content: true,
      create_product_order: true,
    }).map((name) => ({ name, scopes: scopesForTool(name) })),
  });
}

export async function POST(request: Request) {
  const actor = await actorFromRequest(request);
  if (!actor) {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "A Northstar API token is required." } }, { status: 401 });
  }
  let body: { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return rpc(null, null, { code: -32700, message: "Parse error." });
  }
  const id = body.id ?? null;
  if (body.method === "notifications/initialized") return new Response(null, { status: 202 });
  if (body.method === "initialize") {
    return rpc(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "northstar", version: "2.0.0" },
    });
  }
  if (body.method === "tools/list") {
    return rpc(id, {
      tools: [
        tool("list_tasks", "List tasks the token is allowed to see.", { type: "object", properties: {} }),
        tool("create_task", "Create a task.", {
          type: "object",
          properties: { title: { type: "string" }, details: { type: "string" }, dueOn: { type: "string" } },
          required: ["title"],
        }),
        tool("read_lead_metrics", "Read lead volume, cost, CPL, and rates.", {
          type: "object",
          properties: { from: { type: "string" }, to: { type: "string" } },
        }),
        tool("read_kpi_metrics", "Read monthly KPI rows.", {
          type: "object",
          properties: { year: { type: "number" }, month: { type: "number" } },
          required: ["year", "month"],
        }),
        tool("list_content", "List content calendar items the token can see.", { type: "object", properties: {} }),
        tool("create_content", "Create a content calendar item.", {
          type: "object",
          properties: { topic: { type: "string" }, channel: { type: "string" }, contentType: { type: "string" } },
          required: ["topic"],
        }),
        tool("create_product_order", "Request a catalog product.", {
          type: "object",
          properties: { productId: { type: "string" }, quantity: { type: "number" }, notes: { type: "string" } },
          required: ["productId", "quantity"],
        }),
      ],
    });
  }
  if (body.method === "tools/call") {
    const name = String(body.params?.name ?? "");
    const args = (body.params?.arguments ?? {}) as Record<string, unknown>;
    const allowed = authorizeTool(actor.scopes, name);
    if (!allowed.ok) return rpc(id, null, { code: -32003, message: allowed.message });
    try {
      const result = await callTool(actor, name, args);
      return rpc(id, { content: [{ type: "text", text: JSON.stringify(result) }] });
    } catch (error) {
      return rpc(id, null, { code: -32000, message: error instanceof Error ? error.message : "Tool failed." });
    }
  }
  return rpc(id, null, { code: -32601, message: "Method not found." });
}

async function callTool(actor: Actor, name: string, args: Record<string, unknown>) {
  if (name === "list_tasks") {
    const tasks = await prisma.task.findMany({
      where: actor.role === "VA" ? { ownerId: actor.id } : {},
      include: { market: true },
      orderBy: { dueOn: "asc" },
      take: 100,
    });
    return tasks.filter((task) => canSeeOwned(actor, task.ownerId)).map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      ownerId: task.ownerId,
      market: task.market?.slug ?? null,
    }));
  }
  if (name === "create_task") {
    const title = String(args.title ?? "").trim();
    if (!title) throw new Error("title is required.");
    const dueOn = typeof args.dueOn === "string" && parseIsoDate(args.dueOn) ? isoToUtcDate(args.dueOn) : null;
    const task = await prisma.task.create({
      data: { title, details: stringOrNull(args.details), dueOn, ownerId: actor.id, status: "TODO" },
    });
    return { id: task.id };
  }
  if (name === "read_lead_metrics") {
    const from = typeof args.from === "string" && parseIsoDate(args.from) ? args.from : todayIso();
    const to = typeof args.to === "string" && parseIsoDate(args.to) ? args.to : from;
    const rows = await prisma.leadRecord.findMany({
      where: { occurredOn: { gte: isoToUtcDate(from), lte: isoToUtcDate(to) } },
      include: { source: true },
    });
    return summarizeLeads(rows.map((row) => ({
      key: row.source.slug,
      leads: row.leads,
      spendCents: row.spendCents,
      appointments: row.appointments,
      conversions: row.conversions,
    }))).map((row) => ({ ...row, ...leadRates(row) }));
  }
  if (name === "read_kpi_metrics") {
    const year = Number(args.year);
    const month = Number(args.month);
    const rows = await prisma.marketMonthKpi.findMany({ where: { year, month }, include: { market: true } });
    return rows.map((row) => ({
      market: row.market.slug,
      leads: row.leads,
      adSpendCents: row.adSpendCents,
      appointments: row.appointments,
      closings: row.closings,
      isDemo: row.isDemo,
    }));
  }
  if (name === "list_content") {
    const items = await prisma.contentItem.findMany({
      where: actor.role === "VA" ? { ownerId: actor.id } : {},
      orderBy: { scheduledFor: "asc" },
      take: 100,
    });
    return items.filter((item) => canSeeOwned(actor, item.ownerId)).map((item) => ({
      id: item.id,
      topic: item.topic,
      status: item.status,
      ownerId: item.ownerId,
    }));
  }
  if (name === "create_content") {
    const topic = String(args.topic ?? "").trim();
    if (!topic) throw new Error("topic is required.");
    const item = await prisma.contentItem.create({
      data: {
        topic,
        channel: "OTHER",
        contentType: "OTHER",
        ownerId: actor.id,
        status: "IDEA",
        notes: stringOrNull(args.notes),
      },
    });
    return { id: item.id };
  }
  if (name === "create_product_order") {
    const product = await prisma.catalogProduct.findUnique({ where: { id: String(args.productId ?? "") } });
    if (!product || !product.active) throw new Error("That product is not available.");
    const quantity = Number(args.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) throw new Error("quantity must be at least 1.");
    const order = await prisma.productOrder.create({
      data: {
        productId: product.id,
        quantity,
        requesterId: actor.id,
        notes: stringOrNull(args.notes),
        status: "REQUESTED",
      },
    });
    return { id: order.id, status: order.status };
  }
  throw new Error("Unknown tool.");
}

async function actorFromRequest(request: Request): Promise<Actor | null> {
  const raw = parseBearer(request.headers.get("authorization"));
  if (!raw) return null;
  const token = await prisma.apiToken.findUnique({ where: { tokenHash: hashToken(raw) }, include: { user: true } });
  if (!token || token.revokedAt) return null;
  if (token.user && !token.user.active) return null;
  await prisma.apiToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } });
  if (token.user) return { id: token.user.id, role: token.user.role, scopes: parseScopes(token.scopes) };
  return { id: token.createdById, role: "ADMIN", scopes: parseScopes(token.scopes) };
}

function rpc(id: string | number | null, result: unknown, error?: { code: number; message: string }) {
  if (error) return Response.json({ jsonrpc: "2.0", id, error });
  return Response.json({ jsonrpc: "2.0", id, result });
}

function tool(name: string, description: string, inputSchema: object) {
  return { name, description, inputSchema };
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
