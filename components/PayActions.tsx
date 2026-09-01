"use client";

import { useState } from "react";

export function PayActions({
  orderId,
  status,
  stripeEnabled,
}: {
  orderId: number;
  status: string;
  stripeEnabled?: boolean;
}) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(kind: string) {
    setBusy(true);
    setMsg("");
    try {
      if (kind === "stripe") {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMsg((data as { error?: string }).error || "Stripe unavailable — use PayNow demo.");
          return;
        }
        const url = (data as { url?: string }).url;
        if (!url) {
          setMsg("Stripe did not return a checkout URL.");
          return;
        }
        window.location.href = url;
        return;
      }
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, kind }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg((data as { error?: string }).error || "Failed");
        return;
      }
      window.location.href = `/order/${orderId}`;
    } catch {
      setMsg("Could not update payment. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (status !== "pending_payment") {
    return (
      <p className="mt-6 text-sm">
        Already recorded.{" "}
        <a className="border-b border-gold" href={`/order/${orderId}`}>
          View order
        </a>
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-3">
      {stripeEnabled ? (
        <button
          disabled={busy}
          onClick={() => act("stripe")}
          className="w-full bg-cocoa text-parchment py-3 text-sm disabled:opacity-40"
        >
          {busy ? "Opening Stripe…" : "Pay by card (Stripe test)"}
        </button>
      ) : null}
      <button
        disabled={busy}
        onClick={() => act("paynow")}
        className="w-full bg-cinnabar text-parchment py-3 text-sm disabled:opacity-40"
      >
        {busy ? "Saving…" : "I have paid"}
      </button>
      {!stripeEnabled ? (
        <button
          disabled={busy}
          onClick={() => act("card")}
          className="w-full border border-gold py-3 text-sm disabled:opacity-40"
        >
          Simulate card (test only)
        </button>
      ) : (
        <p className="text-xs text-cocoa/55">
          Apple Pay / Google Pay appear in Stripe Checkout when the device and Stripe Dashboard allow
          wallets. Domain verification is a Dashboard step if Apple Pay does not show.
        </p>
      )}
      {msg ? <p className="text-sm text-cinnabar">{msg}</p> : null}
    </div>
  );
}
