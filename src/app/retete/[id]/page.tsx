"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { useUser } from "@/lib/useUser";
import { estimateRecipeNutrition, getServingSuggestion } from "@/app/lib/nutrition";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  ageBandLabelRo,
  ageMonthsToAgeBand,
  formatApproxBabyServingsRo,
  formatRecipePortionLineRo,
  inferTotalYieldGrams,
  nutritionAgeKeyFromMonths,
  calendarMonthsFromBirthdateString,
  readBabyAgeMonthsFromStorage,
} from "@/app/lib/recipePortions";
import Navbar from "../../components/Navbar";
import { getRecipeById, type RecipeCatalogItem } from "../../lib/store";

type Pill = {
  label: string;
  bg: string;
  color: string;
};

const MEAL_LABELS: Record<RecipeCatalogItem["mealType"], string> = {
  "mic-dejun": "Mic dejun",
  pranz: "Prânz",
  cina: "Cină",
  gustare: "Gustare",
};

const JOURNAL_MEAL_TYPE_MAP: Record<string, string> = {
  "mic-dejun": "mic-dejun",
  pranz: "pranz",
  cina: "cina",
  gustare: "gustare",
};

function PillView({ pill }: { pill: Pill }) {
  return (
    <span
      className="px-[12px] py-[6px] rounded-[12px] text-[12px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: pill.bg, color: pill.color }}
    >
      {pill.label}
    </span>
  );
}

function servingsBadgeText(s: number | string) {
  if (typeof s === "number") return `${s}`;
  return String(s);
}

