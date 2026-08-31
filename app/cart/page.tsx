import Link from "next/link";
import { readCart } from "@/lib/cart";
import { quoteCart } from "@/lib/db";
import { formatSgd } from "@/lib/pricing";
import { CartEditor } from "@/components/CartEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Basket" };

export default async function CartPage() {
  const lines = await readCart();
  let quote = null as Awaited<ReturnType<typeof quoteCart>> | null;
  let error = "";
  try {
    quote = lines.length ? await quoteCart(lines, "delivery", false) : null;
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not price basket";
  }
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className="kicker">Your basket</p>
      <h1 className="display mt-2 text-6xl">Basket</h1>
      {!lines.length ? (
        <p className="mt-8 text-cocoa/70">
          Empty for now. <Link href="/store" className="border-b border-gold">Browse the pantry</Link>.
        </p>
      ) : (
        <>
          <CartEditor lines={quote?.items ?? []} />
          {error ? <p className="mt-4 text-cinnabar text-sm">{error}</p> : null}
          {quote ? (
            <div className="mt-10 border-t border-sand pt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatSgd(quote.totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-cocoa/70">
                <span>Delivery from</span>
                <span>
                  {quote.totals.subtotal >= quote.totals.freeDeliveryAt
                    ? "Free over S$120"
                    : formatSgd(quote.settings.delivery_fee)}
                </span>
              </div>
              {quote.totals.belowMinimum ? (
                <p className="text-cinnabar">Minimum online order is {formatSgd(quote.totals.minOrder)}.</p>
              ) : null}
              <Link
                href="/checkout"
                className="mt-6 inline-block bg-cinnabar text-parchment px-6 py-3"
              >
                Checkout
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
