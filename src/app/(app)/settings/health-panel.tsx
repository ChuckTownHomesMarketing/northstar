import { BoundForm } from "@/components/forms";
import { Field } from "@/components/ui";
import { HEALTH_DEFAULTS } from "@/lib/health";
import { prisma } from "@/lib/prisma";
import { saveHealthTargets } from "@/server/health-actions";

export async function HealthTargetsPanel() {
  const stored = await prisma.healthTarget.findMany();
  return (
    <section id="health" className="card section-gap">
      <h2>Marketing health targets</h2>
      <p className="muted">
        Lead, content, and review-count targets are per market and multiply when you view every market. Cost per lead, rating, and percents stay as one target. A missing number is shown as No data.
      </p>
      <BoundForm action={saveHealthTargets} submitLabel="Save targets">
        <div className="fields">
          {HEALTH_DEFAULTS.map((target) => {
            const row = stored.find((item) => item.key === target.key);
            return (
              <Field key={target.key} label={target.label} hint={target.direction === "lower" ? "Lower is better" : "Higher is better"}>
                <input name={target.key} defaultValue={row?.target ?? target.target} />
              </Field>
            );
          })}
          <Field label="New reviews target" hint="Per market, used with the rating target.">
            <input
              name="reviews:secondary"
              defaultValue={stored.find((item) => item.key === "reviews")?.secondaryTarget ?? 4}
            />
          </Field>
        </div>
      </BoundForm>
    </section>
  );
}
