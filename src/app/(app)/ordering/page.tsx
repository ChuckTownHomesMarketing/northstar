import Link from "next/link";
import { BoundForm } from "@/components/forms";
import { Field, PageHeader, marketLabel } from "@/components/ui";
import { formatMoneyFromCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/server/access";
import { requestOrder, saveProduct } from "@/server/order-actions";

export const metadata = { title: "Order products" };

export default async function OrderingPage() {
  const user = await requireModule("ordering");
  const [products, markets] = await Promise.all([
    prisma.catalogProduct.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.market.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Product ordering"
        title="Order marketing products"
        lede="Signs, print, business cards, and branded items. A request starts as Requested until an admin approves it."
        actions={
          <>
            <Link className="btn secondary" href="/ordering/history">
              Your history
            </Link>
            {user.role === "ADMIN" ? (
              <Link className="btn secondary" href="/ordering/queue">
                Approval queue
              </Link>
            ) : null}
          </>
        }
      />
      <div className="links">
        {products.map((product) => (
          <article key={product.id} className="card">
            <p className="eyebrow">{product.category}</p>
            <h3>
              {product.name}
              {product.isDemo ? <span className="sample-tag">Sample</span> : null}
            </h3>
            <p className="muted">{product.description}</p>
            <p>{product.unitPriceCents == null ? "Price on request" : formatMoneyFromCents(product.unitPriceCents)}</p>
            <BoundForm action={requestOrder} submitLabel="Request">
              <input type="hidden" name="productId" value={product.id} />
              <Field label="Quantity">
                <input name="quantity" defaultValue="1" required />
              </Field>
              <Field label="Market">
                <select name="marketId" defaultValue="">
                  <option value="">No market</option>
                  {markets.map((market) => (
                    <option key={market.id} value={market.id}>
                      {marketLabel(market)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Notes">
                <input name="notes" placeholder="Size, agent name, address" />
              </Field>
            </BoundForm>
          </article>
        ))}
      </div>
      {products.length === 0 ? (
        <div className="card empty section-gap">
          <h2>No products yet</h2>
          <p className="muted">An admin adds the catalog. Nothing here is a live store checkout.</p>
        </div>
      ) : null}
      {user.role === "ADMIN" ? (
        <section className="card section-gap">
          <h2>Add a product</h2>
          <BoundForm action={saveProduct} submitLabel="Save product">
            <div className="fields">
              <Field label="Name">
                <input name="name" required />
              </Field>
              <Field label="Category">
                <input name="category" required placeholder="Signs" />
              </Field>
              <Field label="Price" hint="Optional. Leave blank if it varies.">
                <input name="price" />
              </Field>
              <Field label="Description">
                <input name="description" />
              </Field>
              <label className="field check">
                <input type="checkbox" name="active" defaultChecked />
                <span>Available to order</span>
              </label>
            </div>
          </BoundForm>
        </section>
      ) : null}
    </>
  );
}
