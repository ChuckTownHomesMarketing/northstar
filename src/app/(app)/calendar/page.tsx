import Link from "next/link";
import { AutoSelect, BoundForm, ConfirmSubmit } from "@/components/forms";
import { Field, PageHeader, marketLabel } from "@/components/ui";
import { dateToIso, formatLongDate, formatMonth, formatShortDate, monthGrid, monthInputValue, parseMonthKey, shiftMonth } from "@/lib/dates";
import { CONTENT_CHANNELS, CONTENT_STATUSES, CONTENT_TYPES, labelFor } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { deleteContent, saveCampaign, saveContent, updateContentStatus } from "@/server/content-actions";

export const metadata = { title: "Calendar" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string; market?: string; owner?: string; status?: string; campaign?: string }>;
}) {
  const params = await searchParams;
  const { year, month } = parseMonthKey(params.month);
  const view = params.view === "list" ? "list" : "month";
  const [markets, people, campaigns] = await Promise.all([
    prisma.market.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.campaign.findMany({ include: { market: true }, orderBy: { name: "asc" } }),
  ]);
  const market = markets.find((item) => item.slug === params.market);
  const owner = people.find((item) => item.id === params.owner);
  const status = CONTENT_STATUSES.find((item) => item.value === params.status)?.value;
  const campaign = campaigns.find((item) => item.id === params.campaign);
  const items = await prisma.contentItem.findMany({
    where: {
      ...(market ? { marketId: market.id } : {}),
      ...(owner ? { ownerId: owner.id } : {}),
      ...(status ? { status } : {}),
      ...(campaign ? { campaignId: campaign.id } : {}),
    },
    include: { market: true, owner: true, campaign: true },
    orderBy: [{ scheduledFor: "asc" }, { topic: "asc" }],
  });
  const grid = monthGrid(year, month);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const query = (overrides: Record<string, string>) => {
    const search = new URLSearchParams({
      month: monthInputValue(year, month),
      view,
      ...(params.market ? { market: params.market } : {}),
      ...(params.owner ? { owner: params.owner } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.campaign ? { campaign: params.campaign } : {}),
      ...overrides,
    });
    return `/calendar?${search.toString()}`;
  };
  const hidden = {
    month: monthInputValue(year, month),
    view,
    filterMarket: params.market ?? "",
    filterOwner: params.owner ?? "",
    filterStatus: params.status ?? "",
  };

  return (
    <>
      <PageHeader
        eyebrow="Content and campaigns"
        title="Calendar"
        lede="Idea, drafting, review, scheduled, posted. Group pieces under a campaign when they belong together."
        actions={
          <>
            <Link className={view === "month" ? "btn" : "btn secondary"} href={query({ view: "month" })}>
              Month
            </Link>
            <Link className={view === "list" ? "btn" : "btn secondary"} href={query({ view: "list" })}>
              List
            </Link>
          </>
        }
      />
      <form className="filters card" method="get">
        <input type="hidden" name="view" value={view} />
        <Field label="Month">
          <input type="month" name="month" defaultValue={monthInputValue(year, month)} />
        </Field>
        <Field label="Market">
          <select name="market" defaultValue={params.market ?? ""}>
            <option value="">All markets</option>
            {markets.map((item) => (
              <option key={item.id} value={item.slug}>
                {marketLabel(item)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Owner">
          <select name="owner" defaultValue={params.owner ?? ""}>
            <option value="">Everyone</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={params.status ?? ""}>
            <option value="">Any status</option>
            {CONTENT_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <button className="btn" type="submit">
          Filter
        </button>
      </form>
      <div className="toolbar section-gap">
        <Link href={query({ month: monthInputValue(prev.year, prev.month) })}>Previous</Link>
        <strong>{formatMonth(year, month)}</strong>
        <Link href={query({ month: monthInputValue(next.year, next.month) })}>Next</Link>
      </div>
      {view === "month" ? (
        <div className="section-gap">
          <div className="calendar">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="dow">
                {day}
              </div>
            ))}
            {grid.map((cell) => (
              <div key={cell.iso} className={cell.inMonth ? "day" : "day outside"}>
                <strong>{formatShortDate(cell.iso)}</strong>
                <ul>
                  {items
                    .filter((item) => item.scheduledFor && dateToIso(item.scheduledFor) === cell.iso)
                    .map((item) => (
                      <li key={item.id}>
                        {item.topic}
                        <div className="muted">{labelFor(CONTENT_STATUSES, item.status)}</div>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
          <section className="card">
            <h2>Not dated yet</h2>
            {items.filter((item) => !item.scheduledFor).length === 0 ? (
              <p className="muted">Every filtered piece has a date.</p>
            ) : (
              items
                .filter((item) => !item.scheduledFor)
                .map((item) => (
                  <p key={item.id}>
                    {item.topic} · {labelFor(CONTENT_STATUSES, item.status)}
                  </p>
                ))
            )}
            <p className="muted">Switch to the list to edit a piece or move its status.</p>
          </section>
        </div>
      ) : (
        <div className="card table-wrap section-gap">
          <table>
            <thead>
              <tr>
                <th>Topic</th>
                <th>When</th>
                <th>Market</th>
                <th>Channel</th>
                <th>Type</th>
                <th>Owner</th>
                <th>Campaign</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.topic}
                    {item.isDemo ? <span className="sample-tag">Sample</span> : null}
                    {item.link ? (
                      <div>
                        <a href={item.link} target="_blank" rel="noreferrer">
                          Open link
                        </a>
                      </div>
                    ) : null}
                  </td>
                  <td>{item.scheduledFor ? formatLongDate(dateToIso(item.scheduledFor)) : "—"}</td>
                  <td>{item.market ? marketLabel(item.market) : "—"}</td>
                  <td>{labelFor(CONTENT_CHANNELS, item.channel)}</td>
                  <td>{labelFor(CONTENT_TYPES, item.contentType)}</td>
                  <td>{item.owner?.name ?? "—"}</td>
                  <td>{item.campaign?.name ?? "—"}</td>
                  <td>
                    <AutoSelect
                      action={updateContentStatus}
                      id={item.id}
                      name="status"
                      value={item.status}
                      options={CONTENT_STATUSES}
                      label={`Status for ${item.topic}`}
                    />
                  </td>
                  <td>
                    <ConfirmSubmit action={deleteContent} id={item.id} label="Remove" message="Remove this piece?" hidden={hidden} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 ? <p className="muted">No pieces match these filters.</p> : null}
        </div>
      )}
      <div className="split section-gap">
        <section className="card">
          <h2>Add a piece</h2>
          <BoundForm action={saveContent} submitLabel="Add to calendar">
            <input type="hidden" name="month" value={monthInputValue(year, month)} />
            <input type="hidden" name="view" value={view} />
            <div className="fields">
              <Field label="Topic">
                <input name="topic" required />
              </Field>
              <Field label="Market">
                <select name="marketId" defaultValue={market?.id ?? ""}>
                  <option value="">No market yet</option>
                  {markets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {marketLabel(item)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Channel">
                <select name="channel" defaultValue="INSTAGRAM">
                  {CONTENT_CHANNELS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Type">
                <select name="contentType" defaultValue="POST">
                  {CONTENT_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Owner">
                <select name="ownerId" defaultValue="">
                  <option value="">Unassigned</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Campaign">
                <select name="campaignId" defaultValue={campaign?.id ?? ""}>
                  <option value="">None</option>
                  {campaigns.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select name="status" defaultValue="IDEA">
                  {CONTENT_STATUSES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date">
                <input type="date" name="scheduledFor" />
              </Field>
              <Field label="Link">
                <input name="link" placeholder="https://" />
              </Field>
              <Field label="Notes">
                <textarea name="notes" />
              </Field>
            </div>
          </BoundForm>
        </section>
        <section className="card">
          <h2>Campaigns</h2>
          <div className="stack">
            {campaigns.map((item) => (
              <div key={item.id} className="list-row">
                <div>
                  <Link href={query({ campaign: item.id, view: "list" })}>
                    <strong>{item.name}</strong>
                  </Link>
                  {item.isDemo ? <span className="sample-tag">Sample</span> : null}
                  <div className="muted">
                    {item.market ? marketLabel(item.market) : "Any market"}
                    {item.startsOn ? ` · ${formatShortDate(dateToIso(item.startsOn))}` : ""}
                    {item.endsOn ? `–${formatShortDate(dateToIso(item.endsOn))}` : ""}
                    {" · "}
                    {items.filter((piece) => piece.campaignId === item.id).length} in this filter
                  </div>
                </div>
              </div>
            ))}
            {campaigns.length === 0 ? <p className="muted">No campaigns yet.</p> : null}
          </div>
          <h3 style={{ marginTop: 18 }}>New campaign</h3>
          <BoundForm action={saveCampaign} submitLabel="Add campaign">
            <input type="hidden" name="month" value={monthInputValue(year, month)} />
            <input type="hidden" name="view" value={view} />
            <div className="fields">
              <Field label="Name">
                <input name="name" required />
              </Field>
              <Field label="Market">
                <select name="marketId" defaultValue="">
                  <option value="">Any market</option>
                  {markets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {marketLabel(item)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Starts">
                <input type="date" name="startsOn" />
              </Field>
              <Field label="Ends">
                <input type="date" name="endsOn" />
              </Field>
              <Field label="Description">
                <textarea name="description" />
              </Field>
            </div>
          </BoundForm>
        </section>
      </div>
      <p className="muted">List view is where you change status or remove a piece. Month view is the at-a-glance plan.</p>
    </>
  );
}
