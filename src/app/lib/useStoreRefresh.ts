"use client";

import { useEffect, useState } from "react";
import { STORE_UPDATED_EVENT } from "./store";

export function useStoreRefresh() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const onUpdate = () => setVersion((v) => v + 1);
    window.addEventListener(STORE_UPDATED_EVENT, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(STORE_UPDATED_EVENT, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  return version;
}
