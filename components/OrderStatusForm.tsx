"use client";

import { ALLOWED_STATUSES } from "@/lib/pricing";

export function OrderStatusForm({ id, status }: { id: number; status: string }) {
  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    await fetch("/api/admin/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: e.target.value }),
    });
    window.location.reload();
  }
  return (
    <select defaultValue={status} onChange={onChange} className="border border-sand bg-parchment text-xs px-2 py-1">
      {ALLOWED_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
