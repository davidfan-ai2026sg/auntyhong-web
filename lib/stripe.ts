import Stripe from "stripe";

/** True when a TEST secret key is present. Live keys are refused. */
export function stripeSecretKey(): string {
  const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!key) return "";
  if (key.startsWith("sk_live_")) return "";
  if (!key.startsWith("sk_test_")) return "";
  return key;
}

export function stripePublishableKey(): string {
  const key = String(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "").trim();
  if (!key) return "";
  if (key.startsWith("pk_live_")) return "";
  if (!key.startsWith("pk_test_")) return "";
  return key;
}

export function stripeConfigured(): boolean {
  return Boolean(stripeSecretKey());
}

export function stripeClientFacing(): boolean {
  return Boolean(stripeSecretKey() && stripePublishableKey());
}

let cached: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  const key = stripeSecretKey();
  if (!key) return null;
  if (cached !== undefined) return cached;
  cached = new Stripe(key);
  return cached;
}

/** SGD dollars → integer cents for PaymentIntent / Checkout. */
export function orderAmountCents(total: number): number {
  const n = Number(total);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

/** Parse orderId from a payment-intent request body. */
export function parsePaymentIntentOrderId(body: { orderId?: unknown }): number {
  const id = Number(body?.orderId);
  if (!Number.isFinite(id) || id <= 0) return 0;
  return Math.floor(id);
}
