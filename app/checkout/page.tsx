import { readCart } from "@/lib/cart";
import { quoteCart } from "@/lib/db";
import { CheckoutForm } from "@/components/CheckoutForm";
import { formatSgd } from "@/lib/pricing";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const lines = await readCart();
  if (!lines.length) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20">
        Basket is empty. <Link href="/store">Shop first</Link>.
      </div>
    );
  }
  try {
    const quote = quoteCart(lines, "delivery", false);
    return (
      <div className="mx-auto max-w-3xl px-5 py-14">
        <p className="kicker">Place order</p>
        <h1 className="display mt-2 text-6xl">Checkout</h1>
        <p className="mt-4 text-cocoa/70 text-sm">
          Subtotal {formatSgd(quote.totals.subtotal)}. Delivery under S$120 is S$15; free at S$120.
          Optional 3-hour slot +S$40. Sentosa and Changi Airport excluded.
        </p>
        <CheckoutForm belowMinimum={quote.totals.belowMinimum} minOrder={quote.totals.minOrder} />
      </div>
    );
  } catch {
    return (
      <div className="mx-auto max-w-xl px-5 py-20">
        <p className="kicker">Checkout</p>
        <h1 className="display mt-2 text-5xl">Something went wrong</h1>
        <p className="mt-6 text-cocoa/75">
          We could not load checkout just now. Your basket is still saved — please return to it and try again.
        </p>
        <Link href="/cart" className="mt-8 inline-block border-b border-gold">
          Back to basket
        </Link>
      </div>
    );
  }
}
