"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@/lib/useUser";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useUser();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-6 bg-gradient-to-b from-[#FFF8F6] via-[#FDE8EE] to-[#EDE7F6]">
        <p
          className="text-[14px] text-[#8B7A8E]"
          style={{ fontFamily: "Nunito, sans-serif" }}
        >
          Se încarcă…
        </p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-6 bg-gradient-to-b from-[#FFF8F6] via-[#FDE8EE] to-[#EDE7F6]">
        <p
          className="text-[14px] text-[#8B7A8E]"
          style={{ fontFamily: "Nunito, sans-serif" }}
        >
          Se încarcă…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 bg-gradient-to-b from-[#FFF8F6] via-[#FDE8EE] to-[#EDE7F6]">
      <main className="w-full max-w-[393px] flex flex-col items-center justify-center text-center">
        <div className="flex flex-col items-center text-center">
          <div className="text-[80px] leading-none text-center">🍼</div>
          <h1 className="mt-3 text-[32px] leading-[38px] font-extrabold text-[#3D2C3E] text-center">
            DiversiBebe
          </h1>
          <p className="mt-2 text-[14px] leading-[18px] font-normal text-[#8B7A8E] text-center">
            Ghidul tău pentru diversificarea bebelușului
          </p>
        </div>

        <div className="mt-6 text-[28px] leading-none text-center">
          🥕 🥒 🍌 🍠 🥑 🎃
        </div>

        <div className="mt-7 w-full flex flex-col gap-3 items-center">
          <Link
            href="/dashboard"
            className="w-full h-12 rounded-[50px] bg-[#D4849A] px-7 font-extrabold text-white text-[16px] flex items-center justify-center text-center"
          >
            Începe acum
          </Link>
          <Link
            href="/login"
            className="w-full h-12 rounded-[50px] border border-[#F4B4C4] bg-transparent px-7 font-extrabold text-[#D4849A] text-[16px] flex items-center justify-center text-center"
          >
            Am deja cont
          </Link>
          <Link
            href="/register"
            className="mt-1 text-[13px] font-semibold text-[#D4849A] w-full text-center"
          >
            Înregistrează-te
          </Link>
        </div>
      </main>
    </div>
  );
}
