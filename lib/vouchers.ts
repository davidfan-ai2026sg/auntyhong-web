import { roundMoney } from "./pricing";
import { mutateDeskStore, readDeskStore } from "./desk-store";

export type VoucherType = "percent" | "fixed";

export type Voucher = {
  code: string;
  type: VoucherType;
  value: number;
  active: boolean;
  note?: string;
  expiresAt?: string;
  created_at?: string;
};

export function normalizeVoucherCode(code: string) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function seedVouchers(): Voucher[] {
  return [
    {
      code: "WELCOME10",
      type: "percent",
      value: 10,
      active: true,
      note: "Demo 10% off — for QA",
      created_at: new Date().toISOString(),
    },
  ];
}

export function discountFromVoucher(voucher: Voucher, subtotal: number): number {
  const sub = roundMoney(Math.max(0, Number(subtotal) || 0));
  if (sub <= 0) return 0;
  if (voucher.type === "percent") {
    const pct = Math.min(100, Math.max(1, Number(voucher.value) || 0));
    return roundMoney(Math.min(sub, (sub * pct) / 100));
  }
  const fixed = Math.max(0, Number(voucher.value) || 0);
  return roundMoney(Math.min(sub, fixed));
}

function isExpired(voucher: Voucher, at = new Date()) {
  if (!voucher.expiresAt) return false;
  const exp = Date.parse(voucher.expiresAt);
  if (!Number.isFinite(exp)) return false;
  return at.getTime() > exp;
}

export async function listVouchers(): Promise<Voucher[]> {
  const store = await readDeskStore();
  return Array.isArray(store.vouchers) ? store.vouchers : [];
}

export async function findVoucher(code: string): Promise<Voucher | undefined> {
  const key = normalizeVoucherCode(code);
  if (!key) return undefined;
  const rows = await listVouchers();
  return rows.find((v) => normalizeVoucherCode(v.code) === key);
}

/** Validate and compute discount for checkout. Throws on invalid/inactive/expired. */
export async function applyVoucherCode(
  code: string | undefined | null,
  subtotal: number
): Promise<{ code: string; discount: number; voucher: Voucher } | null> {
  const key = normalizeVoucherCode(String(code || ""));
  if (!key) return null;
  const voucher = await findVoucher(key);
  if (!voucher) throw new Error("Invalid voucher code");
  if (!voucher.active) throw new Error("This voucher is inactive");
  if (isExpired(voucher)) throw new Error("This voucher has expired");
  if (voucher.type === "percent") {
    const pct = Number(voucher.value);
    if (!Number.isFinite(pct) || pct < 1 || pct > 100) {
      throw new Error("Invalid voucher percent");
    }
  } else if (voucher.type !== "fixed") {
    throw new Error("Invalid voucher type");
  }
  const discount = discountFromVoucher(voucher, subtotal);
  return { code: normalizeVoucherCode(voucher.code), discount, voucher };
}

function assertVoucherInput(input: {
  code: string;
  type: string;
  value: number;
}): { code: string; type: VoucherType; value: number } {
  const code = normalizeVoucherCode(input.code);
  if (!code) throw new Error("Code is required");
  if (code.length > 32) throw new Error("Code is too long");
  const type = input.type === "fixed" ? "fixed" : input.type === "percent" ? "percent" : "";
  if (!type) throw new Error("Type must be percent or fixed");
  const value = Number(input.value);
  if (!Number.isFinite(value) || value <= 0) throw new Error("Value must be positive");
  if (type === "percent" && (value < 1 || value > 100)) {
    throw new Error("Percent must be between 1 and 100");
  }
  return { code, type, value: roundMoney(value) };
}

export async function upsertVoucher(input: {
  code: string;
  type: string;
  value: number;
  active?: boolean;
  note?: string;
  expiresAt?: string;
}): Promise<Voucher> {
  const base = assertVoucherInput(input);
  const row: Voucher = {
    code: base.code,
    type: base.type,
    value: base.value,
    active: input.active !== false,
    note: String(input.note || "").trim() || undefined,
    expiresAt: String(input.expiresAt || "").trim() || undefined,
    created_at: new Date().toISOString(),
  };
  await mutateDeskStore((s) => {
    const vouchers = Array.isArray(s.vouchers) ? [...s.vouchers] : [];
    const idx = vouchers.findIndex((v) => normalizeVoucherCode(v.code) === row.code);
    if (idx >= 0) {
      row.created_at = vouchers[idx].created_at || row.created_at;
      vouchers[idx] = row;
    } else {
      vouchers.unshift(row);
    }
    s.vouchers = vouchers;
    return s;
  });
  return row;
}

export async function setVoucherActive(code: string, active: boolean): Promise<Voucher | undefined> {
  const key = normalizeVoucherCode(code);
  let updated: Voucher | undefined;
  await mutateDeskStore((s) => {
    const vouchers = Array.isArray(s.vouchers) ? [...s.vouchers] : [];
    const idx = vouchers.findIndex((v) => normalizeVoucherCode(v.code) === key);
    if (idx < 0) return s;
    vouchers[idx] = { ...vouchers[idx], active: Boolean(active) };
    updated = vouchers[idx];
    s.vouchers = vouchers;
    return s;
  });
  return updated;
}

export async function deleteVoucher(code: string): Promise<boolean> {
  const key = normalizeVoucherCode(code);
  let removed = false;
  await mutateDeskStore((s) => {
    const vouchers = Array.isArray(s.vouchers) ? s.vouchers : [];
    const next = vouchers.filter((v) => normalizeVoucherCode(v.code) !== key);
    removed = next.length !== vouchers.length;
    s.vouchers = next;
    return s;
  });
  return removed;
}
