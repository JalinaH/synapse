import { createClient } from "@/lib/supabase/server";
import { NotePageContent } from "@/components/notes/note-page-content";

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
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500">Note not found</p>
      </div>
    );
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

  return <NotePageContent note={note} relatedNotes={filteredRelated} />;
}
