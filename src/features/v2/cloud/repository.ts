import type { SupabaseClient } from "@supabase/supabase-js";
import { catalog, ingredients } from "../catalog";
import {
  readState,
  type Action,
  type AppState,
  type LocalEvent,
} from "../model";
import { shoppingKeyUniverse } from "../planning";
import { readJourney, newJourney, type Journey } from "../growth/journey";

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
    const shopping = shoppingKeyUniverse(catalog);
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
  async load(babyId: string | null = null): Promise<CloudState> {
    const { data, error } = await this.client
      .rpc("v2_load_state", { p_baby_id: babyId })
      .abortSignal(AbortSignal.timeout(12000));
    if (error) throw error;
    return parse(data);
  }
  async apply(
    babyId: string | null,
    action: Action,
    before: AppState,
  ): Promise<CloudState> {
    if (action.type === "plan-many") {
      // The server keeps one plan row per child and day; writes are idempotent, so a retry is safe.
      let state: CloudState | null = null;
      for (const entry of action.entries)
        state = await this.call(babyId, "plan", { slot: entry.slot, recipeId: entry.recipeId });
      return state ?? this.load(babyId);
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
        payload = { slot: action.slot, recipeId: action.recipeId };
        break;
      case "remove-plan":
        name = "remove-plan";
        payload = { slot: action.slot };
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
