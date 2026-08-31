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
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: fd.get("customer_name"),
        customer_phone: fd.get("customer_phone"),
        customer_email: fd.get("customer_email"),
        delivery_kind: fd.get("delivery_kind"),
        address: fd.get("address"),
        notes: fd.get("notes"),
        express_slot: fd.get("express_slot") === "on",
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr((data as { error?: string }).error || "Could not place order");
      return;
    }
    if (!(data as { id?: number }).id) {
      setErr("Could not place order");
      return;
    }
    window.location.href = `/pay/${(data as { id: number }).id}`;
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
      <label className="block text-sm">
        Address
        <textarea
          name="address"
          rows={3}
          required={kind === "delivery"}
          className="mt-1 w-full border border-sand bg-parchment px-3 py-2"
        />
      </label>
      <label className="flex gap-2 text-sm">
        <input type="checkbox" name="express_slot" /> 3-hour delivery slot (+S$40)
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
