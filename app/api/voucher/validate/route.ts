import { NextResponse } from "next/server";
import { applyVoucherCode } from "@/lib/vouchers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = ((await req.json().catch(() => ({}))) || {}) as Record<string, unknown>;
    const code = String(body.code || "");
    const subtotal = Number(body.subtotal);
    if (!Number.isFinite(subtotal) || subtotal < 0) {
      return NextResponse.json({ error: "Subtotal is required" }, { status: 400 });
    }
    const applied = await applyVoucherCode(code, subtotal);
    if (!applied) {
      return NextResponse.json({ error: "Enter a voucher code" }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      code: applied.code,
      discount: applied.discount,
      type: applied.voucher.type,
      value: applied.voucher.value,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid voucher" },
      { status: 400 }
    );
  }
}
