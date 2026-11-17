import Link from "next/link";
import { PageHeader, marketLabel } from "@/components/ui";
import { addDays, currentWeekStart, firstName, formatLongDate, formatMonth, greeting, isoToUtcDate, todayIso, zonedParts } from "@/lib/dates";
import { effectiveCpl, sumNullable } from "@/lib/metrics";
import { formatCount, formatMoneyFromCents } from "@/lib/money";
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
  const [markets, kpis, dueTasks, content, links, teammates, taskCount, contentCount] = await Promise.all([
    prisma.market.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.marketMonthKpi.findMany({ where: { year, month } }),
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
    prisma.task.count({ where: { status: { not: "DONE" }, dueOn: { lte: isoToUtcDate(weekEnd) }, ...ownWork } }),
    prisma.contentItem.count({
      where: { scheduledFor: { gte: isoToUtcDate(weekStart), lte: isoToUtcDate(weekEnd) }, ...ownWork },
    }),
  ]);
  const leads = sumNullable(kpis.map((row) => row.leads));
  const spend = sumNullable(kpis.map((row) => row.adSpendCents));
  const cpl = leads != null && spend != null ? effectiveCpl({ leads, adSpendCents: spend, costPerLeadCents: null }) : null;
  const openings = markets.filter((market) => market.openingNote);

  return (
    <>
      <PageHeader
        eyebrow={`Week of ${formatLongDate(weekStart)}`}
        title="Marketing"
        lede={`${greeting(now)}, ${firstName(user.name)}. The week at a glance across ChuckTown's markets. Empty boxes mean nobody has entered a number yet.`}
      />
      <HealthPanel market={params.market} />
      {openings.length > 0 ? (
        <div className="callout" style={{ marginBottom: 16 }}>
          {openings.map((market) => (
            <p key={market.id} style={{ margin: "4px 0" }}>
              <strong>{marketLabel(market)}.</strong> {market.openingNote}
            </p>
          ))}
        </div>
      ) : null}
      {kpis.length === 0 ? (
        <EmptyKpis month={formatMonth(year, month)} />
      ) : (
        <section className="stats" aria-label="This month">
          <article className="stat">
            <span>Leads · {formatMonth(year, month)}</span>
            <b>{formatCount(leads)}</b>
            <em>Markets with a KPI row only</em>
          </article>
          <article className="stat">
            <span>Blended cost per lead</span>
            <b>{formatMoneyFromCents(cpl)}</b>
            <em>Ad spend ÷ leads</em>
          </article>
          <article className="stat">
            <span>Tasks due</span>
            <b>{formatCount(taskCount)}</b>
            <em>Open through {formatLongDate(weekEnd)}</em>
          </article>
          <article className="stat">
            <span>Content this week</span>
            <b>{formatCount(contentCount)}</b>
            <em>Pieces with a date this week</em>
          </article>
        </section>
      )}
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
        <section className="card">
          <h2>Content this week</h2>
          {content.length === 0 ? (
            <p className="muted">Nothing is dated for this week yet.</p>
          ) : (
            <div className="stack">
              {content.map((item) => (
                <div className="list-row" key={item.id}>
                  <div>
                    <strong>{item.topic}</strong>
                    {item.isDemo ? <span className="sample-tag">Sample</span> : null}
                    <div className="muted">
                      {item.market ? marketLabel(item.market) : "No market"} · {item.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p>
            <Link href="/calendar">Open the calendar</Link>
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

function EmptyKpis({ month }: { month: string }) {
  return (
    <div className="card empty">
      <h2>No {month} KPIs yet</h2>
      <p className="muted">When someone enters leads, spend, or the other monthly numbers, they will show here. A blank is not a zero.</p>
      <Link className="btn" href="/kpis">
        Enter this month
      </Link>
    </div>
  );
}
