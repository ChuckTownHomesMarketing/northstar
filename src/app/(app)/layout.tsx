import { signOut } from "@/auth";
import { Shell } from "@/components/shell";
import { embedModeFromHeader } from "@/lib/connect";
import { demoDataPresent } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";
import { headers } from "next/headers";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const demo = await demoDataPresent(prisma);
  const headerList = await headers();
  const embed = embedModeFromHeader(headerList.get("x-northstar-embed")) === "embed";

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <Shell
      user={{ name: user.name, email: user.email, role: user.role }}
      demo={demo}
      embed={embed}
      signOutAction={signOutAction}
    >
      {children}
    </Shell>
  );
}
