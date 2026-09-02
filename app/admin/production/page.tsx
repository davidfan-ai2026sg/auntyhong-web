import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fulfillment" };

/** Soft redirect so old /admin/production bookmarks still work. */
export default function AdminProductionRedirect() {
  redirect("/admin/fulfillment");
}
