export type MarketSeed = {
  slug: string;
  name: string;
  city: string;
  state: string;
  address: string | null;
  phone: string | null;
  openingNote: string | null;
  sortOrder: number;
};

/** Offices published on chucktownhomes.com, plus Chattanooga. */
export const MARKETS: MarketSeed[] = [
  {
    slug: "charleston",
    name: "Charleston",
    city: "Charleston",
    state: "SC",
    address: "1104 Savannah Hwy, Suite 200, Charleston, SC 29407",
    phone: "888.210.3348",
    openingNote: null,
    sortOrder: 1,
  },
  {
    slug: "columbia",
    name: "Columbia",
    city: "Columbia",
    state: "SC",
    address: "190 Knox Abbott Drive, Cayce, SC 29033",
    phone: "803.602.6129",
    openingNote: null,
    sortOrder: 2,
  },
  {
    slug: "greenville",
    name: "Greenville",
    city: "Greenville",
    state: "SC",
    address: "777 Lowndes Hill Rd, Greenville, SC 29607",
    phone: "864.400.2181",
    openingNote: null,
    sortOrder: 3,
  },
  {
    slug: "charlotte",
    name: "Charlotte",
    city: "Charlotte",
    state: "NC",
    address: "3701 Arco Corporate Dr, Suite 350, Charlotte, NC 28273",
    phone: "980.360.2707",
    openingNote: null,
    sortOrder: 4,
  },
  {
    slug: "savannah",
    name: "Savannah",
    city: "Savannah",
    state: "GA",
    address: "406 E US Highway 80, Bloomingdale, GA 31302",
    phone: "912.800.0190",
    openingNote: null,
    sortOrder: 5,
  },
  {
    slug: "jacksonville",
    name: "Jacksonville",
    city: "Jacksonville",
    state: "FL",
    address: "9995 Gate Parkway, Suite 110, Jacksonville, FL 32246",
    phone: "(904) 664-9664",
    openingNote: null,
    sortOrder: 6,
  },
  {
    slug: "atlanta",
    name: "Atlanta",
    city: "Atlanta",
    state: "GA",
    address: "4550 Northpoint Parkway, Suite 130, Alpharetta, GA 30022",
    phone: "(470) 664-1267",
    openingNote: null,
    sortOrder: 7,
  },
  {
    slug: "chattanooga",
    name: "Chattanooga",
    city: "Chattanooga",
    state: "TN",
    address: null,
    phone: null,
    openingNote: "Opens the week of November 16, 2026. A street address is not published yet.",
    sortOrder: 8,
  },
];

export type AiTeammateSeed = {
  slug: string;
  name: string;
  title: string;
  askFor: string;
  sortOrder: number;
};

export const AI_TEAMMATES: AiTeammateSeed[] = [
  {
    slug: "social-media-manager",
    name: "Social Media Manager",
    title: "Posts, captions, and the weekly social plan",
    askFor:
      "A week of posts for one market, caption drafts in the ChuckTown voice, hashtag sets, and whether a piece should be a Reel, a Story, or a still.",
    sortOrder: 1,
  },
  {
    slug: "content-seo-writer",
    name: "Content & SEO Writer",
    title: "Guides, listings, and search copy",
    askFor:
      "Neighborhood guides, listing description drafts, blog outlines, title tags, and on-page SEO for chucktownhomes.com.",
    sortOrder: 2,
  },
  {
    slug: "ads-analytics",
    name: "Ads & Analytics",
    title: "Reads the numbers with you",
    askFor:
      "A plain-language read of cost per lead and cost per appointment, which sources look expensive, and a sentence you can paste into the weekly report. This teammate does not log into ad accounts in v1.",
    sortOrder: 3,
  },
  {
    slug: "market-researcher",
    name: "Market Researcher",
    title: "Local angles for all eight markets",
    askFor:
      "Neighborhood angles, seasonal hooks, and what a new office should say first for Charleston, Columbia, Greenville, Charlotte, Savannah, Jacksonville, Atlanta, and Chattanooga.",
    sortOrder: 4,
  },
  {
    slug: "reviews-reputation",
    name: "Reviews & Reputation",
    title: "Review requests and replies",
    askFor:
      "Review request text, reply drafts for Google reviews, and a short note when a market's rating moves.",
    sortOrder: 5,
  },
  {
    slug: "byte",
    name: "Byte",
    title: "Coordinator",
    askFor:
      "Turn this week's report into a task list, decide which teammate should take a request, and keep the VA board lined up with next week's priorities.",
    sortOrder: 6,
  },
];

export type QuickLinkSeed = {
  label: string;
  href: string;
  description: string;
  sortOrder: number;
};

export const QUICK_LINKS: QuickLinkSeed[] = [
  {
    label: "ChuckTown Homes",
    href: "https://chucktownhomes.com",
    description: "The public site",
    sortOrder: 1,
  },
  {
    label: "ChuckTown Connect",
    href: "https://connect.chucktownhomes.com",
    description: "Agent hub. Northstar can be linked from here later.",
    sortOrder: 2,
  },
  {
    label: "Marketing inbox",
    href: "mailto:marketing@chucktownhomes.com",
    description: "marketing@chucktownhomes.com",
    sortOrder: 3,
  },
  {
    label: "Google Business",
    href: "https://business.google.com",
    description: "Profiles and reviews",
    sortOrder: 4,
  },
  {
    label: "Meta Business Suite",
    href: "https://business.facebook.com",
    description: "Organic social and ads",
    sortOrder: 5,
  },
];

export const SAMPLE_NOTE = "SAMPLE — not real performance. Wipe from Settings → Sample data.";
