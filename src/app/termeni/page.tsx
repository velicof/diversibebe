"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";

export default function TermeniPage() {
  const router = useRouter();

  const content = useMemo(
    () => (
      <div className="space-y-6 pb-6">
        <div>
          <h2 className="text-[16px] font-bold text-[#3D2C3E] mb-2">
            1. Informații generale
          </h2>
          <p className="text-[14px] text-[#3D2C3E] leading-[1.8]">
            DiversiBebe este o aplicație mobilă destinată părinților din România,
            care oferă ghidare în procesul de diversificare a alimentației
            bebelușilor. Aplicația este oferită de [Numele companiei tale], cu
            sediul în România.
          </p>
        </div>

        <div>
          <h2 className="text-[16px] font-bold text-[#3D2C3E] mb-2">
            2. Acceptarea termenilor
          </h2>
          <p className="text-[14px] text-[#3D2C3E] leading-[1.8]">
            Prin utilizarea aplicației DiversiBebe, acceptați în totalitate
            acești Termeni și Condiții. Dacă nu sunteți de acord cu oricare
            dintre acești termeni, vă rugăm să nu utilizați aplicația.
          </p>
        </div>

        <div>
          <h2 className="text-[16px] font-bold text-[#3D2C3E] mb-2">
            3. Descrierea serviciului
          </h2>
          <p className="text-[14px] text-[#3D2C3E] leading-[1.8]">
            DiversiBebe oferă:
          </p>
          <ul className="mt-2 pl-5 space-y-2 text-[14px] text-[#3D2C3E] leading-[1.8] list-disc">
            <li>Informații orientative despre diversificarea alimentației bebelușilor</li>
            <li>Calendar alimentar bazat pe recomandări generale</li>
            <li>Rețete adaptate vârstei bebelușului</li>
            <li>Jurnal de tracking al alimentelor introduse</li>
            <li>Monitorizarea reacțiilor alergice</li>
          </ul>
        </div>

        <div>
          <h2 className="text-[16px] font-bold text-[#3D2C3E] mb-2">
            4. Disclaimer medical
          </h2>
          <p className="text-[14px] text-[#3D2C3E] leading-[1.8]">
            IMPORTANT: DiversiBebe NU este un substitut pentru consultul medical.
            Informațiile din aplicație au caracter orientativ și educațional.
            Consultați întotdeauna medicul pediatru al copilului dumneavoastră
            înainte de a introduce alimente noi în dieta bebelușului. Fiecare
            copil este unic, iar recomandările pot varia.
          </p>
        </div>

        <div>
          <h2 className="text-[16px] font-bold text-[#3D2C3E] mb-2">
            5. Conturi și înregistrare
          </h2>
          <p className="text-[14px] text-[#3D2C3E] leading-[1.8]">
            Pentru a utiliza funcționalitățile complete ale aplicației, este
            necesară crearea unui cont. Sunteți responsabil pentru păstrarea
            confidențialității datelor de autentificare.
          </p>
        </div>

        <div>
          <h2 className="text-[16px] font-bold text-[#3D2C3E] mb-2">
            6. Abonamente și plăți
          </h2>
          <p className="text-[14px] text-[#3D2C3E] leading-[1.8]">
            DiversiBebe funcționează pe un model freemium:
          </p>
          <ul className="mt-2 pl-5 space-y-2 text-[14px] text-[#3D2C3E] leading-[1.8] list-disc">
            <li>
              Versiunea gratuită: acces la funcționalități de bază
            </li>
            <li>
              Versiunea Premium: acces complet la rețete, plan săptămânal și
              funcționalități avansate
            </li>
          </ul>
          <p className="mt-2 text-[14px] text-[#3D2C3E] leading-[1.8]">
            Abonamentele se reînnoiesc automat. Puteți anula oricând din
            setările contului. Rambursările se efectuează conform politicilor
            App Store / Google Play.
          </p>
        </div>

        <div>
          <h2 className="text-[16px] font-bold text-[#3D2C3E] mb-2">
            7. Proprietate intelectuală
          </h2>
          <p className="text-[14px] text-[#3D2C3E] leading-[1.8]">
            Tot conținutul aplicației (texte, rețete, design, imagini) este
            proprietatea DiversiBebe și este protejat de legile drepturilor de
            autor.
          </p>
        </div>

        <div>
          <h2 className="text-[16px] font-bold text-[#3D2C3E] mb-2">
            8. Protecția datelor personale
          </h2>
          <p className="text-[14px] text-[#3D2C3E] leading-[1.8]">
            Respectăm Regulamentul General privind Protecția Datelor (GDPR).
            Colectăm doar datele necesare funcționării aplicației: nume, email,
            date despre bebeluș. Nu vindem și nu partajăm datele
            dumneavoastră cu terți. Puteți solicita ștergerea datelor oricând.
          </p>
        </div>

        <div>
          <h2 className="text-[16px] font-bold text-[#3D2C3E] mb-2">
            9. Limitarea răspunderii
          </h2>
          <p className="text-[14px] text-[#3D2C3E] leading-[1.8]">
            DiversiBebe nu este responsabilă pentru deciziile luate pe baza
            informațiilor din aplicație. Utilizarea aplicației se face pe propria
            răspundere.
          </p>
        </div>

        <div>
          <h2 className="text-[16px] font-bold text-[#3D2C3E] mb-2">
            10. Modificări ale termenilor
          </h2>
          <p className="text-[14px] text-[#3D2C3E] leading-[1.8]">
            Ne rezervăm dreptul de a modifica acești termeni. Utilizatorii vor
            fi notificați prin aplicație despre orice modificare.
          </p>
        </div>

        <div>
          <h2 className="text-[16px] font-bold text-[#3D2C3E] mb-2">
            11. Contact
          </h2>
          <p className="text-[14px] text-[#3D2C3E] leading-[1.8]">
            Pentru întrebări sau reclamații: contact@diversibebe.ro
          </p>
          <p className="mt-4 text-[14px] text-[#3D2C3E] leading-[1.8]">
            Ultima actualizare: Martie 2026
          </p>
        </div>
      </div>
    ),
    []
  );

  return (
    <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center">
      <main className="w-full max-w-[393px] px-6 pb-8 flex flex-col">
        <header className="pt-6">
          <button
            type="button"
            className="text-[22px] text-[#3D2C3E] leading-none cursor-pointer"
            onClick={() => router.back()}
            aria-label="Înapoi"
          >
            ←
          </button>
          <h1 className="mt-2 text-[20px] font-extrabold text-[#3D2C3E]">
            Termeni și Condiții
          </h1>
        </header>

        <div className="mt-4 flex-1 overflow-y-auto pr-1">{content}</div>

        <button
          type="button"
          className="h-12 w-full rounded-full bg-[#D4849A] text-white font-bold cursor-pointer"
          onClick={() => router.back()}
        >
          Am înțeles
        </button>
      </main>
    </div>
  );
}

