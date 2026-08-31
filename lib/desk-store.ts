import fs from "node:fs";
import path from "node:path";
import type { Product } from "./catalog";
import type { Enquiry, Settings } from "./db";

export type DeskStore = {
  version: number;
  products: Product[];
  enquiries: Enquiry[];
  settings: Settings;
  nextEnquiryId: number;
};

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

export function deskFilePath() {
  if (!process.env.VERCEL) {
    const raw = process.env.DESK_PATH;
    if (raw) return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
    return path.join(process.cwd(), "data/desk.json");
  }
  return "/tmp/auntyhong-desk.json";
}

function useBlob() {
  return Boolean(process.env.VERCEL && process.env.BLOB_READ_WRITE_TOKEN);
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

async function readBlobStore(): Promise<Partial<DeskStore> | null> {
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({
    prefix: "desk/store",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  const blob =
    blobs.find((b) => b.pathname === BLOB_PATH) ||
    blobs.find((b) => b.pathname.startsWith("desk/store")) ||
    blobs[0];
  if (!blob?.url) return null;
  const sep = blob.url.includes("?") ? "&" : "?";
  const res = await fetch(`${blob.url}${sep}t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) return null;
  const parsed = (await res.json()) as Partial<DeskStore>;
  if (!parsed || typeof parsed !== "object") return null;
  return parsed;
}

async function writeBlobStore(store: DeskStore) {
  const { put } = await import("@vercel/blob");
  await put(BLOB_PATH, JSON.stringify(store), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    cacheControlMaxAge: 60,
  });
}

async function readFromBackend(): Promise<Partial<DeskStore> | null> {
  if (useBlob()) {
    try {
      const blob = await readBlobStore();
      if (blob) return blob;
    } catch {
      /* blob unavailable — try local file so this instance does not 500 */
    }
  }
  return readFileStore(deskFilePath());
}

async function persistStore(store: DeskStore) {
  if (useBlob()) {
    try {
      await writeBlobStore(store);
      return;
    } catch {
      /* keep a per-instance copy so the kitchen desk still works */
    }
  }
  try {
    await writeFileStore(deskFilePath(), store);
  } catch {
    /* memory remains the live copy */
  }
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
  const cached = memoryFresh();
  if (cached) return cached;
  try {
    return await loadFresh();
  } catch {
    const fallback = await seedStore(globalForDesk.ahDeskMemory || null);
    setMemory(fallback);
    return fallback;
  }
}

export async function mutateDeskStore(
  mutator: (store: DeskStore) => DeskStore | Promise<DeskStore>
): Promise<DeskStore> {
  return withLock(async () => {
    const current = cloneStore(await loadFresh());
    const next = await mutator(current);
    next.version = (Number(current.version) || 0) + 1;
    if (!Array.isArray(next.products)) next.products = current.products;
    if (!Array.isArray(next.enquiries)) next.enquiries = current.enquiries;
    if (!next.settings) next.settings = current.settings;
    if (!next.nextEnquiryId) next.nextEnquiryId = current.nextEnquiryId;
    setMemory(next);
    try {
      await persistStore(next);
    } catch {
      /* in-memory write still counts for this isolate */
    }
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
