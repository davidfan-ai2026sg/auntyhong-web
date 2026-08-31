"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function parseCartCount(): number {
  try {
    const hit = document.cookie.split("; ").find((c) => c.startsWith("ah_cart="));
    if (!hit) return 0;
    const val = decodeURIComponent(hit.slice("ah_cart=".length));
    const lines = JSON.parse(val) as Array<{ qty?: number }>;
    if (!Array.isArray(lines)) return 0;
    return lines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
  } catch {
    return 0;
  }
}

export function CartBadge({ initial = 0 }: { initial?: number }) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    setCount(parseCartCount());
    function onCart(e: Event) {
      const detail = (e as CustomEvent<{ count?: number }>).detail;
      if (typeof detail?.count === "number") setCount(detail.count);
      else setCount(parseCartCount());
    }
    function refresh() {
      setCount(parseCartCount());
    }
    window.addEventListener("ah:cart", onCart);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("ah:cart", onCart);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return (
    <Link
      href="/cart"
      className="text-sm border border-gold/60 px-3 py-1.5 rounded-full hover:bg-sand/60 whitespace-nowrap"
    >
      Basket <span className={count > 0 ? "text-cinnabar" : "text-cocoa/70"}>({count})</span>
    </Link>
  );
}
