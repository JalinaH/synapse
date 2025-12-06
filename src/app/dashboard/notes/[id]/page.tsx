import { createClient } from "@/lib/supabase/server";
import { NoteEditor } from "@/components/notes/note-editor";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

interface RelatedNote {
  id: string;
  content: string;
  similarity: number;
}

export default async function NotePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { id } = await params;

  // 1. Fetch the Main Note
  const { data: note } = await supabase
    .from("notes")
    .select("*")
    .eq("id", id)
    .single();

  if (!note) {
    return <div className="p-10">Note not found</div>;
  }

  // 2. Find Related Notes (The AI "Second Brain" Magic)
  // We use the embedding of the CURRENT note to find others like it
  const { data: relatedNotes } = await supabase.rpc("match_notes", {
    query_embedding: note.embedding, // Use this note's vector
    match_threshold: 0.5, // 50% similarity or higher
    match_count: 4, // Top 4 matches
  });

  // Filter out the current note from the related list
  const filteredRelated =
    (relatedNotes as RelatedNote[] | null)?.filter((n) => n.id !== note.id) ||
    [];

  return (
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100vh-100px)]">
      {/* LEFT COLUMN: Main Editor */}
      <div className="lg:col-span-3 flex flex-col h-full">
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-black mb-4 flex items-center gap-1"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        {/* We pass the note data to the Client Component */}
        <NoteEditor note={note} />
      </div>

      {/* RIGHT COLUMN: AI Sidebar */}
      <div className="border-l pl-8 hidden lg:block overflow-y-auto">
        <div className="flex items-center gap-2 mb-6 text-purple-600 font-medium">
          <Sparkles size={18} />
          <span>Related Thoughts</span>
        </div>

        <div className="space-y-4">
          {filteredRelated.length === 0 ? (
            <p className="text-gray-400 text-sm">No connections found yet.</p>
          ) : (
            filteredRelated.map((related) => (
              <Link
                key={related.id}
                href={`/dashboard/notes/${related.id}`}
                className="block p-4 rounded-xl bg-gray-50 hover:bg-purple-50 hover:border-purple-200 border border-transparent transition group"
              >
                <p className="text-sm text-gray-800 line-clamp-3 mb-2 font-medium">
                  {related.content}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-400 group-hover:text-purple-500">
                  <span>{(related.similarity * 100).toFixed(0)}% Match</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
