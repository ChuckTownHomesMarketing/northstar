import Link from "next/link";
import { BoundForm } from "@/components/forms";
import { LeadCharts } from "@/components/lead-charts";
import { Field, PageHeader, marketLabel } from "@/components/ui";
import { dateToIso, daysInMonth, formatLongDate, monthInputValue, parseIsoDate, zonedParts } from "@/lib/dates";
import { leadRates, summarizeLeads } from "@/lib/leads";
import { formatCount, formatMoneyFromCents, formatShare } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/server/access";
import { importLeads, saveLead, saveLeadSource } from "@/server/lead-actions";

export const metadata = { title: "Leads" };

function rate(value: number | null) {
  return formatShare(value);
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; market?: string; source?: string }>;
}) {
  const viewer = await requireModule("marketing");
  const params = await searchParams;
  const today = zonedParts(new Date());
  const defaultFrom = `${today.year}-${String(today.month).padStart(2, "0")}-01`;
  const defaultTo = `${today.year}-${String(today.month).padStart(2, "0")}-${String(daysInMonth(today.year, today.month)).padStart(2, "0")}`;
  const from = params.from && parseIsoDate(params.from) ? params.from : defaultFrom;
  const to = params.to && parseIsoDate(params.to) ? params.to : defaultTo;
  const [sources, markets, rows] = await Promise.all([
    prisma.leadSourceDefinition.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.market.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.leadRecord.findMany({
      where: {
        occurredOn: { gte: new Date(`${from}T00:00:00.000Z`), lte: new Date(`${to}T00:00:00.000Z`) },
        ...(params.market ? { market: { slug: params.market } } : {}),
        ...(params.source ? { source: { slug: params.source } } : {}),
      },
      include: { source: true, market: true },
      orderBy: { occurredOn: "desc" },
    }),
  ]);
  const shaped = rows.map((row) => ({
    key: row.id,
    source: row.source.name,
    sourceSlug: row.source.slug,
    market: row.market ? marketLabel(row.market) : "No market",
    week: dateToIso(row.occurredOn).slice(0, 7),
    leads: row.leads,
    spendCents: row.spendCents,
    appointments: row.appointments,
    conversions: row.conversions,
    demo: row.isDemo,
    occurredOn: dateToIso(row.occurredOn),
    origin: row.origin,
  }));
  const bySource = summarizeLeads(shaped.map((row) => ({ ...row, key: row.source })));
  const byMarket = summarizeLeads(shaped.map((row) => ({ ...row, key: row.market })));
  const total = summarizeLeads([{ ...shaped.reduce((sum, row) => ({
    leads: sum.leads + row.leads,
    spendCents: sum.spendCents + row.spendCents,
    appointments: sum.appointments + row.appointments,
    conversions: sum.conversions + row.conversions,
  }), { leads: 0, spendCents: 0, appointments: 0, conversions: 0 }), key: "all" }])[0];
  const rates = total ? leadRates(total) : null;

  return (
    <>
      <PageHeader
        eyebrow="Lead generation"
        title="Leads by source"
        lede="Google PPC, Meta, and AI leads are the starting set. Add more sources any time. Volume, cost, CPL, and rates come only from rows you enter, import, or receive on the webhook."
        actions={
          <a className="btn secondary" href={`/api/leads/export?from=${from}&to=${to}`}>
            Export CSV
          </a>
        }
      />
      <form className="filters card" method="get">
        <Field label="From">
          <input type="date" name="from" defaultValue={from} />
        </Field>
        <Field label="To">
          <input type="date" name="to" defaultValue={to} />
        </Field>
        <Field label="Market">
          <select name="market" defaultValue={params.market ?? ""}>
            <option value="">All markets</option>
            {markets.map((market) => (
              <option key={market.id} value={market.slug}>
                {marketLabel(market)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Source">
          <select name="source" defaultValue={params.source ?? ""}>
            <option value="">All sources</option>
            {sources.map((source) => (
              <option key={source.id} value={source.slug}>
                {source.name}
              </option>
            ))}
          </select>
        </Field>
        <button className="btn" type="submit">
          Apply
        </button>
      </form>
      {rows.length === 0 ? (
        <div className="card empty section-gap">
          <h2>No leads in this range</h2>
          <p className="muted">A blank range is not zero volume. Add a row, import a CSV, or send the webhook.</p>
        </div>
      ) : (
        <>
          <section className="stats section-gap">
            <article className="stat">
              <span>Leads</span>
              <b>{formatCount(total?.leads)}</b>
            </article>
            <article className="stat">
              <span>Cost</span>
              <b>{formatMoneyFromCents(total?.spendCents)}</b>
            </article>
            <article className="stat">
              <span>CPL</span>
              <b>{formatMoneyFromCents(rates?.cplCents)}</b>
            </article>
            <article className="stat">
              <span>Appointment / conversion</span>
              <b>{rate(rates?.appointmentRate ?? null)}</b>
              <em>{rate(rates?.conversionRate ?? null)} converted</em>
            </article>
          </section>
          <div className="section-gap">
            <LeadCharts data={bySource.map((row) => ({ source: String(row.key), leads: row.leads, cpl: row.cplCents == null ? null : row.cplCents / 100 }))} />
          </div>
          <div className="section-gap">
            <Summary title="By source" rows={bySource} />
            <Summary title="By market" rows={byMarket} />
          </div>
        </>
      )}
      <section className="card section-gap">
        <h2>Add a row</h2>
        <BoundForm action={saveLead} submitLabel="Save leads">
          <div className="fields">
            <Field label="Date">
              <input type="date" name="occurredOn" defaultValue={to} required />
            </Field>
            <Field label="Source">
              <select name="sourceId" required defaultValue={sources.find((source) => source.active)?.id ?? ""}>
                {sources.filter((source) => source.active).map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Market">
              <select name="marketId" defaultValue="">
                <option value="">No market</option>
                {markets.map((market) => (
                  <option key={market.id} value={market.id}>
                    {marketLabel(market)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Leads">
              <input name="leads" required defaultValue="0" />
            </Field>
            <Field label="Spend">
              <input name="spend" required defaultValue="0" />
            </Field>
            <Field label="Appointments">
              <input name="appointments" required defaultValue="0" />
            </Field>
            <Field label="Conversions">
              <input name="conversions" required defaultValue="0" />
            </Field>
            <Field label="Notes">
              <input name="notes" />
            </Field>
          </div>
        </BoundForm>
      </section>
      <section className="card section-gap">
        <h2>Import CSV</h2>
        <p className="muted">
          Columns: source, market, occurred_on, leads, spend, appointments, conversions, notes.{" "}
          <Link href="/api/leads/export?template=1">Download a template</Link>.
        </p>
        <BoundForm action={importLeads} submitLabel="Import">
          <Field label="CSV file">
            <input type="file" name="file" accept=".csv,text/csv" required />
          </Field>
        </BoundForm>
      </section>
      {rows.length > 0 ? (
        <div className="card table-wrap section-gap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Source</th>
                <th>Market</th>
                <th className="num">Leads</th>
                <th className="num">Spend</th>
                <th className="num">CPL</th>
                <th>Origin</th>
              </tr>
            </thead>
            <tbody>
              {shaped.slice(0, 40).map((row) => (
                <tr key={row.key}>
                  <td>{formatLongDate(row.occurredOn)}</td>
                  <td>
                    {row.source}
                    {row.demo ? <span className="sample-tag">Sample</span> : null}
                  </td>
                  <td>{row.market}</td>
                  <td className="num">{formatCount(row.leads)}</td>
                  <td className="num">{formatMoneyFromCents(row.spendCents)}</td>
                  <td className="num">{formatMoneyFromCents(leadRates(row).cplCents)}</td>
                  <td>{row.origin === "DEMO" ? "Sample" : row.origin.toLowerCase()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {viewer.role === "ADMIN" ? (
        <section className="card section-gap">
          <h2>Sources</h2>
          <p className="muted">
            AI leads cover chat or assistant inquiries, AI search referrals, and AI-driven campaigns. Google Ads and Meta Lead Ads are not connected yet.
          </p>
          <ul>
            {sources.map((source) => (
              <li key={source.id}>
                {source.name} <span className="muted">({source.slug})</span>
                {source.description ? <span className="muted"> — {source.description}</span> : null}
              </li>
            ))}
          </ul>
          <BoundForm action={saveLeadSource} submitLabel="Add source">
            <div className="fields">
              <Field label="Name">
                <input name="name" required />
              </Field>
              <Field label="Slug">
                <input name="slug" required placeholder="homes-com" />
              </Field>
              <Field label="Kind">
                <select name="kind" defaultValue="custom">
                  <option value="google_ppc">Google PPC</option>
                  <option value="meta">Meta</option>
                  <option value="ai">AI leads</option>
                  <option value="custom">Custom</option>
                </select>
              </Field>
              <Field label="Description">
                <input name="description" />
              </Field>
              <label className="field check">
                <input type="checkbox" name="active" defaultChecked />
                <span>Active</span>
              </label>
            </div>
          </BoundForm>
        </section>
      ) : null}
      <p className="muted">Showing {monthInputValue(today.year, today.month)} by default. Webhook: POST /api/webhooks/leads with a token that has leads:write.</p>
    </>
  );
}

function Summary({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; leads: number; spendCents: number; appointments: number; conversions: number; cplCents: number | null; appointmentRate: number | null; conversionRate: number | null }[];
}) {
  return (
    <section className="card table-wrap">
      <h2>{title}</h2>
      <table>
        <thead>
          <tr>
            <th>{title === "By source" ? "Source" : "Market"}</th>
            <th className="num">Leads</th>
            <th className="num">Spend</th>
            <th className="num">CPL</th>
            <th className="num">Appt rate</th>
            <th className="num">Conv. rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{row.key}</td>
              <td className="num">{formatCount(row.leads)}</td>
              <td className="num">{formatMoneyFromCents(row.spendCents)}</td>
              <td className="num">{formatMoneyFromCents(row.cplCents)}</td>
              <td className="num">{rate(row.appointmentRate)}</td>
              <td className="num">{rate(row.conversionRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
