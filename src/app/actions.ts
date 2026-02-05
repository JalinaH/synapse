"use server";

import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SupabaseClient } from "@supabase/supabase-js";
import { getTierConfig } from "@/lib/tiers";

// Initialize Gemini Client
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const CREDIT_RESET_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_CREDIT_UPDATE_ATTEMPTS = 3;
const MAX_SUMMARY_CONTEXT_CHARS = 20000;
const MAX_SUMMARY_NOTES = 100;
const MAX_SYNTHESIS_CONTEXT_CHARS = 20000;
const MAX_SYNTHESIS_NOTES = 40;
const SYNTHESIS_MATCH_COUNT = 15;
const SYNTHESIS_MATCH_THRESHOLD = 0.2;
const MAX_IMPORT_NOTES = 50;

// --- HELPER FUNCTIONS ---

type EmbeddingResponse = {
  embedding?: { values?: number[] };
  embeddings?: { values?: number[] }[];
};

type CreditProfile = {
  tier?: string | null;
  credits_used?: number | null;
  billing_start_date?: string | null;
};

function extractEmbedding(result: EmbeddingResponse) {
  return result.embedding?.values || result.embeddings?.[0]?.values;
}

function normalizeTagValue(tag: string) {
  return tag
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function normalizeTags(tags: string[]) {
  const normalized = tags.map(normalizeTagValue).filter(Boolean);
  return Array.from(new Set(normalized));
}

function resolveCreditState(profile: CreditProfile, now: Date) {
  const { tier, credits: limit } = getTierConfig(profile.tier);
  const currentUsage =
    typeof profile.credits_used === "number" ? profile.credits_used : 0;
  const billingStartRaw = profile.billing_start_date;
  const billingStartDate = billingStartRaw ? new Date(billingStartRaw) : null;
  const hasValidBillingStart =
    billingStartDate && !Number.isNaN(billingStartDate.getTime());
  const isNewCycle =
    !hasValidBillingStart ||
    now.getTime() - billingStartDate.getTime() > CREDIT_RESET_MS;
  const normalizedUsage = isNewCycle ? 0 : currentUsage;
  const nextBillingStart = isNewCycle
    ? now.toISOString()
    : billingStartRaw || now.toISOString();

  return {
    tier,
    limit,
    currentUsage,
    billingStartRaw,
    isNewCycle,
    normalizedUsage,
    nextBillingStart,
  };
}

function isSummaryRequest(question: string) {
  const normalized = question.trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("summarize") ||
    normalized.includes("summary") ||
    normalized.includes("recap") ||
    normalized.includes("overview") ||
    normalized.includes("all notes") ||
    normalized.includes("my notes") ||
    normalized.includes("everything")
  );
}

function isSynthesisRequest(question: string) {
  const normalized = question.trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("plan") ||
    normalized.includes("roadmap") ||
    normalized.includes("strategy") ||
    normalized.includes("combine") ||
    normalized.includes("synthesize") ||
    normalized.includes("based on my notes") ||
    normalized.includes("from my notes") ||
    normalized.includes("across my notes") ||
    normalized.includes("overall") ||
    normalized.includes("diet") ||
    normalized.includes("meal")
  );
}

function buildSummaryContext(
  notes: { content: string }[],
  maxChars: number,
) {
  let total = 0;
  const chunks: string[] = [];

  for (const note of notes) {
    if (!note.content) continue;
    const next = note.content.trim();
    if (!next) continue;
    if (total + next.length > maxChars) break;
    chunks.push(next);
    total += next.length;
  }

  return chunks.join("\n---\n");
}

function mergeNotesById<T extends { id?: string | null }>(...lists: T[][]) {
  const map = new Map<string, T>();
  const merged: T[] = [];

  for (const list of lists) {
    for (const item of list) {
      const key = item.id || "";
      if (!key) {
        merged.push(item);
        continue;
      }
      if (!map.has(key)) {
        map.set(key, item);
        merged.push(item);
      }
    }
  }

  return merged;
}

function parseTagsInput(raw: FormDataEntryValue | null) {
  if (!raw || typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  let tags: string[] = [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) tags = parsed.filter(Boolean);
    } catch {
      tags = [];
    }
  } else {
    tags = trimmed.split(",");
  }

  const normalized = tags.map((tag) => String(tag).trim()).filter(Boolean);
  return normalizeTags(normalized);
}

async function assertCreditsAvailable(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("tier, credits_used, billing_start_date")
    .eq("id", userId)
    .single();

  if (error) throw new Error(error.message);
  if (!profile) throw new Error("Profile not found");

  const { limit, normalizedUsage } = resolveCreditState(profile, new Date());

  if (normalizedUsage >= limit) {
    throw new Error(
      `Monthly AI credit limit (${limit}) reached. Upgrade plan.`,
    );
  }
}

