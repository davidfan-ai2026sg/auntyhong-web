"use client";

import { formatSgd } from "@/lib/pricing";

type Item = {
  sku: string;
  product_title: string;
  variant_label: string;
  unit_price: number;
  qty: number;
  options?: Record<string, string>;
};

export function CartEditor({ lines }: { lines: Item[] }) {
  async function setQty(line: Item, qty: number) {
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku: line.sku, qty, op: "set", options: line.options }),
    });
    window.location.reload();
  }
  return (
    <ul className="mt-10 divide-y divide-sand">
      {lines.map((l) => (
        <li
          key={`${l.sku}::${JSON.stringify(l.options || {})}`}
          className="py-5 flex items-start justify-between gap-4"
        >
          <div>
            <p className="display text-2xl">{l.product_title}</p>
            <p className="text-sm text-cocoa/60">
              {l.variant_label} · {formatSgd(l.unit_price)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              defaultValue={l.qty}
              className="w-16 border border-sand bg-parchment px-2 py-1 text-sm"
              onBlur={(e) => setQty(l, Number(e.target.value))}
            />
            <p className="w-20 text-right">{formatSgd(l.unit_price * l.qty)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
