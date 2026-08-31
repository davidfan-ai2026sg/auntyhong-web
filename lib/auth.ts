import { cookies } from "next/headers";
import { createHash } from "node:crypto";

const COOKIE = "ah_admin";

export function adminPassword() {
  return process.env.ADMIN_PASSWORD || "auntyhong-demo";
}

export function sessionToken() {
  return createHash("sha256").update(`auntyhong:${adminPassword()}`).digest("hex");
}

export async function isAdmin() {
  const jar = await cookies();
  return jar.get(COOKIE)?.value === sessionToken();
}

export async function requireAdmin() {
  if (!(await isAdmin())) {
    throw new Error("Unauthorized");
  }
}

export { COOKIE as ADMIN_COOKIE };
