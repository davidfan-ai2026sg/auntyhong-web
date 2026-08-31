import { cookies } from "next/headers";
import type { CartLine } from "./db";

const COOKIE = "ah_cart";

export async function readCart(): Promise<CartLine[]> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CartLine[];
    return parsed.filter((l) => l && typeof l.sku === "string" && l.qty > 0);
  } catch {
    return [];
  }
}

export async function writeCart(lines: CartLine[]) {
  const jar = await cookies();
  jar.set(COOKIE, JSON.stringify(lines), { path: "/", httpOnly: false, sameSite: "lax" });
}

export async function cartCount() {
  return (await readCart()).reduce((s, l) => s + l.qty, 0);
}
