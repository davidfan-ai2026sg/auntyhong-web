import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/db";
import { SettingsForm } from "@/components/SettingsForm";

export const metadata = { title: "Settings" };

export default async function AdminSettings() {
  if (!(await isAdmin())) redirect("/admin/login");
  const s = getSettings();
  return (
    <div>
      <h1 className="display text-4xl">Settings</h1>
      <SettingsForm settings={s} />
    </div>
  );
}
