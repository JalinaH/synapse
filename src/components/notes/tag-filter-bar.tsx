"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

const MAX_SUGGESTIONS = 8;

function normalizeTag(value: string) {
  return value
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function buildQuery(tags: string[]) {
  const unique = Array.from(new Set(tags.filter(Boolean)));
  if (!unique.length) return "";
  return `?tag=${unique.join(",")}`;
}

export function TagFilterBar({
  allTags,
  selectedTags,
}: {
  allTags: string[];
  selectedTags: string[];
}) {
  const router = useRouter();
  const [input, setInput] = useState("");

  const selectedSet = useMemo(
    () => new Set(selectedTags),
    [selectedTags],
  );

  const normalizedInput = normalizeTag(input);

  const suggestions = useMemo(() => {
    if (!allTags.length) return [];
    if (!normalizedInput) {
      return allTags.filter((tag) => !selectedSet.has(tag)).slice(0, 6);
    }
    return allTags
      .filter(
        (tag) =>
          tag.includes(normalizedInput) && !selectedSet.has(tag),
      )
      .slice(0, MAX_SUGGESTIONS);
  }, [allTags, normalizedInput, selectedSet]);

  function updateTags(next: string[]) {
    const query = buildQuery(next);
    router.push(`/dashboard/notes${query}`);
  }

  function addTag(value: string) {
    const normalized = normalizeTag(value);
    if (!normalized) return;
    if (selectedSet.has(normalized)) {
      setInput("");
      return;
    }
    updateTags([...selectedTags, normalized]);
    setInput("");
  }

  function removeTag(tag: string) {
    updateTags(selectedTags.filter((item) => item !== tag));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(input);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted">
          Filter by tag
        </span>
        <button
          type="button"
          onClick={() => updateTags([])}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            selectedTags.length === 0
              ? "bg-emerald-500 text-white"
              : "bg-surface text-muted border border-border hover:border-emerald-500/50"
          }`}
        >
          All
        </button>
        {selectedTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => removeTag(tag)}
            className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500 transition-colors hover:bg-emerald-500/20"
          >
            #{tag} x
          </button>
        ))}
      </div>

      <div className="mt-3 max-w-md">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search tags (press Enter)..."
          className="w-full rounded-xl border px-4 py-2 text-sm transition-colors bg-surface border-border text-foreground placeholder:text-muted outline-none focus:border-emerald-500/60"
        />
        {normalizedInput && suggestions.length > 0 && (
          <div className="mt-2 rounded-xl border border-border bg-surface p-2 shadow-lg">
            <div className="text-[11px] uppercase tracking-wide text-muted px-2 py-1">
              Suggestions
            </div>
            <div className="flex flex-wrap gap-2 px-2 pb-2">
              {suggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500 transition-colors hover:bg-emerald-500/20"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}
        {normalizedInput && suggestions.length === 0 && (
          <div className="mt-2 text-xs text-muted">
            No suggestions. Press Enter to filter by #{normalizedInput}.
          </div>
        )}
      </div>
    </div>
  );
}
