"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  clearSupabaseDataCache,
  uploadBabyAvatar,
} from "@/app/lib/supabaseData";
import { calculateBabyAge, logoutUser } from "../lib/store";
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

type JournalRow = {
  date?: string | null;
  food_name: string | null;
  recipe_name?: string | null;
  meal_type: string | null;
  reaction: string | null;
  notes: string | null;
  logged_at: string;
};

type PeriodId = "7d" | "14d" | "30d" | "all";

const PERIOD_OPTIONS: Array<{ id: PeriodId; label: string; days: number | null }> = [
  { id: "7d", label: "Ultima săptămână", days: 7 },
  { id: "14d", label: "Ultimele 2 săptămâni", days: 14 },
  { id: "30d", label: "Ultima lună", days: 30 },
  { id: "all", label: "Toate înregistrările", days: null },
];

function RowView({ row }: { row: Row }) {
  const arrowColor = row.red ? "#B8A9BB" : "#B8A9BB";
  const textColor = row.red ? "#E88B8B" : "#3D2C3E";
  const rowLayoutClass = "w-full flex items-center gap-3 px-[16px] py-[14px]";

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
        className="text-[14px] font-normal leading-none flex-1 text-left"
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
        className={`${rowLayoutClass} cursor-pointer`}
      >
        {content}
      </Link>
    );
  }

  if (row.onClick) {
    return (
      <button
        type="button"
        className={`${rowLayoutClass} cursor-pointer`}
        onClick={row.onClick}
      >
        {content}
      </button>
    );
  }

  return <div className={rowLayoutClass}>{content}</div>;
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
  const premium = true;
  const [babyData, setBabyData] = useState<{
    name: string;
    birthdate: string;
    avatar_url: string | null;
  } | null>(null);
  const babyName = babyData?.name || "";
  const age = calculateBabyAge(babyData?.birthdate || "");
  const profileSubtitle = `Profilul lui ${babyName} · ${age.display}`;
  const [babyId, setBabyId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodId>("7d");
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!userId) {
      setBabyId(null);
      setAvatarUrl(null);
      setBabyData(null);
      return;
    }
    const supabase = createClient();
    supabase
      .from("babies")
      .select("id, name, birthdate, avatar_url")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBabyData({
            name: data.name || "",
            birthdate: data.birthdate || "",
            avatar_url: data.avatar_url || null,
          });
        } else {
          setBabyData(null);
        }
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

  const handleExportClick = () => {
    setExportNotice(null);
    setShowPeriodModal(true);
  };

  const exportJournalPdf = async () => {
    if (!userId || exportingPdf) return;
    setExportingPdf(true);
    try {
      const periodMap: Record<PeriodId, "week" | "2weeks" | "month" | "all"> = {
        "7d": "week",
        "14d": "2weeks",
        "30d": "month",
        all: "all",
      };
      const period = periodMap[selectedPeriod];
      const now = new Date();
      let startDate = new Date();
      if (period === "week") startDate.setDate(now.getDate() - 7);
      else if (period === "2weeks") startDate.setDate(now.getDate() - 14);
      else if (period === "month") startDate.setMonth(now.getMonth() - 1);
      else startDate = new Date("2000-01-01");

      const supabase = createClient();
      const { data } = await supabase
        .from("food_journal")
        .select("*")
        .eq("user_id", userId)
        .gte("date", startDate.toISOString().split("T")[0])
        .order("date", { ascending: true });

      const entries = (data as JournalRow[] | null) ?? [];
      if (!entries.length) {
        alert("Nu există înregistrări pentru această perioadă.");
        return;
      }

      const byDay: Record<string, JournalRow[]> = {};
      for (const e of entries) {
        const day = e.date?.slice(0, 10) || e.logged_at?.slice(0, 10) || "necunoscut";
        if (!byDay[day]) byDay[day] = [];
        byDay[day].push(e);
      }

      const reactionMap: Record<string, string> = {
        pozitiv: "✓ Pozitiv",
        neutru: "— Neutru",
        negativ: "✗ Negativ",
        alergie: "⚠ Alergie",
      };
      const mealMap: Record<string, string> = {
        "mic-dejun": "Mic dejun",
        pranz: "Prânz",
        cina: "Cină",
      };
      const periodLabels: Record<string, string> = {
        week: "Ultima săptămână",
        "2weeks": "Ultimele 2 săptămâni",
        month: "Ultima lună",
        all: "Toate înregistrările",
      };
      const formatDate = (dateStr: string) => {
        const d = new Date(`${dateStr}T12:00:00`);
        return d.toLocaleDateString("ro-RO", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      };
      const escapeHtml = (v: unknown) =>
        String(v ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");

      const htmlContent = `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <title>Jurnal alimentar</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #3D2C3E; padding: 40px; font-size: 14px; }
    .header { margin-bottom: 24px; }
    .header h1 { color: #D4849A; font-size: 24px; margin-bottom: 8px; }
    .header p { color: #8B7A8E; font-size: 13px; line-height: 1.6; }
    .divider { border: none; border-top: 1px solid #D4849A; margin: 16px 0 24px; }
    .day-section { margin-bottom: 24px; }
    .day-title { font-size: 16px; font-weight: bold; color: #3D2C3E; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid #EDE7F6; }
    .meal-row { display: flex; gap: 8px; padding: 6px 0; border-bottom: 1px solid #FFF0F3; font-size: 13px; }
    .meal-name { font-weight: 600; flex: 2; }
    .meal-type { color: #8B7A8E; flex: 1; }
    .meal-reaction { flex: 1; }
    .meal-notes { color: #8B7A8E; flex: 2; font-style: italic; }
    .footer { margin-top: 40px; font-size: 11px; color: #B8A9BB; text-align: center; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Jurnal alimentar</h1>
    <p>Bebeluș: ${escapeHtml(babyName || "—")}</p>
    <p>Perioadă: ${escapeHtml(periodLabels[period] || period)}</p>
    <p>Generat: ${new Date().toLocaleDateString("ro-RO")}</p>
  </div>
  <hr class="divider"/>
  ${Object.entries(byDay)
    .map(
      ([day, dayEntries]) => `
    <div class="day-section">
      <div class="day-title">${escapeHtml(formatDate(day))}</div>
      ${dayEntries
        .map(
          (e) => `
        <div class="meal-row">
          <span class="meal-name">${escapeHtml(e.food_name || e.recipe_name || "—")}</span>
          <span class="meal-type">${escapeHtml(mealMap[e.meal_type || ""] || e.meal_type || "—")}</span>
          <span class="meal-reaction">${escapeHtml(reactionMap[e.reaction || ""] || e.reaction || "—")}</span>
          ${e.notes ? `<span class="meal-notes">${escapeHtml(e.notes)}</span>` : ""}
        </div>
      `
        )
        .join("")}
    </div>
  `
    )
    .join("")}
  <div class="footer">Generat de DiversiBebe · diversibebe.com</div>
</body>
</html>`;

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } catch {
      // silent fail
    } finally {
      setExportingPdf(false);
      setShowPeriodModal(false);
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
    {
      key: "export",
      emoji: "📄",
      text: exportingPdf ? "Se generează PDF..." : "Export jurnal PDF",
      onClick: handleExportClick,
    },
  ];

  const altele: Row[] = [
    {
      key: "support",
      emoji: "❓",
      text: "Ajutor & suport",
      onClick: () => {
        try {
          localStorage.setItem("bebeAsistAutoOpen", "support");
        } catch {
          // ignore
        }
        router.push("/dashboard");
      },
    },
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
          <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden rounded-full">
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
          {!avatarUrl ? (
            <p
              onClick={handlePickAvatar}
              className="text-center cursor-pointer"
              style={{ color: "#D4849A", fontSize: 11 }}
            >
              Adaugă foto
            </p>
          ) : null}

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
        {exportNotice ? (
          <p className="mt-3 text-[13px] text-[#8B7A8E] text-center">
            {exportNotice}
          </p>
        ) : null}
        <CardSection title="ALTELE" rows={altele} />
      </main>

      {showPeriodModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowPeriodModal(false)}
        >
          <div
            className="w-full max-w-[360px] rounded-2xl border border-[#EDE7F6]"
            style={{
              background: "#FFF8F6",
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[18px] font-extrabold text-[#3D2C3E]">
              Exportă jurnalul
            </h3>
            <p className="mt-1 text-[13px] text-[#8B7A8E]">
              Alege perioada dorită
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {PERIOD_OPTIONS.map((period) => (
                <button
                  key={period.id}
                  type="button"
                  className="h-10 rounded-full font-semibold cursor-pointer"
                  style={
                    selectedPeriod === period.id
                      ? { background: "#D4849A", color: "#FFFFFF" }
                      : { background: "#EDE7F6", color: "#8B7A8E" }
                  }
                  onClick={() => setSelectedPeriod(period.id)}
                >
                  {period.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="mt-4 w-full h-10 rounded-full text-white font-bold cursor-pointer disabled:opacity-70"
              style={{ background: "#D4849A" }}
              onClick={() => {
                void exportJournalPdf();
              }}
              disabled={exportingPdf}
            >
              {exportingPdf ? "Se generează PDF..." : "Generează PDF"}
            </button>
            <button
              type="button"
              className="mt-4 w-full h-10 rounded-full font-semibold cursor-pointer"
              style={{ background: "#EDE7F6", color: "#8B7A8E" }}
              onClick={() => setShowPeriodModal(false)}
            >
              Anulare
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

