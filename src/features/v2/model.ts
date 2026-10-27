export type Stage = 0 | 6 | 8 | 10 | 12;
export type PlanEntry = { slot: string; recipeId: string };
export type MealUse = {
  id: string;
  recipeId: string;
  day: string;
  confirmedAt: string;
  source?: "legacy" | "local_import" | "v2_confirmed";
};
export type LocalEvent = {
  id: string;
  name: EventName;
  at: string;
  properties: Record<string, string | number | boolean>;
};
export type EventName =
  | "onboarding_started"
  | "onboarding_completed"
  | "session_started"
  | "recommendation_results_shown"
  | "first_relevant_choice"
  | "recipe_saved"
  | "plan_slot_saved"
  | "meal_confirmed"
  | "meal_reused"
  | "premium_interest"
  | "meal_suggestion_viewed"
  | "meal_selected"
  | "meal_added_to_plan"
  | "meal_used_confirmed"
  | "return_session";
export type AppState = {
  version: 1;
  onboarded: boolean;
  stage: Stage;
  introduced: string[];
  favorites: string[];
  plan: PlanEntry[];
  uses: MealUse[];
  events: LocalEvent[];
  shoppingChecked: string[];
  pantry: string[];
};
export const emptyState: AppState = {
  version: 1,
  onboarded: false,
  stage: 8,
  introduced: [],
  favorites: [],
  plan: [],
  uses: [],
  events: [],
  shoppingChecked: [],
  pantry: [],
};
export type Action =
  | { type: "onboard"; stage: Stage; introduced: string[] }
  | { type: "favorite"; recipeId: string }
  | { type: "plan"; slot: string; recipeId: string }
  | { type: "remove-plan"; slot: string }
  | { type: "confirm"; use: MealUse }
  | { type: "remove-use"; id: string }
  | { type: "event"; event: LocalEvent }
  | { type: "shopping"; key: string }
  | { type: "pantry"; ids: string[] }
  | { type: "reset" };
function toggle(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((v) => v !== value)
    : [...values, value];
}
export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "onboard":
      return {
        ...state,
        onboarded: true,
        stage: action.stage,
        introduced: action.introduced,
      };
    case "favorite":
      return { ...state, favorites: toggle(state.favorites, action.recipeId) };
    case "plan":
      return {
        ...state,
        plan: [
          ...state.plan.filter((p) => p.slot !== action.slot),
          { slot: action.slot, recipeId: action.recipeId },
        ],
      };
    case "remove-plan":
      return {
        ...state,
        plan: state.plan.filter((p) => p.slot !== action.slot),
      };
    case "confirm":
      return state.uses.some(
        (u) =>
          u.id === action.use.id ||
          (u.recipeId === action.use.recipeId && u.day === action.use.day),
      )
        ? state
        : { ...state, uses: [...state.uses, action.use] };
    case "remove-use":
      return { ...state, uses: state.uses.filter((u) => u.id !== action.id) };
    case "event":
      return state.events.some((e) => e.id === action.event.id)
        ? state
        : { ...state, events: [...state.events, action.event].slice(-250) };
    case "shopping":
      return {
        ...state,
        shoppingChecked: toggle(state.shoppingChecked, action.key),
      };
    case "pantry":
      return { ...state, pantry: action.ids };
    case "reset":
      return { ...emptyState };
  }
}
/** Import only the current demo schema; never read the legacy account store. */
export function readState(
  raw: string | null,
  allowedRecipes: Set<string>,
  allowedIngredients: Set<string>,
  allowedShopping = new Set<string>(),
): AppState {
  if (!raw) return { ...emptyState };
  try {
    const data: unknown = JSON.parse(raw);
    if (
      !data ||
      typeof data !== "object" ||
      !("version" in data) ||
      data.version !== 1
    )
      return { ...emptyState };
    const value = data as Record<string, unknown>;
    const strings = (v: unknown, allowed: Set<string>) =>
      Array.isArray(v)
        ? [
            ...new Set(
              v.filter(
                (x): x is string => typeof x === "string" && allowed.has(x),
              ),
            ),
          ].slice(0, 100)
        : [];
    const plan = Array.isArray(value.plan)
      ? value.plan
          .filter((x): x is PlanEntry =>
            Boolean(
              x &&
                typeof x === "object" &&
                typeof x.slot === "string" &&
                /^\d{4}-\d{2}-\d{2}$/.test(x.slot) &&
                allowedRecipes.has(x.recipeId),
            ),
          )
          .slice(0, 31)
          .map(({ slot, recipeId }) => ({ slot, recipeId }))
      : [];
    const uses = Array.isArray(value.uses)
      ? value.uses
          .filter((x): x is MealUse =>
            Boolean(
              x &&
                typeof x === "object" &&
                typeof x.id === "string" &&
                x.id.length < 120 &&
                /^\d{4}-\d{2}-\d{2}$/.test(x.day) &&
                typeof x.confirmedAt === "string" &&
                Number.isFinite(Date.parse(x.confirmedAt)) &&
                allowedRecipes.has(x.recipeId),
            ),
          )
          .slice(-100)
          .map(({ id, recipeId, day, confirmedAt, source }) => ({ id, recipeId, day, confirmedAt, ...(["legacy", "local_import", "v2_confirmed"].includes(source ?? "") ? { source } : {}) }))
      : [];
    return {
      ...emptyState,
      onboarded: value.onboarded === true,
      stage: [0, 6, 8, 10, 12].includes(Number(value.stage))
        ? (Number(value.stage) as Stage)
        : 8,
      favorites: strings(value.favorites, allowedRecipes),
      introduced: strings(value.introduced, allowedIngredients),
      pantry: strings(value.pantry, allowedIngredients),
      shoppingChecked: strings(value.shoppingChecked, allowedShopping),
      plan,
      uses,
    };
  } catch {
    return { ...emptyState };
  }
}
