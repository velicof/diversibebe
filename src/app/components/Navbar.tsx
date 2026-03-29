"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavbarProps = {
  activeTab: string;
};

const NAV_ITEMS = [
  { key: "acasa", href: "/dashboard", emoji: "🏠", label: "Acasă" },
  { key: "alimente", href: "/alimente", emoji: "🥄", label: "Alimente" },
  { key: "retete", href: "/retete", emoji: "📖", label: "Rețete" },
  { key: "plan", href: "/plan", emoji: "📅", label: "Plan" },
  { key: "alergii", href: "/alergii", emoji: "🛡️", label: "Alergii" },
  { key: "ghid", href: "/ghid", emoji: "📚", label: "Ghid" },
] as const;

export default function Navbar({ activeTab }: NavbarProps) {
  const pathname = usePathname();
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/register/step2"
  ) {
    return null;
  }

  const normalized = (activeTab || "").toLowerCase();

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[393px] bg-white border-t border-[#FDE8EE] z-10"
      style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
    >
      <div className="h-[72px] px-2 flex items-center justify-between gap-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = normalized === item.key;
          const color = isActive ? "#D4849A" : "#8B7A8E";
          return (
            <Link
              key={item.key}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 cursor-pointer select-none"
              style={{ color, opacity: isActive ? 1 : 0.5 }}
            >
              <span
                className="leading-none shrink-0"
                style={{ fontSize: "16px" }}
                aria-hidden
              >
                {item.emoji}
              </span>
              <span className="text-[9px] font-semibold leading-tight text-center truncate w-full">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
