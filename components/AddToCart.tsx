"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/catalog";
import { formatSgd } from "@/lib/pricing";
import { QuantityStepper } from "@/components/QuantityStepper";

export function AddToCart({ product }: { product: Product }) {
  const router = useRouter();
  const first = product.variants.find((v) => v.inStock) ?? product.variants[0];
  const [sku, setSku] = useState(first?.sku ?? "");
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState("");
  const [choices, setChoices] = useState<Record<string, string>>({});
  const selected = product.variants.find((v) => v.sku === sku) ?? first;
  const sold = product.soldOut || !selected?.inStock;
  const fields = product.additionalFields ?? [];
  const showVariants =
    product.variants.length > 1 || product.variants.some((v) => v.label !== "Standard");
  const requiredOk = fields.every((f) => !f.required || Boolean(choices[f.title]));
  const canAdd = !sold && requiredOk;

  async function add() {
    setMsg("");
    if (!requiredOk) {
      setMsg("Please choose each required option.");
      return;
    }
    const options: Record<string, string> = {};
    for (const f of fields) {
      if (choices[f.title]) options[f.title] = choices[f.title];
    }
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku,
        qty,
        op: "add",
        options: Object.keys(options).length ? options : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Could not add");
      return;
    }
    setMsg("Added to basket.");
    window.dispatchEvent(new CustomEvent("ah:cart", { detail: { count: data.count } }));
    router.refresh();
  }

  return (
    <div className="mt-10 space-y-5">
      {showVariants ? (
        <div>
          <p className="kicker mb-2">Size / Flavor</p>
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
        </div>
      ) : null}

      {fields.length ? (
        <div className="space-y-4">
          <p className="kicker">Customize</p>
          <p className="text-sm text-cocoa/70">Choose each item in this gift set.</p>
          {fields.map((f) => (
            <label key={f.title} className="block text-sm">
              {f.title}
              {f.required ? <span className="text-cinnabar"> *</span> : null}
              <select
                required={f.required}
                value={choices[f.title] ?? ""}
                onChange={(e) => setChoices((prev) => ({ ...prev, [f.title]: e.target.value }))}
                className="mt-1 w-full border border-sand bg-parchment px-3 py-2"
              >
                <option value="">Select…</option>
                {f.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <QuantityStepper value={qty} min={1} onChange={setQty} />
        <button
          type="button"
          disabled={!canAdd}
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
