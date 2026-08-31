"use client";

import { useEffect, useId, useState } from "react";
import type { Product } from "@/lib/catalog";
import { formatSgd } from "@/lib/pricing";

const fieldClass =
  "mt-1 w-full border border-sand bg-parchment px-3 py-2 text-cocoa outline-none focus:border-gold";

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

function categoriesFromForm(fd: FormData) {
  return String(fd.get("categories") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function ProductForm({
  product,
  onSubmit,
  onCancel,
  busy,
}: {
  product?: Product;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const v = product?.variants[0];
  const isEdit = Boolean(product);

  return (
    <form onSubmit={onSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="block text-sm sm:col-span-2">
        Title
        <input name="title" required defaultValue={product?.title ?? ""} className={fieldClass} />
      </label>
      <label className="block text-sm">
        {isEdit ? "Slug" : "Slug (optional)"}
        <input
          name="slug"
          defaultValue={product?.slug ?? ""}
          readOnly={isEdit}
          className={`${fieldClass}${isEdit ? " opacity-70" : ""}`}
        />
      </label>
      <label className="block text-sm">
        {isEdit ? "SKU" : "SKU (optional)"}
        <input name="sku" defaultValue={v?.sku || product?.sku || ""} className={fieldClass} />
      </label>
      <label className="block text-sm">
        Price
        <input
          name="price"
          type="number"
          step="0.01"
          defaultValue={v?.price ?? product?.fromPrice ?? 0}
          className={fieldClass}
        />
      </label>
      <label className="block text-sm">
        Stock
        <input name="stock" type="number" defaultValue={v?.stock ?? 0} className={fieldClass} />
      </label>
      <label className="block text-sm sm:col-span-2">
        Image URL
        <input name="image" defaultValue={product?.image ?? ""} className={fieldClass} />
      </label>
      <label className="block text-sm sm:col-span-2">
        Categories (comma-separated)
        <input
          name="categories"
          defaultValue={product?.categories.join(", ") ?? "Shop"}
          className={fieldClass}
        />
      </label>
      <label className="block text-sm sm:col-span-2">
        Description
        <textarea
          name="description"
          rows={4}
          defaultValue={product?.description ?? ""}
          className={fieldClass}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="unlimited" defaultChecked={v?.unlimited} /> Unlimited stock
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="soldOut" defaultChecked={product?.soldOut} /> Sold out
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="bg-cocoa px-6 py-3 text-sm text-parchment disabled:opacity-60"
        >
          {busy ? "Saving…" : isEdit ? "Save product" : "Add to catalogue"}
        </button>
        <button type="button" onClick={onCancel} className="border-b border-gold text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function ProductDesk({ products }: { products: Product[] }) {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<Product | "new" | null>(null);
  const titleId = useId();
  const isOpen = editor !== null;
  const editing = editor && editor !== "new" ? editor : undefined;

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) setEditor(null);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, busy]);

  async function run(body: Record<string, unknown>) {
    setErr("");
    setBusy(true);
    try {
      await post(body);
      window.location.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
      setBusy(false);
    }
  }

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const categories = categoriesFromForm(fd);
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
    const categories = categoriesFromForm(fd);
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

  async function onDelete(slug: string, title: string) {
    if (!window.confirm(`Delete ${title}? This cannot be undone.`)) return;
    await run({ action: "delete", slug });
  }

  function close() {
    if (busy) return;
    setEditor(null);
  }

  return (
    <div className="mt-8">
      {err && !isOpen ? <p className="mb-4 text-sm text-cinnabar">{err}</p> : null}

      <section>
        <div className="flex items-end justify-between gap-4">
          <p className="kicker">Live catalogue</p>
          <button
            type="button"
            onClick={() => {
              setErr("");
              setEditor("new");
            }}
            className="bg-cinnabar px-4 py-2 text-sm text-parchment"
          >
            Add product
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand text-left text-cocoa/60">
                <th className="py-2 font-medium">Title</th>
                <th className="font-medium">SKU</th>
                <th className="font-medium">Price</th>
                <th className="font-medium">Stock</th>
                <th className="font-medium">Sold out</th>
                <th className="font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const v = p.variants[0];
                return (
                  <tr key={p.slug} className="border-b border-sand/70">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{p.title}</p>
                      <p className="text-xs text-cocoa/50">{p.slug}</p>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">{v?.sku || p.sku}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">{formatSgd(v?.price ?? p.fromPrice)}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {v?.unlimited ? "Unlimited" : String(v?.stock ?? 0)}
                    </td>
                    <td className="py-3 pr-4">
                      {p.soldOut ? (
                        <span className="border border-cinnabar/40 px-2 py-0.5 text-xs text-cinnabar">
                          Sold out
                        </span>
                      ) : (
                        <span className="text-cocoa/30">—</span>
                      )}
                    </td>
                    <td className="py-3 whitespace-nowrap text-right">
                      <button
                        type="button"
                        className="border-b border-gold text-xs"
                        onClick={() => {
                          setErr("");
                          setEditor(p);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="ml-4 text-xs text-cinnabar"
                        onClick={() => onDelete(p.slug, p.title)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-cocoa/50 px-4 py-10"
          onClick={close}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full max-w-2xl border border-gold/70 bg-parchment p-6 text-cocoa shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              className="absolute right-5 top-5 text-xs text-cocoa/60 hover:text-cinnabar"
            >
              Close
            </button>
            <p className="kicker">Kitchen</p>
            <h2 id={titleId} className="display mt-1 text-3xl">
              {editing ? "Edit product" : "Add product"}
            </h2>
            {err ? <p className="mt-3 text-sm text-cinnabar">{err}</p> : null}
            <ProductForm
              key={editing?.slug ?? "new"}
              product={editing}
              busy={busy}
              onCancel={close}
              onSubmit={editing ? (e) => onUpdate(e, editing.slug) : onCreate}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
