import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { listEnquiries } from "@/lib/db";
import { EnquiryDesk } from "@/components/EnquiryDesk";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const metadata = { title: "Enquiries" };

export default async function AdminEnquiries() {
  noStore();
  if (!(await isAdmin())) redirect("/admin/login");
  const rows = await listEnquiries();
  return (
    <div>
      <h1 className="display text-4xl">Enquiries</h1>
      <EnquiryDesk rows={rows} />
    </div>
  );
}
