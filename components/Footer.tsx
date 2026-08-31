import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-sand">
      <div className="gold-rule" />
      <div className="mx-auto max-w-6xl px-5 py-12 grid gap-8 md:grid-cols-3 text-sm">
        <div>
          <p className="display text-3xl">Aunty Hong</p>
          <p className="mt-3 text-cocoa/70 max-w-xs">
            Handmade CNY snacks and corporate gifts from a kitchen in Aljunied, Singapore.
          </p>
        </div>
        <div className="space-y-2">
          <p className="kicker mb-3">Visit</p>
          <p>1005 Aljunied Ave 5 #01-42</p>
          <p>Singapore 389886</p>
          <p>No walk-in. WhatsApp +65 9638 1788</p>
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
