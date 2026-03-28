"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleGoogle = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signErr) {
      setError("Email sau parolă incorectă");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FFF8F6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Nunito, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 393, padding: "0 24px" }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#3D2C3E",
            textAlign: "center",
          }}
        >
          DiversiBebe 🥕
        </h1>
        <p style={{ textAlign: "center", color: "#8B7A8E", marginTop: 8 }}>
          Intră în cont
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 16,
            border: "1px solid #EDE7F6",
            background: "white",
            cursor: "pointer",
            fontSize: 15,
            fontWeight: 700,
            color: "#3D2C3E",
            marginTop: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <span>🔵</span> Continuă cu Google
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "24px 0",
          }}
        >
          <div style={{ flex: 1, height: 1, background: "#EDE7F6" }} />
          <span style={{ color: "#8B7A8E", fontSize: 13 }}>sau</span>
          <div style={{ flex: 1, height: 1, background: "#EDE7F6" }} />
        </div>

        <form onSubmit={handleEmail}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 16,
              border: "1px solid #EDE7F6",
              background: "white",
              fontSize: 14,
              color: "#3D2C3E",
              marginBottom: 12,
              boxSizing: "border-box",
            }}
          />
          <input
            type="password"
            placeholder="Parolă"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 16,
              border: "1px solid #EDE7F6",
              background: "white",
              fontSize: 14,
              color: "#3D2C3E",
              marginBottom: 12,
              boxSizing: "border-box",
            }}
          />
          {error && (
            <p style={{ color: "#E74C3C", fontSize: 13, marginBottom: 8 }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 999,
              background: "#D4849A",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            {loading ? "Se încarcă..." : "Intră în cont"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 13,
            color: "#8B7A8E",
          }}
        >
          Nu ai cont?{" "}
          <a href="/register" style={{ color: "#D4849A", fontWeight: 700 }}>
            Înregistrează-te
          </a>
        </p>
      </div>
    </div>
  );
}
