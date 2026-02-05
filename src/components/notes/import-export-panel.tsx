"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { exportNotes, importNotes } from "@/app/actions";
import { useTheme } from "@/components/theme-provider";

type ExportNote = {
  id: string;
  content: string;
  created_at?: string | null;
  tags?: string[] | null;
};

type ImportNote = {
  content: string;
  tags?: string[];
};

type ImportPayload = {
  notes: ImportNote[];
};

const EXPORT_FILE_PREFIX = "synapse-notes";

function normalizeTag(tag: string) {
  return tag
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function normalizeTags(tags: string[] = []) {
  const normalized = tags.map(normalizeTag).filter(Boolean);
  return Array.from(new Set(normalized));
}

function escapeCsv(value: string) {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

function notesToCsv(notes: ExportNote[]) {
  const header = ["id", "content", "tags", "created_at"];
  const rows = notes.map((note) => [
    note.id,
    note.content,
    (note.tags || []).join("|"),
    note.created_at || "",
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCsv(String(cell))).join(","))
    .join("\n");
}

function notesToMarkdown(notes: ExportNote[]) {
  return notes
    .map((note) => {
      const tags = (note.tags || []).join(", ");
      return [
        `### ${note.id}`,
        `Tags: ${tags}`,
        `Created: ${note.created_at || ""}`,
        "",
        note.content,
        "",
      ].join("\n");
    })
    .join("\n---\n");
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      current.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      current.push(field);
      if (current.length > 1 || current[0]) rows.push(current);
      current = [];
      field = "";
      continue;
    }

    field += char;
  }

  current.push(field);
  if (current.length > 1 || current[0]) rows.push(current);
  return rows;
}

function parseImportNotes(fileName: string, text: string): ImportNote[] {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".json")) {
    const parsed = JSON.parse(text);
    const rawNotes = Array.isArray(parsed)
      ? parsed
      : (parsed as ImportPayload).notes;
    if (!Array.isArray(rawNotes)) return [];
    return rawNotes
      .map((note) => {
        if (!note || typeof note !== "object") return null;
        const content = String((note as ImportNote).content || "").trim();
        if (!content) return null;
        const rawTags = (note as ImportNote).tags || [];
        const tags = Array.isArray(rawTags)
          ? normalizeTags(rawTags.map((tag) => String(tag)))
          : [];
        return { content, tags };
      })
      .filter(Boolean) as ImportNote[];
  }

  if (lower.endsWith(".csv")) {
    const rows = parseCsv(text);
    if (rows.length === 0) return [];
    const header = rows[0].map((cell) => cell.trim().toLowerCase());
    const contentIndex = header.indexOf("content");
    if (contentIndex === -1) return [];
    const tagsIndex = header.indexOf("tags");
    return rows
      .slice(1)
      .map((row) => {
        const content = (row[contentIndex] || "").trim();
        const rawTags = tagsIndex >= 0 ? row[tagsIndex] || "" : "";
        const tags = rawTags
          ? normalizeTags(
              rawTags.split(/[|,]/).map((tag) => tag.trim()),
            )
          : [];
        return { content, tags };
      })
      .filter((note) => note.content);
  }

  if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
    const blocks = text.split("\n---\n").filter(Boolean);
    return blocks
      .map((block) => {
        const lines = block.split("\n");
        const tagLine = lines.find((line) =>
          line.toLowerCase().startsWith("tags:"),
        );
        const tags = tagLine
          ? normalizeTags(
              tagLine
                .replace(/^tags:/i, "")
                .split(/[|,]/)
                .map((tag) => tag.trim()),
            )
          : [];
        const contentLines = lines.filter(
          (line) =>
            !line.startsWith("### ") &&
            !line.toLowerCase().startsWith("tags:") &&
            !line.toLowerCase().startsWith("created:"),
        );
        const content = contentLines.join("\n").trim();
        if (!content) return null;
        return { content, tags };
      })
      .filter(Boolean) as ImportNote[];
  }

  return [];
}

