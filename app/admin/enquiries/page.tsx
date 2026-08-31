import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { listEnquiries } from "@/lib/db";
import { EnquiryDesk } from "@/components/EnquiryDesk";

export const dynamic = "force-dynamic";
export const metadata = { title: "Enquiries" };

export default async function AdminEnquiries() {
  if (!(await isAdmin())) redirect("/admin/login");
  let rows: Awaited<ReturnType<typeof listEnquiries>> = [];
  try {
    rows = await listEnquiries();
  } catch {
    rows = [];
  }
  return (
    <div>
      <h1 className="display text-4xl">Enquiries</h1>
      <EnquiryDesk rows={rows} />
    </div>
  );
}
