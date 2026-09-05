import { NextResponse } from "next/server";
import { findCustomerOrder, getOrderAnywhere } from "@/lib/db";
import { assertWaOrderAuth, isWhatsAppOrder, payUrlForOrder } from "@/lib/wa-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const denied = assertWaOrderAuth(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const asNum = Number(id);
  const order =
    (Number.isFinite(asNum) && asNum > 0
      ? await getOrderAnywhere(asNum)
      : undefined) || (await findCustomerOrder(id));

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    orderId: order.id,
    order_no: order.order_no,
    payUrl: payUrlForOrder(order, req),
    total: order.total,
    status: order.status,
    payment_method: order.payment_method,
    wa_id: order.customer_phone,
    whatsapp: isWhatsAppOrder(order),
    items: order.items,
    fulfillment: order.delivery_kind,
    address: order.address,
    notes: order.notes,
  });
}
