import catalogJson from "@/data/catalog.json";
import imagesJson from "@/data/images.json";
import { deskEpoch, mutateDeskStore, readDeskStore } from "./desk-store";

export type Variant = {
  sku: string;
  price: number;
  label: string;
  stock: number;
  unlimited: boolean;
  inStock: boolean;
};

export type AdditionalField = {
  title: string;
  required: boolean;
  options: string[];
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
  additionalFields: AdditionalField[];
};

export type ProductWrite = Partial<Product> & {
  title: string;
  price?: number;
  stock?: number;
  unlimited?: boolean;
  label?: string;
  /** Alias for additionalFields (gift-box option groups). */
  options?: AdditionalField[];
};

const IMAGE_OVERRIDES: Record<string, string> = {};

const images = imagesJson as { products: Record<string, string>; named: Record<string, string> };

export const NAMED_IMAGES = images.named;

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

export function fallbackProductImage() {
  return NAMED_IMAGES["cny-banner"] || "";
}

export function seedProducts(): Product[] {
  return (
    catalogJson as Array<{
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
      additionalFields?: AdditionalField[];
    }>
  ).map((raw) => {
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
    const image = IMAGE_OVERRIDES[slug] || images.products[slug] || fallbackProductImage();
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
      additionalFields: raw.additionalFields || [],
    };
  });
}

let productCache: { version: number; epoch: number; products: Product[] } | null = null;

export async function loadProducts(): Promise<Product[]> {
  const store = await readDeskStore();
  const epoch = deskEpoch();
  if (productCache && productCache.version === store.version && productCache.epoch === epoch) {
    return productCache.products;
  }
  productCache = { version: store.version, epoch, products: store.products };
  return store.products;
}

export function invalidateProductCache() {
  productCache = null;
}

export async function listProducts() {
  return loadProducts();
}

export async function getProduct(slug: string) {
  return (await loadProducts()).find((p) => p.slug === slug);
}

export function findVariantIn(products: Product[], sku: string) {
  for (const p of products) {
    const v = p.variants.find((x) => x.sku === sku);
    if (v) return { product: p, variant: v };
  }
  return undefined;
}

export async function findVariant(sku: string) {
  return findVariantIn(await loadProducts(), sku);
}

export async function categories() {
  const set = new Set<string>();
  for (const p of await loadProducts()) for (const c of p.categories) set.add(c);
  return ["All", ...Array.from(set)];
}

export async function featured() {
  const order = [
    "the-prosperity-mix",
    "lucky-duo-cookies-giftset",
    "bundle-of-joy-cny-gift-set",
    "spring-blossom-box",
    "osmanthus-long-jing-tea",
    "melty-kuih-bangkit",
  ];
  const products = await loadProducts();
  return order.map((slug) => products.find((p) => p.slug === slug)).filter(Boolean) as Product[];
}

export function slugifyTitle(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "product";
}

function uniqueSlug(products: Product[], desired: string, keep?: string) {
  if (keep && desired === keep) return keep;
  if (!products.some((p) => p.slug === desired && p.slug !== keep)) return desired;
  let i = 2;
  while (products.some((p) => p.slug === `${desired}-${i}`)) i += 1;
  return `${desired}-${i}`;
}

function asStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return undefined;
}

function asFields(value: unknown): AdditionalField[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((f) => {
    const row = f as AdditionalField;
    return {
      title: String(row.title || ""),
      required: Boolean(row.required),
      options: Array.isArray(row.options) ? row.options.map((o) => String(o)) : [],
    };
  });
}

export function recomputeProduct(p: Product): Product {
  const soldOutFlag = Boolean(p.soldOut);
  const variants = (p.variants?.length
    ? p.variants
    : [
        {
          sku: p.sku || `AH-${Date.now()}`,
          price: 0,
          label: "Standard",
          stock: 0,
          unlimited: true,
          inStock: true,
        },
      ]
  ).map((v) => {
    const unlimited = Boolean(v.unlimited);
    const stock = Number(v.stock) || 0;
    const price = Number(v.price) || 0;
    return {
      sku: String(v.sku || p.sku || `AH-${Date.now()}`),
      price,
      label: String(v.label || "Standard"),
      stock,
      unlimited,
      inStock: !soldOutFlag && (unlimited || stock > 0),
    };
  });
  const fromPrice = variants.length ? Math.min(...variants.map((v) => v.price)) : 0;
  return {
    slug: p.slug,
    title: p.title,
    sku: p.sku || variants[0]?.sku || "",
    description: p.description || "",
    categories: p.categories?.length ? p.categories : ["Shop"],
    image: p.image || fallbackProductImage(),
    soldOut: soldOutFlag || variants.every((v) => !v.inStock),
    variants,
    fromPrice,
    additionalFields: p.additionalFields || [],
  };
}

