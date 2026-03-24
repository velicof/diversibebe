"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import Navbar from "../components/Navbar";

function AccordionCard({
  title,
  preview,
  children,
}: {
  title: string;
  preview: string;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="mb-3 rounded-[16px] bg-white"
      style={{
        fontFamily: '"Nunito", sans-serif',
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full cursor-pointer items-start justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-[15px] font-bold text-[#3D2C3E]">{title}</p>
          {!isOpen ? (
            <p className="mt-2 text-[13px] leading-[1.5] text-[#8B7A8E]">{preview}</p>
          ) : null}
        </div>
        <span
          className={`shrink-0 text-[18px] font-bold leading-none text-[#D4849A] transition-transform ${
            isOpen ? "rotate-90" : ""
          }`}
          aria-hidden
        >
          ›
        </span>
      </button>
      {isOpen ? (
        <div
          className="px-4 pb-4 pt-3 text-[13px] leading-[1.65] text-[#3D2C3E]"
          style={{ borderTop: "1px solid #F5F0F8" }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export default function GhidPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center">
      <main
        className="w-full max-w-[393px] px-6 pb-[88px]"
        style={{ fontFamily: '"Nunito", sans-serif' }}
      >
        <header className="pt-6">
          <button
            type="button"
            onClick={() => router.back()}
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
            Ghid de diversificare 📚
          </h1>
          <p className="mt-1 text-[13px] font-normal text-[#8B7A8E]">
            Tot ce trebuie să știi despre diversificarea bebelușului
          </p>
        </header>

        <div className="mt-6">
          <AccordionCard
            title="📅 Când începem diversificarea?"
            preview="În jurul vârstei de 6 luni (OMS); unii bebeluși de la 4 luni, cu acord medical."
          >
            <ul className="space-y-2">
              <li>• OMS recomandă diversificarea la 6 luni împliniți.</li>
              <li>
                • Semne de pregătire: stă în șezut cu sprijin, a dispărut reflexul de
                împingere cu limba, arată interes față de mâncare.
              </li>
              <li>
                • Unii pediatri recomandă începerea la 4 luni pentru copiii cu risc de
                alergii — doar cu avizul medicului.
              </li>
              <li>• NU începe înainte de 4 luni în niciun caz.</li>
            </ul>
          </AccordionCard>

          <AccordionCard
            title="🍼 Lapte și mese pe vârstă"
            preview="De la 1 masă/zi (4-6 luni) până la 4 mese + lapte redus (12+ luni)."
          >
            <div className="overflow-x-auto rounded-[8px] bg-[#F5F0F8]">
              <table className="w-full min-w-[320px] border-collapse text-[12px]">
                <thead>
                  <tr style={{ backgroundColor: "#EDE7F6" }}>
                    <th className="p-2 text-left font-bold text-[#3D2C3E]">Vârstă</th>
                    <th className="p-2 text-left font-bold text-[#3D2C3E]">Mese/zi</th>
                    <th className="p-2 text-left font-bold text-[#3D2C3E]">Lapte/zi</th>
                    <th className="p-2 text-left font-bold text-[#3D2C3E]">Interval</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["4-6 luni", "1 masă", "700-800ml", "3-4 ore"],
                    ["6-8 luni", "2 mese", "600-700ml", "3-4 ore"],
                    ["8-10 luni", "3 mese", "500-600ml", "3 ore"],
                    ["10-12 luni", "3-4 mese", "400-500ml", "3 ore"],
                    ["12+ luni", "4 mese", "300-400ml", "2.5-3 ore"],
                  ].map((row) => (
                    <tr key={row[0]} className="border-t border-[#EDE7F6]">
                      {row.map((cell) => (
                        <td key={cell} className="p-2 text-[#3D2C3E]">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[12px] italic text-[#8B7A8E]">
              Laptele matern/formula rămâne prioritar până la 12 luni.
            </p>
          </AccordionCard>

          <AccordionCard
            title="📆 Calendarul introducerii alimentelor"
            preview="Ce alimente introduci și când, pas cu pas."
          >
            <div className="space-y-2">
              <p>
                🟢 4-6 luni: Legume (morcov, cartof dulce, dovleac), fructe (măr, pară,
                banană), cereale fără gluten (orez, porumb). Textură: piure fin.
              </p>
              <p>
                🟡 6-8 luni: Gluten (ovăz, paste, pâine), pui, curcan, vită, linte,
                gălbenuș de ou, brânză de vaci, iaurt. Textură: piure gros, bucățele moi.
              </p>
              <p>
                🟠 8-10 luni: Ou întreg, pește (somon, cod), nuci măcinate fin, mai multe
                leguminoase. Textură: cuburi 1cm, bețișoare BLW.
              </p>
              <p>
                🔴 10-12 luni: Arahide (dacă fără risc alergic), fructe de mare, condimente
                ușoare. Textură: bucăți normale.
              </p>
              <p>
                🟣 12+ luni: Lapte de vacă integral, miere, alimentele familiei adaptate.
              </p>
            </div>
          </AccordionCard>

          <AccordionCard
            title="🌾 Reguli de aur ale diversificării"
            preview="Un aliment nou la 3-5 zile, porții mici, fără sare/zahăr."
          >
            <ul className="space-y-1">
              <li>✅ Introduce UN aliment nou la fiecare 3-5 zile</li>
              <li>✅ Începe cu 1-2 lingurițe, crește treptat</li>
              <li>✅ Oferă același aliment de 2-3 ori înainte să decizi că nu-i place</li>
              <li>✅ Textură potrivită vârstei (piure → bucăți)</li>
              <li>✅ Mâncarea e explorare — lasă-l să se murdărească!</li>
              <li>❌ Fără sare până la 12 luni</li>
              <li>❌ Fără zahăr adăugat</li>
              <li>❌ Nu forța bebelușul să mănânce</li>
            </ul>
          </AccordionCard>

          <AccordionCard
            title="⚠️ Alimente interzise sub 1 an"
            preview="Miere, lapte de vacă, sare, zahăr, nuci întregi și altele."
          >
            <div
              className="rounded-[10px] p-3"
              style={{ backgroundColor: "#FFE5E5" }}
            >
              <p className="mb-2 text-[12px] font-bold text-[#9D2D2D]">
                ❌ INTERZIS complet
              </p>
              <ul className="space-y-1">
                <li>• Miere (risc botulism infantil)</li>
                <li>• Lapte de vacă ca băutură principală</li>
                <li>• Sare adăugată</li>
                <li>• Zahăr adăugat</li>
                <li>• Nuci și struguri întregi (risc înecare)</li>
                <li>• Pește cu mercur: ton, pește-spadă, rechin</li>
                <li>• Mezeluri, alimente ultra-procesate</li>
                <li>• Sucuri de fructe</li>
              </ul>
            </div>
            <div
              className="mt-3 rounded-[10px] p-3"
              style={{ backgroundColor: "#FFF3CD" }}
            >
              <p className="mb-2 text-[12px] font-bold text-[#8A6A16]">⚠️ Cu precauție</p>
              <ul className="space-y-1">
                <li>
                  • Alergeni majori: ou, pește, nuci, grâu, lactate, soia, arahide
                </li>
                <li>• Introduce separat, observă 3 zile fiecare</li>
              </ul>
            </div>
          </AccordionCard>

          <AccordionCard
            title="🦠 Alergeni — cum îi introducem"
            preview="Cei 8 alergeni principali, introducere timpurie de la 6 luni."
          >
            <p className="mb-2">
              Studiile arată că introducerea timpurie (6-12 luni) REDUCE riscul de alergii.
            </p>
            <ul className="space-y-1">
              <li>🥚 Ou: gălbenuș la 6 luni, albuș la 8 luni. Observă 48-72h.</li>
              <li>🐟 Pește: somon/cod la 8 luni. Verifică oasele! Observă 48-72h.</li>
              <li>
                🥜 Arahide: pastă fină la 8-10 luni dacă fără risc. NU întregi niciodată
                sub 5 ani.
              </li>
              <li>
                🌾 Gluten: paste/pâine/ovăz de la 6 luni. Observă balonare, disconfort.
              </li>
              <li>
                🥛 Lactate: iaurt/brânză de vaci de la 6 luni. Lapte de vacă ca băutură de
                la 12 luni.
              </li>
            </ul>
            <p className="mt-2 text-[12px] italic text-[#8B7A8E]">
              Dacă există istoric familial de alergii, consultați alergologul înainte.
            </p>
          </AccordionCard>

          <AccordionCard
            title="⏰ Programul zilnic pe vârste"
            preview="De la o masă pe zi (4-6 luni) până la 3 mese + gustări (10-12 luni)."
          >
            <div className="space-y-2">
              <p>
                <strong>4-6 luni:</strong> 08:00 Lapte | 10:00 Masă solidă (2-3 linguri) |
                12:00 Lapte | 15:00 Lapte | 18:00 Lapte | 21:00 Lapte
              </p>
              <p>
                <strong>8-10 luni:</strong> 07:00 Lapte | 08:30 Mic dejun | 10:30 Gustare |
                12:30 Prânz | 15:00 Lapte | 18:00 Cină | 20:30 Lapte
              </p>
              <p>
                <strong>12+ luni:</strong> 07:30 Mic dejun | 10:00 Gustare | 13:00 Prânz |
                16:00 Gustare | 19:00 Cină | Lapte dimineața și seara
              </p>
            </div>
          </AccordionCard>

          <AccordionCard
            title="✋ Finger food — ghid de siguranță"
            preview="De la ~8 luni: forme sigure, alimente moi; evită rotunde, tari și risc de sufocare."
          >
            <p className="mb-1 font-bold text-[#3D2C3E]">FORME SIGURE ✅</p>
            <p className="mb-2">
              bețișoare lungi (5-6cm), cuburi moi 1cm, felii subțiri
            </p>
            <p className="mb-1 font-bold text-[#3D2C3E]">EVITĂ ❌</p>
            <p className="mb-2">
              rotunde (struguri, roșii cherry întregi), tari (morcov crud, măr crud),
              lipicioase (unt de arahide pur), oase de pește
            </p>
            <p className="mb-1 font-bold text-[#3D2C3E]">TESTE DE SIGURANȚĂ</p>
            <ul className="space-y-1">
              <li>🤏 Test deget: alimentul trebuie să se strivească ușor între degete</li>
              <li>📏 Dimensiune: nu mai mică decât poate înghiți întreg</li>
              <li>🌡️ Temperatura: răcit complet înainte de servit</li>
            </ul>
          </AccordionCard>

          <AccordionCard
            title="💡 Sfaturi esențiale"
            preview="8 sfaturi de la experți pentru o diversificare reușită."
          >
            <ol className="space-y-1">
              <li>1. 🎯 Începe când vezi semne reale de pregătire, nu doar după vârstă.</li>
              <li>2. 🧘 Păstrează mesele relaxate, fără presiune sau grabă.</li>
              <li>3. 📓 Notează alimentele noi și reacțiile în primele 72h.</li>
              <li>4. 🔁 Repetă alimentele respinse; acceptarea vine în timp.</li>
              <li>5. 🥗 Varietate săptămânală: legume, proteine, cereale, fructe.</li>
              <li>6. 💧 Oferă puțină apă la masă după 6 luni.</li>
              <li>7. 👨‍👩‍👧 Mâncați împreună: bebelușul învață prin imitare.</li>
              <li>8. ❤️ Urmează semnalele de foame și sațietate ale copilului.</li>
            </ol>
          </AccordionCard>

          <AccordionCard
            title="🛒 Echipamentul necesar"
            preview="Scaun de masă, farfurii cu ventuză, lingurițe moi, blender, bavețică și altele."
          >
            <p className="font-bold text-[#2F7A5A]">ESENȚIAL 🟢</p>
            <p className="mb-2">
              scaun de masă cu tăviță, blender/procesor, farfurie cu ventuză, lingurițe
              de silicon moi, bavețică cu buzunar, cupe de depozitare cu capac
            </p>
            <p className="font-bold text-[#8A6A16]">UTIL 🟡</p>
            <p className="mb-2">
              sterilizator, răzătoare fină, presă de piure, aparat de gătit la abur
            </p>
            <p className="font-bold text-[#3D6DB5]">NICE TO HAVE 🔵</p>
            <p>
              set farfurii compartimentate, lingurițe de auto-alimentare, masă de picnic
              pentru exterior
            </p>
          </AccordionCard>
        </div>

        <p className="mt-4 text-[13px] text-[#8B7A8E] leading-relaxed">
          📖 Bazat pe recomandările OMS, Societatea Română de Pediatrie și ghidurile europene de
          diversificare.
        </p>
      </main>

      <Navbar activeTab="ghid" />
    </div>
  );
}
