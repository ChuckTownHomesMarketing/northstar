export type CsvIssue = { line: number; message: string };

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const source = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (inQuotes) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += character;
      }
      continue;
    }
    if (character === '"') {
      inQuotes = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (character !== "\r") {
      cell += character;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((value) => value.trim() !== ""));
}

export function toCsv(headers: string[], rows: string[][]): string {
  const escape = (value: string) => (/[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  return [headers, ...rows].map((record) => record.map(escape).join(",")).join("\r\n") + "\r\n";
}

export type MarketRef = { slug: string; name: string; state: string };

export function matchMarket(value: string, markets: MarketRef[]): MarketRef | null {
  const needle = value.trim().toLowerCase();
  if (!needle) return null;
  return (
    markets.find((market) => market.slug === needle) ??
    markets.find((market) => `${market.name}, ${market.state}`.toLowerCase() === needle) ??
    markets.find((market) => market.name.toLowerCase() === needle) ??
    null
  );
}

function headerIndex(headers: string[], names: string[]): number {
  const normalized = headers.map((header) => header.trim().toLowerCase());
  return normalized.findIndex((header) => names.includes(header));
}

function cell(row: string[], index: number): string {
  if (index < 0) return "";
  return (row[index] ?? "").trim();
}

export type ParsedKpiRow = {
  line: number;
  marketSlug: string;
  year: number;
  month: number;
  leads: number | null;
  adSpendCents: number | null;
  costPerLeadCents: number | null;
  appointments: number | null;
  closings: number | null;
  websiteSessions: number | null;
  socialFollowers: number | null;
  socialEngagement: number | null;
  newGoogleReviews: number | null;
  avgRating: number | null;
  notes: string | null;
};

const KPI_HEADERS = [
  "market",
  "year",
  "month",
  "leads",
  "ad_spend",
  "cost_per_lead",
  "appointments",
  "closings",
  "website_sessions",
  "social_followers",
  "social_engagement",
  "new_google_reviews",
  "avg_rating",
  "notes",
];

export function kpiCsvTemplate(): string {
  return toCsv(KPI_HEADERS, [
    ["charleston", "2026", "11", "", "", "", "", "", "", "", "", "", "", ""],
  ]);
}

export type ParsedSpendRow = {
  line: number;
  marketSlug: string;
  weekStart: string;
  snappedToMonday: boolean;
  source: "META" | "GOOGLE_ADS" | "ZILLOW" | "REALTOR" | "REFERRAL" | "ORGANIC" | "OTHER";
  sourceDetail: string;
  spendCents: number;
  leads: number;
  appointments: number;
  notes: string | null;
};

const SPEND_HEADERS = ["market", "week_start", "source", "source_detail", "spend", "leads", "appointments", "notes"];

export function spendCsvTemplate(): string {
  return toCsv(SPEND_HEADERS, [["charleston", "2026-11-16", "Meta", "", "", "0", "0", ""]]);
}

const SOURCE_ALIASES: Record<string, ParsedSpendRow["source"]> = {
  meta: "META",
  facebook: "META",
  instagram: "META",
  "meta ads": "META",
  google: "GOOGLE_ADS",
  "google ads": "GOOGLE_ADS",
  google_ads: "GOOGLE_ADS",
  zillow: "ZILLOW",
  realtor: "REALTOR",
  "realtor.com": "REALTOR",
  realtor_com: "REALTOR",
  referral: "REFERRAL",
  referrals: "REFERRAL",
  organic: "ORGANIC",
  other: "OTHER",
};

function optionalCount(value: string, label: string): { ok: true; value: number | null } | { ok: false; message: string } {
  if (value === "") return { ok: true, value: null };
  if (!/^\d+$/.test(value)) return { ok: false, message: `${label} needs a whole number or a blank cell.` };
  return { ok: true, value: Number(value) };
}

function requiredCount(value: string, label: string): { ok: true; value: number } | { ok: false; message: string } {
  const parsed = optionalCount(value === "" ? "0" : value, label);
  if (!parsed.ok || parsed.value == null) return { ok: false, message: parsed.ok ? `${label} is required.` : parsed.message };
  return { ok: true, value: parsed.value };
}

function optionalMoney(value: string, label: string): { ok: true; value: number | null } | { ok: false; message: string } {
  if (value === "") return { ok: true, value: null };
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return { ok: false, message: `${label} needs dollars, like 1250.50.` };
  const [dollars, cents = ""] = cleaned.split(".");
  return { ok: true, value: Number(dollars) * 100 + Number(cents.padEnd(2, "0").slice(0, 2)) };
}

function optionalRating(value: string): { ok: true; value: number | null } | { ok: false; message: string } {
  if (value === "") return { ok: true, value: null };
  if (!/^\d(\.\d{1,2})?$/.test(value) || Number(value) > 5) {
    return { ok: false, message: "Average rating needs a number from 0 to 5." };
  }
  return { ok: true, value: Number(value) };
}

export function parseKpiCsv(text: string, markets: MarketRef[]): { rows: ParsedKpiRow[]; issues: CsvIssue[] } {
  const table = parseCsv(text);
  const issues: CsvIssue[] = [];
  if (table.length === 0) return { rows: [], issues: [{ line: 1, message: "The file is empty." }] };
  const headers = table[0];
  const columns = {
    market: headerIndex(headers, ["market"]),
    year: headerIndex(headers, ["year"]),
    month: headerIndex(headers, ["month"]),
    leads: headerIndex(headers, ["leads"]),
    adSpend: headerIndex(headers, ["ad_spend", "ad spend", "spend"]),
    cpl: headerIndex(headers, ["cost_per_lead", "cost per lead", "cpl"]),
    appointments: headerIndex(headers, ["appointments"]),
    closings: headerIndex(headers, ["closings"]),
    sessions: headerIndex(headers, ["website_sessions", "website sessions", "sessions"]),
    followers: headerIndex(headers, ["social_followers", "social followers", "followers"]),
    engagement: headerIndex(headers, ["social_engagement", "social engagement", "engagement"]),
    reviews: headerIndex(headers, ["new_google_reviews", "new google reviews", "reviews"]),
    rating: headerIndex(headers, ["avg_rating", "average rating", "rating"]),
    notes: headerIndex(headers, ["notes"]),
  };
  if (columns.market < 0 || columns.year < 0 || columns.month < 0) {
    return { rows: [], issues: [{ line: 1, message: "The header row needs market, year, and month." }] };
  }

  const rows: ParsedKpiRow[] = [];
  table.slice(1).forEach((record, offset) => {
    const line = offset + 2;
    const market = matchMarket(cell(record, columns.market), markets);
    if (!market) {
      issues.push({ line, message: `No market named "${cell(record, columns.market)}".` });
      return;
    }
    const year = Number(cell(record, columns.year));
    const month = Number(cell(record, columns.month));
    if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
      issues.push({ line, message: "Year and month need to look like 2026 and 11." });
      return;
    }
    const leads = optionalCount(cell(record, columns.leads), "Leads");
    const adSpend = optionalMoney(cell(record, columns.adSpend), "Ad spend");
    const cpl = optionalMoney(cell(record, columns.cpl), "Cost per lead");
    const appointments = optionalCount(cell(record, columns.appointments), "Appointments");
    const closings = optionalCount(cell(record, columns.closings), "Closings");
    const sessions = optionalCount(cell(record, columns.sessions), "Website sessions");
    const followers = optionalCount(cell(record, columns.followers), "Social followers");
    const engagement = optionalCount(cell(record, columns.engagement), "Social engagement");
    const reviews = optionalCount(cell(record, columns.reviews), "New Google reviews");
    const rating = optionalRating(cell(record, columns.rating));
    const failure = [leads, adSpend, cpl, appointments, closings, sessions, followers, engagement, reviews, rating].find(
      (result) => !result.ok,
    );
    if (failure && !failure.ok) {
      issues.push({ line, message: failure.message });
      return;
    }
    if (
      leads.ok &&
      adSpend.ok &&
      cpl.ok &&
      appointments.ok &&
      closings.ok &&
      sessions.ok &&
      followers.ok &&
      engagement.ok &&
      reviews.ok &&
      rating.ok
    ) {
      rows.push({
        line,
        marketSlug: market.slug,
        year,
        month,
        leads: leads.value,
        adSpendCents: adSpend.value,
        costPerLeadCents: cpl.value,
        appointments: appointments.value,
        closings: closings.value,
        websiteSessions: sessions.value,
        socialFollowers: followers.value,
        socialEngagement: engagement.value,
        newGoogleReviews: reviews.value,
        avgRating: rating.value,
        notes: cell(record, columns.notes) || null,
      });
    }
  });
  return { rows, issues };
}

export function parseSpendCsv(
  text: string,
  markets: MarketRef[],
  mondayOf: (iso: string) => string,
): { rows: ParsedSpendRow[]; issues: CsvIssue[] } {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], issues: [{ line: 1, message: "The file is empty." }] };
  const headers = table[0];
  const columns = {
    market: headerIndex(headers, ["market"]),
    week: headerIndex(headers, ["week_start", "week start", "week"]),
    source: headerIndex(headers, ["source"]),
    detail: headerIndex(headers, ["source_detail", "source detail", "detail"]),
    spend: headerIndex(headers, ["spend", "ad_spend"]),
    leads: headerIndex(headers, ["leads"]),
    appointments: headerIndex(headers, ["appointments"]),
    notes: headerIndex(headers, ["notes"]),
  };
  if (columns.market < 0 || columns.week < 0 || columns.source < 0) {
    return { rows: [], issues: [{ line: 1, message: "The header row needs market, week_start, and source." }] };
  }
  const issues: CsvIssue[] = [];
  const rows: ParsedSpendRow[] = [];
  table.slice(1).forEach((record, offset) => {
    const line = offset + 2;
    const market = matchMarket(cell(record, columns.market), markets);
    if (!market) {
      issues.push({ line, message: `No market named "${cell(record, columns.market)}".` });
      return;
    }
    const rawWeek = cell(record, columns.week);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawWeek)) {
      issues.push({ line, message: "Week start needs a date like 2026-11-16." });
      return;
    }
    let weekStart: string;
    try {
      weekStart = mondayOf(rawWeek);
    } catch {
      issues.push({ line, message: "Week start is not a real date." });
      return;
    }
    const source = SOURCE_ALIASES[cell(record, columns.source).toLowerCase()];
    if (!source) {
      issues.push({ line, message: `Source "${cell(record, columns.source)}" is not one we track.` });
      return;
    }
    const detail = cell(record, columns.detail);
    if (source === "OTHER" && !detail) {
      issues.push({ line, message: "Other needs a source detail, like Homes.com." });
      return;
    }
    const spend = optionalMoney(cell(record, columns.spend), "Spend");
    const leads = requiredCount(cell(record, columns.leads), "Leads");
    const appointments = requiredCount(cell(record, columns.appointments), "Appointments");
    const failure = [spend, leads, appointments].find((result) => !result.ok);
    if (failure && !failure.ok) {
      issues.push({ line, message: failure.message });
      return;
    }
    if (spend.ok && leads.ok && appointments.ok && spend.value != null) {
      rows.push({
        line,
        marketSlug: market.slug,
        weekStart,
        snappedToMonday: weekStart !== rawWeek,
        source,
        sourceDetail: source === "OTHER" ? detail : detail,
        spendCents: spend.value,
        leads: leads.value,
        appointments: appointments.value,
        notes: cell(record, columns.notes) || null,
      });
    } else if (spend.ok && spend.value == null) {
      issues.push({ line, message: "Spend is required. Use 0 if you did not spend." });
    }
  });
  return { rows, issues };
}
