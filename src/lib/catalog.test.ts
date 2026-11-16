import { describe, expect, it } from "vitest";
import { AI_TEAMMATES, MARKETS } from "./catalog";
import { safeHref } from "./links";
import { acceptConnectHandoff } from "./connect";

describe("seed catalog", () => {
  it("includes the seven published offices and Chattanooga", () => {
    expect(MARKETS.map((market) => market.slug)).toEqual([
      "charleston",
      "columbia",
      "greenville",
      "charlotte",
      "savannah",
      "jacksonville",
      "atlanta",
      "chattanooga",
    ]);
    expect(MARKETS.find((market) => market.slug === "savannah")?.state).toBe("GA");
    expect(MARKETS.find((market) => market.slug === "chattanooga")?.openingNote).toMatch(/November 16, 2026/);
    expect(MARKETS.find((market) => market.slug === "chattanooga")?.address).toBeNull();
  });

  it("lists Byte with the five specialist teammates", () => {
    expect(AI_TEAMMATES.map((teammate) => teammate.name)).toEqual([
      "Social Media Manager",
      "Content & SEO Writer",
      "Ads & Analytics",
      "Market Researcher",
      "Reviews & Reputation",
      "Byte",
    ]);
  });

  it("allows normal links and refuses scriptable ones", () => {
    expect(safeHref("https://chucktownhomes.com")).toBe("https://chucktownhomes.com/");
    expect(safeHref("mailto:marketing@chucktownhomes.com")).toBe("mailto:marketing@chucktownhomes.com");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(acceptConnectHandoff("anything")).toBeNull();
  });
});
