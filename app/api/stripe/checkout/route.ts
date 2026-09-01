import { NextResponse } from "next/server";
import { getOrderAnywhere } from "@/lib/db";
import { getStripe, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const order = await getOrderAnywhere(Number(body.orderId));
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.status !== "pending_payment") {
      return NextResponse.json({ error: "Already processed" }, { status: 400 });
    }
    const origin = new URL(req.url).origin;
    const line_items = [
      ...order.items.map((it) => ({
        quantity: it.qty,
        price_data: {
          currency: "sgd",
          unit_amount: Math.round(Number(it.unit_price) * 100),
          product_data: {
            name: it.product_title,
            description: it.variant_label || undefined,
          },
        },
      })),
    ];
    if (order.delivery_fee > 0) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency: "sgd",
          unit_amount: Math.round(Number(order.delivery_fee) * 100),
          product_data: { name: "Delivery", description: undefined },
        },
      });
    }
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // card enables Apple Pay / Google Pay wallets when the browser + Stripe Dashboard allow them
      payment_method_types: ["card"],
      line_items,
      customer_email: order.customer_email || undefined,
      client_reference_id: String(order.id),
      metadata: {
        orderId: String(order.id),
        order_no: order.order_no,
        paynow_ref: order.paynow_ref,
      },
      success_url: `${origin}/order/${order.id}?paid=stripe&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pay/${order.id}?cancelled=1`,
    });
    if (!session.url) {
      return NextResponse.json({ error: "Could not start Checkout" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, url: session.url, id: session.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Stripe checkout failed" },
      { status: 400 }
    );
  }
}
