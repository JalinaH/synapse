"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/theme-provider";

export type LinkCandidate = {
  id: string;
  content: string;
};

export type LinkMatch = {
  start: number;
  query: string;
};

const MAX_SUGGESTIONS = 50;

export function getActiveMention(
  text: string,
  cursor: number,
): LinkMatch | null {
  if (!text || cursor <= 0) return null;
  const beforeCursor = text.slice(0, cursor);
  const start = beforeCursor.lastIndexOf("@");
  if (start === -1) return null;
  if (start > 0 && !/\s/.test(beforeCursor[start - 1])) return null;
  const query = beforeCursor.slice(start + 1);
  if (query.includes("\n") || /\s/.test(query)) return null;
  return { start, query };
}

function getPreview(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return "Untitled note";
  const firstLine = trimmed.split("\n")[0].trim();
  return firstLine || "Untitled note";
}

export function useNoteLinkCandidates(excludeId?: string) {
  const [candidates, setCandidates] = useState<LinkCandidate[]>([]);

  useEffect(() => {
    let isActive = true;
    const supabase = createClient();

    supabase
      .from("notes")
      .select("id, content")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (!isActive) return;
        const filtered =
          data?.filter((note) => note.id !== excludeId) || [];
        setCandidates(filtered);
      });

    return () => {
      isActive = false;
    };
  }, [excludeId]);

  return candidates;
}

export function LinkAutocomplete({
  query,
  candidates,
  onSelect,
  className,
  style,
}: {
  query: string | null;
  candidates: LinkCandidate[];
  onSelect: (noteId: string) => void;
  className?: string;
  style?: CSSProperties;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [filter, setFilter] = useState("");
  const effectiveFilter = query === null ? "" : filter;
  const baseQuery = (effectiveFilter.trim() || query || "")
    .trim()
    .toLowerCase();

  const suggestions = useMemo(() => {
    if (!candidates.length || query === null) return [];
    if (!baseQuery) {
      return candidates.slice(0, MAX_SUGGESTIONS);
    }
    return candidates
      .filter((note) => {
        const content = note.content.toLowerCase();
        const id = String(note.id);
        return id.includes(baseQuery) || content.includes(baseQuery);
      })
      .slice(0, MAX_SUGGESTIONS);
  }, [candidates, baseQuery, query]);

  if (query === null) return null;

  return (
    <div
      className={`rounded-2xl border p-3 shadow-lg ${
        isDark
          ? "bg-neutral-900/95 border-neutral-800"
          : "bg-white border-gray-200"
      } ${className || "mt-3"}`}
      style={style}
    >
      <div className="text-[11px] uppercase tracking-wide text-muted px-1 pb-2">
        Mention note
      </div>
      <div className="px-1 pb-2">
        <input
          value={query === null ? "" : filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Search notes..."
          className={`w-full rounded-lg border px-3 py-2 text-xs transition-colors ${
            isDark
              ? "bg-neutral-950 border-neutral-800 text-gray-100 placeholder:text-gray-600 focus:border-neutral-600"
              : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-gray-400"
          } outline-none`}
        />
      </div>
      {suggestions.length === 0 ? (
        <p className="text-xs text-muted px-1 py-1">
          No matching notes.
        </p>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
          {suggestions.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => onSelect(note.id)}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-all hover:scale-[1.01] ${
                isDark
                  ? "bg-neutral-800 border-neutral-700 hover:border-emerald-500/50 text-gray-200"
                  : "bg-gray-50 border-gray-200 hover:border-emerald-500/50 text-gray-800"
              }`}
            >
              <div className="font-medium line-clamp-1">
                {getPreview(note.content)}
              </div>
              <div className="mt-1 text-[10px] text-muted">
                {note.id}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
