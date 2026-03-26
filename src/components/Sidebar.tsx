"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const nav = [
  { label: "Dashboard", href: "/", icon: "⬡" },
  { label: "Matters", href: "/matters", icon: "◈" },
  { label: "Workflows", href: "/workflows", icon: "⬢" },
  { label: "Templates", href: "/templates", icon: "◇" },
  { label: "Settings", href: "/settings", icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <aside className="w-56 h-screen bg-brand-700 text-white flex flex-col fixed left-0 top-0">
      <div className="p-5 border-b border-white/10">
        <h1 className="text-lg font-semibold tracking-tight">Abbado Draft</h1>
        <p className="text-xs text-white/50 mt-0.5">Document Automation</p>
      </div>

      <nav className="flex-1 py-3">
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                active ? "bg-white/15 text-white font-medium" : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-white/50 truncate">{user?.email}</p>
        <button
          onClick={signOut}
          className="text-xs text-white/40 hover:text-white/70 mt-1 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
