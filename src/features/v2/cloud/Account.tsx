"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LogOut, ShieldCheck } from "lucide-react";
import { cloudStore } from "./store";
import { usePreview } from "../Provider";
import { previewStore } from "../store";
import { PageHeading } from "../components";

export function Account() {
  const { cloud, announce } = usePreview();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [childLabel, setChildLabel] = useState("");
  const [imported, setImported] = useState(false);
  if (cloud.connected)
    return (
      <>
        <PageHeading eyebrow="MEDIU LOCAL IZOLAT" title="Contul tău de test">
          Date persistente pe serverul local. Fără legătură cu utilizatorii din
          producție.
        </PageHeading>
        <section className="v2-profile-section v2-account-panel">
          <ShieldCheck size={24} />
          <h2>Conectat în mediul de test</h2>
          <p>{cloud.email}</p>
          <label htmlFor="v2-child">Profilul activ</label>
          <select
            id="v2-child"
            value={cloud.selectedBabyId ?? ""}
            disabled={cloud.saving || cloud.loading}
            onChange={(e) => void cloudStore.selectChild(e.target.value)}
          >
            <option value="" disabled>
              Alege un profil
            </option>
            {cloud.children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          {cloud.children.length === 0 && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await cloudStore.createChild(childLabel, 0);
                } catch {
                  setError("Profilul nu a putut fi creat.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label htmlFor="v2-child-label">
                Etichetă opțională pentru profil
              </label>
              <input
                id="v2-child-label"
                maxLength={40}
                value={childLabel}
                onChange={(e) => setChildLabel(e.target.value)}
                placeholder="Copilul meu"
              />
              <button disabled={busy} className="v2-button v2-button-primary">
                Creează profilul
              </button>
            </form>
          )}
          <div className="v2-import-panel">
            <h3>Vrei să păstrezi ideile explorate fără cont?</h3>
            <p>
              Importul adaugă doar favoritele și zilele libere din plan. Nu
              înlocuiește planul din cont și nu importă confirmări, istoricul
              sau datele profilului. Copia locală rămâne disponibilă.
            </p>
            <button
              disabled={busy || imported || !cloud.selectedBabyId}
              className="v2-button v2-button-secondary"
              onClick={async () => {
                setBusy(true);
                try {
                  await cloudStore.importIdeas(
                    previewStore.getSnapshot().state,
                  );
                  setImported(true);
                  announce(
                    "Ideile au fost importate fără înlocuirea planului existent.",
                  );
                } catch {
                  setError(
                    "Importul nu a fost finalizat. Poți relua fără dublare.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {imported ? "Idei importate" : "Importă favoritele și planul"}
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
          <div className="v2-action-row">
            <Link href="/v2/azi" className="v2-button v2-button-primary">
              Continuă în aplicație
              <ArrowRight size={16} />
            </Link>
            <button
              className="v2-button v2-button-secondary"
              onClick={async () => {
                await cloudStore.logout();
                setPassword("");
                setImported(false);
                announce("Ai ieșit din contul de test.");
              }}
            >
              <LogOut size={16} />
              Deconectare
            </button>
          </div>
        </section>
      </>
    );
  return (
    <>
      <PageHeading
        eyebrow="DOAR CONTURI SINTETICE"
        title="Conectează contul de test"
      >
        Conexiunea acceptă exclusiv un server local izolat. Nu folosi datele
        unui cont real.
        {process.env.NEXT_PUBLIC_V2_BACKEND_KIND === "contract-fixture" && " Acest test folosește PostgreSQL și o API compatibilă Supabase, cu autentificare sintetică. Serviciile Supabase complete nu sunt încă validate."}
      </PageHeading>
      <form
        className="v2-profile-section v2-account-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            password.length < 6
          ) {
            setError("Completează un email valid și parola contului de test.");
            return;
          }
          setBusy(true);
          try {
            await cloudStore.login(email, password);
            setPassword("");
            router.push("/v2/azi");
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Conectarea nu a reușit.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor="v2-email">Email de test</label>
        <input
          id="v2-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={254}
        />
        <label htmlFor="v2-password">Parola contului de test</label>
        <input
          id="v2-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          maxLength={200}
        />
        {error && (
          <p className="v2-alert" role="alert">
            {error}
          </p>
        )}
        {!cloud.available && (
          <p className="v2-field-note">
            Conectarea este indisponibilă până la configurarea mediului local.
            Explorarea fără cont rămâne funcțională.
          </p>
        )}
        <button
          className="v2-button v2-button-primary v2-full-width"
          disabled={busy || !cloud.available}
        >
          {busy ? "Se conectează…" : "Conectare în test"}
          <ArrowRight size={17} />
        </button>
        <p className="v2-field-note">
          Parola nu este salvată de aplicație. Sesiunea de autentificare este
          păstrată separat de datele demonstrative.
        </p>
        <Link href="/v2/idei" className="v2-text-link">
          Explorează fără cont
          <ArrowRight size={16} />
        </Link>
      </form>
    </>
  );
}
