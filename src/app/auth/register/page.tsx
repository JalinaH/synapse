"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brain, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Space_Grotesk } from "next/font/google";

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function RegisterPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/dashboard");
  };

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
            Create your account
          </h1>
          <p className={isDark ? "text-gray-400" : "text-gray-500"}>
            Start your second brain with Synapse
          </p>
        </div>

        <div
          className={`rounded-2xl border p-6 shadow-xl transition-colors ${
            isDark
              ? "bg-neutral-900/80 border-neutral-800 shadow-black/30"
              : "bg-white/80 border-gray-100 shadow-gray-200/60"
          }`}
        >
          <form className="space-y-4" onSubmit={handleRegister}>
            <div className="space-y-2">
              <label
                className={`text-sm font-medium ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
                htmlFor="email"
              >
                Email
              </label>
              <input
                className={`w-full rounded-xl border px-4 py-3 text-sm transition-colors outline-none ${
                  isDark
                    ? "bg-neutral-950 border-neutral-800 text-gray-100 placeholder:text-gray-500 focus:border-neutral-600"
                    : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-gray-400"
                }`}
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label
                className={`text-sm font-medium ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
                htmlFor="password"
              >
                Password
              </label>
              <input
                className={`w-full rounded-xl border px-4 py-3 text-sm transition-colors outline-none ${
                  isDark
                    ? "bg-neutral-950 border-neutral-800 text-gray-100 placeholder:text-gray-500 focus:border-neutral-600"
                    : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-gray-400"
                }`}
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className={`w-full rounded-xl px-4 py-3 text-sm font-semibold shadow-lg transition-all hover:scale-[1.02] ${
                isDark
                  ? "bg-white text-black hover:bg-gray-100 shadow-black/30"
                  : "bg-black text-white hover:bg-gray-900 shadow-gray-300/60"
              }`}
            >
              Create account
            </button>
          </form>

          <div
            className={`mt-4 flex items-center justify-between text-sm ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            <span>Already have an account?</span>
            <Link
              href="/auth/login"
              className={`font-semibold hover:underline ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
