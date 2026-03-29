import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ChatMessage = { role: "user" | "assistant"; content: string };

function extractAssistantText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const content = (data as { content?: unknown }).content;
  if (!Array.isArray(content)) return "";
  for (const block of content) {
    if (
      block &&
      typeof block === "object" &&
      (block as { type?: string }).type === "text" &&
      typeof (block as { text?: string }).text === "string"
    ) {
      return (block as { text: string }).text;
    }
  }
  return "";
}

async function loadBebeAsistContext(userId: string | undefined): Promise<{
  ageMonthsLabel: string;
  triedCount: number;
  lastFoodsLine: string;
  allergiesLine: string;
}> {
  if (!userId) {
    return {
      ageMonthsLabel: "necunoscută",
      triedCount: 0,
      lastFoodsLine: "—",
      allergiesLine: "nicio alergie înregistrată",
    };
  }

  const supabase = await createClient();

  const [{ data: baby }, triedCountRes, { data: lastTried }, { data: allergyRows }] =
    await Promise.all([
      supabase
        .from("babies")
        .select("birthdate")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("tried_foods")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("tried_foods")
        .select("food_name")
        .eq("user_id", userId)
        .order("first_tried_at", { ascending: false })
        .limit(3),
      supabase
        .from("allergy_records")
        .select("food_name")
        .eq("user_id", userId),
    ]);

  let ageMonthsLabel = "necunoscută";
  if (baby?.birthdate) {
    const b = new Date(baby.birthdate);
    if (!Number.isNaN(b.getTime())) {
      const months = Math.floor(
        (Date.now() - b.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
      );
      ageMonthsLabel = String(Math.max(0, months));
    }
  }

  const triedCount = triedCountRes.count ?? 0;

  const names = (lastTried ?? [])
    .map((r: { food_name?: string }) => r.food_name?.trim())
    .filter((n): n is string => typeof n === "string" && n.length > 0);
  const lastFoodsLine =
    names.length > 0 ? names.join(", ") : "încă niciunul";

  const allergySet = new Set<string>();
  for (const row of allergyRows ?? []) {
    const n = (row as { food_name?: string }).food_name?.trim();
    if (n) allergySet.add(n);
  }
  const allergiesLine =
    allergySet.size > 0
      ? [...allergySet].join(", ")
      : "nicio alergie înregistrată";

  return {
    ageMonthsLabel,
    triedCount,
    lastFoodsLine,
    allergiesLine,
  };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey?.trim()) {
    return NextResponse.json(
      { error: "Missing ANTHROPIC_API_KEY" },
      { status: 500 }
    );
  }

  let body: { messages?: ChatMessage[]; babyContext?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ctx = await loadBebeAsistContext(user?.id);

  const ageDisplay =
    ctx.ageMonthsLabel === "necunoscută"
      ? "necunoscută"
      : `${ctx.ageMonthsLabel} luni`;

  const systemPrompt = `Ești BebeAsist, asistentul personal pentru diversificarea bebelușului.
Date despre bebeluș:
- Vârstă: ${ageDisplay}
- Alimente încercate: ${ctx.triedCount} alimente
- Ultimele alimente introduse: ${ctx.lastFoodsLine}
- Alergii cunoscute: ${ctx.allergiesLine}
Oferă sfaturi specifice bazate pe aceste date. Răspunde în română.

Răspunzi DOAR în limba română.
Ești prietenos, empatic și profesionist.
Oferi sfaturi bazate pe ghidurile OMS și Societatea Română de Pediatrie.
Ești concis - răspunsuri de maxim 3-4 paragrafe.
Folosești emoji-uri moderate: 👶 🥕 🍎 ✅ ⚠️

IMPORTANT: Pentru probleme medicale serioase (alergii severe, reacții grave) îndreaptă părinții către medicul pediatru.

Poți ajuta cu:
- Recomandări personalizate bazate pe ce a mâncat deja bebelușul
- Ce alimente urmează să introducă
- Rețete potrivite vârstei și preferințelor
- Gestionarea refuzului alimentar
- Alergii și intoleranțe
- Constipație și probleme digestive ușoare
- Cantități și frecvența meselor
- Texturi potrivite vârstei`;

  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const messages: ChatMessage[] = rawMessages
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .map((m) => ({ role: m.role, content: m.content }));

  while (messages.length > 0 && messages[0].role === "assistant") {
    messages.shift();
  }

  if (messages.length === 0) {
    return NextResponse.json({ error: "No user messages" }, { status: 400 });
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });

  const data: unknown = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Anthropic API error:", data);
    return NextResponse.json({ error: "API error" }, { status: 500 });
  }

  const text = extractAssistantText(data);
  if (!text) {
    console.error("Anthropic empty content:", data);
    return NextResponse.json({ error: "Empty response" }, { status: 500 });
  }

  return NextResponse.json({ content: text });
}
