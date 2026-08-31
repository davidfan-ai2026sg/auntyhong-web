import { categories, listProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/ProductCard";

export const metadata = { title: "Shop" };

export default function StorePage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  return <StoreInner searchParams={searchParams} />;
}

async function StoreInner({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const all = listProducts();
  const cats = categories();
  const active = cat && cat !== "All" ? cat : "All";
  const shown = active === "All" ? all : all.filter((p) => p.categories.includes(active));
  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <p className="kicker">The pantry</p>
      <h1 className="display mt-2 text-6xl">Shop</h1>
      <div className="mt-8 flex flex-wrap gap-2">
        {cats.map((c) => (
          <a
            key={c}
            href={c === "All" ? "/store" : `/store?cat=${encodeURIComponent(c)}`}
            className={`px-3 py-1.5 text-sm rounded-full border ${
              active === c ? "bg-cocoa text-parchment border-cocoa" : "border-sand hover:border-gold"
            }`}
          >
            {c}
          </a>
        ))}
      </div>
      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
        {shown.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </div>
  );
}
