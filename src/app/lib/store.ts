import { FOODS_DATABASE, type Food } from "./foodsDatabase";
import { RECIPES, type RecipeCatalogItem } from "./recipesDatabase";

export type { MealType, RecipeCatalogItem } from "./recipesDatabase";

export interface BabyProfile {
  name: string;
  birthDate: string;
  weight: string;
  gender: "boy" | "girl" | null;
  allergies: string[];
  diversificationStartDate: string | null;
}

export interface UserAccount {
  email: string;
  password: string; // For demo purposes only
  parentName: string;
  baby: BabyProfile;
  isPremium: boolean;
  isVerified?: boolean;
  verificationToken?: string | null;
  createdAt: string;
}

export interface FoodEntry {
  id: string;
  type: "food" | "recipe";
  foodId: string;
  foodName: string;
  emoji: string;
  recipeId?: string;
  recipeName?: string;
  date: string; // ISO date YYYY-MM-DD
  time: string; // HH:MM
  reaction: "loved" | "ok" | "disliked" | "refused" | null;
  portion: "putin" | "jumatate" | "tot" | null;
  symptoms: string[];
  notes: string;
  babyMood: "fericit" | "obosit" | "agitat" | null;
}

/** @deprecated Legacy global allergies key; migrated into per-user storage. */
export const ALLERGY_STORAGE_KEY = "diversibebe_allergies";

export function getUserKey(email: string): string {
  return `diversibebe_${email.replace(/[^a-z0-9]/gi, "_")}`;
}

type UserPersistedSlice = {
  foodEntries?: unknown[];
  allergies?: unknown[];
};

export interface Notification {
  id: string;
  title: string;
  body: string;
  icon: string;
  iconBg: string;
  time: string;
  read: boolean;
  type:
    | "welcome"
    | "food_suggestion"
    | "streak"
    | "reaction_followup"
    | "recipe"
    | "milestone";
}

export interface AppState {
  currentUser: UserAccount | null;
  isLoggedIn: boolean;
  foodEntries: FoodEntry[];
  streak: number;
  notifications: Notification[];
}

export type FoodCatalogItem = Food;

export type FoodStatus =
  | "De încercat"
  | "Încercat"
  | "Adorat!"
  | "Nu a plăcut"
  | "A refuzat";

export const STORE_UPDATED_EVENT = "diversibebe_store_updated";

let applyingRemoteSync = false;
let cloudSyncTimer: ReturnType<typeof setTimeout> | null = null;

type PersistedData = { appState: AppState; accounts: UserAccount[] };

const STORAGE_KEY = "diversibebe_data";

const defaultData: PersistedData = {
  appState: {
    currentUser: null,
    isLoggedIn: false,
    foodEntries: [],
    streak: 0,
    notifications: [],
  },
  accounts: [],
};

const FOOD_CATALOG: FoodCatalogItem[] = FOODS_DATABASE;

const RO_MONTHS: Record<string, number> = {
  ianuarie: 0,
  februarie: 1,
  martie: 2,
  aprilie: 3,
  mai: 4,
  iunie: 5,
  iulie: 6,
  august: 7,
  septembrie: 8,
  octombrie: 9,
  noiembrie: 10,
  decembrie: 11,
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function parseDate(input: string): Date | null {
  if (!input) return null;
  const direct = new Date(input);
  if (!Number.isNaN(direct.getTime())) return direct;
  const dot = input.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dot) return new Date(Number(dot[3]), Number(dot[2]) - 1, Number(dot[1]));
  const ro = input.toLowerCase().match(/^(\d{1,2})\s+([a-zăâîșț]+)\s+(\d{4})$/);
  if (ro) {
    const m = RO_MONTHS[ro[2]];
    if (m !== undefined) return new Date(Number(ro[3]), m, Number(ro[1]));
  }
  return null;
}

