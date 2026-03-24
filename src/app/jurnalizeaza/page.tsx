"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RedirectInner() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const food = sp.get("food");
    if (food) {
      router.replace(`/jurnal?foodId=${encodeURIComponent(food)}`);
    } else {
      router.replace("/jurnal");
    }
  }, [router, sp]);

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-[#FFF8F6]"
      style={{ fontFamily: '"Nunito", sans-serif' }}
    >
      <p className="text-[14px] text-[#8B7A8E]">Se redirecționează…</p>
    </div>
  );
}

export default function JurnalizeazaRedirectPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen w-full items-center justify-center bg-[#FFF8F6]"
          style={{ fontFamily: '"Nunito", sans-serif' }}
        >
          <p className="text-[14px] text-[#8B7A8E]">Se încarcă…</p>
        </div>
      }
    >
      <RedirectInner />
    </Suspense>
  );
}
