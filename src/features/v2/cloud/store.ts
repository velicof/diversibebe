"use client";
import {
  emptyState,
  type Action,
  type AppState,
  type LocalEvent,
} from "../model";
import { AUTH_STORAGE_KEY, getV2Repository } from "./client";
import type { CloudState, V2Repository } from "./repository";

type Snapshot = CloudState & {
  available: boolean;
  connected: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  userId: string | null;
  email: string | null;
};
const initial: Snapshot = {
  state: emptyState,
  selectedBabyId: null,
  children: [],
  requiresClinicalGuidance: false,
  available: false,
  connected: false,
  loading: false,
  saving: false,
  error: null,
  userId: null,
  email: null,
};
let snapshot = initial,
  initialized = false,
  generation = 0;
let repository: V2Repository | null = null;
let currentWrite: Promise<void> = Promise.resolve();
let signingOut = false, locallySignedOut = false;
let failed: { owner: string; child: string | null; action: Action } | null =
  null;
const listeners = new Set<() => void>();
function update(value: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...value };
  listeners.forEach((l) => l());
}
async function connect() {
  if (!repository || signingOut || locallySignedOut) return;
  const run = ++generation;
  update({ loading: true, error: null });
  try {
    const {
      data: { user },
      error,
    } = await repository.client.auth.getUser();
    if (run !== generation) return;
    if (error && error.name !== "AuthSessionMissingError" && error.status !== 401 && error.status !== 403) throw error;
    if (error || !user) {
      update({ ...initial, available: true });
      return;
    }
    if (snapshot.userId !== user.id)
      update({
        state: { ...emptyState },
        children: [],
        selectedBabyId: null,
        connected: false,
      });
    const value = await repository.load();
    if (run === generation)
      update({
        ...value,
        loading: false,
        saving: false,
        connected: true,
        userId: user.id,
        email: user.email ?? null,
      });
  } catch {
    if (run === generation)
      update({
        loading: false,
        error:
          "Nu am putut sincroniza datele. Verifică legătura și reîncearcă.",
      });
  }
}
export const cloudStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => snapshot,
  getServerSnapshot: () => initial,
  init() {
    if (initialized) return;
    initialized = true;
    try {
      repository = getV2Repository();
    } catch {
      update({
        error:
          "Configurația de test nu este validă. Conexiunea a fost blocată.",
      });
      return;
    }
    if (!repository) return;
    update({ available: true });
    repository.client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        locallySignedOut = true;
        generation++;
        failed = null;
        update({ ...initial, available: true, loading: signingOut });
      } else if (["SIGNED_IN", "TOKEN_REFRESHED"].includes(event))
        window.setTimeout(() => {
          void connect();
        }, 0);
    });
    window.addEventListener("focus", () => {
      if (snapshot.connected && !snapshot.saving) void connect();
    });
    window.addEventListener("storage", (event) => {
      if (event.key === AUTH_STORAGE_KEY && event.newValue === null) {
        generation++;
        locallySignedOut = true;
        failed = null;
        update({ ...initial, available: true });
      }
    });
    void connect();
  },
  async login(email: string, password: string) {
    if (!repository)
      throw new Error("Mediul Supabase local nu este configurat.");
    const { error } = await repository.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error)
      throw new Error(
        "Conectarea nu a reușit. Verifică datele contului de test și conexiunea.",
      );
    locallySignedOut = false;
    await repository.client.auth.startAutoRefresh();
    await connect();
  },
  async logout() {
    if (signingOut) return false;
    signingOut = true;
    locallySignedOut = true;
    generation++;
    failed = null;
    // Clear private views immediately even if the network is unavailable.
    update({ ...initial, available: Boolean(repository), loading: true });
    let serverConfirmed = false;
    try {
      const result = await repository?.client.auth.signOut({ scope: "local" });
      serverConfirmed = Boolean(result && !result.error);
    } catch { /* The local session must still be removed while offline. */ }
    finally {
      await repository?.client.auth.stopAutoRefresh();
      try {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        window.localStorage.removeItem(`${AUTH_STORAGE_KEY}-code-verifier`);
        window.localStorage.removeItem(`${AUTH_STORAGE_KEY}-user`);
      } catch { /* Unsupported browser storage uses a memory-only SDK session. */ }
      generation++;
      signingOut = false;
      update({ ...initial, available: Boolean(repository) });
    }
    return serverConfirmed;
  },
  refresh: connect,
  dispatch(action: Action) {
    if (!repository || !snapshot.connected || snapshot.saving) return;
    const repo = repository,
      run = generation,
      before = snapshot;
    update({ saving: true, error: null });
    currentWrite = (async () => {
      try {
        const value = await repo.apply(
          before.selectedBabyId,
          action,
          before.state,
        );
        if (run === generation) {
          failed = null;
          update({ ...value, saving: false, error: null });
        }
      } catch {
        if (run === generation) {
          failed = {
            owner: before.userId!,
            child: before.selectedBabyId,
            action,
          };
          update({
            saving: false,
            error:
              "Salvarea nu a reușit. Datele din cont nu au fost înlocuite cu o copie locală.",
          });
        }
        throw new Error("save failed");
      }
    })();
    // Caller-facing errors are represented in the snapshot; never leak server details.
    void currentWrite.catch(() => {});
  },
  retry() {
    if (
      failed &&
      failed.owner === snapshot.userId &&
      failed.child === snapshot.selectedBabyId
    )
      this.dispatch(failed.action);
    else void connect();
  },
  async selectChild(id: string) {
    if (!repository || snapshot.saving) return;
    const before = snapshot,
      run = ++generation;
    failed = null;
    update({ loading: true, state: { ...emptyState }, error: null });
    try {
      const value = await repository.call(id, "select-child", {});
      if (run === generation) update({ ...value, loading: false });
    } catch {
      if (run === generation)
        update({
          ...before,
          loading: false,
          error: "Profilul nu a putut fi încărcat. Reîncearcă sincronizarea.",
        });
    }
  },
  async createChild(label: string, stage: number) {
    if (!repository || !snapshot.connected) throw new Error("Test environment unavailable");
    const run = generation, owner = snapshot.userId;
    const value = await repository.call(null, "create-child", {
      id: crypto.randomUUID(),
      label,
      stage,
    });
    if (run === generation && owner === snapshot.userId && snapshot.connected) update(value);
  },
  async record(event: LocalEvent) {
    if (!repository || !snapshot.connected) return;
    const run = generation,
      repo = repository;
    try {
      await currentWrite;
      if (run === generation && snapshot.connected) await repo.record(event);
    } catch {
      /* Analytics never retries as an unconfirmed user action. */
    }
  },
  async importIdeas(local: AppState) {
    if (!repository || !snapshot.connected || !snapshot.selectedBabyId) return;
    // Explicit, additive import only. Meals/clinical choices/history are never imported.
    const owner = snapshot.userId,
      child = snapshot.selectedBabyId,
      run = generation;
    const stillCurrent = () => run === generation && snapshot.connected && owner === snapshot.userId && child === snapshot.selectedBabyId;
    for (const id of local.favorites) {
      if (!stillCurrent())
        throw new Error("Session changed");
      const value = await repository.call(child, "favorite", {
        recipeId: id,
        enabled: true,
      });
      if (!stillCurrent()) throw new Error("Session changed");
      update(value);
    }
    for (const entry of local.plan) {
      if (!stillCurrent())
        throw new Error("Session changed");
      if (!snapshot.state.plan.some((p) => p.slot === entry.slot)) {
        const value = await repository.call(child, "plan", entry);
        if (!stillCurrent()) throw new Error("Session changed");
        update(value);
      }
    }
  },
};
