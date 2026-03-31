"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import jsPDF from "jspdf";
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

type JournalRow = {
  food_name: string | null;
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

const MEAL_TYPE_LABELS: Record<string, string> = {
  "mic-dejun": "mic dejun",
  pranz: "prânz",
  cina: "cină",
  gustare: "gustare",
};

function reactionLabel(value: string | null) {
  if (value === "pozitiv" || value === "loved") return "pozitiv ✓";
  if (value === "neutru" || value === "ok") return "neutru —";
  if (value === "negativ" || value === "disliked" || value === "refused") return "negativ ✗";
  if (value === "alergie") return "alergie ⚠";
  return "neutru —";
}

function formatLongDateRo(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function filterRowsByPeriod(rows: JournalRow[], periodId: PeriodId): JournalRow[] {
  const period = PERIOD_OPTIONS.find((p) => p.id === periodId);
  if (!period || period.days == null) return rows;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (period.days - 1));
  return rows.filter((row) => {
    const d = new Date(row.logged_at);
    return !Number.isNaN(d.getTime()) && d >= start;
  });
}

function buildJournalPdf({
  rows,
  babyName,
  periodLabel,
}: {
  rows: JournalRow[];
  babyName: string;
  periodLabel: string;
}) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const left = 40;
  let y = 48;

  const ensureSpace = (needed: number) => {
    if (y + needed < pageH - 52) return;
    pdf.addPage();
    y = 48;
  };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(212, 132, 154);
  pdf.text(`Jurnal alimentar — ${babyName}`, left, y);
  y += 22;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(120, 120, 130);
  pdf.text(`Perioadă: ${periodLabel}`, left, y);
  y += 14;
  pdf.text(
    `Data generării: ${new Date().toLocaleDateString("ro-RO")}`,
    left,
    y
  );
  y += 18;

  const grouped = new Map<string, JournalRow[]>();
  for (const row of rows) {
    const dt = new Date(row.logged_at);
    if (Number.isNaN(dt.getTime())) continue;
    const key = dt.toISOString().slice(0, 10);
    const arr = grouped.get(key) ?? [];
    arr.push(row);
    grouped.set(key, arr);
  }

  const keys = Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b));
  pdf.setTextColor(61, 44, 62);

  if (keys.length === 0) {
    ensureSpace(40);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text("Nu există înregistrări în perioada selectată.", left, y);
  }

  for (const dayKey of keys) {
    const dayRows = grouped.get(dayKey) ?? [];
    ensureSpace(28);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(212, 132, 154);
    pdf.text(formatLongDateRo(dayKey), left, y);
    y += 16;

    dayRows.sort((a, b) => {
      return new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime();
    });

    for (const row of dayRows) {
      const meal = MEAL_TYPE_LABELS[row.meal_type ?? ""] ?? "prânz";
      const title = `${row.food_name || "Masă"} · ${meal} · ${reactionLabel(
        row.reaction
      )}`;
      const note = row.notes?.trim();

      ensureSpace(note ? 44 : 28);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(61, 44, 62);
      const titleLines = pdf.splitTextToSize(`• ${title}`, pageW - left * 2);
      pdf.text(titleLines, left, y);
      y += titleLines.length * 12;

      if (note) {
        pdf.setTextColor(120, 120, 130);
        const noteLines = pdf.splitTextToSize(`Notițe: ${note}`, pageW - left * 2 - 10);
        pdf.text(noteLines, left + 10, y);
        y += noteLines.length * 12;
      }
      y += 2;
    }
    y += 6;
  }

  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(120, 120, 130);
    pdf.text("Generat de DiversiBebe · diversibebe.com", left, pageH - 20);
  }

  return pdf;
}

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
  const [exportingPdf, setExportingPdf] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
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

  const handleExportClick = () => {
    if (!premium) {
      setShowPremiumModal(true);
      return;
    }
    setShowPeriodModal(true);
  };

  const exportJournalPdf = async (periodId: PeriodId) => {
    if (!userId || exportingPdf) return;
    setShowPeriodModal(false);
    setExportingPdf(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("food_journal")
        .select("food_name, meal_type, reaction, notes, logged_at")
        .eq("user_id", userId)
        .order("logged_at", { ascending: true });

      const rows = filterRowsByPeriod((data as JournalRow[]) ?? [], periodId);
      const periodLabel =
        PERIOD_OPTIONS.find((p) => p.id === periodId)?.label ?? "Toate înregistrările";
      const pdf = buildJournalPdf({
        rows,
        babyName: babyName || "bebeluș",
        periodLabel,
      });
      pdf.save("jurnal-alimentar-diversibebe.pdf");
    } catch {
      // silent fail
    } finally {
      setExportingPdf(false);
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

      {showPremiumModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowPremiumModal(false)}
        >
          <div
            className="w-full max-w-[360px]"
            style={{
              background: "#FFF8F6",
              borderRadius: 16,
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[18px] font-extrabold text-[#3D2C3E]">
              Funcționalitate Premium
            </h3>
            <p className="mt-2 text-[13px] text-[#8B7A8E] leading-relaxed">
              Exportul jurnalului în PDF este disponibil pentru utilizatorii premium.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="flex-1 h-10 rounded-full text-white font-bold cursor-pointer"
                style={{ background: "#D4849A" }}
                onClick={() => {
                  setShowPremiumModal(false);
                  router.push("/abonament");
                }}
              >
                Upgrade
              </button>
              <button
                type="button"
                className="flex-1 h-10 rounded-full font-semibold cursor-pointer"
                style={{ background: "#EDE7F6", color: "#8B7A8E" }}
                onClick={() => setShowPremiumModal(false)}
              >
                Anulare
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showPeriodModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowPeriodModal(false)}
        >
          <div
            className="w-full max-w-[360px]"
            style={{
              background: "#FFF8F6",
              borderRadius: 16,
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[18px] font-extrabold text-[#3D2C3E]">
              Selectează perioada
            </h3>
            <div className="mt-4 flex flex-col gap-2">
              {PERIOD_OPTIONS.map((period) => (
                <button
                  key={period.id}
                  type="button"
                  className="h-10 rounded-full font-semibold cursor-pointer"
                  style={{ background: "#EDE7F6", color: "#8B7A8E" }}
                  onClick={() => {
                    void exportJournalPdf(period.id);
                  }}
                >
                  {period.label}
                </button>
              ))}
            </div>
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

