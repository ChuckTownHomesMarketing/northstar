import Link from "next/link";
import { BoundForm, ConfirmSubmit } from "@/components/forms";
import { Field, PageHeader, marketLabel } from "@/components/ui";
import { currentWeekStart, dateToIso, formatLongDate, formatMonth, isoToUtcDate, mondayOf, parseIsoDate, weekRangeLabel } from "@/lib/dates";
import { LEAD_SOURCES, sourceLabel } from "@/lib/labels";
import { formatCount, formatMoneyFromCents } from "@/lib/money";
import { blendedFromSpend, summarizeSpend } from "@/lib/metrics";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/server/access";
import { deleteSpend, importSpendCsv, saveSpend } from "@/server/spend-actions";

export const metadata = { title: "Spend" };

export default async function SpendPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; market?: string; range?: string }>;
}) {
  await requireModule("marketing");
  const params = await searchParams;
  const week = params.week && parseIsoDate(params.week) ? mondayOf(params.week) : currentWeekStart();
  const range = params.range === "month" ? "month" : "week";
  const year = Number(week.slice(0, 4));
  const month = Number(week.slice(5, 7));
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEndDate = new Date(Date.UTC(year, month, 0));
  const monthEnd = dateToIso(monthEndDate);
  const markets = await prisma.market.findMany({ orderBy: { sortOrder: "asc" } });
  const selected = markets.find((market) => market.slug === params.market);
  const entries = await prisma.spendEntry.findMany({
    where: {
      ...(selected ? { marketId: selected.id } : {}),
      weekStart:
        range === "week"
          ? isoToUtcDate(week)
          : { gte: isoToUtcDate(monthStart), lte: isoToUtcDate(monthEnd) },
    },
    include: { market: true },
    orderBy: [{ weekStart: "asc" }, { market: { sortOrder: "asc" } }],
  });
  const shaped = entries.map((entry) => ({
    key: entry.id,
    marketId: entry.marketId,
    marketName: marketLabel(entry.market),
    sourceKey: `${entry.source}:${entry.sourceDetail}`,
    sourceName: sourceLabel(entry.source, entry.sourceDetail),
    spendCents: entry.spendCents,
    leads: entry.leads,
    appointments: entry.appointments,
  }));
  const bySource = summarizeSpend(shaped.map((row) => ({ ...row, key: row.sourceName })));
  const byMarket = summarizeSpend(shaped.map((row) => ({ ...row, key: row.marketName })));
  const blended = blendedFromSpend(shaped);
  const query = new URLSearchParams({ week, ...(selected ? { market: selected.slug } : {}), ...(range === "month" ? { range } : {}) });

  return (
    <>
      <PageHeader
        eyebrow={range === "week" ? weekRangeLabel(week) : `Weeks starting in ${formatMonth(year, month)}`}
        title="Lead sources and ad spend"
        lede="One row per market, source, and week. Cost per lead and cost per appointment are calculated. Use 0 when a source was free or produced none."
        actions={
          <a className="btn secondary" href={`/api/spend/export?${query.toString()}`}>
            Export CSV
          </a>
        }
      />
      <form className="filters card" method="get">
        <Field label="Week of">
          <input type="date" name="week" defaultValue={week} />
        </Field>
        <Field label="Market">
          <select name="market" defaultValue={selected?.slug ?? ""}>
            <option value="">All markets</option>
            {markets.map((market) => (
              <option key={market.id} value={market.slug}>
                {marketLabel(market)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Range">
          <select name="range" defaultValue={range}>
            <option value="week">This week</option>
            <option value="month">Whole month</option>
          </select>
        </Field>
        <button className="btn" type="submit">
          Apply
        </button>
      </form>
      <section className="stats section-gap">
        <article className="stat">
          <span>Spend</span>
          <b>{blended ? formatMoneyFromCents(blended.spendCents) : "—"}</b>
        </article>
        <article className="stat">
          <span>Leads</span>
          <b>{blended ? formatCount(blended.leads) : "—"}</b>
        </article>
        <article className="stat">
          <span>Appointments</span>
          <b>{blended ? formatCount(blended.appointments) : "—"}</b>
        </article>
        <article className="stat">
          <span>Cost per lead / appt</span>
          <b>{blended ? formatMoneyFromCents(blended.cplCents) : "—"}</b>
          <em>{blended ? `${formatMoneyFromCents(blended.cpaCents)} per appointment` : "No rows in this range"}</em>
        </article>
      </section>
      {entries.length === 0 ? (
        <div className="card empty section-gap">
          <h2>Nothing entered for this {range}</h2>
          <p className="muted">Add a source below. An empty week is not the same as zero spend.</p>
        </div>
      ) : (
        <div className="section-gap">
          <Summary title="By source" rows={bySource} />
          <Summary title="By market" rows={byMarket} />
        </div>
      )}
      {entries.length > 0 ? (
        <div className="card table-wrap section-gap">
          <table>
            <thead>
              <tr>
                <th>Week</th>
                <th>Market</th>
                <th>Source</th>
                <th className="num">Spend</th>
                <th className="num">Leads</th>
                <th className="num">Appts</th>
                <th className="num">CPL</th>
                <th className="num">CPA</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const group = blendedFromSpend([entry]);
                return (
                  <tr key={entry.id}>
                    <td>{formatLongDate(dateToIso(entry.weekStart))}</td>
                    <td>
                      {marketLabel(entry.market)}
                      {entry.isDemo ? <span className="sample-tag">Sample</span> : null}
                    </td>
                    <td>{sourceLabel(entry.source, entry.sourceDetail)}</td>
                    <td className="num">{formatMoneyFromCents(entry.spendCents)}</td>
                    <td className="num">{formatCount(entry.leads)}</td>
                    <td className="num">{formatCount(entry.appointments)}</td>
                    <td className="num">{formatMoneyFromCents(group?.cplCents)}</td>
                    <td className="num">{formatMoneyFromCents(group?.cpaCents)}</td>
                    <td>
                      <ConfirmSubmit action={deleteSpend} id={entry.id} label="Remove" message="Remove this spend row?" hidden={{ week }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      <section className="card section-gap">
        <h2>Add a weekly row</h2>
        <BoundForm action={saveSpend} submitLabel="Save row">
          <div className="fields">
            <Field label="Market">
              <select name="marketId" defaultValue={selected?.id ?? ""} required>
                <option value="">Choose</option>
                {markets.filter((market) => market.active).map((market) => (
                  <option key={market.id} value={market.id}>
                    {marketLabel(market)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Any day in the week">
              <input type="date" name="weekStart" defaultValue={week} required />
            </Field>
            <Field label="Source">
              <select name="source" defaultValue="META" required>
                {LEAD_SOURCES.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Other source name" hint="Required only when the source is Other.">
              <input name="sourceDetail" />
            </Field>
            <Field label="Spend">
              <input name="spend" required placeholder="0.00" />
            </Field>
            <Field label="Leads">
              <input name="leads" inputMode="numeric" required defaultValue="0" />
            </Field>
            <Field label="Appointments">
              <input name="appointments" inputMode="numeric" required defaultValue="0" />
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
          Columns: market, week_start, source, source_detail, spend, leads, appointments, notes. Dates snap to Monday.{" "}
          <Link href="/api/spend/export?template=1">Download a template</Link>.
        </p>
        <BoundForm action={importSpendCsv} submitLabel="Import">
          <Field label="CSV file">
            <input type="file" name="file" accept=".csv,text/csv" required />
          </Field>
        </BoundForm>
      </section>
    </>
  );
}

function Summary({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; spendCents: number; leads: number; appointments: number; cplCents: number | null; cpaCents: number | null }[];
}) {
  return (
    <section className="card table-wrap">
      <h2>{title}</h2>
      <table>
        <thead>
          <tr>
            <th>{title === "By source" ? "Source" : "Market"}</th>
            <th className="num">Spend</th>
            <th className="num">Leads</th>
            <th className="num">Appts</th>
            <th className="num">CPL</th>
            <th className="num">CPA</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{row.key}</td>
              <td className="num">{formatMoneyFromCents(row.spendCents)}</td>
              <td className="num">{formatCount(row.leads)}</td>
              <td className="num">{formatCount(row.appointments)}</td>
              <td className="num">{formatMoneyFromCents(row.cplCents)}</td>
              <td className="num">{formatMoneyFromCents(row.cpaCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
