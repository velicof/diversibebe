import { NextResponse } from "next/server";

/** Account verification belongs to the Supabase Auth flow. */
export async function POST() {
  return NextResponse.json(
    { error: "Acest flux a fost retras. Folosește înregistrarea în aplicație." },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  );
}
