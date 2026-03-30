"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import Navbar from "../components/Navbar";
import type { FoodCatalogItem, FoodEntry, UserAccount } from "../lib/store";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  calculateBabyAge,
  getCurrentAgeGroup,
  getCurrentUser,
  getDiversificationInfo,
  getFoodsByAgeGroup,
  getNextSuggestedFood,
  getUnreadNotificationsCount,
  isLoggedIn as storeIsLoggedIn,
  parseDate,
  setDiversificationStartDate,
  syncGoogleSessionToLocalUser,
} from "../lib/store";
import { useStoreRefresh } from "../lib/useStoreRefresh";

type PersistedSlice = {
  appState?: { currentUser?: UserAccount | null; isLoggedIn?: boolean };
  currentUser?: UserAccount | null;
};

function formatActivityRelative(entry: FoodEntry): string {
  const [y, m, d] = entry.date.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(y, m - 1, d);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startEntry = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const diff = Math.round(
    (startToday.getTime() - startEntry.getTime()) / 86400000
  );
  if (diff === 0) return "Azi";
  if (diff === 1) return "Ieri";
  if (diff >= 2 && diff <= 14) return `Acum ${diff} zile`;
  return dt.toLocaleDateString("ro-RO");
}

function formatJournalRelative(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startEntry = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const diff = Math.round(
    (startToday.getTime() - startEntry.getTime()) / 86400000
  );
  if (diff === 0) return "Azi";
  if (diff === 1) return "Ieri";
  if (diff >= 2 && diff <= 14) return `Acum ${diff} zile`;
  return dt.toLocaleDateString("ro-RO");
}

function activityEntryName(entry: FoodEntry) {
  return entry.type === "recipe" && entry.recipeName
    ? entry.recipeName
    : entry.foodName;
}

function activityEntryHref(entry: FoodEntry) {
  if (entry.type === "recipe" && entry.recipeId) {
    return `/retete/${entry.recipeId}`;
  }
  return `/alimente/${entry.foodId}`;
}

function hasNonTrivialSymptoms(entry: FoodEntry) {
  return (
    entry.symptoms.length > 0 && !entry.symptoms.includes("Nicio reacție")
  );
}

function reactionLineDashboard(r: FoodEntry["reaction"]): string {
  if (r === "loved") return "😍 Adorat";
  if (r === "ok") return "😊 Ok";
  if (r === "disliked") return "😕 Nu a plăcut";
  if (r === "refused") return "🙅 Refuzat";
  return "";
}

function reactionLabel(r: string | null) {
  if (r === "pozitiv" || r === "loved") return "😍 Adorat";
  if (r === "neutru" || r === "ok") return "😊 Ok";
  if (r === "negativ" || r === "disliked" || r === "refused")
    return "😕 Nu a plăcut";
  if (r === "alergie") return "⚠️ Alergie";
  return "";
}

function portionBulletDashboard(p: FoodEntry["portion"]): string {
  if (p === "putin") return "• Puțin";
  if (p === "jumatate") return "• Jumătate";
  if (p === "tot") return "• Tot";
  return "";
}

function activityMetaLine(entry: FoodEntry): string {
  const parts: string[] = [];
  const rx = reactionLineDashboard(entry.reaction);
  if (rx) parts.push(rx);
  const pb = portionBulletDashboard(entry.portion);
  if (pb) parts.push(pb);
  if (hasNonTrivialSymptoms(entry)) {
    parts.push(
      entry.symptoms.filter((s) => s !== "Nicio reacție").join(", ")
    );
  }
  return parts.join(" ");
}

/** Salut după ora locală (Romanian). */
function greetingForLocalHour(d = new Date()): string {
  const h = d.getHours();
  if (h >= 5 && h < 12) return "Bună dimineața";
  if (h >= 12 && h < 18) return "Bună ziua";
  return "Bună seara";
}

