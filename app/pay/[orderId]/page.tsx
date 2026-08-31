import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getOrder } from "@/lib/db";
import { formatSgd } from "@/lib/pricing";
import { PayActions } from "@/components/PayActions";

export const metadata = { title: "Pay" };

export default async function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const order = getOrder(Number(orderId));
  if (!order) notFound();
  const qr = await QRCode.toDataURL(order.paynow_ref, { margin: 1, width: 280 });
  return (
    <div className="mx-auto max-w-xl px-5 py-14">
      <p className="kicker">Demo payment</p>
      <h1 className="display mt-2 text-5xl">PayNow</h1>
      <p className="mt-4 text-cocoa/75">
        Order {order.order_no}. Amount {formatSgd(order.total)}. This QR encodes the reference only — not a real UEN.
      </p>
      <div className="mt-8 bg-parchment border border-sand p-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="PayNow reference QR" className="mx-auto" />
        <p className="mt-4 font-medium tracking-wide">{order.paynow_ref}</p>
        <p className="mt-2 text-xs text-cocoa/50">Status: {order.status.replaceAll("_", " ")}</p>
      </div>
      <PayActions orderId={order.id} status={order.status} />
    </div>
  );
}
