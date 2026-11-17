import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { canSeeApp } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function EmbeddedAppPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const app = await prisma.externalApp.findUnique({ where: { id } });
  if (!app) notFound();
  const grant = await prisma.userAppGrant.findUnique({ where: { userId_appId: { userId: user.id, appId: app.id } } });
  if (!canSeeApp(user, app, Boolean(grant))) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Apps"
        title={`${app.icon} ${app.name}`.trim()}
        lede="If the site refuses to load inside the frame, open it in a new tab."
        actions={
          <a className="btn secondary" href={app.url} target="_blank" rel="noreferrer">
            Open in a new tab
          </a>
        }
      />
      <iframe className="app-frame" src={app.url} title={app.name} sandbox="allow-scripts allow-forms allow-same-origin allow-popups" />
      <p>
        <Link href="/apps">All apps</Link>
      </p>
    </>
  );
}
