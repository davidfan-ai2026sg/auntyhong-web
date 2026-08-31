"use client";

import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { formatSgd } from "@/lib/pricing";

export function AddToCart({ product }: { product: Product }) {
  const first = product.variants.find((v) => v.inStock) ?? product.variants[0];
  const [sku, setSku] = useState(first?.sku ?? "");
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState("");
  const selected = product.variants.find((v) => v.sku === sku) ?? first;
  const sold = product.soldOut || !selected?.inStock;

  async function add() {
    setMsg("");
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku, qty, op: "add" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Could not add");
      return;
    }
    setMsg("Added to basket.");
  }

  return (
    <div className="mt-10 space-y-5">
      <div className="flex flex-wrap gap-2">
        {product.variants.map((v) => (
          <button
            key={v.sku}
            type="button"
            disabled={!v.inStock}
            onClick={() => setSku(v.sku)}
            className={`px-3 py-2 text-sm border ${
              sku === v.sku ? "border-cocoa bg-cocoa text-parchment" : "border-sand"
            } disabled:opacity-40`}
          >
            {v.label} · {formatSgd(v.price)}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
          className="w-20 border border-sand bg-parchment px-3 py-2"
        />
        <button
          type="button"
          disabled={sold}
          onClick={add}
          className="bg-cinnabar text-parchment px-6 py-3 text-sm disabled:opacity-40"
        >
          {sold ? "Sold out" : "Add to basket"}
        </button>
      </div>
      {msg ? <p className="text-sm text-cocoa/70">{msg}</p> : null}
    </div>
  );
}
