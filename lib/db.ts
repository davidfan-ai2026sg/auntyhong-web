import fs from "node:fs";
import path from "node:path";
import type BetterSqlite3 from "better-sqlite3";
import { cookies } from "next/headers";
import { computeTotals, nextPayNowRef, type DeliveryKind, type OrderStatus } from "./pricing";
import { findVariantIn, loadProducts } from "./catalog";
import { mutateDeskStore, readDeskStore } from "./desk-store";

const globalForDb = globalThis as unknown as { ahWebDb?: BetterSqlite3.Database };

export function dbPath() {
  const raw = process.env.DATABASE_PATH;
  if (raw) return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
  if (process.env.VERCEL) return "/tmp/auntyhong-web.db";
  return path.join(process.cwd(), "data/app.db");
}

function openSqlite(file: string): BetterSqlite3.Database {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3") as typeof import("better-sqlite3");
  return new Database(file);
}

export function nowIso() {
  return new Date().toISOString();
}

function migrate(db: BetterSqlite3.Database) {
  const journal = process.env.VERCEL ? "DELETE" : "WAL";
  db.exec(`
    PRAGMA journal_mode = ${journal};
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      min_order REAL NOT NULL,
      delivery_fee REAL NOT NULL,
      free_delivery_at REAL NOT NULL,
      express_fee REAL NOT NULL,
      paynow_copy TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      paynow_ref TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT NOT NULL DEFAULT '',
      delivery_kind TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      express_slot INTEGER NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL,
      delivery_fee REAL NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_slug TEXT NOT NULL,
      product_title TEXT NOT NULL,
      sku TEXT NOT NULL,
      variant_label TEXT NOT NULL,
      unit_price REAL NOT NULL,
      qty INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );
    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL,
      qty_hint TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS admin_products (
      sku TEXT PRIMARY KEY,
      in_stock INTEGER NOT NULL,
      price REAL,
      updated_at TEXT NOT NULL
    );
  `);
}

function seed(db: BetterSqlite3.Database) {
  const n = db.prepare("SELECT COUNT(*) AS c FROM settings").get() as { c: number };
  if (n.c === 0) {
    db.prepare(
      `INSERT INTO settings (id, min_order, delivery_fee, free_delivery_at, express_fee, paynow_copy, updated_at)
       VALUES (1, 50, 15, 120, 40, @copy, @now)`
    ).run({
      now: nowIso(),
      copy: DEFAULT_PAYNOW_COPY,
    });
  }
}

function ordersUseSqlite() {
  // Vercel /tmp sqlite is per-instance and collides across shoppers. Customer
  // orders live in the ah_orders cookie there; sqlite is for local/admin only.
  return !process.env.VERCEL;
}

export function getDb() {
  if (globalForDb.ahWebDb) return globalForDb.ahWebDb;
  try {
    const file = dbPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const db = openSqlite(file);
    migrate(db);
    seed(db);
    globalForDb.ahWebDb = db;
    return db;
  } catch (e) {
    throw e;
  }
}

export function resetDbForTests() {
  if (globalForDb.ahWebDb) {
    try { globalForDb.ahWebDb.close(); } catch { /* ignore */ }
    globalForDb.ahWebDb = undefined;
  }
  const file = dbPath();
  for (const ext of ["", "-wal", "-shm"]) {
    try { fs.unlinkSync(file + ext); } catch { /* ignore */ }
  }
  return getDb();
}

const DEFAULT_PAYNOW_COPY =
  "Demo PayNow only. Scan encodes the payment reference, not a real UEN. Kitchen will never receive live funds from this site.";

export type Settings = {
  id: number;
  min_order: number;
  delivery_fee: number;
  free_delivery_at: number;
  express_fee: number;
  paynow_copy: string;
  updated_at: string;
};

export function defaultSettings(): Settings {
  return {
    id: 1,
    min_order: 50,
    delivery_fee: 15,
    free_delivery_at: 120,
    express_fee: 40,
    paynow_copy: DEFAULT_PAYNOW_COPY,
    updated_at: nowIso(),
  };
}

export async function getSettings(): Promise<Settings> {
  const store = await readDeskStore();
  if (store.settings) return store.settings;
  return defaultSettings();
}

