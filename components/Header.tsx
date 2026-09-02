"use client";

import { useState } from "react";
import Link from "next/link";
import { CartBadge } from "./CartBadge";

const links = [
  { href: "/store", label: "Shop" },
  { href: "/corporate", label: "Corporate" },
  { href: "/our-story", label: "Our story" },
  { href: "/contact", label: "Contact" },
];

export function Header({ cartCount }: { cartCount: number }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur border-b border-sand">
      <div className="mx-auto max-w-6xl px-5 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex flex-col leading-none" onClick={() => setOpen(false)}>
          <span className="kicker">Demo kitchen</span>
          <span className="display text-3xl text-cocoa">Uncle Lan</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-cinnabar transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="md:hidden border border-sand px-3 py-1.5 text-sm"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Close" : "Menu"}
          </button>
          <CartBadge initial={cartCount} />
        </div>
      </div>
      {open ? (
        <nav id="mobile-nav" className="md:hidden border-t border-sand px-5 py-4 flex flex-col gap-3 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="py-1 hover:text-cinnabar"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
