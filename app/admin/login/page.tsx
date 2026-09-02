"use client";

import { useState } from "react";

export default function AdminLogin() {
  const [err, setErr] = useState("");
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: fd.get("password") }),
    });
    if (!res.ok) {
      setErr("Wrong password");
      return;
    }
    window.location.href = "/admin";
  }
  return (
    <div className="mx-auto max-w-sm px-5 py-24">
      <p className="kicker">Uncle Lan kitchen</p>
      <h1 className="display mt-2 text-4xl">Kitchen sign in</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <input
          type="password"
          name="password"
          placeholder="Password"
          className="w-full border border-sand bg-parchment px-3 py-2"
        />
        {err ? <p className="text-cinnabar text-sm">{err}</p> : null}
        <button className="w-full bg-cocoa text-parchment py-3 text-sm">Enter</button>
      </form>
    </div>
  );
}