export async function updateSettings(patch: Partial<Settings>) {
  const store = await mutateDeskStore((s) => {
    s.settings = { ...s.settings, ...patch, id: 1, updated_at: nowIso() };
    return s;
  });
  return store.settings;
}

export type CartLine = { sku: string; qty: number; options?: Record<string, string> };

export type OrderRow = {
  id: number;
  order_no: string;
  paynow_ref: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_kind: DeliveryKind;
  address: string;
  notes: string;
  express_slot: number;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  payment_method: string;
  created_at: string;
  updated_at: string;
};

export type OrderItemRow = {
  id: number;
  order_id: number;
  product_slug: string;
  product_title: string;
  sku: string;
  variant_label: string;
  unit_price: number;
  qty: number;
};

export type OrderWithItems = OrderRow & { items: OrderItemRow[] };

export type QuotedItem = {
  product_slug: string;
  product_title: string;
  sku: string;
  variant_label: string;
  unit_price: number;
  qty: number;
  options?: Record<string, string>;
};

function optionsLabel(options?: Record<string, string>) {
  if (!options) return "";
  return Object.entries(options)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

function variantLabelForLine(base: string, options?: Record<string, string>) {
  const opt = optionsLabel(options);
  if (!opt) return base;
  if (base === "Standard") return opt;
  return `${base} · ${opt}`;
}

export async function quoteCart(lines: CartLine[], deliveryKind: DeliveryKind, expressSlot = false) {
  const settings = await getSettings();
  const products = await loadProducts();
  const items: QuotedItem[] = [];
  let subtotal = 0;
  for (const line of lines) {
    const hit = findVariantIn(products, line.sku);
    if (!hit) throw new Error(`Unknown SKU ${line.sku}`);
    if (!hit.variant.inStock) throw new Error(`${hit.product.title} is sold out`);
    const qty = Math.max(1, Math.floor(line.qty));
    subtotal += hit.variant.price * qty;
    items.push({
      product_slug: hit.product.slug,
      product_title: hit.product.title,
      sku: hit.variant.sku,
      variant_label: variantLabelForLine(hit.variant.label, line.options),
      unit_price: hit.variant.price,
      qty,
      options: line.options,
    });
  }
  const totals = computeTotals({
    subtotal,
    deliveryKind,
    expressSlot,
    minOrder: settings.min_order,
    deliveryFeeUnder: settings.delivery_fee,
    freeDeliveryAt: settings.free_delivery_at,
    expressFee: settings.express_fee,
  });
  return { items, totals, settings };
}

export const ORDER_COOKIE = "ah_orders";
export const ORDER_COOKIE_OPTS = {
  path: "/",
  httpOnly: false,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7,
  secure: Boolean(process.env.VERCEL),
};

function isOrderWithItems(value: unknown): value is OrderWithItems {
  if (!value || typeof value !== "object") return false;
  const o = value as OrderWithItems;
  return typeof o.id === "number" && typeof o.order_no === "string" && Array.isArray(o.items);
}

function parseCookieJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    /* cookie may arrive still percent-encoded */
  }
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

export async function readStoredOrders(): Promise<OrderWithItems[]> {
  try {
    const jar = await cookies();
    const raw = jar.get(ORDER_COOKIE)?.value;
    if (!raw) return [];
    const parsed = parseCookieJson(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isOrderWithItems);
  } catch {
    return [];
  }
}

export function mergeOrderIntoList(orders: OrderWithItems[], order: OrderWithItems): OrderWithItems[] {
  const rest = orders.filter((o) => o.id !== order.id && o.order_no !== order.order_no);
  return [order, ...rest].slice(0, 8);
}

export async function persistOrder(order: OrderWithItems): Promise<OrderWithItems[]> {
  const cur = await readStoredOrders();
  const next = mergeOrderIntoList(cur, order);
  try {
    const jar = await cookies();
    jar.set(ORDER_COOKIE, JSON.stringify(next), ORDER_COOKIE_OPTS);
  } catch {
    /* not in a request context (tests) */
  }
  return next;
}

function getOrderFromSqlite(id: number): OrderWithItems | undefined {
  const order = getDb().prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRow | undefined;
  if (!order) return undefined;
  const items = getDb().prepare("SELECT * FROM order_items WHERE order_id = ?").all(id) as OrderItemRow[];
  return { ...order, items };
}

