"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  clearSupabaseDataCache,
  uploadBabyAvatar,
} from "@/app/lib/supabaseData";
import { calculateBabyAge, getCurrentUser, logoutUser } from "../lib/store";
import { useStoreRefresh } from "../lib/useStoreRefresh";
import { useUser } from "@/lib/useUser";
import BabyAvatar from "../components/BabyAvatar";

type Row = {
  key: string;
  emoji: string;
  text: string;
  href?: string;
  red?: boolean;
  onClick?: () => void | Promise<void>;
  comingSoon?: boolean;
};

function RowView({ row }: { row: Row }) {
  const arrowColor = row.red ? "#B8A9BB" : "#B8A9BB";
  const textColor = row.red ? "#E88B8B" : "#3D2C3E";

  if (row.comingSoon) {
    return (
      <div className="w-full flex items-center justify-between gap-3 px-[16px] py-[14px] opacity-60 cursor-default">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-[18px] leading-none shrink-0">{row.emoji}</span>
          <span
            className="text-[14px] font-normal leading-snug flex-1 text-left"
            style={{ color: textColor, fontWeight: row.red ? 600 : 400 }}
          >
            {row.text}
          </span>
        </div>
        <span className="text-[10px] bg-[#EDE7F6] text-[#8B7A8E] px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
          În curând
        </span>
      </div>
    );
  }

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
  const { userId } = useUser();
  const currentUser = getCurrentUser();
  const babyName = currentUser?.baby.name || "Andrei";
  const parentName = currentUser?.parentName || "Maria Popescu";
  const premium = currentUser?.isPremium ?? true;
  const age = calculateBabyAge(currentUser?.baby.birthDate || "");
  const profileSubtitle = `mama lui ${babyName} · ${age.display}`;
  const [babyId, setBabyId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!userId) {
      setBabyId(null);
      setAvatarUrl(null);
      return;
    }
    const supabase = createClient();
    supabase
      .from("babies")
      .select("id, avatar_url")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setBabyId(data?.id ?? null);
        setAvatarUrl(data?.avatar_url ?? null);
      });
  }, [userId, storeVersion]);

  const handlePickAvatar = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId || !babyId) return;
    setUploading(true);
    try {
      const url = await uploadBabyAvatar(babyId, file, userId);
      if (url) setAvatarUrl(url);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const contulMeu: Row[] = [
    { key: "baby-profile", emoji: "👶", text: "Profilul bebelușului", href: "/profil/bebelus" },
    { key: "add-baby", emoji: "➕", text: "Adaugă alt bebeluș", comingSoon: true },
    { key: "subscription", emoji: "👑", text: "Gestionează abonament", comingSoon: true },
  ];

  const setari: Row[] = [
    { key: "notifications", emoji: "🔔", text: "Notificări", href: "/notificari" },
    { key: "password", emoji: "🔒", text: "Schimbă parola", href: "/profil/schimba-parola" },
    { key: "export", emoji: "📄", text: "Export jurnal PDF", comingSoon: true },
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
        clearSupabaseDataCache();
        const supabase = createClient();
        await supabase.auth.signOut();
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
        <div className="flex flex-col items-center pt-6 pb-4 gap-2">
          <div className="relative w-24 h-24 flex-shrink-0">
            <div className={`${uploading ? "opacity-60" : ""}`}>
              <BabyAvatar avatarUrl={avatarUrl} size={96} />
            </div>
            <button
              type="button"
              onClick={handlePickAvatar}
              aria-label="Încarcă poză bebeluș"
              className="absolute right-0 bottom-0 w-[26px] h-[26px] rounded-full bg-[#D4849A] text-white flex items-center justify-center cursor-pointer"
              disabled={uploading}
            >
              <span style={{ fontSize: 13, lineHeight: 1 }}>📷</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void handleFileChange(e);
              }}
            />
          </div>

          <h2 className="text-xl font-bold text-gray-800" style={{ color: "#3D2C3E" }}>
            {parentName}
          </h2>
          <p className="text-sm text-gray-500" style={{ color: "#8B7A8E" }}>
            {profileSubtitle}
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

