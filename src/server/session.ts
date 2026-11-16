import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { allowedDomain, canSignIn, normalizeEmail } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function getUser() {
  const session = await auth();
  const email = session?.user?.email ? normalizeEmail(session.user.email) : "";
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !canSignIn(email, user, allowedDomain()).ok) return null;
  return user;
}

export async function requireUser() {
  const session = await auth();
  const email = session?.user?.email ? normalizeEmail(session.user.email) : "";
  if (!email) redirect("/login");
  const user = await prisma.user.findUnique({ where: { email } });
  const decision = canSignIn(email, user, allowedDomain());
  if (!user || !decision.ok) {
    const reason = decision.ok ? "allowlist" : decision.reason;
    await signOut({ redirectTo: `/login?error=${reason}` });
    redirect(`/login?error=${reason}`);
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/settings?notice=Avery manages that setting.");
  return user;
}
