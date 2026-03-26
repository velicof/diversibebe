"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  getCurrentBaby,
  getCurrentUserId,
  listAllergyRecords,
  listFoodJournal,
  listTriedFoods,
} from "../lib/supabaseData";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type PersistedUser = {
  baby?: {
    name?: string;
  };
};

function toApiMessages(msgs: Message[]): { role: "user" | "assistant"; content: string }[] {
  const copy = [...msgs];
  while (copy.length > 0 && copy[0].role === "assistant") {
    copy.shift();
  }
  return copy.map((m) => ({ role: m.role, content: m.content }));
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Renderare markdown minimală pentru BebeAsist:
 * - bold: **text** -> <strong>text</strong>
 * - headers: liniile care încep cu "##" sunt ignorate (## eliminat)
 * - newline: \n -> <br />
 */
function renderAssistantMarkdownLite(text: string): string {
  const escaped = escapeHtml(text)
    // Remove headers markers (optional)
    .replace(/^##\s+/gm, "");

  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return withBold.replace(/\n/g, "<br />");
}

function pillLabelForPath(pathname: string): string {
  const p = pathname || "";
  if (p === "/" || p === "/dashboard") {
    return "🍼 Diversificare";
  }
  if (p.startsWith("/foods") || p.startsWith("/alimente")) {
    return "🥕 Alimente";
  }
  if (p.startsWith("/recipes") || p.startsWith("/retete")) {
    return "🍳 Rețete";
  }
  if (p.startsWith("/plan")) {
    return "📅 Plan";
  }
  if (p.startsWith("/alergii")) {
    return "🚨 Alergii";
  }
  if (p.startsWith("/ghid")) {
    return "📖 Ghid";
  }
  return "💬 BebeAsist";
}

export default function AIChat() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [babyContext, setBabyContext] = useState("");
  const [babyName, setBabyName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    void (async () => {
      const uid = await getCurrentUserId();
      if (!active) return;
      if (!uid) {
        setBabyName("");
        setBabyContext("Nu există profil de bebeluș creat încă.");
        setMessages([
          {
            role: "assistant",
            content:
              "Bună! 🍼 Sunt BebeAsist, asistentul tău pentru diversificarea bebelușului. Cu ce te pot ajuta azi?",
          },
        ]);
        return;
      }

      const baby = await getCurrentBaby();
      const name = baby?.name?.trim() || "";
      setBabyName(name);

      const ageMonths =
        baby?.birthdate && !Number.isNaN(new Date(baby.birthdate).getTime())
          ? Math.floor(
              (Date.now() - new Date(baby.birthdate).getTime()) /
                (1000 * 60 * 60 * 24 * 30.44)
            )
          : 0;

      const tried = await listTriedFoods();
      const allergies = await listAllergyRecords();
      const journal = await listFoodJournal(20);

      const last = journal[0];
      const triedNames = tried.map((t) => t.food_name).filter(Boolean);

      const context = `
Nume bebeluș: ${name || "Necunoscut"}
Vârstă: ${ageMonths} luni
Gen: ${baby?.gender === "boy" ? "Băiat" : baby?.gender === "girl" ? "Fată" : "Necunoscut"}
Alimente deja încercate (${triedNames.length}): ${triedNames.length > 0 ? triedNames.slice(0, 20).join(", ") : "Niciun aliment încă"}
Alergii detectate: ${
        allergies.length > 0
          ? allergies
              .map((a) => `${a.food_name} (${a.notes ?? ""})`.trim())
              .join(", ")
          : "Nicio alergie detectată"
      }
Ultima masă jurnalizată: ${
        last?.food_name ? `${last.food_name} - ${last.reaction ?? "—"}` : "Niciuna"
      }
      `.trim();

      setBabyContext(context);
      setMessages([
        {
          role: "assistant",
          content: `Bună! 🍼 Sunt BebeAsist, asistentul tău personal pentru diversificarea lui ${name || "bebelușului tău"}. Știu că ${name || "bebelușul"} are ${ageMonths} luni și am acces la istoricul său alimentar. Cu ce te pot ajuta azi?`,
        },
      ]);
    })();

    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function sendMessage() {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user" as const, content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: toApiMessages(newMessages),
          babyContext,
        }),
      });

      const data = (await response.json()) as { content?: string };

      if (data.content) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.content as string },
        ]);
      } else {
        throw new Error("No content");
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Îmi pare rău, a apărut o eroare. Te rog încearcă din nou! 🙏",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  const quickQuestions = [
    `Ce îi recomand lui ${babyName} mâine?`,
    "Cum gestionez refuzul alimentar?",
    "Rețete pentru constipație",
    "Ce alimente urmează să introduc?",
  ];

  const subtitleBaby = babyName.trim().length
    ? `bebelușul ${babyName.trim()}`
    : "bebelușul tău";

  /** Deasupra barei de jos (nav ~72px + safe area); mai sus unde e FAB extra. */
  const pillBottomPx =
    pathname === "/dashboard"
      ? 168
      : pathname === "/jurnal" || pathname.startsWith("/jurnal/")
        ? 124
        : 100;

  return (
    <>
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            bottom: `calc(${pillBottomPx}px + env(safe-area-inset-bottom, 0px))`,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 30,
            width: "fit-content",
            maxWidth: "min(260px, calc(100vw - 32px))",
            background: "linear-gradient(135deg, #D4849A, #C4B5E0)",
            borderRadius: 999,
            padding: "6px 10px",
            color: "white",
            fontSize: 11,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
            boxShadow: "0 3px 14px rgba(212,132,154,0.35)",
            fontFamily: "Nunito, sans-serif",
            whiteSpace: "nowrap",
            lineHeight: 1.25,
          }}
          aria-label="Deschide BebeAsist"
        >
          {pillLabelForPath(pathname)}
        </button>
      ) : null}

      {isOpen ? (
        <>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.3)",
              zIndex: 1000,
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
            aria-label="Închide chat"
          />

          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "100%",
              maxWidth: 393,
              height: "85vh",
              background: "white",
              borderRadius: "24px 24px 0 0",
              boxShadow: "0 -4px 32px rgba(0,0,0,0.15)",
              zIndex: 1001,
              display: "flex",
              flexDirection: "column",
              fontFamily: "Nunito, sans-serif",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #D4849A, #C4B5E0)",
                borderRadius: "24px 24px 0 0",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                  }}
                >
                  🍼
                </div>
                <div>
                  <div
                    style={{ color: "white", fontWeight: 800, fontSize: 15 }}
                  >
                    BebeAsist 🍼
                  </div>
                  <div
                    style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}
                  >
                    Asistent personal pentru {subtitleBaby}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  color: "white",
                  fontSize: 16,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label="Închide"
              >
                ✕
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {messages.map((msg, index) => (
                <div
                  key={`${msg.role}-${index}-${msg.content.slice(0, 24)}`}
                  style={{
                    display: "flex",
                    justifyContent:
                      msg.role === "user" ? "flex-end" : "flex-start",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  {msg.role === "assistant" ? (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #D4849A, #C4B5E0)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      🍼
                    </div>
                  ) : null}
                  <div
                    style={{
                      maxWidth: "75%",
                      padding: "10px 14px",
                      borderRadius:
                        msg.role === "user"
                          ? "18px 18px 4px 18px"
                          : "4px 18px 18px 18px",
                      background:
                        msg.role === "user"
                          ? "linear-gradient(135deg, #D4849A, #C4B5E0)"
                          : "#F5F0F8",
                      color: msg.role === "user" ? "white" : "#3D2C3E",
                      fontSize: 13,
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.role === "assistant" ? (
                      <span
                        dangerouslySetInnerHTML={{
                          __html: renderAssistantMarkdownLite(msg.content),
                        }}
                      />
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}

              {isLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #D4849A, #C4B5E0)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                    }}
                  >
                    🍼
                  </div>
                  <div
                    style={{
                      background: "#F5F0F8",
                      padding: "12px 16px",
                      borderRadius: "4px 18px 18px 18px",
                      display: "flex",
                      gap: 4,
                      alignItems: "center",
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#D4849A",
                          animation: `bebeasist-bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            {messages.length <= 1 ? (
              <div
                style={{
                  padding: "0 16px 8px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                {quickQuestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setInput(q)}
                    style={{
                      background: "#FFF0F5",
                      border: "1px solid #F4B4C4",
                      borderRadius: 20,
                      padding: "6px 12px",
                      fontSize: 11,
                      color: "#D4849A",
                      cursor: "pointer",
                      fontFamily: "Nunito, sans-serif",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            ) : null}

            <div
              style={{
                padding: "12px 16px 32px",
                borderTop: "1px solid #F5F0F8",
                display: "flex",
                gap: 8,
                flexShrink: 0,
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Întreabă despre ${babyName}...`}
                style={{
                  flex: 1,
                  background: "#F5F0F8",
                  border: "none",
                  borderRadius: 24,
                  padding: "10px 16px",
                  fontSize: 13,
                  fontFamily: "Nunito, sans-serif",
                  color: "#3D2C3E",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={!input.trim() || isLoading}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  background:
                    input.trim() && !isLoading
                      ? "linear-gradient(135deg, #D4849A, #C4B5E0)"
                      : "#EDE7F6",
                  border: "none",
                  cursor:
                    input.trim() && !isLoading ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  flexShrink: 0,
                  transition: "background 0.2s",
                }}
                aria-label="Trimite mesaj"
              >
                {isLoading ? "⏳" : "➤"}
              </button>
            </div>
          </div>
        </>
      ) : null}

      <style>{`
        @keyframes bebeasist-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
}
