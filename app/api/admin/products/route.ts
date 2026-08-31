import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import {
  deleteProduct,
  getProduct,
  listProducts,
  setProductStock,
  updateProduct,
  upsertProduct,
  type ProductWrite,
} from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const products = await listProducts();
  return NextResponse.json({ ok: true, products });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action || "");
  try {
    if (action === "create") {
      const product = (body.product || {}) as ProductWrite;
      if (!product.title || !String(product.title).trim()) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 });
      }
      const created = await upsertProduct({ ...product, title: String(product.title).trim() });
      return NextResponse.json({ ok: true, product: created });
    }
    if (action === "update") {
      const slug = String(body.slug || "");
      if (!slug) return NextResponse.json({ error: "Slug is required" }, { status: 400 });
      const existing = await getProduct(slug);
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const patch = (body.patch || {}) as Partial<ProductWrite>;
      const updated = await updateProduct(slug, patch);
      return NextResponse.json({ ok: true, product: updated });
    }
    if (action === "delete") {
      const slug = String(body.slug || "");
      if (!slug) return NextResponse.json({ error: "Slug is required" }, { status: 400 });
      const ok = await deleteProduct(slug);
      if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ ok: true, products: await listProducts() });
    }
    if (action === "stock") {
      const slug = String(body.slug || "");
      if (!slug) return NextResponse.json({ error: "Slug is required" }, { status: 400 });
      const existing = await getProduct(slug);
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const product = await setProductStock({
        slug,
        sku: body.sku != null ? String(body.sku) : undefined,
        stock: body.stock != null ? Number(body.stock) : undefined,
        unlimited: body.unlimited != null ? Boolean(body.unlimited) : undefined,
        soldOut: body.soldOut != null ? Boolean(body.soldOut) : undefined,
        inStock: body.inStock != null ? Boolean(body.inStock) : undefined,
      });
      return NextResponse.json({ ok: true, product });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    const status = /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
