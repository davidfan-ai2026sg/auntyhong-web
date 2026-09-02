import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { listVouchers } from "@/lib/vouchers";
import { VoucherDesk } from "@/components/VoucherDesk";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const metadata = { title: "Vouchers" };

export default async function AdminVouchers() {
  noStore();
  if (!(await isAdmin())) redirect("/admin/login");
  const rows = await listVouchers();
  return (
    <div>
      <h1 className="display text-4xl">Vouchers</h1>
      <p className="mt-2 text-sm text-cocoa/70">
        Kitchen codes for checkout discounts. Percent (1–100) or fixed SGD. Codes are case-insensitive.
        Demo seed: WELCOME10 (10% off).
      </p>
      <VoucherDesk rows={rows} />
    </div>
  );
}
