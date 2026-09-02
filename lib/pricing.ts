export type DeliveryKind = "delivery" | "collect";

export function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export function formatSgd(n: number) {
  const v = Number(n);
  return `S$${(Number.isFinite(v) ? v : 0).toFixed(2)}`;
}

export function computeTotals(input: {
  subtotal: number;
  deliveryKind: DeliveryKind;
  expressSlot?: boolean;
  minOrder?: number;
  deliveryFeeUnder?: number;
  freeDeliveryAt?: number;
  expressFee?: number;
  /** Discount applied to subtotal before delivery. Capped at subtotal. */
  discount?: number;
}) {
  const minOrder = input.minOrder ?? 50;
  const deliveryFeeUnder = input.deliveryFeeUnder ?? 15;
  const freeDeliveryAt = input.freeDeliveryAt ?? 120;
  const expressFee = input.expressFee ?? 40;
  const subtotal = roundMoney(input.subtotal);
  const belowMinimum = subtotal > 0 && subtotal < minOrder;
  const discount = roundMoney(
    Math.min(subtotal, Math.max(0, Number(input.discount) || 0))
  );
  let delivery = 0;
  if (input.deliveryKind === "delivery") {
    delivery = subtotal >= freeDeliveryAt ? 0 : deliveryFeeUnder;
    if (input.expressSlot) delivery += expressFee;
  }
  delivery = roundMoney(delivery);
  return {
    subtotal,
    discount,
    delivery,
    total: roundMoney(subtotal - discount + delivery),
    belowMinimum,
    minOrder,
    freeDeliveryAt,
  };
}

export function nextPayNowRef(seq: number, at = new Date()) {
  const y = at.getFullYear();
  const m = String(at.getMonth() + 1).padStart(2, "0");
  const d = String(at.getDate()).padStart(2, "0");
  return `AH-${y}${m}${d}-${String(seq).padStart(3, "0")}`;
}

export const ALLOWED_STATUSES = [
  "pending_payment",
  "payment_submitted",
  "paid",
  "in_production",
  "ready",
  "packing",
  "collected",
  "shipped",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ALLOWED_STATUSES)[number];

/** Orders that kitchen should pack / dispatch (legacy name kept for tests). */
export const PRODUCTION_STATUSES: OrderStatus[] = [
  "payment_submitted",
  "paid",
  "in_production",
  "ready",
  "packing",
  "collected",
  "shipped",
  "completed",
];

export const FULFILLMENT_STATUSES = PRODUCTION_STATUSES;

/** Kitchen-facing labels — no bake / in-production wording. */
export const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pending payment",
  payment_submitted: "Payment submitted",
  paid: "Paid",
  in_production: "Packing",
  packing: "Packing",
  ready: "Ready for pickup/dispatch",
  collected: "Collected",
  shipped: "Shipped",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function statusLabel(status: string) {
  return STATUS_LABELS[status] || status.replaceAll("_", " ");
}

/** Normalize packing aliases for board columns / filters. */
export function fulfillmentBucket(
  status: string
): "paid" | "packing" | "ready" | "collected" | "shipped" | "other" {
  if (status === "payment_submitted" || status === "paid") return "paid";
  if (status === "in_production" || status === "packing") return "packing";
  if (status === "ready") return "ready";
  if (status === "collected") return "collected";
  if (status === "shipped") return "shipped";
  return "other";
}

export const FULFILLMENT_COLUMNS: Array<{
  id: "paid" | "packing" | "ready" | "collected" | "shipped";
  label: string;
}> = [
  { id: "paid", label: "Paid" },
  { id: "packing", label: "Packing" },
  { id: "ready", label: "Ready for pickup/dispatch" },
  { id: "collected", label: "Collected" },
  { id: "shipped", label: "Shipped" },
];

export function isPaidLike(status: string) {
  return PRODUCTION_STATUSES.includes(status as OrderStatus);
}

/** Next status on the pack → dispatch path. */
export function nextFulfillmentStatus(
  status: string,
  deliveryKind?: string
): OrderStatus | null {
  const bucket = fulfillmentBucket(status);
  if (status === "payment_submitted") return "paid";
  if (bucket === "paid") return "packing";
  if (bucket === "packing") return "ready";
  if (bucket === "ready") {
    return deliveryKind === "collect" ? "collected" : "shipped";
  }
  return null;
}
