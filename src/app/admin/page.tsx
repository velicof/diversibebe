"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  deleteAccount,
  togglePremium,
  type UserAccount,
} from "../lib/store";

const ADMIN_PASSWORD = "diversibebe2026";
const ADMIN_SESSION_KEY = "adminAuth";

function readAccountsFromStorage(): UserAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("diversibebe_data") || "{}";
    const data = JSON.parse(raw) as { accounts?: UserAccount[] };
    return Array.isArray(data.accounts) ? data.accounts : [];
  } catch {
    return [];
  }
}

function isCreatedToday(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function AdminPage() {
  const [hydrated, setHydrated] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [accounts, setAccounts] = useState<UserAccount[]>([]);

  const refreshAccounts = useCallback(() => {
    setAccounts(readAccountsFromStorage());
  }, []);

  useEffect(() => {
    setHydrated(true);
    try {
      if (sessionStorage.getItem(ADMIN_SESSION_KEY) === "true") {
        setAuthed(true);
      }
    } catch {
      /* ignore */
    }
    refreshAccounts();
  }, [refreshAccounts]);

  const stats = useMemo(() => {
    const total = accounts.length;
    const premium = accounts.filter((a) => a.isPremium).length;
    const today = accounts.filter((a) => isCreatedToday(a.createdAt)).length;
    return { total, premium, today };
  }, [accounts]);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (password !== ADMIN_PASSWORD) {
      setAuthError("Parolă incorectă.");
      return;
    }
    setAuthError("");
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
    } catch {
      /* ignore */
    }
    setAuthed(true);
    refreshAccounts();
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  if (!hydrated) {
    return (
      <div
        className="min-h-screen w-full bg-[#FFF8F6] flex items-center justify-center px-6"
        style={{ fontFamily: '"Nunito", sans-serif' }}
      >
        <p className="text-[14px] text-[#8B7A8E]">Se încarcă…</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div
        className="min-h-screen w-full bg-[#FFF8F6] flex items-center justify-center px-6"
        style={{ fontFamily: '"Nunito", sans-serif' }}
      >
        <form
          onSubmit={handleLogin}
          className="w-full max-w-[360px] rounded-[16px] border border-[#EDE7F6] bg-white p-6 shadow-sm"
        >
          <h1 className="text-[18px] font-bold text-[#3D2C3E]">
            Acces admin
          </h1>
          <p className="mt-1 text-[13px] text-[#8B7A8E]">
            Introdu parola pentru a continua.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setAuthError("");
            }}
            className="mt-4 h-11 w-full rounded-xl border border-[#EDE7F6] px-3 text-[14px] outline-none focus:border-[#D4849A]"
            placeholder="Parolă"
            autoComplete="off"
          />
          {authError ? (
            <p className="mt-2 text-[13px] text-[#E88B8B]">{authError}</p>
          ) : null}
          <button
            type="submit"
            className="mt-4 h-11 w-full rounded-full bg-[#3D2C3E] text-[15px] font-bold text-white cursor-pointer"
          >
            Intră
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full bg-[#FFF8F6]"
      style={{ fontFamily: '"Nunito", sans-serif' }}
    >
      <header
        className="w-full px-5 py-4"
        style={{ backgroundColor: "#3D2C3E" }}
      >
        <div className="mx-auto flex max-w-[640px] items-start justify-between gap-3">
          <div>
            <h1 className="text-[18px] font-bold text-white">
              🛡️ Admin Panel
            </h1>
            <p className="mt-1 text-[12px] text-white/70">
              DiversiBebe — Gestionare conturi
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="shrink-0 cursor-pointer border-0 text-[10px] font-bold text-white"
            style={{
              backgroundColor: "#D4849A",
              borderRadius: 8,
              padding: "4px 12px",
            }}
          >
            Ieșire
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[640px] px-4 pb-10 pt-4">
        <div className="flex gap-2">
          <div className="flex-1 rounded-[12px] bg-white px-3 py-3 text-center">
            <p className="text-[20px] font-bold text-[#3D2C3E]">
              {stats.total}
            </p>
            <p className="text-[11px] text-[#8B7A8E]">Total conturi</p>
          </div>
          <div className="flex-1 rounded-[12px] bg-white px-3 py-3 text-center">
            <p className="text-[20px] font-bold text-[#3D2C3E]">
              {stats.premium}
            </p>
            <p className="text-[11px] text-[#8B7A8E]">Conturi premium</p>
          </div>
          <div className="flex-1 rounded-[12px] bg-white px-3 py-3 text-center">
            <p className="text-[20px] font-bold text-[#3D2C3E]">
              {stats.today}
            </p>
            <p className="text-[11px] text-[#8B7A8E]">Conturi azi</p>
          </div>
        </div>

        <section className="mt-5">
          {accounts.length === 0 ? (
            <div className="rounded-[12px] bg-white p-4 text-center text-[14px] text-[#8B7A8E]">
              Nu există conturi încă.
            </div>
          ) : (
            accounts.map((account) => (
              <div
                key={account.email}
                className="mb-2 rounded-[12px] bg-white p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-[14px] font-bold text-[#3D2C3E]">
                    {account.email}
                  </p>
                  {account.isPremium ? (
                    <span
                      className="shrink-0 rounded-[20px] px-2 py-0.5 text-[10px] font-bold text-[#3D2C3E]"
                      style={{ backgroundColor: "#A8DCD1" }}
                    >
                      PREMIUM
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-[13px] text-[#8B7A8E]">
                  Părinte: {account.parentName}
                </p>
                <p className="text-[13px] text-[#8B7A8E]">
                  Bebe: {account.baby.name}
                </p>
                <p className="mt-1 text-[11px] text-[#B8A9BB]">
                  Creat la:{" "}
                  {new Date(account.createdAt).toLocaleString("ro-RO")}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="h-9 flex-1 cursor-pointer rounded-full bg-[#FDE8EE] text-[12px] font-bold text-[#E88B8B]"
                    onClick={() => {
                      deleteAccount(account.email);
                      refreshAccounts();
                    }}
                  >
                    Șterge
                  </button>
                  <button
                    type="button"
                    className="h-9 flex-1 cursor-pointer rounded-full bg-[#E0F5F0] text-[12px] font-bold text-[#0F6E56]"
                    onClick={() => {
                      togglePremium(account.email);
                      refreshAccounts();
                    }}
                  >
                    Premium {account.isPremium ? "OFF" : "ON"}
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
