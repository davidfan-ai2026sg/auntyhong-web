import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { listEnquiries } from "@/lib/db";

export const metadata = { title: "Enquiries" };

export default async function AdminEnquiries() {
  if (!(await isAdmin())) redirect("/admin/login");
  const rows = listEnquiries();
  return (
    <div>
      <h1 className="display text-4xl">Enquiries</h1>
      <ul className="mt-8 space-y-6">
        {rows.map((r) => (
          <li key={r.id} className="border border-sand p-4">
            <p className="font-medium">
              {r.company} — {r.name}
            </p>
            <p className="text-sm text-cocoa/60">
              {r.email} · {r.phone} · {r.qty_hint}
            </p>
            <p className="mt-2 text-sm">{r.message}</p>
          </li>
        ))}
        {!rows.length ? <p className="text-cocoa/60">None yet.</p> : null}
      </ul>
    </div>
  );
}
