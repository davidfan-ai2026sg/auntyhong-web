import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { findVariant } from "@/lib/catalog";
import { readCart, writeCart } from "@/lib/cart";

export async function POST(req: Request) {
  const body = await req.json();
  const sku = String(body.sku || "");
  const qty = Math.floor(Number(body.qty ?? 1));
  const op = body.op === "set" ? "set" : "add";
  const hit = findVariant(sku);
  if (!hit) return NextResponse.json({ error: "Unknown product" }, { status: 400 });
  if (op === "add" && !hit.variant.inStock) {
    return NextResponse.json({ error: "Sold out" }, { status: 400 });
  }
  const lines = await readCart();
  const idx = lines.findIndex((l) => l.sku === sku);
  if (op === "set") {
    if (qty <= 0) {
      await writeCart(lines.filter((l) => l.sku !== sku));
    } else if (idx >= 0) lines[idx].qty = qty;
    else lines.push({ sku, qty });
    if (qty > 0) await writeCart(lines);
  } else {
    if (idx >= 0) lines[idx].qty += Math.max(1, qty);
    else lines.push({ sku, qty: Math.max(1, qty) });
    await writeCart(lines);
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
