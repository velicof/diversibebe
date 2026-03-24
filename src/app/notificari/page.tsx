"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Navbar from "../components/Navbar";
import { getNotifications, markAsRead } from "../lib/store";
import { useStoreRefresh } from "../lib/useStoreRefresh";

type Filter = "all" | "unread";

const backBtnStyle = {
  color: "#D4849A",
  fontSize: 20,
  padding: 8,
  background: "none" as const,
  border: "none" as const,
};

export default function NotificariPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const version = useStoreRefresh();
  const cards = getNotifications();

  const visibleCards = (() => {
    if (filter === "unread") return cards.filter((c) => !c.read);
    return cards;
  })();

  return (
    <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center transition-colors">
      <main className="w-full max-w-[393px] px-6 pb-[88px]">
        <header className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="cursor-pointer leading-none"
              style={backBtnStyle}
              aria-label="Înapoi"
            >
              ←
            </button>
            <h1 className="text-[22px] font-extrabold text-[#3D2C3E]">
              Notificări
            </h1>
            <div className="w-[36px] shrink-0" />
          </div>

          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`cursor-pointer text-[14px] font-semibold px-[16px] py-[6px] rounded-full transition-colors ${
                filter === "all"
                  ? "bg-[#D4849A] text-white"
                  : "bg-white border border-[#EDE7F6] text-[#8B7A8E]"
              }`}
            >
              Toate
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`cursor-pointer text-[14px] font-semibold px-[16px] py-[6px] rounded-full transition-colors ${
                filter === "unread"
                  ? "bg-[#D4849A] text-white"
                  : "bg-white border border-[#EDE7F6] text-[#8B7A8E]"
              }`}
            >
              Necitite
            </button>
          </div>
        </header>

        <section key={version} className="mt-5 space-y-3">
          {visibleCards.length === 0 ? (
            <div className="text-center text-[14px] text-[#8B7A8E] py-10">
              Nicio notificare încă
            </div>
          ) : (
            visibleCards.map((c) => (
            <div
              key={c.id}
              className={`rounded-[16px] p-[14px] flex items-start gap-3 cursor-pointer ${
                !c.read ? "bg-[#FDE8EE]" : "bg-white border border-[#FDE8EE]"
              }`}
              onClick={() => {
                markAsRead(c.id);
              }}
            >
              <div
                className="w-[40px] h-[40px] rounded-full flex items-center justify-center"
                style={{ backgroundColor: c.iconBg }}
              >
                <span className="text-[20px] leading-none">{c.icon}</span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-[#3D2C3E]">
                  {c.title}
                </p>
                <p className="mt-1 text-[12px] font-normal text-[#8B7A8E]">
                  {c.body}
                </p>
                <p className="mt-2 text-[11px] font-normal text-[#B8A9BB]">
                  {c.time}
                </p>
              </div>
            </div>
            ))
          )}
        </section>
      </main>

      <Navbar activeTab="acasa" />
    </div>
  );
}

