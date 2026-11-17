import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { addDays, currentWeekStart, formatLongDate, mondayOf } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/server/access";
import { isoToUtcDate } from "@/lib/dates";

export const metadata = { title: "Weekly reports" };

export default async function ReportsPage() {
  await requireModule("marketing");
  const current = currentWeekStart();
  const weeks = [-6, -5, -4, -3, -2, -1, 0, 1].map((offset) => addDays(current, offset * 7));
  const reports = await prisma.weeklyReport.findMany({
    where: { weekStart: { in: weeks.map((week) => isoToUtcDate(week)) } },
  });
  const byWeek = new Map(reports.map((report) => [report.weekStart.toISOString().slice(0, 10), report]));

  return (
    <>
      <PageHeader
        eyebrow="Generated from KPIs, spend, and the calendar"
        title="Weekly marketing report"
        lede="Open a week to see the numbers, then write the wins, issues, and next week's priorities. Print it or copy the email version."
      />
      <div className="stack">
        {weeks.map((week) => {
          const report = byWeek.get(week);
          const hasNotes = Boolean(report && (report.wins || report.issues || report.priorities));
          return (
            <Link key={week} href={`/reports/${week}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
              <strong>Week of {formatLongDate(week)}</strong>
              {week === current ? <span className="sample-tag">This week</span> : null}
              {report?.isDemo ? <span className="sample-tag">Sample</span> : null}
              <p className="muted">{hasNotes ? "Notes started" : "Numbers only, notes not written yet"}</p>
            </Link>
          );
        })}
      </div>
      <p className="muted">The Monday used here is {mondayOf(current)} in the Eastern Time calendar.</p>
    </>
  );
}
