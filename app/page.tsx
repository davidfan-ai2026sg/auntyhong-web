import Link from "next/link";
import { featured, NAMED_IMAGES, listProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";

export default function HomePage() {
  const gifts = featured();
  const teas = listProducts().filter((p) => p.categories.some((c) => /tea/i.test(c)));
  return (
    <div>
      <section className="relative min-h-[78vh] overflow-hidden bg-cocoa text-parchment">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={NAMED_IMAGES["cny-banner"]}
          alt="Chinese New Year gift table"
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-cocoa via-cocoa/50 to-transparent" />
        <div className="relative mx-auto max-w-6xl px-5 py-28 md:py-40">
          <p className="kicker text-gold">A kitchen in Aljunied</p>
          <h1 className="display mt-4 max-w-3xl text-6xl md:text-8xl leading-[0.9]">
            Snacks that taste like home.
          </h1>
          <p className="mt-6 max-w-md text-parchment/80">
            Keropok, cookies, tea, and CNY gift boxes — packed the way Aunty Hong still packs them.
          </p>
          <div className="mt-10 flex gap-4">
            <Link href="/store" className="bg-cinnabar text-parchment px-6 py-3 text-sm tracking-wide">
              Open the shop
            </Link>
            <Link href="/corporate" className="border border-gold/70 px-6 py-3 text-sm">
              Corporate gifting
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="kicker">This season</p>
            <h2 className="display mt-2 text-5xl">A gift album, not a grid.</h2>
          </div>
          <Link href="/store" className="hidden md:inline text-sm border-b border-gold pb-1">
            All snacks
          </Link>
        </div>
        <div className="mt-12 grid md:grid-cols-12 gap-8">
          {gifts[0] ? (
            <div className="md:col-span-7">
              <ProductCard product={gifts[0]} large />
            </div>
          ) : null}
          <div className="md:col-span-5 grid gap-8">
            {gifts.slice(1, 3).map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </div>
        <div className="mt-10 grid sm:grid-cols-3 gap-8">
          {gifts.slice(3).map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      <section className="bg-cocoa text-parchment py-20">
        <div className="mx-auto max-w-6xl px-5 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="kicker text-gold">The house</p>
            <h2 className="display mt-2 text-5xl">From a kitchen, not a warehouse.</h2>
            <p className="mt-5 text-parchment/75 leading-relaxed">
              Aunty Hong still fries keropok and packs gift boxes at 1005 Aljunied Ave 5. There is no
              walk-in counter. Orders go out by delivery or collection, in SGD, with a S$50 minimum.
            </p>
            <Link href="/our-story" className="mt-8 inline-block border-b border-gold pb-1 text-sm">
              Read the story
            </Link>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={NAMED_IMAGES.noodles} alt="Handmade noodles" className="w-full object-cover aspect-[4/3]" />
        </div>
      </section>

      {teas.length ? (
        <section className="mx-auto max-w-6xl px-5 py-20">
          <p className="kicker">After the crackers</p>
          <h2 className="display mt-2 text-5xl">Tea to send with the tin.</h2>
          <div className="mt-10 grid sm:grid-cols-3 gap-8">
            {teas.slice(0, 3).map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
