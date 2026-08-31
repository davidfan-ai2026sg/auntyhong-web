"use client";

import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { formatSgd } from "@/lib/pricing";

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function ProductDesk({ products }: { products: Product[] }) {
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  async function run(body: Record<string, unknown>) {
    setErr("");
    try {
      await post(body);
      window.location.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    }
  }

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const categories = String(fd.get("categories") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    await run({
      action: "create",
      product: {
        title: String(fd.get("title") || "").trim(),
        slug: String(fd.get("slug") || "").trim() || undefined,
        sku: String(fd.get("sku") || "").trim() || undefined,
        price: Number(fd.get("price") || 0),
        stock: Number(fd.get("stock") || 0),
        unlimited: fd.get("unlimited") === "on",
        soldOut: fd.get("soldOut") === "on",
        description: String(fd.get("description") || ""),
        image: String(fd.get("image") || ""),
        categories: categories.length ? categories : ["Shop"],
        label: "Standard",
      },
    });
  }

  async function onUpdate(e: React.FormEvent<HTMLFormElement>, slug: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const categories = String(fd.get("categories") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    await run({
      action: "update",
      slug,
      patch: {
        title: String(fd.get("title") || "").trim(),
        sku: String(fd.get("sku") || "").trim(),
        price: Number(fd.get("price") || 0),
        stock: Number(fd.get("stock") || 0),
        unlimited: fd.get("unlimited") === "on",
        soldOut: fd.get("soldOut") === "on",
        description: String(fd.get("description") || ""),
        image: String(fd.get("image") || ""),
        categories,
      },
    });
  }

  async function onStock(e: React.FormEvent<HTMLFormElement>, product: Product) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await run({
      action: "stock",
      slug: product.slug,
      sku: product.variants[0]?.sku,
      stock: Number(fd.get("stock") || 0),
      unlimited: fd.get("unlimited") === "on",
      soldOut: fd.get("soldOut") === "on",
    });
  }

  async function onDelete(slug: string, title: string) {
    if (!window.confirm(`Delete ${title}? This cannot be undone.`)) return;
    await run({ action: "delete", slug });
  }

  return (
    <div className="mt-8 space-y-10">
      {err ? <p className="text-cinnabar text-sm">{err}</p> : null}

      <section className="border border-sand p-5">
        <p className="kicker">New tin</p>
        <h2 className="display mt-1 text-3xl">Add product</h2>
        <form onSubmit={onCreate} className="mt-5 grid sm:grid-cols-2 gap-4">
          <label className="block text-sm sm:col-span-2">
            Title
            <input name="title" required className="mt-1 w-full border border-sand bg-parchment px-3 py-2" />
          </label>
          <label className="block text-sm">
            Slug (optional)
            <input name="slug" className="mt-1 w-full border border-sand bg-parchment px-3 py-2" />
          </label>
          <label className="block text-sm">
            SKU (optional)
            <input name="sku" className="mt-1 w-full border border-sand bg-parchment px-3 py-2" />
          </label>
          <label className="block text-sm">
            Price
            <input name="price" type="number" step="0.01" defaultValue={0} className="mt-1 w-full border border-sand bg-parchment px-3 py-2" />
          </label>
          <label className="block text-sm">
            Stock
            <input name="stock" type="number" defaultValue={0} className="mt-1 w-full border border-sand bg-parchment px-3 py-2" />
          </label>
          <label className="block text-sm sm:col-span-2">
            Image URL
            <input name="image" className="mt-1 w-full border border-sand bg-parchment px-3 py-2" />
          </label>
          <label className="block text-sm sm:col-span-2">
            Categories (comma-separated)
            <input name="categories" defaultValue="Shop" className="mt-1 w-full border border-sand bg-parchment px-3 py-2" />
          </label>
          <label className="block text-sm sm:col-span-2">
            Description
            <textarea name="description" rows={3} className="mt-1 w-full border border-sand bg-parchment px-3 py-2" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="unlimited" /> Unlimited stock
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="soldOut" /> Sold out
          </label>
          <div className="sm:col-span-2">
            <button className="bg-cocoa text-parchment px-6 py-3 text-sm">Add to catalogue</button>
          </div>
        </form>
      </section>

      <section>
        <p className="kicker">Live catalogue</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-sand">
                <th className="py-2">Title</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Sold out</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const v = p.variants[0];
                return (
                  <tr key={p.slug} className="border-b border-sand/70 align-top">
                    <td className="py-4">
                      <p className="font-medium">{p.title}</p>
                      <p className="text-xs text-cocoa/50">{p.slug}</p>
                    </td>
                    <td className="py-4">{v?.sku || p.sku}</td>
                    <td className="py-4">{formatSgd(v?.price ?? p.fromPrice)}</td>
                    <td className="py-4" colSpan={3}>
                      <form onSubmit={(e) => onStock(e, p)} className="flex flex-wrap items-center gap-3">
                        <input
                          name="stock"
                          type="number"
                          defaultValue={v?.stock ?? 0}
                          className="w-20 border border-sand bg-parchment px-2 py-1"
                        />
                        <label className="flex items-center gap-1 text-xs">
                          <input type="checkbox" name="unlimited" defaultChecked={v?.unlimited} /> Unlimited
                        </label>
                        <label className="flex items-center gap-1 text-xs">
                          <input type="checkbox" name="soldOut" defaultChecked={p.soldOut} /> Sold out
                        </label>
                        <button className="border border-sand px-3 py-1 text-xs">Save</button>
                        <button
                          type="button"
                          className="text-xs border-b border-gold"
                          onClick={() => setOpen(open === p.slug ? null : p.slug)}
                        >
                          {open === p.slug ? "Close" : "Edit"}
                        </button>
                        <button
                          type="button"
                          className="text-xs text-cinnabar"
                          onClick={() => onDelete(p.slug, p.title)}
                        >
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {products.map((p) => {
          if (open !== p.slug) return null;
          const v = p.variants[0];
          return (
            <form
              key={`edit-${p.slug}`}
              onSubmit={(e) => onUpdate(e, p.slug)}
              className="mt-6 border border-sand p-5 grid sm:grid-cols-2 gap-4"
            >
              <p className="kicker sm:col-span-2">Edit {p.title}</p>
              <label className="block text-sm sm:col-span-2">
                Title
                <input name="title" defaultValue={p.title} className="mt-1 w-full border border-sand bg-parchment px-3 py-2" />
              </label>
              <label className="block text-sm">
                Slug
                <input name="slug" defaultValue={p.slug} readOnly className="mt-1 w-full border border-sand bg-parchment px-3 py-2 opacity-70" />
              </label>
              <label className="block text-sm">
                SKU
                <input name="sku" defaultValue={v?.sku || p.sku} className="mt-1 w-full border border-sand bg-parchment px-3 py-2" />
              </label>
              <label className="block text-sm">
                Price
                <input name="price" type="number" step="0.01" defaultValue={v?.price ?? p.fromPrice} className="mt-1 w-full border border-sand bg-parchment px-3 py-2" />
              </label>
              <label className="block text-sm">
                Stock
                <input name="stock" type="number" defaultValue={v?.stock ?? 0} className="mt-1 w-full border border-sand bg-parchment px-3 py-2" />
              </label>
              <label className="block text-sm sm:col-span-2">
                Image URL
                <input name="image" defaultValue={p.image} className="mt-1 w-full border border-sand bg-parchment px-3 py-2" />
              </label>
              <label className="block text-sm sm:col-span-2">
                Categories (comma-separated)
                <input name="categories" defaultValue={p.categories.join(", ")} className="mt-1 w-full border border-sand bg-parchment px-3 py-2" />
              </label>
              <label className="block text-sm sm:col-span-2">
                Description
                <textarea name="description" rows={4} defaultValue={p.description} className="mt-1 w-full border border-sand bg-parchment px-3 py-2" />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="unlimited" defaultChecked={v?.unlimited} /> Unlimited stock
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="soldOut" defaultChecked={p.soldOut} /> Sold out
              </label>
              <div className="sm:col-span-2">
                <button className="bg-cocoa text-parchment px-6 py-3 text-sm">Save product</button>
              </div>
            </form>
          );
        })}
      </section>
    </div>
  );
}
