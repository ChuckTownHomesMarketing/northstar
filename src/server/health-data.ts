import { daysInMonth, isoToUtcDate, zonedParts } from "@/lib/dates";
import { HEALTH_DEFAULTS, overallHealth, scoreHealth, type HealthTargetConfig } from "@/lib/health";
import { averageNullable, effectiveCpl, sumNullable } from "@/lib/metrics";
import { auditAppliesTo } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function loadMarketingHealth(marketSlug?: string) {
  const now = new Date();
  const { year, month, day } = zonedParts(now);
  const monthStart = isoToUtcDate(`${year}-${String(month).padStart(2, "0")}-01`);
  const monthEnd = isoToUtcDate(`${year}-${String(month).padStart(2, "0")}-${String(daysInMonth(year, month)).padStart(2, "0")}`);
  const daysElapsed = year === zonedParts(now).year && month === zonedParts(now).month ? day : daysInMonth(year, month);
  const markets = await prisma.market.findMany({
    where: { active: true, ...(marketSlug ? { slug: marketSlug } : {}) },
    orderBy: { sortOrder: "asc" },
  });
  const marketIds = markets.map((market) => market.id);
  const [stored, kpis, contentPieces, tasks, templates, checks, orders, people] = await Promise.all([
    prisma.healthTarget.findMany(),
    prisma.marketMonthKpi.findMany({ where: { year, month, marketId: { in: marketIds } } }),
    prisma.contentItem.count({
      where: {
        scheduledFor: { gte: monthStart, lte: monthEnd },
        ...(marketSlug ? { marketId: { in: marketIds } } : {}),
      },
    }),
    prisma.task.findMany({
      where: { dueOn: { gte: monthStart, lte: monthEnd }, ...(marketSlug ? { marketId: { in: marketIds } } : {}) },
    }),
    prisma.auditTemplate.findMany({ where: { active: true }, include: { assignees: true } }),
    prisma.auditCheck.findMany({ where: { day: { gte: monthStart, lte: monthEnd }, done: true } }),
    prisma.productOrder.findMany({
      where: {
        createdAt: { gte: monthStart, lt: new Date(monthEnd.getTime() + 86400000) },
        ...(marketSlug ? { marketId: { in: marketIds } } : {}),
      },
    }),
    marketSlug ? Promise.resolve([]) : prisma.user.findMany({ where: { active: true } }),
  ]);
  const targets = mergeTargets(stored);
  const leads = sumNullable(kpis.map((row) => row.leads));
  const spendCents = sumNullable(kpis.map((row) => row.adSpendCents));
  const cplCents = leads != null && spendCents != null ? effectiveCpl({ leads, adSpendCents: spendCents, costPerLeadCents: null }) : null;
  const taskCompletion = tasks.length === 0 ? null : tasks.filter((task) => task.status === "DONE").length / tasks.length;
  const auditCompletion = marketSlug ? null : auditRate(templates, people, checks.length, daysElapsed);
  const dimensions = scoreHealth(
    {
      marketCount: Math.max(markets.length, 1),
      leads,
      cplDollars: cplCents == null ? null : cplCents / 100,
      contentPieces,
      taskCompletion,
      auditCompletion,
      avgRating: averageNullable(kpis.map((row) => (row.avgRating == null ? null : Number(row.avgRating)))),
      newReviews: sumNullable(kpis.map((row) => row.newGoogleReviews)),
      fulfillment: orders.length === 0 ? null : orders.filter((order) => order.status === "DELIVERED").length / orders.length,
    },
    targets,
  );
  return { dimensions, overall: overallHealth(dimensions), targets, year, month };
}

function mergeTargets(stored: { key: string; label: string; target: number; secondaryTarget: number | null; direction: string; unit: string }[]): HealthTargetConfig[] {
  return HEALTH_DEFAULTS.map((fallback) => {
    const row = stored.find((item) => item.key === fallback.key);
    if (!row) return fallback;
    return {
      key: row.key,
      label: row.label,
      target: row.target,
      secondaryTarget: row.secondaryTarget,
      direction: row.direction === "lower" ? "lower" : "higher",
      unit: row.unit,
    };
  });
}

function auditRate(
  templates: { active: boolean; assignRole: "ADMIN" | "VA" | null; assignees: { userId: string }[] }[],
  people: { id: string; role: "ADMIN" | "VA" }[],
  doneChecks: number,
  daysElapsed: number,
) {
  const expected = people.reduce((sum, person) => {
    const assigned = templates.filter((template) =>
      auditAppliesTo(
        { active: template.active, assignRole: template.assignRole, assigneeIds: template.assignees.map((seat) => seat.userId) },
        person,
      ),
    ).length;
    return sum + assigned * daysElapsed;
  }, 0);
  if (expected === 0) return null;
  return Math.min(1, doneChecks / expected);
}
