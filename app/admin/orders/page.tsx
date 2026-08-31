import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { listOrders } from "@/lib/db";
import { formatSgd } from "@/lib/pricing";
import { OrderStatusForm } from "@/components/OrderStatusForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };

export default async function AdminOrders() {
  if (!(await isAdmin())) redirect("/admin/login");
  const orders = await listOrders();
  return (
    <div>
      <h1 className="display text-4xl">Orders</h1>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-sand">
              <th className="py-2">Ref</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
              <th>Kitchen sheet</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-sand/70 align-top">
                <td className="py-3">
                  {o.paynow_ref}
                  <div className="text-xs text-cocoa/50">{o.delivery_kind}</div>
                </td>
                <td>
                  {o.customer_name}
                  <div className="text-xs text-cocoa/50">{o.customer_phone}</div>
                  {o.address ? <div className="text-xs text-cocoa/50">{o.address}</div> : null}
                </td>
                <td>{formatSgd(o.total)}</td>
                <td>
                  <OrderStatusForm id={o.id} status={o.status} />
                </td>
                <td className="text-xs">
                  {o.items.map((it) => (
                    <div key={it.id}>
                      {it.qty}× {it.product_title} ({it.variant_label})
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
