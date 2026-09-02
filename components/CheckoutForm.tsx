"use client";

import { useMemo, useState } from "react";
import { formatSgd, roundMoney } from "@/lib/pricing";

export function CheckoutForm({
  subtotal,
  deliveryFee,
  freeDeliveryAt,
  expressFee,
}: {
  subtotal: number;
  deliveryFee: number;
  freeDeliveryAt: number;
  expressFee: number;
}) {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<"delivery" | "collect">("delivery");
  const [express, setExpress] = useState(false);
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [voucherMsg, setVoucherMsg] = useState("");
  const [voucherBusy, setVoucherBusy] = useState(false);

  const delivery = useMemo(() => {
    if (kind !== "delivery") return 0;
    let d = subtotal >= freeDeliveryAt ? 0 : deliveryFee;
    if (express) d += expressFee;
    return roundMoney(d);
  }, [kind, subtotal, freeDeliveryAt, deliveryFee, express, expressFee]);

  const total = useMemo(
    () => roundMoney(subtotal - discount + delivery),
    [subtotal, discount, delivery]
  );

  async function applyVoucher() {
    setVoucherBusy(true);
    setVoucherMsg("");
    setErr("");
    try {
      const res = await fetch("/api/voucher/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: voucherInput, subtotal }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        discount?: number;
      };
      if (!res.ok) {
        setVoucherCode("");
        setDiscount(0);
        setVoucherMsg(data.error || "Could not apply voucher");
        return;
      }
      setVoucherCode(String(data.code || "").toUpperCase());
      setDiscount(Number(data.discount) || 0);
      setVoucherMsg(`Applied ${String(data.code || "").toUpperCase()}`);
    } catch {
      setVoucherMsg("Could not apply voucher");
    } finally {
      setVoucherBusy(false);
    }
  }

  function clearVoucher() {
    setVoucherCode("");
    setDiscount(0);
    setVoucherInput("");
    setVoucherMsg("");
  }

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
          express_slot: kind === "delivery" && express,
          requested_date: String(fd.get("requested_date") || "").trim() || undefined,
          voucher_code: voucherCode || undefined,
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
            onChange={() => {
              setKind("collect");
              setExpress(false);
            }}
          />{" "}
          Collect at Uncle Lan kitchen (demo)
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
          Collect at 88 Demo Lane #01-01, Singapore 123456. No walk-in — we will confirm the pickup time.
        </p>
      )}
      {kind === "delivery" ? (
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            name="express_slot"
            checked={express}
            onChange={(e) => setExpress(e.target.checked)}
          />{" "}
          3-hour delivery slot (+S$40)
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

      <div className="border border-sand bg-sand/20 p-4 space-y-3">
        <p className="text-sm font-medium">Voucher code</p>
        <div className="flex flex-wrap gap-2">
          <input
            value={voucherInput}
            onChange={(e) => setVoucherInput(e.target.value)}
            placeholder="e.g. WELCOME10"
            className="flex-1 min-w-[10rem] border border-sand bg-parchment px-3 py-2 text-sm uppercase"
            autoCapitalize="characters"
          />
          <button
            type="button"
            disabled={voucherBusy || !voucherInput.trim()}
            onClick={applyVoucher}
            className="bg-cocoa text-parchment px-4 py-2 text-sm disabled:opacity-40"
          >
            {voucherBusy ? "Checking…" : "Apply"}
          </button>
          {voucherCode ? (
            <button type="button" onClick={clearVoucher} className="text-sm text-cinnabar px-2">
              Remove
            </button>
          ) : null}
        </div>
        {voucherMsg ? (
          <p className={`text-sm ${discount > 0 ? "text-cocoa" : "text-cinnabar"}`}>{voucherMsg}</p>
        ) : null}
      </div>

      <div className="border-t border-sand pt-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatSgd(subtotal)}</span>
        </div>
        {discount > 0 ? (
          <div className="flex justify-between text-cocoa">
            <span>Discount{voucherCode ? ` (${voucherCode})` : ""}</span>
            <span>−{formatSgd(discount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between text-cocoa/70">
          <span>Delivery</span>
          <span>{formatSgd(delivery)}</span>
        </div>
        <div className="flex justify-between font-medium text-base pt-1">
          <span>Total</span>
          <span>{formatSgd(total)}</span>
        </div>
      </div>

      {err ? <p className="text-cinnabar text-sm">{err}</p> : null}
      <button disabled={busy} className="bg-cocoa text-parchment px-6 py-3 text-sm disabled:opacity-40">
        {busy ? "Placing…" : "Continue to payment"}
      </button>
    </form>
  );
}
