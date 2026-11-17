import Link from "next/link";
import { AutoSelect, BoundForm, ConfirmSubmit } from "@/components/forms";
import { TaskBoard } from "@/components/task-board";
import { Field, PageHeader, marketLabel } from "@/components/ui";
import { dateToIso, formatLongDate, todayIso } from "@/lib/dates";
import { TASK_PRIORITIES, TASK_STATUSES, WEEKDAYS, labelFor } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/server/access";
import { visibleOwnerId } from "@/lib/permissions";
import { deleteTask, ensureRecurringTasks, saveTask, saveTemplate, toggleTemplate, updateTaskStatus } from "@/server/task-actions";

export const metadata = { title: "Tasks" };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; market?: string; owner?: string }>;
}) {
  const user = await requireModule("marketing");
  const params = await searchParams;
  const lockedOwner = visibleOwnerId(user, params.owner);
  const today = todayIso();
  await ensureRecurringTasks(today);
  const view = params.view === "list" ? "list" : "board";
  const [markets, people] = await Promise.all([
    prisma.market.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  const market = markets.find((item) => item.slug === params.market);
  const cutoff = new Date(`${today}T00:00:00.000Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 21);
  const tasks = await prisma.task.findMany({
    where: {
      ...(market ? { marketId: market.id } : {}),
      ...(lockedOwner ? { ownerId: lockedOwner } : {}),
      OR: [{ status: { not: "DONE" } }, { status: "DONE", dueOn: { gte: cutoff } }],
    },
    include: { market: true, owner: true },
    orderBy: [{ dueOn: "asc" }, { title: "asc" }],
  });
  const templates = await prisma.taskTemplate.findMany({
    include: { market: true, owner: true },
    orderBy: { title: "asc" },
  });
  const cards = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    details: task.details,
    market: task.market ? marketLabel(task.market) : null,
    owner: task.owner?.name ?? null,
    dueOn: task.dueOn ? formatLongDate(dateToIso(task.dueOn)) : null,
    priority: task.priority,
    status: task.status,
    overdue: Boolean(task.dueOn && task.status !== "DONE" && dateToIso(task.dueOn) < today),
    sample: task.isDemo,
  }));
  const hidden = { view, filterMarket: params.market ?? "", filterOwner: params.owner ?? "" };

  return (
    <>
      <PageHeader
        eyebrow="VA board"
        title="Tasks"
        lede="Drag a card to change its status, or use the list. Daily, weekly, and monthly templates land on the board for the current period."
        actions={
          <>
            <Link className={view === "board" ? "btn" : "btn secondary"} href={query(params, "board")}>
              Board
            </Link>
            <Link className={view === "list" ? "btn" : "btn secondary"} href={query(params, "list")}>
              List
            </Link>
          </>
        }
      />
      <form className="filters card" method="get">
        <input type="hidden" name="view" value={view} />
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
        <button className="btn" type="submit">
          Filter
        </button>
      </form>
      <div className="section-gap">
        {view === "board" ? (
          <TaskBoard tasks={cards} />
        ) : (
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Market</th>
                  <th>Owner</th>
                  <th>Due</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      {task.title}
                      {task.isDemo ? <span className="sample-tag">Sample</span> : null}
                      {task.details ? <div className="muted">{task.details}</div> : null}
                    </td>
                    <td>{task.market ? marketLabel(task.market) : "—"}</td>
                    <td>{task.owner?.name ?? "—"}</td>
                    <td>
                      {task.dueOn ? formatLongDate(dateToIso(task.dueOn)) : "—"}
                      {task.dueOn && task.status !== "DONE" && dateToIso(task.dueOn) < today ? (
                        <span className="pill bad">Overdue</span>
                      ) : null}
                    </td>
                    <td>{labelFor(TASK_PRIORITIES, task.priority)}</td>
                    <td>
                      <AutoSelect
                        action={updateTaskStatus}
                        id={task.id}
                        name="status"
                        value={task.status}
                        options={TASK_STATUSES}
                        label={`Status for ${task.title}`}
                      />
                    </td>
                    <td>
                      <ConfirmSubmit action={deleteTask} id={task.id} label="Remove" message="Remove this task?" hidden={hidden} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="split section-gap">
        <section className="card">
          <h2>Add a task</h2>
          <BoundForm action={saveTask} submitLabel="Add task">
            <input type="hidden" name="view" value={view} />
            <div className="fields">
              <Field label="Task">
                <input name="title" required />
              </Field>
              <Field label="Market">
                <select name="marketId" defaultValue={market?.id ?? ""}>
                  <option value="">Any market</option>
                  {markets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {marketLabel(item)}
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
              <Field label="Due date">
                <input type="date" name="dueOn" />
              </Field>
              <Field label="Priority">
                <select name="priority" defaultValue="MEDIUM">
                  {TASK_PRIORITIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select name="status" defaultValue="TODO">
                  {TASK_STATUSES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Details">
                <textarea name="details" />
              </Field>
            </div>
          </BoundForm>
        </section>
        <section className="card">
          <h2>Recurring templates</h2>
          <div className="stack">
            {templates.map((template) => (
              <div key={template.id} className="list-row">
                <div>
                  <strong>{template.title}</strong>
                  {template.isDemo ? <span className="sample-tag">Sample</span> : null}
                  <div className="muted">
                    {template.recurrence.toLowerCase()}
                    {template.weekday ? ` · ${WEEKDAYS.find((day) => day.value === String(template.weekday))?.label}` : ""}
                    {template.dayOfMonth ? ` · day ${template.dayOfMonth}` : ""}
                    {template.owner ? ` · ${template.owner.name}` : ""}
                    {template.active ? "" : " · paused"}
                  </div>
                </div>
                <form action={toggleTemplate}>
                  <input type="hidden" name="id" value={template.id} />
                  <button className="btn small secondary" type="submit">
                    {template.active ? "Pause" : "Resume"}
                  </button>
                </form>
              </div>
            ))}
          </div>
          <h3 style={{ marginTop: 18 }}>New template</h3>
          <BoundForm action={saveTemplate} submitLabel="Save template">
            <div className="fields">
              <Field label="Task">
                <input name="title" required />
              </Field>
              <Field label="Repeats">
                <select name="recurrence" defaultValue="WEEKLY">
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </Field>
              <Field label="Weekday" hint="Used for weekly tasks.">
                <select name="weekday" defaultValue="1">
                  {WEEKDAYS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Day of month" hint="1–28, used for monthly tasks.">
                <input name="dayOfMonth" inputMode="numeric" defaultValue="1" />
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
              <Field label="Priority">
                <select name="priority" defaultValue="MEDIUM">
                  {TASK_PRIORITIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Details">
                <textarea name="details" />
              </Field>
            </div>
          </BoundForm>
        </section>
      </div>
    </>
  );
}

function query(params: { market?: string; owner?: string }, view: string) {
  const search = new URLSearchParams({ view });
  if (params.market) search.set("market", params.market);
  if (params.owner) search.set("owner", params.owner);
  return `/tasks?${search.toString()}`;
}
