import { BoundForm, ConfirmSubmit } from "@/components/forms";
import { Field, PageHeader, marketLabel } from "@/components/ui";
import { INTEGRATION_CATALOG } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";
import { AccessPanel } from "./access-panel";
import { HealthTargetsPanel } from "./health-panel";
import { requireAdmin } from "@/server/session";
import {
  addPerson,
  deleteLink,
  loadSample,
  saveLink,
  saveMarket,
  saveTeammate,
  updatePerson,
  wipeSample,
} from "@/server/settings-actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireAdmin();
  const admin = user.role === "ADMIN";
  const [markets, people, teammates, links] = await Promise.all([
    prisma.market.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.aiTeammate.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.quickLink.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Markets, people, and the bot team"
        lede={
          admin
            ? "Markets started from the offices on chucktownhomes.com, plus Chattanooga. You can edit them here."
            : "You can review the markets and the bot team. Avery manages who can sign in."
        }
      />
      <section id="markets" className="section-gap">
        <h2>Markets</h2>
        <div className="stack">
          {markets.map((market) => (
            <article key={market.id} className="card">
              <h3>
                {marketLabel(market)} {market.active ? "" : <span className="pill">Hidden</span>}
              </h3>
              {admin ? (
                <BoundForm action={saveMarket} submitLabel="Save market">
                  <input type="hidden" name="id" value={market.id} />
                  <div className="fields">
                    <Field label="Address" wide>
                      <input name="address" defaultValue={market.address ?? ""} />
                    </Field>
                    <Field label="Phone">
                      <input name="phone" defaultValue={market.phone ?? ""} />
                    </Field>
                    <Field label="Opening note">
                      <input name="openingNote" defaultValue={market.openingNote ?? ""} />
                    </Field>
                    <label className="field check">
                      <input type="checkbox" name="active" defaultChecked={market.active} />
                      <span>Active</span>
                    </label>
                  </div>
                </BoundForm>
              ) : (
                <p className="muted">
                  {market.address || "No address yet"}
                  {market.phone ? ` · ${market.phone}` : ""}
                  {market.openingNote ? ` · ${market.openingNote}` : ""}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
      <section id="people" className="section-gap">
        <h2>People</h2>
        <p className="muted">Someone can sign in only after they are on this list, and only with their @chucktownhomes.com Google account.</p>
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                {admin ? <th>Access</th> : null}
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id}>
                  <td>
                    {person.name}
                    {person.isDemo ? <span className="sample-tag">Sample</span> : null}
                  </td>
                  <td>{person.email}</td>
                  {admin ? (
                    <td colSpan={2}>
                      <form action={updatePerson} className="filters">
                        <input type="hidden" name="id" value={person.id} />
                        <select name="role" defaultValue={person.role} aria-label={`Role for ${person.name}`}>
                          <option value="VA">VA</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        <label className="field check">
                          <input type="checkbox" name="active" defaultChecked={person.active} />
                          <span>Can sign in</span>
                        </label>
                        <button className="btn small" type="submit">
                          Save
                        </button>
                      </form>
                    </td>
                  ) : (
                    <td>{person.role === "ADMIN" ? "Admin" : "VA"}{person.active ? "" : " · off"}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {admin ? (
          <article className="card" style={{ marginTop: 12 }}>
            <h3>Add a person</h3>
            <BoundForm action={addPerson} submitLabel="Add to allowlist">
              <div className="fields">
                <Field label="Name">
                  <input name="name" required />
                </Field>
                <Field label="Email">
                  <input name="email" type="email" placeholder="name@chucktownhomes.com" required />
                </Field>
                <Field label="Role">
                  <select name="role" defaultValue="VA">
                    <option value="VA">VA</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </Field>
              </div>
            </BoundForm>
          </article>
        ) : null}
      </section>
      <section id="team" className="section-gap">
        <h2>Marketing bot team</h2>
        <div className="stack">
          {teammates.map((teammate) => (
            <article key={teammate.id} className="card">
              {admin ? (
                <BoundForm action={saveTeammate} submitLabel="Save teammate">
                  <input type="hidden" name="id" value={teammate.id} />
                  <div className="fields">
                    <Field label="Name">
                      <input name="name" defaultValue={teammate.name} />
                    </Field>
                    <Field label="Title">
                      <input name="title" defaultValue={teammate.title} />
                    </Field>
                    <Field label="What to ask for">
                      <textarea name="askFor" defaultValue={teammate.askFor} />
                    </Field>
                    <label className="field check">
                      <input type="checkbox" name="active" defaultChecked={teammate.active} />
                      <span>Show on the home page</span>
                    </label>
                  </div>
                </BoundForm>
              ) : (
                <>
                  <h3>{teammate.name}</h3>
                  <p>{teammate.askFor}</p>
                </>
              )}
            </article>
          ))}
        </div>
      </section>
      <section id="links" className="section-gap">
        <h2>Quick links</h2>
        <div className="stack">
          {links.map((link) => (
            <article key={link.id} className="card">
              <strong>{link.label}</strong>
              <p className="muted">{link.href}</p>
              {admin ? (
                <>
                  <BoundForm action={saveLink} submitLabel="Save link">
                    <input type="hidden" name="id" value={link.id} />
                    <div className="fields">
                      <Field label="Label">
                        <input name="label" defaultValue={link.label} />
                      </Field>
                      <Field label="URL">
                        <input name="href" defaultValue={link.href} />
                      </Field>
                      <Field label="Description">
                        <input name="description" defaultValue={link.description ?? ""} />
                      </Field>
                      <label className="field check">
                        <input type="checkbox" name="active" defaultChecked={link.active} />
                        <span>Show on the home page</span>
                      </label>
                    </div>
                  </BoundForm>
                  <ConfirmSubmit action={deleteLink} id={link.id} label="Remove link" message="Remove this link?" />
                </>
              ) : null}
            </article>
          ))}
        </div>
        {admin ? (
          <article className="card" style={{ marginTop: 12 }}>
            <h3>Add a link</h3>
            <BoundForm action={saveLink} submitLabel="Add link">
              <div className="fields">
                <Field label="Label">
                  <input name="label" required />
                </Field>
                <Field label="URL">
                  <input name="href" placeholder="https://" required />
                </Field>
                <Field label="Description">
                  <input name="description" />
                </Field>
              </div>
            </BoundForm>
          </article>
        ) : null}
      </section>
      {admin ? (
        <section id="sample" className="section-gap card">
          <h2>Sample data</h2>
          <p>
            Sample numbers are made up so you can click through Northstar. They are tagged in the app and covered by the banner.
            They are not ChuckTown results. Loading sample data will not overwrite a real KPI or spend row.
          </p>
          <div className="toolbar">
            <BoundForm action={loadSample} submitLabel="Load sample data">
              <span />
            </BoundForm>
            <BoundForm action={wipeSample} submitLabel="Wipe sample data">
              <span />
            </BoundForm>
          </div>
        </section>
      ) : null}
      <HealthTargetsPanel />
      <AccessPanel />
      <section id="integrations" className="section-gap">
        <h2>Future data connections</h2>
        <p className="muted">Nothing here is connected. Northstar will not invent ad, analytics, or CRM numbers.</p>
        <div className="links">
          {INTEGRATION_CATALOG.map((item) => (
            <article key={item.id} className="card">
              <p className="eyebrow">Not connected</p>
              <h3>{item.name}</h3>
              <p>{item.feeds}</p>
              <p className="muted">{item.landsIn}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
