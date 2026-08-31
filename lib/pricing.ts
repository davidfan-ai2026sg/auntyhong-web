export type DeliveryKind = "delivery" | "collect";

export function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export function formatSgd(n: number) {
  return `S$${n.toFixed(2)}`;
}

export function computeTotals(input: {
  subtotal: number;
  deliveryKind: DeliveryKind;
  expressSlot?: boolean;
  minOrder?: number;
  deliveryFeeUnder?: number;
  freeDeliveryAt?: number;
  expressFee?: number;
}) {
  const minOrder = input.minOrder ?? 50;
  const deliveryFeeUnder = input.deliveryFeeUnder ?? 15;
  const freeDeliveryAt = input.freeDeliveryAt ?? 120;
  const expressFee = input.expressFee ?? 40;
  const subtotal = roundMoney(input.subtotal);
  const belowMinimum = subtotal > 0 && subtotal < minOrder;
  let delivery = 0;
  if (input.deliveryKind === "delivery") {
    delivery = subtotal >= freeDeliveryAt ? 0 : deliveryFeeUnder;
    if (input.expressSlot) delivery += expressFee;
  }
  delivery = roundMoney(delivery);
  return {
    subtotal,
    delivery,
    total: roundMoney(subtotal + delivery),
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
  "packing",
  "shipped",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ALLOWED_STATUSES)[number];
