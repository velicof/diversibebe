"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import SocialLoginButtons from "../components/SocialLoginButtons";
import {
  getCurrentUser,
  loginUser,
  syncGoogleSessionToLocalUser,
} from "../lib/store";

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

type LoginFormProps = {
  /** From server `searchParams` (OAuth callback query). */
  initialLoginError?: string;
};

export default function LoginForm({ initialLoginError }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastFading, setToastFading] = useState(false);

  const errorFromClient = searchParams.get("error");
  const error = errorFromClient ?? initialLoginError ?? null;
  const showOAuthError = error === "OAuthAccountNotLinked";

  useEffect(() => {
    const emailAddr = session?.user?.email;
    if (status !== "authenticated" || !emailAddr) return;
    syncGoogleSessionToLocalUser({
      email: emailAddr,
      name: session.user?.name ?? null,
    });
    const u = getCurrentUser();
    if (!u || u.email.toLowerCase() !== emailAddr.toLowerCase()) {
      return;
    }
    if (u.baby?.name?.trim()) {
      router.replace("/dashboard");
    } else {
      router.replace("/onboarding");
    }
  }, [session, status, router]);

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

        <h1 className="mt-4 text-[26px] font-extrabold text-[#3D2C3E]">
          Bine ai revenit!
        </h1>
        <p className="mt-2 text-[14px] font-normal text-[#8B7A8E]">
          Conectează-te la contul tău
        </p>

        {showOAuthError ? (
          <div
            className="mt-5 rounded-[12px] border px-4 py-3 text-left"
            style={{
              backgroundColor: "#FFF0F5",
              borderColor: "#F4B4C4",
              borderWidth: 1,
            }}
          >
            <p className="text-[14px] text-[#3D2C3E] leading-relaxed">
              <span className="mr-1" aria-hidden>
                ⚠️
              </span>
              Există deja un cont cu această adresă de email. Te rugăm să te
              conectezi cu email și parolă.
            </p>
            <button
              type="button"
              className="mt-2 text-left text-[12px] text-[#D4849A] underline cursor-pointer bg-transparent border-0 p-0 font-normal"
              onClick={() => router.push("/forgot-password")}
            >
              Ai uitat parola? Click aici
            </button>
          </div>
        ) : null}

        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await signOut({ redirect: false });
            const ok = loginUser(email.trim(), password);
            if (ok) {
              setLoginError("");
              router.push("/dashboard");
            } else {
              setLoginError("Email sau parolă incorectă");
            }
          }}
        >
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full rounded-2xl border border-[#EDE7F6] bg-white px-4 text-[14px] placeholder:text-[#B8A9BB] outline-none"
            placeholder="Adresa ta de email"
            type="email"
            autoComplete="email"
          />

          <div className="relative">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-2xl border border-[#EDE7F6] bg-white px-4 pr-12 text-[14px] placeholder:text-[#B8A9BB] outline-none"
              placeholder="Parola ta"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              aria-label={showPassword ? "Ascunde parola" : "Afișează parola"}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>

          <div className="w-full text-right">
            <Link
              href="/forgot-password"
              className="text-[14px] font-normal text-[#D4849A]"
            >
              Ai uitat parola?
            </Link>
          </div>

          {loginError ? (
            <p className="text-left text-[13px] text-[#E88B8B]">{loginError}</p>
          ) : null}

          <button
            type="submit"
            className="h-12 w-full rounded-full bg-[#D4849A] text-white font-bold text-[16px]"
          >
            Conectare
          </button>

          <p className="mt-1 text-[13px] font-normal text-[#8B7A8E]">
            Sau conectează-te cu
          </p>

          <div className="flex justify-center">
            <SocialLoginButtons
              onGoogleClick={() =>
                signIn("google", {
                  callbackUrl: "http://localhost:3000/dashboard",
                })
              }
              onSocialClick={showSocialToast}
            />
          </div>
        </form>

        <p className="mt-6 text-[14px] font-normal text-[#8B7A8E]">
          Nu ai cont încă?{" "}
          <Link href="/register" className="font-semibold text-[#D4849A]">
            Înregistrează-te
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
