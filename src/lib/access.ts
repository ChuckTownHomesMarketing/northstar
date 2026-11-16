const DEFAULT_DOMAIN = "chucktownhomes.com";

export function allowedDomain(): string {
  return (process.env.ALLOWED_EMAIL_DOMAIN || DEFAULT_DOMAIN).trim().toLowerCase();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isCompanyEmail(email: string, domain = DEFAULT_DOMAIN): boolean {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at <= 0 || at !== normalized.indexOf("@")) return false;
  const local = normalized.slice(0, at);
  const host = normalized.slice(at + 1);
  if (!local || local.includes(" ") || host.includes(" ")) return false;
  return host === domain.trim().toLowerCase();
}

export type SignInDecision =
  | { ok: true }
  | { ok: false; reason: "domain" | "allowlist" | "inactive" };

export function canSignIn(
  email: string,
  entry: { active: boolean } | null,
  domain = DEFAULT_DOMAIN,
): SignInDecision {
  if (!isCompanyEmail(email, domain)) return { ok: false, reason: "domain" };
  if (!entry) return { ok: false, reason: "allowlist" };
  if (!entry.active) return { ok: false, reason: "inactive" };
  return { ok: true };
}

/** Local convenience only. Production, including Heroku, never enables this. */
export function devLoginEnabled(
  env: { NODE_ENV?: string; ENABLE_DEV_LOGIN?: string } = process.env,
): boolean {
  return env.NODE_ENV !== "production" && env.ENABLE_DEV_LOGIN === "true";
}

export function googleAuthConfigured(env?: { AUTH_GOOGLE_ID?: string; AUTH_GOOGLE_SECRET?: string }): boolean {
  const source = env ?? {
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
  };
  return Boolean(source.AUTH_GOOGLE_ID && source.AUTH_GOOGLE_SECRET);
}

export function isAdmin(role: "ADMIN" | "VA"): boolean {
  return role === "ADMIN";
}
