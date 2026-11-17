import Link from "next/link";
import { DashboardBoard, DonutCard, type DashPoint } from "@/components/dashboard-board";
import { marketLabel } from "@/components/ui";
import { addDays, currentWeekStart, firstName, formatLongDate, isoToUtcDate, todayIso, zonedParts } from "@/lib/dates";
import { auditAppliesTo } from "@/lib/permissions";
import { effectiveCpl, monthOverMonth, sumNullable } from "@/lib/metrics";
import { formatCount, formatMoneyFromCents, formatPercent } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { HealthPanel } from "./health-panel";
import { requireModule } from "@/server/access";
import { ensureRecurringTasks } from "@/server/task-actions";

export const metadata = { title: "Home" };

export default async function HomePage({ searchParams }: { searchParams: Promise<{ market?: string }> }) {
  const params = await searchParams;
  const user = await requireModule("marketing");
  const ownWork = user.role === "VA" ? { ownerId: user.id } : {};
  const now = new Date();
  const today = todayIso(now);
  await ensureRecurringTasks(today);
  const weekStart = currentWeekStart(now);
  const weekEnd = addDays(weekStart, 6);
  const { year, month } = zonedParts(now);
  const [markets, kpis, history, dueTasks, content, links, teammates, templates, checks] = await Promise.all([
    prisma.market.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.marketMonthKpi.findMany({ where: { year, month }, include: { market: true } }),
    prisma.marketMonthKpi.findMany({ where: { market: { active: true } } }),
    prisma.task.findMany({
      where: { status: { not: "DONE" }, dueOn: { lte: isoToUtcDate(weekEnd) }, ...ownWork },
      include: { market: true, owner: true },
      orderBy: { dueOn: "asc" },
      take: 6,
    }),
    prisma.contentItem.findMany({
      where: { scheduledFor: { gte: isoToUtcDate(weekStart), lte: isoToUtcDate(weekEnd) }, ...ownWork },
      include: { market: true, owner: true },
      orderBy: { scheduledFor: "asc" },
      take: 6,
    }),
    prisma.quickLink.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.aiTeammate.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.auditTemplate.findMany({ where: { active: true }, include: { assignees: true } }),
    prisma.auditCheck.findMany({ where: { userId: user.id, day: isoToUtcDate(today), done: true } }),
  ]);
  const leads = sumNullable(kpis.map((row) => row.leads));
  const spend = sumNullable(kpis.map((row) => row.adSpendCents));
  const cpl = leads != null && spend != null ? effectiveCpl({ leads, adSpendCents: spend, costPerLeadCents: null }) : null;
  const openings = markets.filter((market) => market.openingNote);
  const series = monthSeries(history, year, month);
  const previousPoint = series.at(-2);
  const appointments = sumNullable(kpis.map((row) => row.appointments));
  const closings = sumNullable(kpis.map((row) => row.closings));
  const reviews = sumNullable(kpis.map((row) => row.newGoogleReviews));
  const palette = ["#2ee6a6", "#4c8dff", "#8b7cf7", "#ff5d8f", "#1ec8c8", "#f3c2a4", "#ffb020", "#7dd3fc"];
  const bars = kpis
    .filter((row) => row.leads != null)
    .map((row, index) => ({ label: row.market.name, value: row.leads ?? 0, color: palette[index % palette.length] }));
  const assignedAudits = templates.filter((template) =>
    auditAppliesTo(
      { active: template.active, assignRole: template.assignRole, assigneeIds: template.assignees.map((seat) => seat.userId) },
      user,
    ),
  );
  const auditLeft = assignedAudits.length - checks.length;

  return (
    <>
      <header className="welcome">
        <div>
          <h1>
            Welcome, <b>{firstName(user.name)}</b>
          </h1>
          <p>Marketing for the week of {formatLongDate(weekStart)}. Blank tiles mean the number has not been entered.</p>
        </div>
        <p className="muted">{formatLongDate(today)}</p>
      </header>
      <div className="dash">
        <div className="dash-main">
          <DashboardBoard
            tiles={[
              tile("Leads", formatCount(leads), leads, previousPoint?.leads ?? null, true, series.map((point) => point.leads), "#2ee6a6"),
              tile("CPL", formatMoneyFromCents(cpl), cpl == null ? null : cpl / 100, previousPoint?.cpl ?? null, false, series.map((point) => point.cpl), "#ff5d8f"),
              tile("Spend", formatMoneyFromCents(spend), spend == null ? null : spend / 100, previousPoint?.spend ?? null, false, series.map((point) => point.spend), "#4c8dff"),
              tile("Appointments", formatCount(appointments), appointments, previousPoint?.appointments ?? null, true, series.map((point) => point.appointments), "#8b7cf7"),
            ]}
            series={series}
            bars={bars}
          />
          <section className="card">
            <h2>Content this week</h2>
            {content.length === 0 ? (
              <p className="muted">Nothing is dated for this week yet.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Topic</th>
                      <th>Market</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.map((item) => (
                      <tr key={item.id}>
                        <td>
                          {item.topic}
                          {item.isDemo ? <span className="sample-tag">Sample</span> : null}
                        </td>
                        <td>{item.market ? marketLabel(item.market) : "—"}</td>
                        <td>{item.status}</td>
                        <td>
                          <Link href="/calendar" aria-label={`Open ${item.topic} on the calendar`}>
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
        <aside className="profile-card">
          <section className="card">
            <div className="profile-top">
              <span className="avatar-btn" aria-hidden="true">
                {`${firstName(user.name).slice(0, 1)}${user.name.split(" ")[1]?.[0] ?? ""}`}
              </span>
              <div>
                <strong>{user.name}</strong>
                <div className="muted">{user.role === "ADMIN" ? "Admin" : "VA"}</div>
              </div>
            </div>
            <p className="eyebrow">Leads this month</p>
            <b style={{ fontSize: 28 }}>{formatCount(leads)}</b>
            <div className="chip-row">
              <div className="chip">
                <span>Appts</span>
                <b>{formatCount(appointments)}</b>
              </div>
              <div className="chip">
                <span>Closings</span>
                <b>{formatCount(closings)}</b>
              </div>
              <div className="chip">
                <span>Reviews</span>
                <b>{formatCount(reviews)}</b>
              </div>
            </div>
          </section>
          <DonutCard slices={bars.map((bar) => ({ name: bar.label, value: bar.value, color: bar.color }))} />
          <section className="card promo">
            {auditLeft > 0 ? (
              <>
                <h2>Finish today&apos;s audit</h2>
                <p>{auditLeft} checklist {auditLeft === 1 ? "item is" : "items are"} still open.</p>
                <Link href="/">Go to My Day</Link>
              </>
            ) : (
              <>
                <h2>Connect Google Ads</h2>
                <p>The lead page can take a live feed later. Nothing is connected yet.</p>
                <Link href="/settings#integrations">See connections</Link>
              </>
            )}
          </section>
        </aside>
      </div>
      <div className="section-gap">
        <HealthPanel market={params.market} />
      </div>
      {openings.length > 0 ? (
        <div className="callout section-gap">
          {openings.map((market) => (
            <p key={market.id} style={{ margin: "4px 0" }}>
              <strong>{marketLabel(market)}.</strong> {market.openingNote}
            </p>
          ))}
        </div>
      ) : null}
      <div className="split section-gap">
        <section className="card">
          <h2>Tasks due</h2>
          {dueTasks.length === 0 ? (
            <p className="muted">Nothing due through the end of this week.</p>
          ) : (
            <div className="stack">
              {dueTasks.map((task) => (
                <div className="list-row" key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    {task.isDemo ? <span className="sample-tag">Sample</span> : null}
                    <div className="muted">
                      {task.market ? marketLabel(task.market) : "All markets"}
                      {task.owner ? ` · ${task.owner.name}` : ""}
                    </div>
                  </div>
                  <span className={task.dueOn && task.dueOn < isoToUtcDate(today) ? "pill bad" : "muted"}>
                    {task.dueOn ? formatLongDate(task.dueOn.toISOString().slice(0, 10)) : "No date"}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p>
            <Link href="/tasks">Open the task board</Link>
          </p>
        </section>
      </div>
      <section className="section-gap">
        <h2>Quick links</h2>
        <div className="links">
          {links.map((link) => (
            <a key={link.id} className="card" href={link.href} target="_blank" rel="noreferrer">
              <strong>{link.label}</strong>
              <p className="muted">{link.description}</p>
            </a>
          ))}
          <Link className="card" href="/kpis">
            <strong>Enter KPIs</strong>
            <p className="muted">Monthly numbers by market</p>
          </Link>
          <Link className="card" href="/spend">
            <strong>Log spend for this week</strong>
            <p className="muted">Source, spend, leads, appointments</p>
          </Link>
        </div>
      </section>
      <section className="section-gap">
        <h2>Marketing bot team</h2>
        <p className="muted">These are the teammates to ask. They are not connected to live accounts in this version.</p>
        <div className="bot-grid">
          {teammates.map((teammate) => (
            <article key={teammate.id} className={teammate.slug === "byte" ? "card bot-card coordinator" : "card bot-card"}>
              <p className="eyebrow">{teammate.title}</p>
              <h3>{teammate.name}</h3>
              <p>{teammate.askFor}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function monthSeries(
  history: { year: number; month: number; leads: number | null; adSpendCents: number | null; appointments: number | null; costPerLeadCents: number | null }[],
  year: number,
  month: number,
): DashPoint[] {
  const end = year * 12 + (month - 1);
  const points: DashPoint[] = [];
  for (let index = end - 17; index <= end; index += 1) {
    const pointYear = Math.floor(index / 12);
    const pointMonth = (index % 12) + 1;
    const rows = history.filter((row) => row.year === pointYear && row.month === pointMonth);
    const leadSum = sumNullable(rows.map((row) => row.leads));
    const spendSum = sumNullable(rows.map((row) => row.adSpendCents));
    const appointmentSum = sumNullable(rows.map((row) => row.appointments));
    const cplCents =
      leadSum != null && spendSum != null
        ? effectiveCpl({ leads: leadSum, adSpendCents: spendSum, costPerLeadCents: null })
        : null;
    points.push({
      label: new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(pointYear, pointMonth - 1, 1))),
      year: pointYear,
      month: pointMonth,
      leads: leadSum,
      spend: spendSum == null ? null : spendSum / 100,
      appointments: appointmentSum,
      cpl: cplCents == null ? null : cplCents / 100,
    });
  }
  return points;
}

function tile(
  label: string,
  value: string,
  current: number | null,
  previous: number | null,
  higherIsGood: boolean,
  series: Array<number | null>,
  color: string,
) {
  const change = monthOverMonth(current, previous);
  if (change.percent == null) return { label, value, change: null, tone: "flat" as const, series, color };
  const good = change.percent === 0 ? true : higherIsGood ? change.percent > 0 : change.percent < 0;
  return {
    label,
    value,
    change: formatPercent(change.percent),
    tone: change.percent === 0 ? ("flat" as const) : good ? ("up" as const) : ("down" as const),
    series,
    color,
  };
}
