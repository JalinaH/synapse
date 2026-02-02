"use server";

import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Initialize Gemini Client
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

// Helper to safely extract embedding from different SDK versions
type EmbeddingResponse = {
  embedding?: { values?: number[] };
  embeddings?: { values?: number[] }[];
};

function extractEmbedding(result: EmbeddingResponse) {
  // The SDK might return 'embedding' (singular) or 'embeddings' (plural)
  // We check both to be safe.
  return result.embedding?.values || result.embeddings?.[0]?.values;
}

// 1. Add Note Action
export async function addNote(formData: FormData) {
  const content = formData.get("content") as string;
  if (!content) return { error: "Content is required" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  try {
    // Generate Embedding
    const result = await genAI.models.embedContent({
      model: "text-embedding-004",
      contents: content,
      config: { outputDimensionality: 768 },
    });

    const vector = extractEmbedding(result);

    if (!vector) return { error: "Failed to generate embedding" };

    // Save to DB
    const { error } = await supabase.from("notes").insert({
      user_id: user.id,
      content: content,
      embedding: vector,
    });

    if (error) return { error: error.message };
    revalidatePath("/dashboard/notes"); // Refresh the list
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to save note",
    };
  }

  return { success: true };
}

// 2. Search Action (Used by Library Page)
export async function searchNotes(query: string) {
  const supabase = await createClient();

  const result = await genAI.models.embedContent({
    model: "text-embedding-004",
    contents: query,
    config: { outputDimensionality: 768 },
  });

  const vector = extractEmbedding(result);

  const { data } = await supabase.rpc("match_notes", {
    query_embedding: vector,
    match_threshold: 0.3, // Keep low for broad matching
    match_count: 5,
  });

  return data || [];
}

// 3. Auth Actions
export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const origin = (await import("next/headers"))
    .headers()
    .then((h) => h.get("origin"));

  const supabase = await createClient();

  // We pass metadata here so the SQL Trigger handles the Profile creation
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await origin}/auth/callback`,
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // No manual profile insertion needed (The Trigger does it!)
  redirect("/auth/login?message=Check your email to continue");
}

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

// 4. Update Note
export async function updateNote(formData: FormData) {
  const noteId = formData.get("noteId") as string;
  const content = formData.get("content") as string;

  const supabase = await createClient();

  // Generate NEW Embedding
  const result = await genAI.models.embedContent({
    model: "text-embedding-004",
    contents: content,
    config: { outputDimensionality: 768 },
  });

  const vector = extractEmbedding(result);

  // Update Supabase
  const { error } = await supabase
    .from("notes")
    .update({
      content: content,
      embedding: vector,
    })
    .eq("id", noteId);

  if (error) throw new Error("Failed to update note");

  revalidatePath(`/dashboard/notes/${noteId}`);
}

// 5. Chat Action (RAG)
interface RelatedNote {
  id: string;
  content: string;
  similarity: number;
}

export async function chatWithBrain(
  history: { role: string; content: string }[],
  userQuestion: string,
) {
  const supabase = await createClient();

  // 1. Embed the user's question
  const result = await genAI.models.embedContent({
    model: "text-embedding-004",
    contents: userQuestion,
    config: { outputDimensionality: 768 },
  });

  const vector = extractEmbedding(result);

  // 2. Find relevant notes
  // FIXED: We destructured 'error' here so we can check it
  const { data: relatedNotes, error } = await supabase.rpc("match_notes", {
    query_embedding: vector,
    match_threshold: 0.3, // Lower threshold to find more results
    match_count: 5,
  });

  if (error) {
    return {
      answer: "I had trouble accessing your memory database.",
      sources: [],
    };
  }

  // 3. Construct Context
  const notes = relatedNotes as RelatedNote[] | null;
  const contextText =
    notes?.map((note) => note.content).join("\n---\n") ||
    "No relevant notes found.";

  const response = await genAI.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `
    You are a Second Brain AI. Answer the user's question primarily based on the Context provided below.
    If the answer is not in the context, say "I don't have that in my memory."
    
    CONTEXT (User's Notes):
    ${contextText}
    
    USER QUESTION:
    ${userQuestion}
  `,
  });

  const text = response.text || "";

  return { answer: text, sources: notes };
}
