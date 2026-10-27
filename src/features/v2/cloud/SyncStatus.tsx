"use client";
import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { cloudStore } from "./store";
import { usePreview } from "../Provider";
export function SyncStatus() {
  const { cloud } = usePreview();
  // Reserve the banner during server rendering; avoid pushing the page on hydration.
  if (!process.env.NEXT_PUBLIC_V2_SUPABASE_URL) return null;
  return (
    <div
      className="v2-sync-status"
      role="status"
      aria-live="polite"
      aria-busy={cloud.loading || cloud.saving}
    >
      {process.env.NEXT_PUBLIC_V2_BACKEND_KIND === "contract-fixture" && (
        <strong title="PostgreSQL persistent, API compatibilă Supabase și autentificare sintetică; nu este serviciul Supabase complet.">
          Mediu local de test
        </strong>
      )}
      <span>
        {cloud.connected
          ? cloud.saving
            ? "Se salvează în contul de test…"
            : "Date sincronizate cu mediul local de test"
          : "Explorezi fără cont"}
      </span>
      {cloud.connected ? (
        <>
          <button
            className="v2-text-button"
            disabled={cloud.loading || cloud.saving}
            onClick={() => void cloudStore.refresh()}
          >
            <RefreshCw size={14} />
            Sincronizează
          </button>
          <Link href="/v2/cont">Contul de test</Link>
        </>
      ) : (
        <Link href="/v2/cont">
          Conectează contul de test <ArrowRight size={14} />
        </Link>
      )}
      {cloud.error && (
        <div className="v2-alert" role="alert">
          {cloud.error}
          <button className="v2-text-button" onClick={() => cloudStore.retry()}>
            Reîncearcă
          </button>
        </div>
      )}
    </div>
  );
}
