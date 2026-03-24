"use client";

import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen w-full bg-[#FFF8F6] flex items-center justify-center px-6 text-center">
      <main className="w-full max-w-[393px] pb-10">
        <div className="w-full flex items-center justify-between">
          <Link href="/login" className="text-[22px] text-[#3D2C3E] leading-none">
            ←
          </Link>
          <span />
        </div>

        <h1 className="mt-4 text-[26px] font-extrabold text-[#3D2C3E]">
          Ai uitat parola?
        </h1>
        <p className="mt-2 text-[14px] font-normal text-[#8B7A8E]">
          Introdu emailul asociat contului tău
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <input
            className="h-12 w-full rounded-2xl border border-[#EDE7F6] bg-white px-4 text-[14px] placeholder:text-[#B8A9BB] outline-none"
            placeholder="Adresa ta de email"
            type="email"
            autoComplete="email"
          />

          <Link
            href="/forgot-password/verify"
            className="h-12 w-full rounded-full bg-[#D4849A] text-white font-bold text-[16px] flex items-center justify-center"
          >
            Trimite codul
          </Link>
        </form>

        <p className="mt-6 text-[14px] font-normal text-[#8B7A8E]">
          Ți-ai amintit parola?{" "}
          <Link href="/login" className="font-semibold text-[#D4849A]">
            Conectează-te
          </Link>
        </p>
      </main>
    </div>
  );
}

