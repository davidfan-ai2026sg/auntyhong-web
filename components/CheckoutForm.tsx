"use client";

import { useState } from "react";
import { formatSgd } from "@/lib/pricing";

export function CheckoutForm({
  belowMinimum,
  minOrder,
}: {
  belowMinimum: boolean;
  minOrder: number;
}) {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<"delivery" | "collect">("delivery");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: fd.get("customer_name"),
          customer_phone: fd.get("customer_phone"),
          customer_email: fd.get("customer_email"),
          delivery_kind: kind,
          address: kind === "delivery" ? fd.get("address") : "",
          notes: fd.get("notes"),
          express_slot: kind === "delivery" && fd.get("express_slot") === "on",
          requested_date: String(fd.get("requested_date") || "").trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr((data as { error?: string }).error || "Could not place order. Please try again.");
        return;
      }
      const payload = data as {
        id?: number;
        order_no?: string;
        ref?: string;
        paynow_ref?: string;
      };
      const payKey = payload.order_no || payload.ref || payload.paynow_ref || payload.id;
      if (!payKey) {
        setErr("Could not place order. Please try again.");
        return;
      }
      window.location.href = `/pay/${encodeURIComponent(String(payKey))}`;
    } catch {
      setErr("Could not place order. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <label className="block text-sm">
          Name
          <input required name="customer_name" className="mt-1 w-full border border-sand bg-parchment px-3 py-2" />
        </label>
        <label className="block text-sm">
          Phone
          <input required name="customer_phone" className="mt-1 w-full border border-sand bg-parchment px-3 py-2" />
        </label>
      </div>
      <label className="block text-sm">
        Email
        <input type="email" name="customer_email" className="mt-1 w-full border border-sand bg-parchment px-3 py-2" />
      </label>
      <fieldset className="text-sm space-y-2">
        <legend className="mb-2">How to receive</legend>
        <label className="flex gap-2">
          <input
            type="radio"
            name="delivery_kind"
            value="delivery"
            checked={kind === "delivery"}
            onChange={() => setKind("delivery")}
          />{" "}
          Delivery (islandwide, except Sentosa & Changi Airport)
        </label>
        <label className="flex gap-2">
          <input
            type="radio"
            name="delivery_kind"
            value="collect"
            checked={kind === "collect"}
            onChange={() => setKind("collect")}
          />{" "}
          Collect at Aljunied kitchen
        </label>
      </fieldset>
      {kind === "delivery" ? (
        <label className="block text-sm">
          Address
          <textarea
            name="address"
            rows={3}
            required
            className="mt-1 w-full border border-sand bg-parchment px-3 py-2"
          />
        </label>
      ) : (
        <p className="text-sm text-cocoa/70">
          Collect at 1005 Aljunied Ave 5 #01-42, Singapore 389886. No walk-in — we will confirm the pickup time.
        </p>
      )}
      {kind === "delivery" ? (
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="express_slot" /> 3-hour delivery slot (+S$40)
        </label>
      ) : null}
      <label className="block text-sm">
        Preferred pickup / delivery date (optional)
        <input type="date" name="requested_date" className="mt-1 w-full border border-sand bg-parchment px-3 py-2" />
      </label>
      <label className="block text-sm">
        Notes
        <textarea name="notes" rows={2} className="mt-1 w-full border border-sand bg-parchment px-3 py-2" />
      </label>
      {belowMinimum ? (
        <p className="text-cinnabar text-sm">Add a little more — minimum is {formatSgd(minOrder)}.</p>
      ) : null}
      {err ? <p className="text-cinnabar text-sm">{err}</p> : null}
      <button disabled={busy || belowMinimum} className="bg-cocoa text-parchment px-6 py-3 text-sm disabled:opacity-40">
        {busy ? "Placing…" : "Continue to payment"}
      </button>
    </form>
  );
}
