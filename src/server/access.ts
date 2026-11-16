import { redirect } from "next/navigation";
import { canSeeApp, canUseModule, type Viewer } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export type NavSection = { label: string; items: { href: string; label: string }[] };

export async function requireModule(key: string) {
  const user = await requireUser();
  const allowed = await userCanUseModule(user, key);
  if (!allowed) redirect("/?notice=That module is not turned on for you.");
  return user;
}

export async function userCanUseModule(user: Viewer, key: string) {
  const [moduleSetting, grant] = await Promise.all([
    prisma.moduleSetting.findUnique({ where: { key } }),
    prisma.userModuleGrant.findUnique({ where: { userId_moduleKey: { userId: user.id, moduleKey: key } } }),
  ]);
  return canUseModule(user, moduleSetting, Boolean(grant));
}

export async function navigationFor(user: Viewer): Promise<NavSection[]> {
  const [modules, grants, apps, appGrants] = await Promise.all([
    prisma.moduleSetting.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.userModuleGrant.findMany({ where: { userId: user.id } }),
    prisma.externalApp.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.userAppGrant.findMany({ where: { userId: user.id } }),
  ]);
  const grantedModules = new Set(grants.map((grant) => grant.moduleKey));
  const grantedApps = new Set(appGrants.map((grant) => grant.appId));
  const sections: NavSection[] = [{ label: "Today", items: [{ href: "/", label: "My Day" }] }];
  if (canUseModule(user, modules.find((item) => item.key === "marketing") ?? null, grantedModules.has("marketing"))) {
    sections.push({
      label: "Marketing",
      items: [
        { href: "/marketing", label: "Overview" },
        { href: "/leads", label: "Leads" },
        { href: "/kpis", label: "KPIs" },
        { href: "/spend", label: "Spend" },
        { href: "/calendar", label: "Calendar" },
        { href: "/reports", label: "Weekly report" },
        { href: "/tasks", label: "Tasks" },
      ],
    });
  }
  if (canUseModule(user, modules.find((item) => item.key === "ordering") ?? null, grantedModules.has("ordering"))) {
    const items = [
      { href: "/ordering", label: "Order products" },
      { href: "/ordering/history", label: "Order history" },
    ];
    if (user.role === "ADMIN") items.push({ href: "/ordering/queue", label: "Approval queue" });
    sections.push({ label: "Product ordering", items });
  }
  const visibleApps = apps.filter((app) => canSeeApp(user, app, grantedApps.has(app.id)));
  if (visibleApps.length > 0 || user.role === "ADMIN") {
    sections.push({ label: "Apps", items: [{ href: "/apps", label: "Apps" }] });
  }
  if (user.role === "ADMIN") {
    sections.push({ label: "Admin", items: [{ href: "/settings", label: "Settings" }] });
  }
  return sections;
}
