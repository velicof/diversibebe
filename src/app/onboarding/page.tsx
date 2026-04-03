"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/useUser";
import { createClient } from "@/lib/supabase/client";
import { upsertCurrentBaby } from "@/app/lib/supabaseData";
import { saveOnboardingBabyProfile } from "../lib/store";

type Gender = "boy" | "girl" | null;

export default function OnboardingPage() {
  const router = useRouter();
  const { userId, loading } = useUser();
  const [checking, setChecking] = useState(true);
  const [babyName, setBabyName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender>(null);

  useEffect(() => {
    if (loading) return;
    if (!userId) {
      router.replace("/login");
      return;
    }
    const supabase = createClient();
    void (async () => {
      try {
        const { data } = await supabase
          .from("babies")
          .select("id, name, birthdate")
          .eq("user_id", userId)
          .maybeSingle();
        if (data?.name && data?.birthdate) {
          await new Promise((r) => setTimeout(r, 100));
          router.replace("/dashboard");
          return;
        } else {
          setChecking(false);
        }
      } catch {
        setChecking(false);
      }
    })();
  }, [userId, loading, router]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!loading && !userId) router.replace("/login");
    }, 3000);
    return () => clearTimeout(timeout);
  }, [userId, loading, router]);

  const canSubmit =
    babyName.trim().length >= 2 && birthDate.trim().length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    saveOnboardingBabyProfile({
      name: babyName.trim(),
      birthDate: birthDate.trim(),
      gender,
    });
    await upsertCurrentBaby({
      name: babyName.trim(),
      birthdate: birthDate.trim(),
      gender,
    });
    router.push("/dashboard");
  }

  if (checking)
    return (
      <div className="min-h-screen w-full bg-[#FFF8F6] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[#D4849A] border-t-transparent animate-spin" />
      </div>
    );

  return (
    <div
      className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center px-6 py-8"
      style={{ fontFamily: '"Nunito", sans-serif' }}
    >
      <main className="w-full max-w-[393px]">
        <h1 className="text-[24px] font-extrabold text-[#3D2C3E] text-center">
          Aproape gata! 👶
        </h1>
        <p className="mt-2 text-center text-[14px] text-[#8B7A8E]">
          Spune-ne despre bebelușul tău
        </p>

        <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
          <input
            value={babyName}
            onChange={(e) => setBabyName(e.target.value)}
            className="h-12 w-full rounded-2xl border border-[#EDE7F6] bg-white px-4 text-[14px] placeholder:text-[#B8A9BB] outline-none"
            placeholder="Numele bebelușului"
            type="text"
            autoComplete="off"
            style={{ color: "#3D2C3E" }}
          />

          <input
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="h-12 w-full rounded-2xl border border-[#EDE7F6] bg-white px-4 text-[14px] outline-none"
            type="date"
            max={new Date().toISOString().split("T")[0]}
            style={{
              color: '#3D2C3E',
              WebkitTextFillColor: '#3D2C3E',
              opacity: 1
            }}
          />

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setGender((g) => (g === "boy" ? null : "boy"))}
              className={`h-12 rounded-2xl border font-bold text-[14px] ${
                gender === "boy"
                  ? "bg-[#A8D8E8] border-[#A8D8E8] text-white"
                  : "bg-white border-[#EDE7F6] text-[#3D2C3E]"
              }`}
              style={{ color: gender === "boy" ? "#FFFFFF" : "#3D2C3E" }}
            >
              Băiat
            </button>
            <button
              type="button"
              onClick={() => setGender((g) => (g === "girl" ? null : "girl"))}
              className={`h-12 rounded-2xl border font-bold text-[14px] ${
                gender === "girl"
                  ? "bg-[#E8B4D0] border-[#E8B4D0] text-white"
                  : "bg-white border-[#EDE7F6] text-[#3D2C3E]"
              }`}
              style={{ color: gender === "girl" ? "#FFFFFF" : "#3D2C3E" }}
            >
              Fată
            </button>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={`mt-2 h-12 w-full rounded-full text-white font-bold text-[16px] ${
              canSubmit
                ? "bg-[#D4849A] cursor-pointer"
                : "bg-[#D4849A] opacity-50 cursor-not-allowed"
            }`}
            style={{ color: "#FFFFFF" }}
          >
            Hai să începem! 🚀
          </button>
        </form>
      </main>
    </div>
  );
}
