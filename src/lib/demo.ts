import { SAMPLE_NOTE } from "./catalog";
import { isoToUtcDate } from "./dates";
import type { PrismaClient } from "../generated/prisma/client";

const WEEKS = ["2026-11-09", "2026-11-16"];

export async function loadDemoData(db: PrismaClient): Promise<{ written: number; skipped: number }> {
  const markets = await db.market.findMany({ orderBy: { sortOrder: "asc" } });
  const admin = await db.user.findFirst({ where: { role: "ADMIN", active: true, isDemo: false } });
  const sampleVa = await db.user.upsert({
    where: { email: "sample.va@chucktownhomes.com" },
    update: { name: "Sample VA", role: "VA", active: true, isDemo: true },
    create: {
      email: "sample.va@chucktownhomes.com",
      name: "Sample VA",
      role: "VA",
      active: true,
      isDemo: true,
    },
  });

  let written = 0;
  let skipped = 0;

  for (const [index, market] of markets.entries()) {
    const step = index + 1;
    for (const month of [10, 11]) {
      const factor = month === 11 ? 1 : 0.8;
      const existing = await db.marketMonthKpi.findUnique({
        where: { marketId_year_month: { marketId: market.id, year: 2026, month } },
      });
      if (existing && !existing.isDemo) {
        skipped += 1;
        continue;
      }
      const leads = Math.round(step * 10 * factor);
      const adSpendCents = Math.round(step * 100000 * factor);
      await db.marketMonthKpi.upsert({
        where: { marketId_year_month: { marketId: market.id, year: 2026, month } },
        update: {
          leads,
          adSpendCents,
          costPerLeadCents: null,
          appointments: Math.round(step * 2 * factor),
          closings: step > 4 ? step - 4 : 0,
          websiteSessions: step * 400,
          socialFollowers: 1000 + step * 250,
          socialEngagement: step * 40,
          newGoogleReviews: step,
          avgRating: Number(Math.min(5, 4.4 + step * 0.05).toFixed(2)),
          notes: SAMPLE_NOTE,
          origin: "DEMO",
          isDemo: true,
        },
        create: {
          marketId: market.id,
          year: 2026,
          month,
          leads,
          adSpendCents,
          appointments: Math.round(step * 2 * factor),
          closings: step > 4 ? step - 4 : 0,
          websiteSessions: step * 400,
          socialFollowers: 1000 + step * 250,
          socialEngagement: step * 40,
          newGoogleReviews: step,
          avgRating: Number(Math.min(5, 4.4 + step * 0.05).toFixed(2)),
          notes: SAMPLE_NOTE,
          origin: "DEMO",
          isDemo: true,
        },
      });
      written += 1;
    }

    for (const week of WEEKS) {
      const spendScale = week === "2026-11-16" ? 1 : 0.7;
      const sources = [
        { source: "META" as const, detail: "", spend: Math.round(step * 20000 * spendScale), leads: step, appointments: step % 2 },
        {
          source: "GOOGLE_ADS" as const,
          detail: "",
          spend: Math.round(step * 15000 * spendScale),
          leads: Math.max(1, step - 1),
          appointments: step > 3 ? 1 : 0,
        },
      ];
      for (const source of sources) {
        const existing = await db.spendEntry.findUnique({
          where: {
            marketId_source_sourceDetail_weekStart: {
              marketId: market.id,
              source: source.source,
              sourceDetail: source.detail,
              weekStart: isoToUtcDate(week),
            },
          },
        });
        if (existing && !existing.isDemo) {
          skipped += 1;
          continue;
        }
        await db.spendEntry.upsert({
          where: {
            marketId_source_sourceDetail_weekStart: {
              marketId: market.id,
              source: source.source,
              sourceDetail: source.detail,
              weekStart: isoToUtcDate(week),
            },
          },
          update: {
            spendCents: source.spend,
            leads: source.leads,
            appointments: source.appointments,
            notes: SAMPLE_NOTE,
            origin: "DEMO",
            isDemo: true,
          },
          create: {
            marketId: market.id,
            source: source.source,
            sourceDetail: source.detail,
            weekStart: isoToUtcDate(week),
            spendCents: source.spend,
            leads: source.leads,
            appointments: source.appointments,
            notes: SAMPLE_NOTE,
            origin: "DEMO",
            isDemo: true,
          },
        });
        written += 1;
      }
    }
  }

  const charleston = markets.find((market) => market.slug === "charleston");
  const chattanooga = markets.find((market) => market.slug === "chattanooga");
  const campaign = await db.campaign.upsert({
    where: { id: "sample-november-campaign" },
    update: { name: "SAMPLE: November listing push", isDemo: true, marketId: charleston?.id },
    create: {
      id: "sample-november-campaign",
      name: "SAMPLE: November listing push",
      description: SAMPLE_NOTE,
      marketId: charleston?.id,
      startsOn: isoToUtcDate("2026-11-01"),
      endsOn: isoToUtcDate("2026-11-30"),
      isDemo: true,
    },
  });

  const content = [
    {
      id: "sample-content-reel",
      topic: "SAMPLE: Charleston skyline reel",
      marketId: charleston?.id,
      channel: "INSTAGRAM" as const,
      contentType: "REEL" as const,
      status: "SCHEDULED" as const,
      scheduledFor: isoToUtcDate("2026-11-17"),
      ownerId: sampleVa.id,
    },
    {
      id: "sample-content-blog",
      topic: "SAMPLE: What buyers ask in Columbia",
      marketId: markets.find((market) => market.slug === "columbia")?.id,
      channel: "BLOG" as const,
      contentType: "BLOG_POST" as const,
      status: "REVIEW" as const,
      scheduledFor: isoToUtcDate("2026-11-19"),
      ownerId: admin?.id ?? sampleVa.id,
    },
    {
      id: "sample-content-chat",
      topic: "SAMPLE: Chattanooga office introduction",
      marketId: chattanooga?.id,
      channel: "GOOGLE_BUSINESS" as const,
      contentType: "POST" as const,
      status: "IDEA" as const,
      scheduledFor: null,
      ownerId: sampleVa.id,
    },
    {
      id: "sample-content-midweek",
      topic: "SAMPLE: Midweek listing tip",
      marketId: charleston?.id,
      channel: "FACEBOOK" as const,
      contentType: "POST" as const,
      status: "SCHEDULED" as const,
      scheduledFor: isoToUtcDate("2026-11-12"),
      ownerId: sampleVa.id,
    },
    {
      id: "sample-content-posted",
      topic: "SAMPLE: Savannah open house story",
      marketId: markets.find((market) => market.slug === "savannah")?.id,
      channel: "INSTAGRAM" as const,
      contentType: "STORY" as const,
      status: "POSTED" as const,
      scheduledFor: isoToUtcDate("2026-11-16"),
      ownerId: sampleVa.id,
    },
  ];

  for (const item of content) {
    await db.contentItem.upsert({
      where: { id: item.id },
      update: { ...item, campaignId: campaign.id, notes: SAMPLE_NOTE, isDemo: true },
      create: { ...item, campaignId: campaign.id, notes: SAMPLE_NOTE, isDemo: true },
    });
    written += 1;
  }

  const tasks = [
    {
      id: "sample-task-this-week",
      title: "SAMPLE: Pull this week's spend",
      status: "TODO" as const,
      priority: "HIGH" as const,
      dueOn: isoToUtcDate("2026-11-13"),
      marketId: charleston?.id,
      ownerId: sampleVa.id,
    },
    {
      id: "sample-task-captions",
      title: "SAMPLE: Draft Charleston captions",
      status: "TODO" as const,
      priority: "HIGH" as const,
      dueOn: isoToUtcDate("2026-11-17"),
      marketId: charleston?.id,
      ownerId: sampleVa.id,
    },
    {
      id: "sample-task-review",
      title: "SAMPLE: Send Columbia blog to Avery",
      status: "IN_PROGRESS" as const,
      priority: "MEDIUM" as const,
      dueOn: isoToUtcDate("2026-11-18"),
      marketId: markets.find((market) => market.slug === "columbia")?.id,
      ownerId: sampleVa.id,
    },
    {
      id: "sample-task-blocked",
      title: "SAMPLE: Waiting on Chattanooga photos",
      status: "BLOCKED" as const,
      priority: "URGENT" as const,
      dueOn: isoToUtcDate("2026-11-16"),
      marketId: chattanooga?.id,
      ownerId: admin?.id ?? null,
    },
    {
      id: "sample-task-done",
      title: "SAMPLE: Post Savannah story",
      status: "DONE" as const,
      priority: "LOW" as const,
      dueOn: isoToUtcDate("2026-11-16"),
      marketId: markets.find((market) => market.slug === "savannah")?.id,
      ownerId: sampleVa.id,
    },
  ];
  for (const task of tasks) {
    await db.task.upsert({
      where: { id: task.id },
      update: { ...task, details: SAMPLE_NOTE, isDemo: true },
      create: { ...task, details: SAMPLE_NOTE, isDemo: true },
    });
    written += 1;
  }

  await db.taskTemplate.upsert({
    where: { id: "sample-template-reviews" },
    update: { active: true, isDemo: true },
    create: {
      id: "sample-template-reviews",
      title: "SAMPLE: Check new Google reviews",
      details: SAMPLE_NOTE,
      recurrence: "WEEKLY",
      weekday: 1,
      priority: "MEDIUM",
      ownerId: sampleVa.id,
      active: true,
      isDemo: true,
    },
  });

  for (const week of WEEKS) {
    const existing = await db.weeklyReport.findUnique({ where: { weekStart: isoToUtcDate(week) } });
    if (existing && !existing.isDemo) {
      skipped += 1;
      continue;
    }
    await db.weeklyReport.upsert({
      where: { weekStart: isoToUtcDate(week) },
      update: {
        wins: "SAMPLE: A Savannah story went out. This is not a real win.",
        issues: "SAMPLE: Chattanooga still needs an address and photos before we promote it.",
        priorities: "SAMPLE: Confirm the Chattanooga intro and review this week's CPL with Avery.",
        isDemo: true,
      },
      create: {
        weekStart: isoToUtcDate(week),
        wins: "SAMPLE: A Savannah story went out. This is not a real win.",
        issues: "SAMPLE: Chattanooga still needs an address and photos before we promote it.",
        priorities: "SAMPLE: Confirm the Chattanooga intro and review this week's CPL with Avery.",
        isDemo: true,
      },
    });
    written += 1;
  }

  return { written, skipped };
}

export async function wipeDemoData(db: PrismaClient): Promise<void> {
  await db.$transaction([
    db.marketMonthKpi.deleteMany({ where: { isDemo: true } }),
    db.spendEntry.deleteMany({ where: { isDemo: true } }),
    db.contentItem.deleteMany({ where: { isDemo: true } }),
    db.task.deleteMany({ where: { isDemo: true } }),
    db.taskTemplate.deleteMany({ where: { isDemo: true } }),
    db.campaign.deleteMany({ where: { isDemo: true } }),
    db.weeklyReport.deleteMany({ where: { isDemo: true } }),
    db.user.deleteMany({ where: { isDemo: true } }),
  ]);
}

export async function demoDataPresent(db: PrismaClient): Promise<boolean> {
  const [kpis, spend, content, tasks, reports] = await Promise.all([
    db.marketMonthKpi.count({ where: { isDemo: true } }),
    db.spendEntry.count({ where: { isDemo: true } }),
    db.contentItem.count({ where: { isDemo: true } }),
    db.task.count({ where: { isDemo: true } }),
    db.weeklyReport.count({ where: { isDemo: true } }),
  ]);
  return kpis + spend + content + tasks + reports > 0;
}
