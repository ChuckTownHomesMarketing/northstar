import { describe, expect, it } from "vitest";
import { authorizeTool, generateApiToken, hashToken, parseBearer, tokenHasScope } from "./tokens";

describe("webhook and MCP auth", () => {
  it("reads a bearer token and ignores other schemes", () => {
    expect(parseBearer("Bearer ns_abc")).toBe("ns_abc");
    expect(parseBearer("bearer ns_abc")).toBe("ns_abc");
    expect(parseBearer("Basic ns_abc")).toBeNull();
    expect(parseBearer(null)).toBeNull();
  });

  it("stores a hash instead of the raw token", () => {
    const issued = generateApiToken();
    expect(issued.token.startsWith("ns_")).toBe(true);
    expect(issued.hash).toBe(hashToken(issued.token));
    expect(issued.hash).not.toContain(issued.token);
    expect(issued.prefix).toBe(issued.token.slice(0, 11));
  });

  it("requires the tool scope and the mcp scope", () => {
    expect(tokenHasScope(["leads:write"], "leads:write")).toBe(true);
    expect(authorizeTool(["mcp", "tasks:read"], "list_tasks").ok).toBe(true);
    expect(authorizeTool(["tasks:read"], "list_tasks").ok).toBe(false);
    expect(authorizeTool(["mcp"], "create_product_order").ok).toBe(false);
    expect(authorizeTool(["mcp", "leads:write"], "read_lead_metrics").ok).toBe(false);
  });
});