export default function DashboardPage() {
  const router = useRouter();
  const { user: authUser, userId, loading: authLoading } = useUser();
  const storeVersion = useStoreRefresh();
  const [visitorBannerVisible, setVisitorBannerVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<UserAccount | null>(null);
  const [targetFoods, setTargetFoods] = useState(40);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [triedCount, setTriedCount] = useState(0);
  const [recentJournal, setRecentJournal] = useState<any[]>([]);
  const [reactionsCount, setReactionsCount] = useState(0);
  const [triedFoodIds, setTriedFoodIds] = useState<string[]>([]);
  const [streakCount, setStreakCount] = useState(0);
  const [babyName, setBabyName] = useState("");
  const [babyBirthdate, setBabyBirthdate] = useState("");

  useEffect(() => {
    if (!userId) {
      setBabyName("");
      setBabyBirthdate("");
      return;
    }
    const supabase = createClient();
    supabase
      .from("babies")
      .select("name, birthdate, gender")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBabyName(data.name || "");
          setBabyBirthdate(data.birthdate || "");
        }
      });
  }, [userId]);

  useEffect(() => {
    try {
      const data = JSON.parse(
        localStorage.getItem("diversibebe_data") || "{}"
      ) as PersistedSlice;
      const u = data.appState?.currentUser ?? data.currentUser ?? null;
      setUser(u);
      setDayOfMonth(new Date().getDate());
      const birthDate = babyBirthdate.trim() || u?.baby?.birthDate || "";
      const parsed = birthDate ? parseDate(birthDate) : null;
      const ageMonths =
        parsed && !Number.isNaN(parsed.getTime())
          ? Math.floor(
              (Date.now() - parsed.getTime()) /
                (1000 * 60 * 60 * 24 * 30.44)
            )
          : 0;
      const target =
        ageMonths < 6
          ? 3
          : ageMonths < 8
            ? 8
            : ageMonths < 10
              ? 15
              : ageMonths < 12
                ? 25
                : 40;
      setTargetFoods(target);
    } catch {
      setUser(null);
      setTargetFoods(40);
    }
    setMounted(true);
  }, [storeVersion, babyBirthdate]);

  useEffect(() => {
    if (authLoading) return;
    const email = authUser?.email;
    if (!email) return;
    const nameMeta = authUser?.user_metadata?.full_name;
    syncGoogleSessionToLocalUser({
      email,
      name: typeof nameMeta === "string" ? nameMeta : null,
    });
    const u = getCurrentUser();
    if (u?.email?.toLowerCase() === email.toLowerCase() && !u.baby?.name?.trim()) {
      router.replace("/onboarding");
    }
  }, [router, storeVersion, authLoading, authUser?.email, authUser?.user_metadata]);

  useEffect(() => {
    console.log("[dashboard] userId:", userId);
    if (!userId) return;

    supabaseClient
      .from("food_journal")
      .select("id, food_id, food_name, reaction, logged_at")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        console.log("[dashboard] journal data:", data, "error:", error);
        setRecentJournal(data || []);
      });

    supabaseClient
      .from("tried_foods")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .then(({ count }) => setTriedCount(count || 0));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    supabaseClient
      .from("allergy_records")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .then(({ count }) => setReactionsCount(count || 0));

    supabaseClient
      .from("tried_foods")
      .select("food_id")
      .eq("user_id", userId)
      .then(({ data }) => setTriedFoodIds((data || []).map((r: any) => r.food_id)));

    supabaseClient
      .from("food_journal")
      .select("logged_at")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(60)
      .then(({ data }) => {
        const days = new Set<string>();
        (data || []).forEach((r: any) => {
          const d = new Date(r.logged_at);
          if (!Number.isNaN(d.getTime())) days.add(d.toISOString().slice(0, 10));
        });
        const today = new Date();
        let streak = 0;
        for (let i = 0; i < 365; i++) {
          const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          if (days.has(key)) streak += 1;
          else break;
        }
        setStreakCount(streak);
      });
  }, [userId]);

  if (!mounted) {
    return null;
  }

  const isLoggedIn = storeIsLoggedIn();
  const currentUser = user;
  const userName = babyName.trim() || currentUser?.baby.name || "";
  const ageMonthsFromSupabase =
    babyBirthdate.trim().length > 0 &&
    !Number.isNaN(new Date(babyBirthdate).getTime())
      ? Math.floor(
          (Date.now() - new Date(babyBirthdate).getTime()) /
            (1000 * 60 * 60 * 24 * 30.44)
        )
      : null;
  const userAge =
    ageMonthsFromSupabase !== null
      ? {
          months: Math.max(0, ageMonthsFromSupabase),
          display:
            ageMonthsFromSupabase > 0 ? `${ageMonthsFromSupabase} luni` : "",
        }
      : calculateBabyAge(currentUser?.baby.birthDate ?? "");

  const isVisitor = !isLoggedIn || userName.trim().length === 0;

  const triedFoods = isVisitor ? 0 : triedCount;
  const mildReactions = isVisitor ? 0 : reactionsCount;
  const streak = isVisitor ? 0 : streakCount;
  const div = isVisitor
    ? { startDate: null, week: 0, expectedFoods: 0 }
    : getDiversificationInfo();

  const progress = isVisitor
    ? 60
    : div.startDate
      ? Math.min((triedFoods / targetFoods) * 100, 100)
      : 0;
  const unreadCount = getUnreadNotificationsCount();
  const ageGroup = getCurrentAgeGroup();

  const triedFoodIdSet = new Set(triedFoodIds);
  const eligibleFoods = getFoodsByAgeGroup(ageGroup);
  const untriedFoods = eligibleFoods.filter((f) => !triedFoodIdSet.has(f.id));

  let nextFood: FoodCatalogItem | null = null;
  let allRecommendedTried = false;
  if (isVisitor) {
    nextFood = getNextSuggestedFood();
  } else if (eligibleFoods.length > 0 && untriedFoods.length === 0) {
    allRecommendedTried = true;
  } else if (untriedFoods.length > 0) {
    nextFood = untriedFoods[dayOfMonth % untriedFoods.length];
  }

  const nextGroupMap: Record<typeof ageGroup, string> = {
    "6-7": "7-8",
    "7-8": "8-10",
    "8-10": "10-12",
    "10-12": "12+",
  };

  return (
    <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center overflow-y-auto">
      {isVisitor && visitorBannerVisible ? (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-[393px] bg-[#EDE7F6] text-[#534AB7] text-[12px] rounded-[14px] px-4 py-3 z-[60] flex items-center justify-between gap-3">
          <span className="leading-tight">
            Explorezi ca vizitator · Creează cont pentru a salva
          </span>
          <button
            type="button"
            onClick={() => setVisitorBannerVisible(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
            aria-label="Închide"
          >
            <span className="text-[18px] leading-none">×</span>
          </button>
        </div>
      ) : null}

      <main key={storeVersion} className="w-full max-w-[393px] px-6 pb-[168px]">
        <header className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-normal text-[#8B7A8E]">
                {isVisitor ? "Bună! 👋" : greetingForLocalHour()}
              </p>
              <p className="mt-1 text-[22px] font-extrabold text-[#3D2C3E]">
                {isVisitor
                  ? "Descoperă DiversiBebe"
                  : `${userName} — ${userAge.display}`}
              </p>
            </div>

            <div className="flex items-start gap-3">
              <Link
                href="/notificari"
                className="relative cursor-pointer"
                aria-label="Notificări"
              >
                <span className="text-[22px] leading-none">🔔</span>
                {unreadCount > 0 ? (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-[#FF3B30] rounded-full" />
                ) : null}
              </Link>

              {isVisitor ? (
                <Link
                  href="/login"
                  className="text-[14px] font-bold text-[#D4849A] leading-none cursor-pointer"
                >
                  Conectează-te
                </Link>
              ) : (
                <Link
                  href="/profil"
                  className="w-[44px] h-[44px] rounded-full bg-[#FDE8EE] flex items-center justify-center text-[22px] cursor-pointer"
                  aria-label="Profil"
                >
                  👶
                </Link>
              )}
            </div>
          </div>
        </header>

        <section
          className="mt-6 rounded-[20px] bg-gradient-to-b from-[#FDE8EE] to-[#EDE7F6] p-5"
          style={{ boxShadow: "0 2px 12px rgba(212,132,154,0.15)" }}
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#D4849A]">
            {isVisitor
              ? "EXEMPLU DE DIVERSIFICARE"
              : div.startDate
              ? `SĂPTĂMÂNA ${div.week} DE DIVERSIFICARE`
              : "BINE AI VENIT!"}
          </p>
          <p className="mt-2 text-[20px] font-bold text-[#3D2C3E]">
            {isVisitor
              ? "3 din 5 alimente noi"
              : div.startDate
                ? `${userName?.trim() ? userName : "Bebelușul tău"} a încercat ${triedCount} alimente`
                : "Începe diversificarea când ești gata"}
          </p>

          <div className="mt-4 h-[6px] w-full rounded-full bg-white/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#D4849A] transition-[width] duration-[1000ms] ease-in-out"
              style={{
                width: `${isVisitor || div.startDate ? progress : 0}%`,
              }}
            />
          </div>

          {isVisitor ? (
            <div className="mt-4 pt-3 border-t border-[#EDE7F6] flex items-center justify-between gap-3">
              <p className="text-[12px] font-normal text-[#534AB7] leading-tight">
                Creează un cont gratuit pentru a-ți urmări progresul
              </p>
              <Link
                href="/register"
                className="h-8 px-4 bg-[#D4849A] text-white rounded-full font-bold text-[12px] flex items-center cursor-pointer whitespace-nowrap"
              >
                Creează cont →
              </Link>
            </div>
          ) : !div.startDate ? (
            <div className="mt-4 pt-3 border-t border-[#EDE7F6] flex items-center justify-between gap-3">
              <p className="text-[12px] font-normal text-[#534AB7] leading-tight">
                Bine ai venit! Începe diversificarea când ești gata
              </p>
              <button
                type="button"
                className="h-8 px-4 bg-[#D4849A] text-white rounded-full font-bold text-[12px]"
                onClick={() => setDiversificationStartDate(new Date().toISOString())}
              >
                Am început diversificarea
              </button>
            </div>
          ) : null}
        </section>

        <p className="mt-5 text-[11px] font-bold uppercase tracking-wide text-[#8B7A8E]">
          Astăzi încearcă
        </p>
        {!isVisitor ? (
          <div
            className="mt-2"
            style={{
              background: "#E0F5F0",
              color: "#0F6E56",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {triedCount === 0
              ? "Începe diversificarea: încearcă primul aliment azi 🥕"
              : triedCount < 5
                ? `Continuă! Mai ai ${5 - triedCount} alimente de introdus săptămâna asta`
                : `Bravo! ${userName?.trim() ? userName : "Bebelușul"} a încercat ${triedCount} alimente 🎉`}
          </div>
        ) : null}
        <Link
          href={
            allRecommendedTried
              ? `/alimente?group=${nextGroupMap[ageGroup]}`
              : nextFood
                ? `/alimente/${nextFood.id}`
                : `/alimente?group=${nextGroupMap[ageGroup]}`
          }
          className="mt-2 rounded-[20px] bg-white border border-[#E0F5F0] p-5 flex items-center justify-between cursor-pointer transition-transform duration-200 hover:scale-[1.02] hover:shadow-[0_12px_24px_rgba(212,132,154,0.15)]"
          aria-label="Încearcă azi"
        >
          <div className="flex items-center gap-4">
            <div className="w-[48px] h-[48px] rounded-[16px] bg-[#E0F5F0] flex items-center justify-center text-[24px]">
              {nextFood ? nextFood.emoji : "🎉"}
            </div>

            <div className="min-w-0 text-left">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#6BBFAD]">
                ÎNCEARCĂ AZI
              </p>
              <p className="mt-2 text-[17px] font-bold text-[#3D2C3E]">
                {allRecommendedTried
                  ? `🎉 Ai încercat toate alimentele recomandate pentru vârsta lui ${userName}!`
                  : nextFood
                    ? nextFood.name
                    : "Felicitări! Ai încercat toate alimentele!"}
              </p>
              <p className="mt-1 text-[12px] font-normal text-[#8B7A8E]">
                {allRecommendedTried
                  ? "Explorează și alte grupe de vârstă"
                  : nextFood
                    ? "Potrivit vârstei curente"
                    : "Treci la grupa următoare"}
              </p>
            </div>
          </div>

          <span className="text-[28px] text-[#B8A9BB] leading-none">›</span>
        </Link>

        {!isVisitor ? (
          <div className="mt-5 rounded-[14px] bg-white/80 border border-[#EDE7F6] px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#8B7A8E]">
              Următorul pas pentru tine
            </p>
            <p className="mt-1 text-[13px] text-[#3D2C3E] font-semibold leading-snug">
              {`Jurnalizează ce a mâncat ${userName?.trim() ? userName : "bebelușul"} azi sau explorează recomandarea`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/jurnal"
                className="inline-flex items-center justify-center rounded-full bg-[#D4849A] text-white text-[12px] font-bold px-4 py-2"
              >
                + Jurnal masă
              </Link>
              <Link
                href="/alimente?filter=incercate"
                className="inline-flex items-center justify-center rounded-full border border-[#D4849A] text-[#993556] text-[12px] font-bold px-4 py-2"
              >
                Alimente încercate
              </Link>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <Link
            href="/alimente?filter=incercate"
            className="rounded-[16px] bg-[#FDE8EE] py-[14px] px-2 text-center cursor-pointer transition-transform duration-200 hover:scale-[1.02] hover:shadow-[0_10px_20px_rgba(212,132,154,0.12)] min-h-[96px] flex flex-col justify-center"
          >
            <div className="text-[22px]">🥄</div>
            <div className="mt-1 text-[22px] font-bold text-[#D4849A]">
              {triedCount}
            </div>
            <p className="mt-1 text-[10px] font-semibold text-[#993556]">
              {triedCount === 0 ? "Niciun aliment încă" : "Alimente încercate"}
            </p>
          </Link>

          <Link
            href="/alergii"
            className="rounded-[16px] bg-[#FAEEDA] py-[14px] px-2 text-center cursor-pointer transition-transform duration-200 hover:scale-[1.02] hover:shadow-[0_10px_20px_rgba(212,132,154,0.12)] min-h-[96px] flex flex-col justify-center"
          >
            <div className="text-[22px]">⚠️</div>
            <div className="mt-1 text-[22px] font-bold text-[#854F0B]">
              {mildReactions}
            </div>
            <p className="mt-1 text-[10px] font-semibold text-[#633806]">
              {mildReactions === 0 ? "Nicio reacție" : "Reacție ușoară"}
            </p>
          </Link>

          <Link
            href="/istoric"
            className="rounded-[16px] bg-[#E0F5F0] py-[14px] px-2 text-center min-h-[96px] flex flex-col justify-center cursor-pointer transition-transform duration-200 hover:scale-[1.02] hover:shadow-[0_10px_20px_rgba(212,132,154,0.12)]"
          >
            <div className="text-[22px]">🔥</div>
            <div className="mt-1 text-[22px] font-bold text-[#0F6E56]">
              {streak}
            </div>
            <p className="mt-1 text-[10px] font-semibold text-[#085041] leading-tight">
              {streak === 0
                ? "Începe azi!"
                : streak === 1
                  ? "1 zi consecutivă 🔥 Continuă mâine!"
                  : streak >= 3
                    ? `${streak} zile 🔥 Ești pe val!`
                    : `${streak} zile consecutive`}
            </p>
          </Link>
        </div>

        <section className="mt-7">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[15px] font-bold text-[#3D2C3E]">
                Ce ai făcut recent
              </p>
              <p className="mt-0.5 text-[12px] text-[#8B7A8E]">
                Ultimele jurnalizări
              </p>
            </div>
            {!isVisitor ? (
              <Link
                href="/jurnal"
                className="shrink-0 text-[12px] font-bold text-[#D4849A]"
              >
                + Jurnal
              </Link>
            ) : null}
          </div>

          {isVisitor ? (
            <div className="mt-3 flex flex-col gap-2">
              <Link
                href="/alimente/cartof-dulce"
                className="flex flex-row items-center gap-3 rounded-[12px] bg-white py-[10px] pl-[14px] pr-[10px] cursor-pointer"
                style={{
                  marginBottom: 8,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[18px]"
                  style={{ background: "#FFF0F5" }}
                >
                  🍠
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[13px] font-bold leading-tight"
                    style={{ color: "#3D2C3E" }}
                  >
                    Cartof dulce
                  </p>
                  <p
                    className="mt-0.5 text-[11px] leading-snug"
                    style={{ color: "#8B7A8E" }}
                  >
                    😍 Adorat • Jumătate
                  </p>
                </div>
                <span
                  className="shrink-0 text-[11px] whitespace-nowrap"
                  style={{ color: "#B0A0B8" }}
                >
                  Azi
                </span>
              </Link>

              <Link
                href="/alimente/morcov"
                className="flex flex-row items-center gap-3 rounded-[12px] bg-white py-[10px] pl-[14px] pr-[10px] cursor-pointer"
                style={{
                  marginBottom: 8,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[18px]"
                  style={{ background: "#FFF0F5" }}
                >
                  🥕
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[13px] font-bold leading-tight"
                    style={{ color: "#3D2C3E" }}
                  >
                    Morcov
                  </p>
                  <p
                    className="mt-0.5 text-[11px] leading-snug"
                    style={{ color: "#8B7A8E" }}
                  >
                    😊 Ok • Tot
                  </p>
                </div>
                <span
                  className="shrink-0 text-[11px] whitespace-nowrap"
                  style={{ color: "#B0A0B8" }}
                >
                  Ieri
                </span>
              </Link>

              <Link
                href="/alimente/dovlecel"
                className="flex flex-row items-center gap-3 rounded-[12px] bg-white py-[10px] pl-[14px] pr-[10px] cursor-pointer"
                style={{
                  marginBottom: 8,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[18px]"
                  style={{ background: "#FFF0F5" }}
                >
                  🥒
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[13px] font-bold leading-tight"
                    style={{ color: "#3D2C3E" }}
                  >
                    Dovlecel
                  </p>
                  <p
                    className="mt-0.5 text-[11px] leading-snug"
                    style={{ color: "#8B7A8E" }}
                  >
                    😊 Ok • Puțin
                  </p>
                </div>
                <span
                  className="shrink-0 text-[11px] whitespace-nowrap"
                  style={{ color: "#B0A0B8" }}
                >
                  Ieri
                </span>
              </Link>
            </div>
          ) : recentJournal.length === 0 ? (
            <div className="mt-3 text-center">
              <p className="text-[14px] text-[#8B7A8E]">
                Prima ta jurnalizare te așteaptă! 🎉
              </p>
              <button
                type="button"
                onClick={() => router.push("/jurnal")}
                className="mt-4 w-full rounded-[12px] border border-[#EDE7F6] bg-white py-3 text-center text-[13px] font-semibold cursor-pointer"
                style={{ color: "#D4849A" }}
              >
                ➕ Jurnalizează prima masă
              </button>
            </div>
          ) : (
            <div className="mt-3 flex flex-col">
              {recentJournal.map((entry: any) => (
                <div
                  key={entry.id}
                  className="flex flex-row items-center gap-3 rounded-[12px] bg-white py-[10px] pl-[14px] pr-[10px]"
                  style={{
                    marginBottom: 8,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[18px]"
                    style={{ background: "#FFF0F5" }}
                  >
                    🍽️
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[13px] font-bold leading-tight truncate"
                      style={{ color: "#3D2C3E" }}
                    >
                      {entry.food_name}
                    </p>
                    <p
                      className="mt-0.5 text-[11px] leading-snug"
                      style={{ color: "#8B7A8E" }}
                    >
                      {reactionLabel(entry.reaction)}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-[11px] whitespace-nowrap"
                    style={{ color: "#B0A0B8" }}
                  >
                    {(() => {
                      const d = new Date(entry.logged_at);
                      const now = new Date();
                      const diff = Math.floor(
                        (now.getTime() - d.getTime()) / 86400000
                      );
                      if (diff === 0) return "Azi";
                      if (diff === 1) return "Ieri";
                      return `Acum ${diff} zile`;
                    })()}
                  </span>
                </div>
              ))}
              <button
                type="button"
                onClick={() => router.push("/istoric")}
                className="mt-1 w-full rounded-[12px] border border-[#EDE7F6] bg-white py-3 text-center text-[13px] font-semibold cursor-pointer"
                style={{ color: "#D4849A" }}
              >
                📋 Vezi istoricul complet →
              </button>
            </div>
          )}
        </section>
      </main>

      <Link
        href="/jurnal"
        className="fixed z-20 w-[56px] h-[56px] rounded-full bg-[#D4849A] flex items-center justify-center shadow-[0_14px_26px_rgba(212,132,154,0.35)] cursor-pointer"
        style={{ bottom: "88px", right: "calc(50% - 196px + 24px)" }}
        aria-label="Adaugă intrare jurnal"
      >
        <span className="text-[24px] font-bold leading-none text-white">+</span>
      </Link>

      <Navbar activeTab="acasa" />
    </div>
  );
}