function applyConvenience(base: Product, patch: Partial<ProductWrite>): Product {
  const next: Product = {
    ...base,
    title: patch.title ?? base.title,
    slug: patch.slug ?? base.slug,
    sku: patch.sku ?? base.sku,
    description: patch.description ?? base.description,
    image: patch.image ?? base.image,
    soldOut: patch.soldOut ?? base.soldOut,
    categories: asStringArray(patch.categories) ?? patch.categories ?? base.categories,
    additionalFields:
      asFields(patch.additionalFields ?? patch.options) ??
      patch.additionalFields ??
      patch.options ??
      base.additionalFields,
    variants: patch.variants ? patch.variants.map((v) => ({ ...v })) : base.variants.map((v) => ({ ...v })),
    fromPrice: base.fromPrice,
  };
  if (!next.variants.length) {
    next.variants = [
      {
        sku: next.sku || `AH-${Date.now()}`,
        price: Number(patch.price) || 0,
        label: patch.label || "Standard",
        stock: Number(patch.stock) || 0,
        unlimited: patch.unlimited ?? true,
        inStock: true,
      },
    ];
  } else {
    const v = next.variants[0];
    if (patch.price != null && Number.isFinite(Number(patch.price))) v.price = Number(patch.price);
    if (patch.stock != null && Number.isFinite(Number(patch.stock))) v.stock = Number(patch.stock);
    if (patch.unlimited != null) v.unlimited = Boolean(patch.unlimited);
    if (patch.label) v.label = String(patch.label);
    if (patch.sku) v.sku = String(patch.sku);
  }
  if (patch.sku) next.sku = String(patch.sku);
  return recomputeProduct(next);
}

export async function upsertProduct(input: ProductWrite): Promise<Product> {
  invalidateProductCache();
  let product: Product | undefined;
  await mutateDeskStore((s) => {
    const existing = input.slug ? s.products.find((p) => p.slug === input.slug) : undefined;
    if (existing) {
      const updated = applyConvenience(existing, input);
      s.products = s.products.map((p) => (p.slug === existing.slug ? updated : p));
      product = updated;
      return s;
    }
    const slug = uniqueSlug(s.products, slugifyTitle(input.slug || input.title));
    const sku = String(input.sku || `AH-${Date.now()}`);
    const created = applyConvenience(
      {
        slug,
        title: input.title,
        sku,
        description: input.description || "",
        categories: ["Shop"],
        image: fallbackProductImage(),
        soldOut: false,
        variants: [],
        fromPrice: 0,
        additionalFields: [],
      },
      { ...input, slug, sku }
    );
    s.products = [...s.products, created];
    product = created;
    return s;
  });
  invalidateProductCache();
  if (!product) throw new Error("Could not save product");
  return product;
}

export async function updateProduct(slug: string, patch: Partial<ProductWrite>): Promise<Product> {
  invalidateProductCache();
  let updated: Product | undefined;
  await mutateDeskStore((s) => {
    const idx = s.products.findIndex((p) => p.slug === slug);
    if (idx < 0) throw new Error("Product not found");
    const next = applyConvenience(s.products[idx], { ...patch, title: patch.title || s.products[idx].title });
    next.slug = slug;
    s.products[idx] = next;
    updated = next;
    return s;
  });
  invalidateProductCache();
  if (!updated) throw new Error("Product not found");
  return updated;
}

export async function deleteProduct(slug: string): Promise<boolean> {
  invalidateProductCache();
  let removed = false;
  await mutateDeskStore((s) => {
    const before = s.products.length;
    s.products = s.products.filter((p) => p.slug !== slug);
    removed = s.products.length < before;
    return s;
  });
  invalidateProductCache();
  return removed;
}

export async function setProductStock(input: {
  slug: string;
  sku?: string;
  stock?: number;
  unlimited?: boolean;
  soldOut?: boolean;
  inStock?: boolean;
}): Promise<Product> {
  invalidateProductCache();
  let updated: Product | undefined;
  await mutateDeskStore((s) => {
    const idx = s.products.findIndex((p) => p.slug === input.slug);
    if (idx < 0) throw new Error("Product not found");
    const product = { ...s.products[idx], variants: s.products[idx].variants.map((v) => ({ ...v })) };
    const variant =
      (input.sku ? product.variants.find((v) => v.sku === input.sku) : undefined) || product.variants[0];
    if (!variant) throw new Error("Variant not found");
    if (input.stock != null && Number.isFinite(Number(input.stock))) variant.stock = Number(input.stock);
    if (input.unlimited != null) variant.unlimited = Boolean(input.unlimited);
    if (input.soldOut != null) product.soldOut = Boolean(input.soldOut);
    if (input.inStock != null) {
      if (input.inStock) {
        product.soldOut = false;
        if (!variant.unlimited && variant.stock <= 0) variant.unlimited = true;
      } else if (input.soldOut == null) {
        product.soldOut = true;
      }
    }
    const next = recomputeProduct(product);
    s.products[idx] = next;
    updated = next;
    return s;
  });
  invalidateProductCache();
  if (!updated) throw new Error("Product not found");
  return updated;
}

export async function clearAllProducts(): Promise<number> {
  invalidateProductCache();
  let n = 0;
  await mutateDeskStore((s) => {
    n = s.products.length;
    s.products = [];
    return s;
  });
  invalidateProductCache();
  return n;
}

export async function decrementStockForLines(
  lines: Array<{ product_slug: string; sku: string; qty: number }>
): Promise<void> {
  if (!lines.length) return;
  invalidateProductCache();
  await mutateDeskStore((s) => {
    for (const line of lines) {
      const idx = s.products.findIndex((p) => p.slug === line.product_slug);
      if (idx < 0) continue;
      const product = {
        ...s.products[idx],
        variants: s.products[idx].variants.map((v) => ({ ...v })),
      };
      const variant =
        product.variants.find((v) => v.sku === line.sku) || product.variants[0];
      if (!variant || variant.unlimited) continue;
      const qty = Math.max(1, Math.floor(Number(line.qty) || 1));
      variant.stock = Math.max(0, Number(variant.stock) - qty);
      s.products[idx] = recomputeProduct(product);
    }
    return s;
  });
  invalidateProductCache();
}
