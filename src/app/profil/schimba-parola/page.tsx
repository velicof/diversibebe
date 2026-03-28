"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "../../components/Navbar";

export default function SchimbaParolaPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (password.length < 6) {
      setError("Parola trebuie să aibă cel puțin 6 caractere");
      return;
    }
    if (password !== confirm) {
      setError("Parolele nu coincid");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    if (updateErr) {
      setError("Eroare: " + updateErr.message);
    } else {
      setSuccess(true);
      window.setTimeout(() => router.push("/profil"), 2000);
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen w-full bg-[#FFF8F6] flex flex-col items-center"
      style={{ fontFamily: '"Nunito", sans-serif' }}
    >
      <main className="w-full max-w-[393px] px-6 pb-[128px]">
        <header className="pt-6">
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              color: "#D4849A",
              fontSize: 20,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            ←
          </button>
          <h1 className="text-[22px] font-extrabold text-[#3D2C3E] mt-2">
            Schimbă parola 🔒
          </h1>
        </header>

        {success ? (
          <div className="mt-8 text-center">
            <p className="text-[16px] font-bold text-[#0F6E56]">
              ✅ Parola a fost schimbată!
            </p>
            <p className="text-[13px] text-[#8B7A8E] mt-2">Redirecționăm...</p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            <input
              type="password"
              placeholder="Parola nouă"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-2xl border border-[#EDE7F6] bg-white px-4 text-[14px] outline-none"
            />
            <input
              type="password"
              placeholder="Confirmă parola nouă"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-12 w-full rounded-2xl border border-[#EDE7F6] bg-white px-4 text-[14px] outline-none"
            />
            {error ? (
              <p className="text-[13px]" style={{ color: "#E74C3C" }}>
                {error}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={loading}
              className="h-12 w-full rounded-full bg-[#D4849A] text-white font-bold text-[16px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Se salvează..." : "Salvează parola"}
            </button>
          </div>
        )}
      </main>
      <Navbar activeTab="acasa" />
    </div>
  );
}
