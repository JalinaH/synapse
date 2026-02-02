"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteNote, updateNote } from "@/app/actions";
import Markdown from "react-markdown"; // The markdown renderer
import { Edit2, Save, X, FileText, Trash2 } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

interface Note {
  id: string;
  content: string;
  created_at: string;
}

export function NoteEditor({ note }: { note: Note }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const handleSave = async () => {
    setIsSaving(true);
    setStatus(null);
    const formData = new FormData();
    formData.append("noteId", note.id);
    formData.append("content", content);

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
    if (!confirm("Delete this note? This cannot be undone.")) return;
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
                disabled={isSaving || isDeleting}
                className={`px-4 py-2 text-sm rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg ${
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
            onClick={handleDelete}
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

      {/* Editor / Viewer Area */}
      <div className="flex-1 overflow-y-auto p-8">
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`w-full h-full resize-none outline-none text-lg leading-relaxed font-mono bg-transparent ${
              isDark
                ? "text-gray-100 placeholder:text-gray-600"
                : "text-gray-800 placeholder:text-gray-400"
            }`}
            placeholder="Start typing..."
            autoFocus
          />
        ) : (
          // Tailwind Typography (prose) makes the markdown look great automatically
          <article
            className={`prose prose-lg max-w-none prose-headings:font-bold ${
              isDark
                ? "prose-invert prose-a:text-blue-400"
                : "prose-a:text-blue-600"
            }`}
          >
            <Markdown>{content}</Markdown>
          </article>
        )}
      </div>
    </div>
  );
}
