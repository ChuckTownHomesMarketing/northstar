import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { addDays, formatLongDate, isoToUtcDate, todayIso } from "@/lib/dates";
import { auditAppliesTo } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export const metadata = { title: "Audit history" };

export default async function AuditHistoryPage() {
  const user = await requireUser();
  const today = todayIso();
  const days = Array.from({ length: 14 }, (_, index) => addDays(today, -index));
  const templates = await prisma.auditTemplate.findMany({ include: { assignees: true }, orderBy: { sortOrder: "asc" } });
  const mine = templates.filter((template) =>
    auditAppliesTo(
      { active: true, assignRole: template.assignRole, assigneeIds: template.assignees.map((seat) => seat.userId) },
      user,
    ),
  );
  const checks = await prisma.auditCheck.findMany({
    where: { userId: user.id, day: { gte: isoToUtcDate(days.at(-1) ?? today), lte: isoToUtcDate(today) } },
  });
  const done = new Set(checks.filter((check) => check.done).map((check) => `${check.templateId}:${check.day.toISOString().slice(0, 10)}`));

  return (
    <>
      <PageHeader eyebrow="Your history" title="Daily audit" lede="Only your checks are on this page." />
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Day</th>
              {mine.map((template) => (
                <th key={template.id}>{template.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day}>
                <td>{formatLongDate(day)}</td>
                {mine.map((template) => (
                  <td key={template.id}>{done.has(`${template.id}:${day}`) ? "Done" : "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        <Link href="/">Back to My Day</Link>
      </p>
    </>
  );
}
