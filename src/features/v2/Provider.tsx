"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { makeEvent } from "./analytics";
import type { Action, EventName } from "./model";
import { previewStore } from "./store";
import { journeyScope, journeyStore } from "./growth/browser";
import { cloudStore } from "./cloud/store";
import { accountCopy } from "./content/copy";
import { allergiesFor, assessRecipe, type ResolvedAllergy } from "./allergy";
import { catalog } from "./catalog";

type ContextValue = ReturnType<typeof previewStore.getSnapshot> & {
  dispatch: (action: Action) => void;
  announce: (message: string) => void;
  track: (name: EventName, properties?: Record<string, unknown>) => void;
  /** The parent paused personalised suggestions for this session. Allergy exclusions do not depend on it. */
  clinicalGuidance: boolean;
  setClinicalGuidance: (value: boolean) => void;
  /** Allergies that protect the active child: its own and those recorded for the whole account. */
  allergies: ResolvedAllergy[];
  cloud: ReturnType<typeof cloudStore.getSnapshot>;
};
const Context = createContext<ContextValue | null>(null);
export function PreviewProvider({ children }: { children: React.ReactNode }) {
  const local = useSyncExternalStore(
    previewStore.subscribe,
    previewStore.getSnapshot,
    previewStore.getServerSnapshot,
  );
  const cloud = useSyncExternalStore(
    cloudStore.subscribe,
    cloudStore.getSnapshot,
    cloudStore.getServerSnapshot,
  );
  const snapshot = cloud.connected
    ? { state: cloud.state, ready: !cloud.loading, storageError: false }
    : { ...local, ready: local.ready && !cloud.loading && !cloud.reconnecting };
  const [message, setMessage] = useState("");
  const allergies = useMemo(
    () => (cloud.connected ? allergiesFor(cloud.allergies, cloud.selectedBabyId) : []),
    [cloud.connected, cloud.allergies, cloud.selectedBabyId],
  );
  const sessionStarted = useRef(false);
  const journeyOwner = useRef<string | null>(null);
  const cloudSessionUser = useRef<string | null>(null);
  // This sensitive eligibility choice is memory-only and excluded from analytics.
  const [clinicalGuidance, setClinicalGuidance] = useState(false);
  const track = useCallback(
    (name: EventName, properties: Record<string, unknown> = {}) => {
      const event = makeEvent(
        name,
        properties,
        new Date().toISOString(),
        crypto.randomUUID(),
      );
      previewStore.dispatch({ type: "event", event });
      void cloudStore.record(event);
    },
    [],
  );
  useEffect(() => {
    previewStore.hydrate();
    cloudStore.init();
    if (!sessionStarted.current) {
      sessionStarted.current = true;
      track("session_started");
    }
  }, [track]);
  useEffect(() => {
    if (cloud.connected && cloud.userId !== cloudSessionUser.current) {
      cloudSessionUser.current = cloud.userId;
      track("return_session");
    }
    if (!cloud.connected) cloudSessionUser.current = null;
  }, [cloud.connected, cloud.userId, track]);
  useEffect(() => {
    if (!cloud.connected || cloud.loading) { if(!cloud.connected)journeyOwner.current=null; return; }
    const scope=journeyScope(cloud.userId,cloud.selectedBabyId);
    if(journeyOwner.current!==scope){
      journeyOwner.current=scope;
      journeyStore.hydrate(scope);
      if(cloud.journey)journeyStore.update(scope,cloud.journey);
    }
  },[cloud.connected,cloud.loading,cloud.userId,cloud.selectedBabyId,cloud.journey]);
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(""), 4000);
    return () => window.clearTimeout(id);
  }, [message]);
  const dispatch = (action: Action) => {
    const now = cloudStore.getSnapshot();
    // An account that is still loading must not write a visitor's copy on this device.
    if (now.reconnecting && !now.connected && action.type !== "event") {
      setMessage(accountCopy.notSavedReconnecting);
      return;
    }
    // Last line of protection: no path puts a recipe with a recorded allergen in the plan or the history.
    const recipeIds =
      action.type === "plan" ? [action.recipeId]
      : action.type === "plan-many" ? action.entries.map((e) => e.recipeId)
      : action.type === "confirm" ? [action.use.recipeId]
      : [];
    if (
      allergies.length &&
      recipeIds.some((id) => {
        const recipe = catalog.find((r) => r.id === id);
        return recipe && assessRecipe(recipe, allergies).status === "contains";
      })
    ) {
      setMessage("Rețeta conține un alergen înregistrat pentru acest copil, așa că nu se adaugă.");
      return;
    }
    if (
      cloudStore.getSnapshot().connected &&
      action.type !== "event" &&
      action.type !== "reset"
    )
      cloudStore.dispatch(action);
    else previewStore.dispatch(action);
  };
  const announce = (value: string) =>
    setMessage(
      cloudStore.getSnapshot().saving
        ? accountCopy.saving
        : value,
    );
  return (
    <Context.Provider
      value={{
        ...snapshot,
        cloud,
        dispatch,
        announce,
        track,
        clinicalGuidance,
        setClinicalGuidance,
        allergies,
      }}
    >
      {children}
      <div
        className={`v2-toast ${message ? "is-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {message}
      </div>
    </Context.Provider>
  );
}
export function usePreview() {
  const value = useContext(Context);
  if (!value) throw new Error("PreviewProvider missing");
  return value;
}
