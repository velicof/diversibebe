"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { useUser } from "@/lib/useUser";
import { createClient } from "@/lib/supabase/client";
import { FOODS_DATABASE, type AgeGroup } from "../lib/foodsDatabase";
import { calendarMonthsFromBirthdateString } from "../lib/recipePortions";

type Filter = "all" | "unread";
type AppNotification = {
  id: string;
  title: string;
  body: string;
  icon: string;
  iconBg: string;
  href: string;
  createdAt: Date;
};

const backBtnStyle = {
  color: "#D4849A",
  fontSize: 20,
  padding: 8,
  background: "none" as const,
  border: "none" as const,
};

export default function NotificariPage() {
  const router = useRouter();
  const { userId } = useUser();
  const [filter, setFilter] = useState<Filter>("all");
  const [cards, setCards] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved = sessionStorage.getItem("read_notifications");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const markAsRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        sessionStorage.setItem("read_notifications", JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  const isSameDay = (a: Date, b: Date): boolean =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const startOfDay = (d: Date): Date => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const endOfDay = (d: Date): Date => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };

  const foodMinAge = (group: AgeGroup): number => {
    if (group === "7-8") return 7;
    if (group === "8-10") return 8;
    if (group === "10-12") return 10;
    return 6;
  };

  const daysUntilNextMonthBirthday = (birthdate: string, ageMonths: number): number => {
    const birth = new Date(birthdate);
    if (Number.isNaN(birth.getTime())) return 999;
    const next = new Date(birth);
    next.setMonth(next.getMonth() + ageMonths + 1);
    const now = new Date();
    const diffMs = startOfDay(next).getTime() - startOfDay(now).getTime();
    return Math.max(0, Math.ceil(diffMs / 86_400_000));
  };

  useEffect(() => {
    let cancelled = false;

    const loadNotifications = async () => {
      if (!userId) {
        if (!cancelled) {
          setCards([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      const supabase = createClient();
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const sevenDaysAgo = new Date(todayStart);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      try {
        const [{ data: babyData }, { count: journalCount }, { data: triedFoods }] =
          await Promise.all([
            supabase
              .from("babies")
              .select("name,birthdate")
              .eq("user_id", userId)
              .maybeSingle(),
            supabase
              .from("food_journal")
              .select("id", { count: "exact", head: true })
              .eq("user_id", userId),
            supabase
              .from("tried_foods")
              .select("food_id")
              .eq("user_id", userId),
          ]);

        const babyName = babyData?.name?.trim() || "bebelușul tău";
        const birthdate = babyData?.birthdate || "";
        const ageMonths = birthdate ? calendarMonthsFromBirthdateString(birthdate) : 0;

        const [{ count: todayCount }, { count: recentReactionCount }] = await Promise.all([
          supabase
            .from("food_journal")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("logged_at", todayStart.toISOString())
            .lte("logged_at", todayEnd.toISOString()),
          supabase
            .from("food_journal")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .in("reaction", ["negativ", "alergie"])
            .gte("logged_at", sevenDaysAgo.toISOString()),
        ]);

        const triedSet = new Set((triedFoods ?? []).map((x) => x.food_id));
        const availableFoods = FOODS_DATABASE.filter(
          (f) => foodMinAge(f.ageGroup) <= Math.max(6, ageMonths)
        );
        const untriedCount = availableFoods.filter((f) => !triedSet.has(f.id)).length;

        const nextAge = ageMonths + 1;
        const daysToNext = birthdate ? daysUntilNextMonthBirthday(birthdate, ageMonths) : 999;

        const nextCards: AppNotification[] = [];

        if ((todayCount ?? 0) === 0) {
          nextCards.push({
            id: "journal-today",
            title: "Jurnalizează masa de azi 📓",
            body: `Nu ai înregistrat nicio masă azi. Adaugă ce a mâncat ${babyName}!`,
            icon: "📓",
            iconBg: "#FDE8EE",
            href: "/jurnal",
            createdAt: now,
          });
        }

        if (daysToNext <= 7) {
          nextCards.push({
            id: "age-soon",
            title: `Pregătește-te pentru ${nextAge} luni! 🎉`,
            body: `Peste ${daysToNext} zile ${babyName} împlinește ${nextAge} luni. Apar mese și alimente noi!`,
            icon: "🎉",
            iconBg: "#FFF3CD",
            href: "/ghid",
            createdAt: now,
          });
        }

        if (untriedCount > 0) {
          nextCards.push({
            id: "new-foods",
            title: "Alimente noi de încercat 🥦",
            body: `Ai ${untriedCount} alimente potrivite pentru ${Math.max(6, ageMonths)} luni pe care nu le-ai încercat încă.`,
            icon: "🥦",
            iconBg: "#E8F8F5",
            href: "/alimente",
            createdAt: now,
          });
        }

        if ((recentReactionCount ?? 0) > 0) {
          nextCards.push({
            id: "recent-reaction",
            title: "Reacție detectată ⚠️",
            body: "Ai înregistrat o reacție negativă recent. Verifică jurnalul.",
            icon: "⚠️",
            iconBg: "#FFF3CD",
            href: "/alergii",
            createdAt: now,
          });
        }

        if ((journalCount ?? 0) === 0) {
          nextCards.push({
            id: "welcome",
            title: "Bine ai venit! 🎉",
            body: "Contul tău DiversiBebe a fost creat. Hai să începem diversificarea!",
            icon: "🎉",
            iconBg: "#FDE8EE",
            href: "/ghid",
            createdAt: now,
          });
        }

        if (!cancelled) {
          setCards(nextCards);
        }
      } catch {
        if (!cancelled) {
          setCards([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadNotifications();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const visibleCards = useMemo(() => {
    if (filter === "all") return cards;
    return cards.filter((c) => !readIds.has(c.id));
  }, [cards, filter, readIds]);

  return (
    <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center transition-colors">
      <main className="w-full max-w-[393px] px-6 pb-[128px]">
        <header className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="cursor-pointer leading-none"
              style={backBtnStyle}
              aria-label="Înapoi"
            >
              ←
            </button>
            <h1 className="text-[22px] font-extrabold text-[#3D2C3E]">
              Notificări
            </h1>
            <div className="w-[36px] shrink-0" />
          </div>

          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`cursor-pointer text-[14px] font-semibold px-[16px] py-[6px] rounded-full transition-colors ${
                filter === "all"
                  ? "bg-[#D4849A] text-white"
                  : "bg-white border border-[#EDE7F6] text-[#8B7A8E]"
              }`}
            >
              Toate
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`cursor-pointer text-[14px] font-semibold px-[16px] py-[6px] rounded-full transition-colors ${
                filter === "unread"
                  ? "bg-[#D4849A] text-white"
                  : "bg-white border border-[#EDE7F6] text-[#8B7A8E]"
              }`}
            >
              Necitite
            </button>
          </div>
        </header>

        <section className="mt-5 space-y-3">
          {loading ? (
            <>
              {[0, 1, 2].map((idx) => (
                <div
                  key={`skeleton-${idx}`}
                  className="rounded-[16px] p-[14px] bg-white border border-[#FDE8EE] animate-pulse"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-[40px] h-[40px] rounded-full bg-[#F5F0F8]" />
                    <div className="min-w-0 flex-1">
                      <div className="h-3.5 w-40 rounded bg-[#F5F0F8]" />
                      <div className="mt-2 h-3 w-full rounded bg-[#F5F0F8]" />
                      <div className="mt-2 h-2.5 w-20 rounded bg-[#F5F0F8]" />
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : visibleCards.length === 0 ? (
            <div className="text-center text-[14px] text-[#8B7A8E] py-10">
              Totul e în regulă! 🌟 Nicio notificare nouă.
            </div>
          ) : (
            visibleCards.map((c) => (
            <div
              key={c.id}
              className="relative rounded-[16px] p-[14px] flex items-start gap-3 cursor-pointer bg-white border"
              style={{ borderColor: readIds.has(c.id) ? "#EDE7F6" : "#FDE8EE" }}
              onClick={() => {
                markAsRead(c.id);
                router.push(c.href);
              }}
            >
              {!readIds.has(c.id) && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#D4849A]" />
              )}
              <div
                className="w-[40px] h-[40px] rounded-full flex items-center justify-center"
                style={{ backgroundColor: c.iconBg }}
              >
                <span className="text-[20px] leading-none">{c.icon}</span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-[#3D2C3E]">
                  {c.title}
                </p>
                <p className="mt-1 text-[12px] font-normal text-[#8B7A8E]">
                  {c.body}
                </p>
                <p className="mt-2 text-[11px] font-normal text-[#B8A9BB]">
                  {c.createdAt.toLocaleDateString("ro-RO")}
                </p>
              </div>
            </div>
            ))
          )}
        </section>
      </main>

      <Navbar activeTab="acasa" />
    </div>
  );
}

