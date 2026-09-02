"use client";

import { useMemo, useState } from "react";
import type { OrderWithItems } from "@/lib/db";
import {
  formatSgd,
  FULFILLMENT_COLUMNS,
  FULFILLMENT_STATUSES,
  fulfillmentBucket,
  nextFulfillmentStatus,
  statusLabel,
} from "@/lib/pricing";

type FilterId = "all" | "paid" | "packing" | "ready" | "collected" | "shipped";

export function FulfillmentBoard({
  orders,
  pickRollup,
}: {
  orders: OrderWithItems[];
  pickRollup: Array<{ product_title: string; variant_label: string; qty: number }>;
}) {
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [showPick, setShowPick] = useState(true);

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

  function printOrder(orderId: number) {
    const el = document.getElementById(`pack-${orderId}`);
    if (!el) return;
    const w = window.open("", "_blank", "noopener,noreferrer,width=720,height=900");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Packing slip</title>
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

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter((o) => fulfillmentBucket(o.status) === filter);
  }, [orders, filter]);

  const byColumn = useMemo(() => {
    const map: Record<string, OrderWithItems[]> = {
      paid: [],
      packing: [],
      ready: [],
      collected: [],
      shipped: [],
    };
    for (const o of orders) {
      const b = fulfillmentBucket(o.status);
      if (b in map) map[b].push(o);
    }
    return map;
  }, [orders]);

  function OrderCard({ o }: { o: OrderWithItems }) {
    const nxt = nextFulfillmentStatus(o.status, o.delivery_kind);
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
              {o.delivery_kind === "collect" ? "Collect" : "Delivery"}
              {o.requested_date ? ` · requested ${o.requested_date}` : ""}
              {o.address ? ` · ${o.address}` : ""}
              {" · "}
              {formatSgd(o.total)} · {statusLabel(o.status)}
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
                Advance → {statusLabel(nxt)}
              </button>
            ) : null}
            <select
              className="border border-sand bg-parchment px-2 py-2 text-xs"
              value={o.status}
              disabled={busy === o.id}
              onChange={(e) => setStatus(o.id, e.target.value)}
            >
              {FULFILLMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
              <option value="cancelled">{statusLabel("cancelled")}</option>
            </select>
            <button
              type="button"
              onClick={() => printOrder(o.id)}
              className="border border-gold px-3 py-2 text-xs"
            >
              Packing slip
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
          <h1>Packing slip · {o.order_no}</h1>
          <p className="muted">
            {o.customer_name} · {o.customer_phone}
            {o.customer_email ? ` · ${o.customer_email}` : ""}
          </p>
          <p className="muted">
            {o.delivery_kind === "collect" ? "Collect" : "Delivery"}
            {o.requested_date ? ` · requested ${o.requested_date}` : ""}
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
  }

  const filterChips: Array<{ id: FilterId; label: string }> = [
    { id: "all", label: "All" },
    ...FULFILLMENT_COLUMNS.map((c) => ({ id: c.id as FilterId, label: c.label })),
  ];

  return (
    <div className="mt-8 space-y-10">
      {err ? <p className="text-sm text-cinnabar">{err}</p> : null}

      <section className="border border-sand bg-parchment p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="kicker">Warehouse pick</p>
            <h2 className="display mt-1 text-3xl">To pick today</h2>
            <p className="mt-1 text-sm text-cocoa/60">
              Line totals from open paid / packing orders — pick from stock, not bake quantities.
            </p>
          </div>
          <button
            type="button"
            className="border border-sand px-3 py-2 text-xs"
            onClick={() => setShowPick((v) => !v)}
          >
            {showPick ? "Hide" : "Show"}
          </button>
        </div>
        {showPick ? (
          pickRollup.length === 0 ? (
            <p className="mt-4 text-sm text-cocoa/60">Nothing open to pick.</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-sand text-left text-cocoa/60">
                  <th className="py-2 font-medium">Product</th>
                  <th className="font-medium">Variant</th>
                  <th className="font-medium">Pick qty</th>
                </tr>
              </thead>
              <tbody>
                {pickRollup.map((r) => (
                  <tr key={`${r.product_title}-${r.variant_label}`} className="border-b border-sand/70">
                    <td className="py-2 pr-3">{r.product_title}</td>
                    <td className="py-2 pr-3">{r.variant_label}</td>
                    <td className="py-2 font-medium">{r.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="kicker">Fulfillment board</p>
            <h2 className="display mt-1 text-3xl">Orders to pack &amp; dispatch</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {filterChips.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilter(c.id)}
                className={
                  filter === c.id
                    ? "bg-cocoa px-3 py-1.5 text-xs text-parchment"
                    : "border border-sand px-3 py-1.5 text-xs"
                }
              >
                {c.label}
                {c.id !== "all" ? ` (${byColumn[c.id]?.length || 0})` : ` (${orders.length})`}
              </button>
            ))}
          </div>
        </div>

        {filter === "all" ? (
          <div className="grid gap-4 xl:grid-cols-3">
            {FULFILLMENT_COLUMNS.filter((c) =>
              ["paid", "packing", "ready"].includes(c.id)
            ).map((col) => (
              <div key={col.id} className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-cocoa/60">
                  {col.label} ({byColumn[col.id].length})
                </p>
                {byColumn[col.id].length === 0 ? (
                  <p className="text-sm text-cocoa/50">None</p>
                ) : (
                  byColumn[col.id].map((o) => <OrderCard key={o.id} o={o} />)
                )}
              </div>
            ))}
          </div>
        ) : null}

        {filter === "all" ? (
          <div className="grid gap-4 md:grid-cols-2">
            {FULFILLMENT_COLUMNS.filter((c) =>
              ["collected", "shipped"].includes(c.id)
            ).map((col) => (
              <div key={col.id} className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-cocoa/60">
                  {col.label} ({byColumn[col.id].length})
                </p>
                {byColumn[col.id].length === 0 ? (
                  <p className="text-sm text-cocoa/50">None</p>
                ) : (
                  byColumn[col.id].map((o) => <OrderCard key={o.id} o={o} />)
                )}
              </div>
            ))}
          </div>
        ) : null}

        {filter !== "all" ? (
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <p className="text-sm text-cocoa/60">No orders in this column.</p>
            ) : (
              filtered.map((o) => <OrderCard key={o.id} o={o} />)
            )}
          </div>
        ) : null}

        {orders.length === 0 ? (
          <p className="text-sm text-cocoa/60">
            No fulfillment orders yet. Paid / “I have paid” orders appear here for packing.
          </p>
        ) : null}
      </section>
    </div>
  );
}

/** @deprecated Prefer FulfillmentBoard — kept so old imports keep working. */
export { FulfillmentBoard as ProductionBoard };
