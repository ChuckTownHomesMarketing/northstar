import { HealthChart } from "@/components/health-chart";
import { Field, marketLabel } from "@/components/ui";
import { formatMonth } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { loadMarketingHealth } from "@/server/health-data";

export async function HealthPanel({ market }: { market?: string }) {
  const [report, markets] = await Promise.all([
    loadMarketingHealth(market),
    prisma.market.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <section className="card" aria-label="Marketing health">
      <div className="page-header">
        <div>
          <p className="eyebrow">Northstar Core</p>
          <h2>Marketing health</h2>
          <p className="muted">
            {formatMonth(report.year, report.month)}. Each bar is actual ÷ target, capped at 10. A lower cost per lead scores higher. Missing numbers stay “No data” and are left out of the overall score.
          </p>
        </div>
        <form className="filters" method="get">
          <Field label="Market">
            <select name="market" defaultValue={market ?? ""}>
              <option value="">All markets</option>
              {markets.map((item) => (
                <option key={item.id} value={item.slug}>
                  {marketLabel(item)}
                </option>
              ))}
            </select>
          </Field>
          <button className="btn" type="submit">
            Apply
          </button>
        </form>
      </div>
      <HealthChart dimensions={report.dimensions} overall={report.overall} />
      <div className="stack" style={{ marginTop: 14 }}>
        {report.dimensions.map((dimension) => (
          <p key={dimension.key} className="muted">
            <strong style={{ color: "inherit" }}>{dimension.label}.</strong> {dimension.actualLabel}. {dimension.targetLabel}.
          </p>
        ))}
      </div>
    </section>
  );
}
