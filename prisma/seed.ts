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
