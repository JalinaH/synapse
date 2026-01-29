"use client";

import { useState } from "react";
import { addNote, searchNotes } from "@/app/actions";
import { useTheme } from "@/components/theme-provider";
import { Plus, Search, Sparkles } from "lucide-react";

interface Note {
  id: string;
  content: string;
  similarity: number;
}

export default function Dashboard() {
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  async function handleSearch(formData: FormData) {
    setIsSearching(true);
    const query = formData.get("query") as string;
    const results = await searchNotes(query);
    setSearchResults(results);
    setIsSearching(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
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
            await addNote(formData);
            alert("Note saved to brain!");
          }}
        >
          <textarea
            name="content"
            className={`w-full p-4 rounded-xl min-h-[120px] mb-4 border transition-colors resize-none ${
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
        {searchResults.length === 0 && !isSearching && (
          <p className="text-gray-400 text-center italic">No memories found.</p>
        )}
      </div>
    </div>
  );
}
