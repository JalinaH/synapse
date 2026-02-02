"use client";

import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Zap,
  Search,
  Shield,
  Database,
  Sparkles,
  Play,
  Sun,
  Moon,
} from "lucide-react";
import { Space_Grotesk } from "next/font/google";
import { useTheme } from "@/components/theme-provider";

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={`${grotesk.className} min-h-screen ${
        isDark ? "bg-[#050505] text-gray-50" : "bg-white text-black"
      } selection:bg-gray-900 selection:text-white transition-colors`}
    >
      {/* 1. NAVBAR */}
      <nav
        className={`border-b sticky top-0 backdrop-blur-xl z-50 transition-colors ${
          isDark
            ? "bg-neutral-900/75 border-neutral-800"
            : "bg-white/75 border-gray-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 font-semibold text-lg">
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
                className={`text-base ${
                  isDark ? "text-gray-50" : "text-gray-900"
                }`}
              >
                Second Brain
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className={`text-sm font-medium transition ${
                isDark
                  ? "text-gray-300 hover:text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Sign In
            </Link>
            <Link
              href="/auth/login"
              className={`text-sm px-4 py-2 rounded-full transition shadow-md ${
                isDark
                  ? "bg-white text-black hover:bg-gray-100 shadow-black/30"
                  : "bg-black text-white hover:bg-gray-900 shadow-gray-200"
              }`}
            >
              Get Started
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className={`ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                isDark
                  ? "border-neutral-700 bg-neutral-900 text-gray-200 hover:border-neutral-500"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section
        className={`relative overflow-hidden pt-28 pb-20 px-6 transition-colors ${
          isDark ? "bg-[#050505]" : "bg-white"
        }`}
      >
        <div className="absolute inset-0 -z-10">
          <div
            className={`absolute -top-32 right-0 w-[420px] h-[420px] blur-3xl ${
              isDark
                ? "bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.18),transparent_60%)]"
                : "bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15),transparent_60%)]"
            }`}
          />
          <div
            className={`absolute -bottom-24 -left-12 w-[480px] h-[480px] blur-3xl ${
              isDark
                ? "bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.2),transparent_60%)]"
                : "bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.18),transparent_60%)]"
            }`}
          />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-6 shadow-sm transition-colors ${
              isDark
                ? "bg-white/10 border border-white/10 text-gray-100 shadow-black/20"
                : "bg-white/70 border border-gray-200 text-gray-700 shadow-gray-200"
            }`}
          >
            <Sparkles size={12} className="text-amber-500" />
            <span className={isDark ? "text-gray-100" : "text-gray-700"}>
              Gemini 2.5 Flash • Vector Memory • RLS Secure
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight mb-8 leading-[1.05]">
            Keep every idea alive.
            <br />
            <span className={isDark ? "text-gray-400" : "text-gray-500"}>
              Recall it in milliseconds.
            </span>
          </h1>
          <p
            className={`text-lg md:text-xl mb-10 max-w-3xl mx-auto leading-relaxed ${
              isDark ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Synapse captures your learnings, turns them into searchable vectors,
            and surfaces the right thought when you need it. No more digging
            through tabs and docs—just ask and retrieve.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/login"
              className={`px-8 py-4 rounded-xl font-semibold flex items-center gap-2 transition-all hover:scale-[1.02] shadow-xl ${
                isDark
                  ? "bg-white text-gray-900 hover:bg-gray-100 shadow-black/30"
                  : "bg-gray-900 text-white hover:bg-black shadow-gray-300/60"
              }`}
            >
              Start Thinking Clearly <ArrowRight size={18} />
            </Link>
            <button
              className={`px-8 py-4 rounded-xl font-semibold flex items-center gap-2 transition-all border ${
                isDark
                  ? "bg-neutral-900 border-neutral-800 text-gray-100 hover:border-neutral-600 hover:shadow-lg hover:shadow-black/30"
                  : "bg-white border-gray-200 text-gray-800 hover:border-gray-300 hover:shadow-md"
              }`}
            >
              <Play size={18} /> View Demo
            </button>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            {["Semantic recall", "Supabase secured", "0-setup onboarding"].map(
              (item) => (
                <div
                  key={item}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-sm transition-colors ${
                    isDark
                      ? "border-neutral-800 bg-neutral-900/80 shadow-black/20"
                      : "border-gray-100 bg-white/70 shadow-gray-200"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-linear-to-br from-gray-900 via-gray-800 to-gray-600 text-white flex items-center justify-center text-sm font-semibold">
                    ●
                  </div>
                  <p
                    className={`text-sm font-medium ${
                      isDark ? "text-gray-200" : "text-gray-800"
                    }`}
                  >
                    {item}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* 3. FEATURES (Bento Grid Style) */}
      <section
        className={`py-24 transition-colors ${
          isDark ? "bg-neutral-950" : "bg-gray-50"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold mb-3">
              Why teams switch to Synapse
            </h2>
            <p
              className={`${
                isDark ? "text-gray-400" : "text-gray-500"
              } max-w-2xl mx-auto`}
            >
              A living knowledge base that stays private, stays fast, and stays
              in sync with how you think.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1: Vector Search */}
            <div
              className={`group relative md:col-span-2 rounded-3xl border p-8 shadow-xl overflow-hidden transition-colors ${
                isDark
                  ? "border-neutral-800 bg-neutral-900/80 shadow-black/30"
                  : "border-gray-100 bg-white/80 shadow-gray-200/60"
              }`}
            >
              <div
                className={`absolute inset-0 opacity-70 ${
                  isDark
                    ? "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_50%)]"
                    : "bg-linear-to-br from-blue-50 via-transparent to-green-50"
                }`}
              />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-100">
                    <Search size={22} />
                  </div>
                  <h3
                    className={`text-2xl font-semibold mb-2 ${
                      isDark ? "text-gray-50" : "text-gray-900"
                    }`}
                  >
                    Semantic Search
                  </h3>
                  <p
                    className={`${
                      isDark ? "text-gray-300" : "text-gray-600"
                    } mb-6 max-w-xl`}
                  >
                    Don&apos;t search for keywords. Search for <i>concepts</i>.
                    Ask &quot;What did I learn about React hooks?&quot; and
                    Synapse finds the answer, even if you never used the word
                    &quot;hook&quot;.
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold tracking-[0.12em] px-3 py-1 rounded-full border transition-colors ${
                    isDark
                      ? "text-gray-200 bg-neutral-900/70 border-neutral-800"
                      : "text-gray-500 bg-white/80 border-gray-100"
                  }`}
                >
                  Embeddings
                </span>
              </div>
              <div
                className={`relative rounded-2xl p-5 font-mono text-sm border shadow-inner ${
                  isDark
                    ? "bg-neutral-950 text-gray-100 border-neutral-800 shadow-black/50"
                    : "bg-gray-900 text-gray-100 border-gray-800 shadow-gray-900/40"
                }`}
              >
                <div className="flex gap-2 mb-3 text-emerald-300">
                  <span className="text-green-400">➜</span>
                  <span className="text-gray-300">user</span>
                  <span className="text-gray-500">/semantic-query</span>
                </div>
                <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                  <div className="text-amber-200">
                    &quot;Ideas for marketing?&quot;
                  </div>
                  <div className="text-gray-400 mt-3">
                    synapse → Found 3 related notes • confidence 92%
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2: Fast */}
            <div
              className={`rounded-3xl border p-8 shadow-xl hover:-translate-y-1 transition-transform ${
                isDark
                  ? "border-neutral-800 bg-neutral-900/80 shadow-black/30"
                  : "border-gray-100 bg-white/80 shadow-gray-200/60"
              }`}
            >
              <div className="w-12 h-12 bg-linear-to-br from-amber-400 to-orange-500 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-amber-100">
                <Zap size={22} />
              </div>
              <h3
                className={`text-xl font-semibold mb-2 ${
                  isDark ? "text-gray-50" : "text-gray-900"
                }`}
              >
                Lightning Fast
              </h3>
              <p
                className={`${isDark ? "text-gray-300" : "text-gray-600"} mb-4`}
              >
                Built on Next.js edge routes and Supabase. No spinners—just
                instant capture and recall.
              </p>
              <p
                className={`text-sm font-semibold ${
                  isDark ? "text-amber-400" : "text-amber-600"
                }`}
              >
                Sub-150ms query latency
              </p>
            </div>

            {/* Feature 3: Secure */}
            <div
              className={`rounded-3xl border p-8 shadow-xl hover:-translate-y-1 transition-transform ${
                isDark
                  ? "border-neutral-800 bg-neutral-900/80 shadow-black/30"
                  : "border-gray-100 bg-white/80 shadow-gray-200/60"
              }`}
            >
              <div className="w-12 h-12 bg-linear-to-br from-emerald-400 to-emerald-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-100">
                <Shield size={22} />
              </div>
              <h3
                className={`text-xl font-semibold mb-2 ${
                  isDark ? "text-gray-50" : "text-gray-900"
                }`}
              >
                Private by Default
              </h3>
              <p
                className={`${isDark ? "text-gray-300" : "text-gray-600"} mb-4`}
              >
                Row Level Security keeps each workspace isolated. Your thoughts
                never leave your account.
              </p>
              <p
                className={`text-sm font-semibold ${
                  isDark ? "text-emerald-400" : "text-emerald-600"
                }`}
              >
                End-to-end access control
              </p>
            </div>

            {/* Feature 4: Infinite Storage */}
            <div
              className={`group relative md:col-span-2 rounded-3xl border p-8 shadow-xl overflow-hidden transition-colors ${
                isDark
                  ? "border-neutral-800 bg-neutral-900/80 shadow-black/30"
                  : "border-gray-100 bg-white/80 shadow-gray-200/60"
              }`}
            >
              <div
                className={`absolute inset-0 opacity-70 ${
                  isDark
                    ? "bg-[radial-gradient(circle_at_top_left,rgba(147,197,253,0.08),transparent_55%)]"
                    : "bg-linear-to-r from-purple-50 via-transparent to-blue-50"
                }`}
              />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="w-12 h-12 bg-linear-to-br from-purple-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-100">
                    <Database size={22} />
                  </div>
                  <h3
                    className={`text-2xl font-semibold mb-2 ${
                      isDark ? "text-gray-50" : "text-gray-900"
                    }`}
                  >
                    Infinite Memory
                  </h3>
                  <p
                    className={`${
                      isDark ? "text-gray-300" : "text-gray-600"
                    } max-w-xl`}
                  >
                    Store thousands of notes without slowing down. Our vector
                    database scales with you, clustering related ideas
                    automatically.
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold tracking-[0.12em] px-3 py-1 rounded-full border transition-colors ${
                    isDark
                      ? "text-gray-200 bg-neutral-900/70 border-neutral-800"
                      : "text-gray-500 bg-white/80 border-gray-100"
                  }`}
                >
                  Scales
                </span>
              </div>
              <div
                className={`relative mt-6 grid grid-cols-2 gap-3 text-sm ${
                  isDark ? "text-gray-200" : "text-gray-800"
                }`}
              >
                {[
                  { label: "Embeddings", value: "768-dim" },
                  { label: "Notes", value: "∞" },
                  { label: "Recall", value: "< 200ms" },
                  { label: "Backups", value: "Daily" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`rounded-2xl border px-4 py-3 shadow-sm transition-colors ${
                      isDark
                        ? "border-neutral-800 bg-neutral-900/80"
                        : "border-gray-100 bg-white/80"
                    }`}
                  >
                    <div
                      className={`text-xs uppercase tracking-[0.14em] ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {stat.label}
                    </div>
                    <div
                      className={`text-lg font-semibold ${
                        isDark ? "text-gray-100" : "text-gray-900"
                      }`}
                    >
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CTA SECTION */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto rounded-3xl border border-gray-100 bg-linear-to-br from-gray-900 via-gray-800 to-black text-white overflow-hidden shadow-2xl shadow-gray-300/50">
          <div className="grid md:grid-cols-3">
            <div className="md:col-span-2 p-10 md:p-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold tracking-[0.12em] uppercase text-gray-200 border border-white/10">
                Ready when you are
              </div>
              <h2 className="text-4xl md:text-5xl font-semibold mt-6 mb-4 leading-tight">
                Upgrade your mind. Ship ideas faster.
              </h2>
              <p className="text-lg text-gray-200/90 mb-10 max-w-2xl">
                Create a free account, capture your knowledge, and recall it
                instantly. No credit card, no friction—just speed.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/auth/login"
                  className="px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold flex items-center gap-2 hover:bg-gray-100 transition-all shadow-lg"
                >
                  Create Free Account <ArrowRight size={18} />
                </Link>
                <Link
                  href="/auth/login"
                  className="px-8 py-4 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/10 transition-all"
                >
                  Explore the dashboard
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-4 text-sm text-gray-300">
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10">
                  RLS secured
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10">
                  Vector search ready
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10">
                  Gemini embeddings
                </span>
              </div>
            </div>
            <div className="p-10 md:p-12 bg-white/5 backdrop-blur">
              <div className="grid gap-4 text-sm">
                {[
                  { label: "Setup", value: "< 2 min" },
                  { label: "Latency", value: "~150 ms" },
                  { label: "Availability", value: "99.9%" },
                  { label: "Retention", value: "Daily snapshots" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <span className="text-gray-200/90">{item.label}</span>
                    <span className="font-semibold text-white">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                <div className="text-xs uppercase tracking-[0.14em] text-gray-300 mb-2">
                  Live memory meter
                </div>
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-3/4 rounded-full bg-linear-to-r from-emerald-400 via-amber-300 to-blue-400" />
                </div>
                <div className="mt-2 text-sm text-gray-200">
                  12,480 notes indexed
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="py-12 border-t bg-white text-gray-500 text-sm">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 font-semibold text-black">
            <Brain size={16} />
            <span>Synapse</span>
          </div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-black transition">
              Twitter
            </a>
            <a href="#" className="hover:text-black transition">
              GitHub
            </a>
            <a href="#" className="hover:text-black transition">
              Privacy
            </a>
          </div>
          <div className="text-gray-400">
            © {new Date().getFullYear()} Synapse Inc.
          </div>
        </div>
      </footer>
    </div>
  );
}
