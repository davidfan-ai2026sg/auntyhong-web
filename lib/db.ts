import fs from "node:fs";
import path from "node:path";
import type BetterSqlite3 from "better-sqlite3";
import { computeTotals, nextPayNowRef, type DeliveryKind, type OrderStatus } from "./pricing";
import { findVariant } from "./catalog";

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
      copy: "Demo PayNow only. Scan encodes the payment reference, not a real UEN. Kitchen will never receive live funds from this site.",
    });
  }
}

export function getDb() {
  if (globalForDb.ahWebDb) return globalForDb.ahWebDb;
  const file = dbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = openSqlite(file);
  migrate(db);
  seed(db);
  globalForDb.ahWebDb = db;
  return db;
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

export type Settings = {
  id: number;
  min_order: number;
  delivery_fee: number;
  free_delivery_at: number;
  express_fee: number;
  paynow_copy: string;
  updated_at: string;
};

export function getSettings(): Settings {
  return getDb().prepare("SELECT * FROM settings WHERE id = 1").get() as Settings;
}

export function updateSettings(patch: Partial<Settings>) {
  const cur = getSettings();
  const next = { ...cur, ...patch, id: 1, updated_at: nowIso() };
  getDb()
    .prepare(
      `UPDATE settings SET min_order=@min_order, delivery_fee=@delivery_fee, free_delivery_at=@free_delivery_at,
       express_fee=@express_fee, paynow_copy=@paynow_copy, updated_at=@updated_at WHERE id=1`
    )
    .run(next);
  return getSettings();
}

export type CartLine = { sku: string; qty: number };

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

export function quoteCart(lines: CartLine[], deliveryKind: DeliveryKind, expressSlot = false) {
  const settings = getSettings();
  const items = [];
  let subtotal = 0;
  for (const line of lines) {
    const hit = findVariant(line.sku);
    if (!hit) throw new Error(`Unknown SKU ${line.sku}`);
    if (!hit.variant.inStock) throw new Error(`${hit.product.title} is sold out`);
    const qty = Math.max(1, Math.floor(line.qty));
    subtotal += hit.variant.price * qty;
    items.push({
      product_slug: hit.product.slug,
      product_title: hit.product.title,
      sku: hit.variant.sku,
      variant_label: hit.variant.label,
      unit_price: hit.variant.price,
      qty,
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

export function createOrder(input: {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_kind: DeliveryKind;
  address: string;
  notes: string;
  express_slot: boolean;
  lines: CartLine[];
}): OrderWithItems {
  const { items, totals } = quoteCart(input.lines, input.delivery_kind, input.express_slot);
  if (!items.length) throw new Error("Cart is empty");
  if (totals.belowMinimum) throw new Error(`Minimum order is S$${totals.minOrder.toFixed(2)}`);
  if (input.delivery_kind === "delivery" && !input.address.trim()) {
    throw new Error("Delivery address is required");
  }
  const db = getDb();
  const now = nowIso();
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
  return getOrder(tx())!;
}

export function getOrder(id: number): OrderWithItems | undefined {
  const order = getDb().prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRow | undefined;
  if (!order) return undefined;
  const items = getDb().prepare("SELECT * FROM order_items WHERE order_id = ?").all(id) as OrderItemRow[];
  return { ...order, items };
}

export function getOrderByRef(ref: string): OrderWithItems | undefined {
  const order = getDb()
    .prepare("SELECT * FROM orders WHERE paynow_ref = ? OR order_no = ?")
    .get(ref, ref) as OrderRow | undefined;
  return order ? getOrder(order.id) : undefined;
}

export function listOrders(): OrderWithItems[] {
  const rows = getDb().prepare("SELECT * FROM orders ORDER BY id DESC").all() as OrderRow[];
  return rows.map((r) => getOrder(r.id)!);
}

export function setOrderStatus(id: number, status: OrderStatus, paymentMethod?: string) {
  const cur = getOrder(id);
  if (!cur) return undefined;
  getDb()
    .prepare("UPDATE orders SET status = ?, payment_method = COALESCE(?, payment_method), updated_at = ? WHERE id = ?")
    .run(status, paymentMethod ?? cur.payment_method, nowIso(), id);
  return getOrder(id);
}

export function createEnquiry(input: {
  company: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  qty_hint: string;
}) {
  const info = getDb()
    .prepare(
      `INSERT INTO enquiries (company, name, email, phone, message, qty_hint, created_at)
       VALUES (@company, @name, @email, @phone, @message, @qty_hint, @now)`
    )
    .run({ ...input, now: nowIso() });
  return Number(info.lastInsertRowid);
}

export function listEnquiries() {
  return getDb().prepare("SELECT * FROM enquiries ORDER BY id DESC").all() as Array<{
    id: number;
    company: string;
    name: string;
    email: string;
    phone: string;
    message: string;
    qty_hint: string;
    created_at: string;
  }>;
}
