import Link from "next/link";
import { notFound } from "next/navigation";
import { BoundForm, CopyButton, PrintButton } from "@/components/forms";
import { Field, PageHeader } from "@/components/ui";
import { formatCount, formatMoneyFromCents, formatRating } from "@/lib/money";
import { mondayOf, parseIsoDate } from "@/lib/dates";
import { saveReport } from "@/server/report-actions";
import { loadReport } from "@/server/report-data";

export async function generateMetadata({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  return { title: `Week of ${week}` };
}

export default async function ReportWeekPage({ params }: { params: Promise<{ week: string }> }) {
  const { week: raw } = await params;
  if (!parseIsoDate(raw)) notFound();
  const week = mondayOf(raw);
  const { draft, email } = await loadReport(week);

  return (
    <>
      <div className="no-print">
        <PageHeader
          eyebrow="Weekly report"
          title={`Week of ${draft.weekLabel}`}
          lede="Top numbers come from what has been entered. Wins, issues, and priorities are yours to write."
          actions={
            <>
              <PrintButton />
              <CopyButton text={email} />
              <a className="btn secondary" href={`/api/reports/${week}/email`}>
                Download email
              </a>
              <Link className="btn secondary" href="/reports">
                All weeks
              </Link>
            </>
          }
        />
        {draft.demo ? (
          <p className="callout">Some of these figures are sample data. They are not ChuckTown performance.</p>
        ) : null}
      </div>
      <article className="report-sheet">
        <p className="eyebrow">Northstar</p>
        <h2>Weekly marketing report</h2>
        <p>ChuckTown Homes · Week of {draft.weekLabel}</p>
        <h3>All markets · {draft.monthLabel}</h3>
        <p className="muted">Month-level KPIs, not a one-week slice. Social followers are listed by market and are not added together.</p>
        <div className="stats">
          <Stat label="Leads" value={formatCount(draft.totals.leads)} />
          <Stat label="Blended CPL" value={formatMoneyFromCents(draft.totals.cplCents)} />
          <Stat label="Ad spend" value={formatMoneyFromCents(draft.totals.adSpendCents)} />
          <Stat label="Appointments" value={formatCount(draft.totals.appointments)} />
          <Stat label="Closings" value={formatCount(draft.totals.closings)} />
          <Stat label="Sessions" value={formatCount(draft.totals.websiteSessions)} />
          <Stat label="New reviews" value={formatCount(draft.totals.newGoogleReviews)} />
          <Stat label="Avg rating" value={formatRating(draft.totals.avgRating)} />
        </div>
        <div className="table-wrap" style={{ marginTop: 18 }}>
          <table>
            <thead>
              <tr>
                <th>Market</th>
                <th className="num">Month leads</th>
                <th className="num">Month CPL</th>
                <th className="num">Month appts</th>
                <th className="num">Closings</th>
                <th className="num">Week spend</th>
                <th className="num">Week CPL</th>
                <th className="num">Scheduled</th>
                <th className="num">Posted</th>
              </tr>
            </thead>
            <tbody>
              {draft.markets.map((market) => (
                <tr key={market.marketName}>
                  <td>
                    {market.marketName}, {market.state}
                  </td>
                  <td className="num">{market.monthly.entered ? formatCount(market.monthly.leads) : "—"}</td>
                  <td className="num">{market.monthly.entered ? formatMoneyFromCents(market.monthly.cplCents) : "—"}</td>
                  <td className="num">{market.monthly.entered ? formatCount(market.monthly.appointments) : "—"}</td>
                  <td className="num">{market.monthly.entered ? formatCount(market.monthly.closings) : "—"}</td>
                  <td className="num">{market.weeklySpend.hasEntries ? formatMoneyFromCents(market.weeklySpend.spendCents) : "—"}</td>
                  <td className="num">{market.weeklySpend.hasEntries ? formatMoneyFromCents(market.weeklySpend.cplCents) : "—"}</td>
                  <td className="num">{formatCount(market.contentScheduled)}</td>
                  <td className="num">{formatCount(market.contentPosted)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3>Wins</h3>
        <p className="prose">{draft.wins.trim() || "Not written yet."}</p>
        <h3>Issues</h3>
        <p className="prose">{draft.issues.trim() || "Not written yet."}</p>
        <h3>Priorities for next week</h3>
        <p className="prose">{draft.priorities.trim() || "Not written yet."}</p>
      </article>
      <section className="card section-gap no-print">
        <h2>Write the narrative</h2>
        <p className="muted">Saving replaces sample notes with your own, and those notes stay if you later wipe sample numbers.</p>
        <BoundForm action={saveReport} submitLabel="Save report">
          <input type="hidden" name="weekStart" value={week} />
          <Field label="Wins">
            <textarea name="wins" defaultValue={draft.wins} placeholder="What worked this week?" />
          </Field>
          <Field label="Issues">
            <textarea name="issues" defaultValue={draft.issues} placeholder="What needs attention?" />
          </Field>
          <Field label="Next week's priorities">
            <textarea name="priorities" defaultValue={draft.priorities} placeholder="What should the VAs do next week?" />
          </Field>
        </BoundForm>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="stat">
      <span>{label}</span>
      <b>{value}</b>
    </article>
  );
}
