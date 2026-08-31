import { NextResponse } from "next/server";
import { getOrder, ORDER_COOKIE, ORDER_COOKIE_OPTS, persistOrder, setOrderStatus } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  const order = await getOrder(Number(body.orderId));
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "pending_payment") {
    return NextResponse.json({ error: "Already processed" }, { status: 400 });
  }
  if (body.kind === "paynow") {
    const updated = await setOrderStatus(order.id, "payment_submitted", "paynow");
    const stored = updated ? await persistOrder(updated) : [];
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ORDER_COOKIE, JSON.stringify(stored), ORDER_COOKIE_OPTS);
    return res;
  }
  if (body.kind === "card") {
    if (process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe Checkout is not wired in this demo. Use PayNow instead." },
        { status: 400 }
      );
    }
    if (process.env.DEMO_PAYMENTS === "0") {
      return NextResponse.json({ error: "Card simulation is off" }, { status: 400 });
    }
    const updated = await setOrderStatus(order.id, "payment_submitted", "demo_card");
    const stored = updated ? await persistOrder(updated) : [];
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ORDER_COOKIE, JSON.stringify(stored), ORDER_COOKIE_OPTS);
    return res;
  }
  return NextResponse.json({ error: "Unknown payment kind" }, { status: 400 });
}
