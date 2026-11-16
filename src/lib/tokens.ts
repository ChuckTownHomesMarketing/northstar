import { createHash, randomBytes } from "crypto";

export const TOKEN_SCOPES = [
  "mcp",
  "leads:read",
  "leads:write",
  "tasks:read",
  "tasks:write",
  "kpis:read",
  "content:read",
  "content:write",
  "orders:write",
] as const;

export type TokenScope = (typeof TOKEN_SCOPES)[number];

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateApiToken(): { token: string; hash: string; prefix: string } {
  const token = `ns_${randomBytes(24).toString("base64url")}`;
  return { token, hash: hashToken(token), prefix: token.slice(0, 11) };
}

export function parseBearer(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}

export function parseScopes(value: string): string[] {
  return value
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

export function tokenHasScope(scopes: string[], needed: string): boolean {
  return scopes.includes(needed);
}

export function assertScopes(scopes: string[], needed: string[]): { ok: true } | { ok: false; missing: string } {
  const missing = needed.find((scope) => !tokenHasScope(scopes, scope));
  if (missing) return { ok: false, missing };
  return { ok: true };
}

const TOOL_SCOPES: Record<string, string[]> = {
  list_tasks: ["mcp", "tasks:read"],
  create_task: ["mcp", "tasks:write"],
  read_lead_metrics: ["mcp", "leads:read"],
  read_kpi_metrics: ["mcp", "kpis:read"],
  list_content: ["mcp", "content:read"],
  create_content: ["mcp", "content:write"],
  create_product_order: ["mcp", "orders:write"],
};

export function scopesForTool(tool: string): string[] | null {
  return TOOL_SCOPES[tool] ?? null;
}

export function authorizeTool(scopes: string[], tool: string): { ok: true } | { ok: false; message: string } {
  const needed = scopesForTool(tool);
  if (!needed) return { ok: false, message: `Unknown tool ${tool}.` };
  const check = assertScopes(scopes, needed);
  if (!check.ok) return { ok: false, message: `This token is missing the ${check.missing} scope.` };
  return { ok: true };
}
