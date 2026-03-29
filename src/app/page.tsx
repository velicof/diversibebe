"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@/lib/useUser";

const cardShadow = "0 4px 20px rgba(61, 44, 62, 0.08)";
const cardShadowSm = "0 2px 12px rgba(61, 44, 62, 0.06)";

export default function Home() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return null;
  }

  if (user) {
    return null;
  }

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: "#FFF8F6",
        fontFamily: "Nunito, system-ui, sans-serif",
      }}
    >
      <div className="mx-auto w-full max-w-[393px] px-5 pb-16">
        {/* HERO */}
        <header id="hero" className="pt-12 pb-12 text-center">
          <div
            className="mx-auto flex h-[88px] w-[88px] items-center justify-center rounded-[24px] text-[48px]"
            style={{
              background: "linear-gradient(145deg, #A8DCD1 0%, #C4B5E0 100%)",
              boxShadow: cardShadowSm,
            }}
            aria-hidden
          >
            🥕
          </div>
          <h1
            className="mt-6 text-[26px] font-extrabold leading-[1.25] tracking-tight"
            style={{ color: "#3D2C3E" }}
          >
            Diversificarea bebelușului tău, pas cu pas.
          </h1>
          <p
            className="mt-4 text-[15px] font-semibold leading-relaxed"
            style={{ color: "#6B5B71" }}
          >
            DiversiBebe te ghidează zilnic cu rețete, plan săptămânal și jurnal
            de alimente — totul gratuit.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/register"
              className="flex h-[52px] w-full items-center justify-center rounded-[20px] text-[16px] font-extrabold text-white transition-opacity hover:opacity-95 active:opacity-90"
              style={{
                background: "#D4849A",
                boxShadow: "0 6px 20px rgba(212, 132, 154, 0.35)",
              }}
            >
              Începe gratuit
            </Link>
            <Link
              href="/login"
              className="text-center text-[15px] font-bold transition-opacity hover:opacity-80"
              style={{ color: "#D4849A" }}
            >
              Am deja cont
            </Link>
          </div>
          <p
            className="mt-8 text-[12px] font-semibold leading-relaxed"
            style={{ color: "#8B7A8E" }}
          >
            ✓ Gratuit &nbsp; ✓ În română &nbsp; ✓ Bazat pe ghiduri pediatrice
          </p>
        </header>

        {/* FEATURES */}
        <section id="features" className="py-12">
          <h2
            className="mb-6 text-center text-[20px] font-extrabold"
            style={{ color: "#3D2C3E" }}
          >
            Tot ce ai nevoie
          </h2>
          <div className="flex flex-col gap-4">
            <article
              className="rounded-[20px] bg-white p-5"
              style={{ boxShadow: cardShadow }}
            >
              <div className="text-[28px] leading-none">🗓️</div>
              <h3
                className="mt-3 text-[17px] font-extrabold"
                style={{ color: "#3D2C3E" }}
              >
                Plan săptămânal
              </h3>
              <p
                className="mt-2 text-[14px] font-semibold leading-snug"
                style={{ color: "#6B5B71" }}
              >
                Mese adaptate vârstei bebelușului tău, generate automat.
              </p>
            </article>
            <article
              className="rounded-[20px] bg-white p-5"
              style={{ boxShadow: cardShadow }}
            >
              <div className="text-[28px] leading-none">📖</div>
              <h3
                className="mt-3 text-[17px] font-extrabold"
                style={{ color: "#3D2C3E" }}
              >
                Jurnal de alimente
              </h3>
              <p
                className="mt-2 text-[14px] font-semibold leading-snug"
                style={{ color: "#6B5B71" }}
              >
                Notează ce a mâncat, cum a reacționat și urmărește progresul.
              </p>
            </article>
            <article
              className="rounded-[20px] bg-white p-5"
              style={{ boxShadow: cardShadow }}
            >
              <div className="text-[28px] leading-none">🤖</div>
              <h3
                className="mt-3 text-[17px] font-extrabold"
                style={{ color: "#3D2C3E" }}
              >
                BebeAsist AI
              </h3>
              <p
                className="mt-2 text-[14px] font-semibold leading-snug"
                style={{ color: "#6B5B71" }}
              >
                Asistent personal care răspunde la întrebările tale despre
                diversificare.
              </p>
            </article>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="cum-functioneaza" className="py-12">
          <h2
            className="mb-6 text-center text-[20px] font-extrabold"
            style={{ color: "#3D2C3E" }}
          >
            Cum funcționează
          </h2>
          <div
            className="rounded-[24px] p-6"
            style={{
              background: "linear-gradient(160deg, #E8F7F3 0%, #EDE8F5 100%)",
              boxShadow: cardShadowSm,
            }}
          >
            <ol className="flex flex-col gap-5">
              {[
                "Creezi contul gratuit în 1 minut",
                "Adaugi profilul bebelușului",
                "Primești plan personalizat și începi diversificarea",
              ].map((text, i) => (
                <li key={i} className="flex gap-4">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-[15px] font-extrabold text-white"
                    style={{ background: "#D4849A" }}
                  >
                    {i + 1}
                  </span>
                  <p
                    className="pt-1.5 text-[15px] font-bold leading-snug"
                    style={{ color: "#3D2C3E" }}
                  >
                    {text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* SOCIAL PROOF */}
        <section className="py-12">
          <div className="flex flex-col gap-3 text-center">
            <p
              className="text-[14px] font-bold"
              style={{ color: "#0F6E56" }}
            >
              Bazat pe ghiduri pediatrice românești
            </p>
            <p
              className="text-[14px] font-bold"
              style={{ color: "#6B5B71" }}
            >
              Rețete testate și aprobate de nutriționiști
            </p>
          </div>
          <blockquote
            className="mt-8 rounded-[20px] border-2 bg-white p-5 text-left"
            style={{
              borderColor: "#C4B5E0",
              boxShadow: cardShadow,
            }}
          >
            <p
              className="text-[15px] font-semibold italic leading-relaxed"
              style={{ color: "#3D2C3E" }}
            >
              &ldquo;Nu știam de unde să încep cu diversificarea. DiversiBebe
              mi-a dat un plan clar și am știut exact ce să îi dau Sofiei în
              fiecare zi. Prima oară când a mâncat morcov piure a fost magic!
              🥕&rdquo;
            </p>
            <footer
              className="mt-4 text-[13px] font-bold"
              style={{ color: "#8B7A8E" }}
            >
              <div>— Andreea M.</div>
              <div className="mt-1 font-semibold">Mamă a Sofiei, 7 luni</div>
            </footer>
          </blockquote>
        </section>

        {/* FINAL CTA */}
        <section id="cta-final" className="py-12 text-center">
          <div
            className="rounded-[24px] px-6 py-10"
            style={{
              background: "linear-gradient(135deg, #D4849A 0%, #C4B5E0 100%)",
              boxShadow: "0 8px 28px rgba(196, 181, 224, 0.45)",
            }}
          >
            <h2 className="text-[22px] font-extrabold leading-tight text-white">
              Gata să începi diversificarea?
            </h2>
            <Link
              href="/register"
              className="mt-6 flex h-[52px] w-full items-center justify-center rounded-[20px] text-[16px] font-extrabold transition-opacity hover:opacity-95 active:opacity-90"
              style={{
                background: "#FFF8F6",
                color: "#D4849A",
                boxShadow: cardShadowSm,
              }}
            >
              Creează cont gratuit
            </Link>
            <p className="mt-4 text-[12px] font-bold text-white/90">
              Fără card. Fără abonament obligatoriu.
            </p>
          </div>
        </section>

        {/* FOOTER */}
        <footer
          id="contact"
          className="border-t pt-12 pb-8 text-center"
          style={{ borderColor: "rgba(200, 181, 224, 0.35)" }}
        >
          <p
            className="text-[12px] font-semibold"
            style={{ color: "#8B7A8E" }}
          >
            © 2025 DiversiBebe · diversibebe.com
          </p>
          <nav
            className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[13px] font-bold"
            style={{ color: "#D4849A" }}
          >
            <Link href="/" className="hover:opacity-80">
              Acasă
            </Link>
            <span style={{ color: "#C4B5E0" }} aria-hidden>
              ·
            </span>
            <Link href="#features" className="hover:opacity-80">
              Despre
            </Link>
            <span style={{ color: "#C4B5E0" }} aria-hidden>
              ·
            </span>
            <a
              href="mailto:contact@diversibebe.com"
              className="hover:opacity-80"
            >
              Contact
            </a>
          </nav>
        </footer>
      </div>
    </div>
  );
}
