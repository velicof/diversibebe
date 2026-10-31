"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { makeEvent } from "./analytics";
import type { Action, EventName } from "./model";
import { previewStore } from "./store";
import { journeyScope, journeyStore } from "./growth/browser";
import { cloudStore } from "./cloud/store";

type ContextValue = ReturnType<typeof previewStore.getSnapshot> & {
  dispatch: (action: Action) => void;
  announce: (message: string) => void;
  track: (name: EventName, properties?: Record<string, unknown>) => void;
  clinicalGuidance: boolean;
  setClinicalGuidance: (value: boolean) => void;
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
    : { ...local, ready: local.ready && !cloud.loading };
  const [message, setMessage] = useState("");
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
        ? "Se salvează în contul de test…"
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
        clinicalGuidance: clinicalGuidance || cloud.requiresClinicalGuidance,
        setClinicalGuidance,
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
