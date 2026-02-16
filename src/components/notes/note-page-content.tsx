"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { NoteEditor } from "@/components/notes/note-editor";

interface Note {
  id: string;
  content: string;
  created_at: string;
  tags?: string[] | null;
}

interface RelatedNote {
  id: string;
  content: string;
  similarity: number;
}

interface LinkNote {
  id: string;
  content: string;
  created_at: string;
}

interface NotePageContentProps {
  note: Note;
  relatedNotes: RelatedNote[];
  outgoingLinks: LinkNote[];
  backlinks: LinkNote[];
  maxChars: number;
  highlightText?: string;
}

export function NotePageContent({
  note,
  relatedNotes,
  outgoingLinks,
  backlinks,
  maxChars,
  highlightText,
}: NotePageContentProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-4 gap-8 min-h-[calc(100vh-64px)]">
      {/* LEFT COLUMN: Main Editor */}
      <div className="lg:col-span-3 flex flex-col">
        <Link
          href="/dashboard"
          className={`text-sm mb-4 flex items-center gap-1 transition-colors ${
            isDark
              ? "text-gray-400 hover:text-white"
              : "text-gray-500 hover:text-black"
          }`}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        {/* We pass the note data to the Client Component */}
        <NoteEditor note={note} maxChars={maxChars} highlightText={highlightText} />
      </div>

      {/* RIGHT COLUMN: AI Sidebar */}
      <div
        className={`hidden lg:block rounded-2xl border p-6 h-fit shadow-lg transition-colors ${
          isDark
            ? "bg-neutral-900/80 border-neutral-800 shadow-black/30"
            : "bg-white/80 border-gray-100 shadow-gray-200/60"
        }`}
      >
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
              <ArrowLeft size={16} className="rotate-180" />
            </div>
            <span
              className={`font-semibold ${
                isDark ? "text-gray-100" : "text-gray-900"
              }`}
            >
              Links
            </span>
          </div>
          {outgoingLinks.length === 0 ? (
            <p className={isDark ? "text-gray-500" : "text-gray-400"}>
              No outgoing links yet.
            </p>
          ) : (
            <div className="space-y-3">
              {outgoingLinks.map((link) => (
                <Link
                  key={link.id}
                  href={`/dashboard/notes/${link.id}`}
                  className={`block p-4 rounded-xl border transition-all hover:scale-[1.02] ${
                    isDark
                      ? "bg-neutral-800 border-neutral-700 hover:border-emerald-500/50"
                      : "bg-gray-50 border-gray-200 hover:border-emerald-500/50"
                  }`}
                >
                  <p
                    className={`text-sm line-clamp-3 font-medium ${
                      isDark ? "text-gray-200" : "text-gray-800"
                    }`}
                  >
                    {link.content}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <ArrowLeft size={16} />
            </div>
            <span
              className={`font-semibold ${
                isDark ? "text-gray-100" : "text-gray-900"
              }`}
            >
              Backlinks
            </span>
          </div>
          {backlinks.length === 0 ? (
            <p className={isDark ? "text-gray-500" : "text-gray-400"}>
              No backlinks yet.
            </p>
          ) : (
            <div className="space-y-3">
              {backlinks.map((link) => (
                <Link
                  key={link.id}
                  href={`/dashboard/notes/${link.id}`}
                  className={`block p-4 rounded-xl border transition-all hover:scale-[1.02] ${
                    isDark
                      ? "bg-neutral-800 border-neutral-700 hover:border-emerald-500/50"
                      : "bg-gray-50 border-gray-200 hover:border-emerald-500/50"
                  }`}
                >
                  <p
                    className={`text-sm line-clamp-3 font-medium ${
                      isDark ? "text-gray-200" : "text-gray-800"
                    }`}
                  >
                    {link.content}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          <span
            className={`font-semibold ${
              isDark ? "text-gray-100" : "text-gray-900"
            }`}
          >
            Related Thoughts
          </span>
        </div>

        <div className="space-y-3">
          {relatedNotes.length === 0 ? (
            <p className={isDark ? "text-gray-500" : "text-gray-400"}>
              No connections found yet.
            </p>
          ) : (
            relatedNotes.map((related) => (
              <Link
                key={related.id}
                href={`/dashboard/notes/${related.id}`}
                className={`block p-4 rounded-xl border transition-all hover:scale-[1.02] ${
                  isDark
                    ? "bg-neutral-800 border-neutral-700 hover:border-amber-500/50"
                    : "bg-gray-50 border-gray-200 hover:border-amber-500/50"
                }`}
              >
                <p
                  className={`text-sm line-clamp-3 mb-2 font-medium ${
                    isDark ? "text-gray-200" : "text-gray-800"
                  }`}
                >
                  {related.content}
                </p>
                <div className="flex items-center gap-1 text-xs text-amber-500">
                  <Sparkles size={12} />
                  <span>{(related.similarity * 100).toFixed(0)}% match</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
