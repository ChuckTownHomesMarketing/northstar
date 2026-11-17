import { PageHeader, marketLabel } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/session";
import { updateOrderStatus } from "@/server/order-actions";

export const metadata = { title: "Approval queue" };

const OPTIONS = [
  ["REQUESTED", "Requested"],
  ["APPROVED", "Approved"],
  ["ORDERED", "Ordered"],
  ["DELIVERED", "Delivered"],
] as const;

export default async function OrderQueuePage() {
  await requireAdmin();
  const orders = await prisma.productOrder.findMany({
    where: { status: { not: "DELIVERED" } },
    include: { product: true, requester: true, market: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <PageHeader
        eyebrow="Product ordering"
        title="Approval queue"
        lede="Move a request from Requested to Approved, Ordered, or Delivered."
      />
      {orders.length === 0 ? (
        <div className="card empty">
          <h2>Nothing waiting</h2>
          <p className="muted">Delivered orders stay in the history.</p>
        </div>
      ) : (
        <div className="stack">
          {orders.map((order) => (
            <article key={order.id} className="card">
              <h3>
                {order.quantity} × {order.product.name}
                {order.isDemo ? <span className="sample-tag">Sample</span> : null}
              </h3>
              <p className="muted">
                {order.requester.name}
                {order.market ? ` · ${marketLabel(order.market)}` : ""}
                {order.notes ? ` · ${order.notes}` : ""}
              </p>
              <form action={updateOrderStatus} className="filters">
                <input type="hidden" name="id" value={order.id} />
                <select name="status" defaultValue={order.status} aria-label="Status">
                  {OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input name="adminNote" placeholder="Note for the team" defaultValue={order.adminNote ?? ""} />
                <button className="btn" type="submit">
                  Update
                </button>
              </form>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
