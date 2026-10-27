import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Fail closed until quotas, child scoping and clinical/privacy review exist. */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Autentificarea este necesară." }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Autentificarea nu poate fi verificată." }, { status: 503 });
  }
  return NextResponse.json(
    { error: "BebeAsist este temporar indisponibil. Poți folosi rețetele și planificatorul." },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}
