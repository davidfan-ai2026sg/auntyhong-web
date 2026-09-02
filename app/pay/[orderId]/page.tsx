import { findCustomerOrder } from "@/lib/db";
import { formatSgd } from "@/lib/pricing";
import { PayActions } from "@/components/PayActions";
import { PayRecovery } from "@/components/PayRecovery";
import { stripeClientFacing, stripePublishableKey } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Pay" };

async function paynowQr(ref: string) {
  try {
    const QRCode = (await import("qrcode")).default;
    return await QRCode.toString(ref, { type: "svg", margin: 1, width: 280 });
  } catch {
    return "";
  }
}

export default async function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const order = await findCustomerOrder(orderId);
  if (!order) {
    return (
      <PayRecovery
        title="No order to pay"
        detail="We could not find this order. It may have expired from this browser, or the payment link is incomplete. Please return to checkout to place a new order."
      />
    );
  }
  const ref = String(order.paynow_ref || order.order_no);
  const qr = await paynowQr(ref);
  const status = String(order.status || "pending_payment").replaceAll("_", " ");
  const stripeOn = stripeClientFacing();
  const pk = stripePublishableKey();
  return (
    <div className="mx-auto max-w-xl px-5 py-14">
      <p className="kicker">Demo payment</p>
      <h1 className="display mt-2 text-5xl">Pay</h1>
      <p className="mt-4 text-cocoa/75">
        Order {order.order_no}. Amount {formatSgd(Number(order.total))}. Card stays on this page when
        Stripe test keys are set; PayNow QR is the kitchen fallback.
      </p>
      <div className="mt-8 bg-parchment border border-sand p-6 text-center">
        {qr ? (
          <div className="mx-auto w-[180px] text-cocoa" dangerouslySetInnerHTML={{ __html: qr }} />
        ) : (
          <p className="text-sm text-cocoa/60">Use the reference below with PayNow.</p>
        )}
        <p className="mt-4 font-medium tracking-wide">{ref}</p>
        <p className="mt-2 text-xs text-cocoa/50">Status: {status}</p>
      </div>
      <PayActions
        orderId={Number(order.id)}
        status={String(order.status || "pending_payment")}
        stripeEnabled={stripeOn}
        publishableKey={pk}
      />
    </div>
  );
}
