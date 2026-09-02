"use client";

import { useState } from "react";
import { formatSgd } from "@/lib/pricing";
import { QuantityStepper } from "@/components/QuantityStepper";

type Item = {
  sku: string;
  product_title: string;
  variant_label: string;
  unit_price: number;
  qty: number;
  options?: Record<string, string>;
};

function LineQty({ line }: { line: Item }) {
  const [qty, setLocal] = useState(line.qty);

  async function commit(next: number) {
    setLocal(next);
    await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku: line.sku, qty: next, op: "set", options: line.options }),
    });
    window.location.reload();
  }

  return (
    <QuantityStepper
      value={qty}
      min={0}
      size="sm"
      onChange={(n) => {
        void commit(n);
      }}
    />
  );
}

export function CartEditor({ lines }: { lines: Item[] }) {
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
            <LineQty line={l} />
            <p className="w-20 text-right">{formatSgd(l.unit_price * l.qty)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
