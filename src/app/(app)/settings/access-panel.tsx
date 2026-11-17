import { BoundForm } from "@/components/forms";
import { Field } from "@/components/ui";
import { TOKEN_SCOPES } from "@/lib/tokens";
import { prisma } from "@/lib/prisma";
import { issueToken, revokeToken, saveAccess, toggleModule } from "@/server/app-actions";

export async function AccessPanel() {
  const [people, modules, apps, moduleGrants, appGrants, tokens] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.moduleSetting.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.externalApp.findMany({ orderBy: { name: "asc" } }),
    prisma.userModuleGrant.findMany(),
    prisma.userAppGrant.findMany(),
    prisma.apiToken.findMany({ include: { user: true }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <>
      <section id="modules" className="section-gap">
        <h2>Modules</h2>
        <p className="muted">Turning a module off hides it from everyone, including admins, except on this page.</p>
        <div className="stack">
          {modules.map((module) => (
            <form key={module.key} action={toggleModule} className="card list-row">
              <input type="hidden" name="key" value={module.key} />
              <div>
                <strong>{module.name}</strong>
                <div className="muted">{module.description}</div>
              </div>
              <button className="btn small secondary" type="submit">
                {module.enabled ? "Turn off" : "Turn on"}
              </button>
            </form>
          ))}
        </div>
      </section>
      <section id="access" className="section-gap">
        <h2>Who can open what</h2>
        <p className="muted">
          Admins can open every module that is on. VAs only see a module or a specific app when it is checked here, or when the app is marked for every VA.
        </p>
        <div className="stack">
          {people.map((person) => (
            <form key={person.id} action={saveAccess} className="card">
              <input type="hidden" name="userId" value={person.id} />
              <strong>
                {person.name}
                {person.isDemo ? <span className="sample-tag">Sample</span> : null}
              </strong>
              <div className="fields" style={{ marginTop: 10 }}>
                {modules.map((module) => (
                  <label key={module.key} className="field check">
                    <input
                      type="checkbox"
                      name={`module:${module.key}`}
                      defaultChecked={moduleGrants.some((grant) => grant.userId === person.id && grant.moduleKey === module.key)}
                    />
                    <span>{module.name}</span>
                  </label>
                ))}
                {apps.map((app) => (
                  <label key={app.id} className="field check">
                    <input
                      type="checkbox"
                      name={`app:${app.id}`}
                      defaultChecked={appGrants.some((grant) => grant.userId === person.id && grant.appId === app.id)}
                    />
                    <span>{app.name}</span>
                  </label>
                ))}
              </div>
              <button className="btn small" type="submit" style={{ marginTop: 10 }}>
                Save access
              </button>
            </form>
          ))}
        </div>
      </section>
      <section id="tokens" className="section-gap card">
        <h2>API tokens</h2>
        <p className="muted">
          User tokens act as that person. A service token with no person acts as an admin for the scopes you check. The webhook needs leads:write. MCP needs mcp plus the tool scopes.
        </p>
        <div className="stack">
          {tokens.map((token) => (
            <div key={token.id} className="list-row">
              <div>
                <strong>{token.name}</strong>
                <div className="muted">
                  {token.prefix}… · {token.user?.name ?? "Service"} · {token.scopes}
                  {token.revokedAt ? " · revoked" : ""}
                </div>
              </div>
              {token.revokedAt ? null : (
                <form action={revokeToken}>
                  <input type="hidden" name="id" value={token.id} />
                  <button className="btn small danger" type="submit">
                    Revoke
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
        <BoundForm action={issueToken} submitLabel="Issue token">
          <div className="fields">
            <Field label="Name">
              <input name="name" required placeholder="Zapier leads" />
            </Field>
            <Field label="Acts as">
              <select name="userId" defaultValue="">
                <option value="">Service (admin visibility)</option>
                {people.filter((person) => person.active).map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </Field>
            {TOKEN_SCOPES.map((scope) => (
              <label key={scope} className="field check">
                <input type="checkbox" name={`scope:${scope}`} />
                <span>{scope}</span>
              </label>
            ))}
          </div>
        </BoundForm>
      </section>
    </>
  );
}
