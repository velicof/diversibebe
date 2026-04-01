"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import Navbar from "../components/Navbar";
import type { FoodEntry } from "../lib/store";
import { RECIPES } from "../lib/recipesDatabase";

const RO_MONTHS_LONG = [
  "ianuarie",
  "februarie",
  "martie",
  "aprilie",
  "mai",
  "iunie",
  "iulie",
  "august",
  "septembrie",
  "octombrie",
  "noiembrie",
  "decembrie",
] as const;

const RO_WEEKDAYS = [
  "Duminică",
  "Luni",
  "Marți",
  "Miercuri",
  "Joi",
  "Vineri",
  "Sâmbătă",
] as const;

type FilterKey = "all" | "loved" | "reactions" | "week" | "month";

function capMonth(m: string) {
  return m.charAt(0).toUpperCase() + m.slice(1);
}

function reactionLabel(r: FoodEntry["reaction"]): string {
  if (r === "loved") return "😍 Adorat";
  if (r === "ok") return "😊 Ok";
  if (r === "disliked") return "😕 Nu a plăcut";
  if (r === "refused") return "🙅 Refuzat";
  return "—";
}

function portionLabel(p: FoodEntry["portion"]): string {
  if (p === "putin") return "• Puțin";
  if (p === "jumatate") return "• Jumătate";
  if (p === "tot") return "• Tot";
  return "";
}

function moodLabel(m: FoodEntry["babyMood"]): string {
  if (m === "fericit") return "Fericit";
  if (m === "obosit") return "Obosit";
  if (m === "agitat") return "Agitat";
  return "—";
}

function hasBadSymptoms(e: FoodEntry) {
  return e.symptoms.length > 0 && !e.symptoms.includes("Nicio reacție");
}

function hasAdverseJournalSignal(e: FoodEntry) {
  if (hasBadSymptoms(e)) return true;
  return e.reaction === "disliked" || e.reaction === "refused";
}

type FoodJournalRow = {
  id: string;
  food_id: string;
  food_name: string;
  reaction: string | null;
  notes: string | null;
  logged_at: string;
  meal_type: string | null;
  symptoms: string[] | null;
  portion: string | null;
  baby_mood: string | null;
  quantity_grams?: number | null;
};

type CookedRecipeRow = {
  id: string;
  recipe_id: string;
  cooked_at: string;
  recipe_name?: string | null;
  recipe_emoji?: string | null;
};

function dbReactionToFoodReaction(db: string | null): FoodEntry["reaction"] {
  if (!db) return null;
  if (db === "pozitiv" || db === "loved") return "loved";
  if (db === "neutru" || db === "ok") return "ok";
  if (db === "negativ" || db === "disliked") return "disliked";
  if (db === "refused") return "refused";
  if (db === "alergie") return "disliked";
  return null;
}

function rowToFoodEntry(row: FoodJournalRow): FoodEntry {
  const d = new Date(row.logged_at);
  const date =
    row.logged_at.length >= 10
      ? row.logged_at.slice(0, 10)
      : todayISOFromDate(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  const time = Number.isNaN(d.getTime())
    ? "12:00"
    : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return {
    id: row.id,
    type: "food",
    foodId: row.food_id,
    foodName: row.food_name,
    emoji: "🍽️",
    date,
    time,
    reaction: dbReactionToFoodReaction(row.reaction),
    portion: (row.portion as FoodEntry["portion"]) ?? null,
    symptoms: Array.isArray(row.symptoms) ? row.symptoms : [],
    notes: (row.notes ?? "").trim(),
    babyMood: (row.baby_mood as FoodEntry["babyMood"]) ?? null,
  };
}

function todayISOFromDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseEntryDate(e: FoodEntry): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) return null;
  const [y, m, d] = e.date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function endOfWeekSunday(monday: Date) {
  const x = new Date(monday);
  x.setDate(x.getDate() + 6);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfCalendarMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfCalendarMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function isInLast30Days(dt: Date, now: Date) {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 30);
  cutoff.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return dt >= cutoff && dt <= end;
}

function entryDisplayName(e: FoodEntry) {
  return e.type === "recipe" && e.recipeName ? e.recipeName : e.foodName;
}

function inferMealChip(timeStr: string): { emoji: string; label: string } {
  const m = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return { emoji: "🍽️", label: "Masă" };
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  if (minutes < 10 * 60) return { emoji: "🌅", label: "Mic dejun" };
  if (minutes < 12 * 60) return { emoji: "🍎", label: "Gustare" };
  if (minutes < 16 * 60) return { emoji: "☀️", label: "Prânz" };
  if (minutes < 18 * 60) return { emoji: "🍎", label: "Gustare" };
  return { emoji: "🌙", label: "Cină" };
}

