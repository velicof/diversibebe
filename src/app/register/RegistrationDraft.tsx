"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Draft = { parentName: string; email: string; password: string };
const Context = createContext<{
  draft: Draft | null;
  setDraft: (draft: Draft | null) => void;
} | null>(null);

/** The draft survives client navigation only; never persist credentials. */
export function RegistrationDraft({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  useEffect(() => {
    try {
      localStorage.removeItem("register_step1");
      localStorage.removeItem("diversibebe_register_step1");
    } catch {
      // Registration must also work when storage is unavailable.
    }
  }, []);
  useEffect(() => {
    if (!draft) return;
    const timeout = window.setTimeout(() => setDraft(null), 10 * 60 * 1000);
    return () => window.clearTimeout(timeout);
  }, [draft]);
  return <Context.Provider value={{ draft, setDraft }}>{children}</Context.Provider>;
}

export function useRegistrationDraft() {
  const value = useContext(Context);
  if (!value) throw new Error("RegistrationDraft provider is missing");
  return value;
}
