"use client";

import Link from "next/link";
import { Brain, Sun, Moon, Mail } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Space_Grotesk } from "next/font/google";

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function VerifyEmailPage() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={`${
        grotesk.className
      } min-h-screen flex items-center justify-center px-6 py-12 transition-colors ${
        isDark ? "bg-[#050505] text-gray-50" : "bg-gray-50 text-black"
      }`}
    >
      {/* Theme Toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className={`fixed top-6 right-6 inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
          isDark
            ? "border-neutral-700 bg-neutral-900 text-gray-200 hover:border-neutral-500"
            : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
        }`}
        aria-label="Toggle theme"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-md">
        <div className="mb-8 text-center space-y-3">
          <div
            className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-colors ${
              isDark
                ? "bg-white text-black shadow-black/30"
                : "bg-black text-white shadow-gray-200"
            }`}
          >
            <Brain size={24} />
          </div>
          <h1
            className={`text-2xl font-semibold ${
              isDark ? "text-gray-50" : "text-gray-900"
            }`}
          >
            Verify your email
          </h1>
          <p className={isDark ? "text-gray-400" : "text-gray-500"}>
            Check your inbox to activate your account
          </p>
        </div>

        <div
          className={`rounded-2xl border p-6 shadow-xl transition-colors ${
            isDark
              ? "bg-neutral-900/80 border-neutral-800 shadow-black/30"
              : "bg-white/80 border-gray-100 shadow-gray-200/60"
          }`}
        >
          <div className="flex flex-col items-center space-y-4 text-center">
            <div
              className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${
                isDark ? "bg-neutral-800 text-gray-300" : "bg-gray-100 text-gray-600"
              }`}
            >
              <Mail size={24} />
            </div>

            <p
              className={`text-sm leading-relaxed ${
                isDark ? "text-gray-400" : "text-gray-600"
              }`}
            >
              We sent a verification link to your email address. Click the link
              to verify your account and access your dashboard.
            </p>

            <p
              className={`text-xs ${
                isDark ? "text-gray-500" : "text-gray-400"
              }`}
            >
              Didn&apos;t receive it? Check your spam folder or try signing up
              again.
            </p>
          </div>

          <div className="mt-6">
            <Link
              href="/auth/login"
              className={`block w-full rounded-xl px-4 py-3 text-center text-sm font-semibold shadow-lg transition-all hover:scale-[1.02] ${
                isDark
                  ? "bg-white text-black hover:bg-gray-100 shadow-black/30"
                  : "bg-black text-white hover:bg-gray-900 shadow-gray-300/60"
              }`}
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
