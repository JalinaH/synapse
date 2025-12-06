"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  MessageCircle,
  Home,
  LogOut,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";
import { signOut } from "@/app/actions";
import { useTheme } from "@/components/theme-provider";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/chat", label: "Chat", icon: MessageCircle },
];

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <nav
      className={`border-b sticky top-0 backdrop-blur-xl z-50 transition-colors ${
        isDark
          ? "bg-neutral-900/75 border-neutral-800"
          : "bg-white/75 border-gray-200"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors ${
              isDark
                ? "bg-white text-black shadow-black/30"
                : "bg-black text-white shadow-gray-200"
            }`}
          >
            <Brain size={18} />
          </div>
          <div className="flex flex-col leading-tight">
            <span
              className={`text-sm uppercase tracking-[0.12em] ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Synapse
            </span>
            <span
              className={`text-base font-semibold ${
                isDark ? "text-gray-50" : "text-gray-900"
              }`}
            >
              Second Brain
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? isDark
                      ? "bg-white text-black"
                      : "bg-black text-white"
                    : isDark
                    ? "text-gray-300 hover:bg-neutral-800 hover:text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-black"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
              isDark
                ? "border-neutral-700 bg-neutral-900 text-gray-200 hover:border-neutral-500"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
            }`}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <form action={signOut}>
            <button
              type="submit"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                isDark
                  ? "text-red-400 hover:bg-red-500/10"
                  : "text-red-500 hover:bg-red-50"
              }`}
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
