import Link from "next/link";
import { PageHeader, marketLabel } from "@/components/ui";
import { formatLongDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/server/access";

export const metadata = { title: "Order history" };

const LABELS: Record<string, string> = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  ORDERED: "Ordered",
  DELIVERED: "Delivered",
};

export default async function OrderHistoryPage() {
  const user = await requireModule("ordering");
  const orders = await prisma.productOrder.findMany({
    where: user.role === "ADMIN" ? {} : { requesterId: user.id },
    include: { product: true, market: true, requester: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader
        eyebrow="Product ordering"
        title={user.role === "ADMIN" ? "All orders" : "Your orders"}
        lede={user.role === "ADMIN" ? "Every request, newest first." : "Only the orders you requested."}
        actions={
          <Link className="btn secondary" href="/ordering">
            Catalog
          </Link>
        }
      />
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Product</th>
              <th className="num">Qty</th>
              {user.role === "ADMIN" ? <th>Person</th> : null}
              <th>Market</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{formatLongDate(order.createdAt.toISOString().slice(0, 10))}</td>
                <td>
                  {order.product.name}
                  {order.isDemo ? <span className="sample-tag">Sample</span> : null}
                </td>
                <td className="num">{order.quantity}</td>
                {user.role === "ADMIN" ? <td>{order.requester.name}</td> : null}
                <td>{order.market ? marketLabel(order.market) : "—"}</td>
                <td>{LABELS[order.status] ?? order.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 ? <p className="muted">No orders yet.</p> : null}
      </div>
    </>
  );
}
