import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { listOrders, productionRollup } from "@/lib/db";
import { fulfillmentBucket, isPaidLike } from "@/lib/pricing";
import { FulfillmentBoard } from "@/components/FulfillmentBoard";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const metadata = { title: "Fulfillment" };

export default async function AdminFulfillmentPage() {
  noStore();
  if (!(await isAdmin())) redirect("/admin/login");
  const all = await listOrders();
  const orders = all.filter((o) => isPaidLike(o.status) && o.status !== "cancelled");
  const openForPick = orders.filter((o) => {
    const b = fulfillmentBucket(o.status);
    return b === "paid" || b === "packing";
  });
  const pickRollup = productionRollup(openForPick);
  return (
    <div>
      <h1 className="display text-4xl">Fulfillment</h1>
      <p className="mt-2 text-sm text-cocoa/70">
        Paid orders ready to pick from stock, pack, then collect or ship. Cookies are pre-made —
        this desk is inventory and dispatch, not a bake schedule.
      </p>
      <FulfillmentBoard orders={orders} pickRollup={pickRollup} />
    </div>
  );
}