export function calculateBabyAge(birthDate: string): { months: number; display: string } {
  const parsed = parseDate(birthDate);
  if (!parsed || Number.isNaN(parsed.getTime())) return { months: 0, display: "0 luni" };
  const now = new Date();
  let months =
    (now.getFullYear() - parsed.getFullYear()) * 12 + (now.getMonth() - parsed.getMonth());
  if (now.getDate() < parsed.getDate()) months -= 1;
  const safe = Math.max(0, months);
  return { months: safe, display: `${safe} luni` };
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function migrateFoodEntry(raw: Record<string, unknown>): FoodEntry | null {
  const foodId = typeof raw.foodId === "string" ? raw.foodId : "";
  const foodName = typeof raw.foodName === "string" ? raw.foodName : "";
  if (!foodId || !foodName) return null;

  let dateStr = typeof raw.date === "string" ? raw.date : new Date().toISOString();
  let timeStr = typeof raw.time === "string" ? raw.time : "12:00";
  if (dateStr.includes("T") || dateStr.length > 12) {
    const d = new Date(dateStr);
    if (!Number.isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      dateStr = `${y}-${m}-${day}`;
      timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
  } else if (dateStr.length >= 10) {
    dateStr = dateStr.slice(0, 10);
  }

  const r = raw.reaction;
  let reaction: FoodEntry["reaction"] = null;
  if (r === "loved" || r === "ok" || r === "disliked" || r === "refused") {
    reaction = r;
  } else if (r != null && String(r).length > 0) {
    reaction = "ok";
  }

  const symptoms = Array.isArray(raw.symptoms)
    ? raw.symptoms.filter((s): s is string => typeof s === "string")
    : [];

  const type: FoodEntry["type"] = raw.type === "recipe" ? "recipe" : "food";
  const hadId =
    typeof raw.id === "string" && raw.id.length > 0 ? raw.id : "";
  const id = hadId || `${Date.now().toString()}-${Math.random().toString(36).slice(2, 9)}`;

  return {
    id,
    type,
    foodId,
    foodName,
    emoji: typeof raw.emoji === "string" ? raw.emoji : "🍽️",
    recipeId: typeof raw.recipeId === "string" ? raw.recipeId : undefined,
    recipeName: typeof raw.recipeName === "string" ? raw.recipeName : undefined,
    date: dateStr,
    time: timeStr,
    reaction,
    portion:
      raw.portion === "putin" || raw.portion === "jumatate" || raw.portion === "tot"
        ? raw.portion
        : null,
    symptoms,
    notes: typeof raw.notes === "string" ? raw.notes : "",
    babyMood:
      raw.babyMood === "fericit" ||
      raw.babyMood === "obosit" ||
      raw.babyMood === "agitat"
        ? raw.babyMood
        : null,
  };
}

function sortFoodEntries(entries: FoodEntry[]): FoodEntry[] {
  return [...entries].sort((a, b) => {
    const c = b.date.localeCompare(a.date);
    if (c !== 0) return c;
    return (b.time || "").localeCompare(a.time || "");
  });
}

function mergeFoodEntriesById(local: FoodEntry[], remote: FoodEntry[]): FoodEntry[] {
  const map = new Map<string, FoodEntry>();
  for (const e of local) map.set(e.id, e);
  for (const e of remote) map.set(e.id, e);
  return sortFoodEntries([...map.values()]);
}

function readUserPersistedSlice(email: string): UserPersistedSlice {
  return safeParse<UserPersistedSlice>(
    localStorage.getItem(getUserKey(email)),
    {}
  );
}

function writeUserPersistedSlice(email: string, slice: UserPersistedSlice): void {
  localStorage.setItem(getUserKey(email), JSON.stringify(slice));
}

/** Move legacy appState.foodEntries from main blob into the logged-in user's key. */
function migrateLegacyMainFoodEntries(): void {
  if (!isBrowser()) return;
  const raw = safeParse<PersistedData>(
    localStorage.getItem(STORAGE_KEY),
    defaultData
  );
  const email = raw.appState?.currentUser?.email?.trim();
  const legacy = raw.appState?.foodEntries;
  if (!email || !Array.isArray(legacy) || legacy.length === 0) return;
  const ud = readUserPersistedSlice(email);
  const prev = Array.isArray(ud.foodEntries) ? ud.foodEntries : [];
  writeUserPersistedSlice(email, { ...ud, foodEntries: [...prev, ...legacy] });
  raw.appState.foodEntries = [];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
}

/** Move legacy global allergy list into the user's slice once. */
function migrateLegacyGlobalAllergies(email: string): void {
  if (!isBrowser()) return;
  const ud = readUserPersistedSlice(email);
  const existing = Array.isArray(ud.allergies) ? ud.allergies : [];
  if (existing.length > 0) return;
  const global = safeParse<unknown[]>(
    localStorage.getItem(ALLERGY_STORAGE_KEY),
    []
  );
  if (!Array.isArray(global) || global.length === 0) return;
  writeUserPersistedSlice(email, { ...ud, allergies: global });
  try {
    localStorage.removeItem(ALLERGY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function loadMigratedFoodEntriesForEmail(email: string): FoodEntry[] {
  migrateLegacyGlobalAllergies(email);
  const ud = readUserPersistedSlice(email);
  const rawEntries = Array.isArray(ud.foodEntries) ? ud.foodEntries : [];
  let needsUserPersist = false;
  const foodEntries: FoodEntry[] = [];
  for (const item of rawEntries) {
    const rec = item as Record<string, unknown>;
    const hadStoredId = typeof rec.id === "string" && rec.id.length > 0;
    const migrated = migrateFoodEntry(rec);
    if (!migrated) continue;
    if (!hadStoredId) needsUserPersist = true;
    foodEntries.push(migrated);
  }
  if (needsUserPersist) {
    writeUserPersistedSlice(email, { ...ud, foodEntries });
  }
  return foodEntries;
}

/** After changing `currentUser`, reload journal entries so we never persist the wrong user's food log. */
function syncSessionFoodEntries(data: PersistedData): void {
  const email = data.appState.currentUser?.email?.trim();
  data.appState.foodEntries = email
    ? loadMigratedFoodEntriesForEmail(email)
    : [];
}

function readData(): PersistedData {
  if (!isBrowser()) return defaultData;
  migrateLegacyMainFoodEntries();
  const data = safeParse<PersistedData>(
    localStorage.getItem(STORAGE_KEY),
    defaultData
  );
  const email = data.appState?.currentUser?.email?.trim() || null;

  const foodEntries = email ? loadMigratedFoodEntriesForEmail(email) : [];

  const out: PersistedData = {
    appState: {
      ...defaultData.appState,
      ...data.appState,
      notifications: Array.isArray(data.appState?.notifications)
        ? data.appState.notifications
        : [],
      foodEntries,
      streak: calculateStreak(foodEntries),
    },
    accounts: Array.isArray(data.accounts) ? data.accounts : [],
  };

  return out;
}

function scheduleCloudSync(): void {
  if (!isBrowser() || applyingRemoteSync) return;
  if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => {
    cloudSyncTimer = null;
    void import("@/lib/supabaseDataSync").then((m) => m.pushLocalToCloud());
  }, 2500);
}

function writeData(data: PersistedData) {
  if (!isBrowser()) return;
  const email = data.appState.currentUser?.email?.trim() || null;
  const toPersist: PersistedData = {
    ...data,
    appState: {
      ...data.appState,
      foodEntries: [],
    },
  };
  if (email) {
    const ud = readUserPersistedSlice(email);
    writeUserPersistedSlice(email, {
      ...ud,
      foodEntries: data.appState.foodEntries,
    });
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
  window.dispatchEvent(new CustomEvent(STORE_UPDATED_EVENT));
  if (!applyingRemoteSync) {
    scheduleCloudSync();
  }
}

function entryDateKey(e: FoodEntry) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(e.date)) return e.date;
  const d = new Date(e.date);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function calculateStreak(entries: FoodEntry[]) {
  if (!entries.length) return 0;
  const days = Array.from(
    new Set(entries.map((e) => entryDateKey(e)).filter(Boolean))
  ).sort((a, b) => (a < b ? 1 : -1));
  const today = new Date();
  const keys = [today.toISOString().slice(0, 10)];
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  keys.push(y.toISOString().slice(0, 10));
  if (!days.includes(keys[0]) && !days.includes(keys[1])) return 0;
  const cursor = days.includes(keys[0]) ? new Date(today) : y;
  let streak = 0;
  while (days.includes(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function formatRelativeTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.max(0, now.getTime() - d.getTime());
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Acum";
  if (hours < 24) return `Acum ${hours} ore`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ieri";
  return `Acum ${days} zile`;
}

function pushNotification(data: PersistedData, notif: Omit<Notification, "id" | "time">) {
  const n: Notification = {
    ...notif,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    time: new Date().toISOString(),
  };
  data.appState.notifications = [n, ...data.appState.notifications].slice(0, 100);
}

function recalcState(data: PersistedData): PersistedData {
  return {
    ...data,
    appState: {
      ...data.appState,
      streak: calculateStreak(data.appState.foodEntries),
    },
  };
}

export function registerUser(user: UserAccount): void {
  const data = readData();
  const normalized: UserAccount = {
    ...user,
    isVerified: user.isVerified ?? true,
    verificationToken: user.verificationToken ?? null,
    baby: {
      ...user.baby,
      diversificationStartDate:
        user.baby.diversificationStartDate !== undefined
          ? user.baby.diversificationStartDate
          : null,
    },
  };
  const idx = data.accounts.findIndex((a) => a.email === normalized.email);
  if (idx >= 0) data.accounts[idx] = normalized;
  else data.accounts.push(normalized);
  data.appState.currentUser = normalized;
  data.appState.isLoggedIn = true;
  const hasWelcome = data.appState.notifications.some((n) => n.type === "welcome");
  if (!hasWelcome) {
    pushNotification(data, {
      title: "Bine ai venit! 🎉",
      body: "Contul tău DiversiBebe a fost creat. Hai să începem diversificarea!",
      icon: "🎉",
      iconBg: "#EDE7F6",
      read: false,
      type: "welcome",
    });
  }
  syncSessionFoodEntries(data);
  writeData(recalcState(data));
}

/** Internal marker for accounts created via Google OAuth (not for manual login). */
export const OAUTH_GOOGLE_PLACEHOLDER = "__diversibebe_oauth_google__";

/**
 * After NextAuth Google sign-in, syncs the session into the existing localStorage store.
 * Existing email accounts log in without overwriting profile; new emails get registerUser (welcome once).
 */
export function syncGoogleSessionToLocalUser(options: {
  email: string;
  name?: string | null;
}): void {
  const email = options.email.trim().toLowerCase();
  if (!email || !isBrowser()) return;
  const data = readData();
  const current = data.appState.currentUser;
  if (
    data.appState.isLoggedIn &&
    current &&
    current.email.toLowerCase() === email
  ) {
    return;
  }
  const existing = data.accounts.find((a) => a.email.toLowerCase() === email);
  if (existing) {
    data.appState.currentUser = existing;
    data.appState.isLoggedIn = true;
    syncSessionFoodEntries(data);
    writeData(recalcState(data));
    return;
  }
  const parentName =
    (options.name && options.name.trim()) || email.split("@")[0] || "Părinte";
  registerUser({
    email,
    password: OAUTH_GOOGLE_PLACEHOLDER,
    parentName,
    baby: {
      name: "",
      birthDate: "",
      weight: "",
      gender: null,
      allergies: [],
      diversificationStartDate: null,
    },
    isPremium: false,
    isVerified: true,
    verificationToken: null,
    createdAt: new Date().toISOString(),
  });
}

export function loginUser(email: string, password: string): boolean {
  const data = readData();
  const found = data.accounts.find((a) => a.email === email && a.password === password);
  if (!found) return false;
  data.appState.currentUser = found;
  data.appState.isLoggedIn = true;
  syncSessionFoodEntries(data);
  writeData(recalcState(data));
  return true;
}

export function logoutUser(): void {
  const data = readData();
  data.appState.currentUser = null;
  data.appState.isLoggedIn = false;
  data.appState.foodEntries = [];
  writeData(recalcState(data));
}

export function getCurrentUser(): UserAccount | null {
  return readData().appState.currentUser;
}

/**
 * Updates baby profile after Google onboarding (and mirrors into accounts[]).
 */
export function saveOnboardingBabyProfile(input: {
  name: string;
  birthDate: string;
  gender: "boy" | "girl" | null;
}): void {
  const data = readData();
  const u = data.appState.currentUser;
  if (!u) return;
  const baby: BabyProfile = {
    ...u.baby,
    name: input.name.trim(),
    birthDate: input.birthDate.trim(),
    gender: input.gender,
  };
  const nextUser: UserAccount = { ...u, baby };
  data.appState.currentUser = nextUser;
  data.appState.isLoggedIn = true;
  const idx = data.accounts.findIndex(
    (a) => a.email.toLowerCase() === u.email.toLowerCase()
  );
  if (idx >= 0) {
    data.accounts[idx] = { ...data.accounts[idx], baby };
  }
  writeData(recalcState(data));
}

export function isLoggedIn(): boolean {
  return readData().appState.isLoggedIn;
}

export function addFoodEntry(entry: FoodEntry): void {
  if (!isBrowser()) return;
  const shell = safeParse<PersistedData>(
    localStorage.getItem(STORAGE_KEY),
    defaultData
  );
  const userEmail = shell.appState?.currentUser?.email?.trim();
  if (!userEmail) return;

  const withId: FoodEntry = {
    ...entry,
    id: entry.id || `${Date.now().toString()}-${Math.random().toString(36).slice(2, 9)}`,
  };

  if (
    withId.symptoms.length > 0 &&
    !withId.symptoms.includes("Nicio reacție")
  ) {
    try {
      const userData = readUserPersistedSlice(userEmail);
      const allergies = Array.isArray(userData.allergies)
        ? [...userData.allergies]
        : [];
      const exists = allergies.find(
        (a) =>
          a &&
          typeof a === "object" &&
          (a as AllergyRecord).foodId === withId.foodId
      );
      if (!exists) {
        allergies.push({
          foodId: withId.foodId,
          foodName: withId.foodName,
          emoji: withId.emoji,
          symptoms: withId.symptoms,
          firstDate: withId.date,
          severity:
            withId.symptoms.includes("Erupție") ||
            withId.symptoms.includes("Vărsături")
              ? "sever"
              : "usor",
        });
        writeUserPersistedSlice(userEmail, {
          ...userData,
          allergies,
        });
      }
    } catch {
      /* ignore */
    }
  }

  const data = readData();
  data.appState.foodEntries = [...data.appState.foodEntries, withId];
  const next = recalcState(data);
  const babyName = next.appState.currentUser?.baby.name || "bebe";
  const totalUnique = new Set(next.appState.foodEntries.map((e) => e.foodId)).size;
  if (totalUnique === 1) {
    pushNotification(next, {
      title: "Prima încercare! 🥄",
      body: `Felicitări! Ai jurnalizat primul aliment pentru ${babyName}!`,
      icon: "🥄",
      iconBg: "#E0F5F0",
      read: false,
      type: "milestone",
    });
  }
  if (next.appState.streak === 3) {
    pushNotification(next, {
      title: "3 zile consecutive! 🔥",
      body: "Continuă tot așa! Consistența e cheia.",
      icon: "🔥",
      iconBg: "#E0F5F0",
      read: false,
      type: "streak",
    });
  }
  if (next.appState.streak === 7) {
    pushNotification(next, {
      title: "O săptămână! 🎯",
      body: "Bravo! 7 zile consecutive de diversificare!",
      icon: "🎯",
      iconBg: "#EDE7F6",
      read: false,
      type: "streak",
    });
  }
  if (
    withId.symptoms.length > 0 &&
    !withId.symptoms.includes("Nicio reacție")
  ) {
    pushNotification(next, {
      title: "Monitorizare reacție ⚠️",
      body: `Urmărește-l pe ${babyName} în următoarele 48 de ore după ${withId.foodName}.`,
      icon: "⚠️",
      iconBg: "#FAEEDA",
      read: false,
      type: "reaction_followup",
    });
  }
  writeData(next);
}

export function getFoodEntries(): FoodEntry[] {
  if (!isBrowser()) return [];
  migrateLegacyMainFoodEntries();
  const data = safeParse<PersistedData>(
    localStorage.getItem(STORAGE_KEY),
    defaultData
  );
  const userEmail = data.appState?.currentUser?.email?.trim();
  if (!userEmail) return [];
  return sortFoodEntries(loadMigratedFoodEntriesForEmail(userEmail));
}

export function getEntriesForFood(foodId: string): FoodEntry[] {
  return sortFoodEntries(
    getFoodEntries().filter((e) => e.foodId === foodId && e.type === "food")
  );
}

export type AllergyRecord = {
  foodId: string;
  foodName: string;
  emoji: string;
  symptoms: string[];
  firstDate: string;
  severity: "sever" | "usor";
};

export type RemoteSyncPayload = {
  profile?: {
    parentName?: string;
    baby?: Partial<BabyProfile>;
    isPremium?: boolean;
  } | null;
  foodEntries?: unknown[];
  allergies?: unknown[];
};

function parseAllergyPayload(raw: unknown): AllergyRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.foodId !== "string" || !o.foodId) return null;
  return {
    foodId: o.foodId,
    foodName: typeof o.foodName === "string" ? o.foodName : "",
    emoji: typeof o.emoji === "string" ? o.emoji : "🍽️",
    symptoms: Array.isArray(o.symptoms)
      ? o.symptoms.filter((s): s is string => typeof s === "string")
      : [],
    firstDate: typeof o.firstDate === "string" ? o.firstDate : "",
    severity: o.severity === "sever" ? "sever" : "usor",
  };
}

function mergeAllergyLists(local: AllergyRecord[], remote: AllergyRecord[]): AllergyRecord[] {
  const map = new Map<string, AllergyRecord>();
  for (const a of local) map.set(a.foodId, a);
  for (const a of remote) map.set(a.foodId, a);
  return [...map.values()];
}

function mergeAccountFromRemote(
  local: UserAccount,
  remote: NonNullable<RemoteSyncPayload["profile"]>
): UserAccount {
  const rb = remote.baby;
  const mergedBaby: BabyProfile = {
    ...local.baby,
    ...(rb
      ? {
          name: rb.name?.trim() ? rb.name.trim() : local.baby.name,
          birthDate: rb.birthDate?.trim() ? rb.birthDate.trim() : local.baby.birthDate,
          weight:
            rb.weight !== undefined && String(rb.weight).length > 0
              ? String(rb.weight)
              : local.baby.weight,
          gender: rb.gender !== undefined ? rb.gender : local.baby.gender,
          allergies:
            Array.isArray(rb.allergies) && rb.allergies.length > 0
              ? rb.allergies
              : local.baby.allergies,
          diversificationStartDate:
            rb.diversificationStartDate !== undefined
              ? rb.diversificationStartDate
              : local.baby.diversificationStartDate,
        }
      : {}),
  };
  return {
    ...local,
    parentName: remote.parentName?.trim()
      ? remote.parentName.trim()
      : local.parentName,
    baby: mergedBaby,
    isPremium: remote.isPremium ?? local.isPremium,
  };
}

/**
 * Merge server snapshot into local store (Google session). Idempotent-friendly.
 */
export function applyRemoteSyncFromServer(payload: RemoteSyncPayload): void {
  if (!isBrowser()) return;
  const data = readData();
  const email = data.appState.currentUser?.email?.trim();
  if (!email) return;

  const account = data.accounts.find(
    (a) => a.email.toLowerCase() === email.toLowerCase()
  );
  if (!account) return;

  applyingRemoteSync = true;
  try {
    if (payload.profile) {
      const nextAccount = mergeAccountFromRemote(account, payload.profile);
      const idx = data.accounts.findIndex((a) => a.email === nextAccount.email);
      if (idx >= 0) data.accounts[idx] = nextAccount;
      data.appState.currentUser = nextAccount;
    }

    const localFood = loadMigratedFoodEntriesForEmail(email);
    const remoteRaw = Array.isArray(payload.foodEntries) ? payload.foodEntries : [];
    const remoteFood: FoodEntry[] = [];
    for (const raw of remoteRaw) {
      const m = migrateFoodEntry(raw as Record<string, unknown>);
      if (m) remoteFood.push(m);
    }
    const mergedFood = mergeFoodEntriesById(localFood, remoteFood);

    const localUd = readUserPersistedSlice(email);
    const localAllergies = (
      Array.isArray(localUd.allergies) ? localUd.allergies : []
    )
      .map((a) => parseAllergyPayload(a))
      .filter((a): a is AllergyRecord => a !== null);

    const remoteAllergies = (Array.isArray(payload.allergies) ? payload.allergies : [])
      .map((a) => parseAllergyPayload(a))
      .filter((a): a is AllergyRecord => a !== null);

    const mergedAllergies = mergeAllergyLists(localAllergies, remoteAllergies);

    writeUserPersistedSlice(email, {
      ...localUd,
      foodEntries: mergedFood,
      allergies: mergedAllergies,
    });

    syncSessionFoodEntries(data);
    writeData(recalcState(data));
  } finally {
    applyingRemoteSync = false;
  }
}

export function getAllergies(): AllergyRecord[] {
  if (!isBrowser()) return [];
  try {
    const data = safeParse<PersistedData>(
      localStorage.getItem(STORAGE_KEY),
      defaultData
    );
    const userEmail = data.appState?.currentUser?.email?.trim();
    if (!userEmail) return [];
    migrateLegacyGlobalAllergies(userEmail);
    const ud = readUserPersistedSlice(userEmail);
    const parsed = Array.isArray(ud.allergies) ? ud.allergies : [];
    return parsed.filter(
      (a): a is AllergyRecord =>
        !!a &&
        typeof a === "object" &&
        typeof (a as AllergyRecord).foodId === "string"
    );
  } catch {
    return [];
  }
}

export function removeAllergy(foodId: string): void {
  if (!isBrowser()) return;
  const data = safeParse<PersistedData>(
    localStorage.getItem(STORAGE_KEY),
    defaultData
  );
  const userEmail = data.appState?.currentUser?.email?.trim();
  if (!userEmail) return;
  const ud = readUserPersistedSlice(userEmail);
  const allergies = (
    Array.isArray(ud.allergies)
      ? ud.allergies.filter(
          (a): a is AllergyRecord =>
            !!a &&
            typeof a === "object" &&
            typeof (a as AllergyRecord).foodId === "string"
        )
      : []
  ).filter((a) => a.foodId !== foodId);
  writeUserPersistedSlice(userEmail, { ...ud, allergies });
  window.dispatchEvent(new CustomEvent(STORE_UPDATED_EVENT));
  writeData(recalcState(readData()));
}

export function addManualAllergy(record: AllergyRecord): void {
  if (!isBrowser()) return;
  const data = safeParse<PersistedData>(
    localStorage.getItem(STORAGE_KEY),
    defaultData
  );
  const userEmail = data.appState?.currentUser?.email?.trim();
  if (!userEmail) return;
  const ud = readUserPersistedSlice(userEmail);
  const list = (
    Array.isArray(ud.allergies)
      ? ud.allergies.filter(
          (a): a is AllergyRecord =>
            !!a &&
            typeof a === "object" &&
            typeof (a as AllergyRecord).foodId === "string"
        )
      : []
  ) as AllergyRecord[];
  if (list.some((a) => a.foodId === record.foodId)) return;
  writeUserPersistedSlice(userEmail, {
    ...ud,
    allergies: [...list, record],
  });
  window.dispatchEvent(new CustomEvent(STORE_UPDATED_EVENT));
  writeData(recalcState(readData()));
}

export function getTriedFoodsCount(): number {
  const entries = getFoodEntries();
  return new Set(entries.filter((e) => e.type === "food").map((e) => e.foodId))
    .size;
}

export function getMildReactionsCount(): number {
  return getFoodEntries().filter(
    (e) => e.symptoms.length > 0 && !e.symptoms.includes("Nicio reacție")
  ).length;
}

export function getStreak(): number {
  return calculateStreak(getFoodEntries());
}

export function getRecentActivity(): FoodEntry[] {
  return sortFoodEntries(getFoodEntries()).slice(0, 5);
}

export function getAllAccounts(): UserAccount[] {
  return [...readData().accounts];
}

export function deleteAccount(email: string): void {
  const data = readData();
  data.accounts = data.accounts.filter((a) => a.email !== email);
  if (data.appState.currentUser?.email === email) {
    data.appState.currentUser = null;
    data.appState.isLoggedIn = false;
  }
  if (isBrowser()) {
    try {
      localStorage.removeItem(getUserKey(email));
    } catch {
      /* ignore */
    }
  }
  syncSessionFoodEntries(data);
  writeData(recalcState(data));
}

export function togglePremium(email: string): void {
  const data = readData();
  const idx = data.accounts.findIndex((a) => a.email === email);
  if (idx < 0) return;
  data.accounts[idx] = { ...data.accounts[idx], isPremium: !data.accounts[idx].isPremium };
  if (data.appState.currentUser?.email === email) data.appState.currentUser = data.accounts[idx];
  writeData(recalcState(data));
}

export function getNotifications(): Notification[] {
  const raw = [...readData().appState.notifications];
  const seen = new Set<string>();
  const unique = raw.filter((n) => {
    const day = n.time.includes("T")
      ? n.time.split("T")[0]
      : n.time.slice(0, 10);
    const key = `${n.type}_${day}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.map((n) => ({
    ...n,
    time: formatRelativeTime(n.time),
  }));
}

export function addNotification(notif: Notification): void {
  const data = readData();
  data.appState.notifications = [notif, ...data.appState.notifications];
  writeData(recalcState(data));
}

export function markAsRead(id: string): void {
  const data = readData();
  data.appState.notifications = data.appState.notifications.map((n) =>
    n.id === id ? { ...n, read: true } : n
  );
  writeData(recalcState(data));
}

export function getUnreadNotificationsCount(): number {
  return readData().appState.notifications.filter((n) => !n.read).length;
}

export function getFoodsByAgeGroup(group: "4-6" | "6-8" | "8-10" | "10-12"): FoodCatalogItem[] {
  return FOOD_CATALOG.filter((f) => f.ageGroup === group);
}

export function getAllFoods(): FoodCatalogItem[] {
  return [...FOOD_CATALOG];
}

/** Primul aliment din catalog pentru grupa de vârstă curentă care nu are încă intrare în jurnal. */
export function getNextSuggestedFood(): FoodCatalogItem | null {
  const ageGroup = getCurrentAgeGroup();
  const found = getFoodsByAgeGroup(ageGroup).find((f) => !getFoodStatus(f.id).entry);
  if (!found) return null;
  return getFoodById(found.id) ?? null;
}

export function getFoodById(id: string): FoodCatalogItem | undefined {
  return FOOD_CATALOG.find((f) => f.id === id);
}

export function getFoodStatus(foodId: string): {
  status: FoodStatus;
  entry: FoodEntry | null;
} {
  const entries = getFoodEntries().filter(
    (e) => e.foodId === foodId && e.type === "food"
  );
  if (!entries.length) return { status: "De încercat", entry: null };
  const latest = entries[0];
  if (latest.reaction === "loved") return { status: "Adorat!", entry: latest };
  if (latest.reaction === "disliked") return { status: "Nu a plăcut", entry: latest };
  if (latest.reaction === "refused") return { status: "A refuzat", entry: latest };
  return { status: "Încercat", entry: latest };
}

export function getFoodStatusMeta(status: FoodStatus): {
  border: string;
  statusText: string;
  statusColor: string;
  badgeText: string;
  badgeColor: string;
} {
  switch (status) {
    case "Încercat":
      return {
        border: "#E0F5F0",
        statusText: "✅ Încercat",
        statusColor: "#6BBFAD",
        badgeText: "✅ Încercat",
        badgeColor: "#0F6E56",
      };
    case "Adorat!":
      return {
        border: "#E0F5F0",
        statusText: "❤️ Adorat!",
        statusColor: "#D4849A",
        badgeText: "❤️ Adorat!",
        badgeColor: "#D4849A",
      };
    case "Nu a plăcut":
      return {
        border: "#FDDCBD",
        statusText: "🙁 Nu a plăcut",
        statusColor: "#C47A3A",
        badgeText: "🙁 Nu a plăcut",
        badgeColor: "#C47A3A",
      };
    case "A refuzat":
      return {
        border: "#FDDCBD",
        statusText: "🤢 A refuzat",
        statusColor: "#C47A3A",
        badgeText: "🤢 A refuzat",
        badgeColor: "#C47A3A",
      };
    case "De încercat":
    default:
      return {
        border: "#FDDCBD",
        statusText: "🆕 De încercat",
        statusColor: "#C47A3A",
        badgeText: "🆕 De încercat",
        badgeColor: "#C47A3A",
      };
  }
}

export function getRecipes(): RecipeCatalogItem[] {
  return RECIPES;
}

export function getRecipeById(id: string): RecipeCatalogItem | undefined {
  return RECIPES.find((r) => r.id === id);
}

export function getRecipesByFoodId(foodId: string): RecipeCatalogItem[] {
  return RECIPES.filter((r) => r.relatedFoods.includes(foodId));
}

export function getCurrentAgeGroup(): "4-6" | "6-8" | "8-10" | "10-12" {
  const user = getCurrentUser();
  const months = calculateBabyAge(user?.baby.birthDate || "").months;
  if (months < 6) return "4-6";
  if (months < 8) return "6-8";
  if (months < 10) return "8-10";
  return "10-12";
}

export function getDiversificationInfo(): {
  startDate: string | null;
  week: number;
  expectedFoods: number;
} {
  const user = getCurrentUser();
  const start = user?.baby.diversificationStartDate || null;
  if (!start) return { startDate: null, week: 0, expectedFoods: 0 };
  const startDate = parseDate(start);
  if (!startDate) return { startDate: null, week: 0, expectedFoods: 0 };
  const days = Math.max(
    0,
    Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  );
  const week = Math.floor(days / 7) + 1;
  const expectedFoods = week * 2 + 1;
  return { startDate: start, week, expectedFoods };
}

export function setDiversificationStartDate(date: string | null): void {
  const data = readData();
  if (!data.appState.currentUser) return;
  const updated = {
    ...data.appState.currentUser,
    baby: {
      ...data.appState.currentUser.baby,
      diversificationStartDate: date,
    },
  };
  data.appState.currentUser = updated;
  const idx = data.accounts.findIndex((a) => a.email === updated.email);
  if (idx >= 0) data.accounts[idx] = updated;
  if (date) {
    const ageGroup = getCurrentAgeGroup();
    const nextFood = getFoodsByAgeGroup(ageGroup).find(
      (f) => getFoodStatus(f.id).entry === null
    );
    if (nextFood) {
      pushNotification(data, {
        title: "Aliment nou sugerat 🎃",
        body: `${nextFood.name} e potrivit pentru vârsta lui ${updated.baby.name}. Hai să încercăm!`,
        icon: nextFood.emoji,
        iconBg: "#E0F5F0",
        read: false,
        type: "food_suggestion",
      });
    }
  }
  writeData(recalcState(data));
}
