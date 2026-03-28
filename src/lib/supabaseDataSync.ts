"use client";

import { createClient } from "@/lib/supabase/client";
import {
  applyRemoteSyncFromServer,
  getAllergies,
  getCurrentUser,
  getFoodEntries,
} from "@/app/lib/store";

/**
 * Push local journal/profile/allergies to Supabase (authenticated user required).
 * Debounced from store via dynamic import to avoid circular deps.
 */
export async function pushLocalToCloud(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return;

  const email = user.email.toLowerCase();
  const localUser = getCurrentUser();
  if (!localUser || localUser.email.toLowerCase() !== email) return;

  const foodEntries = getFoodEntries();
  const allergies = getAllergies();

  await fetch("/api/data/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profile: {
        parentName: localUser.parentName,
        baby: localUser.baby,
        isPremium: localUser.isPremium,
      },
      foodEntries,
      allergies,
    }),
  });
}

const PULL_THROTTLE_MS = 45_000;
let lastPullAt = 0;
let lastPullEmail: string | null = null;

export async function pullRemoteUserData(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return;

  const email = user.email.toLowerCase();
  const now = Date.now();
  if (lastPullEmail === email && now - lastPullAt < PULL_THROTTLE_MS) {
    return;
  }
  lastPullAt = now;
  lastPullEmail = email;

  const res = await fetch("/api/data/sync", {
    method: "GET",
    credentials: "same-origin",
  });

  if (!res.ok) return;

  const json = await res.json();
  applyRemoteSyncFromServer(json);
}
