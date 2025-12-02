"use server";

import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";
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
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
