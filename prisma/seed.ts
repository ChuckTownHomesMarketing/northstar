import "dotenv/config";
import { AI_TEAMMATES, MARKETS, QUICK_LINKS } from "../src/lib/catalog";
import { allowedDomain, isCompanyEmail, normalizeEmail } from "../src/lib/access";
import { loadDemoData } from "../src/lib/demo";
import { INTEGRATION_CATALOG } from "../src/lib/integrations";
import { prisma } from "../src/lib/prisma";

async function main() {
  for (const market of MARKETS) {
    await prisma.market.upsert({
      where: { slug: market.slug },
      update: {
        name: market.name,
        city: market.city,
        state: market.state,
        sortOrder: market.sortOrder,
      },
      create: market,
    });
  }

  for (const teammate of AI_TEAMMATES) {
    await prisma.aiTeammate.upsert({
      where: { slug: teammate.slug },
      update: { sortOrder: teammate.sortOrder },
      create: teammate,
    });
  }

  const linkCount = await prisma.quickLink.count();
  if (linkCount === 0) {
    await prisma.quickLink.createMany({ data: QUICK_LINKS });
  }

  for (const integration of INTEGRATION_CATALOG) {
    await prisma.integrationPlaceholder.upsert({
      where: { provider: integration.id },
      update: {},
      create: {
        provider: integration.id,
        status: "not_connected",
        notes: integration.feeds,
      },
    });
  }

  const bootstrap = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
  if (bootstrap) {
    const email = normalizeEmail(bootstrap);
    const domain = allowedDomain();
    if (!isCompanyEmail(email, domain)) {
      throw new Error(`BOOTSTRAP_ADMIN_EMAIL must be an @${domain} address.`);
    }
    const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "Avery French";
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name, role: "ADMIN", active: true },
    });
  }

  await prisma.moduleSetting.upsert({
    where: { key: "marketing" },
    update: { name: "Marketing", sortOrder: 1 },
    create: {
      key: "marketing",
      name: "Marketing",
      description: "KPIs, spend, leads, the content calendar, the weekly report, and tasks.",
      enabled: true,
      sortOrder: 1,
    },
  });
  await prisma.moduleSetting.upsert({
    where: { key: "ordering" },
    update: { name: "Product ordering", sortOrder: 2 },
    create: {
      key: "ordering",
      name: "Product ordering",
      description: "Signs, print, business cards, and other branded items.",
      enabled: true,
      sortOrder: 2,
    },
  });

  const leadSources = [
    {
      slug: "google-ppc",
      name: "Google PPC",
      kind: "google_ppc",
      description: "Google Ads search and lead form traffic.",
      sortOrder: 1,
    },
    {
      slug: "meta",
      name: "Meta",
      kind: "meta",
      description: "Facebook and Instagram lead ads.",
      sortOrder: 2,
    },
    {
      slug: "ai-leads",
      name: "AI leads",
      kind: "ai",
      description: "Leads from AI chat or assistants, AI search referrals, and AI-driven campaigns.",
      sortOrder: 3,
    },
  ];
  for (const source of leadSources) {
    await prisma.leadSourceDefinition.upsert({
      where: { slug: source.slug },
      update: { name: source.name, description: source.description, sortOrder: source.sortOrder },
      create: source,
    });
  }

  const auditCount = await prisma.auditTemplate.count();
  if (auditCount === 0) {
    await prisma.auditTemplate.createMany({
      data: [
        { title: "Check today's scheduled posts", assignRole: "VA", sortOrder: 1 },
        { title: "Log any new lead spend you have", assignRole: "VA", sortOrder: 2 },
        { title: "Clear or update your overdue tasks", assignRole: "VA", sortOrder: 3 },
      ],
    });
  }

  const appCount = await prisma.externalApp.count();
  if (appCount === 0) {
    await prisma.externalApp.create({
      data: {
        name: "ChuckTown Homes",
        icon: "🏠",
        url: "https://chucktownhomes.com",
        openMode: "EXTERNAL",
        active: true,
        sortOrder: 1,
        visibleToAdmins: true,
        visibleToVas: true,
      },
    });
  }

  const users = await prisma.user.findMany();
  for (const person of users) {
    await prisma.userModuleGrant.upsert({
      where: { userId_moduleKey: { userId: person.id, moduleKey: "marketing" } },
      update: {},
      create: { userId: person.id, moduleKey: "marketing" },
    });
    if (person.role === "ADMIN") {
      await prisma.userModuleGrant.upsert({
        where: { userId_moduleKey: { userId: person.id, moduleKey: "ordering" } },
        update: {},
        create: { userId: person.id, moduleKey: "ordering" },
      });
    }
  }

  if (process.env.SEED_DEMO_DATA === "true") {
    const result = await loadDemoData(prisma);
    console.log(`Sample data written: ${result.written}. Skipped real rows: ${result.skipped}.`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
