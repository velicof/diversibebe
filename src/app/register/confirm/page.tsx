"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function CheckmarkIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M20 6L9 17l-5-5"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** When Supabase Auth has "Confirm email" disabled, set NEXT_PUBLIC_SUPABASE_EMAIL_CONFIRMATION_DISABLED=true */
const skipEmailConfirmMessage =
  process.env.NEXT_PUBLIC_SUPABASE_EMAIL_CONFIRMATION_DISABLED === "true";

export default function RegisterConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    if (skipEmailConfirmMessage) {
      router.replace("/dashboard");
    }
  }, [router]);

  if (skipEmailConfirmMessage) {
    return (
      <div className="min-h-screen w-full bg-[#FFF8F6] flex items-center justify-center px-6">
        <main
          className="w-full max-w-[393px] flex flex-col items-center text-center"
          style={{ fontFamily: '"Nunito", sans-serif' }}
        >
          <p className="text-[14px] font-normal text-[#8B7A8E]">Se încarcă…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#FFF8F6] flex items-center justify-center px-6">
      <main
        className="w-full max-w-[393px] flex flex-col items-center text-center"
        style={{ fontFamily: '"Nunito", sans-serif' }}
      >
        <div className="w-20 h-20 rounded-full bg-[#A8DCD1] flex items-center justify-center flex-shrink-0">
          <CheckmarkIcon />
        </div>

        <h1 className="mt-6 text-[26px] font-extrabold text-[#3D2C3E]">
          Totul e pregătit!
        </h1>
        <p className="mt-2 text-[14px] font-normal text-[#8B7A8E]">
          Contul tău a fost creat! Verifică emailul pentru a confirma
          înregistrarea.
        </p>

        <div className="mt-8 w-full max-w-[280px]">
          <Link
            href="/login"
            className="h-12 w-full rounded-full bg-[#D4849A] text-white font-bold text-[16px] flex items-center justify-center"
          >
            Conectează-te
          </Link>
        </div>
      </main>
    </div>
  );
}
