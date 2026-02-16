"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { deleteNote, updateNote } from "@/app/actions";
import Markdown from "react-markdown"; // The markdown renderer
import { Edit2, Save, X, FileText, Trash2 } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import {
  LinkAutocomplete,
  getActiveMention,
  useNoteLinkCandidates,
} from "@/components/notes/link-autocomplete";
import { getCaretPosition } from "@/components/notes/textarea-caret";

interface Note {
  id: string;
  content: string;
  created_at: string;
  tags?: string[] | null;
}

const MIN_HIGHLIGHT_LENGTH = 3;

function clearCitationMarks(root: HTMLElement) {
  const marks = Array.from(
    root.querySelectorAll<HTMLElement>("mark[data-citation-match='true']"),
  );
  for (const mark of marks) {
    const text = mark.textContent || "";
    mark.replaceWith(document.createTextNode(text));
  }
}

function applyCitationMarks(
  root: HTMLElement,
  query: string,
  className: string,
) {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < MIN_HIGHLIGHT_LENGTH) return null;

  const lowerQuery = normalizedQuery.toLowerCase();
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent) continue;
    if (!node.nodeValue || !node.nodeValue.trim()) continue;
    if (parent.closest("mark[data-citation-match='true']")) continue;
    textNodes.push(node);
  }

  let firstMatch: HTMLElement | null = null;

  for (const textNode of textNodes) {
    const rawText = textNode.nodeValue || "";
    const lowerText = rawText.toLowerCase();
    let start = lowerText.indexOf(lowerQuery);
    if (start === -1) continue;

    const fragment = document.createDocumentFragment();
    let from = 0;

    while (start !== -1) {
      if (start > from) {
        fragment.appendChild(
          document.createTextNode(rawText.slice(from, start)),
        );
      }

      const end = start + normalizedQuery.length;
      const mark = document.createElement("mark");
      mark.setAttribute("data-citation-match", "true");
      mark.className = className;
      mark.textContent = rawText.slice(start, end);
      if (!firstMatch) firstMatch = mark;
      fragment.appendChild(mark);

      from = end;
      start = lowerText.indexOf(lowerQuery, from);
    }

    if (from < rawText.length) {
      fragment.appendChild(document.createTextNode(rawText.slice(from)));
    }

    textNode.replaceWith(fragment);
  }

  return firstMatch;
}

