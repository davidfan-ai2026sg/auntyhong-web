import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import {
  deleteVoucher,
  listVouchers,
  setVoucherActive,
  upsertVoucher,
} from "@/lib/vouchers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, vouchers: await listVouchers() });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action || "");
  try {
    if (action === "create" || action === "upsert") {
      const voucher = await upsertVoucher({
        code: String(body.code || ""),
        type: String(body.type || "percent"),
        value: Number(body.value),
        active: body.active != null ? Boolean(body.active) : true,
        note: body.note != null ? String(body.note) : undefined,
        expiresAt: body.expiresAt != null ? String(body.expiresAt) : undefined,
      });
      return NextResponse.json({ ok: true, voucher, vouchers: await listVouchers() });
    }
    if (action === "deactivate" || action === "activate") {
      const code = String(body.code || "");
      const updated = await setVoucherActive(code, action === "activate");
      if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ ok: true, voucher: updated, vouchers: await listVouchers() });
    }
    if (action === "delete") {
      const code = String(body.code || "");
      const ok = await deleteVoucher(code);
      if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ ok: true, vouchers: await listVouchers() });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 }
    );
  }
}
