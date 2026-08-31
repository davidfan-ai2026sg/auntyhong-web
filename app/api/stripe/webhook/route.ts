import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ received: true, note: "Stripe webhook stub for the design demo." });
}
