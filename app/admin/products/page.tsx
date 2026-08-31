import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { listProducts } from "@/lib/catalog";
import { ProductDesk } from "@/components/ProductDesk";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const metadata = { title: "Products" };

export default async function AdminProducts() {
  noStore();
  if (!(await isAdmin())) redirect("/admin/login");
  const products = await listProducts();
  return (
    <div>
      <h1 className="display text-4xl">Products</h1>
      <p className="mt-2 text-sm text-cocoa/60">
        Live catalogue for the demo shop. Add, restock, or take a tin off the shelf — this desk writes
        the same store the storefront reads.
      </p>
      <ProductDesk products={products} />
    </div>
  );
}
