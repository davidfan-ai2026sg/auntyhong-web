"use client";

import type { Settings } from "@/lib/db";

export function SettingsForm({ settings }: { settings: Settings }) {
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        min_order: Number(fd.get("min_order")),
        delivery_fee: Number(fd.get("delivery_fee")),
        free_delivery_at: Number(fd.get("free_delivery_at")),
        express_fee: Number(fd.get("express_fee")),
        paynow_copy: fd.get("paynow_copy"),
      }),
    });
    window.location.reload();
  }
  return (
    <form onSubmit={onSubmit} className="mt-8 max-w-lg space-y-4">
      <label className="block text-sm">
        Minimum order
        <input name="min_order" type="number" defaultValue={settings.min_order} className="mt-1 w-full border border-sand px-3 py-2" />
      </label>
      <label className="block text-sm">
        Delivery fee
        <input name="delivery_fee" type="number" defaultValue={settings.delivery_fee} className="mt-1 w-full border border-sand px-3 py-2" />
      </label>
      <label className="block text-sm">
        Free delivery from
        <input name="free_delivery_at" type="number" defaultValue={settings.free_delivery_at} className="mt-1 w-full border border-sand px-3 py-2" />
      </label>
      <label className="block text-sm">
        Express slot fee
        <input name="express_fee" type="number" defaultValue={settings.express_fee} className="mt-1 w-full border border-sand px-3 py-2" />
      </label>
      <label className="block text-sm">
        PayNow copy
        <textarea name="paynow_copy" rows={4} defaultValue={settings.paynow_copy} className="mt-1 w-full border border-sand px-3 py-2" />
      </label>
      <button className="bg-cocoa text-parchment px-6 py-3 text-sm">Save</button>
    </form>
  );
}
