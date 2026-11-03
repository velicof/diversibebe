import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Unapproved photo candidates live outside public/ and are served only here, behind the review gate
// (src/proxy.ts: /v2/revizie/* needs the review code, fail-closed in production). No file extension in the
// URL on purpose: the proxy matcher skips *.webp, so an extension would bypass the gate.
const WIDTHS = new Set(["480", "800", "1200"]);
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; width: string }> }) {
  const { id, width } = await params;
  if (!/^[a-z0-9-]{1,100}$/.test(id) || !WIDTHS.has(width)) return new NextResponse(null, { status: 404 });
  try {
    const file = await readFile(path.join(process.cwd(), "content/photo-candidates", `${id}-${width}.webp`));
    return new NextResponse(new Uint8Array(file), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
