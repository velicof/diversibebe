"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type VerifyStatus = "verifying" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";
  const [status, setStatus] = useState<VerifyStatus>("verifying");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("diversibebe_data") || "{}";
      const data = JSON.parse(raw) as {
        appState?: { currentUser?: { email?: string; isVerified?: boolean } | null };
        accounts?: Array<{
          email: string;
          isVerified?: boolean;
          verificationToken?: string | null;
        }>;
      };
      const accounts = Array.isArray(data.accounts) ? data.accounts : [];
      const account = accounts.find((a) => a.email === email);
      if (account && account.verificationToken === token) {
        account.isVerified = true;
        account.verificationToken = null;
        if (data.appState?.currentUser?.email === email && data.appState.currentUser) {
          data.appState.currentUser.isVerified = true;
        }
        localStorage.setItem("diversibebe_data", JSON.stringify(data));
        setStatus("success");
        return;
      }
      setStatus("error");
    } catch {
      setStatus("error");
    }
  }, [email, token]);

  return (
    <div
      className="min-h-screen w-full bg-[#FFF8F6] flex items-center justify-center px-6"
      style={{ fontFamily: '"Nunito", sans-serif' }}
    >
      <main className="w-full max-w-[393px] text-center">
        {status === "verifying" ? (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border-4 border-[#A8DCD1] border-t-transparent animate-spin" />
            <p className="mt-4 text-[14px] text-[#8B7A8E]">Verificăm emailul...</p>
          </div>
        ) : status === "success" ? (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-[#A8DCD1] flex items-center justify-center text-[40px]">
              ✓
            </div>
            <h1 className="mt-6 text-[24px] font-extrabold text-[#3D2C3E]">
              Email confirmat! ✅
            </h1>
            <p className="mt-2 text-[14px] text-[#8B7A8E]">Contul tău este acum activ.</p>
            <Link
              href="/dashboard"
              className="mt-8 h-12 w-full rounded-full bg-[#D4849A] text-white font-bold text-[16px] flex items-center justify-center"
            >
              Mergi la aplicație
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-[#FDE8EE] flex items-center justify-center text-[40px] text-[#E74C3C]">
              ✕
            </div>
            <h1 className="mt-6 text-[24px] font-extrabold text-[#3D2C3E]">
              Link invalid sau expirat
            </h1>
            <Link
              href="/register"
              className="mt-8 h-12 w-full rounded-full bg-[#D4849A] text-white font-bold text-[16px] flex items-center justify-center"
            >
              Înregistrează-te din nou
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen w-full bg-[#FFF8F6] flex items-center justify-center px-6"
          style={{ fontFamily: '"Nunito", sans-serif' }}
        >
          <p className="text-[14px] text-[#8B7A8E]">Se încarcă…</p>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
