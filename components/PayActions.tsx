"use client";

import { useState } from "react";

export function PayActions({ orderId, status }: { orderId: number; status: string }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function act(kind: string) {
    setBusy(true);
    setMsg("");
    try {
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
        Already recorded. <a className="border-b border-gold" href={`/order/${orderId}`}>View order</a>
      </p>
    );
  }
  return (
    <div className="mt-8 space-y-3">
      <button
        disabled={busy}
        onClick={() => act("paynow")}
        className="w-full bg-cinnabar text-parchment py-3 text-sm disabled:opacity-40"
      >
        {busy ? "Saving…" : "I have paid"}
      </button>
      <button
        disabled={busy}
        onClick={() => act("card")}
        className="w-full border border-gold py-3 text-sm disabled:opacity-40"
      >
        Simulate card (test only)
      </button>
      {msg ? <p className="text-sm text-cinnabar">{msg}</p> : null}
    </div>
  );
}
