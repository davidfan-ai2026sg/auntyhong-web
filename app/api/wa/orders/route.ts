import { NextResponse } from "next/server";
import { createOrder, type OrderWithItems } from "@/lib/db";
import type { DeliveryKind } from "@/lib/pricing";
import {
  assertWaOrderAuth,
  buildWaNotes,
  findOrderByClientId,
  payUrlForOrder,
  resolveWaLines,
} from "@/lib/wa-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseFulfillment(raw: unknown): DeliveryKind {
  const s = String(raw || "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (s === "collect" || s === "pickup" || s === "pick_up" || s === "collection") {
    return "collect";
  }
  return "delivery";
}

function normalizeWaPhone(wa: string): string {
  const digits = wa.replace(/\D/g, "");
  if (!digits) return wa.trim();
  return digits.startsWith("0") ? digits : digits;
}

function publicOrder(order: OrderWithItems, req: Request) {
  return {
    orderId: order.id,
    order_no: order.order_no,
    payUrl: payUrlForOrder(order, req),
    total: order.total,
    totalCents: Math.round(Number(order.total) * 100),
    status: order.status,
    currency: "SGD",
  };
}

export async function POST(req: Request) {
  const denied = assertWaOrderAuth(req);
  if (denied) return denied;

  try {
    const body = ((await req.json().catch(() => ({}))) || {}) as Record<
      string,
      unknown
    >;
    const waRaw = String(body.wa_id || body.customer_phone || "").trim();
    if (!waRaw) {
      return NextResponse.json({ error: "wa_id is required" }, { status: 400 });
    }
    const wa_id = normalizeWaPhone(waRaw);
    const client_order_id = String(body.client_order_id || "").trim();
    if (client_order_id) {
      const existing = await findOrderByClientId(client_order_id);
      if (existing) {
        return NextResponse.json({
          ...publicOrder(existing, req),
          reused: true,
        });
      }
    }

    const linesIn = Array.isArray(body.lines) ? body.lines : [];
    const lines = await resolveWaLines(
      linesIn as Array<{
        sku?: string;
        slug?: string;
        qty?: number;
        options?: Record<string, string>;
      }>
    );

    const fulfillment = parseFulfillment(
      body.fulfillment ?? body.delivery_kind ?? body.fulfilment
    );
    let address = String(body.address || "").trim();
    if (fulfillment === "delivery" && !address) {
      address = "Address to confirm via WhatsApp";
    }

    const name =
      String(body.customer_name || body.name || "").trim() ||
      `WhatsApp ${wa_id}`;

    const order = await createOrder({
      customer_name: name,
      customer_phone: wa_id,
      customer_email: String(body.customer_email || body.email || "").trim(),
      delivery_kind: fulfillment,
      address,
      notes: buildWaNotes({
        client_order_id: client_order_id || undefined,
        notes: String(body.notes || ""),
        wa_id,
      }),
      express_slot: Boolean(body.express_slot),
      lines,
      requested_date: String(body.requested_date || "").trim() || undefined,
      voucher_code: String(body.voucher_code || "").trim() || undefined,
    });

    return NextResponse.json(publicOrder(order, req), { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Create failed" },
      { status: 400 }
    );
  }
}
