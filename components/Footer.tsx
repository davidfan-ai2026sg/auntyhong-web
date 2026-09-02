import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-sand">
      <div className="gold-rule" />
      <div className="mx-auto max-w-6xl px-5 py-12 grid gap-8 md:grid-cols-3 text-sm">
        <div>
          <p className="display text-3xl">Uncle Lan</p>
          <p className="mt-3 text-cocoa/70 max-w-xs">
            Handmade CNY snacks and corporate gifts from a demo kitchen in Singapore.
          </p>
        </div>
        <div className="space-y-2">
          <p className="kicker mb-3">Visit</p>
          <p>Uncle Lan Kitchen (demo)</p>
          <p>88 Demo Lane #01-01</p>
          <p>Singapore 123456</p>
          <p>
            No walk-in.{" "}
            <a href="https://wa.me/6580000000" className="border-b border-gold hover:text-cinnabar">
              WhatsApp +65 8000 0000 (demo)
            </a>
          </p>
          <p className="text-cocoa/60">hello@unclelan.demo</p>
        </div>
        <div className="space-y-2">
          <p className="kicker mb-3">House notes</p>
          <Link href="/policies" className="block hover:text-cinnabar">
            Policies
          </Link>
          <Link href="/admin" className="block hover:text-cinnabar">
            Kitchen desk
          </Link>
          <p className="text-cocoa/50 pt-4">Currency SGD. Minimum online order S$50.</p>
        </div>
      </div>
    </footer>
  );
}
