import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { ORDER_COOKIE, ORDER_COOKIE_OPTS, persistOrder, setOrderStatus } from "@/lib/db";
import { ALLOWED_STATUSES, type OrderStatus } from "@/lib/pricing";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const status = String(body.status || "") as OrderStatus;
  if (!ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Bad status" }, { status: 400 });
  }
  const order = await setOrderStatus(Number(body.id), status);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const stored = await persistOrder(order);
  const res = NextResponse.json({ ok: true, status: order.status });
  res.cookies.set(ORDER_COOKIE, JSON.stringify(stored), ORDER_COOKIE_OPTS);
  return res;
}