// Check 1: Monthly AI Credits
async function checkCredits(supabase: SupabaseClient, userId: string) {
  const now = new Date();

  for (let attempt = 0; attempt < MAX_CREDIT_UPDATE_ATTEMPTS; attempt += 1) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("tier, credits_used, billing_start_date")
      .eq("id", userId)
      .single();

    if (error) throw new Error(error.message);
    if (!profile) throw new Error("Profile not found");

    const {
      limit,
      currentUsage,
      billingStartRaw,
      isNewCycle,
      normalizedUsage,
      nextBillingStart,
    } = resolveCreditState(profile, now);

    if (normalizedUsage >= limit) {
      throw new Error(
        `Monthly AI credit limit (${limit}) reached. Upgrade plan.`,
      );
    }

    // Optimistic update to reduce concurrent double-charges.
    let updateQuery = supabase
      .from("profiles")
      .update({
        credits_used: normalizedUsage + 1,
        billing_start_date: nextBillingStart,
      })
      .eq("id", userId);

    if (profile.credits_used === null || profile.credits_used === undefined) {
      updateQuery = updateQuery.is("credits_used", null);
    } else {
      updateQuery = updateQuery.eq("credits_used", currentUsage);
    }

    if (!isNewCycle && billingStartRaw) {
      updateQuery = updateQuery.eq("billing_start_date", billingStartRaw);
    }

    const { data: updatedRows, error: updateError } = await updateQuery.select(
      "credits_used",
    );

    if (updateError) throw new Error(updateError.message);
    if (updatedRows && updatedRows.length > 0) return;
  }

  throw new Error("Unable to update credits. Please retry.");
}

// Check 2: Storage Limit
async function checkNoteLimit(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", userId)
    .single();

  const { tier, notes: limit } = getTierConfig(profile?.tier);

  if (limit === Infinity) return;

  const { count } = await supabase
    .from("notes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count || 0) >= limit) {
    throw new Error(`Storage full! ${tier} plan limit is ${limit} notes.`);
  }
}

// Check 3: Character Limit
async function checkCharLimit(
  supabase: SupabaseClient,
  userId: string,
  content: string,
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", userId)
    .single();

  const { tier, maxChars: limit } = getTierConfig(profile?.tier);

  if (content.length > limit) {
    throw new Error(`Note too long! ${tier} limit is ${limit} characters.`);
  }
}

// --- ACTIONS ---

