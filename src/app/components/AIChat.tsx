"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { getUserKey } from "../lib/store";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type PersistedUser = {
  email?: string;
  parentName?: string;
  baby?: {
    name?: string;
    birthDate?: string;
    gender?: "boy" | "girl" | null;
  };
};

type FoodEntryRaw = {
  foodName?: string;
  date?: string;
  time?: string;
  reaction?: string | null;
};

type AllergyRaw = {
  foodName?: string;
  symptoms?: string[];
};

function readCurrentUserFromStorage(): PersistedUser | null {
  try {
    const data = JSON.parse(
      localStorage.getItem("diversibebe_data") || "{}"
    ) as {
      appState?: { currentUser?: PersistedUser | null };
      currentUser?: PersistedUser | null;
    };
    return data.appState?.currentUser ?? data.currentUser ?? null;
  } catch {
    return null;
  }
}

function sortEntriesByRecent(entries: FoodEntryRaw[]): FoodEntryRaw[] {
  return [...entries].sort((a, b) => {
    const da = (a.date || "").localeCompare(b.date || "");
    if (da !== 0) return -da;
    return (b.time || "").localeCompare(a.time || "");
  });
}

function toApiMessages(msgs: Message[]): { role: "user" | "assistant"; content: string }[] {
  const copy = [...msgs];
  while (copy.length > 0 && copy[0].role === "assistant") {
    copy.shift();
  }
  return copy.map((m) => ({ role: m.role, content: m.content }));
}

function pillLabelForPath(pathname: string): string {
  const p = pathname || "";
  if (p === "/" || p === "/dashboard") {
    return "🍼 Întreabă despre diversificare";
  }
  if (p.startsWith("/foods") || p.startsWith("/alimente")) {
    return "🥕 Întreabă despre alimente";
  }
  if (p.startsWith("/recipes") || p.startsWith("/retete")) {
    return "🍳 Întreabă despre rețete";
  }
  if (p.startsWith("/plan")) {
    return "📅 Întreabă despre planul alimentar";
  }
  if (p.startsWith("/alergii")) {
    return "🚨 Întreabă despre alergii";
  }
  if (p.startsWith("/ghid")) {
    return "📖 Întreabă despre ghidul de diversificare";
  }
  return "💬 BebeAsist - Întreabă orice";
}

export default function AIChat() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [babyContext, setBabyContext] = useState("");
  const [babyName, setBabyName] = useState("bebelușul");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    try {
      const user = readCurrentUserFromStorage();
      if (user?.baby) {
        const baby = user.baby;
        const birthDate = baby.birthDate ? new Date(baby.birthDate) : null;
        const ageMonths =
          birthDate && !Number.isNaN(birthDate.getTime())
            ? Math.floor(
                (Date.now() - birthDate.getTime()) /
                  (1000 * 60 * 60 * 24 * 30.44)
              )
            : 0;

        const displayName = baby.name?.trim() || "bebelușul";
        setBabyName(displayName);

        const email = user.email?.trim();
        let triedFoods: string[] = [];
        let allergies: AllergyRaw[] = [];
        let entries: FoodEntryRaw[] = [];

        if (email) {
          const userKey = getUserKey(email);
          const userData = JSON.parse(
            localStorage.getItem(userKey) || "{}"
          ) as {
            foodEntries?: FoodEntryRaw[];
            allergies?: AllergyRaw[];
          };
          entries = Array.isArray(userData.foodEntries)
            ? userData.foodEntries
            : [];
          allergies = Array.isArray(userData.allergies)
            ? userData.allergies
            : [];
          triedFoods = [
            ...new Set(
              entries
                .map((e) => e.foodName)
                .filter((n): n is string => typeof n === "string" && !!n)
            ),
          ];
        }

        const sorted = sortEntriesByRecent(entries);
        const last = sorted[0];

        const context = `
Nume bebeluș: ${baby.name || "Necunoscut"}
Vârstă: ${ageMonths} luni
Gen: ${baby.gender === "boy" ? "Băiat" : baby.gender === "girl" ? "Fată" : "Necunoscut"}
Alimente deja încercate (${triedFoods.length}): ${triedFoods.length > 0 ? triedFoods.slice(0, 20).join(", ") : "Niciun aliment încă"}
Alergii detectate: ${
          allergies.length > 0
            ? allergies
                .map((a) => {
                  const name = a.foodName || "?";
                  const sym = Array.isArray(a.symptoms)
                    ? a.symptoms.join(", ")
                    : "";
                  return `${name} (${sym})`;
                })
                .join(", ")
            : "Nicio alergie detectată"
        }
Ultima masă jurnalizată: ${
          last?.foodName
            ? `${last.foodName} - ${last.reaction ?? "—"}`
            : "Niciuna"
        }
Numele părintelui: ${user.parentName || "Părintele"}
        `.trim();

        setBabyContext(context);

        const nm = baby.name?.trim();
        setMessages([
          {
            role: "assistant",
            content: `Bună! 🍼 Sunt BebeAsist, asistentul tău personal pentru diversificarea lui ${nm || "bebelușului tău"}. Știu că ${nm || "bebelușul"} are ${ageMonths} luni și am acces la istoricul său alimentar. Cu ce te pot ajuta azi?`,
          },
        ]);
      } else {
        setBabyName("bebelușul");
        setBabyContext("Nu există profil de bebeluș creat încă.");
        setMessages([
          {
            role: "assistant",
            content:
              "Bună! 🍼 Sunt BebeAsist, asistentul tău pentru diversificarea bebelușului. Cu ce te pot ajuta azi?",
          },
        ]);
      }
    } catch {
      setBabyName("bebelușul");
      setBabyContext("Nu există profil de bebeluș creat încă.");
      setMessages([
        {
          role: "assistant",
          content:
            "Bună! 🍼 Sunt BebeAsist. Cu ce te pot ajuta cu diversificarea bebelușului?",
        },
      ]);
    }
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

  return (
    <>
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            width: "fit-content",
            maxWidth: 353,
            background: "linear-gradient(135deg, #D4849A, #C4B5E0)",
            borderRadius: 30,
            padding: "10px 20px",
            color: "white",
            fontSize: 13,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 16px rgba(212,132,154,0.4)",
            fontFamily: "Nunito, sans-serif",
            whiteSpace: "nowrap",
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
                    Asistent personal pentru {babyName}
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
                    {msg.content}
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