function getBabyPortion(ageLabel: string): string {
  const s = ageLabel.trim().toLowerCase();

  const sixToEight =
    "Oferă 2-6 linguri și adaptează după apetit. Unii bebeluși mănâncă mai mult — e normal!";
  const sevenPlus =
    "Oferă 3-8 linguri după apetit. Lasă bebelușul să dicteze cât mănâncă.";
  const eightToTen =
    "Porție orientativă 80-150g, dar urmează indiciile de foame/sațietate ale bebelușului.";
  const tenToTwelve =
    "Porție orientativă 100-180g. Adaptează după apetitul bebelușului în acea zi.";
  const twelvePlus =
    "Porție orientativă 150-250g. La această vârstă bebelușul mănâncă aproape ca un adult mic!";

  if (s.includes("6-7") || s.includes("7-8") || s.includes("6-8")) return sixToEight;
  if (s.includes("8-10")) return eightToTen;
  if (s.includes("10-12")) return tenToTwelve;

  const head = s.match(/^(12|10|8|7|6|5)\s*\+/);
  if (head) {
    switch (head[1]) {
      case "12":
        return twelvePlus;
      case "10":
        return tenToTwelve;
      case "8":
        return eightToTen;
      case "7":
        return sevenPlus;
      case "6":
        return sixToEight;
      case "5":
        return sixToEight;
      default:
        break;
    }
  }

  return "Adaptează cantitatea după apetitul bebelușului.";
}

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const recipe = useMemo(() => getRecipeById(id), [id]);
  const [babyAgeMonths, setBabyAgeMonths] = useState<number | null>(null);
  const [isCooked, setIsCooked] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [authSaveMessage, setAuthSaveMessage] = useState<string | null>(null);
  const { userId } = useUser();

  useEffect(() => {
    let active = true;
    if (!userId) {
      setBabyAgeMonths(readBabyAgeMonthsFromStorage());
      return;
    }
    void supabaseClient
      .from("babies")
      .select("birthdate")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        if (data?.birthdate) {
          setBabyAgeMonths(calendarMonthsFromBirthdateString(data.birthdate));
        } else {
          setBabyAgeMonths(readBabyAgeMonthsFromStorage());
        }
      });
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!recipe || !userId) return;

      const [fav, cooked] = await Promise.all([
        supabaseClient
          .from("favorite_recipes")
          .select("id")
          .eq("user_id", userId)
          .eq("recipe_id", recipe.id)
          .maybeSingle(),
        supabaseClient
          .from("cooked_recipes")
          .select("id")
          .eq("user_id", userId)
          .eq("recipe_id", recipe.id)
          .maybeSingle(),
      ]);

      if (!active) return;
      setIsFavorite(Boolean(fav.data));
      setIsCooked(Boolean(cooked.data));
    })();

    return () => {
      active = false;
    };
  }, [recipe?.id, userId]);

  const effectiveMonths = babyAgeMonths ?? 8;
  const nutAgeKey = nutritionAgeKeyFromMonths(effectiveMonths);
  const nutrition = recipe
    ? estimateRecipeNutrition(recipe.ingredients, nutAgeKey)
    : null;
  const serving = recipe
    ? getServingSuggestion(nutAgeKey, recipe.mealType)
    : { texture: "", howToServe: "", icon: "" };
  const needs = nutrition?.dailyNeeds;
  const kcalPercent =
    nutrition && needs
      ? Math.min(Math.round((nutrition.kcal / needs.kcal) * 100), 100)
      : 0;

  const textureBandNote =
    recipe && babyAgeMonths !== null
      ? recipe.textureNoteByAgeBand?.[ageMonthsToAgeBand(babyAgeMonths)]
      : undefined;

  return (
    <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center">
      <main
        className="w-full max-w-[393px] px-6 pb-[128px]"
        style={{ fontFamily: '"Nunito", sans-serif' }}
      >
        <header className="pt-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-[22px] text-[#3D2C3E] leading-none cursor-pointer bg-transparent border-0 p-0"
              aria-label="Înapoi"
            >
              ←
            </button>
            <h1 className="text-[18px] font-extrabold text-[#3D2C3E]">
              {recipe ? recipe.name : "Rețetă"}
            </h1>
          </div>
        </header>

        {!recipe ? (
          <div className="mt-10">
            <p className="text-[14px] text-[#8B7A8E]">Rețetă inexistentă</p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="text-[14px] font-semibold text-[#D4849A] cursor-pointer bg-transparent border-0 p-0"
              >
                Înapoi
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-3 text-[12px] font-semibold text-[#D4849A]">
              {MEAL_LABELS[recipe.mealType]}
            </p>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {([
                {
                  label: `⏱ ${recipe.time}`,
                  bg: "#E0F5F0",
                  color: "#0F6E56",
                },
                {
                  label: `⚖️ Preparat ~${inferTotalYieldGrams(recipe)} g (tot)`,
                  bg: "#EDE7F6",
                  color: "#534AB7",
                },
                {
                  label: `🍽 Rețetă: ${servingsBadgeText(recipe.servings)} porții (fișă)`,
                  bg: "#F3E5FF",
                  color: "#6B4E9E",
                },
                {
                  label: `👶 ${recipe.age}`,
                  bg: "#FDE8EE",
                  color: "#D4849A",
                },
                {
                  label: recipe.difficulty,
                  bg: "#FAEEDA",
                  color: "#854F0B",
                },
              ] as Pill[]).map((p) => (
                <PillView key={p.label} pill={p} />
              ))}
            </div>

            <div className="mt-5">
              <div
                className="rounded-[16px] p-4"
                style={{ backgroundColor: "#E8F4FD" }}
              >
                <p className="text-[14px] font-bold text-[#3D2C3E]">
                  Porție pentru bebeluș (orientativ)
                </p>
                {babyAgeMonths !== null ? (
                  <p className="mt-1 text-[12px] font-semibold text-[#534AB7]">
                    Vârstă profil: {babyAgeMonths} luni ·{" "}
                    {ageBandLabelRo(ageMonthsToAgeBand(babyAgeMonths))}
                  </p>
                ) : (
                  <p className="mt-1 text-[12px] text-[#8B7A8E]">
                    Adaugă profilul bebelușului pentru porții personalizate (afișăm
                    exemplu pentru ~8 luni).
                  </p>
                )}
                <p
                  className="mt-2 text-[14px] text-[#3D2C3E] leading-relaxed"
                  style={{ lineHeight: 1.6 }}
                >
                  <span className="font-semibold text-[#0F6E56]">
                    {formatRecipePortionLineRo(recipe, effectiveMonths)}
                  </span>
                </p>
                <p
                  className="mt-3 text-[13px] text-[#3D2C3E] leading-relaxed border-t border-[#D4849A]/20 pt-3"
                  style={{ lineHeight: 1.6 }}
                >
                  {getBabyPortion(recipe.age)}
                </p>
              </div>
              <p
                className="mt-2 text-[11px] italic text-[#8B7A8E] leading-relaxed"
                style={{ lineHeight: 1.5 }}
              >
                ⚠️ Acestea sunt orientări generale. Consultați medicul pediatru
                pentru recomandări personalizate.
              </p>
            </div>

            <section className="mt-5 space-y-4">
              <div className="bg-white border border-[#EDE7F6] rounded-[16px] p-4">
                <p className="text-[14px] font-bold text-[#3D2C3E]">
                  Ingrediente
                </p>
                <ul className="mt-3 space-y-2">
                  {recipe.ingredients.map((ing) => (
                    <li key={ing} className="flex items-start gap-2">
                      <span
                        className="mt-[6px] w-[6px] h-[6px] rounded-full flex-shrink-0"
                        style={{ backgroundColor: "#A8DCD1" }}
                      />
                      <span className="text-[13px] text-[#3D2C3E]">
                        {ing}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white border border-[#EDE7F6] rounded-[16px] p-4">
                <p className="text-[14px] font-bold text-[#3D2C3E]">
                  Pași de preparare
                </p>

                <div className="mt-3 overflow-hidden rounded-[12px]">
                  {recipe.steps.map((step, idx) => (
                    <div
                      key={`${idx}-${step.slice(0, 24)}`}
                      className={`flex gap-3 px-3 py-3 ${
                        idx === recipe.steps.length - 1
                          ? ""
                          : "border-b border-[#FDE8EE]"
                      }`}
                    >
                      <div
                        className="w-[24px] h-[24px] rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[12px]"
                        style={{ backgroundColor: "#FDE8EE", color: "#D4849A" }}
                      >
                        {idx + 1}
                      </div>
                      <p
                        className="text-[13px] text-[#3D2C3E]"
                        style={{ lineHeight: 1.5 }}
                      >
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-[#EDE7F6] rounded-[16px] p-4">
                <p className="text-[14px] font-bold text-[#3D2C3E]">
                  Alergeni
                </p>
                {recipe.allergens.length === 0 ? (
                  <p className="mt-2 text-[13px] text-[#8B7A8E]">
                    Niciun alergen listat în mod explicit — verifică totuși
                    ingredientele.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recipe.allergens.map((a) => (
                      <span
                        key={a}
                        className="px-3 py-1.5 rounded-[12px] text-[12px] font-semibold"
                        style={{ backgroundColor: "#FAEEDA", color: "#854F0B" }}
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-[#EDE7F6] rounded-[16px] p-4">
                <p className="text-[14px] font-bold text-[#3D2C3E]">
                  Păstrare
                </p>
                <p
                  className="mt-2 text-[14px] text-[#3D2C3E] leading-relaxed"
                  style={{ lineHeight: 1.7 }}
                >
                  {recipe.storage}
                </p>
              </div>
            </section>

            <div
              style={{
                background: "white",
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <span style={{ fontSize: 20 }}>{serving.icon}</span>
                <div>
                  <div
                    style={{ fontSize: 13, fontWeight: 700, color: "#3D2C3E" }}
                  >
                    Cum se servește
                  </div>
                  <div
                    style={{ fontSize: 11, color: "#D4849A", fontWeight: 600 }}
                  >
                    {serving.texture}
                    {textureBandNote ? ` — ${textureBandNote}` : ""}
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#5C4A5E",
                  lineHeight: 1.6,
                  background: "#FFF8F6",
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                {serving.howToServe}
              </div>
            </div>

            <div
              style={{
                background: "white",
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: "#3D2C3E" }}
                >
                  🔥 Valori nutriționale (porție bebeluș)
                </span>
                <span
                  style={{
                    fontSize: 10,
                    background: "#F5F0F8",
                    color: "#8B7A8E",
                    borderRadius: 20,
                    padding: "2px 8px",
                  }}
                >
                  estimat
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
                {[
                  { icon: "🔥", value: nutrition?.kcal ?? 0, unit: "kcal", label: "Energie" },
                  { icon: "💪", value: nutrition?.protein ?? 0, unit: "g", label: "Proteine" },
                  { icon: "🫙", value: nutrition?.fat ?? 0, unit: "g", label: "Grăsimi" },
                  { icon: "🌾", value: nutrition?.carbs ?? 0, unit: "g", label: "Glucide" },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      background: "#F5F0F8",
                      borderRadius: 12,
                      padding: "8px 12px",
                      textAlign: "center",
                      minWidth: 70,
                      flex: 1,
                    }}
                  >
                    <div style={{ fontSize: 16 }}>{item.icon}</div>
                    <div
                      style={{ fontSize: 14, fontWeight: 700, color: "#3D2C3E" }}
                    >
                      {item.value}
                      {item.unit}
                    </div>
                    <div style={{ fontSize: 11, color: "#8B7A8E" }}>
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 6 }}>
                <div
                  style={{ fontSize: 11, color: "#8B7A8E", marginBottom: 4 }}
                >
                  Acoperă ~{kcalPercent}% din necesarul zilnic al bebelușului
                </div>
                <div
                  style={{ background: "#EDE7F6", height: 6, borderRadius: 3 }}
                >
                  <div
                    style={{
                      background: "#D4849A",
                      height: 6,
                      borderRadius: 3,
                      width: `${kcalPercent}%`,
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#B0A0B8",
                  fontStyle: "italic",
                  marginTop: 8,
                }}
              >
                * Valori estimate. Necesar zilnic total: {needs?.kcal ?? 0} kcal
                + ~{needs?.milkMl ?? 0}ml lapte.
              </div>
            </div>

            <section className="mt-6 flex gap-[10px]">
              <button
                type="button"
                className={`flex-1 h-12 rounded-full font-bold cursor-pointer text-white ${
                  isCooked ? "bg-[#0F6E56]" : "bg-[#D4849A]"
                }`}
                onClick={async () => {
                  setAuthSaveMessage(null);
                  if (!recipe) return;
                  if (!userId) {
                    setAuthSaveMessage("Autentifică-te pentru a salva");
                    return;
                  }

                  const journalMealType =
                    JOURNAL_MEAL_TYPE_MAP[recipe.mealType] ?? "pranz";

                  const { error: cookedErr } = await supabaseClient
                    .from("cooked_recipes")
                    .upsert(
                      {
                        user_id: userId,
                        recipe_id: recipe.id,
                        cooked_at: new Date().toISOString(),
                      },
                      { onConflict: "user_id,recipe_id" }
                    );
                  if (cookedErr) {
                    alert("Eroare: " + cookedErr.message);
                    return;
                  }

                  const { error: journalErr } = await supabaseClient
                    .from("food_journal")
                    .insert({
                      user_id: userId,
                      food_name: recipe.name,
                      meal_type: journalMealType,
                      reaction: "pozitiv",
                      notes: "Rețetă gătită: " + recipe.name,
                      logged_at: new Date().toISOString(),
                    });
                  if (journalErr) {
                    alert("Eroare jurnal: " + journalErr.message);
                  }

                  setIsCooked(true);
                }}
              >
                {isCooked ? "✓ Gătit!" : "Am gătit!"}
              </button>
              <button
                type="button"
                className="w-[48px] h-[48px] rounded-full bg-[#FDE8EE] flex items-center justify-center cursor-pointer"
                aria-label="Reacție"
                onClick={async () => {
                  setAuthSaveMessage(null);
                  if (!recipe) return;
                  if (!userId) {
                    setAuthSaveMessage("Autentifică-te pentru a salva");
                    return;
                  }

                  if (isFavorite) {
                    await supabaseClient
                      .from("favorite_recipes")
                      .delete()
                      .eq("user_id", userId)
                      .eq("recipe_id", recipe.id);
                    setIsFavorite(false);
                  } else {
                    await supabaseClient.from("favorite_recipes").insert({
                      user_id: userId,
                      recipe_id: recipe.id,
                      saved_at: new Date().toISOString(),
                    });
                    setIsFavorite(true);
                  }
                }}
              >
                <span style={{ fontSize: 20 }}>
                  {isFavorite ? "❤️" : "🤍"}
                </span>
              </button>
            </section>
            {authSaveMessage ? (
              <p
                className="mt-2 text-[13px] font-bold text-[#D4849A]"
                style={{ lineHeight: 1.4 }}
              >
                {authSaveMessage}
              </p>
            ) : null}
          </>
        )}
      </main>

      <Navbar activeTab="retete" />
    </div>
  );
}
