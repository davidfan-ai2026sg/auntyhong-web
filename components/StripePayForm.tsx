"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

const appearance = {
  theme: "stripe" as const,
  variables: {
    colorPrimary: "#B43C2F",
    colorBackground: "#FBF6EE",
    colorText: "#2A1B14",
    colorDanger: "#B43C2F",
    fontFamily: "Outfit, ui-sans-serif, system-ui, sans-serif",
    borderRadius: "0px",
  },
};

function InnerPay({ orderId }: { orderId: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [expressReady, setExpressReady] = useState(false);

  async function confirm() {
    if (!stripe || !elements) return;
    setBusy(true);
    setMsg("");
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/order/${orderId}?paid=stripe`,
      },
    });
    if (error) {
      setMsg(error.message || "Card payment failed. Try again or use PayNow.");
      setBusy(false);
      return;
    }
    if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
      window.location.href = `/order/${orderId}?paid=stripe`;
      return;
    }
    setMsg("Payment is still processing. Refresh in a moment.");
    setBusy(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await confirm();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <ExpressCheckoutElement
        onReady={({ availablePaymentMethods }) => {
          const m = availablePaymentMethods;
          setExpressReady(
            Boolean(m && (m.applePay || m.googlePay || m.link || m.paypal || m.klarna))
          );
        }}
        onConfirm={async () => {
          await confirm();
        }}
      />
      {expressReady ? (
        <p className="text-center text-xs text-cocoa/45">or pay with card</p>
      ) : null}
      <PaymentElement
        options={{
          layout: "tabs",
          wallets: { applePay: "auto", googlePay: "auto" },
        }}
      />
      <button
        type="submit"
        disabled={!stripe || !elements || busy}
        className="w-full bg-cocoa text-parchment py-3 text-sm disabled:opacity-40"
      >
        {busy ? "Confirming…" : "Pay by card"}
      </button>
      {msg ? <p className="text-sm text-cinnabar">{msg}</p> : null}
    </form>
  );
}

export function StripePayForm({
  orderId,
  publishableKey,
}: {
  orderId: number;
  publishableKey: string;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const stripePromise = useMemo(() => {
    if (!publishableKey) return null;
    return loadStripe(publishableKey) as Promise<Stripe | null>;
  }, [publishableKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/stripe/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) {
            setError((data as { error?: string }).error || "Card pay unavailable — use PayNow demo.");
            setClientSecret(null);
          }
          return;
        }
        const secret = (data as { clientSecret?: string }).clientSecret;
        if (!secret) {
          if (!cancelled) setError("Stripe did not return a client secret.");
          return;
        }
        if (!cancelled) setClientSecret(secret);
      } catch {
        if (!cancelled) setError("Could not start card payment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (!publishableKey || !stripePromise) return null;

  if (loading) {
    return <p className="text-sm text-cocoa/55">Preparing card form…</p>;
  }
  if (error || !clientSecret) {
    return error ? <p className="text-sm text-cinnabar">{error}</p> : null;
  }

  return (
    <div className="border border-sand bg-parchment p-4">
      <p className="mb-3 text-xs uppercase tracking-widest text-gold">Card on this page</p>
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance,
        }}
      >
        <InnerPay orderId={orderId} />
      </Elements>
      <p className="mt-3 text-xs text-cocoa/55">
        Apple Pay / Google Pay show when your device and Stripe Dashboard allow wallets. You stay on
        this shop — no redirect to Stripe Checkout.
      </p>
    </div>
  );
}
