"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import SocialLoginButtons from "../../components/SocialLoginButtons";
import { registerUser, type UserAccount } from "../../lib/store";
import { upsertCurrentBaby } from "../../lib/supabaseData";

type Gender = "boy" | "girl" | null;

export default function RegisterStep2Page() {
  const router = useRouter();

  const STEP2_STORAGE_KEY = "diversibebe_register_step2";
  const [hydrated, setHydrated] = useState(false);
  const [gender, setGender] = useState<Gender>(null);
  const [babyName, setBabyName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthWeight, setBirthWeight] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [diversificationMode, setDiversificationMode] = useState<
    "not_started" | "started"
  >("not_started");
  const [divStartDate, setDivStartDate] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastFading, setToastFading] = useState(false);
  const [nameBlurred, setNameBlurred] = useState(false);
  const [birthBlurred, setBirthBlurred] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const nameTrim = babyName.trim();
  const nameOk = nameTrim.length >= 2;
  const birthOk = birthDate.trim().length > 0;
  const canCreate = nameOk && birthOk && agreed;

  const showNameError =
    (nameBlurred || submitAttempted) && (!nameTrim || !nameOk);
  const showBirthError = (birthBlurred || submitAttempted) && !birthOk;

  const nameErrText = useMemo(() => {
    if (!nameTrim) return "Numele bebelușului este obligatoriu";
    if (nameTrim.length < 2)
      return "Introdu cel puțin 2 caractere pentru nume";
    return "";
  }, [nameTrim]);

  const showSocialToast = () => {
    setToastVisible(true);
    setToastFading(false);
    window.setTimeout(() => setToastFading(true), 3000);
    window.setTimeout(() => setToastVisible(false), 3300);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STEP2_STORAGE_KEY);
      if (!raw) {
        setHydrated(true);
        return;
      }
      const saved = JSON.parse(raw) as Partial<{
        gender: Gender;
        babyName: string;
        birthDate: string;
        birthWeight: string;
        agreed: boolean;
        diversificationMode: "not_started" | "started";
        divStartDate: string;
      }>;

      if (saved.gender !== undefined) setGender(saved.gender);
      if (typeof saved.babyName === "string") setBabyName(saved.babyName);
      if (typeof saved.birthDate === "string") setBirthDate(saved.birthDate);
      if (typeof saved.birthWeight === "string") setBirthWeight(saved.birthWeight);
      if (typeof saved.agreed === "boolean") setAgreed(saved.agreed);
      if (
        saved.diversificationMode === "not_started" ||
        saved.diversificationMode === "started"
      ) {
        setDiversificationMode(saved.diversificationMode);
      }
      if (typeof saved.divStartDate === "string") setDivStartDate(saved.divStartDate);
    } catch {
      // ignore
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STEP2_STORAGE_KEY,
        JSON.stringify({
          gender,
          babyName,
          birthDate,
          birthWeight,
          agreed,
          diversificationMode,
          divStartDate,
        })
      );
    } catch {
      /* ignore */
    }
  }, [hydrated, gender, babyName, birthDate, birthWeight, agreed, diversificationMode, divStartDate]);

  return (
    <div className="min-h-screen w-full bg-[#FFF8F6] flex items-center justify-center px-6 text-center">
      <main
        className="w-full max-w-[393px] pb-10"
        style={{ fontFamily: '"Nunito", sans-serif' }}
      >
        <div className="w-full flex items-center justify-between">
          <Link
            href="/register"
            className="text-[22px] text-[#3D2C3E] leading-none"
          >
            ←
          </Link>
          <span />
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#EDE7F6]" />
          <span className="w-2 h-2 rounded-full bg-[#A8DCD1]" />
          <span className="w-2 h-2 rounded-full bg-[#EDE7F6]" />
        </div>

        <h1 className="mt-4 text-[26px] font-extrabold text-[#3D2C3E]">
          Despre bebe!
        </h1>
        <p className="mt-2 text-[14px] font-normal text-[#8B7A8E]">
          Spune-ne despre bebelușul tău
        </p>

        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="text-left">
            <input
              value={babyName}
              onChange={(e) => setBabyName(e.target.value)}
              onBlur={() => setNameBlurred(true)}
              className="h-12 w-full rounded-2xl border border-[#EDE7F6] bg-white px-4 text-[14px] placeholder:text-[#B8A9BB] outline-none"
              placeholder="Numele bebelușului"
              type="text"
              autoComplete="off"
            />
            {showNameError ? (
              <p className="mt-1 text-[12px]" style={{ color: "#E74C3C" }}>
                {nameErrText}
              </p>
            ) : null}
          </div>

          <div className="text-left">
            <p className="mb-1 text-[14px] font-semibold text-[#3D2C3E]">
              Data nașterii bebelușului
            </p>
            <input
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              onBlur={() => setBirthBlurred(true)}
              className="h-12 w-full rounded-2xl border border-[#EDE7F6] bg-white px-4 text-[14px] outline-none"
              type="date"
              placeholder="ZZ/LL/AAAA"
            />
            {showBirthError ? (
              <p className="mt-1 text-[12px]" style={{ color: "#E74C3C" }}>
                Data nașterii este obligatorie
              </p>
            ) : null}
          </div>

          <input
            value={birthWeight}
            onChange={(e) => setBirthWeight(e.target.value)}
            className="h-12 w-full rounded-2xl border border-[#EDE7F6] bg-white px-4 text-[14px] placeholder:text-[#B8A9BB] outline-none"
            placeholder="Greutate la naștere (opțional)"
            type="text"
            autoComplete="off"
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
            >
              Băiat 👦
            </button>
            <button
              type="button"
              onClick={() => setGender((g) => (g === "girl" ? null : "girl"))}
              className={`h-12 rounded-2xl border font-bold text-[14px] ${
                gender === "girl"
                  ? "bg-[#E8B4D0] border-[#E8B4D0] text-white"
                  : "bg-white border-[#EDE7F6] text-[#3D2C3E]"
              }`}
            >
              Fată 👧
            </button>
          </div>

          <div className="text-left">
            <p className="text-[14px] font-semibold text-[#3D2C3E]">
              Când ați început diversificarea?
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setDiversificationMode("not_started")}
                className={`flex-1 h-10 rounded-full border text-[12px] font-semibold ${
                  diversificationMode === "not_started"
                    ? "bg-[#FDE8EE] border-[#D4849A] text-[#D4849A]"
                    : "bg-white border-[#EDE7F6] text-[#8B7A8E]"
                }`}
              >
                Nu am început încă
              </button>
              <button
                type="button"
                onClick={() => setDiversificationMode("started")}
                className={`flex-1 h-10 rounded-full border text-[12px] font-semibold ${
                  diversificationMode === "started"
                    ? "bg-[#FDE8EE] border-[#D4849A] text-[#D4849A]"
                    : "bg-white border-[#EDE7F6] text-[#8B7A8E]"
                }`}
              >
                Am început deja
              </button>
            </div>
            {diversificationMode === "started" ? (
              <input
                type="date"
                value={divStartDate}
                onChange={(e) => setDivStartDate(e.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-[#EDE7F6] bg-white px-4 text-[14px] outline-none"
              />
            ) : null}
          </div>

          <label className="mt-1 flex items-center justify-center gap-3">
            <input
              type="checkbox"
              className="mt-1 cursor-pointer"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span className="text-[14px] font-normal text-[#8B7A8E]">
              Sunt de acord cu{" "}
              <Link
                href="/termeni"
                className="text-[#D4849A] underline cursor-pointer"
              >
                Termenii și Condițiile
              </Link>
            </span>
          </label>

          <p className="mt-2 text-[13px] font-normal text-[#8B7A8E]">
            Sau conectează-te cu
          </p>
          <div className="flex justify-center mt-2">
            <SocialLoginButtons
              onGoogleClick={() =>
                signIn("google", {
                  callbackUrl: "http://localhost:3000/dashboard",
                })
              }
              onSocialClick={showSocialToast}
            />
          </div>

          <button
            type="button"
            disabled={!canCreate}
            className={`h-12 w-full rounded-full bg-[#D4849A] text-white font-bold text-[16px] mt-4 ${
              canCreate ? "cursor-pointer" : "opacity-50 cursor-not-allowed"
            }`}
            onClick={async () => {
              setSubmitAttempted(true);
              setNameBlurred(true);
              setBirthBlurred(true);
              if (!canCreate) return;
              try {
                const step1Raw = localStorage.getItem(
                  "diversibebe_register_step1"
                );
                const step1 = step1Raw
                  ? (JSON.parse(step1Raw) as {
                      parentName?: string;
                      email?: string;
                      password?: string;
                    })
                  : {};
                const newUser: UserAccount = {
                  email: step1.email?.trim() || "demo@diversibebe.ro",
                  password: step1.password || "demo123",
                  parentName: step1.parentName?.trim() || "Părinte DiversiBebe",
                  baby: {
                    name: nameTrim,
                    birthDate: birthDate.trim(),
                    weight: birthWeight.trim(),
                    gender: gender,
                    allergies: [],
                    diversificationStartDate:
                      diversificationMode === "started" && divStartDate
                        ? new Date(divStartDate).toISOString()
                        : null,
                  },
                  isPremium: false,
                  isVerified: true,
                  verificationToken: null,
                  createdAt: new Date().toISOString(),
                };
                registerUser(newUser);
                await upsertCurrentBaby({
                  name: nameTrim,
                  birthdate: birthDate.trim(),
                  gender,
                  weightKg: Number.parseFloat(birthWeight.replace(",", ".")) || null,
                });
                try {
                  localStorage.removeItem(STEP2_STORAGE_KEY);
                } catch {
                  /* ignore */
                }
              } catch {
                // ignore
              }
              router.push("/register/confirm");
            }}
          >
            Creează cont
          </button>
        </form>
      </main>

      {toastVisible ? (
        <div
          className="fixed left-1/2 -translate-x-1/2 max-w-[393px] bottom-6 px-[20px] py-[12px] rounded-[12px] bg-[#3D2C3E] text-white text-[13px] font-normal z-[50] transition-opacity duration-300"
          style={{
            opacity: toastFading ? 0 : 1,
            pointerEvents: "none",
            transform: toastFading
              ? "translateX(-50%) translateY(10px)"
              : "translateX(-50%) translateY(0px)",
          }}
        >
          Autentificarea cu rețele sociale va fi disponibilă în curând!
        </div>
      ) : null}
    </div>
  );
}
