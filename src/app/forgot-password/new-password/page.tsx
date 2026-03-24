"use client";

import Link from "next/link";
import { useState } from "react";

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

export default function NewPasswordPage() {
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);

  return (
    <div className="min-h-screen w-full bg-[#FFF8F6] flex items-center justify-center px-6 text-center">
      <main className="w-full max-w-[393px] pb-10">
        <h1 className="mt-4 text-[26px] font-extrabold text-[#3D2C3E]">
          Gata!
        </h1>
        <p className="mt-2 text-[14px] font-normal text-[#8B7A8E]">
          Creează o parolă nouă
        </p>

        <form
          className="mt-6 flex flex-col gap-4 text-left"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="relative">
            <input
              className="h-12 w-full rounded-2xl border border-[#EDE7F6] bg-white px-4 pr-12 text-[14px] placeholder:text-[#B8A9BB] outline-none"
              placeholder="Parola nouă"
              type={show1 ? "text" : "password"}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShow1((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              aria-label={show1 ? "Ascunde parola" : "Afișează parola"}
            >
              <EyeIcon open={show1} />
            </button>
          </div>

          <div className="relative">
            <input
              className="h-12 w-full rounded-2xl border border-[#EDE7F6] bg-white px-4 pr-12 text-[14px] placeholder:text-[#B8A9BB] outline-none"
              placeholder="Confirmă parola nouă"
              type={show2 ? "text" : "password"}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShow2((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              aria-label={show2 ? "Ascunde parola" : "Afișează parola"}
            >
              <EyeIcon open={show2} />
            </button>
          </div>

          <Link
            href="/forgot-password/confirm"
            className="h-12 w-full rounded-full bg-[#D4849A] text-white font-bold text-[16px] flex items-center justify-center"
          >
            Salvează parola
          </Link>
        </form>
      </main>
    </div>
  );
}

