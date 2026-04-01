"use client";

import { createClient } from "@/lib/supabase/client";
import { FOODS_DATABASE } from "./foodsDatabase";

const supabase = createClient();

export type DbBaby = {
  id: string;
  user_id: string;
  name: string;
  birthdate: string;
  gender: "boy" | "girl" | null;
  weight_kg: number | null;
  avatar_url?: string | null;
};

let cachedUserId: string | null = null;
let cachedBaby: DbBaby | null = null;

export function clearSupabaseDataCache(): void {
  cachedUserId = null;
  cachedBaby = null;
}

function toIsoDate(input: string): string {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export async function getCurrentUserId(): Promise<string | null> {
  if (cachedUserId) return cachedUserId;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return null;
  cachedUserId = user.id;
  return cachedUserId;
}

export async function getCurrentBaby(): Promise<DbBaby | null> {
  if (cachedBaby) return cachedBaby;
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from("babies")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  cachedBaby = data as DbBaby;
  return cachedBaby;
}

export async function upsertCurrentBaby(input: {
  name: string;
  birthdate: string;
  gender: "boy" | "girl" | null;
  weightKg?: number | null;
}): Promise<DbBaby | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const existing = await getCurrentBaby();

  const payload = {
    user_id: userId,
    name: input.name.trim(),
    birthdate: toIsoDate(input.birthdate),
    gender: input.gender,
    weight_kg: input.weightKg ?? null,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from("babies")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .maybeSingle();
    if (error || !data) return null;
    cachedBaby = data as DbBaby;
    return cachedBaby;
  }

  const { data, error } = await supabase
    .from("babies")
    .insert(payload)
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  cachedBaby = data as DbBaby;
  return cachedBaby;
}

