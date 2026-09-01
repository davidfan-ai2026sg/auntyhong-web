import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { listOrders, productionRollup } from "@/lib/db";
import { isPaidLike } from "@/lib/pricing";
import { ProductionBoard } from "@/components/ProductionBoard";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const metadata = { title: "Production" };

export default async function AdminProductionPage() {
  noStore();
  if (!(await isAdmin())) redirect("/admin/login");
  const all = await listOrders();
  const orders = all.filter((o) => isPaidLike(o.status) && o.status !== "cancelled");
  const rollup = productionRollup(orders.filter((o) => !["collected", "shipped", "completed"].includes(o.status)));
  return (
    <div>
      <h1 className="display text-4xl">Production</h1>
      <p className="mt-2 text-sm text-cocoa/70">
        Paid and confirmed orders. Advance status as the kitchen packs.
      </p>
      <ProductionBoard orders={orders} rollup={rollup} />
    </div>
  );
}
