import { NextResponse } from "next/server";
import { createEnquiry } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  const company = String(body.company || "").trim();
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const message = String(body.message || "").trim();
  if (!company || !name || !email || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  try {
    const id = await createEnquiry({
      company,
      name,
      email,
      phone: String(body.phone || "").trim(),
      message,
      qty_hint: String(body.qty_hint || "").trim(),
    });
    return NextResponse.json({ id });
  } catch {
    return NextResponse.json({ error: "Could not save enquiry" }, { status: 500 });
  }
}