export function ImportExportPanel() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [pendingImport, setPendingImport] = useState<{
    notes: ImportNote[];
    fileName: string;
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport(format: "json" | "csv" | "md") {
    setIsExporting(true);
    const result = await exportNotes();
    if (result?.error || !result.notes) {
      setStatus({
        type: "error",
        message: result?.error || "Export failed.",
      });
      setIsExporting(false);
      return;
    }

    const notes = result.notes as ExportNote[];
    const date = new Date().toISOString().split("T")[0];

    if (format === "json") {
      const payload = JSON.stringify({ notes }, null, 2);
      downloadFile(
        payload,
        `${EXPORT_FILE_PREFIX}-${date}.json`,
        "application/json",
      );
    }

    if (format === "csv") {
      const payload = notesToCsv(notes);
      downloadFile(
        payload,
        `${EXPORT_FILE_PREFIX}-${date}.csv`,
        "text/csv",
      );
    }

    if (format === "md") {
      const payload = notesToMarkdown(notes);
      downloadFile(
        payload,
        `${EXPORT_FILE_PREFIX}-${date}.md`,
        "text/markdown",
      );
    }

    setIsExporting(false);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const notes = parseImportNotes(file.name, text);
      if (!notes.length) {
        setStatus({
          type: "error",
          message: "No valid notes found in this file.",
        });
        event.target.value = "";
        return;
      }
      setPendingImport({ notes, fileName: file.name });
    } catch (error) {
      setStatus({
        type: "error",
        message: "Unable to read this file.",
      });
    } finally {
      event.target.value = "";
    }
  }

  async function confirmImport() {
    if (!pendingImport) return;
    setIsImporting(true);
    const formData = new FormData();
    formData.append(
      "payload",
      JSON.stringify({ notes: pendingImport.notes }),
    );
    const result = await importNotes(formData);
    if (result?.error) {
      setStatus({
        type: "error",
        message: result.error,
      });
    } else {
      setStatus({
        type: "success",
        message: `Imported ${result?.imported || 0} notes.`,
      });
    }
    setPendingImport(null);
    setIsImporting(false);
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv,.md,.markdown"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            isDark
              ? "bg-neutral-800 text-gray-200 hover:bg-neutral-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Import
        </button>
        <button
          type="button"
          onClick={() => handleExport("json")}
          disabled={isExporting}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            isDark
              ? "bg-neutral-800 text-gray-200 hover:bg-neutral-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={() => handleExport("csv")}
          disabled={isExporting}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            isDark
              ? "bg-neutral-800 text-gray-200 hover:bg-neutral-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={() => handleExport("md")}
          disabled={isExporting}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            isDark
              ? "bg-neutral-800 text-gray-200 hover:bg-neutral-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Export Markdown
        </button>
      </div>

      {pendingImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setPendingImport(null)}
          />
          <div
            className={`relative z-10 w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${
              isDark
                ? "bg-neutral-900/95 border-neutral-800 text-gray-100"
                : "bg-white/95 border-gray-200 text-gray-900"
            }`}
            role="dialog"
            aria-modal="true"
          >
            <div className="text-sm font-semibold mb-2">
              Import notes
            </div>
            <p className="text-sm text-muted">
              {pendingImport.notes.length.toLocaleString()} notes ready
              to import from {pendingImport.fileName}.
            </p>
            <div className="mt-4 max-h-40 overflow-y-auto rounded-xl border border-border p-3 text-sm">
              {pendingImport.notes.slice(0, 3).map((note, index) => (
                <div key={`${note.content}-${index}`} className="mb-3">
                  <p className="line-clamp-2">{note.content}</p>
                  {note.tags && note.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {note.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-500"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {pendingImport.notes.length > 3 && (
                <p className="text-xs text-muted">
                  +{pendingImport.notes.length - 3} more
                </p>
              )}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setPendingImport(null)}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  isDark
                    ? "text-gray-200 hover:bg-neutral-800"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isImporting}
                onClick={confirmImport}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  isDark
                    ? "bg-white text-black hover:bg-gray-100"
                    : "bg-black text-white hover:bg-gray-900"
                }`}
              >
                {isImporting ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {status && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setStatus(null)}
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
                status.type === "success" ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {status.type === "success" ? "Success" : "Error"}
            </div>
            <p className="text-sm leading-relaxed">{status.message}</p>
            <button
              type="button"
              className={`mt-5 w-full rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                isDark
                  ? "bg-white text-black hover:bg-gray-100"
                  : "bg-black text-white hover:bg-gray-900"
              }`}
              onClick={() => setStatus(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
