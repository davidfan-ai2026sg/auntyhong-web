import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { getOrderAnywhere, getSettings, invoiceNumberFor } from "@/lib/db";
import { formatSgd } from "@/lib/pricing";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Invoice" };

export default async function AdminInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  noStore();
  if (!(await isAdmin())) redirect("/admin/login");
  const { id } = await params;
  const order = await getOrderAnywhere(Number(id));
  if (!order) notFound();
  const settings = await getSettings();
  const inv = invoiceNumberFor(order);
  const taxReady = Boolean(settings.uen || settings.gst_reg);
  return (
    <div className="mx-auto max-w-2xl bg-parchment text-cocoa print:max-w-none">
      {!taxReady ? (
        <p className="mb-4 border border-cinnabar/40 bg-cinnabar/10 px-3 py-2 text-sm text-cinnabar print:border-cocoa">
          DEMO — not a tax invoice (UEN / GST not configured)
        </p>
      ) : null}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="kicker">Aunty Hong</p>
          <h1 className="display mt-1 text-4xl">Invoice</h1>
          <p className="mt-2 text-sm text-cocoa/70">
            1005 Aljunied Ave 5 #01-42
            <br />
            Singapore 389886
            <br />
            +65 9638 1788
          </p>
          {settings.uen ? <p className="mt-2 text-xs">UEN: {settings.uen}</p> : null}
          {settings.gst_reg ? <p className="text-xs">GST: {settings.gst_reg}</p> : null}
        </div>
        <div className="text-right text-sm">
          <p className="font-medium">{inv}</p>
          <p className="text-cocoa/60">{new Date(order.created_at).toLocaleString("en-SG")}</p>
          <p className="mt-2">Order {order.order_no}</p>
          <p>PayNow ref {order.paynow_ref}</p>
        </div>
      </div>
      <div className="mt-8 text-sm">
        <p className="kicker">Bill to</p>
        <p className="mt-1 font-medium">{order.customer_name}</p>
        <p>{order.customer_phone}</p>
        {order.customer_email ? <p>{order.customer_email}</p> : null}
        <p className="mt-1 text-cocoa/70">
          {order.delivery_kind === "collect" ? "Collect at kitchen" : order.address || "Delivery"}
          {order.requested_date ? ` · ${order.requested_date}` : ""}
        </p>
      </div>
      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b border-sand text-left text-cocoa/60">
            <th className="py-2 font-medium">Item</th>
            <th className="font-medium">Qty</th>
            <th className="font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it) => (
            <tr key={it.id} className="border-b border-sand/70 align-top">
              <td className="py-3 pr-3">
                {it.product_title}
                <div className="text-xs text-cocoa/50">{it.variant_label}</div>
              </td>
              <td className="py-3">{it.qty}</td>
              <td className="py-3 text-right">{formatSgd(it.unit_price * it.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-6 space-y-1 text-sm">
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
        <div className="flex justify-between border-t border-sand pt-2 text-base font-medium">
          <span>Total (SGD)</span>
          <span>{formatSgd(order.total)}</span>
        </div>
      </div>
      {!taxReady ? (
        <p className="mt-8 border border-gold/50 bg-sand/30 px-3 py-2 text-xs text-cocoa/70">
          DEMO — not a tax invoice. Configure UEN / GST in kitchen settings when ready.
        </p>
      ) : null}
      <div className="mt-8 print:hidden">
        <PrintButton />
      </div>
    </div>
  );
}
