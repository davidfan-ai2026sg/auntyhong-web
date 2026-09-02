import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { listOrders, listEnquiries } from "@/lib/db";
import { fulfillmentBucket } from "@/lib/pricing";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const metadata = { title: "Kitchen desk" };

export default async function AdminHome() {
  noStore();
  if (!(await isAdmin())) redirect("/admin/login");
  const orders = await listOrders();
  const enquiries = await listEnquiries();
  const awaitingPack = orders.filter((o) => {
    const b = fulfillmentBucket(o.status);
    return b === "paid" || b === "packing" || b === "ready";
  }).length;
  return (
    <div>
      <h1 className="display text-4xl">Overview</h1>
      <div className="mt-8 grid sm:grid-cols-3 gap-4">
        <div className="border border-sand p-5">
          <p className="kicker">Orders</p>
          <p className="display text-4xl mt-2">{orders.length}</p>
        </div>
        <div className="border border-sand p-5">
          <p className="kicker">Awaiting fulfillment</p>
          <p className="display text-4xl mt-2">{awaitingPack}</p>
        </div>
        <div className="border border-sand p-5">
          <p className="kicker">Enquiries</p>
          <p className="display text-4xl mt-2">{enquiries.length}</p>
        </div>
      </div>
    </div>
  );
}
