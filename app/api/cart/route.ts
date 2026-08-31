import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { findVariant } from "@/lib/catalog";
import { CART_COOKIE, CART_COOKIE_OPTS, cartLineKey, readCart, writeCart } from "@/lib/cart";
import type { CartLine } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseOptions(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string" && v) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

async function validateOptions(sku: string, options: Record<string, string> | undefined) {
  const hit = await findVariant(sku);
  if (!hit) return "Unknown product";
  const fields = hit.product.additionalFields || [];
  const opts = options || {};
  for (const f of fields) {
    const val = opts[f.title];
    if (f.required) {
      if (!val) return `${f.title} is required`;
      if (!f.options.includes(val)) return `Invalid choice for ${f.title}`;
    } else if (val && !f.options.includes(val)) {
      return `Invalid choice for ${f.title}`;
    }
  }
  return null;
}

export async function POST(req: Request) {
  const body = await req.json();
  const sku = String(body.sku || "");
  const qty = Math.floor(Number(body.qty ?? 1));
  const op = body.op === "set" ? "set" : "add";
  const options = parseOptions(body.options);
  const hit = await findVariant(sku);
  if (!hit) return NextResponse.json({ error: "Unknown product" }, { status: 400 });
  if (op === "add" && !hit.variant.inStock) {
    return NextResponse.json({ error: "Sold out" }, { status: 400 });
  }
  if (op === "add") {
    const invalid = await validateOptions(sku, options);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  }
  const lines = await readCart();
  const key = cartLineKey(sku, options);
  const idx = lines.findIndex((l) => cartLineKey(l.sku, l.options) === key);
  const nextLine = (): CartLine => (options ? { sku, qty: Math.max(1, qty), options } : { sku, qty: Math.max(1, qty) });
  if (op === "set") {
    if (qty <= 0) {
      const next = lines.filter((l) => cartLineKey(l.sku, l.options) !== key);
      await writeCart(next);
      return cartResponse(next);
    }
    if (idx >= 0) lines[idx].qty = qty;
    else lines.push(nextLine());
    await writeCart(lines);
    return cartResponse(lines);
  }
  if (idx >= 0) lines[idx].qty += Math.max(1, qty);
  else lines.push(nextLine());
  await writeCart(lines);
  return cartResponse(lines);
}

function cartResponse(lines: CartLine[]) {
  revalidatePath("/", "layout");
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const res = NextResponse.json({ ok: true, count });
  res.cookies.set(CART_COOKIE, JSON.stringify(lines), CART_COOKIE_OPTS);
  return res;
}
