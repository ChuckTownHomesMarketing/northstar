export function dollarsToCents(input: string): number | null {
  const cleaned = input.trim().replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error("Enter dollars and cents, like 1250.50.");
  }
  const [dollars, cents = ""] = cleaned.split(".");
  return Number(dollars) * 100 + Number(cents.padEnd(2, "0").slice(0, 2));
}

export function centsToDollarInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  const negative = cents < 0;
  const absolute = Math.abs(cents);
  const dollars = Math.floor(absolute / 100);
  const remainder = absolute % 100;
  const text = `${dollars}.${String(remainder).padStart(2, "0")}`;
  return negative ? `-${text}` : text;
}

export function formatMoneyFromCents(cents: number | null | undefined): string {
  if (cents == null || Number.isNaN(cents)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatCount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function formatRating(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(2);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function parseOptionalInt(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) throw new Error("Use a whole number, or leave the box empty.");
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value)) throw new Error("That number is too large.");
  return value;
}

export function parseRating(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  if (!/^\d(\.\d{1,2})?$/.test(trimmed)) throw new Error("Enter a rating from 0 to 5, like 4.8.");
  const value = Number(trimmed);
  if (value < 0 || value > 5) throw new Error("Enter a rating from 0 to 5.");
  return value;
}
