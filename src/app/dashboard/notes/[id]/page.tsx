import { createClient } from "@/lib/supabase/server";
import { NotePageContent } from "@/components/notes/note-page-content";
import { getTierConfig } from "@/lib/tiers";
import { redirect } from "next/navigation";

interface RelatedNote {
  id: string;
  content: string;
  similarity: number;
}

interface LinkNote {
  id: string;
  content: string;
  created_at: string;
}

function extractLinkedIds(content: string) {
  const matches = content.match(/\[\[([^\]]+)\]\]/g) || [];
  const ids = matches
    .map((match) => match.replace("[[", "").replace("]]", "").trim())
    .filter(Boolean);
  return Array.from(new Set(ids));
}

export default async function NotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ highlight?: string | string[] }>;
}) {
  const supabase = await createClient();
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const highlightParam = resolvedSearchParams?.highlight;
  const highlightText =
    typeof highlightParam === "string"
      ? highlightParam.trim().slice(0, 160)
      : Array.isArray(highlightParam)
        ? String(highlightParam[0] || "").trim().slice(0, 160)
        : "";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = user
    ? await supabase.from("profiles").select("tier").eq("id", user.id).single()
    : { data: null };

  const { maxChars } = getTierConfig(profile?.tier);

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

  const outgoingIds = extractLinkedIds(note.content || "");
  const { data: outgoingLinks } =
    outgoingIds.length > 0
      ? await supabase
          .from("notes")
          .select("id, content, created_at")
          .eq("user_id", user.id)
          .in("id", outgoingIds)
      : { data: [] };

  const { data: backlinkCandidates } = await supabase
    .from("notes")
    .select("id, content, created_at")
    .eq("user_id", user.id)
    .ilike("content", `%[[${id}]]%`);

  const backlinks =
    (backlinkCandidates as LinkNote[] | null)?.filter((candidate) => {
      const ids = extractLinkedIds(candidate.content || "");
      return ids.includes(id);
    }) || [];

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
    <NotePageContent
      note={note}
      relatedNotes={filteredRelated}
      outgoingLinks={(outgoingLinks as LinkNote[] | null) || []}
      backlinks={backlinks}
      maxChars={maxChars}
      highlightText={highlightText}
    />
  );
}
