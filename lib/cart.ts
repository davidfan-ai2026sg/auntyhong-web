import { cookies } from "next/headers";
import type { CartLine } from "./db";

export const CART_COOKIE = "ah_cart";
export const CART_COOKIE_OPTS = { path: "/", httpOnly: false, sameSite: "lax" as const };

export function cartLineKey(sku: string, options?: Record<string, string>) {
  return sku + "::" + JSON.stringify(options || {});
}

export async function readCart(): Promise<CartLine[]> {
  const jar = await cookies();
  const raw = jar.get(CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = JSON.parse(decodeURIComponent(raw));
    }
    if (!Array.isArray(parsed)) return [];
    return (parsed as CartLine[]).filter((l) => l && typeof l.sku === "string" && l.qty > 0);
  } catch {
    return [];
  }
}

export async function writeCart(lines: CartLine[]) {
  const jar = await cookies();
  jar.set(CART_COOKIE, JSON.stringify(lines), CART_COOKIE_OPTS);
}

export async function cartCount() {
  return (await readCart()).reduce((s, l) => s + l.qty, 0);
}
