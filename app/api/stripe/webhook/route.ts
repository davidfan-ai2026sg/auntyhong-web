import { NextResponse } from "next/server";
import { markOrderPaid } from "@/lib/db";
import { getStripe, stripeSecretKey } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe || !stripeSecretKey()) {
    return NextResponse.json({ received: true, note: "Stripe not configured" });
  }
  const secret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  const raw = await req.text();
  let event;
  try {
    if (secret) {
      const sig = req.headers.get("stripe-signature") || "";
      event = stripe.webhooks.constructEvent(raw, sig, secret);
    } else {
      event = JSON.parse(raw);
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid payload" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      metadata?: { orderId?: string };
      client_reference_id?: string | null;
      payment_status?: string;
    };
    if (session.payment_status && session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }
    const id = Number(session.metadata?.orderId || session.client_reference_id || 0);
    if (id > 0) {
      await markOrderPaid(id, "stripe");
    }
  }
  return NextResponse.json({ received: true });
}