function formatGroupHeader(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const now = new Date();
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const t1 = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const diff = Math.round((t0.getTime() - t1.getTime()) / 86400000);
  if (diff === 0) return "Azi";
  if (diff === 1) return "Ieri";
  const wd = RO_WEEKDAYS[dt.getDay()];
  const month = capMonth(RO_MONTHS_LONG[m - 1]);
  return `${wd}, ${d} ${month}`;
}

function formatFullDate(e: FoodEntry): string {
  const [y, mo, d] = e.date.slice(0, 10).split("-").map(Number);
  if (!y || !mo || !d) return e.date;
  return `${d} ${capMonth(RO_MONTHS_LONG[mo - 1])} ${y}`;
}

function EntryDetailSheet({
  entry,
  onClose,
}: {
  entry: FoodEntry;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const symptomsList = entry.symptoms.filter((s) => s !== "Nicio reacție");

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 cursor-default"
        aria-label="Închide"
        onClick={onClose}
      />
      <div
        className="relative max-h-[85vh] overflow-y-auto bg-white px-5 pt-4 pb-8 rounded-t-[24px] shadow-[0_-8px_32px_rgba(0,0,0,0.12)]"
        style={{ fontFamily: '"Nunito", sans-serif' }}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <p className="text-[16px] font-extrabold text-[#3D2C3E] pr-8">
            Detalii intrare
          </p>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-[20px] text-[#8B7A8E] cursor-pointer hover:bg-[#F5F0F8]"
            aria-label="Închide"
          >
            ×
          </button>
        </div>

        <dl className="space-y-3 text-[14px]">
          <div>
            <dt className="text-[11px] font-bold uppercase text-[#B0A0B8]">
              {entry.type === "recipe" ? "Rețetă" : "Aliment"}
            </dt>
            <dd className="mt-0.5 font-bold text-[#3D2C3E]">
              {entryDisplayName(entry)} {entry.emoji}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase text-[#B0A0B8]">
              Data
            </dt>
            <dd className="mt-0.5 text-[#3D2C3E]">
              {formatFullDate(entry)}
              {entry.time ? ` · ${entry.time}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase text-[#B0A0B8]">
              Reacție
            </dt>
            <dd className="mt-0.5 text-[#3D2C3E]">
              {reactionLabel(entry.reaction)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase text-[#B0A0B8]">
              Porție
            </dt>
            <dd className="mt-0.5 text-[#3D2C3E]">
              {entry.portion
                ? portionLabel(entry.portion).replace(/^• /, "")
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase text-[#B0A0B8]">
              Dispoziție
            </dt>
            <dd className="mt-0.5 text-[#3D2C3E]">
              {moodLabel(entry.babyMood)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase text-[#B0A0B8]">
              Simptome
            </dt>
            <dd className="mt-0.5 text-[#3D2C3E]">
              {symptomsList.length ? symptomsList.join(", ") : "—"}
            </dd>
          </div>
          {entry.notes?.trim() ? (
            <div>
              <dt className="text-[11px] font-bold uppercase text-[#B0A0B8]">
                Note
              </dt>
              <dd className="mt-0.5 text-[#3D2C3E] whitespace-pre-wrap">
                {entry.notes.trim()}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  );
}

export default function IstoricPage() {
  const router = useRouter();
  const { userId } = useUser();
  const [journalRows, setJournalRows] = useState<FoodJournalRow[]>([]);
  const [cookedRecipes, setCookedRecipes] = useState<CookedRecipeRow[]>([]);
  const [activeTab, setActiveTab] = useState<"jurnal" | "retete">("jurnal");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sheetEntry, setSheetEntry] = useState<FoodEntry | null>(null);

  useEffect(() => {
    if (!userId) {
      setJournalRows([]);
      setCookedRecipes([]);
      return;
    }
    const supabase = createClient();
    supabase
      .from("food_journal")
      .select(
        "id, food_id, food_name, reaction, notes, logged_at, meal_type, symptoms, portion, baby_mood, quantity_grams"
      )
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .then(({ data }) => setJournalRows((data as FoodJournalRow[]) || []));

    supabase
      .from("cooked_recipes")
      .select("id, recipe_id, cooked_at")
      .eq("user_id", userId)
      .order("cooked_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          const enriched = (data as CookedRecipeRow[]).map((row) => {
            const recipe = RECIPES.find((r) => r.id === row.recipe_id);
            return {
              ...row,
              recipe_name: recipe?.name || row.recipe_id,
              recipe_emoji: recipe?.emoji || "🍳",
            };
          });
          setCookedRecipes(enriched);
        } else {
          setCookedRecipes([]);
        }
      });
  }, [userId]);

  const allEntries = useMemo(
    () => journalRows.map(rowToFoodEntry),
    [journalRows]
  );

  const last30 = useMemo(() => {
    const n = new Date();
    return allEntries.filter((e) => {
      const dt = parseEntryDate(e);
      return dt ? isInLast30Days(dt, n) : false;
    });
  }, [allEntries]);

  const stats = useMemo(() => {
    const total = last30.length;
    const uniqueKeys = new Set(
      last30.map((e) =>
        e.type === "recipe" && e.recipeId
          ? `r:${e.recipeId}`
          : `f:${e.foodId}`
      )
    );
    const reactions = last30.filter((e) => hasAdverseJournalSignal(e)).length;
    return { total, unique: uniqueKeys.size, reactions };
  }, [last30]);

  const filtered = useMemo(() => {
    const n = new Date();
    const mon = startOfWeekMonday(n);
    const sun = endOfWeekSunday(mon);
    const monthStart = startOfCalendarMonth(n);
    const monthEnd = endOfCalendarMonth(n);

    return last30.filter((e) => {
      const dt = parseEntryDate(e);
      if (!dt) return false;
      if (filter === "loved") return e.reaction === "loved";
      if (filter === "reactions") return hasAdverseJournalSignal(e);
      if (filter === "week") return dt >= mon && dt <= sun;
      if (filter === "month") return dt >= monthStart && dt <= monthEnd;
      return true;
    });
  }, [last30, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, FoodEntry[]>();
    for (const e of filtered) {
      const key = e.date.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (b.time || "").localeCompare(a.time || ""));
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const quantityByEntryId = useMemo(
    () =>
      new Map(
        journalRows.map((row) => [row.id, row.quantity_grams ?? null] as const)
      ),
    [journalRows]
  );

  const chips: { key: FilterKey; label: string }[] = [
    { key: "all", label: "Toate" },
    { key: "loved", label: "😍 Adorate" },
    { key: "reactions", label: "⚠️ Cu reacții" },
    { key: "week", label: "Săptămâna asta" },
    { key: "month", label: "Luna asta" },
  ];

  const filterActive = filter !== "all";
  const totallyEmpty = !userId || allEntries.length === 0;

  return (
    <div
      className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center"
      style={{ fontFamily: '"Nunito", sans-serif' }}
    >
      <main className="w-full max-w-[393px] px-6 pb-[128px]">
        <header className="pt-6">
          <button
            type="button"
            className="cursor-pointer leading-none"
            style={{
              color: "#D4849A",
              fontSize: 20,
              padding: 8,
              background: "none",
              border: "none",
            }}
            aria-label="Înapoi"
            onClick={() => router.back()}
          >
            ←
          </button>
          <h1 className="text-[20px] font-extrabold text-[#3D2C3E] mt-1">
            📋 Istoric jurnal
          </h1>
          <p className="mt-1 text-[13px] text-[#8B7A8E]">
            Ultima lună de activitate
          </p>
        </header>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("jurnal")}
            className={`flex-1 h-10 rounded-full text-[13px] font-bold border transition-colors ${
              activeTab === "jurnal"
                ? "bg-[#D4849A] border-[#D4849A] text-white"
                : "bg-white border-[#EDE7F6] text-[#8B7A8E]"
            }`}
          >
            📓 Jurnal mese
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("retete")}
            className={`flex-1 h-10 rounded-full text-[13px] font-bold border transition-colors ${
              activeTab === "retete"
                ? "bg-[#D4849A] border-[#D4849A] text-white"
                : "bg-white border-[#EDE7F6] text-[#8B7A8E]"
            }`}
          >
            👨‍🍳 Rețete gătite
          </button>
        </div>

        {activeTab === "jurnal" && (
          <>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {chips.map((c) => {
            const active = filter === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setFilter(c.key)}
                className="shrink-0 cursor-pointer rounded-[20px] px-[14px] py-[6px] text-[12px] font-semibold whitespace-nowrap"
                style={{
                  background: active ? "#D4849A" : "#F5F0F8",
                  color: active ? "#FFFFFF" : "#8B7A8E",
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <div
            className="flex-1 rounded-[12px] bg-white py-[10px] px-1 text-center"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <p className="text-[18px] font-bold text-[#3D2C3E]">
              {stats.total}
            </p>
            <p className="text-[10px] text-[#8B7A8E] mt-1 leading-tight px-0.5">
              mese jurnalizate
            </p>
          </div>
          <div
            className="flex-1 rounded-[12px] bg-white py-[10px] px-1 text-center"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <p className="text-[18px] font-bold text-[#3D2C3E]">
              {stats.unique}
            </p>
            <p className="text-[10px] text-[#8B7A8E] mt-1 leading-tight px-0.5">
              Alimente unice încercate
            </p>
          </div>
          <div
            className="flex-1 rounded-[12px] bg-white py-[10px] px-1 text-center"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <p className="text-[18px] font-bold text-[#3D2C3E]">
              {stats.reactions}
            </p>
            <p className="text-[10px] text-[#8B7A8E] mt-1 leading-tight px-0.5">
              Reacții înregistrate
            </p>
            <p className="text-[9px] text-[#B0A0B8]">(cu simptome)</p>
          </div>
        </div>

        {totallyEmpty ? (
          <div className="mt-10 flex flex-col items-center text-center px-4">
            <span className="text-[40px]">📭</span>
            <p className="mt-3 text-[14px] text-[#8B7A8E]">
              Nicio masă jurnalizată încă
            </p>
            <p className="mt-1 text-[13px] text-[#B0A0B8]">
              Jurnalizează prima masă din ultima lună
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-10 flex flex-col items-center text-center px-4">
            <span className="text-[40px]">📭</span>
            <p className="mt-3 text-[14px] text-[#8B7A8E]">
              Nicio intrare găsită
            </p>
            {filterActive ? (
              <p className="mt-1 text-[13px] text-[#B0A0B8]">
                Încearcă alt filtru
              </p>
            ) : null}
          </div>
        ) : (
          <section className="mt-5">
            {grouped.map(([dateKey, dayEntries]) => (
              <div key={dateKey}>
                <p
                  className="text-[12px] font-bold text-[#8B7A8E]"
                  style={{ margin: "12px 0 6px" }}
                >
                  {formatGroupHeader(dateKey)}
                </p>
                {dayEntries.map((e) => {
                  const bad = hasAdverseJournalSignal(e);
                  const meal = inferMealChip(e.time || "12:00");
                  const rx = reactionLabel(e.reaction);
                  const pt = portionLabel(e.portion);
                  const notePreview = e.notes?.trim() || "";
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setSheetEntry(e)}
                      className="mb-[6px] flex w-full gap-3 rounded-[12px] bg-white py-3 pl-[14px] pr-3 text-left cursor-pointer"
                      style={{
                        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                        borderLeft: bad ? "3px solid #E74C3C" : undefined,
                      }}
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-[20px]"
                        style={{ background: "#FFF0F5" }}
                      >
                        {e.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-bold text-[#3D2C3E] truncate">
                          {entryDisplayName(e)}
                          {typeof quantityByEntryId.get(e.id) === "number" ? (
                            <span className="ml-1 text-[11px] font-normal text-[#8B7A8E]">
                              {quantityByEntryId.get(e.id)}g
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold text-[#8B7A8E]">
                          {meal.emoji} {meal.label}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[#8B7A8E]">
                          {rx}
                          {pt ? ` ${pt}` : ""}
                        </p>
                        {bad ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {e.symptoms
                              .filter((s) => s !== "Nicio reacție")
                              .map((s) => (
                                <span
                                  key={s}
                                  className="rounded-[20px] px-2 py-0.5 text-[10px]"
                                  style={{
                                    background: "#FFE5E5",
                                    color: "#E74C3C",
                                  }}
                                >
                                  {s}
                                </span>
                              ))}
                          </div>
                        ) : null}
                        {notePreview ? (
                          <p className="mt-1 text-[11px] italic text-[#B0A0B8] truncate">
                            {notePreview}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-[11px] text-[#B0A0B8] self-start pt-0.5">
                        {e.time || ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </section>
        )}
          </>
        )}

        {activeTab === "retete" && (
          <div className="mt-4">
            {cookedRecipes.length === 0 ? (
              <div className="mt-10 flex flex-col items-center text-center px-4">
                <span className="text-[40px]">👨‍🍳</span>
                <p className="mt-3 text-[14px] text-[#8B7A8E]">
                  Nicio rețetă gătită încă
                </p>
                <p className="mt-1 text-[13px] text-[#B0A0B8]">
                  Apasă "Am gătit" pe orice rețetă din catalog
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {cookedRecipes.map((recipe) => {
                  const d = new Date(recipe.cooked_at);
                  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
                  const when =
                    diff === 0 ? "Azi" : diff === 1 ? "Ieri" : `Acum ${diff} zile`;

                  return (
                    <div
                      key={recipe.id}
                      className="flex items-center gap-3 rounded-[12px] bg-white py-3 pl-[14px] pr-3"
                      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-[20px]"
                        style={{ background: "#FFF0F5" }}
                      >
                        {recipe.recipe_emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-bold text-[#3D2C3E] truncate">
                          {recipe.recipe_name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#8B7A8E]">
                          ✅ Gătită
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-[#B0A0B8]">
                        {when}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {sheetEntry ? (
        <EntryDetailSheet
          entry={sheetEntry}
          onClose={() => setSheetEntry(null)}
        />
      ) : null}

      <Navbar activeTab="acasa" />
    </div>
  );
}
