import { notFound } from "next/navigation";
import { getProduct, listProducts } from "@/lib/catalog";
import { formatSgd } from "@/lib/pricing";
import { AddToCart } from "@/components/AddToCart";

export function generateStaticParams() {
  return listProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProduct(slug);
  return { title: p?.title ?? "Product" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  const priceCopy = product.soldOut
    ? "Sold out"
    : product.variants.length === 1
      ? formatSgd(product.fromPrice)
      : `from ${formatSgd(product.fromPrice)}`;
  return (
    <div className="mx-auto max-w-6xl px-5 py-14 grid md:grid-cols-2 gap-12">
      <div className="bg-sand overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.image} alt={product.title} className="w-full object-cover aspect-[4/5]" />
      </div>
      <div>
        <p className="kicker">{product.categories[0]}</p>
        <h1 className="display mt-2 text-5xl md:text-6xl">{product.title}</h1>
        <p className="mt-4 text-xl text-cinnabar">{priceCopy}</p>
        <p className="mt-6 leading-relaxed text-cocoa/75">{product.description}</p>
        <AddToCart product={product} />
      </div>
    </div>
  );
}
