"use client";

import { useState } from "react";
import Link from "next/link";
import { Brain, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Space_Grotesk } from "next/font/google";
import { signIn } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function LoginPage() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleLogin = async (formData: FormData) => {
    setError(null);
    setIsLoading(true);

    const result = await signIn(formData);

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setIsGoogleLoading(false);
    }
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
            Welcome back
          </h1>
          <p className={isDark ? "text-gray-400" : "text-gray-500"}>
            Sign in to your Synapse workspace
          </p>
        </div>

        <div
          className={`rounded-2xl border p-6 shadow-xl transition-colors ${
            isDark
              ? "bg-neutral-900/80 border-neutral-800 shadow-black/30"
              : "bg-white/80 border-gray-100 shadow-gray-200/60"
          }`}
        >
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className={`w-full flex items-center justify-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark
                ? "border-neutral-700 bg-neutral-800 text-gray-200 hover:border-neutral-500"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
            }`}
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {isGoogleLoading ? "Connecting..." : "Continue with Google"}
          </button>

          <div className="relative my-4">
            <div
              className={`absolute inset-0 flex items-center ${
                isDark ? "text-neutral-700" : "text-gray-200"
              }`}
            >
              <div className="w-full border-t border-current" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span
                className={`px-2 ${
                  isDark
                    ? "bg-neutral-900/80 text-gray-500"
                    : "bg-white/80 text-gray-400"
                }`}
              >
                or
              </span>
            </div>
          </div>

          <form className="space-y-4" action={handleLogin}>
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

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full rounded-xl px-4 py-3 text-sm font-semibold shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed ${
                isDark
                  ? "bg-white text-black hover:bg-gray-100 shadow-black/30"
                  : "bg-black text-white hover:bg-gray-900 shadow-gray-300/60"
              }`}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div
            className={`mt-4 flex items-center justify-between text-sm ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            <span>Don&apos;t have an account?</span>
            <Link
              href="/auth/register"
              className={`font-semibold hover:underline ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
