import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminPassword, sessionToken } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json();
  if (String(body.password || "") !== adminPassword()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.VERCEL === "1",
  });
  return res;
}
