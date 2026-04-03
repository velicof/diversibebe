"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FOODS_DATABASE } from "@/app/lib/foodsDatabase";
import SocialLoginButtons from "../../components/SocialLoginButtons";

type Gender = "boy" | "girl" | null;

export default function RegisterStep2Page() {
  const router = useRouter();
  const [gender, setGender] = useState<Gender>(null);
  const [babyName, setBabyName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthWeight, setBirthWeight] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [diversificationMode, setDiversificationMode] = useState<
    "not_started" | "started"
  >("not_started");
  const [divStartDate, setDivStartDate] = useState("");
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);
  const [foodSearch, setFoodSearch] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastFading, setToastFading] = useState(false);
  const [nameBlurred, setNameBlurred] = useState(false);
  const [birthBlurred, setBirthBlurred] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [loading, setLoading] = useState(false);

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
            <input
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              onBlur={() => setBirthBlurred(true)}
              className="h-12 w-full rounded-2xl border border-[#EDE7F6] bg-white px-4 text-[14px] outline-none"
              type="date"
              style={{
                color: '#3D2C3E',
                WebkitTextFillColor: '#3D2C3E',
                opacity: 1
              }}
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
              <>
                <input
                  type="date"
                  value={divStartDate}
                  onChange={(e) => setDivStartDate(e.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-[#EDE7F6] bg-white px-4 text-[14px] outline-none"
                />
                <div className="text-left mt-2">
                  <p className="text-[13px] font-semibold text-[#3D2C3E] mb-2">
                    Ce alimente a incercat deja? (optional)
                  </p>
                  <p className="text-[11px] text-[#8B7A8E] mb-3">
                    Bifeaza alimentele pe care le-a gustat pana acum
                  </p>
                  <input
                    type="text"
                    value={foodSearch}
                    onChange={(e) => setFoodSearch(e.target.value)}
                    placeholder="Cauta aliment... (ex: morcov, ou)"
                    className="mb-2 h-10 w-full rounded-xl border border-[#EDE7F6] bg-white px-3 text-[13px] placeholder:text-[#B8A9BB] outline-none"
                    style={{ color: "#3D2C3E" }}
                  />
                  <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto bg-white rounded-2xl border border-[#EDE7F6] p-3">
                    {FOODS_DATABASE
                      .filter((f) => {
                        const ageMax =
                          f.ageGroup === "6-7" || f.ageGroup === "6-8"
                            ? 8
                            : f.ageGroup === "7-8"
                              ? 8
                              : f.ageGroup === "8-10"
                                ? 10
                                : 12;
                        return (
                          ageMax <= 12 &&
                          (foodSearch.trim() === "" ||
                            f.name.toLowerCase().includes(foodSearch.toLowerCase()))
                        );
                      })
                      .sort((a, b) => a.name.localeCompare(b.name, "ro"))
                      .map((food) => {
                        const isSelected = selectedFoods.includes(food.id);
                        return (
                          <button
                            key={food.id}
                            type="button"
                            onClick={() => {
                              setSelectedFoods((prev) =>
                                isSelected
                                  ? prev.filter((id) => id !== food.id)
                                  : [...prev, food.id]
                              );
                            }}
                            className={`h-8 px-3 rounded-full text-[12px] font-semibold border transition-colors ${
                              isSelected
                                ? "bg-[#D4849A] border-[#D4849A] text-white"
                                : "bg-white border-[#EDE7F6] text-[#3D2C3E]"
                            }`}
                          >
                            {food.emoji} {food.name}
                          </button>
                        );
                      })}
                  </div>
                  {selectedFoods.length > 0 ? (
                    <p className="mt-2 text-[11px] text-[#D4849A] font-semibold">
                      {selectedFoods.length} alimente selectate
                    </p>
                  ) : null}
                </div>
              </>
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
              onGoogleClick={async () => {
                const supabase = createClient();
                await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                  },
                });
              }}
              onSocialClick={showSocialToast}
            />
          </div>

          <button
            type="button"
            disabled={!canCreate || loading}
            className={`h-12 w-full rounded-full bg-[#D4849A] text-white font-bold text-[16px] mt-4 ${
              canCreate && !loading
                ? "cursor-pointer"
                : "opacity-50 cursor-not-allowed"
            }`}
            onClick={async () => {
              setSubmitAttempted(true);
              setNameBlurred(true);
              setBirthBlurred(true);
              if (!canCreate) return;

              setLoading(true);

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

                const email = step1.email?.trim() || "";
                const password = step1.password || "";
                const parentName = step1.parentName?.trim() || "";

                if (!email || !password) {
                  router.push("/register");
                  return;
                }

                const supabase = createClient();
                const { data, error } = await supabase.auth.signUp({
                  email,
                  password,
                  options: {
                    data: {
                      full_name: parentName,
                      name: parentName,
                    },
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                  },
                });

                if (error) {
                  const msg = error.message.toLowerCase();
                  if (
                    msg.includes("already") ||
                    msg.includes("registered") ||
                    msg.includes("exists")
                  ) {
                    alert(
                      "Există deja un cont cu acest email. Te rugăm să te conectezi la /login"
                    );
                    router.push("/login");
                    return;
                  }
                  alert("Eroare la creare cont: " + error.message);
                  return;
                }

                const userId = data.user?.id;
                if (userId) {
                  const { data: babyData } = await supabase
                    .from("babies")
                    .insert({
                      user_id: userId,
                      name: nameTrim,
                      birthdate: birthDate.trim(),
                      gender: gender,
                      weight_kg: birthWeight
                        ? parseFloat(birthWeight.replace(",", "."))
                        : null,
                    })
                    .select("id")
                    .single();

                  if (selectedFoods.length > 0) {
                    const triedFoodsToInsert = selectedFoods.map((foodId) => {
                      const food = FOODS_DATABASE.find((f) => f.id === foodId);
                      return {
                        user_id: userId,
                        baby_id: babyData?.id || null,
                        food_id: foodId,
                        food_name: food?.name || foodId,
                        first_tried_at: new Date().toISOString(),
                        try_count: 1,
                      };
                    });

                    await supabase.from("tried_foods").insert(triedFoodsToInsert);
                  }
                }

                localStorage.removeItem("register_step1");
                localStorage.removeItem("diversibebe_register_step1");

                // Verifică dacă userul are sesiune activă (email confirmation dezactivat)
                const { data: sessionData } = await supabase.auth.getSession();
                if (sessionData.session) {
                  // Userul e deja autentificat → du-l direct la dashboard
                  router.push("/dashboard");
                } else {
                  // Userul trebuie să confirme emailul → pagina de confirmare
                  router.push("/register/confirm");
                }
              } catch (err) {
                console.error("Registration error:", err);
                alert("A apărut o eroare. Te rugăm să încerci din nou.");
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Se creează contul..." : "Creează cont"}
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
