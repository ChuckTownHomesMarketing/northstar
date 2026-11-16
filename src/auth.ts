import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { allowedDomain, canSignIn, devLoginEnabled, googleAuthConfigured, normalizeEmail } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const providers = [];
  if (googleAuthConfigured()) {
    providers.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
        authorization: {
          params: {
            prompt: "select_account",
            hd: allowedDomain(),
          },
        },
      }),
    );
  }
  if (devLoginEnabled()) {
    providers.push(
      Credentials({
        id: "dev",
        name: "Development",
        credentials: { email: { label: "Email", type: "email" } },
        authorize: async (credentials) => {
          if (!devLoginEnabled()) return null;
          const email = normalizeEmail(String(credentials?.email ?? ""));
          const existing = email ? await prisma.user.findUnique({ where: { email } }) : null;
          if (!existing || !canSignIn(email, existing, allowedDomain()).ok) return null;
          return {
            id: existing.id,
            email: existing.email,
            name: existing.name,
            image: existing.image,
            role: existing.role,
          };
        },
      }),
    );
  }

  return {
    trustHost: true,
    session: { strategy: "jwt" },
    pages: { signIn: "/login", error: "/login" },
    providers,
    callbacks: {
      async signIn({ user, account, profile }) {
        const email = normalizeEmail(user.email || "");
        if (!email) return "/login?error=domain";
        if (account?.provider === "google") {
          const verified = (profile as { email_verified?: boolean } | undefined)?.email_verified;
          if (verified === false) return "/login?error=unverified";
        }
        const existing = await prisma.user.findUnique({ where: { email } });
        const decision = canSignIn(email, existing, allowedDomain());
        if (!decision.ok || !existing) return `/login?error=${decision.ok ? "allowlist" : decision.reason}`;
        if (account?.provider === "google") {
          await prisma.user.update({
            where: { email },
            data: {
              name: user.name || existing.name,
              image: user.image ?? existing.image,
              googleSub: account.providerAccountId,
              lastLoginAt: new Date(),
            },
          });
        } else {
          await prisma.user.update({
            where: { email },
            data: { lastLoginAt: new Date() },
          });
        }
        return true;
      },
      async jwt({ token, user }) {
        if (user?.email) {
          const dbUser = await prisma.user.findUnique({ where: { email: normalizeEmail(user.email) } });
          if (dbUser && dbUser.active) {
            token.sub = dbUser.id;
            token.email = dbUser.email;
            token.name = dbUser.name;
            token.picture = dbUser.image;
            token.role = dbUser.role;
          }
        }
        return token;
      },
      async session({ session, token }) {
        session.user.id = token.sub ?? "";
        session.user.email = token.email ?? session.user.email ?? "";
        session.user.name = token.name ?? session.user.name;
        session.user.image = typeof token.picture === "string" ? token.picture : session.user.image;
        session.user.role = token.role === "ADMIN" ? "ADMIN" : "VA";
        return session;
      },
    },
  };
});
