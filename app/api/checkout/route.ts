import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { readCart, writeCart } from "@/lib/cart";
import { createOrder } from "@/lib/db";
import type { DeliveryKind } from "@/lib/pricing";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lines = await readCart();
    const order = createOrder({
      customer_name: String(body.customer_name || ""),
      customer_phone: String(body.customer_phone || ""),
      customer_email: String(body.customer_email || ""),
      delivery_kind: (body.delivery_kind === "collect" ? "collect" : "delivery") as DeliveryKind,
      address: String(body.address || ""),
      notes: String(body.notes || ""),
      express_slot: Boolean(body.express_slot),
      lines,
    });
    await writeCart([]);
    revalidatePath("/", "layout");
    return NextResponse.json({ id: order.id, ref: order.paynow_ref });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Checkout failed" },
      { status: 400 }
    );
  }
}
