"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import { getCurrentUser, registerUser, type UserAccount } from "../../lib/store";

type Gender = "boy" | "girl";

function CameraIcon() {
  return <span style={{ fontSize: 14, lineHeight: 1 }}>📷</span>;
}

export default function ProfilBebelusPage() {
  const router = useRouter();
  const { userId } = useUser();
  const current = getCurrentUser();
  const [babyName, setBabyName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState<Gender>("boy");

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    supabase
      .from("babies")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBabyName(data.name || "");
          setBirthDate(data.birthdate || "");
          setWeight(
            data.weight_kg != null && !Number.isNaN(Number(data.weight_kg))
              ? String(Math.round(Number(data.weight_kg) * 1000))
              : ""
          );
          if (data.gender === "girl" || data.gender === "boy") {
            setGender(data.gender);
          }
        }
      });
  }, [userId]);

  const allergyTags = useMemo(
    () => [
      {
        key: "cartof-dulce",
        text: current?.baby.allergies?.[0] || "Cartof dulce",
        bg: "#FAEEDA",
        color: "#854F0B",
      },
      { key: "add", text: "+ Adaugă", bg: "#FFFFFF", color: "#B8A9BB", dashed: true },
    ],
    [current?.baby.allergies]
  );

  const handleSave = async () => {
    if (!userId) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("babies")
      .update({
        name: babyName,
        birthdate: birthDate,
        weight_kg: weight
          ? parseFloat(weight.replace(",", ".")) / 1000
          : null,
        gender,
      })
      .eq("user_id", userId);
    if (error) {
      alert("Eroare: " + error.message);
    } else {
      alert("Salvat!");
      if (current) {
        const updated: UserAccount = {
          ...current,
          baby: {
            ...current.baby,
            name: babyName.trim(),
            birthDate: birthDate.trim(),
            weight: weight.trim(),
            gender,
          },
        };
        registerUser(updated);
      }
      router.push("/profil");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center px-6 pb-[24px]">
      <main className="w-full max-w-[393px]">
        <header className="pt-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/profil")}
              className="text-[22px] text-[#3D2C3E] leading-none cursor-pointer bg-transparent border-0 p-0"
              aria-label="Înapoi"
            >
              ←
            </button>
            <h1 className="text-[18px] font-extrabold text-[#3D2C3E]">
              Profilul bebelușului
            </h1>
          </div>
        </header>

        <section className="mt-6 flex flex-col items-center text-center">
          <div className="relative w-[88px] h-[88px] rounded-full bg-[#FDE8EE] flex items-center justify-center">
            <span className="text-[44px] leading-none">👶</span>
            <div className="absolute bottom-0 right-0 w-[28px] h-[28px] rounded-full bg-[#D4849A] flex items-center justify-center">
              <CameraIcon />
            </div>
          </div>
        </section>

        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          <div>
            <div className="text-[12px] font-semibold text-[#8B7A8E] mb-2">Numele bebelușului</div>
            <input
              value={babyName}
              onChange={(e) => setBabyName(e.target.value)}
              className="w-full py-[14px] px-[16px] bg-white border border-[#EDE7F6] rounded-2xl text-[15px] text-[#3D2C3E] outline-none"
            />
          </div>

          <div>
            <div className="text-[12px] font-semibold text-[#8B7A8E] mb-2">Data nașterii</div>
            <input
              type="date"
              max={new Date().toISOString().split("T")[0]}
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full py-[14px] px-[16px] bg-white border border-[#EDE7F6] rounded-2xl text-[15px] text-[#3D2C3E] outline-none"
            />
          </div>

          <div>
            <div className="text-[12px] font-semibold text-[#8B7A8E] mb-2">
              Greutate la naștere <span className="font-normal">(în grame)</span>
            </div>
            <input
              type="number"
              step="1"
              min="500"
              max="15000"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full py-[14px] px-[16px] bg-white border border-[#EDE7F6] rounded-2xl text-[15px] text-[#3D2C3E] outline-none"
            />
          </div>

          <div>
            <div className="text-[12px] font-semibold text-[#8B7A8E] mb-2">Gen</div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setGender("boy")}
                className="flex-1 py-[12px] rounded-[16px] font-semibold cursor-pointer text-[14px]"
                style={{
                  background: gender === "boy" ? "#A8D8E8" : "#FFFFFF",
                  border: gender === "boy" ? "2px solid #A8D8E8" : "1px solid #EDE7F6",
                  color: gender === "boy" ? "#FFFFFF" : "#8B7A8E",
                }}
              >
                👦 Băiat
              </button>
              <button
                type="button"
                onClick={() => setGender("girl")}
                className="flex-1 py-[12px] rounded-[16px] font-semibold cursor-pointer text-[14px]"
                style={{
                  background: gender === "girl" ? "#E8B4D0" : "#FFFFFF",
                  border: gender === "girl" ? "2px solid #E8B4D0" : "1px solid #EDE7F6",
                  color: gender === "girl" ? "#FFFFFF" : "#8B7A8E",
                }}
              >
                👧 Fată
              </button>
            </div>
          </div>

          <div>
            <div className="text-[12px] font-semibold text-[#8B7A8E] mb-2">Alergii cunoscute</div>
            <div className="flex gap-3 flex-wrap">
              {allergyTags.map((t) => (
                <span
                  key={t.key}
                  className="px-[14px] py-[6px] rounded-full text-[12px] font-semibold"
                  style={{
                    background: t.dashed ? "#FFFFFF" : t.bg,
                    color: t.color,
                    border: t.dashed ? "2px dashed #EDE7F6" : "none",
                  }}
                >
                  {t.text}
                </span>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="mt-5 h-12 w-full rounded-full bg-[#D4849A] text-white font-bold cursor-pointer"
          >
            Salvează modificările
          </button>
        </form>
      </main>
    </div>
  );
}
