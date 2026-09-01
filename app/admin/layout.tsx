import Link from "next/link";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ok = await isAdmin();
  if (!ok) return <>{children}</>;
  return (
    <div className="flex min-h-[70vh]">
      <aside className="w-52 bg-cocoa text-parchment p-6 text-sm space-y-3">
        <p className="display text-2xl mb-6">Kitchen</p>
        <Link className="block hover:text-gold" href="/admin">
          Overview
        </Link>
        <Link className="block hover:text-gold" href="/admin/orders">
          Orders
        </Link>
        <Link className="block hover:text-gold" href="/admin/production">
          Production
        </Link>
        <Link className="block hover:text-gold" href="/admin/products">
          Products
        </Link>
        <Link className="block hover:text-gold" href="/admin/enquiries">
          Enquiries
        </Link>
        <Link className="block hover:text-gold" href="/admin/settings">
          Settings
        </Link>
        <form action="/api/admin/logout" method="post" className="pt-8">
          <button className="text-gold/80">Sign out</button>
        </form>
      </aside>
      <div className="flex-1 p-8">{children}</div>
    </div>
  );
}
