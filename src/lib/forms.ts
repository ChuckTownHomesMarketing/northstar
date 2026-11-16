export function read(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export function oneOf<T extends string>(value: string, allowed: readonly T[]): T | null {
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

export function clip(value: string, max: number, label: string): string {
  if (value.length > max) throw new Error(`${label} needs to be under ${max} characters.`);
  return value;
}

export function optionalDate(value: string): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Enter a real date.");
  const [year, month, day] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) {
    throw new Error("Enter a real date.");
  }
  return utc;
}
