"use client";

import { useState } from "react";

export function CorporateForm() {
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/enquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    if (!res.ok) {
      setErr("Could not send");
      return;
    }
    setOk(true);
  }
  if (ok) return <p className="mt-10">Thank you. The kitchen desk has the note.</p>;
  return (
    <form onSubmit={onSubmit} className="mt-10 space-y-4">
      <input required name="company" placeholder="Company" className="w-full border border-sand bg-parchment px-3 py-2" />
      <input required name="name" placeholder="Your name" className="w-full border border-sand bg-parchment px-3 py-2" />
      <input required type="email" name="email" placeholder="Email" className="w-full border border-sand bg-parchment px-3 py-2" />
      <input name="phone" placeholder="Phone" className="w-full border border-sand bg-parchment px-3 py-2" />
      <input name="qty_hint" placeholder="Rough quantity / date" className="w-full border border-sand bg-parchment px-3 py-2" />
      <textarea required name="message" rows={4} placeholder="What to pack" className="w-full border border-sand bg-parchment px-3 py-2" />
      {err ? <p className="text-cinnabar text-sm">{err}</p> : null}
      <button className="bg-cocoa text-parchment px-6 py-3 text-sm">Send enquiry</button>
    </form>
  );
}
