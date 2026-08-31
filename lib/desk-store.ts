import fs from "node:fs";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import type { Product } from "./catalog";
import type { Enquiry, Settings } from "./db";

export type DeskStore = {
  version: number;
  products: Product[];
  enquiries: Enquiry[];
  settings: Settings;
  nextEnquiryId: number;
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

/** Runtime env read. Bracket access avoids Next.js inlining `process.env.NAME` as empty from a cached build. */
function runtimeEnv(name: string): string {
  try {
    const value = process.env[name];
    return typeof value === "string" ? value.trim() : "";
  } catch {
    return "";
  }
}

function onVercel() {
  return Boolean(runtimeEnv("VERCEL"));
}

function blobToken() {
  return runtimeEnv("BLOB_READ_WRITE_TOKEN");
}

/**
 * On Vercel the kitchen desk is always Blob. @vercel/blob can authenticate via
 * OIDC (VERCEL_OIDC_TOKEN + BLOB_STORE_ID) even when a long-lived token was
 * missing at build time. Do not gate on process.env.BLOB_READ_WRITE_TOKEN —
 * Next can replace that identifier with "" from the original 236e299 cache.
 */
function useBlob() {
  if (onVercel()) return true;
  return Boolean(blobToken());
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
  const storeId = runtimeEnv("BLOB_STORE_ID");
  const oidcToken = runtimeEnv("VERCEL_OIDC_TOKEN");
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
  const products =
    Array.isArray(partial?.products) && partial.products.length > 0
      ? partial.products
      : seedProducts();
  const settings = partial?.settings && typeof partial.settings === "object"
    ? { ...defaultSettings(), ...partial.settings, id: 1 }
    : defaultSettings();
  const enquiries = Array.isArray(partial?.enquiries) ? partial.enquiries : [];
  const maxId = enquiries.reduce((m, e) => Math.max(m, Number(e?.id) || 0), 0);
  const nextEnquiryId = Math.max(Number(partial?.nextEnquiryId) || 1, maxId + 1);
  return {
    version: Number(partial?.version) || 0,
    products,
    enquiries,
    settings,
    nextEnquiryId,
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

async function readBlobStore(): Promise<Partial<DeskStore> | null> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({
      prefix: "desk/store",
      ...blobAuth(),
    });
    const blob =
      blobs.find((b) => b.pathname === BLOB_PATH) ||
      blobs.find((b) => b.pathname.startsWith("desk/store")) ||
      blobs[0];
    if (!blob?.url) return null;
    const sep = blob.url.includes("?") ? "&" : "?";
    const res = await fetch(`${blob.url}${sep}t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`blob fetch ${res.status}`);
    const parsed = (await res.json()) as Partial<DeskStore>;
    if (!parsed || typeof parsed !== "object") throw new Error("blob json");
    return parsed;
  } catch (cause) {
    throw deskUnavailable(cause);
  }
}

async function writeBlobStore(store: DeskStore) {
  try {
    const { put } = await import("@vercel/blob");
    await put(BLOB_PATH, JSON.stringify(store), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 0,
      ...blobAuth(),
    });
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
  if (!raw || !Array.isArray(raw.products) || raw.products.length === 0) {
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
    if (useBlob()) throw cause;
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
