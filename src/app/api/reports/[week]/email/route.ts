import { mondayOf, parseIsoDate } from "@/lib/dates";
import { loadReport } from "@/server/report-data";
import { getUser } from "@/server/session";

export async function GET(_request: Request, context: { params: Promise<{ week: string }> }) {
  const user = await getUser();
  if (!user) return new Response("Sign in required.", { status: 401 });
  const { week: raw } = await context.params;
  if (!parseIsoDate(raw)) return new Response("Unknown week.", { status: 404 });
  const week = mondayOf(raw);
  const { email } = await loadReport(week);
  return new Response(email, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="northstar-week-${week}.txt"`,
    },
  });
}
