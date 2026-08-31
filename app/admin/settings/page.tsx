import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/db";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const metadata = { title: "Settings" };

export default async function AdminSettings() {
  noStore();
  if (!(await isAdmin())) redirect("/admin/login");
  const s = await getSettings();
  return (
    <div>
      <h1 className="display text-4xl">Settings</h1>
      <SettingsForm settings={s} />
    </div>
  );
}
