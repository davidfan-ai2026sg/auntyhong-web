import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { listProducts } from "@/lib/catalog";
import { formatSgd } from "@/lib/pricing";

export const metadata = { title: "Products" };

export default async function AdminProducts() {
  if (!(await isAdmin())) redirect("/admin/login");
  const products = listProducts();
  return (
    <div>
      <h1 className="display text-4xl">Products</h1>
      <p className="mt-2 text-sm text-cocoa/60">Catalogue is seeded from the live shop. Sold-out flags follow Aunty Hong stock.</p>
      <ul className="mt-8 divide-y divide-sand">
        {products.map((p) => (
          <li key={p.slug} className="py-4">
            <p className="font-medium">{p.title}</p>
            {p.variants.map((v) => (
              <p key={v.sku} className="text-sm text-cocoa/70">
                {v.sku} · {v.label} · {formatSgd(v.price)} · {v.inStock ? "in stock" : "sold out"}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
