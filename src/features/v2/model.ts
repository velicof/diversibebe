export type Stage = 0 | 6 | 8 | 10 | 12;
/** A meal of the day. "oricare": a plan saved before meals had types (one meal that day, any kind). */
export type MealSlot = "mic-dejun" | "pranz" | "cina" | "gustare" | "oricare";
export const MEAL_ORDER: MealSlot[] = ["mic-dejun", "pranz", "cina", "gustare", "oricare"];
export const PLANNABLE_MEALS = ["mic-dejun", "pranz", "cina", "gustare"] as const;
export type PlannableMeal = (typeof PLANNABLE_MEALS)[number];
export const PLAN_DAYS = [1, 3, 5, 7] as const;
export type PlanDays = (typeof PLAN_DAYS)[number];
export type PlanEntry = { slot: string; meal: MealSlot; recipeId: string };
/** The parent's planner choices for one child. */
export type PlannerSettings = { meals: PlannableMeal[]; days: PlanDays };
// A meal left out (an older caller) is the untyped "oricare", exactly as the server reads it.
export const planKey = (e: { slot: string; meal?: MealSlot }) => `${e.slot}|${e.meal ?? "oricare"}`;
export const byDayAndMeal = (a: PlanEntry, b: PlanEntry) =>
  a.slot.localeCompare(b.slot) || MEAL_ORDER.indexOf(a.meal) - MEAL_ORDER.indexOf(b.meal);
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
  | "return_session"
  | "recipe_viewed"
  | "shopping_list_generated"
  | "shopping_item_checked"
  | "plan_generated"
  | "plan_saved"
  | "plan_meal_replaced";
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
  /** Null until the parent chooses; the planner then starts from values that suit the stage. */
  planner: PlannerSettings | null;
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
  planner: null,
};
export type Action =
  | { type: "onboard"; stage: Stage; introduced: string[] }
  | { type: "favorite"; recipeId: string }
  | { type: "plan"; slot: string; meal: MealSlot; recipeId: string }
  /** Saved together or not at all. */
  | { type: "plan-many"; entries: PlanEntry[] }
  | { type: "remove-plan"; slot: string; meal: MealSlot }
  | { type: "planner-settings"; settings: PlannerSettings }
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
    case "plan": {
      const key = planKey(action);
      return {
        ...state,
        plan: [
          ...state.plan.filter((p) => planKey(p) !== key),
          { slot: action.slot, meal: action.meal ?? "oricare", recipeId: action.recipeId },
        ].sort(byDayAndMeal),
      };
    }
    case "plan-many": {
      const keys = new Set(action.entries.map(planKey));
      return {
        ...state,
        plan: [
          ...state.plan.filter((p) => !keys.has(planKey(p))),
          ...action.entries.map(({ slot, meal, recipeId }) => ({ slot, meal: meal ?? "oricare", recipeId })),
        ].sort(byDayAndMeal),
      };
    }
    case "remove-plan": {
      const key = planKey(action);
      return { ...state, plan: state.plan.filter((p) => planKey(p) !== key) };
    }
    case "planner-settings":
      return { ...state, planner: action.settings };
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
function readPlanner(value: unknown): PlannerSettings | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const meals = Array.isArray(v.meals) ? v.meals.filter((m): m is PlannableMeal => (PLANNABLE_MEALS as readonly string[]).includes(m)) : [];
  const days = Number(v.days);
  return meals.length && (PLAN_DAYS as readonly number[]).includes(days)
    ? { meals: PLANNABLE_MEALS.filter((m) => meals.includes(m)), days: days as PlanDays }
    : null;
}
/** Import only the current demo schema; never read the legacy account store. */
export function readState(
  raw: string | null,
  allowedRecipes: ReadonlySet<string>,
  allowedIngredients: ReadonlySet<string>,
  allowedShopping: ReadonlySet<string> = new Set<string>(),
  allowedPantry: ReadonlySet<string> = allowedIngredients,
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
    const strings = (v: unknown, allowed: ReadonlySet<string>) =>
      Array.isArray(v)
        ? [
            ...new Set(
              v.filter(
                (x): x is string => typeof x === "string" && allowed.has(x),
              ),
            ),
          ].slice(0, 100)
        : [];
    // Plans saved before meals had types ({slot, recipeId}) are kept as "oricare": nothing is dropped.
    // On a repeated day and meal the later entry wins, as when it was saved.
    const planned = new Map<string, PlanEntry>();
    if (Array.isArray(value.plan))
      for (const x of value.plan as Record<string, unknown>[]) {
        if (!x || typeof x !== "object" || typeof x.slot !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(x.slot)) continue;
        if (typeof x.recipeId !== "string" || !allowedRecipes.has(x.recipeId)) continue;
        const meal = (MEAL_ORDER as string[]).includes(String(x.meal)) ? (x.meal as MealSlot) : "oricare";
        const entry = { slot: x.slot, meal, recipeId: x.recipeId };
        planned.delete(planKey(entry));
        planned.set(planKey(entry), entry);
      }
    const plan = [...planned.values()].slice(-140).sort(byDayAndMeal);
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
      pantry: strings(value.pantry, allowedPantry),
      shoppingChecked: strings(value.shoppingChecked, allowedShopping),
      plan,
      uses,
      planner: readPlanner(value.planner),
    };
  } catch {
    return { ...emptyState };
  }
}
