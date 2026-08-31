import Link from "next/link";

const links = [
  { href: "/store", label: "Shop" },
  { href: "/corporate", label: "Corporate" },
  { href: "/our-story", label: "Our story" },
  { href: "/contact", label: "Contact" },
];

export function Header({ cartCount }: { cartCount: number }) {
  return (
    <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur border-b border-sand">
      <div className="mx-auto max-w-6xl px-5 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex flex-col leading-none">
          <span className="kicker">Est. Aljunied</span>
          <span className="display text-3xl text-cocoa">Aunty Hong</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-cinnabar transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/cart"
          className="text-sm border border-gold/60 px-3 py-1.5 rounded-full hover:bg-sand/60"
        >
          Basket {cartCount > 0 ? <span className="text-cinnabar">({cartCount})</span> : null}
        </Link>
      </div>
    </header>
  );
}
