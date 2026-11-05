"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DeviceOnlyNote } from "../components";
import { emitGrowth } from "../growth/browser";
import { usePreview } from "../Provider";

const DISMISSED_KEY = "diversibebe:v2:save-invite-dismissed";

function wasDismissed() {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Asked once a visitor has something worth keeping (a saved plan, a shopping list), in the page and never over it.
 * The answer "no" is remembered on this device, and nothing is required to go on using the app.
 */
export function SaveProgressInvite({ quietNote = false }: { quietNote?: boolean }) {
  const { cloud, announce } = usePreview();
  const [dismissed, setDismissed] = useState(wasDismissed);
  const slot = useRef<HTMLDivElement>(null);
  const applicable = cloud.available && !cloud.connected && !cloud.loading;
  const show = applicable && !dismissed;
  useEffect(() => {
    if (show) emitGrowth("account_prompt_viewed", {}, "save-invite");
  }, [show]);
  return (
    <div className="v2-save-invite-slot" ref={slot} tabIndex={-1}>
      {show ? (
        <section className="v2-save-invite" aria-labelledby="v2-save-invite-title">
          <h3 id="v2-save-invite-title">Salvează-ți progresul într-un cont gratuit</h3>
          <p>
            Planul și lista sunt acum doar în acest browser. Le poți pierde dacă ștergi datele browserului sau dacă
            browserul le curăță singur. Cu un cont, le regăsești pe orice dispozitiv.
          </p>
          <div className="v2-action-row">
            <Link className="v2-button v2-button-primary" href="/v2/cont?nou=1" prefetch={false}>
              Creează cont gratuit
            </Link>
            <button
              type="button"
              className="v2-button v2-button-secondary"
              onClick={() => {
                try {
                  window.localStorage.setItem(DISMISSED_KEY, "1");
                } catch {
                  /* Storage unavailable: the answer lasts until the next reload. */
                }
                setDismissed(true);
                announce("Continui fără cont. Alegerile rămân în acest browser.");
                slot.current?.focus();
              }}
            >
              Continuă fără cont
            </button>
          </div>
        </section>
      ) : (
        quietNote && <DeviceOnlyNote />
      )}
    </div>
  );
}
