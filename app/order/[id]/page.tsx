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
  searchParams: Promise<{ paid?: string; session_id?: string }>;
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
  const invoiceQs = order.customer_phone
    ? `?phone=${encodeURIComponent(order.customer_phone)}`
    : order.customer_email
      ? `?email=${encodeURIComponent(order.customer_email)}`
      : "";
  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <p className="kicker">Thank you</p>
      <h1 className="display mt-2 text-5xl">{order.order_no}</h1>
      <p className="mt-3 text-cocoa/70">
        {String(order.status || "").replaceAll("_", " ")} · {formatSgd(Number(order.total))} · {order.paynow_ref}
      </p>
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
      <p className="mt-6 text-sm">
        <a className="border-b border-gold" href={`/invoice/${encodeURIComponent(order.order_no)}${invoiceQs}`}>
          View / print invoice
        </a>
      </p>
      <p className="mt-6 text-sm text-cocoa/60">
        Kitchen: 1005 Aljunied Ave 5 #01-42.{" "}
        <a href="https://wa.me/6596381788" className="border-b border-gold">
          WhatsApp +65 9638 1788
        </a>
        .
      </p>
    </div>
  );
}
