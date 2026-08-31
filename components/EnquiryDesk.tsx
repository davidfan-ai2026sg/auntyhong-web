"use client";

import type { Enquiry } from "@/lib/db";

export function EnquiryDesk({ rows }: { rows: Enquiry[] }) {
  async function onDelete(id: number, label: string) {
    if (!window.confirm(`Delete enquiry from ${label}?`)) return;
    await fetch("/api/admin/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    window.location.reload();
  }

  if (!rows.length) return <p className="mt-8 text-cocoa/60">None yet.</p>;

  return (
    <ul className="mt-8 space-y-6">
      {rows.map((r) => (
        <li key={r.id} className="border border-sand p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium">
                {r.company} — {r.name}
              </p>
              <p className="text-sm text-cocoa/60">
                {r.email} · {r.phone} · {r.qty_hint}
              </p>
            </div>
            <button
              type="button"
              className="text-xs text-cinnabar"
              onClick={() => onDelete(r.id, r.company || r.name)}
            >
              Delete
            </button>
          </div>
          <p className="mt-2 text-sm">{r.message}</p>
        </li>
      ))}
    </ul>
  );
}