// 1. Add Note Action
export async function addNote(formData: FormData) {
  const content = formData.get("content") as string;
  if (!content) return { error: "Content is required" };
  const tags = parseTagsInput(formData.get("tags"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  try {
    // Perform checks inside try/catch so errors return nicely
    await checkNoteLimit(supabase, user.id);
    await checkCharLimit(supabase, user.id, content);
    await assertCreditsAvailable(supabase, user.id);

    // Generate Embedding
    const result = await genAI.models.embedContent({
      model: "text-embedding-004",
      contents: content,
      config: { outputDimensionality: 768 },
    });

    const vector = extractEmbedding(result);
    if (!vector) return { error: "Failed to generate embedding" };

    await checkCredits(supabase, user.id); // Deduct credit after embed success

    // Save to DB
    const { error } = await supabase.from("notes").insert({
      user_id: user.id,
      content: content,
      embedding: vector,
      tags,
    });

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/notes");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to save note",
    };
  }
}

// 2. Search Action
export async function searchNotes(query: string) {
  const supabase = await createClient();

  try {
    const result = await genAI.models.embedContent({
      model: "text-embedding-004",
      contents: query,
      config: { outputDimensionality: 768 },
    });

    const vector = extractEmbedding(result);
    if (!vector) return [];

    const { data } = await supabase.rpc("match_notes", {
      query_embedding: vector,
      match_threshold: 0.3,
      match_count: 5,
    });

    return data || [];
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}

// 3. Update Note
export async function updateNote(formData: FormData) {
  const noteId = formData.get("noteId") as string;
  const content = formData.get("content") as string;
  if (!noteId || !content) return { error: "Missing data" };
  const tags = parseTagsInput(formData.get("tags"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  try {
    // 1. Validation Checks
    await checkCharLimit(supabase, user.id, content);

    // 2. Ownership Check
    const { data: note } = await supabase
      .from("notes")
      .select("user_id, content")
      .eq("id", noteId)
      .single();
    if (!note || note.user_id !== user.id) return { error: "Unauthorized" };

    const contentChanged = note.content !== content;

    if (!contentChanged) {
      const { error } = await supabase
        .from("notes")
        .update({ tags })
        .eq("id", noteId);

      if (error) throw error;

      revalidatePath(`/dashboard/notes/${noteId}`);
      revalidatePath("/dashboard/notes");
      return { success: true };
    }

    // 3. Pre-check credit availability before embedding
    await assertCreditsAvailable(supabase, user.id);

    // 4. Generate NEW Embedding
    const result = await genAI.models.embedContent({
      model: "text-embedding-004",
      contents: content,
      config: { outputDimensionality: 768 },
    });

    const vector = extractEmbedding(result);
    if (!vector) return { error: "Failed to generate embedding" };

    // 5. Deduct Credit (Re-embedding costs money!)
    await checkCredits(supabase, user.id);

    // 6. Update DB
    const { error } = await supabase
      .from("notes")
      .update({ content, embedding: vector, tags })
      .eq("id", noteId);

    if (error) throw error;

    revalidatePath(`/dashboard/notes/${noteId}`);
    revalidatePath("/dashboard/notes");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Update failed" };
  }
}

// 4. Chat Action (RAG)
export async function chatWithBrain(
  history: { role: string; content: string }[],
  userQuestion: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { answer: "Please log in.", sources: [] };

  try {
    // 1. Pre-check credit availability before embedding
    await assertCreditsAvailable(supabase, user.id);

    const wantsSummary = isSummaryRequest(userQuestion);
    const wantsSynthesis = !wantsSummary && isSynthesisRequest(userQuestion);

    if (wantsSummary) {
      const { data: notes, error } = await supabase
        .from("notes")
        .select("id, content, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(MAX_SUMMARY_NOTES);

      if (error) throw new Error(error.message);

      if (!notes || notes.length === 0) {
        return { answer: "You don't have any notes to summarize yet.", sources: [] };
      }

      const contextText = buildSummaryContext(notes, MAX_SUMMARY_CONTEXT_CHARS);

      if (!contextText) {
        return { answer: "I couldn't find any note content to summarize.", sources: [] };
      }

      // Deduct Credit (Chatting costs money!)
      await checkCredits(supabase, user.id);

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `
        You are a Second Brain AI. Summarize the user's notes clearly and concisely.
        Provide a short overview and then 3-6 bullet points of key themes.
        NOTES: ${contextText}
        `,
      });

      return { answer: response.text || "", sources: notes };
    }

    if (wantsSynthesis) {
      let relatedNotes: { id: string; content: string; similarity?: number }[] =
        [];

      try {
        const result = await genAI.models.embedContent({
          model: "text-embedding-004",
          contents: userQuestion,
          config: { outputDimensionality: 768 },
        });

        const vector = extractEmbedding(result);

        if (vector) {
          const { data } = await supabase.rpc("match_notes", {
            query_embedding: vector,
            match_threshold: SYNTHESIS_MATCH_THRESHOLD,
            match_count: SYNTHESIS_MATCH_COUNT,
          });

          relatedNotes =
            (data as { id: string; content: string; similarity?: number }[]) ||
            [];
        }
      } catch (error) {
        console.error("Synthesis embedding error:", error);
      }

      const { data: recentNotes, error: recentError } = await supabase
        .from("notes")
        .select("id, content, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(MAX_SYNTHESIS_NOTES);

      if (recentError) throw new Error(recentError.message);

      const mergedNotes = mergeNotesById(
        relatedNotes,
        (recentNotes as { id: string; content: string }[]) || [],
      );

      if (!mergedNotes.length) {
        return { answer: "You don't have any notes to use yet.", sources: [] };
      }

      const contextText = buildSummaryContext(
        mergedNotes,
        MAX_SYNTHESIS_CONTEXT_CHARS,
      );

      if (!contextText) {
        return { answer: "I couldn't build a context from your notes.", sources: [] };
      }

      // Deduct Credit (Chatting costs money!)
      await checkCredits(supabase, user.id);

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `
        You are a Second Brain AI. Use the notes below to synthesize an answer.
        If the user asks for a plan, propose a concise, practical plan.
        NOTES: ${contextText}
        QUESTION: ${userQuestion}
        `,
      });

      return { answer: response.text || "", sources: mergedNotes };
    }

    // 2. Embed Question
    const result = await genAI.models.embedContent({
      model: "text-embedding-004",
      contents: userQuestion,
      config: { outputDimensionality: 768 },
    });

    const vector = extractEmbedding(result);
    if (!vector) {
      return { answer: "Failed to generate embedding.", sources: [] };
    }

    // 3. Deduct Credit (Chatting costs money!)
    await checkCredits(supabase, user.id);

    // 4. Find relevant notes
    const { data: relatedNotes, error } = await supabase.rpc("match_notes", {
      query_embedding: vector,
      match_threshold: 0.3,
      match_count: 5,
    });

    if (error) throw new Error("Database error");

    // 5. Construct Context
    type RelatedNote = { content: string };
    const contextText =
      (relatedNotes as RelatedNote[] | null | undefined)
        ?.map((n) => n.content)
        .join("\n---\n") || "No notes found.";

    // 6. Generate Answer (FIXED MODEL NAME)
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
      You are a Second Brain AI. Answer using the Context below.
      CONTEXT: ${contextText}
      QUESTION: ${userQuestion}
      `,
    });

    return { answer: response.text || "", sources: relatedNotes };
  } catch (err) {
    console.error(err);
    return {
      answer: err instanceof Error ? err.message : "I ran into a problem.",
      sources: [],
    };
  }
}

// 5. Delete Note
export async function deleteNote(formData: FormData) {
  const noteId = formData.get("noteId") as string;
  if (!noteId) return { error: "Missing note id" };
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: note } = await supabase
    .from("notes")
    .select("user_id")
    .eq("id", noteId)
    .single();

  if (!note || note.user_id !== user.id) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/notes");
  return { success: true };
}

// 6. Export Notes
export async function exportNotes() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data, error } = await supabase
    .from("notes")
    .select("id, content, created_at, tags")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { notes: data || [] };
}

// 7. Import Notes
export async function importNotes(formData: FormData) {
  const payload = formData.get("payload") as string;
  if (!payload) return { error: "Missing payload" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return { error: "Invalid JSON payload" };
  }

  const rawNotes = Array.isArray(parsed)
    ? parsed
    : (parsed as { notes?: unknown }).notes;

  if (!Array.isArray(rawNotes)) {
    return { error: "Payload must be an array of notes" };
  }

  if (rawNotes.length > MAX_IMPORT_NOTES) {
    return {
      error: `Import limit is ${MAX_IMPORT_NOTES} notes at a time.`,
    };
  }

  const cleanedNotes = rawNotes
    .map((note) => {
      if (!note || typeof note !== "object") return null;
      const content = String(
        (note as { content?: unknown }).content || "",
      ).trim();
      if (!content) return null;
      const rawTags = (note as { tags?: unknown }).tags;
      const tags = Array.isArray(rawTags)
        ? normalizeTags(rawTags.map((tag) => String(tag)))
        : typeof rawTags === "string"
          ? parseTagsInput(rawTags)
          : [];
      return { content, tags };
    })
    .filter(Boolean) as { content: string; tags: string[] }[];

  if (cleanedNotes.length === 0) {
    return { error: "No valid notes found to import." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tier, credits_used, billing_start_date")
    .eq("id", user.id)
    .single();

  if (profileError) return { error: profileError.message };
  if (!profile) return { error: "Profile not found" };

  const { maxChars, notes: noteLimit } = getTierConfig(profile.tier);
  if (noteLimit !== Infinity) {
    const { count } = await supabase
      .from("notes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((count || 0) + cleanedNotes.length > noteLimit) {
      return {
        error: `Import exceeds your note limit of ${noteLimit}.`,
      };
    }
  }

  const { limit: creditLimit, normalizedUsage } = resolveCreditState(
    profile,
    new Date(),
  );

  if (
    creditLimit !== Infinity &&
    normalizedUsage + cleanedNotes.length > creditLimit
  ) {
    return {
      error: "Not enough AI credits to import these notes.",
    };
  }

  let imported = 0;
  try {
    for (const note of cleanedNotes) {
      if (note.content.length > maxChars) {
        throw new Error(
          `Note too long. Max length is ${maxChars} characters.`,
        );
      }

      const result = await genAI.models.embedContent({
        model: "text-embedding-004",
        contents: note.content,
        config: { outputDimensionality: 768 },
      });

      const vector = extractEmbedding(result);
      if (!vector) throw new Error("Failed to generate embedding.");

      await checkCredits(supabase, user.id);

      const { error } = await supabase.from("notes").insert({
        user_id: user.id,
        content: note.content,
        embedding: vector,
        tags: note.tags,
      });

      if (error) throw new Error(error.message);
      imported += 1;
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Import failed",
      imported,
    };
  }

  revalidatePath("/dashboard/notes");
  return { success: true, imported };
}

// 8. Auth Actions (Standard)
export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const origin = (await import("next/headers"))
    .headers()
    .then((h) => h.get("origin"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await origin}/auth/callback`,
      data: { first_name: firstName, last_name: lastName },
    },
  });

  if (error) return { error: error.message };
  redirect("/auth/login?message=Check your email");
}

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

export async function updateProfile(formData: FormData) {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase
    .from("profiles")
    .update({ first_name: firstName, last_name: lastName })
    .eq("id", user.id);
  revalidatePath("/dashboard/profile");
}

// Dev-Only Upgrade Action
export async function upgradeTier(formData: FormData) {
  if (process.env.NODE_ENV === "production") {
    return { error: "Tier upgrades are disabled in production." };
  }

  const newTier = formData.get("tier") as string;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("profiles")
    .update({ tier: newTier })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/profile");
  return { success: true };
}
