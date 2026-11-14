import type { SupabaseClient } from "@supabase/supabase-js";
import { catalog, ingredients, shoppingKeys as knownShoppingKeys } from "../catalog";
import {
  readState,
  type Action,
  type AppState,
  type LocalEvent,
} from "../model";
import { readJourney, newJourney, type Journey } from "../growth/journey";
import type { AllergyRecord } from "../allergy";

export type TriedFood = { foodId: string; foodName: string; babyId: string | null };

export type CloudState = {
  journey: Journey | null;
  state: AppState;
  selectedBabyId: string | null;
  children: { id: string; label: string }[];
  requiresClinicalGuidance: boolean;
};
const recipeIds = new Set(catalog.map((r) => r.id));
const ingredientIds = new Set<string>(ingredients.map((i) => i.id));
// Built on the first cloud response, not at page load: visitors without an account never need them.
let keys: { shopping: ReadonlySet<string>; pantry: Set<string> } | null = null;
function knownKeys() {
  if (!keys) {
    const shopping = knownShoppingKeys;
    // Pantry stores legacy ingredient ids and shopping keys marked "am acasă".
    keys = { shopping, pantry: new Set<string>([...ingredientIds, ...shopping]) };
  }
  return keys;
}
function parse(value: unknown): CloudState {
  if (!value || typeof value !== "object")
    throw new Error("Invalid state response");
  const data = value as Record<string, unknown>;
  const { shopping: shoppingKeys, pantry: pantryKeys } = knownKeys();
  const state = readState(
    JSON.stringify(data),
    recipeIds,
    ingredientIds,
    shoppingKeys,
    pantryKeys,
  );
  return {
    state,
    journey: data.journey ? readJourney(JSON.stringify(data.journey), newJourney("00000000-0000-4000-8000-000000000000",1)) : null,
    selectedBabyId:
      typeof data.selectedBabyId === "string" ? data.selectedBabyId : null,
    children: Array.isArray(data.children)
      ? data.children.filter((child): child is { id: string; label: string } =>
          Boolean(
            child &&
              typeof child.id === "string" &&
              typeof child.label === "string",
          ),
        )
      : [],
    requiresClinicalGuidance: data.requiresClinicalGuidance === true,
  };
}
export class V2Repository {
  constructor(readonly client: SupabaseClient) {}
  /** Allergies and tried foods as V1 records them; row-level security returns this family's rows only. */
  async loadFamilyRecords(): Promise<{ allergies: AllergyRecord[]; history: TriedFood[] }> {
    const [allergies, tried] = await Promise.all([
      this.client.from("allergy_records").select("id,baby_id,food_id,food_name").abortSignal(AbortSignal.timeout(12000)),
      this.client.from("tried_foods").select("food_id,food_name,baby_id").abortSignal(AbortSignal.timeout(12000)),
    ]);
    if (allergies.error) throw allergies.error;
    if (tried.error) throw tried.error;
    const seen = new Set<string>();
    return {
      allergies: (allergies.data ?? []).map((r) => ({ id: String(r.id), babyId: r.baby_id ?? null, foodId: r.food_id ?? null, foodName: String(r.food_name ?? "") })),
      history: (tried.data ?? [])
        .filter((r) => { const key = `${r.baby_id ?? ""}:${r.food_id}`; if (seen.has(key)) return false; seen.add(key); return true; })
        .map((r) => ({ foodId: String(r.food_id), foodName: String(r.food_name ?? r.food_id), babyId: r.baby_id ?? null })),
    };
  }
  /** Explicit choice of the parent: an allergy recorded for the whole account now belongs to one child. Nothing is deleted. */
  async assignAllergy(id: string, babyId: string) {
    const { data, error } = await this.client.from("allergy_records").update({ baby_id: babyId }).eq("id", id).is("baby_id", null).select("id");
    if (error) throw error;
    if (!data?.length) throw new Error("allergy not updated");
  }
  async load(babyId: string | null = null): Promise<CloudState> {
    const { data, error } = await this.client
      .rpc("v2_load_state", { p_baby_id: babyId })
      .abortSignal(AbortSignal.timeout(12000));
    if (error) throw error;
    return parse(data);
  }
  /** The server stores the whole list, so sending the latest one covers every tick made since the last save. */
  saveShopping(babyId: string | null, pantry: string[], shoppingChecked: string[]): Promise<CloudState> {
    return this.call(babyId, "preferences", { pantry, shoppingChecked });
  }
  async apply(
    babyId: string | null,
    action: Action,
    before: AppState,
  ): Promise<CloudState> {
    if (action.type === "plan-many") {
      // One transaction on the server: the whole plan is saved, or nothing (a retry is then safe).
      if (!action.entries.length) return this.load(babyId);
      return this.call(babyId, "plan-many", {
        entries: action.entries.map(({ slot, meal, recipeId }) => ({ slot, meal, recipeId })),
      });
    }
    let name: string;
    let payload: Record<string, unknown>;
    switch (action.type) {
      case "onboard":
        name = "profile";
        payload = { stage: action.stage, introduced: action.introduced };
        break;
      case "favorite":
        name = "favorite";
        payload = {
          recipeId: action.recipeId,
          enabled: !before.favorites.includes(action.recipeId),
        };
        break;
      case "plan":
        name = "plan";
        payload = { slot: action.slot, meal: action.meal, recipeId: action.recipeId };
        break;
      case "remove-plan":
        name = "remove-plan";
        payload = { slot: action.slot, meal: action.meal };
        break;
      case "planner-settings":
        name = "planner-settings";
        payload = { meals: action.settings.meals, days: action.settings.days };
        break;
      case "confirm":
        name = "confirm";
        payload = { id: crypto.randomUUID(), recipeId: action.use.recipeId };
        break;
      case "remove-use":
        name = "remove-use";
        payload = { id: action.id };
        break;
      case "shopping":
        name = "preferences";
        payload = {
          pantry: before.pantry,
          shoppingChecked: before.shoppingChecked.includes(action.key)
            ? before.shoppingChecked.filter((k) => k !== action.key)
            : [...before.shoppingChecked, action.key],
        };
        break;
      case "pantry":
        name = "preferences";
        payload = {
          pantry: action.ids,
          shoppingChecked: before.shoppingChecked,
        };
        break;
      default:
        throw new Error("This action is local only");
    }
    return this.call(babyId, name, payload);
  }
  async call(
    babyId: string | null,
    action: string,
    payload: Record<string, unknown>,
  ) {
    const { data, error } = await this.client
      .rpc("v2_apply_action", {
        p_baby_id: babyId,
        p_action: action,
        p_payload: payload,
      })
      .abortSignal(AbortSignal.timeout(12000));
    if (error) throw error;
    return parse(data);
  }
  async saveJourney(babyId: string, journey: Journey) {
    const {data,error}=await this.client.rpc("v2_save_journey",{p_baby_id:babyId,p_preferences:journey}).abortSignal(AbortSignal.timeout(12000));
    if(error)throw error;return parse(data);
  }
  async editChild(babyId: string,label: string,stage: number) {
    const {data,error}=await this.client.rpc("v2_edit_child",{p_baby_id:babyId,p_label:label,p_stage:stage}).abortSignal(AbortSignal.timeout(12000));
    if(error)throw error;return parse(data);
  }
  async record(event: LocalEvent) {
    const { error } = await this.client
      .rpc("v2_record_event", {
        p_event_id: event.id,
        p_name: event.name,
        p_properties: event.properties,
      })
      .abortSignal(AbortSignal.timeout(5000));
    if (error) throw error;
  }
}
