import { NextResponse } from "next/server";
import { getOrderAnywhere, rememberStripePaymentIntent } from "@/lib/db";
import {
  getStripe,
  orderAmountCents,
  parsePaymentIntentOrderId,
  stripeConfigured,
} from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REUSABLE = new Set([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
]);

export async function POST(req: Request) {
  try {
    if (!stripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe test keys not configured. Use PayNow demo instead." },
        { status: 400 }
      );
    }
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe unavailable" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as { orderId?: unknown };
    const orderId = parsePaymentIntentOrderId(body);
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const order = await getOrderAnywhere(orderId);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.status !== "pending_payment") {
      return NextResponse.json({ error: "Already processed" }, { status: 400 });
    }

    const amount = orderAmountCents(Number(order.total));
    if (amount < 50) {
      return NextResponse.json({ error: "Order total too small for card pay" }, { status: 400 });
    }

    const existingId = String(order.stripe_payment_intent_id || "").trim();
    if (existingId) {
      try {
        const existing = await stripe.paymentIntents.retrieve(existingId);
        if (
          existing &&
          existing.currency === "sgd" &&
          existing.amount === amount &&
          REUSABLE.has(existing.status) &&
          existing.client_secret
        ) {
          return NextResponse.json({
            ok: true,
            clientSecret: existing.client_secret,
            paymentIntentId: existing.id,
          });
        }
      } catch {
        /* create a fresh PI below */
      }
    }

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: "sgd",
      automatic_payment_methods: { enabled: true },
      receipt_email: order.customer_email || undefined,
      metadata: {
        orderId: String(order.id),
        order_no: order.order_no,
        paynow_ref: order.paynow_ref,
      },
      description: `Aunty Hong order ${order.order_no}`,
    });

    if (!intent.client_secret) {
      return NextResponse.json({ error: "Could not start card payment" }, { status: 500 });
    }

    await rememberStripePaymentIntent(order.id, intent.id);

    return NextResponse.json({
      ok: true,
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "PaymentIntent failed" },
      { status: 400 }
    );
  }
}
