import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { setOrderStatus } from "@/lib/db";
import { ALLOWED_STATUSES, type OrderStatus } from "@/lib/pricing";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const status = String(body.status || "") as OrderStatus;
  if (!ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Bad status" }, { status: 400 });
  }
  const order = setOrderStatus(Number(body.id), status);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, status: order.status });
}
