"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import Navbar from "../../components/Navbar";
import type { RecipeCatalogItem } from "../../lib/recipesDatabase";
import { RECIPES } from "../../lib/recipesDatabase";
import type { FoodEntry } from "../../lib/store";
import { getFoodById } from "../../lib/store";

type JournalPreviewRow = {
  id: string;
  food_id: string;
  food_name: string;
  reaction: string | null;
  logged_at: string;
  portion: string | null;
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

function recipeRelatesToFood(
  recipe: RecipeCatalogItem,
  foodId: string,
  foodName: string
) {
  const nameLower = foodName.toLowerCase();
  return recipe.relatedFoods.some((rf) => {
    if (rf === foodId) return true;
    if (nameLower.includes(rf)) return true;
    const rfSpaced = rf.replace(/-/g, " ");
    if (nameLower.includes(rfSpaced)) return true;
    return false;
  });
}

type Pill = {
  label: string;
  bg: string;
  color: string;
};

export default function FoodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [showGuestPopup, setShowGuestPopup] = useState(false);
  const { id } = use(params);
  const { userId } = useUser();
  const [triedData, setTriedData] = useState<{
    try_count: number;
    first_tried_at: string;
  } | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalPreviewRow[]>(
    []
  );

  useEffect(() => {
    if (!userId || !id) {
      setTriedData(null);
      setJournalEntries([]);
      return;
    }
    const supabase = createClient();

    supabase
      .from("tried_foods")
      .select("try_count, first_tried_at")
      .eq("user_id", userId)
      .eq("food_id", id)
      .maybeSingle()
      .then(({ data }) => setTriedData(data));

    supabase
      .from("food_journal")
      .select("id, food_id, food_name, reaction, logged_at, portion")
      .eq("user_id", userId)
      .eq("food_id", id)
      .order("logged_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setJournalEntries((data as JournalPreviewRow[]) || []));
  }, [userId, id]);

  const food = useMemo(() => {
    const fromCatalog = getFoodById(id);
    if (!fromCatalog) return undefined;

    const ageLabel =
      fromCatalog.ageGroup === "6-7"
        ? "6-7 luni"
        : fromCatalog.ageGroup === "7-8"
        ? "7-8 luni"
        : fromCatalog.ageGroup === "6-8"
        ? "6-7 / 7-8 luni"
        : fromCatalog.ageGroup === "8-10"
        ? "8-10 luni"
        : "10-12 luni";

    return {
      id: fromCatalog.id,
      name: fromCatalog.name,
      emoji: fromCatalog.emoji,
      agePill: { label: ageLabel, bg: "#E0F5F0", color: "#0F6E56" },
      nutrientsPills: fromCatalog.nutrients.map((n) => ({
        label: n,
        bg: "#E0F5F0",
        color: "#0F6E56",
      })),
      preparation: fromCatalog.preparation,
      allergen: fromCatalog.allergenInfo,
      status: "De încercat" as const,
      reaction: "Niciuna" as const,
    };
  }, [id]);

  const relatedRecipes = useMemo(() => {
    const fromCatalog = getFoodById(id);
    if (!fromCatalog) return [];
    return RECIPES.filter((recipe) =>
      recipeRelatesToFood(recipe, fromCatalog.id, fromCatalog.name)
    );
  }, [id]);

  if (!food) {
    return (
      <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center">
        <main className="w-full max-w-[393px] px-6 pb-[128px]">
          <p className="mt-10 text-[14px] text-[#8B7A8E]">Aliment inexistent</p>
          <div className="mt-4">
            <Link
              href="/alimente"
              className="text-[14px] font-semibold text-[#D4849A]"
            >
              Înapoi la listă
            </Link>
          </div>
        </main>
        <Navbar activeTab="alimente" />
      </div>
    );
  }

  const isTried = triedData !== null;
  const latestJournal = journalEntries[0];
  const latestReaction = latestJournal
    ? dbReactionToFoodReaction(latestJournal.reaction)
    : null;
  const reactionDisplay =
    latestReaction === "loved"
      ? "😋 A adorat"
      : latestReaction === "ok"
        ? "😐 Ok"
        : latestReaction === "disliked"
          ? "🙁 Nu a plăcut"
          : latestReaction === "refused"
            ? "🤢 A refuzat"
            : isTried
              ? "Jurnalizat"
              : "Niciuna";
  const reactionDateText = latestJournal?.logged_at
    ? (() => {
        const dt = new Date(latestJournal.logged_at);
        return dt.toLocaleString("ro-RO", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      })()
    : "";

  const journalCount = triedData?.try_count ?? 0;
  const firstJournalLabel = triedData?.first_tried_at
    ? new Date(triedData.first_tried_at).toLocaleDateString("ro-RO")
    : "";

  function journalReactionEmoji(r: FoodEntry["reaction"]) {
    if (r === "loved") return "😍";
    if (r === "ok") return "😊";
    if (r === "disliked") return "😕";
    if (r === "refused") return "🙅";
    return "—";
  }

  function journalPortionText(p: FoodEntry["portion"]) {
    if (p === "putin") return "puțin";
    if (p === "jumatate") return "jumătate";
    if (p === "tot") return "tot";
    return "";
  }

  const jurnalHref = `/jurnal?foodId=${encodeURIComponent(food.id)}&foodName=${encodeURIComponent(food.name)}&emoji=${encodeURIComponent(food.emoji)}`;

  const previewRecipes = relatedRecipes.slice(0, 3);
  const hasMoreRecipes = relatedRecipes.length > 3;

  return (
    <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center">
      <main
        className="w-full max-w-[393px] px-6 pb-[128px]"
        style={{ fontFamily: '"Nunito", sans-serif' }}
      >
        <header className="pt-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-[22px] text-[#3D2C3E] leading-none cursor-pointer bg-transparent border-0 p-0"
              aria-label="Înapoi"
            >
              ←
            </button>
            <h1 className="text-[18px] font-extrabold text-[#3D2C3E]">
              Detalii aliment
            </h1>
            <div className="w-[22px]" />
          </div>
        </header>

        <section className="mt-6 text-center">
          <div className="w-[96px] h-[96px] rounded-[24px] bg-[#E0F5F0] flex items-center justify-center mx-auto">
            <span className="text-[64px] leading-none">{food.emoji}</span>
          </div>

          <h2 className="mt-4 text-[24px] font-extrabold text-[#3D2C3E]">
            {food.name}
          </h2>

          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
            {[food.agePill, ...food.nutrientsPills].map((p) => (
              <span
                key={p.label}
                className="px-[12px] py-[4px] rounded-[12px] text-[12px] font-semibold"
                style={{ backgroundColor: p.bg, color: p.color }}
              >
                {p.label}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-5 space-y-3">
          <div className="bg-white border border-[#EDE7F6] rounded-[16px] p-4">
            <p className="text-[13px] font-bold text-[#3D2C3E]">
              Cum se prepară
            </p>
            <p
              className="mt-2 text-[13px] text-[#8B7A8E] leading-[1.6]"
              style={{ lineHeight: 1.6 }}
            >
              {food.preparation}
            </p>
          </div>

          <div className="bg-white border border-[#EDE7F6] rounded-[16px] p-4">
            <p className="text-[13px] font-bold text-[#3D2C3E]">
              Alergeni posibili
            </p>
            <p
              className="mt-2 text-[13px] text-[#8B7A8E] leading-[1.6]"
              style={{ lineHeight: 1.6 }}
            >
              {food.allergen}
            </p>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <div
            className="rounded-[14px] px-3 py-4 text-center"
            style={{ backgroundColor: "#E0F5F0" }}
          >
            <p className="text-[11px] font-normal" style={{ color: "#0F6E56" }}>
              Status
            </p>
            <p
              className="mt-1 text-[14px] font-bold"
              style={{ color: isTried ? "#0F6E56" : "#C47A3A" }}
            >
              {isTried ? "✅ Încercat" : "🆕 De încercat"}
            </p>
          </div>

          <div
            className="rounded-[14px] px-3 py-4 text-center"
            style={{ backgroundColor: "#FDE8EE" }}
          >
            <p
              className="text-[11px] font-normal"
              style={{ color: "#D4849A" }}
            >
              Reacție
            </p>
            <p
              className="mt-1 text-[14px] font-bold"
              style={{ color: "#D4849A" }}
            >
              {reactionDisplay}
            </p>
            {latestJournal ? (
              <p className="mt-1 text-[11px] font-normal" style={{ color: "#8B7A8E" }}>
                {reactionDateText}
              </p>
            ) : null}
          </div>
        </section>

        <section className="mt-5">
          {!isTried ? (
            <button
              type="button"
              className="h-12 w-full rounded-full bg-[#D4849A] text-white font-bold text-[16px] flex items-center justify-center cursor-pointer"
              onClick={() => {
                if (!userId) {
                  setShowGuestPopup(true);
                  return;
                }
                router.push(jurnalHref);
              }}
            >
              Marchează ca încercat
            </button>
          ) : (
            <div className="bg-white border border-[#EDE7F6] rounded-[16px] p-4 text-center">
              <p className="text-[13px] font-semibold text-[#3D2C3E]">
                Ultima reacție: {reactionDisplay}
              </p>
              <p className="text-[12px] text-[#8B7A8E] mt-1">
                {reactionDateText}
              </p>
            </div>
          )}
        </section>

        <section className="mt-5">
          <p className="text-[15px] font-bold text-[#3D2C3E]">
            Istoricul tău cu {food.name}
          </p>
          {journalCount === 0 ? (
            <p className="mt-2 text-[13px] text-[#8B7A8E]">
              Nu ai jurnalizat încă acest aliment
            </p>
          ) : (
            <>
              <p className="mt-1 text-[12px] text-[#8B7A8E]">
                Prima dată încercat: {firstJournalLabel} · De {journalCount}{" "}
                {journalCount === 1 ? "dată" : "ori"} în jurnal
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {journalEntries.map((je) => {
                  const jdt = new Date(je.logged_at);
                  const rx = dbReactionToFoodReaction(je.reaction);
                  const pt = je.portion as FoodEntry["portion"] | null;
                  return (
                    <div
                      key={je.id}
                      className="rounded-[12px] border border-[#EDE7F6] bg-white px-3 py-2"
                    >
                      <p className="text-[12px] font-semibold text-[#3D2C3E]">
                        {jdt.toLocaleDateString("ro-RO")}
                        <span className="ml-2 text-[#8B7A8E]">
                          {journalReactionEmoji(rx)}
                          {journalPortionText(pt)
                            ? ` · ${journalPortionText(pt)}`
                            : ""}
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          <button
            type="button"
            className="mt-4 h-11 w-full rounded-full border border-[#D4849A] bg-white text-[14px] font-bold text-[#D4849A] cursor-pointer"
            onClick={() => {
              if (!userId) {
                setShowGuestPopup(true);
                return;
              }
              router.push(jurnalHref);
            }}
          >
            ➕ Jurnalizează acum
          </button>
        </section>

        <section className="mt-6">
          <p className="text-[15px] font-bold text-[#3D2C3E]">
            Rețete cu {food.name}
          </p>
          {relatedRecipes.length === 0 ? (
            <p className="mt-2 text-[13px] text-[#8B7A8E]">
              Nicio rețetă disponibilă încă pentru {food.name}
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {previewRecipes.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => router.push(`/retete/${r.id}`)}
                  className="w-full rounded-[16px] p-3 flex flex-row gap-3 items-center text-left bg-white border border-[#EDE7F6] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#D4849A] focus-visible:ring-offset-2"
                >
                  <div
                    className="w-10 h-10 shrink-0 flex items-center justify-center rounded-[10px]"
                    style={{ backgroundColor: "rgba(168, 220, 209, 0.2)" }}
                  >
                    <span
                      className="leading-none"
                      style={{ fontSize: 32 }}
                      aria-hidden
                    >
                      {r.emoji}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col gap-1">
                    <p className="text-[14px] font-semibold text-[#3D2C3E] truncate">
                      {r.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12px] text-[#8B7A8E]">
                        ⏱ {r.time}
                      </span>
                      <span
                        className="inline-block text-[10px] font-semibold rounded-[20px] px-2 py-0.5"
                        style={{
                          backgroundColor: "#F4B4C4",
                          color: "#3D2C3E",
                          padding: "2px 8px",
                        }}
                      >
                        {r.age}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
              {hasMoreRecipes ? (
                <Link
                  href="/retete"
                  className="text-[13px] font-semibold text-[#D4849A] mt-1"
                >
                  Vezi toate rețetele →
                </Link>
              ) : null}
            </div>
          )}
        </section>
      </main>

      {showGuestPopup ? (
        <div className="fixed inset-0 bg-black/25 z-40 flex items-center justify-center px-6">
          <div className="w-full max-w-[330px] bg-white rounded-[16px] p-5">
            <p className="text-[14px] text-[#3D2C3E] leading-6">
              Creează un cont gratuit pentru a salva progresul
            </p>
            <div className="mt-4 flex gap-3">
              <Link
                href="/register"
                className="h-10 flex-1 rounded-full bg-[#D4849A] text-white text-[13px] font-bold flex items-center justify-center"
              >
                Creează cont
              </Link>
              <button
                type="button"
                className="h-10 flex-1 rounded-full border border-[#EDE7F6] text-[#8B7A8E] text-[13px] font-semibold"
                onClick={() => setShowGuestPopup(false)}
              >
                Mai târziu
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Navbar activeTab="alimente" />
    </div>
  );
}

