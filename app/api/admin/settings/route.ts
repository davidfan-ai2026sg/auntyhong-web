import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { updateSettings } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const s = await updateSettings({
    min_order: Number(body.min_order),
    delivery_fee: Number(body.delivery_fee),
    free_delivery_at: Number(body.free_delivery_at),
    express_fee: Number(body.express_fee),
    paynow_copy: String(body.paynow_copy || ""),
    uen: String(body.uen || ""),
    gst_reg: String(body.gst_reg || ""),
  });
  return NextResponse.json(s);
}