export async function getOrder(id: number): Promise<OrderWithItems | undefined> {
  const cookieOrders = await readStoredOrders();
  const fromCookie = cookieOrders.find((o) => o.id === id);
  if (fromCookie) return fromCookie;
  if (!ordersUseSqlite()) return undefined;
  try {
    return getOrderFromSqlite(id);
  } catch {
    return undefined;
  }
}

export async function findCustomerOrder(key: string): Promise<OrderWithItems | undefined> {
  const trimmed = String(key || "").trim();
  if (!trimmed) return undefined;
  const asNum = Number(trimmed);
  if (Number.isFinite(asNum) && asNum > 0) {
    const byId = await getOrder(asNum);
    if (byId) return byId;
  }
  return getOrderByRef(trimmed);
}

export async function getOrderByRef(ref: string): Promise<OrderWithItems | undefined> {
  const cookieOrders = await readStoredOrders();
  const fromCookie = cookieOrders.find((o) => o.paynow_ref === ref || o.order_no === ref);
  if (fromCookie) return fromCookie;
  if (!ordersUseSqlite()) return undefined;
  try {
    const order = getDb()
      .prepare("SELECT * FROM orders WHERE paynow_ref = ? OR order_no = ?")
      .get(ref, ref) as OrderRow | undefined;
    if (order) return getOrderFromSqlite(order.id);
  } catch {
    /* sqlite miss or unavailable */
  }
  return undefined;
}

export async function listOrders(): Promise<OrderWithItems[]> {
  const seen = new Set<string>();
  const out: OrderWithItems[] = [];
  const remember = (o: OrderWithItems) => {
    const key = `${o.id}:${o.order_no}`;
    if (seen.has(key) || seen.has(`id:${o.id}`) || seen.has(`no:${o.order_no}`)) return;
    seen.add(key);
    seen.add(`id:${o.id}`);
    seen.add(`no:${o.order_no}`);
    out.push(o);
  };
  if (ordersUseSqlite()) {
    try {
      const rows = getDb().prepare("SELECT * FROM orders ORDER BY id DESC").all() as OrderRow[];
      for (const r of rows) {
        const o = getOrderFromSqlite(r.id);
        if (o) remember(o);
      }
    } catch {
      /* sqlite unavailable */
    }
  }
  for (const o of await readStoredOrders()) remember(o);
  out.sort((a, b) => b.id - a.id);
  return out;
}

