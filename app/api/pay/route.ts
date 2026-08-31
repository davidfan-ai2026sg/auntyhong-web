import { NextResponse } from "next/server";
import { getOrder, setOrderStatus } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  const order = getOrder(Number(body.orderId));
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "pending_payment") {
    return NextResponse.json({ error: "Already processed" }, { status: 400 });
  }
  if (body.kind === "paynow") {
    setOrderStatus(order.id, "payment_submitted", "paynow");
    return NextResponse.json({ ok: true });
  }
  if (body.kind === "card") {
    if (process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe Checkout is not wired in this demo. Use PayNow or DEMO_PAYMENTS." },
        { status: 400 }
      );
    }
    if (process.env.DEMO_PAYMENTS !== "1") {
      return NextResponse.json({ error: "Card simulation is off" }, { status: 400 });
    }
    setOrderStatus(order.id, "payment_submitted", "demo_card");
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown payment kind" }, { status: 400 });
}
