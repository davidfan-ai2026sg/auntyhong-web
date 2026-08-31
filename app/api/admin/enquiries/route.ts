import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { deleteEnquiry, listEnquiries } from "@/lib/db";
import { deskStorage } from "@/lib/desk-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({
      ok: true,
      enquiries: await listEnquiries(),
      storage: deskStorage(),
    });
  } catch {
    return NextResponse.json(
      { error: "Kitchen desk storage is unavailable", storage: deskStorage() },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { action?: string; id?: unknown };
  if (body.action !== "delete") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  const id = Number(body.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  try {
    const ok = await deleteEnquiry(id);
    if (!ok) return NextResponse.json({ error: "Not found", storage: deskStorage() }, { status: 404 });
    return NextResponse.json({ ok: true, enquiries: await listEnquiries(), storage: deskStorage() });
  } catch {
    return NextResponse.json(
      { error: "Kitchen desk storage is unavailable", storage: deskStorage() },
      { status: 500 }
    );
  }
}