export async function createOrder(input: {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_kind: DeliveryKind;
  address: string;
  notes: string;
  express_slot: boolean;
  lines: CartLine[];
}): Promise<OrderWithItems> {
  const { items, totals } = await quoteCart(input.lines, input.delivery_kind, input.express_slot);
  if (!items.length) throw new Error("Cart is empty");
  if (totals.belowMinimum) throw new Error(`Minimum order is S$${totals.minOrder.toFixed(2)}`);
  if (!input.customer_name.trim()) throw new Error("Name is required");
  if (!input.customer_phone.trim()) throw new Error("Phone is required");
  if (input.delivery_kind === "delivery" && !input.address.trim()) {
    throw new Error("Delivery address is required");
  }
  const now = nowIso();
  const customer = {
    customer_name: input.customer_name.trim(),
    customer_phone: input.customer_phone.trim(),
    customer_email: input.customer_email.trim(),
    delivery_kind: input.delivery_kind,
    address: input.address.trim(),
    notes: input.notes.trim(),
    express_slot: input.express_slot ? 1 : 0,
    subtotal: totals.subtotal,
    delivery_fee: totals.delivery,
    total: totals.total,
  };

  function assemble(id: number, order_no: string, paynow_ref: string, itemRows?: OrderItemRow[]): OrderWithItems {
    return {
      id,
      order_no,
      paynow_ref,
      ...customer,
      status: "pending_payment",
      payment_method: "",
      created_at: now,
      updated_at: now,
      items:
        itemRows ??
        items.map((it, i) => ({
          id: i + 1,
          order_id: id,
          product_slug: it.product_slug,
          product_title: it.product_title,
          sku: it.sku,
          variant_label: it.variant_label,
          unit_price: it.unit_price,
          qty: it.qty,
        })),
    };
  }

  let order: OrderWithItems | undefined;
  try {
    if (!ordersUseSqlite()) throw new Error("skip sqlite");
    const db = getDb();
    const tx = db.transaction(() => {
      const seq = (db.prepare("SELECT COUNT(*) AS c FROM orders").get() as { c: number }).c + 1;
      const paynow = nextPayNowRef(seq);
      const orderNo = paynow.replace("AH-", "AH");
      const info = db
        .prepare(
          `INSERT INTO orders (order_no, paynow_ref, customer_name, customer_phone, customer_email, delivery_kind, address, notes, express_slot, subtotal, delivery_fee, total, status, payment_method, created_at, updated_at)
           VALUES (@order_no, @paynow_ref, @customer_name, @customer_phone, @customer_email, @delivery_kind, @address, @notes, @express_slot, @subtotal, @delivery_fee, @total, 'pending_payment', '', @now, @now)`
        )
        .run({
          order_no: orderNo,
          paynow_ref: paynow,
          customer_name: customer.customer_name,
          customer_phone: customer.customer_phone,
          customer_email: customer.customer_email,
          delivery_kind: customer.delivery_kind,
          address: customer.address,
          notes: customer.notes,
          express_slot: customer.express_slot,
          subtotal: customer.subtotal,
          delivery_fee: customer.delivery_fee,
          total: customer.total,
          now,
        });
      const id = Number(info.lastInsertRowid);
      const ins = db.prepare(
        `INSERT INTO order_items (order_id, product_slug, product_title, sku, variant_label, unit_price, qty)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      for (const it of items) ins.run(id, it.product_slug, it.product_title, it.sku, it.variant_label, it.unit_price, it.qty);
      return id;
    });
    const id = tx();
    order = getOrderFromSqlite(id) ?? assemble(id, "", "");
  } catch {
    const existing = await readStoredOrders();
    const id = Math.max(0, ...existing.map((o) => o.id)) + 1;
    const seq = existing.length + 1;
    const paynow = nextPayNowRef(seq);
    const orderNo = paynow.replace("AH-", "AH");
    order = assemble(id, orderNo, paynow);
  }
  await persistOrder(order);
  return order;
}

export async function setOrderStatus(id: number, status: OrderStatus, paymentMethod?: string) {
  if (ordersUseSqlite()) {
    try {
      const cur = getOrderFromSqlite(id);
      if (cur) {
        getDb()
          .prepare("UPDATE orders SET status = ?, payment_method = COALESCE(?, payment_method), updated_at = ? WHERE id = ?")
          .run(status, paymentMethod ?? cur.payment_method, nowIso(), id);
      }
    } catch {
      /* sqlite unavailable */
    }
  }
  let order: OrderWithItems | undefined = await getOrder(id);
  if (!order) return undefined;
  const next: OrderWithItems = {
    ...order,
    status,
    payment_method: paymentMethod ?? order.payment_method,
    updated_at: nowIso(),
  };
  await persistOrder(next);
  return next;
}

export type Enquiry = {
  id: number;
  company: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  qty_hint: string;
  created_at: string;
};

export async function createEnquiry(input: {
  company: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  qty_hint: string;
}) {
  const store = await mutateDeskStore((s) => {
    const id = s.nextEnquiryId++;
    const row: Enquiry = {
      id,
      company: input.company,
      name: input.name,
      email: input.email,
      phone: input.phone,
      message: input.message,
      qty_hint: input.qty_hint,
      created_at: nowIso(),
    };
    s.enquiries = [row, ...s.enquiries];
    return s;
  });
  return store.enquiries[0]?.id ?? 0;
}

export async function listEnquiries(): Promise<Enquiry[]> {
  const store = await readDeskStore();
  return [...store.enquiries].sort((a, b) => b.id - a.id);
}

export async function deleteEnquiry(id: number): Promise<boolean> {
  let removed = false;
  await mutateDeskStore((s) => {
    const before = s.enquiries.length;
    s.enquiries = s.enquiries.filter((e) => e.id !== id);
    removed = s.enquiries.length < before;
    return s;
  });
  return removed;
}
