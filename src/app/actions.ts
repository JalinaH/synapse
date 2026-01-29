"use server";

import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const genAI = new GoogleGenAI({
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY!,
});

// 1. Add Note Action
export async function addNote(formData: FormData) {
  const content = formData.get("content") as string;
  if (!content) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Generate Embedding
  const result = await genAI.models.embedContent({
    model: "text-embedding-004",
    contents: content,
    config: { outputDimensionality: 768 },
  });

  // Save to DB
  await supabase.from("notes").insert({
    user_id: user.id,
    content: content,
    embedding: result.embeddings?.[0]?.values,
  });
}

// 2. Search Action
export async function searchNotes(query: string) {
  const supabase = await createClient();

  const result = await genAI.models.embedContent({
    model: "text-embedding-004",
    contents: query,
    config: { outputDimensionality: 768 },
  });

  const { data } = await supabase.rpc("match_notes", {
    query_embedding: result.embeddings?.[0]?.values,
    match_threshold: 0.5,
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

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Create profile entry
  if (data.user) {
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
    });

    if (profileError) {
      return { error: profileError.message };
    }
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

// Add this to your existing actions.ts file

export async function updateNote(formData: FormData) {
  const noteId = formData.get("noteId") as string;
  const content = formData.get("content") as string;

  const supabase = await createClient();

  // 1. Generate NEW Embedding (because content changed)
  const result = await genAI.models.embedContent({
    model: "text-embedding-004",
    contents: content,
    config: { outputDimensionality: 768 },
  });

  // 2. Update Supabase
  const { error } = await supabase
    .from("notes")
    .update({
      content: content,
      embedding: result.embeddings?.[0]?.values,
    })
    .eq("id", noteId);

  if (error) throw new Error("Failed to update note");

  // 3. Revalidate the page so it shows fresh data
  revalidatePath(`/dashboard/notes/${noteId}`);
}

// Add to src/app/actions.ts

interface RelatedNote {
  id: string;
  content: string;
  similarity: number;
}

export async function chatWithBrain(
  history: { role: string; content: string }[],
  userQuestion: string
) {
  const supabase = await createClient();

  // 1. Embed the user's question
  const result = await genAI.models.embedContent({
    model: "text-embedding-004",
    contents: userQuestion,
    config: { outputDimensionality: 768 },
  });

  // 2. Find relevant notes
  const { data: relatedNotes } = await supabase.rpc("match_notes", {
    query_embedding: result.embeddings?.[0]?.values,
    match_threshold: 0.5,
    match_count: 5, // Give the AI the top 5 most relevant notes
  });

  // 3. Construct the Context String
  const notes = relatedNotes as RelatedNote[] | null;
  const contextText =
    notes?.map((note) => note.content).join("\n---\n") ||
    "No relevant notes found.";

  // 4. Call Gemini 1.5 Flash with the context
  const response = await genAI.models.generateContent({
    model: "gemini-1.5-flash",
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
