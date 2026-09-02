import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { getOrderByRef, getSettings, invoiceNumberFor } from "@/lib/db";
import { formatSgd } from "@/lib/pricing";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoice" };

export default async function CustomerInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNo: string }>;
  searchParams: Promise<{ phone?: string; email?: string }>;
}) {
  noStore();
  const { orderNo } = await params;
  const q = await searchParams;
  const order = await getOrderByRef(decodeURIComponent(orderNo));
  if (!order) notFound();
  const admin = await isAdmin();
  const phoneOk = q.phone && q.phone.replace(/\s/g, "") === order.customer_phone.replace(/\s/g, "");
  const emailOk =
    q.email && order.customer_email && q.email.toLowerCase() === order.customer_email.toLowerCase();
  if (!admin && !phoneOk && !emailOk) {
    notFound();
  }
  const settings = await getSettings();
  const inv = invoiceNumberFor(order);
  const taxReady = Boolean(settings.uen || settings.gst_reg);
  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      {!taxReady ? (
        <p className="mb-4 border border-cinnabar/40 bg-cinnabar/10 px-3 py-2 text-sm text-cinnabar">
          DEMO — not a tax invoice
        </p>
      ) : null}
      <p className="kicker">Aunty Hong</p>
      <h1 className="display mt-1 text-4xl">{inv}</h1>
      <p className="mt-2 text-sm text-cocoa/70">
        1005 Aljunied Ave 5 #01-42, Singapore 389886 · +65 9638 1788
      </p>
      <p className="mt-4 text-sm">
        {order.customer_name} · Order {order.order_no} · {formatSgd(order.total)}
      </p>
      <ul className="mt-6 divide-y divide-sand text-sm">
        {order.items.map((it) => (
          <li key={it.id} className="flex justify-between gap-4 py-3">
            <span>
              {it.qty}× {it.product_title}
              <span className="block text-xs text-cocoa/50">{it.variant_label}</span>
            </span>
            <span>{formatSgd(it.unit_price * it.qty)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatSgd(order.subtotal)}</span>
        </div>
        {order.discount ? (
          <div className="flex justify-between">
            <span>Discount{order.voucher_code ? ` (${order.voucher_code})` : ""}</span>
            <span>−{formatSgd(order.discount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between">
          <span>Delivery</span>
          <span>{formatSgd(order.delivery_fee)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Total</span>
          <span>{formatSgd(order.total)}</span>
        </div>
      </div>
      <p className="mt-2 text-xs text-cocoa/50">PayNow ref {order.paynow_ref}</p>
      <div className="mt-8 print:hidden">
        <PrintButton />
      </div>
    </div>
  );
}
