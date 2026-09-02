import fs from "node:fs";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import type { Product } from "./catalog";
import type { Enquiry, Settings } from "./db";
import type { Voucher } from "./vouchers";

export type DeskOrderItem = {
  id: number;
  order_id: number;
  product_slug: string;
  product_title: string;
  sku: string;
  variant_label: string;
  unit_price: number;
  qty: number;
};

export type DeskOrder = {
  id: number;
  order_no: string;
  paynow_ref: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_kind: "delivery" | "collect";
  address: string;
  notes: string;
  express_slot: number;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  payment_method: string;
  created_at: string;
  updated_at: string;
  requested_date?: string;
  stock_decremented?: boolean;
  invoice_no?: string;
  stripe_payment_intent_id?: string;
  voucher_code?: string;
  discount?: number;
  items: DeskOrderItem[];
};

export type DeskStore = {
  version: number;
  products: Product[];
  enquiries: Enquiry[];
  settings: Settings;
  nextEnquiryId: number;
  orders: DeskOrder[];
  vouchers: Voucher[];
};

export type DeskStorage = "blob" | "file" | "tmp";

const globalForDesk = globalThis as unknown as {
  ahDeskMemory?: DeskStore;
  ahDeskMemoryAt?: number;
  ahDeskWrite?: Promise<unknown>;
  ahDeskEpoch?: number;
};

export function deskEpoch() {
  return globalForDesk.ahDeskEpoch || 0;
}

const CACHE_MS = 2000;
const BLOB_PATH = "desk/store.json";

/** Runtime env read. Assemble the env NAME at runtime so Next cannot statically replace process.env.BLOB_READ_WRITE_TOKEN with "" from a cached build. */
function runtimeEnv(parts: string | string[]): string {
  try {
    const name = Array.isArray(parts) ? parts.join("_") : parts;
    const env = process.env as Record<string, string | undefined>;
    const value = env[name];
    return typeof value === "string" ? value.trim() : "";
  } catch {
    return "";
  }
}

function onVercel() {
  return Boolean(runtimeEnv("VERCEL"));
}

function blobToken() {
  return runtimeEnv(["BLOB", "READ", "WRITE", "TOKEN"]);
}

/**
 * Use Blob only when a token or OIDC+storeId is actually present; skip during
 * next build; otherwise /tmp+seed so the shop stays up.
 */
function isNextBuild() {
  return runtimeEnv(["NEXT", "PHASE"]) === "phase-production-build";
}

function hasBlobCredentials() {
  if (blobToken()) return true;
  return Boolean(runtimeEnv(["VERCEL", "OIDC", "TOKEN"]) && runtimeEnv(["BLOB", "STORE", "ID"]));
}

function useBlob() {
  if (isNextBuild()) return false;
  return hasBlobCredentials();
}

export function deskStorage(): DeskStorage {
  if (useBlob()) return "blob";
  if (onVercel()) return "tmp";
  return "file";
}

export function deskFilePath() {
  if (onVercel()) return "/tmp/auntyhong-desk.json";
  const raw = runtimeEnv("DESK_PATH");
  if (raw) return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
  return path.join(process.cwd(), "data/desk.json");
}

function blobAuth(): { token?: string; storeId?: string; oidcToken?: string } {
  const token = blobToken();
  const storeId = runtimeEnv(["BLOB", "STORE", "ID"]);
  const oidcToken = runtimeEnv(["VERCEL", "OIDC", "TOKEN"]);
  return {
    ...(token ? { token } : {}),
    ...(storeId ? { storeId } : {}),
    ...(oidcToken ? { oidcToken } : {}),
  };
}

function cloneStore(store: DeskStore): DeskStore {
  return JSON.parse(JSON.stringify(store)) as DeskStore;
}

function setMemory(store: DeskStore) {
  globalForDesk.ahDeskMemory = store;
  globalForDesk.ahDeskMemoryAt = Date.now();
}

function memoryFresh() {
  const at = globalForDesk.ahDeskMemoryAt || 0;
  return globalForDesk.ahDeskMemory && Date.now() - at < CACHE_MS
    ? globalForDesk.ahDeskMemory
    : undefined;
}

function skipStaticCache() {
  try {
    noStore();
  } catch {
    /* tests / non-Next */
  }
}

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = globalForDesk.ahDeskWrite ?? Promise.resolve();
  let release: (v: unknown) => void = () => undefined;
  globalForDesk.ahDeskWrite = new Promise((resolve) => {
    release = resolve;
  });
  await prev.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release(undefined);
  }
}

async function seedStore(partial?: Partial<DeskStore> | null): Promise<DeskStore> {
  const { seedProducts } = await import("./catalog");
  const { defaultSettings } = await import("./db");
  // Explicit empty array is allowed (kitchen cleared catalogue). Only seed when missing.
  const products = Array.isArray(partial?.products) ? partial.products : seedProducts();
  const settings = partial?.settings && typeof partial.settings === "object"
    ? { ...defaultSettings(), ...partial.settings, id: 1 }
    : defaultSettings();
  const enquiries = Array.isArray(partial?.enquiries) ? partial.enquiries : [];
  const maxId = enquiries.reduce((m, e) => Math.max(m, Number(e?.id) || 0), 0);
  const nextEnquiryId = Math.max(Number(partial?.nextEnquiryId) || 1, maxId + 1);
  const orders = Array.isArray(partial?.orders) ? (partial.orders as DeskOrder[]) : [];
  // Explicit empty vouchers array is allowed. Seed demo codes only when missing.
  let vouchers: Voucher[];
  if (Array.isArray(partial?.vouchers)) {
    vouchers = partial.vouchers as Voucher[];
  } else {
    const { seedVouchers } = await import("./vouchers");
    vouchers = seedVouchers();
  }
  return {
    version: Number(partial?.version) || 0,
    products,
    enquiries,
    settings,
    nextEnquiryId,
    orders,
    vouchers,
  };
}

