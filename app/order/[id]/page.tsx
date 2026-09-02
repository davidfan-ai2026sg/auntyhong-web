import { notFound } from "next/navigation";
import { findCustomerOrder, markOrderPaid } from "@/lib/db";
import { formatSgd } from "@/lib/pricing";
import { getStripe, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Order" };

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string; session_id?: string; mail?: string }>;
}) {
  const { id } = await params;
  const q = await searchParams;
  let order = await findCustomerOrder(id);
  if (!order) notFound();

  if (q.session_id && stripeConfigured() && order.status === "pending_payment") {
    try {
      const stripe = getStripe();
      const session = await stripe?.checkout.sessions.retrieve(q.session_id);
      if (
        session &&
        session.payment_status === "paid" &&
        String(session.metadata?.orderId || session.client_reference_id) === String(order.id)
      ) {
        order = (await markOrderPaid(order.id, "stripe")) || order;
      }
    } catch {
      /* verify best-effort */
    }
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const invoiceQs = order.customer_email
    ? `?email=${encodeURIComponent(order.customer_email)}`
    : order.customer_phone
      ? `?phone=${encodeURIComponent(order.customer_phone)}`
      : "";
  const mailFailed =
    q.mail === "fail" ||
    Boolean(order.confirmation_email_error && !order.confirmation_email_sent);
  const mailOk = q.mail === "ok" || (order.confirmation_email_sent && !order.confirmation_email_error);
  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <p className="kicker">Thank you</p>
      <h1 className="display mt-2 text-5xl">{order.order_no}</h1>
      <p className="mt-3 text-cocoa/70">
        {String(order.status || "").replaceAll("_", " ")} · {formatSgd(Number(order.total))} · {order.paynow_ref}
      </p>
      {mailFailed ? (
        <p className="mt-4 border border-cinnabar/40 bg-cinnabar/10 px-3 py-2 text-sm text-cinnabar">
          Confirmation email could not be sent. Your order is still confirmed — use the invoice link below.
        </p>
      ) : null}
      {mailOk && order.customer_email ? (
        <p className="mt-4 text-sm text-cocoa/70">
          A confirmation with invoice details was sent to {order.customer_email}.
        </p>
      ) : null}
      {!order.customer_email ? (
        <p className="mt-4 text-sm text-cocoa/60">
          No email on this order — confirmation was not emailed. Keep the invoice link for your records.
        </p>
      ) : null}
      <ul className="mt-8 divide-y divide-sand">
        {items.map((it) => (
          <li key={it.id} className="py-3 flex justify-between text-sm">
            <span>
              {it.product_title} · {it.variant_label} × {it.qty}
            </span>
            <span>{formatSgd(Number(it.unit_price) * Number(it.qty))}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatSgd(Number(order.subtotal))}</span>
        </div>
        {order.discount ? (
          <div className="flex justify-between">
            <span>Discount{order.voucher_code ? ` (${order.voucher_code})` : ""}</span>
            <span>−{formatSgd(Number(order.discount))}</span>
          </div>
        ) : null}
        <div className="flex justify-between">
          <span>Delivery</span>
          <span>{formatSgd(Number(order.delivery_fee))}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Total</span>
          <span>{formatSgd(Number(order.total))}</span>
        </div>
      </div>
      <p className="mt-6 text-sm">
        <a className="border-b border-gold" href={`/invoice/${encodeURIComponent(order.order_no)}${invoiceQs}`}>
          View / print invoice
        </a>
      </p>
      <p className="mt-6 text-sm text-cocoa/60">
        Kitchen: 88 Demo Lane #01-01 (demo).{" "}
        <a href="https://wa.me/6580000000" className="border-b border-gold">
          WhatsApp +65 8000 0000
        </a>
        .
      </p>
    </div>
  );
}
