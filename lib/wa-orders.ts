import { loadProducts, findVariantIn } from "@/lib/catalog";
import type { CartLine, OrderWithItems } from "@/lib/db";
import { listOrders } from "@/lib/db";

const CLIENT_TAG = "wa_client:";
const CHANNEL_TAG = "[whatsapp]";

export function waOrderApiKey(): string {
  return String(process.env.WA_ORDER_API_KEY || "").trim();
}

export function assertWaOrderAuth(req: Request): Response | null {
  const expected = waOrderApiKey();
  if (!expected) {
    return Response.json(
      { error: "WA_ORDER_API_KEY not configured" },
      { status: 503 }
    );
  }
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  const headerKey = (req.headers.get("x-wa-order-key") || "").trim();
  const got = bearer || headerKey;
  if (!got || got !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function siteBaseUrl(req?: Request): string {
  const explicit =
    String(process.env.NEXT_PUBLIC_SITE_URL || "").trim() ||
    String(process.env.SITE_URL || "").trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = String(process.env.VERCEL_URL || "").trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  if (req) {
    try {
      return new URL(req.url).origin;
    } catch {
      /* ignore */
    }
  }
  return "https://auntyhong-web.vercel.app";
}

export function payUrlForOrder(order: OrderWithItems, req?: Request): string {
  return `${siteBaseUrl(req)}/pay/${order.id}`;
}

export function buildWaNotes(input: {
  client_order_id?: string;
  notes?: string;
  wa_id: string;
}): string {
  const parts = [CHANNEL_TAG, `wa:${input.wa_id}`];
  if (input.client_order_id) parts.push(`${CLIENT_TAG}${input.client_order_id}`);
  if (input.notes?.trim()) parts.push(input.notes.trim());
  return parts.join(" ");
}

export function isWhatsAppOrder(order: OrderWithItems): boolean {
  return String(order.notes || "").includes(CHANNEL_TAG);
}

export async function findOrderByClientId(
  clientOrderId: string
): Promise<OrderWithItems | undefined> {
  const tag = `${CLIENT_TAG}${clientOrderId}`;
  const all = await listOrders();
  return all.find((o) => String(o.notes || "").includes(tag));
}

/** Resolve sku or product slug → cart lines. Options keys should match gift-box field titles. */
export async function resolveWaLines(
  raw: Array<{
    sku?: string;
    slug?: string;
    qty?: number;
    options?: Record<string, string>;
  }>
): Promise<CartLine[]> {
  const products = await loadProducts();
  const lines: CartLine[] = [];
  for (const row of raw) {
    const qty = Math.max(1, Math.floor(Number(row.qty) || 1));
    let sku = String(row.sku || "").trim();
    if (!sku && row.slug) {
      const p = products.find((x) => x.slug === row.slug);
      if (!p) throw new Error(`Unknown product slug: ${row.slug}`);
      sku = p.variants?.[0]?.sku || p.sku;
    }
    if (!sku) throw new Error("Each line needs sku or slug");
    const hit = findVariantIn(products, sku);
    if (!hit) throw new Error(`Unknown sku: ${sku}`);
    const options =
      row.options && Object.keys(row.options).length
        ? Object.fromEntries(
            Object.entries(row.options).map(([k, v]) => [k, String(v)])
          )
        : undefined;
    lines.push({ sku, qty, options });
  }
  if (!lines.length) throw new Error("lines required");
  return lines;
}

export async function notifyWaOrderPaid(order: OrderWithItems): Promise<void> {
  if (!isWhatsAppOrder(order)) return;
  const url = String(process.env.WA_ORDER_PAID_WEBHOOK_URL || "").trim();
  if (!url) return;
  const key =
    String(process.env.WA_ORDER_PAID_WEBHOOK_KEY || "").trim() ||
    waOrderApiKey();
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify({
        event: "wa_order_paid",
        orderId: order.id,
        order_no: order.order_no,
        wa_id: order.customer_phone,
        total: order.total,
        status: order.status,
        payment_method: order.payment_method,
      }),
    });
  } catch (e) {
    console.error("[wa] paid webhook failed", e);
  }
}
