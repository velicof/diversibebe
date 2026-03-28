"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { calculateBabyAge, getCurrentUser, logoutUser } from "../lib/store";
import { useStoreRefresh } from "../lib/useStoreRefresh";

type Row = {
  key: string;
  emoji: string;
  text: string;
  href?: string;
  red?: boolean;
  onClick?: () => void | Promise<void>;
};

function RowView({ row }: { row: Row }) {
  const arrowColor = row.red ? "#B8A9BB" : "#B8A9BB";
  const textColor = row.red ? "#E88B8B" : "#3D2C3E";

  const content = (
    <>
      <span className="text-[18px] leading-none">{row.emoji}</span>
      <span
        className="text-[14px] font-normal leading-none flex-1"
        style={{ color: textColor, fontWeight: row.red ? 600 : 400 }}
      >
        {row.text}
      </span>
      <span
        className="text-[14px] leading-none"
        style={{ color: arrowColor }}
      >
        ›
      </span>
    </>
  );

  if (row.href) {
    return (
      <Link
        href={row.href}
        className="w-full flex items-center gap-3 px-[16px] py-[14px] cursor-pointer"
      >
        {content}
      </Link>
    );
  }

  if (row.onClick) {
    return (
      <button
        type="button"
        className="w-full flex items-center gap-3 px-[16px] py-[14px] cursor-pointer"
        onClick={row.onClick}
      >
        {content}
      </button>
    );
  }

  return <div className="w-full flex items-center gap-3 px-[16px] py-[14px]">{content}</div>;
}

function CardSection({
  title,
  rows,
}: {
  title: string;
  rows: Row[];
}) {
  return (
    <section className="w-full">
      <div
        className="mt-[24px] mb-3"
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#8B7A8E",
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>

      <div className="bg-white border border-[#EDE7F6] rounded-[16px] overflow-hidden">
        {rows.map((row, idx) => (
          <div key={row.key} className={idx < rows.length - 1 ? "border-b border-[#FDE8EE]" : ""}>
            <RowView row={row} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ProfilPage() {
  const storeVersion = useStoreRefresh();
  const router = useRouter();
  const currentUser = getCurrentUser();
  const babyName = currentUser?.baby.name || "Andrei";
  const parentName = currentUser?.parentName || "Maria Popescu";
  const premium = currentUser?.isPremium ?? true;
  const age = calculateBabyAge(currentUser?.baby.birthDate || "");

  const contulMeu: Row[] = [
    { key: "baby-profile", emoji: "👶", text: "Profilul bebelușului", href: "/profil/bebelus" },
    { key: "add-baby", emoji: "➕", text: "Adaugă alt bebeluș" },
    { key: "subscription", emoji: "👑", text: "Gestionează abonament", href: "/premium" },
  ];

  const setari: Row[] = [
    { key: "notifications", emoji: "🔔", text: "Notificări", href: "/notificari" },
    { key: "password", emoji: "🔒", text: "Schimbă parola", href: "/forgot-password" },
    { key: "export", emoji: "📄", text: "Export jurnal PDF" },
  ];

  const altele: Row[] = [
    { key: "support", emoji: "❓", text: "Ajutor & suport" },
    { key: "rate", emoji: "⭐", text: "Evaluează aplicația" },
    {
      key: "logout",
      emoji: "🚪",
      text: "Deconectare",
      red: true,
      onClick: async () => {
        logoutUser();
        await signOut({ redirect: false });
        router.push("/");
      },
    },
  ];

  return (
    <div className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center px-6 pb-[120px]">
      <main key={storeVersion} className="relative w-full max-w-[393px]">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="absolute left-0 top-6 z-10 cursor-pointer leading-none"
          style={{
            color: "#D4849A",
            fontSize: 20,
            padding: 8,
            background: "none",
            border: "none",
          }}
          aria-label="Înapoi"
        >
          ←
        </button>
        <div className="pt-6 flex flex-col items-center text-center">
          <div className="w-[80px] h-[80px] rounded-full bg-[#FDE8EE] flex items-center justify-center">
            <span className="text-[40px] leading-none">👶</span>
          </div>

          <h1 className="mt-4 text-[20px] font-extrabold text-[#3D2C3E]">
            {parentName}
          </h1>
          <p className="mt-1 text-[13px] font-normal text-[#8B7A8E]">
            {`mama lui ${babyName} · ${age.display}`}
          </p>

          {premium ? (
            <span
              className="mt-3"
              style={{
                background: "#F0C05A",
                color: "#FFFFFF",
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 14px",
                borderRadius: 9999,
                display: "inline-block",
              }}
            >
              PREMIUM
            </span>
          ) : null}
        </div>

        <CardSection title="CONTUL MEU" rows={contulMeu} />
        <CardSection title="SETĂRI" rows={setari} />
        <CardSection title="ALTELE" rows={altele} />
      </main>
    </div>
  );
}

