import Link from "next/link";

export function PayRecovery({
  title = "No order to pay",
  detail = "We could not find a payment page for this order. It may have expired from this browser, or the link is incomplete.",
}: {
  title?: string;
  detail?: string;
}) {
  return (
    <div className="mx-auto max-w-xl px-5 py-14">
      <p className="kicker">Aunty Hong</p>
      <h1 className="display mt-2 text-5xl">{title}</h1>
      <p className="mt-4 text-cocoa/75">{detail}</p>
      <div className="mt-8 flex flex-wrap gap-6 text-sm">
        <Link href="/checkout" className="border-b border-gold">
          Go to checkout
        </Link>
        <Link href="/store" className="border-b border-gold">
          Browse the store
        </Link>
      </div>
    </div>
  );
}
