import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { formatSgd } from "@/lib/pricing";

export function ProductCard({ product, large }: { product: Product; large?: boolean }) {
  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className={`overflow-hidden bg-sand ${large ? "aspect-[4/5]" : "aspect-square"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
        />
      </div>
      <div className="mt-4">
        <p className="display text-2xl leading-tight">{product.title}</p>
        <p className="mt-1 text-sm text-cocoa/60">
          {product.soldOut ? "Sold out" : `from ${formatSgd(product.fromPrice)}`}
        </p>
      </div>
    </Link>
  );
}
