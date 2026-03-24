"use client";

import Link from "next/link";

export default function ForgotPasswordConfirmPage() {
  return (
    <div className="min-h-screen w-full bg-[#FFF8F6] flex items-center justify-center px-6 text-center">
      <main className="w-full max-w-[393px] pb-10">
        <div className="mt-6 w-full flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-[#A8DCD1] flex items-center justify-center">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M20 6L9 17L4 12"
                stroke="#FFFFFF"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <h1 className="mt-4 text-[26px] font-extrabold text-[#3D2C3E]">
          Totul e pregătit!
        </h1>
        <p className="mt-2 text-[14px] font-normal text-[#8B7A8E]">
          Parola ta a fost schimbată cu succes
        </p>

        <div className="mt-6">
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

