export const APP_TIME_ZONE = "America/New_York";

export type YMD = { year: number; month: number; day: number };

const WEEKDAY: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

export function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function toIsoDate(parts: YMD): string {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function parseIsoDate(iso: string): YMD | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day };
}

export function isoToUtcDate(iso: string): Date {
  const parts = parseIsoDate(iso);
  if (!parts) throw new Error("Enter a real date.");
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

export function dateToIso(value: Date): string {
  return toIsoDate({
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
  });
}

export function zonedParts(date: Date, timeZone = APP_TIME_ZONE): YMD & { weekday: number; hour: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: WEEKDAY[get("weekday")] ?? 1,
    hour: Number(get("hour")),
  };
}

export function todayIso(now = new Date(), timeZone = APP_TIME_ZONE): string {
  return toIsoDate(zonedParts(now, timeZone));
}

export function addDays(iso: string, days: number): string {
  const parts = parseIsoDate(iso);
  if (!parts) throw new Error("Enter a real date.");
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return toIsoDate({
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  });
}

export function mondayOf(iso: string): string {
  const parts = parseIsoDate(iso);
  if (!parts) throw new Error("Enter a real date.");
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const jsDay = utc.getUTCDay();
  const isoWeekday = jsDay === 0 ? 7 : jsDay;
  return addDays(iso, -(isoWeekday - 1));
}

export function currentWeekStart(now = new Date(), timeZone = APP_TIME_ZONE): string {
  return mondayOf(todayIso(now, timeZone));
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthGrid(year: number, month: number): { iso: string; inMonth: boolean }[] {
  const first = `${year}-${pad(month)}-01`;
  const start = mondayOf(first);
  const lastIso = `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`;
  const end = addDays(mondayOf(lastIso), 6);
  const cells: { iso: string; inMonth: boolean }[] = [];
  let cursor = start;
  while (cursor <= end) {
    const parts = parseIsoDate(cursor);
    cells.push({
      iso: cursor,
      inMonth: Boolean(parts && parts.month === month && parts.year === year),
    });
    cursor = addDays(cursor, 1);
  }
  return cells;
}

export function formatLongDate(iso: string): string {
  const parts = parseIsoDate(iso);
  if (!parts) return iso;
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(utc);
}

export function formatShortDate(iso: string): string {
  const parts = parseIsoDate(iso);
  if (!parts) return iso;
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(utc);
}

export function formatMonth(year: number, month: number): string {
  const utc = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(utc);
}

export function weekRangeLabel(weekStart: string): string {
  return `${formatLongDate(weekStart)} – ${formatLongDate(addDays(weekStart, 6))}`;
}

export function parseMonthKey(value: string | undefined, fallback: Date = new Date()): { year: number; month: number } {
  const match = value ? /^(\d{4})-(\d{2})$/.exec(value) : null;
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) return { year, month };
  }
  const today = zonedParts(fallback);
  return { year: today.year, month: today.month };
}

export function monthInputValue(year: number, month: number): string {
  return `${year}-${pad(month)}`;
}

export type RecurrenceName = "DAILY" | "WEEKLY" | "MONTHLY";

export function periodKeyFor(recurrence: RecurrenceName, today: string): string {
  if (recurrence === "DAILY") return `day:${today}`;
  if (recurrence === "WEEKLY") return `week:${mondayOf(today)}`;
  const parts = parseIsoDate(today);
  if (!parts) throw new Error("Enter a real date.");
  return `month:${parts.year}-${pad(parts.month)}`;
}

export function dueOnForTemplate(input: {
  recurrence: RecurrenceName;
  weekday: number | null;
  dayOfMonth: number | null;
  today: string;
}): string {
  if (input.recurrence === "DAILY") return input.today;
  if (input.recurrence === "WEEKLY") {
    const weekday = input.weekday && input.weekday >= 1 && input.weekday <= 7 ? input.weekday : 1;
    return addDays(mondayOf(input.today), weekday - 1);
  }
  const parts = parseIsoDate(input.today);
  if (!parts) throw new Error("Enter a real date.");
  const day = Math.min(Math.max(input.dayOfMonth ?? 1, 1), 28);
  return `${parts.year}-${pad(parts.month)}-${pad(day)}`;
}

export function greeting(now = new Date(), timeZone = APP_TIME_ZONE): string {
  const hour = zonedParts(now, timeZone).hour;
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function firstName(name: string): string {
  const piece = name.trim().split(/\s+/)[0];
  return piece || name;
}
