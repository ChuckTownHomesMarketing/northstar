"use server";

import { revalidatePath } from "next/cache";
import { clip, oneOf, read } from "@/lib/forms";
import { dollarsToCents, parseOptionalInt } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/server/session";
import { fail, saved, type ActionState } from "@/server/state";

const STATUSES = ["REQUESTED", "APPROVED", "ORDERED", "DELIVERED"] as const;

export async function saveProduct(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = clip(read(formData, "name"), 120, "Product");
  const category = clip(read(formData, "category"), 60, "Category");
  if (!name || !category) return fail("Name and category are required.");
  let unitPriceCents: number | null = null;
  try {
    unitPriceCents = dollarsToCents(read(formData, "price"));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Check the price.");
  }
  const data = {
    name,
    category,
    description: clip(read(formData, "description"), 1000, "Description") || null,
    unitPriceCents,
    active: formData.get("active") === "on",
  };
  const id = read(formData, "id");
  if (id) await prisma.catalogProduct.update({ where: { id }, data });
  else await prisma.catalogProduct.create({ data });
  revalidatePath("/ordering");
  saved("/ordering", "Product saved.");
}

export async function requestOrder(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const productId = read(formData, "productId");
  const product = await prisma.catalogProduct.findUnique({ where: { id: productId } });
  if (!product || !product.active) return fail("Choose a product that is still available.");
  let quantity: number | null;
  try {
    quantity = parseOptionalInt(read(formData, "quantity"));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Check the quantity.");
  }
  if (!quantity || quantity < 1) return fail("Enter a quantity of at least 1.");
  await prisma.productOrder.create({
    data: {
      productId,
      quantity,
      requesterId: user.id,
      marketId: read(formData, "marketId") || null,
      notes: clip(read(formData, "notes"), 2000, "Notes") || null,
      status: "REQUESTED",
    },
  });
  revalidatePath("/ordering");
  revalidatePath("/");
  saved("/ordering/history", "Request sent to Avery.");
}

export async function updateOrderStatus(formData: FormData) {
  await requireAdmin();
  const id = read(formData, "id");
  const status = oneOf(read(formData, "status"), STATUSES);
  if (!id || !status) return;
  await prisma.productOrder.update({
    where: { id },
    data: { status, adminNote: clip(read(formData, "adminNote"), 500, "Note") || null },
  });
  revalidatePath("/ordering/queue");
  revalidatePath("/ordering/history");
}
