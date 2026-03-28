"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SocialLoginButtons from "../components/SocialLoginButtons";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1.5 12C3.7 7.3 7.4 5 12 5C16.6 5 20.3 7.3 22.5 12C20.3 16.7 16.6 19 12 19C7.4 19 3.7 16.7 1.5 12Z"
        stroke="#8B7A8E"
        strokeWidth="1.8"
      />
      <path
        d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
        stroke="#8B7A8E"
        strokeWidth="1.8"
      />
    </svg>
  ) : (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 3L21 21"
        stroke="#8B7A8E"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M1.5 12C3.7 7.3 7.4 5 12 5C13.7 5 15.2 5.3 16.6 5.9"
        stroke="#8B7A8E"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M22.5 12C20.3 16.7 16.6 19 12 19C7.4 19 3.7 16.7 1.5 12Z"
        stroke="#8B7A8E"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [parentName, setParentName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [toastVisible, setToastVisible] = useState(false);
  const [toastFading, setToastFading] = useState(false);

  const handleContinue = async (e: React.MouseEvent) => {
    e.preventDefault();

    const newErrors = { name: "", email: "", password: "", confirmPassword: "" };
    let isValid = true;

    if (!parentName || parentName.trim().length < 2) {
      newErrors.name = "Numele trebuie să aibă cel puțin 2 caractere";
      isValid = false;
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      newErrors.email = "Adresa de email nu este validă";
      isValid = false;
    }
    if (!password || password.length < 6) {
      newErrors.password = "Parola trebuie să aibă cel puțin 6 caractere";
      isValid = false;
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Parolele nu coincid";
      isValid = false;
    }

    setErrors(newErrors);
    setTouched({ name: true, email: true, password: true, confirmPassword: true });
    if (!isValid) return;

    // Check if email already exists in Supabase
    // We do this by attempting signInWithPassword with wrong password
    // A cleaner way: just save and let step2 handle the error

    localStorage.setItem(
      "register_step1",
      JSON.stringify({ name: parentName, email, password })
    );
    localStorage.setItem(
      "diversibebe_register_step1",
      JSON.stringify({
        parentName: parentName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      })
    );

    router.push("/register/step2");
  };

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
          <Link href="/" className="text-[22px] text-[#3D2C3E] leading-none">
            ←
          </Link>
          <span />
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#A8DCD1]" />
          <span className="w-2 h-2 rounded-full bg-[#EDE7F6]" />
          <span className="w-2 h-2 rounded-full bg-[#EDE7F6]" />
        </div>

        <h1 className="mt-4 text-[26px] font-extrabold text-[#3D2C3E]">
          Bun venit!
        </h1>
        <p className="mt-2 text-[14px] font-normal text-[#8B7A8E]">
          Hai să începem
        </p>

        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="text-left">
            <input
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              className="h-12 w-full rounded-2xl border border-[#EDE7F6] bg-white px-4 text-[14px] placeholder:text-[#B8A9BB] outline-none"
              style={{
                borderColor:
                  touched.name && errors.name ? "#E74C3C" : undefined,
              }}
              placeholder="Numele tău complet"
              type="text"
              autoComplete="name"
            />
            {touched.name && errors.name ? (
              <p className="mt-1 text-[12px]" style={{ color: "#E74C3C" }}>
                {errors.name}
              </p>
            ) : null}
          </div>

          <div className="text-left">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-2xl border border-[#EDE7F6] bg-white px-4 text-[14px] placeholder:text-[#B8A9BB] outline-none"
              style={{
                borderColor:
                  touched.email && errors.email ? "#E74C3C" : undefined,
              }}
              placeholder="Adresa ta de email"
              type="email"
              autoComplete="email"
            />
            {touched.email && errors.email ? (
              <p className="mt-1 text-[12px]" style={{ color: "#E74C3C" }}>
                {errors.email}
              </p>
            ) : null}
          </div>

          <div className="relative">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-2xl border border-[#EDE7F6] bg-white px-4 pr-12 text-[14px] placeholder:text-[#B8A9BB] outline-none"
              style={{
                borderColor:
                  touched.password && errors.password ? "#E74C3C" : undefined,
              }}
              placeholder="Creează o parolă"
              type={showPassword1 ? "text" : "password"}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword1((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              aria-label={showPassword1 ? "Ascunde parola" : "Afișează parola"}
            >
              <EyeIcon open={showPassword1} />
            </button>
          </div>
          {touched.password && errors.password ? (
            <p className="-mt-3 text-left text-[12px]" style={{ color: "#E74C3C" }}>
              {errors.password}
            </p>
          ) : null}

          <div className="relative">
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-12 w-full rounded-2xl border border-[#EDE7F6] bg-white px-4 pr-12 text-[14px] placeholder:text-[#B8A9BB] outline-none"
              style={{
                borderColor:
                  touched.confirmPassword && errors.confirmPassword
                    ? "#E74C3C"
                    : undefined,
              }}
              placeholder="Confirmă parola"
              type={showPassword2 ? "text" : "password"}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword2((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              aria-label={showPassword2 ? "Ascunde parola" : "Afișează parola"}
            >
              <EyeIcon open={showPassword2} />
            </button>
          </div>
          {touched.confirmPassword && errors.confirmPassword ? (
            <p className="-mt-3 text-left text-[12px]" style={{ color: "#E74C3C" }}>
              {errors.confirmPassword}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleContinue}
            className="h-12 w-full rounded-full bg-[#D4849A] text-white font-bold text-[16px] flex items-center justify-center cursor-pointer"
          >
            Continuă
          </button>

          <p className="mt-1 text-[13px] font-normal text-[#8B7A8E]">
            Sau conectează-te cu
          </p>

          <div className="flex justify-center">
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
        </form>

        <p className="mt-6 text-[14px] font-normal text-[#8B7A8E]">
          Ai deja cont?{" "}
          <Link href="/login" className="font-semibold text-[#D4849A]">
            Conectează-te
          </Link>
        </p>
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
