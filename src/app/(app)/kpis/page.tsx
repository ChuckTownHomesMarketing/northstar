import Link from "next/link";
import { KpiCharts } from "@/components/kpi-charts";
import { BoundForm } from "@/components/forms";
import { Field, Mom, PageHeader, marketLabel } from "@/components/ui";
import { formatMonth, monthInputValue, parseMonthKey, shiftMonth } from "@/lib/dates";
import { centsToDollarInput, formatCount, formatMoneyFromCents, formatRating } from "@/lib/money";
import { effectiveCpl } from "@/lib/metrics";
import { prisma } from "@/lib/prisma";
import { saveKpi, importKpiCsv } from "@/server/kpi-actions";

export const metadata = { title: "KPIs" };

function asNumber(value: unknown): number | null {
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export default async function KpiPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; market?: string }>;
}) {
  const params = await searchParams;
  const { year, month } = parseMonthKey(params.month);
  const previous = shiftMonth(year, month, -1);
  const markets = await prisma.market.findMany({ orderBy: { sortOrder: "asc" } });
  const selected = markets.find((market) => market.slug === params.market);
  const visible = markets.filter((market) => market.active || market.id === selected?.id);
  const rows = await prisma.marketMonthKpi.findMany({
    where: {
      OR: [
        { year, month },
        { year: previous.year, month: previous.month },
      ],
    },
  });
  const currentRows = rows.filter((row) => row.year === year && row.month === month);
  const previousRows = rows.filter((row) => row.year === previous.year && row.month === previous.month);
  const tableMarkets = selected ? visible.filter((market) => market.id === selected.id) : visible;
  const chart = tableMarkets.map((market) => {
    const row = currentRows.find((item) => item.marketId === market.id);
    const cpl = row
      ? effectiveCpl({ leads: row.leads, adSpendCents: row.adSpendCents, costPerLeadCents: row.costPerLeadCents })
      : null;
    return { market: market.name, leads: row?.leads ?? null, cpl: cpl == null ? null : cpl / 100 };
  });
  const editing = selected ? currentRows.find((row) => row.marketId === selected.id) : undefined;
  const anyNumbers = currentRows.some((row) => tableMarkets.some((market) => market.id === row.marketId));

  return (
    <>
      <PageHeader
        eyebrow="By market and month"
        title="KPI dashboard"
        lede="Enter the monthly numbers, or import a CSV. Cost per lead is calculated from ad spend and leads when both are filled in. Blank means not entered."
        actions={
          <a className="btn secondary" href={`/api/kpis/export?month=${monthInputValue(year, month)}`}>
            Export CSV
          </a>
        }
      />
      <form className="filters card" method="get">
        <Field label="Month">
          <input type="month" name="month" defaultValue={monthInputValue(year, month)} />
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
        <button className="btn" type="submit">
          Apply
        </button>
      </form>
      <div className="section-gap">
        {anyNumbers ? <KpiCharts data={chart} /> : <p className="muted">No chart yet. Charts appear after a market has leads or a cost per lead.</p>}
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Market</th>
                <th className="num">Leads</th>
                <th>Change</th>
                <th className="num">CPL</th>
                <th>Change</th>
                <th className="num">Ad spend</th>
                <th className="num">Appts</th>
                <th className="num">Closings</th>
                <th className="num">Sessions</th>
                <th className="num">Followers</th>
                <th className="num">Engagement</th>
                <th className="num">Reviews</th>
                <th className="num">Rating</th>
              </tr>
            </thead>
            <tbody>
              {tableMarkets.map((market) => {
                const row = currentRows.find((item) => item.marketId === market.id);
                const prior = previousRows.find((item) => item.marketId === market.id);
                const cpl = row
                  ? effectiveCpl({ leads: row.leads, adSpendCents: row.adSpendCents, costPerLeadCents: row.costPerLeadCents })
                  : null;
                const priorCpl = prior
                  ? effectiveCpl({
                      leads: prior.leads,
                      adSpendCents: prior.adSpendCents,
                      costPerLeadCents: prior.costPerLeadCents,
                    })
                  : null;
                const manual = row && row.adSpendCents != null && row.leads ? false : Boolean(row?.costPerLeadCents);
                return (
                  <tr key={market.id}>
                    <td>
                      {marketLabel(market)}
                      {row?.isDemo ? <span className="sample-tag">Sample</span> : null}
                      {manual ? <div className="muted">CPL entered</div> : null}
                    </td>
                    <td className="num">{formatCount(row?.leads)}</td>
                    <td>
                      <Mom current={row?.leads ?? null} previous={prior?.leads ?? null} polarity="up-good" />
                    </td>
                    <td className="num">{formatMoneyFromCents(cpl)}</td>
                    <td>
                      <Mom current={cpl} previous={priorCpl} polarity="down-good" />
                    </td>
                    <td className="num">{formatMoneyFromCents(row?.adSpendCents)}</td>
                    <td className="num">{formatCount(row?.appointments)}</td>
                    <td className="num">{formatCount(row?.closings)}</td>
                    <td className="num">{formatCount(row?.websiteSessions)}</td>
                    <td className="num">{formatCount(row?.socialFollowers)}</td>
                    <td className="num">{formatCount(row?.socialEngagement)}</td>
                    <td className="num">{formatCount(row?.newGoogleReviews)}</td>
                    <td className="num">{formatRating(asNumber(row?.avgRating))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="muted">Compared with {formatMonth(previous.year, previous.month)}. Followers stay per market and are not added up.</p>
        </div>
        <section className="card">
          <h2>{editing ? `Update ${selected?.name}` : "Enter numbers"}</h2>
          <BoundForm action={saveKpi} submitLabel="Save month">
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
              <Field label="Month">
                <input type="month" name="month" defaultValue={monthInputValue(year, month)} required />
              </Field>
              <Field label="Leads">
                <input name="leads" inputMode="numeric" defaultValue={editing?.leads ?? ""} />
              </Field>
              <Field label="Ad spend" hint="Dollars. Leave blank if unknown.">
                <input name="adSpend" defaultValue={centsToDollarInput(editing?.adSpendCents)} />
              </Field>
              <Field label="Cost per lead" hint="Only if you are not entering both spend and leads.">
                <input name="costPerLead" defaultValue={centsToDollarInput(editing?.costPerLeadCents)} />
              </Field>
              <Field label="Appointments">
                <input name="appointments" inputMode="numeric" defaultValue={editing?.appointments ?? ""} />
              </Field>
              <Field label="Closings">
                <input name="closings" inputMode="numeric" defaultValue={editing?.closings ?? ""} />
              </Field>
              <Field label="Website sessions">
                <input name="websiteSessions" inputMode="numeric" defaultValue={editing?.websiteSessions ?? ""} />
              </Field>
              <Field label="Social followers">
                <input name="socialFollowers" inputMode="numeric" defaultValue={editing?.socialFollowers ?? ""} />
              </Field>
              <Field label="Social engagement">
                <input name="socialEngagement" inputMode="numeric" defaultValue={editing?.socialEngagement ?? ""} />
              </Field>
              <Field label="New Google reviews">
                <input name="newGoogleReviews" inputMode="numeric" defaultValue={editing?.newGoogleReviews ?? ""} />
              </Field>
              <Field label="Average rating">
                <input name="avgRating" defaultValue={editing?.avgRating?.toString() ?? ""} />
              </Field>
              <Field label="Notes">
                <input name="notes" defaultValue={editing?.notes ?? ""} />
              </Field>
            </div>
          </BoundForm>
        </section>
        <section className="card">
          <h2>Import CSV</h2>
          <p className="muted">
            Columns: market, year, month, leads, ad_spend, cost_per_lead, appointments, closings, website_sessions,
            social_followers, social_engagement, new_google_reviews, avg_rating, notes. Blank cells stay blank.{" "}
            <Link href="/api/kpis/export?template=1">Download a template</Link>.
          </p>
          <BoundForm action={importKpiCsv} submitLabel="Import">
            <Field label="CSV file">
              <input type="file" name="file" accept=".csv,text/csv" required />
            </Field>
          </BoundForm>
        </section>
      </div>
    </>
  );
}
