import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { CART_COOKIE, CART_COOKIE_OPTS, readCart, writeCart } from "@/lib/cart";
import { createOrder, ORDER_COOKIE, ORDER_COOKIE_OPTS, persistOrder } from "@/lib/db";
import type { DeliveryKind } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseDeliveryKind(body: Record<string, unknown>): DeliveryKind {
  const raw = String(body.delivery_kind ?? body.fulfilment ?? body.fulfillment ?? "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (raw === "collect" || raw === "pickup" || raw === "pick_up" || raw === "collection") {
    return "collect";
  }
  return "delivery";
}

export async function POST(req: Request) {
  try {
    const body = ((await req.json().catch(() => ({}))) || {}) as Record<string, unknown>;
    const lines = await readCart();
    const deliveryKind = parseDeliveryKind(body);
    const order = await createOrder({
      customer_name: String(body.customer_name || ""),
      customer_phone: String(body.customer_phone || ""),
      customer_email: String(body.customer_email || ""),
      delivery_kind: deliveryKind,
      address: String(body.address || ""),
      notes: String(body.notes || ""),
      express_slot: deliveryKind === "delivery" && Boolean(body.express_slot),
      lines,
    });
    const stored = await persistOrder(order);
    await writeCart([]);
    revalidatePath("/", "layout");
    const res = NextResponse.json({ id: order.id, ref: order.paynow_ref });
    res.cookies.set(CART_COOKIE, "[]", CART_COOKIE_OPTS);
    res.cookies.set(ORDER_COOKIE, JSON.stringify(stored), ORDER_COOKIE_OPTS);
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Checkout failed" },
      { status: 400 }
    );
  }
}
