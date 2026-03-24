"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";

export default function ForgotPasswordVerifyPage() {
  const [values, setValues] = useState<string[]>(["", "", "", ""]);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const joined = useMemo(() => values.join(""), [values]);

  const focusAt = (idx: number) => {
    const el = inputRefs.current[idx];
    el?.focus();
    el?.select();
  };

  const handleChange = (idx: number, next: string) => {
    const digit = next.replace(/\D/g, "").slice(0, 1);
    setValues((prev) => {
      const copy = [...prev];
      copy[idx] = digit;
      return copy;
    });

    if (digit && idx < 3) focusAt(idx + 1);
  };

  const handleKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!values[idx] && idx > 0) {
        setValues((prev) => {
          const copy = [...prev];
          copy[idx - 1] = "";
          return copy;
        });
        focusAt(idx - 1);
      } else {
        setValues((prev) => {
          const copy = [...prev];
          copy[idx] = "";
          return copy;
        });
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FFF8F6] flex items-center justify-center px-6 text-center">
      <main className="w-full max-w-[393px] pb-10">
        <div className="w-full flex items-center justify-between">
          <Link href="/forgot-password" className="text-[22px] text-[#3D2C3E] leading-none">
            ←
          </Link>
          <span />
        </div>

        <h1 className="mt-4 text-[26px] font-extrabold text-[#3D2C3E]">
          Verificare
        </h1>
        <p className="mt-2 text-[14px] font-normal text-[#8B7A8E]">
          Introdu codul de 4 cifre trimis pe emailul tău
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          {values.map((v, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              value={v}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              inputMode="numeric"
              className="w-12 h-12 text-center text-[24px] font-extrabold border border-[#C4B5E0] rounded-2xl outline-none bg-white"
            />
          ))}
        </div>

        <div className="mt-6">
          <Link
            href="/forgot-password/new-password"
            className="h-12 w-full rounded-full bg-[#D4849A] text-white font-bold text-[16px] flex items-center justify-center"
            aria-disabled={joined.length !== 4}
          >
            Verifică
          </Link>
        </div>

        <p className="mt-6 text-[14px] font-normal text-[#8B7A8E]">
          Nu ai primit codul?{" "}
          <Link href="/forgot-password/verify" className="font-semibold text-[#D4849A]">
            Retrimite
          </Link>
        </p>
      </main>
    </div>
  );
}