export async function uploadBabyAvatar(
  babyId: string,
  file: File,
  userId: string
): Promise<string | null> {
  try {
    if (!babyId || !file || !userId) return null;
    const path = `${userId}/${babyId}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
    if (uploadError) return null;

    const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    if (!publicUrl) return null;

    const { data: updated, error: updateError } = await supabase
      .from("babies")
      .update({ avatar_url: publicUrl })
      .eq("id", babyId)
      .select("*")
      .maybeSingle();
    if (updateError) return null;

    if (updated) cachedBaby = updated as DbBaby;
    return publicUrl;
  } catch {
    return null;
  }
}

export async function addFoodJournalEntry(input: {
  foodId: string;
  foodName: string;
  mealType: string;
  reaction: string | null;
  notes: string;
  loggedAt: string;
  quantityGrams?: number | null;
}): Promise<boolean> {
  const userId = await getCurrentUserId();
  const baby = await getCurrentBaby();
  if (!userId || !baby?.id) return false;

  const { error } = await supabase.from("food_journal").insert({
    user_id: userId,
    baby_id: baby.id,
    food_id: input.foodId,
    food_name: input.foodName,
    meal_type: input.mealType,
    reaction: input.reaction,
    notes: input.notes,
    logged_at: input.loggedAt,
    quantity_grams: input.quantityGrams ?? null,
  });
  return !error;
}

export async function listFoodJournal(limit?: number): Promise<
  Array<{
    id: string;
    food_id: string;
    food_name: string;
    meal_type: string | null;
    reaction: string | null;
    notes: string | null;
    logged_at: string;
    quantity_grams?: number | null;
  }>
> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  let query = supabase
    .from("food_journal")
    .select("*")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false });
  if (typeof limit === "number") query = query.limit(limit);
  const { data, error } = await query;
  if (error || !data) return [];
  return data as Array<{
    id: string;
    food_id: string;
    food_name: string;
    meal_type: string | null;
    reaction: string | null;
    notes: string | null;
    logged_at: string;
    quantity_grams?: number | null;
  }>;
}

export async function upsertTriedFood(input: {
  foodId: string;
  foodName: string;
}): Promise<void> {
  const userId = await getCurrentUserId();
  const baby = await getCurrentBaby();
  if (!userId || !baby?.id) return;

  const { data: existing } = await supabase
    .from("tried_foods")
    .select("id,try_count,first_tried_at")
    .eq("user_id", userId)
    .eq("food_id", input.foodId)
    .maybeSingle();

  if (!existing?.id) {
    await supabase.from("tried_foods").upsert(
      {
        user_id: userId,
        baby_id: baby.id,
        food_id: input.foodId,
        food_name: input.foodName,
        first_tried_at: new Date().toISOString(),
        try_count: 1,
      },
      { onConflict: "user_id,food_id" }
    );
    return;
  }

  await supabase
    .from("tried_foods")
    .update({
      try_count: Number(existing.try_count ?? 0) + 1,
      first_tried_at: existing.first_tried_at ?? new Date().toISOString(),
    })
    .eq("id", existing.id);
}

export async function listTriedFoods(): Promise<
  Array<{ food_id: string; food_name: string; first_tried_at: string; try_count: number }>
> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("tried_foods")
    .select("*")
    .eq("user_id", userId)
    .order("first_tried_at", { ascending: false });
  if (error || !data) return [];
  return data as Array<{
    food_id: string;
    food_name: string;
    first_tried_at: string;
    try_count: number;
  }>;
}

export async function addAllergyRecord(input: {
  foodId: string;
  foodName: string;
  severity: "sever" | "usor";
  notes: string;
}): Promise<void> {
  const userId = await getCurrentUserId();
  const baby = await getCurrentBaby();
  if (!userId || !baby?.id) return;
  await supabase.from("allergy_records").insert({
    user_id: userId,
    baby_id: baby.id,
    food_id: input.foodId,
    food_name: input.foodName,
    severity: input.severity,
    notes: input.notes,
    recorded_at: new Date().toISOString(),
  });
}

export async function listAllergyRecords(): Promise<
  Array<{
    id: string;
    food_id: string;
    food_name: string;
    severity: "sever" | "usor";
    notes: string | null;
    recorded_at: string;
  }>
> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("allergy_records")
    .select("*")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: false });
  if (error || !data) return [];
  return data as Array<{
    id: string;
    food_id: string;
    food_name: string;
    severity: "sever" | "usor";
    notes: string | null;
    recorded_at: string;
  }>;
}

export async function deleteAllergyRecord(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  await supabase
    .from("allergy_records")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
}

export async function markRecipeCooked(
  recipeId: string,
  relatedFoods?: string[]
): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  const { error } = await supabase.from("cooked_recipes").upsert(
    {
      user_id: userId,
      recipe_id: recipeId,
      cooked_at: new Date().toISOString(),
    },
    { onConflict: "user_id,recipe_id", ignoreDuplicates: false }
  );
  if (error && !error.message.includes("duplicate") && !error.message.includes("unique")) {
    return false;
  }

  if (relatedFoods && relatedFoods.length > 0) {
    for (const foodId of relatedFoods) {
      const foodData = FOODS_DATABASE.find((f) => f.id === foodId);
      await upsertTriedFood({
        foodId,
        foodName: foodData?.name || foodId,
      });
    }
  }

  return true;
}

export async function isRecipeFavorited(recipeId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  const { data, error } = await supabase
    .from("favorite_recipes")
    .select("id")
    .eq("user_id", userId)
    .eq("recipe_id", recipeId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data?.id);
}

export async function toggleRecipeFavorite(recipeId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  const fav = await isRecipeFavorited(recipeId);
  if (fav) {
    await supabase
      .from("favorite_recipes")
      .delete()
      .eq("user_id", userId)
      .eq("recipe_id", recipeId);
    return false;
  }
  await supabase.from("favorite_recipes").insert({
    user_id: userId,
    recipe_id: recipeId,
    saved_at: new Date().toISOString(),
  });
  return true;
}

