import { signIn } from "@/auth";
import { StarMark } from "@/components/ui";
import { devLoginEnabled, googleAuthConfigured } from "@/lib/access";
import { prisma } from "@/lib/prisma";

const ERRORS: Record<string, string> = {
  domain: "Use your @chucktownhomes.com Google account.",
  allowlist: "Avery needs to add that email in Settings → People before you can sign in.",
  inactive: "That account is turned off. Ask Avery if you still need access.",
  unverified: "That Google account does not have a verified email.",
  AccessDenied: "That Google account can't open Northstar.",
  Configuration: "Google sign-in is not configured yet.",
  OAuthSignin: "Google sign-in did not start. Check the OAuth client settings.",
  OAuthCallback: "Google sent us back without a usable sign-in. Try again.",
  Default: "Sign-in didn't work. Try again, or ask Avery to confirm your email is on the list.",
};

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const error = params.error ? ERRORS[params.error] || ERRORS.Default : null;
  const google = googleAuthConfigured();
  const dev = devLoginEnabled();
  const people = dev ? await prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }) : [];

  return (
    <div className="login-wrap">
      <main className="card login">
        <div className="brand">
          <span className="brand-mark">
            <StarMark size={22} />
          </span>
          <span>
            <strong>Northstar</strong>
            <p>ChuckTown Homes</p>
          </span>
        </div>
        <h1>Sign in</h1>
        <p className="lede">Marketing operations for the ChuckTown Homes team. Google accounts on the allowlist only.</p>
        {error ? (
          <p className="form-error" role="alert" style={{ marginTop: 16 }}>
            {error}
          </p>
        ) : null}
        {google ? (
          <form
            style={{ marginTop: 18 }}
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button className="btn google-btn" type="submit">
              Sign in with Google
            </button>
          </form>
        ) : (
          <p className="callout" style={{ marginTop: 18 }}>
            Google sign-in needs AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET. The setup steps are in the README.
          </p>
        )}
        <p className="muted" style={{ marginTop: 14, fontSize: 13 }}>
          Only @chucktownhomes.com addresses that an admin has added can get in.
        </p>
        {dev ? (
          <section style={{ marginTop: 22 }}>
            <h2 style={{ fontSize: 16 }}>Local sign-in</h2>
            <p className="muted">This switch is off in production, including Heroku. It only works in local development.</p>
            {people.length === 0 ? (
              <p>No one is on the allowlist yet. Set BOOTSTRAP_ADMIN_EMAIL and run the seed.</p>
            ) : (
              people.map((person) => (
                <form
                  key={person.id}
                  action={async () => {
                    "use server";
                    await signIn("dev", { email: person.email, redirectTo: "/" });
                  }}
                  style={{ marginTop: 8 }}
                >
                  <button className="btn secondary" type="submit">
                    Continue as {person.name}
                    {person.isDemo ? " (sample)" : ""}
                  </button>
                </form>
              ))
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
