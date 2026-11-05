"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import { getCurrentUser, registerUser, saveOnboardingBabyProfile, type UserAccount } from "../../lib/store";
import BabyAvatar from "../../components/BabyAvatar";

type Gender = "boy" | "girl";

type AllergyTag = {
  key: string;
  text: string;
  bg: string;
  color: string;
  dashed?: boolean;
};

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
  const [allergies, setAllergies] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [babyId, setBabyId] = useState<string | null>(null);
  const [showAllergyPicker, setShowAllergyPicker] = useState(false);

  const COMMON_ALLERGIES = [
    "Lapte",
    "Ou",
    "Grâu",
    "Soia",
    "Nuci",
    "Pește",
    "Crustacee",
    "Arahide",
  ] as const;

  useEffect(() => {
    setAllergies(current?.baby.allergies ?? []);
  }, [current?.baby.allergies]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    supabase
      .from("babies")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBabyId(data.id);
          setBabyName(data.name || "");
          setBirthDate(data.birthdate || "");
          setAvatarUrl(data.avatar_url || null);
          setWeight(
            data.weight_kg != null && !Number.isNaN(Number(data.weight_kg))
              ? String(Math.round(Number(data.weight_kg) * 1000))
              : ""
          );
          if (data.gender === "girl" || data.gender === "boy") {
            setGender(data.gender);
          }
          setAllergies(Array.isArray(data.allergies) ? (data.allergies as string[]) : []);
        }
      });
  }, [userId]);

  const allergyTags = useMemo((): AllergyTag[] => {
    const fromAllergies: AllergyTag[] = allergies.map((allergy) => ({
      key: allergy,
      text: allergy,
      bg: "#FAEEDA",
      color: "#854F0B",
    }));
    return fromAllergies;
  }, [allergies]);

  const handleSave = async () => {
    if (!userId || !babyId) return;
    const supabase = createClient();
    // Update only the child shown on this page. `babies` has no allergies column: they stay in the
    // local profile below (sending the field rejected the whole save).
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
      .eq("id", babyId)
      .eq("user_id", userId);
    if (error) {
      alert("Eroare: " + error.message);
    } else {
      alert("Salvat!");
      // Sync baby data into the local store so the dashboard redirect guard
      // doesn't see an empty baby name and bounce the user to /onboarding.
      const latestUser = getCurrentUser();
      if (latestUser) {
        const updated: UserAccount = {
          ...latestUser,
          baby: {
            ...latestUser.baby,
            name: babyName.trim(),
            birthDate: birthDate.trim(),
            weight: weight.trim(),
            gender,
            allergies,
          },
        };
        registerUser(updated);
      } else {
        // Fallback for Google OAuth users whose session hasn't been synced to
        // localStorage yet — saveOnboardingBabyProfile only needs currentUser
        // to exist, but if it's truly null we at least try the lighter update.
        saveOnboardingBabyProfile({
          name: babyName.trim(),
          birthDate: birthDate.trim(),
          gender,
          allergies,
        });
      }
      router.back();
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center px-6 pb-[24px]">
      <main className="w-full max-w-[393px]">
        <header className="pt-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="relative z-10 text-[22px] text-[#3D2C3E] leading-none cursor-pointer bg-transparent border-0 p-0"
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
            <BabyAvatar avatarUrl={avatarUrl} size={88} />
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
                    background: t.bg,
                    color: t.color,
                    border: "none",
                  }}
                >
                  {t.text}
                </span>
              ))}
              <button
                type="button"
                onClick={() => setShowAllergyPicker(true)}
                className="px-[14px] py-[6px] rounded-full text-[12px] font-semibold cursor-pointer"
                style={{
                  background: "#FFFFFF",
                  color: "#B8A9BB",
                  border: "2px dashed #EDE7F6",
                }}
              >
                + Adaugă
              </button>
            </div>

            {showAllergyPicker ? (
              <div
                className="mt-3 w-full rounded-[16px] border border-[#EDE7F6] bg-white p-3"
                role="dialog"
                aria-label="Picker alergii"
              >
                <div className="text-[12px] font-semibold text-[#8B7A8E]">Alege un alergen</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COMMON_ALLERGIES.filter((a) => !allergies.includes(a)).length === 0 ? (
                    <div className="text-[12px] text-[#8B7A8E]">Toate sunt deja selectate.</div>
                  ) : null}
                  {COMMON_ALLERGIES.filter((a) => !allergies.includes(a)).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => {
                        setAllergies((prev) => [...prev, a]);
                        setShowAllergyPicker(false);
                      }}
                      className="px-[12px] py-[6px] rounded-full text-[12px] font-semibold cursor-pointer"
                      style={{
                        background: "#FAEEDA",
                        color: "#854F0B",
                        border: "none",
                      }}
                    >
                      {a}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="mt-3 w-full rounded-[14px] py-2 text-[13px] font-bold cursor-pointer border-0"
                  style={{ background: "#EDE7F6", color: "#8B7A8E" }}
                  onClick={() => setShowAllergyPicker(false)}
                >
                  Închide
                </button>
              </div>
            ) : null}
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
