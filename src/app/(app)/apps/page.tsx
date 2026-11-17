import Link from "next/link";
import { BoundForm } from "@/components/forms";
import { Field, PageHeader } from "@/components/ui";
import { canSeeApp } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { saveApp } from "@/server/app-actions";
import { requireUser } from "@/server/session";

export const metadata = { title: "Apps" };

export default async function AppsPage() {
  const user = await requireUser();
  const [apps, grants] = await Promise.all([
    prisma.externalApp.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.userAppGrant.findMany({ where: { userId: user.id } }),
  ]);
  const granted = new Set(grants.map((grant) => grant.appId));
  const visible = apps.filter((app) => canSeeApp(user, app, granted.has(app.id)));

  return (
    <>
      <PageHeader
        eyebrow="Apps"
        title="Tools the team uses"
        lede="Embedded apps open inside Northstar. Everything else opens in a new tab. Admins decide who can see each one."
      />
      <div className="links">
        {visible.map((app) =>
          app.openMode === "EMBED" ? (
            <Link key={app.id} href={`/apps/${app.id}`} className="card">
              <strong>
                {app.icon} {app.name}
              </strong>
              <p className="muted">Opens inside Northstar</p>
            </Link>
          ) : (
            <a key={app.id} className="card" href={app.url} target="_blank" rel="noreferrer">
              <strong>
                {app.icon} {app.name}
              </strong>
              <p className="muted">Opens in a new tab</p>
            </a>
          ),
        )}
      </div>
      {visible.length === 0 ? (
        <div className="card empty">
          <h2>No apps for you yet</h2>
          <p className="muted">When Avery adds a tool and turns it on for your role, it will show up here.</p>
        </div>
      ) : null}
      {user.role === "ADMIN" ? (
        <section className="card section-gap">
          <h2>Register an app</h2>
          <div className="stack" style={{ marginBottom: 16 }}>
            {apps.map((app) => (
              <p key={app.id}>
                {app.name} · {app.openMode === "EMBED" ? "Embed" : "New tab"} · {app.active ? "On" : "Off"} ·{" "}
                {app.visibleToVas ? "VAs" : "Not for every VA"}
              </p>
            ))}
          </div>
          <BoundForm action={saveApp} submitLabel="Save app">
            <div className="fields">
              <Field label="Name">
                <input name="name" required />
              </Field>
              <Field label="Icon" hint="One emoji is enough.">
                <input name="icon" placeholder="★" />
              </Field>
              <Field label="URL">
                <input name="url" required placeholder="https://" />
              </Field>
              <Field label="Opens">
                <select name="openMode" defaultValue="EXTERNAL">
                  <option value="EXTERNAL">New tab</option>
                  <option value="EMBED">Inside Northstar</option>
                </select>
              </Field>
              <label className="field check">
                <input type="checkbox" name="active" defaultChecked />
                <span>Active</span>
              </label>
              <label className="field check">
                <input type="checkbox" name="visibleToAdmins" defaultChecked />
                <span>Admins</span>
              </label>
              <label className="field check">
                <input type="checkbox" name="visibleToVas" />
                <span>Every VA</span>
              </label>
            </div>
          </BoundForm>
        </section>
      ) : null}
    </>
  );
}
