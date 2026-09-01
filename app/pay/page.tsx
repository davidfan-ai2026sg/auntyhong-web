import { redirect } from "next/navigation";
import { findCustomerOrder, readStoredOrders } from "@/lib/db";
import { PayRecovery } from "@/components/PayRecovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Pay" };

export default async function PayIndexPage() {
  const cookieOrders = await readStoredOrders();
  const pending = cookieOrders.find(
    (o) => o.status === "pending_payment" || o.status === "payment_submitted"
  );
  if (pending?.order_no) {
    const resolved = await findCustomerOrder(pending.order_no);
    if (resolved) {
      redirect(`/pay/${encodeURIComponent(resolved.order_no)}`);
    }
  }
  // Prefer newest cookie order (any status) if findCustomerOrder can resolve it
  for (const o of cookieOrders) {
    const key = o.order_no || o.paynow_ref || String(o.id);
    const resolved = await findCustomerOrder(key);
    if (resolved?.order_no) {
      redirect(`/pay/${encodeURIComponent(resolved.order_no)}`);
    }
  }
  return <PayRecovery />;
}
