import Link from "next/link";
import { BoundForm } from "@/components/forms";
import { Field, marketLabel } from "@/components/ui";
import { dateToIso, firstName, formatLongDate, isoToUtcDate, todayIso } from "@/lib/dates";
import { auditAppliesTo } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { saveAuditTemplate, toggleAudit } from "@/server/audit-actions";
import { requireUser } from "@/server/session";

export const metadata = { title: "My Day" };

export default async function MyDayPage() {
  const user = await requireUser();
  const today = todayIso();
  const day = isoToUtcDate(today);
  const [templates, checks, tasks, content, orders, people] = await Promise.all([
    prisma.auditTemplate.findMany({
      where: { active: true },
      include: { assignees: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.auditCheck.findMany({ where: { userId: user.id, day } }),
    prisma.task.findMany({
      where: { ownerId: user.id, status: { not: "DONE" } },
      include: { market: true },
      orderBy: { dueOn: "asc" },
      take: 8,
    }),
    prisma.contentItem.findMany({
      where: { ownerId: user.id },
      include: { market: true },
      orderBy: { scheduledFor: "asc" },
      take: 8,
    }),
    prisma.productOrder.findMany({
      where: { requesterId: user.id },
      include: { product: true, market: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    user.role === "ADMIN" ? prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);
  const mine = templates.filter((template) =>
    auditAppliesTo(
      { active: template.active, assignRole: template.assignRole, assigneeIds: template.assignees.map((seat) => seat.userId) },
      user,
    ),
  );
  const doneIds = new Set(checks.filter((check) => check.done).map((check) => check.templateId));
  const team =
    user.role === "ADMIN"
      ? await teamAuditStatus(today, templates, people)
      : [];

  return (
    <>
      <header className="welcome">
        <div>
          <h1>
            Welcome, <b>{firstName(user.name)}</b>
          </h1>
          <p>Your checklist, tasks, content, and orders. Shared marketing boards live under Marketing.</p>
        </div>
        <p className="muted">{formatLongDate(today)}</p>
      </header>
      <div className="split">
        <section className="card">
          <h2>Daily audit</h2>
          {mine.length === 0 ? (
            <p className="muted">Nothing is assigned to you today.</p>
          ) : (
            <div className="stack">
              {mine.map((template) => (
                <form key={template.id} action={toggleAudit} className="list-row">
                  <input type="hidden" name="templateId" value={template.id} />
                  <input type="hidden" name="day" value={today} />
                  <label className="field check" style={{ flex: 1 }}>
                    <input type="checkbox" name="done" defaultChecked={doneIds.has(template.id)} />
                    <span>
                      {template.title}
                      {template.isDemo ? <span className="sample-tag">Sample</span> : null}
                      {template.details ? <small className="muted"> {template.details}</small> : null}
                    </span>
                  </label>
                  <button className="btn small secondary" type="submit">
                    Save
                  </button>
                </form>
              ))}
            </div>
          )}
          <p className="muted">
            {doneIds.size} of {mine.length} checked today. Past days stay in the history.
          </p>
          <Link href="/audit">See your audit history</Link>
        </section>
        <section className="card">
          <h2>Your tasks</h2>
          {tasks.length === 0 ? <p className="muted">No open tasks assigned to you.</p> : null}
          <div className="stack">
            {tasks.map((task) => (
              <div key={task.id} className="list-row">
                <div>
                  <strong>{task.title}</strong>
                  {task.isDemo ? <span className="sample-tag">Sample</span> : null}
                  <div className="muted">{task.market ? marketLabel(task.market) : "Any market"}</div>
                </div>
                <span className={task.dueOn && dateToIso(task.dueOn) < today ? "pill bad" : "muted"}>
                  {task.dueOn ? formatLongDate(dateToIso(task.dueOn)) : "No date"}
                </span>
              </div>
            ))}
          </div>
          <p>
            <Link href="/tasks">Open tasks</Link>
          </p>
        </section>
      </div>
      <div className="split section-gap">
        <section className="card">
          <h2>Your content</h2>
          {content.length === 0 ? <p className="muted">No content is assigned to you.</p> : null}
          {content.map((item) => (
            <div key={item.id} className="list-row">
              <div>
                <strong>{item.topic}</strong>
                {item.isDemo ? <span className="sample-tag">Sample</span> : null}
                <div className="muted">
                  {item.market ? marketLabel(item.market) : "No market"} · {item.status}
                </div>
              </div>
            </div>
          ))}
          <p>
            <Link href="/calendar">Open the calendar</Link>
          </p>
        </section>
        <section className="card">
          <h2>Your orders</h2>
          {orders.length === 0 ? <p className="muted">You have not requested a product yet.</p> : null}
          {orders.map((order) => (
            <div key={order.id} className="list-row">
              <div>
                <strong>
                  {order.quantity} × {order.product.name}
                </strong>
                {order.isDemo ? <span className="sample-tag">Sample</span> : null}
                <div className="muted">{order.market ? marketLabel(order.market) : "No market"}</div>
              </div>
              <span className="pill">{order.status}</span>
            </div>
          ))}
          <p>
            <Link href="/ordering">Order a product</Link>
          </p>
        </section>
      </div>
      {user.role === "ADMIN" ? (
        <section className="card section-gap">
          <h2>Team today</h2>
          <p className="muted">Who has finished the audits assigned to them, and how many tasks they still have open.</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Role</th>
                  <th className="num">Audit</th>
                  <th className="num">Open tasks</th>
                </tr>
              </thead>
              <tbody>
                {team.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.role === "ADMIN" ? "Admin" : "VA"}</td>
                    <td className="num">
                      {row.auditTotal === 0 ? "—" : `${row.auditDone} / ${row.auditTotal}`}
                    </td>
                    <td className="num">{row.openTasks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 style={{ marginTop: 18 }}>Audit templates</h3>
          <BoundForm action={saveAuditTemplate} submitLabel="Add audit item">
            <div className="fields">
              <Field label="Item">
                <input name="title" required />
              </Field>
              <Field label="Assign to">
                <select name="assignRole" defaultValue="VA">
                  <option value="VA">Every VA</option>
                  <option value="ADMIN">Every admin</option>
                  <option value="">No role — add people later</option>
                </select>
              </Field>
              <Field label="Details">
                <input name="details" />
              </Field>
            </div>
          </BoundForm>
        </section>
      ) : null}
    </>
  );
}

async function teamAuditStatus(
  today: string,
  templates: { id: string; active: boolean; assignRole: "ADMIN" | "VA" | null; assignees: { userId: string }[] }[],
  people: { id: string; name: string; role: "ADMIN" | "VA" }[],
) {
  const day = isoToUtcDate(today);
  const [checks, taskCounts] = await Promise.all([
    prisma.auditCheck.findMany({ where: { day, done: true } }),
    prisma.task.groupBy({
      by: ["ownerId"],
      where: { status: { not: "DONE" }, ownerId: { not: null } },
      _count: { _all: true },
    }),
  ]);
  const done = new Set(checks.map((check) => `${check.userId}:${check.templateId}`));
  const open = new Map(taskCounts.map((row) => [row.ownerId, row._count._all]));
  return people.map((person) => {
    const assigned = templates.filter((template) =>
      auditAppliesTo(
        { active: template.active, assignRole: template.assignRole, assigneeIds: template.assignees.map((seat) => seat.userId) },
        person,
      ),
    );
    return {
      ...person,
      auditTotal: assigned.length,
      auditDone: assigned.filter((template) => done.has(`${person.id}:${template.id}`)).length,
      openTasks: open.get(person.id) ?? 0,
    };
  });
}
