"use client";

import { useState } from "react";
import { updateNote } from "@/app/actions";
import Markdown from "react-markdown"; // The markdown renderer
import { Edit2, Save, X } from "lucide-react";

interface Note {
  id: string;
  content: string;
  created_at: string;
}

export function NoteEditor({ note }: { note: Note }) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const formData = new FormData();
    formData.append("noteId", note.id);
    formData.append("content", content);

    await updateNote(formData); // Call Server Action
    setIsEditing(false);
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col flex-1 bg-white rounded-2xl border shadow-sm h-full overflow-hidden">
      {/* Toolbar */}
      <div className="border-b px-6 py-4 flex justify-between items-center bg-gray-50/50">
        <div className="text-sm text-gray-500 font-mono">
          ID: {note.id} • {new Date(note.created_at).toLocaleDateString()}
        </div>

        {isEditing ? (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-md transition flex items-center gap-2"
            >
              <X size={16} /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1.5 text-sm bg-black text-white rounded-md hover:bg-gray-800 transition flex items-center gap-2"
            >
              {isSaving ? (
                "Saving..."
              ) : (
                <>
                  <Save size={16} /> Save Changes
                </>
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1.5 text-sm border bg-white hover:bg-gray-50 rounded-md transition flex items-center gap-2"
          >
            <Edit2 size={16} /> Edit Note
          </button>
        )}
      </div>

      {/* Editor / Viewer Area */}
      <div className="flex-1 overflow-y-auto p-8">
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full resize-none outline-none text-lg leading-relaxed text-gray-800 font-mono bg-transparent"
            placeholder="Start typing..."
            autoFocus
          />
        ) : (
          // Tailwind Typography (prose) makes the markdown look great automatically
          <article className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-blue-600">
            <Markdown>{content}</Markdown>
          </article>
        )}
      </div>
    </div>
  );
}
