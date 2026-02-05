"use client";

import { useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { addNote, searchNotes } from "@/app/actions";
import { useTheme } from "@/components/theme-provider";
import { BookOpen, Plus, Search, Sparkles } from "lucide-react";

interface Note {
  id: string;
  content: string;
  similarity: number;
}

interface Template {
  id: string;
  label: string;
  body: string;
}

export default function Dashboard() {
  const templates: Template[] = [
    {
      id: "daily-log",
      label: "Daily Log",
      body: `## Daily Log
- Date:
- Highlights:
- Challenges:
- Learnings:
- Next steps:
`,
    },
    {
      id: "meeting-notes",
      label: "Meeting Notes",
      body: `## Meeting Notes
- Attendees:
- Agenda:
- Decisions:
- Action items:
`,
    },
    {
      id: "idea-capture",
      label: "Idea Capture",
      body: `## Idea
- Summary:
- Why it matters:
- Next experiment:
- References:
`,
    },
    {
      id: "reading-notes",
      label: "Reading Notes",
      body: `## Reading Notes
- Source:
- Key points:
- Quotes:
- Takeaways:
`,
    },
  ];
  const [draft, setDraft] = useState("");
  const [pendingTemplate, setPendingTemplate] = useState<Template | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [modal, setModal] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  function normalizeTag(value: string) {
    return value
      .trim()
      .replace(/^#+/, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
  }

  function addTag(value: string) {
    const normalized = normalizeTag(value);
    if (!normalized) return;
    setTags((current) =>
      current.includes(normalized) ? current : [...current, normalized],
    );
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags((current) => current.filter((item) => item !== tag));
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(tagInput);
    }
    if (event.key === "Backspace" && tagInput.length === 0 && tags.length) {
      event.preventDefault();
      setTags((current) => current.slice(0, -1));
    }
  }

  function handleTemplateClick(template: Template) {
    if (draft.trim().length === 0) {
      setDraft(template.body);
      return;
    }
    setPendingTemplate(template);
  }

  function applyTemplate(body: string, mode: "replace" | "append") {
    setDraft((current) => {
      if (mode === "replace" || current.length === 0) {
        return body;
      }
      const separator = current.endsWith("\n") ? "\n" : "\n\n";
      return `${current}${separator}${body}`;
    });
    setPendingTemplate(null);
  }

  async function handleSearch(formData: FormData) {
    setIsSearching(true);
    setHasSearched(true);
    const query = formData.get("query") as string;
    const results = await searchNotes(query);
    setSearchResults(results);
    setIsSearching(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1
            className={`text-3xl font-bold tracking-tight ${
              isDark ? "text-gray-50" : "text-gray-900"
            }`}
          >
            Dashboard
          </h1>
          <p className={isDark ? "text-gray-400" : "text-gray-500"}>
            Capture new notes and revisit your library anytime.
          </p>
        </div>
        <Link
          href="/dashboard/notes"
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-lg transition-all hover:scale-[1.02] ${
            isDark
              ? "bg-white text-black hover:bg-gray-100 shadow-black/30"
              : "bg-black text-white hover:bg-gray-900 shadow-gray-300/60"
          }`}
        >
          <BookOpen size={18} />
          Notes Library
        </Link>
      </div>

      {/* 1. Add Note Section */}
      <div
        className={`mb-10 p-6 rounded-2xl border shadow-lg transition-colors ${
          isDark
            ? "bg-neutral-900/80 border-neutral-800 shadow-black/30"
            : "bg-white/80 border-gray-100 shadow-gray-200/60"
        }`}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
            <Plus size={20} />
          </div>
          <h2
            className={`text-xl font-semibold ${
              isDark ? "text-gray-50" : "text-gray-900"
            }`}
          >
            Add to Memory
          </h2>
        </div>
        <form
          action={async (formData) => {
            const result = await addNote(formData);
            if (result?.error) {
              setModal({ type: "error", message: result.error });
              return;
            }
            setModal({ type: "success", message: "Note saved to brain!" });
            setDraft("");
            setTags([]);
            setTagInput("");
          }}
        >
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span
              className={`text-xs font-semibold ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Templates
            </span>
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleTemplateClick(template)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  isDark
                    ? "bg-neutral-800 text-gray-200 hover:bg-neutral-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {template.label}
              </button>
            ))}
          </div>
          <div className="mb-4">
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => removeTag(tag)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    isDark
                      ? "bg-neutral-800 text-gray-200 hover:bg-neutral-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  #{tag} ✕
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add tags (press Enter)..."
                className={`flex-1 min-w-[200px] rounded-xl border px-4 py-2 text-sm transition-colors ${
                  isDark
                    ? "bg-neutral-950 border-neutral-800 text-gray-100 placeholder:text-gray-600 focus:border-neutral-600"
                    : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-gray-400"
                } outline-none`}
              />
              <button
                type="button"
                onClick={() => addTag(tagInput)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                  isDark
                    ? "bg-neutral-800 text-gray-200 hover:bg-neutral-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Add tag
              </button>
            </div>
            <input type="hidden" name="tags" value={JSON.stringify(tags)} />
          </div>
          <textarea
            name="content"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className={`w-full p-4 rounded-xl min-h-[220px] md:min-h-[280px] mb-4 border transition-colors resize-none ${
              isDark
                ? "bg-neutral-950 border-neutral-800 text-gray-100 placeholder:text-gray-500 focus:border-neutral-600"
                : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-gray-400"
            } outline-none`}
            placeholder="What did you learn today?"
            required
          />
          <button
            type="submit"
            className={`px-6 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02] shadow-lg ${
              isDark
                ? "bg-white text-black hover:bg-gray-100 shadow-black/30"
                : "bg-black text-white hover:bg-gray-900 shadow-gray-300/60"
            }`}
          >
            Save Note
          </button>
        </form>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setModal(null)}
          />
          <div
            className={`relative z-10 w-full max-w-sm rounded-2xl border p-6 shadow-2xl ${
              isDark
                ? "bg-neutral-900/95 border-neutral-800 text-gray-100"
                : "bg-white/95 border-gray-200 text-gray-900"
            }`}
            role="dialog"
            aria-modal="true"
          >
            <div
              className={`mb-3 text-sm font-semibold ${
                modal.type === "success" ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {modal.type === "success" ? "Success" : "Error"}
            </div>
            <p className="text-sm leading-relaxed">{modal.message}</p>
            <button
              type="button"
              className={`mt-5 w-full rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                isDark
                  ? "bg-white text-black hover:bg-gray-100"
                  : "bg-black text-white hover:bg-gray-900"
              }`}
              onClick={() => setModal(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {pendingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setPendingTemplate(null)}
          />
          <div
            className={`relative z-10 w-full max-w-sm rounded-2xl border p-6 shadow-2xl ${
              isDark
                ? "bg-neutral-900/95 border-neutral-800 text-gray-100"
                : "bg-white/95 border-gray-200 text-gray-900"
            }`}
            role="dialog"
            aria-modal="true"
          >
            <div
              className={`mb-3 text-sm font-semibold ${
                isDark ? "text-gray-200" : "text-gray-800"
              }`}
            >
              Apply template
            </div>
            <p className="text-sm leading-relaxed text-muted">
              You already have text in this note. Do you want to replace it or
              append the template?
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  isDark
                    ? "bg-neutral-800 text-gray-100 hover:bg-neutral-700"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
                onClick={() => applyTemplate(pendingTemplate.body, "append")}
              >
                Append
              </button>
              <button
                type="button"
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  isDark
                    ? "bg-white text-black hover:bg-gray-100"
                    : "bg-black text-white hover:bg-gray-900"
                }`}
                onClick={() => applyTemplate(pendingTemplate.body, "replace")}
              >
                Replace
              </button>
            </div>
            <button
              type="button"
              className={`mt-3 w-full rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                isDark
                  ? "text-gray-300 hover:bg-neutral-800"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setPendingTemplate(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 2. Search Section */}
      <div
        className={`mb-10 p-6 rounded-2xl border shadow-lg transition-colors ${
          isDark
            ? "bg-neutral-900/80 border-neutral-800 shadow-black/30"
            : "bg-white/80 border-gray-100 shadow-gray-200/60"
        }`}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <Search size={20} />
          </div>
          <h2
            className={`text-xl font-semibold ${
              isDark ? "text-gray-50" : "text-gray-900"
            }`}
          >
            Recall Memory
          </h2>
        </div>
        <form action={handleSearch} className="flex gap-3">
          <input
            name="query"
            className={`flex-1 p-4 rounded-xl border transition-colors ${
              isDark
                ? "bg-neutral-950 border-neutral-800 text-gray-100 placeholder:text-gray-500 focus:border-neutral-600"
                : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-gray-400"
            } outline-none`}
            placeholder="Ask your second brain..."
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
          >
            {isSearching ? "Thinking..." : "Ask"}
          </button>
        </form>
      </div>

      {/* 3. Results Display */}
      <div className="space-y-4">
        {searchResults.map((note) => (
          <div
            key={note.id}
            className={`p-5 rounded-2xl border shadow-md transition-all hover:scale-[1.01] ${
              isDark
                ? "bg-neutral-900/80 border-neutral-800 shadow-black/30 hover:border-neutral-700"
                : "bg-white/80 border-gray-100 shadow-gray-200/60 hover:border-gray-200"
            }`}
          >
            <p className={isDark ? "text-gray-200" : "text-gray-800"}>
              {note.content}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Sparkles size={14} className="text-emerald-500" />
              <span className="text-xs text-emerald-500 font-mono">
                {(note.similarity * 100).toFixed(1)}% match
              </span>
            </div>
          </div>
        ))}
        {hasSearched && searchResults.length === 0 && !isSearching && (
          <p className="text-gray-400 text-center italic">No memories found.</p>
        )}
      </div>
    </div>
  );
}
