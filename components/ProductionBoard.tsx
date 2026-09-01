"use client";

import { useState } from "react";
import type { OrderWithItems } from "@/lib/db";
import { formatSgd, PRODUCTION_STATUSES, type OrderStatus } from "@/lib/pricing";

const ADVANCE: OrderStatus[] = [
  "payment_submitted",
  "paid",
  "in_production",
  "ready",
  "collected",
  "shipped",
];

export function ProductionBoard({
  orders,
  rollup,
}: {
  orders: OrderWithItems[];
  rollup: Array<{ product_title: string; variant_label: string; qty: number }>;
}) {
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState("");

  async function setStatus(id: number, status: string) {
    setBusy(id);
    setErr("");
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      window.location.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not update");
      setBusy(null);
    }
  }

  function nextStatus(cur: string): OrderStatus | null {
    const i = ADVANCE.indexOf(cur as OrderStatus);
    if (i < 0) return "paid";
    if (i >= ADVANCE.length - 1) return null;
    return ADVANCE[i + 1];
  }

  function printOrder(orderId: number) {
    const el = document.getElementById(`pack-${orderId}`);
    if (!el) return;
    const w = window.open("", "_blank", "noopener,noreferrer,width=720,height=900");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Packing list</title>
      <style>
        body{font-family:Georgia,serif;color:#2a1b14;padding:24px}
        h1{font-size:28px;margin:0 0 8px} .muted{color:#666;font-size:13px}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        td,th{border-bottom:1px solid #e8d9c4;padding:8px;text-align:left;font-size:14px}
        @media print{button{display:none}}
      </style></head><body>${el.innerHTML}
      <p style="margin-top:24px"><button onclick="window.print()">Print</button></p>
      </body></html>`);
    w.document.close();
  }

  return (
    <div className="mt-8 space-y-10">
      {err ? <p className="text-sm text-cinnabar">{err}</p> : null}

      <section className="border border-sand bg-parchment p-5">
        <p className="kicker">Daily rollup</p>
        <h2 className="display mt-1 text-3xl">What to make</h2>
        {rollup.length === 0 ? (
          <p className="mt-4 text-sm text-cocoa/60">No paid orders on the board yet.</p>
        ) : (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-sand text-left text-cocoa/60">
                <th className="py-2 font-medium">Product</th>
                <th className="font-medium">Variant</th>
                <th className="font-medium">Qty</th>
              </tr>
            </thead>
            <tbody>
              {rollup.map((r) => (
                <tr key={`${r.product_title}-${r.variant_label}`} className="border-b border-sand/70">
                  <td className="py-2 pr-3">{r.product_title}</td>
                  <td className="py-2 pr-3">{r.variant_label}</td>
                  <td className="py-2 font-medium">{r.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="space-y-6">
        <p className="kicker">Orders</p>
        {orders.length === 0 ? (
          <p className="text-sm text-cocoa/60">No kitchen orders yet. Paid / “I have paid” orders appear here.</p>
        ) : null}
        {orders.map((o) => {
          const nxt = nextStatus(o.status);
          return (
            <article key={o.id} className="border border-sand bg-parchment p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="display text-2xl">{o.order_no}</h3>
                  <p className="text-sm text-cocoa/70">
                    {o.customer_name} · {o.customer_phone}
                    {o.customer_email ? ` · ${o.customer_email}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-cocoa/50">
                    {o.delivery_kind === "collect" ? "Pickup" : "Delivery"}
                    {o.requested_date ? ` · requested ${o.requested_date}` : ""}
                    {o.address ? ` · ${o.address}` : ""}
                    {" · "}
                    {formatSgd(o.total)} · {o.status.replaceAll("_", " ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {nxt ? (
                    <button
                      type="button"
                      disabled={busy === o.id}
                      onClick={() => setStatus(o.id, nxt)}
                      className="bg-cocoa px-3 py-2 text-xs text-parchment disabled:opacity-50"
                    >
                      Advance → {nxt.replaceAll("_", " ")}
                    </button>
                  ) : null}
                  <select
                    className="border border-sand bg-parchment px-2 py-2 text-xs"
                    value={o.status}
                    disabled={busy === o.id}
                    onChange={(e) => setStatus(o.id, e.target.value)}
                  >
                    {PRODUCTION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    <option value="cancelled">cancelled</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => printOrder(o.id)}
                    className="border border-gold px-3 py-2 text-xs"
                  >
                    Packing list
                  </button>
                  <a
                    href={`/admin/orders/${o.id}/invoice`}
                    className="border border-gold px-3 py-2 text-xs"
                  >
                    Invoice
                  </a>
                </div>
              </div>
              <ul className="mt-4 space-y-1 text-sm">
                {o.items.map((it) => (
                  <li key={it.id}>
                    {it.qty}× {it.product_title} — {it.variant_label}
                  </li>
                ))}
              </ul>
              <div id={`pack-${o.id}`} className="hidden">
                <h1>Packing list · {o.order_no}</h1>
                <p className="muted">
                  {o.customer_name} · {o.delivery_kind === "collect" ? "Pickup" : "Delivery"}
                  {o.requested_date ? ` · ${o.requested_date}` : ""}
                </p>
                {o.address ? <p className="muted">{o.address}</p> : null}
                <table>
                  <thead>
                    <tr>
                      <th>Qty</th>
                      <th>Item</th>
                      <th>Variant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.items.map((it) => (
                      <tr key={it.id}>
                        <td>{it.qty}</td>
                        <td>{it.product_title}</td>
                        <td>{it.variant_label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