export function NoteEditor({
  note,
  maxChars,
  highlightText,
}: {
  note: Note;
  maxChars: number;
  highlightText?: string;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState<string[]>(note.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaWrapperRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLElement>(null);
  const [cursor, setCursor] = useState(0);
  const [mentionPosition, setMentionPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const citationHighlight = (highlightText || "").trim();
  const linkCandidates = useNoteLinkCandidates(note.id);
  const activeMention = isEditing ? getActiveMention(content, cursor) : null;

  useEffect(() => {
    if (!viewerRef.current) return;

    const root = viewerRef.current;
    clearCitationMarks(root);

    if (isEditing || !citationHighlight) return;

    const firstMatch = applyCitationMarks(
      root,
      citationHighlight,
      isDark
        ? "rounded bg-amber-500/35 px-1 text-amber-100"
        : "rounded bg-amber-300/60 px-1 text-amber-900",
    );

    if (!firstMatch) return;
    firstMatch.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [citationHighlight, isEditing, content, isDark]);

  function updateMentionPosition(value: string, selection: number) {
    const mention = getActiveMention(value, selection);
    if (
      !mention ||
      !textareaRef.current ||
      !textareaWrapperRef.current
    ) {
      setMentionPosition(null);
      return;
    }

    const caret = getCaretPosition(textareaRef.current, selection, value);
    if (!caret) return;

    const textareaRect = textareaRef.current.getBoundingClientRect();
    const wrapperRect = textareaWrapperRef.current.getBoundingClientRect();
    const offsetTop = textareaRect.top - wrapperRect.top;
    const offsetLeft = textareaRect.left - wrapperRect.left;

    const panelWidth = 320;
    const maxLeft =
      textareaWrapperRef.current.clientWidth - panelWidth - 16;
    const clampedLeft = Math.max(
      8,
      Math.min(offsetLeft + caret.left, maxLeft),
    );

    setMentionPosition({
      top: offsetTop + caret.top + caret.lineHeight + 8,
      left: clampedLeft,
    });
  }
  const hasCharLimit = Number.isFinite(maxChars);
  const charCount = content.length;
  const overLimit = hasCharLimit && charCount > maxChars;
  const remaining = hasCharLimit ? Math.max(maxChars - charCount, 0) : null;

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

  function insertLink(noteId: string) {
    if (!activeMention) return;
    const before = content.slice(0, activeMention.start);
    const after = content.slice(cursor);
    const next = `${before}[[${noteId}]]${after}`;
    const nextCursor = before.length + noteId.length + 4;
    setContent(next);
    setCursor(nextCursor);
    updateMentionPosition(next, nextCursor);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(nextCursor, nextCursor);
      }
    });
  }

  const handleSave = async () => {
    if (overLimit) {
      setStatus({
        type: "error",
        message: "Character limit exceeded. Shorten your note to save.",
      });
      return;
    }

    setIsSaving(true);
    setStatus(null);
    const formData = new FormData();
    formData.append("noteId", note.id);
    formData.append("content", content);
    formData.append("tags", JSON.stringify(tags));

    const result = await updateNote(formData); // Call Server Action
    if (result?.error) {
      setStatus({ type: "error", message: result.error });
      setIsSaving(false);
      return;
    }

    setStatus({ type: "success", message: "Note updated." });
    setIsEditing(false);
    setIsSaving(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setStatus(null);

    const formData = new FormData();
    formData.append("noteId", note.id);

    const result = await deleteNote(formData);
    if (result?.error) {
      setStatus({ type: "error", message: result.error });
      setIsDeleting(false);
      return;
    }

    router.push("/dashboard/notes");
    router.refresh();
  };

  return (
    <div
      className={`flex flex-col flex-1 rounded-2xl border shadow-lg overflow-hidden transition-colors ${
        isDark
          ? "bg-neutral-900/80 border-neutral-800 shadow-black/30"
          : "bg-white/80 border-gray-100 shadow-gray-200/60"
      }`}
    >
      {/* Toolbar */}
      <div
        className={`border-b px-6 py-4 flex justify-between items-center transition-colors ${
          isDark
            ? "bg-neutral-900 border-neutral-800"
            : "bg-gray-50/80 border-gray-200"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isDark ? "bg-neutral-800" : "bg-gray-200"
            }`}
          >
            <FileText
              size={16}
              className={isDark ? "text-gray-400" : "text-gray-600"}
            />
          </div>
          <span
            className={`text-sm font-mono ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {new Date(note.created_at).toLocaleDateString()}
          </span>
        </div>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                disabled={isSaving || isDeleting}
                className={`px-4 py-2 text-sm rounded-xl transition-colors flex items-center gap-2 ${
                  isDark
                    ? "text-gray-300 hover:bg-neutral-800"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <X size={16} /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || isDeleting || overLimit}
                className={`px-4 py-2 text-sm rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed ${
                  isDark
                    ? "bg-white text-black hover:bg-gray-100 shadow-black/30"
                    : "bg-black text-white hover:bg-gray-900 shadow-gray-300/60"
                }`}
              >
                {isSaving ? (
                  "Saving..."
                ) : (
                  <>
                    <Save size={16} /> Save Changes
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              disabled={isDeleting}
              className={`px-4 py-2 text-sm rounded-xl font-medium transition-colors flex items-center gap-2 border ${
                isDark
                  ? "bg-neutral-800 border-neutral-700 text-gray-200 hover:border-neutral-600"
                  : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              <Edit2 size={16} /> Edit Note
            </button>
          )}
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={isSaving || isDeleting}
            className={`px-4 py-2 text-sm rounded-xl font-semibold transition-colors flex items-center gap-2 ${
              isDark
                ? "text-red-400 hover:bg-red-500/10"
                : "text-red-500 hover:bg-red-50"
            }`}
          >
            {isDeleting ? "Deleting..." : <Trash2 size={16} />}
            Delete
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
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
            <div className="text-sm font-semibold text-red-500 mb-2">
              Delete note
            </div>
            <p className="text-sm leading-relaxed">
              This will permanently delete the note. This action cannot be
              undone.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
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
                onClick={async () => {
                  setShowDeleteModal(false);
                  await handleDelete();
                }}
                disabled={isDeleting}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  isDark
                    ? "bg-red-500 text-white hover:bg-red-400"
                    : "bg-red-600 text-white hover:bg-red-500"
                }`}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {status && (
        <div
          className={`mx-6 mt-4 rounded-xl border px-4 py-3 text-sm ${
            status.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
              : "border-red-500/20 bg-red-500/10 text-red-500"
          }`}
        >
          {status.message}
        </div>
      )}

      {(tags.length > 0 || isEditing) && (
        <div className="px-6 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  if (isEditing) removeTag(tag);
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  isDark
                    ? "bg-neutral-800 text-gray-200 hover:bg-neutral-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                } ${isEditing ? "cursor-pointer" : "cursor-default"}`}
              >
                #{tag}
                {isEditing ? " x" : ""}
              </button>
            ))}
          </div>
          {isEditing && (
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
          )}
        </div>
      )}

      {/* Editor / Viewer Area */}
      <div className="flex-1 overflow-y-auto">
        {isEditing ? (
          <div className="flex h-full flex-col">
            <div className="relative flex-1" ref={textareaWrapperRef}>
              <textarea
                value={content}
                ref={textareaRef}
                onChange={(event) => {
                  setContent(event.target.value);
                  setCursor(event.target.selectionStart);
                  updateMentionPosition(
                    event.target.value,
                    event.target.selectionStart,
                  );
                }}
                onClick={(event) => {
                  setCursor(event.currentTarget.selectionStart);
                  updateMentionPosition(
                    event.currentTarget.value,
                    event.currentTarget.selectionStart,
                  );
                }}
                onKeyUp={(event) => {
                  setCursor(event.currentTarget.selectionStart);
                  updateMentionPosition(
                    event.currentTarget.value,
                    event.currentTarget.selectionStart,
                  );
                }}
                className={`w-full h-full resize-none outline-none text-lg leading-relaxed font-mono bg-transparent p-8 ${
                  isDark
                    ? "text-gray-100 placeholder:text-gray-600"
                    : "text-gray-800 placeholder:text-gray-400"
                }`}
                placeholder="Start typing..."
                autoFocus
              />
              <div className="px-8">
                <LinkAutocomplete
                  query={
                    activeMention && mentionPosition
                      ? activeMention.query
                      : null
                  }
                  candidates={linkCandidates}
                  onSelect={insertLink}
                  className="absolute z-20 w-[320px]"
                  style={
                    mentionPosition
                      ? {
                          top: mentionPosition.top,
                          left: mentionPosition.left,
                        }
                      : undefined
                  }
                />
              </div>
            </div>
            <div className="px-8 pb-6 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className={isDark ? "text-gray-400" : "text-gray-500"}>
                  Character count
                </span>
                <span
                  className={
                    overLimit
                      ? "text-red-500 font-semibold"
                      : isDark
                        ? "text-gray-300"
                        : "text-gray-600"
                  }
                >
                  {hasCharLimit
                    ? `${charCount.toLocaleString()} / ${maxChars.toLocaleString()}`
                    : charCount.toLocaleString()}
                </span>
              </div>
              {hasCharLimit && (
                <p
                  className={`mt-1 text-[11px] ${
                    overLimit
                      ? "text-red-500"
                      : isDark
                        ? "text-gray-500"
                        : "text-gray-400"
                  }`}
                >
                  {overLimit
                    ? "Limit exceeded. Shorten to save."
                    : `${remaining?.toLocaleString()} characters left`}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8">
            {citationHighlight && (
              <div
                className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                  isDark
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-700"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide">
                  Matched section from chat
                </p>
                <p className="mt-1">{citationHighlight}</p>
              </div>
            )}
            <article
              ref={viewerRef}
              className={`prose prose-lg max-w-none prose-headings:font-bold ${
                isDark
                  ? "prose-invert prose-a:text-blue-400"
                  : "prose-a:text-blue-600"
              }`}
            >
              <Markdown>{content}</Markdown>
            </article>
          </div>
        )}
      </div>
    </div>
  );
}
