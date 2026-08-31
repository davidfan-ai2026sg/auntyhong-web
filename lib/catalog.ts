import catalogJson from "@/data/catalog.json";
import imagesJson from "@/data/images.json";

export type Variant = {
  sku: string;
  price: number;
  label: string;
  stock: number;
  unlimited: boolean;
  inStock: boolean;
};

export type Product = {
  slug: string;
  title: string;
  sku: string;
  description: string;
  categories: string[];
  image: string;
  soldOut: boolean;
  variants: Variant[];
  fromPrice: number;
};

const IMAGE_OVERRIDES: Record<string, string> = {
  "shrimp-fries":
    "https://images.squarespace-cdn.com/content/v1/5fd98b8d82917438944c7944/1609214836429-1JMGD3QPI6YG0STATGX3/1.+Shrimp+Fries.png",
  "tom-yum-goong-cashews":
    "https://images.squarespace-cdn.com/content/v1/5fd98b8d82917438944c7944/1665729590039-MTTGORAKZP5T1MZAY5EM/_5D_7256-Edit.jpg",
  "the-prosperity-mix":
    "https://images.squarespace-cdn.com/content/v1/5fd98b8d82917438944c7944/1665979008283-IMZCX13TDQHB1XXJ7S7V/_5D_7496-Edit.jpg",
  "family-pack-organic-handmade-noodles":
    "https://images.squarespace-cdn.com/content/v1/5fd98b8d82917438944c7944/47525652-2f05-4799-8110-cb71093e3d5c/Aunty+Hong%27s+Organic+Handmade+Noodles+-+Family+Pack+%28Original%29.jpg",
  "lucky-duo-cookies-giftset":
    "https://images.squarespace-cdn.com/content/v1/5fd98b8d82917438944c7944/1701063546598-2YJSVOAMNWCQL6ECMVLD/Lucky+Duo_Low+Res.jpg",
};

function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function niceCategory(raw: string) {
  if (/^[0-9a-f]{20,}$/i.test(raw)) return "";
  return raw;
}

const products: Product[] = (catalogJson as Array<{
  title: string;
  url: string;
  sku: string;
  excerpt: string;
  categories: string[];
  variants: Array<{
    sku: string;
    price: string;
    attrs: Record<string, string>;
    stock: number;
    unlimited: boolean;
  }>;
  soldOut: boolean;
}>).map((raw) => {
  const slug = raw.url.replace("/store/p/", "");
  const variants: Variant[] = raw.variants.map((v) => {
    const label = Object.values(v.attrs)[0] || "Standard";
    const inStock = raw.soldOut ? false : v.unlimited || v.stock > 0;
    return {
      sku: v.sku,
      price: Number(v.price),
      label,
      stock: v.stock,
      unlimited: v.unlimited,
      inStock,
    };
  });
  const cats = raw.categories.map(niceCategory).filter(Boolean);
  const image =
    IMAGE_OVERRIDES[slug] ||
    (imagesJson as { products: Record<string, string> }).products[slug] ||
    imagesJson.named["cny-banner"];
  return {
    slug,
    title: raw.title,
    sku: raw.sku,
    description: stripHtml(raw.excerpt),
    categories: cats.length ? cats : ["Shop"],
    image,
    soldOut: raw.soldOut || variants.every((v) => !v.inStock),
    variants,
    fromPrice: Math.min(...variants.map((v) => v.price)),
  };
});

export const NAMED_IMAGES = imagesJson.named as Record<string, string>;

export function listProducts() {
  return products;
}

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function findVariant(sku: string) {
  for (const p of products) {
    const v = p.variants.find((x) => x.sku === sku);
    if (v) return { product: p, variant: v };
  }
  return undefined;
}

export function categories() {
  const set = new Set<string>();
  for (const p of products) for (const c of p.categories) set.add(c);
  return ["All", ...Array.from(set)];
}

export function featured() {
  const order = [
    "shrimp-fries",
    "bundle-of-joy-cny-gift-set",
    "lucky-duo-cookies-giftset",
    "the-prosperity-mix",
    "osmanthus-long-jing-tea",
    "melty-kuih-bangkit",
  ];
  return order.map(getProduct).filter(Boolean) as Product[];
}
