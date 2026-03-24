"use client";

import { getSession } from "next-auth/react";
import {
  applyRemoteSyncFromServer,
  getAllergies,
  getCurrentUser,
  getFoodEntries,
} from "@/app/lib/store";

/**
 * Push local journal/profile/allergies to Supabase (NextAuth session required).
 * Debounced from store via dynamic import to avoid circular deps.
 */
export async function pushLocalToCloud(): Promise<void> {
  const session = await getSession();
  if (!session?.user?.email) return;

  const email = session.user.email.toLowerCase();
  const user = getCurrentUser();
  if (!user || user.email.toLowerCase() !== email) return;

  const foodEntries = getFoodEntries();
  const allergies = getAllergies();

  await fetch("/api/data/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profile: {
        parentName: user.parentName,
        baby: user.baby,
        isPremium: user.isPremium,
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
  const session = await getSession();
  if (!session?.user?.email) return;

  const email = session.user.email.toLowerCase();
  const now = Date.now();
  if (
    lastPullEmail === email &&
    now - lastPullAt < PULL_THROTTLE_MS
  ) {
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