async function readFileStore(file: string): Promise<Partial<DeskStore> | null> {
  try {
    const raw = await fs.promises.readFile(file, "utf8");
    const parsed = JSON.parse(raw) as Partial<DeskStore>;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    try {
      const raw = fs.readFileSync(file, "utf8");
      return JSON.parse(raw) as Partial<DeskStore>;
    } catch {
      return null;
    }
  }
}

async function writeFileStore(file: string, store: DeskStore) {
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  const body = JSON.stringify(store);
  await fs.promises.writeFile(tmp, body, "utf8");
  await fs.promises.rename(tmp, file);
}

function deskUnavailable(cause?: unknown): Error {
  const err = new Error("Kitchen desk storage is unavailable");
  if (cause instanceof Error && cause.message) {
    console.error("[desk] blob failed:", cause.name, cause.message);
  } else if (cause) {
    console.error("[desk] blob failed");
  }
  return err;
}

function isBlobAccessMismatch(cause: unknown): boolean {
  const msg = (
    cause instanceof Error ? cause.message : typeof cause === "string" ? cause : ""
  ).toLowerCase();
  if (!msg) return false;
  // Private stores reject access:"public" (and vice versa) with BlobAccessError /
  // messages that mention public vs private access.
  return (
    (msg.includes("public") && msg.includes("private")) ||
    msg.includes("access denied") ||
    (cause instanceof Error && cause.name === "BlobAccessError")
  );
}

async function readBlobBody(
  access: "private" | "public"
): Promise<Partial<DeskStore> | null> {
  const { get } = await import("@vercel/blob");
  const result = await get(BLOB_PATH, {
    access,
    useCache: false,
    ...blobAuth(),
  });
  if (!result) return null;
  if (!result.stream) throw new Error("blob empty stream");
  const bodyText = await new Response(result.stream).text();
  const parsed = JSON.parse(bodyText) as Partial<DeskStore>;
  if (!parsed || typeof parsed !== "object") throw new Error("blob json");
  return parsed;
}

async function readBlobStore(): Promise<Partial<DeskStore> | null> {
  try {
    try {
      return await readBlobBody("private");
    } catch (privateErr) {
      if (!isBlobAccessMismatch(privateErr)) throw privateErr;
      return await readBlobBody("public");
    }
  } catch (cause) {
    throw deskUnavailable(cause);
  }
}

async function writeBlobStore(store: DeskStore) {
  const { put } = await import("@vercel/blob");
  const body = JSON.stringify(store);
  const baseOpts = {
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 0,
    ...blobAuth(),
  };
  try {
    try {
      await put(BLOB_PATH, body, { ...baseOpts, access: "private" });
    } catch (privateErr) {
      if (!isBlobAccessMismatch(privateErr)) throw privateErr;
      await put(BLOB_PATH, body, { ...baseOpts, access: "public" });
    }
  } catch (cause) {
    throw deskUnavailable(cause);
  }
}

async function readFromBackend(): Promise<Partial<DeskStore> | null> {
  if (useBlob()) {
    return readBlobStore();
  }
  return readFileStore(deskFilePath());
}

async function persistStore(store: DeskStore) {
  if (useBlob()) {
    await writeBlobStore(store);
    return;
  }
  await writeFileStore(deskFilePath(), store);
}

async function loadFresh(): Promise<DeskStore> {
  const raw = await readFromBackend();
  const store = await seedStore(raw);
  // First boot only: no desk file yet → persist seeded catalogue.
  if (!raw) {
    store.version = Math.max(store.version, 1);
    await persistStore(store);
  }
  setMemory(store);
  return store;
}

export async function readDeskStore(): Promise<DeskStore> {
  skipStaticCache();
  if (!useBlob()) {
    const cached = memoryFresh();
    if (cached) return cached;
  }
  try {
    return await loadFresh();
  } catch (cause) {
    console.error("[desk] read failed, serving seed catalogue");
    const fallback = await seedStore(globalForDesk.ahDeskMemory || null);
    setMemory(fallback);
    return fallback;
  }
}

export async function mutateDeskStore(
  mutator: (store: DeskStore) => DeskStore | Promise<DeskStore>
): Promise<DeskStore> {
  skipStaticCache();
  return withLock(async () => {
    const current = cloneStore(await loadFresh());
    const next = await mutator(current);
    next.version = (Number(current.version) || 0) + 1;
    if (!Array.isArray(next.products)) next.products = current.products;
    if (!Array.isArray(next.enquiries)) next.enquiries = current.enquiries;
    if (!Array.isArray(next.orders)) next.orders = current.orders || [];
    if (!Array.isArray(next.vouchers)) next.vouchers = current.vouchers || [];
    if (!next.settings) next.settings = current.settings;
    if (!next.nextEnquiryId) next.nextEnquiryId = current.nextEnquiryId;
    await persistStore(next);
    setMemory(next);
    return next;
  });
}

export function resetDeskForTests() {
  globalForDesk.ahDeskMemory = undefined;
  globalForDesk.ahDeskMemoryAt = 0;
  globalForDesk.ahDeskWrite = Promise.resolve();
  globalForDesk.ahDeskEpoch = (globalForDesk.ahDeskEpoch || 0) + 1;
  const file = deskFilePath();
  for (const extra of ["", ".tmp"]) {
    try {
      fs.unlinkSync(file + extra);
    } catch {
      /* ignore */
    }
  }
}
