import { NextRequest, NextResponse } from "next/server";

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

  const babyContext =
    typeof body.babyContext === "string" && body.babyContext.trim()
      ? body.babyContext.trim()
      : "Nu există profil de bebeluș creat încă.";

  const systemPrompt = `Ești NutriBot, asistentul AI personal al aplicației DiversiBebe.

CONTEXT BEBELUȘ:
${babyContext}

Răspunzi DOAR în limba română.
Ești prietenos, empatic și profesionist.
Folosești NUMELE bebelușului din context când răspunzi - face răspunsul personal și cald.
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
