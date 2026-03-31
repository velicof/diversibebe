"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";

type HelpCard = {
  title: string;
  text: string;
};

const FAQ_CARDS: HelpCard[] = [
  {
    title: "🍽️ Cum adaug o masă în jurnal?",
    text: "Apasă butonul + din dashboard sau mergi la tab-ul Jurnal",
  },
  {
    title: "📅 Cum funcționează planul săptămânal?",
    text: "Mergi la tab-ul Plan și apasă Regenerează pentru un plan personalizat vârstei bebelușului",
  },
  {
    title: "🥕 Cum văd alimentele potrivite vârstei?",
    text: "Tab-ul Alimente afișează automat alimentele recomandate pentru vârsta bebelușului tău",
  },
  {
    title: "⚠️ Cum urmăresc o alergie?",
    text: "Când jurnalizezi o masă, selectează reacția — dacă e alergie, apare automat în tab-ul Alergii",
  },
];

export default function AjutorPage() {
  const router = useRouter();
  const [notice, setNotice] = useState("");

  return (
    <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center">
      <main
        className="w-full max-w-[393px] px-6 pb-[120px]"
        style={{ fontFamily: '"Nunito", sans-serif' }}
      >
        <header className="pt-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/profil")}
              className="cursor-pointer leading-none"
              style={{
                color: "#D4849A",
                fontSize: 20,
                padding: 8,
                background: "none",
                border: "none",
              }}
              aria-label="Înapoi"
            >
              ←
            </button>
            <h1 className="text-[22px] font-extrabold text-[#3D2C3E]">
              Ajutor & suport
            </h1>
          </div>
        </header>

        <section className="mt-5 flex flex-col gap-3">
          {FAQ_CARDS.map((card) => (
            <article
              key={card.title}
              className="bg-white border border-[#EDE7F6] rounded-[16px] p-4"
            >
              <h2
                className="font-bold text-[14px]"
                style={{ color: "#3D2C3E" }}
              >
                {card.title}
              </h2>
              <p
                className="mt-1 text-[13px]"
                style={{ color: "#8B7A8E" }}
              >
                {card.text}
              </p>
            </article>
          ))}

          <article className="bg-white border border-[#EDE7F6] rounded-[16px] p-4">
            <h2 className="font-bold text-[14px]" style={{ color: "#3D2C3E" }}>
              💬 Ai altă întrebare?
            </h2>
            <p className="mt-1 text-[13px]" style={{ color: "#8B7A8E" }}>
              Folosește BebeAsist — asistentul nostru AI răspunde la orice întrebare despre diversificare
            </p>
            <button
              type="button"
              className="mt-3 rounded-full bg-[#D4849A] px-4 py-2 text-[13px] font-bold text-white cursor-pointer"
              onClick={() =>
                setNotice("BebeAsist este disponibil în colțul de jos al oricărei pagini din aplicație.")
              }
            >
              Deschide BebeAsist
            </button>
            {notice ? (
              <p className="mt-2 text-[12px]" style={{ color: "#8B7A8E" }}>
                {notice}
              </p>
            ) : null}
          </article>
        </section>
      </main>

      <Navbar activeTab="acasa" />
    </div>
  );
}
