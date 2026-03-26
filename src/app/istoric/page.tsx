"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { getFoodEntries, type FoodEntry } from "../lib/store";
import { useStoreRefresh } from "../lib/useStoreRefresh";

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
  const storeVersion = useStoreRefresh();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sheetEntry, setSheetEntry] = useState<FoodEntry | null>(null);

  const allEntries = useMemo(() => {
    void storeVersion;
    return getFoodEntries();
  }, [storeVersion]);

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
    const reactions = last30.filter((e) => hasBadSymptoms(e)).length;
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
      if (filter === "reactions") return hasBadSymptoms(e);
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

  const chips: { key: FilterKey; label: string }[] = [
    { key: "all", label: "Toate" },
    { key: "loved", label: "😍 Adorate" },
    { key: "reactions", label: "⚠️ Cu reacții" },
    { key: "week", label: "Săptămâna asta" },
    { key: "month", label: "Luna asta" },
  ];

  const filterActive = filter !== "all";
  const totallyEmpty = last30.length === 0;

  return (
    <div
      className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center"
      style={{ fontFamily: '"Nunito", sans-serif' }}
    >
      <main
        key={storeVersion}
        className="w-full max-w-[393px] px-6 pb-[128px]"
      >
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
              Nicio intrare găsită
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
                  const bad = hasBadSymptoms(e);
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
