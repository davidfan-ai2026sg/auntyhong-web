"use client";

import { useState } from "react";
import type { Voucher } from "@/lib/vouchers";
import { formatSgd } from "@/lib/pricing";

function valueLabel(v: Voucher) {
  if (v.type === "percent") return `${v.value}% off`;
  return `${formatSgd(v.value)} off`;
}

export function VoucherDesk({ rows }: { rows: Voucher[] }) {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(data.error || "Could not save voucher");
        return;
      }
      window.location.reload();
    } catch {
      setErr("Could not save voucher");
    } finally {
      setBusy(false);
    }
  }

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await post({
      action: "create",
      code: fd.get("code"),
      type: fd.get("type"),
      value: Number(fd.get("value")),
      note: fd.get("note"),
      expiresAt: String(fd.get("expiresAt") || "").trim() || undefined,
      active: true,
    });
  }

  return (
    <div className="mt-8 space-y-10">
      <form onSubmit={onCreate} className="max-w-lg space-y-3 border border-sand bg-sand/20 p-4">
        <p className="font-medium">Add voucher</p>
        <label className="block text-sm">
          Code
          <input
            name="code"
            required
            placeholder="WELCOME10"
            className="mt-1 w-full border border-sand bg-parchment px-3 py-2 uppercase"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            Type
            <select name="type" className="mt-1 w-full border border-sand bg-parchment px-3 py-2">
              <option value="percent">Percent</option>
              <option value="fixed">Fixed (SGD)</option>
            </select>
          </label>
          <label className="block text-sm">
            Value
            <input
              name="value"
              type="number"
              min={1}
              step="0.01"
              required
              defaultValue={10}
              className="mt-1 w-full border border-sand bg-parchment px-3 py-2"
            />
          </label>
        </div>
        <label className="block text-sm">
          Note (optional)
          <input name="note" className="mt-1 w-full border border-sand bg-parchment px-3 py-2" />
        </label>
        <label className="block text-sm">
          Expires (optional)
          <input name="expiresAt" type="date" className="mt-1 w-full border border-sand bg-parchment px-3 py-2" />
        </label>
        {err ? <p className="text-cinnabar text-sm">{err}</p> : null}
        <button disabled={busy} className="bg-cocoa text-parchment px-5 py-2 text-sm disabled:opacity-40">
          {busy ? "Saving…" : "Create"}
        </button>
      </form>

      {!rows.length ? (
        <p className="text-cocoa/60">No vouchers yet.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((v) => (
            <li key={v.code} className="border border-sand p-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-medium tracking-wide">{v.code}</p>
                <p className="text-sm text-cocoa/70">
                  {valueLabel(v)} · {v.active ? "Active" : "Inactive"}
                  {v.expiresAt ? ` · Expires ${v.expiresAt}` : ""}
                </p>
                {v.note ? <p className="text-sm mt-1">{v.note}</p> : null}
              </div>
              <div className="flex gap-3 text-sm">
                {v.active ? (
                  <button
                    type="button"
                    className="text-cocoa/70"
                    onClick={() => post({ action: "deactivate", code: v.code })}
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-cocoa/70"
                    onClick={() => post({ action: "activate", code: v.code })}
                  >
                    Activate
                  </button>
                )}
                <button
                  type="button"
                  className="text-cinnabar"
                  onClick={() => {
                    if (window.confirm(`Delete voucher ${v.code}?`)) {
                      post({ action: "delete", code: v.code });
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
