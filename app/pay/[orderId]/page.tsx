import { notFound } from "next/navigation";
import { findCustomerOrder } from "@/lib/db";
import { formatSgd } from "@/lib/pricing";
import { PayActions } from "@/components/PayActions";
import { stripeClientFacing } from "@/lib/stripe";

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
  if (!order) notFound();
  const ref = String(order.paynow_ref || order.order_no);
  const qr = await paynowQr(ref);
  const status = String(order.status || "pending_payment").replaceAll("_", " ");
  const stripeOn = stripeClientFacing();
  return (
    <div className="mx-auto max-w-xl px-5 py-14">
      <p className="kicker">Demo payment</p>
      <h1 className="display mt-2 text-5xl">PayNow</h1>
      <p className="mt-4 text-cocoa/75">
        Order {order.order_no}. Amount {formatSgd(Number(order.total))}. This QR encodes the reference only — not a real UEN.
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
      <PayActions orderId={Number(order.id)} status={String(order.status || "pending_payment")} stripeEnabled={stripeOn} />
    </div>
  );
}
