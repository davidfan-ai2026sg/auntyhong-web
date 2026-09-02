import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OneMapResult = {
  SEARCHVAL?: string;
  BLK_NO?: string;
  ROAD_NAME?: string;
  BUILDING?: string;
  ADDRESS?: string;
  POSTAL?: string;
};

/** Proxy OneMap search so the browser avoids CORS; Singapore addresses only. */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }
  if (q.length > 80) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  const url = new URL("https://www.onemap.gov.sg/api/common/elastic/search");
  url.searchParams.set("searchVal", q);
  url.searchParams.set("returnGeom", "N");
  url.searchParams.set("getAddrDetails", "Y");
  url.searchParams.set("pageNum", "1");

  try {
    const headers: HeadersInit = { Accept: "application/json" };
    const token = process.env.ONEMAP_TOKEN?.trim();
    if (token) headers.Authorization = token.startsWith("Bearer ") ? token : token;

    const res = await fetch(url.toString(), {
      headers,
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Address lookup unavailable", results: [] },
        { status: 502 }
      );
    }
    const data = (await res.json()) as {
      results?: OneMapResult[];
      found?: number;
      error?: string;
    };
    const results = (data.results || [])
      .filter((r) => r.ADDRESS || r.SEARCHVAL)
      .slice(0, 8)
      .map((r) => ({
        label: String(r.ADDRESS || r.SEARCHVAL || "").trim(),
        postal: String(r.POSTAL || "").replace(/\D/g, "").slice(0, 6),
        blk: String(r.BLK_NO || "").trim(),
        road: String(r.ROAD_NAME || "").trim(),
        building: String(r.BUILDING || "").trim().replace(/^NIL$/i, ""),
      }));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Address lookup failed", results: [] },
      { status: 502 }
    );
  }
}
