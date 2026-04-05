"use server";

import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SupabaseClient } from "@supabase/supabase-js";
import { getTierConfig } from "@/lib/tiers";
import { authLimiter, chatLimiter, embeddingLimiter } from "@/lib/rate-limit";
import { after } from "next/server";
import { headers } from "next/headers";
import {
  extractEmbedding,
  normalizeTags,
  resolveCreditState,
  isSummaryRequest,
  isSynthesisRequest,
  buildSummaryContext,
  mergeNotesById,
  buildCitationSources,
  buildHistoryContext,
  rankKeywordFallbackNotes,
  parseTagsInput,
  MAX_CHAT_HISTORY_MESSAGES,
  MAX_CHAT_HISTORY_CHARS,
  type SourceNote,
  type KeywordCandidateNote,
} from "@/lib/helpers";

// Initialize Gemini Client
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const MAX_CREDIT_UPDATE_ATTEMPTS = 3;
const EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const MAX_SUMMARY_CONTEXT_CHARS = 20000;
const MAX_SUMMARY_NOTES = 100;
const MAX_SYNTHESIS_CONTEXT_CHARS = 20000;
const MAX_SYNTHESIS_NOTES = 40;
const SYNTHESIS_MATCH_COUNT = 15;
const SYNTHESIS_MATCH_THRESHOLD = 0.2;
const MAX_IMPORT_NOTES = 50;
const KEYWORD_FALLBACK_NOTE_CANDIDATES = 200;
const KEYWORD_FALLBACK_MATCH_COUNT = 5;
const BACKGROUND_EMBED_BATCH_SIZE = 8;

async function fetchKeywordFallbackNotes(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  limit = KEYWORD_FALLBACK_MATCH_COUNT,
) {
  const { data, error } = await supabase
    .from("notes")
    .select("id, content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(KEYWORD_FALLBACK_NOTE_CANDIDATES);

  if (error) throw new Error(error.message);

  return rankKeywordFallbackNotes(
    ((data as KeywordCandidateNote[] | null | undefined) || []).map((note) => ({
      id: String(note.id),
      content: String(note.content || ""),
      created_at: note.created_at || null,
    })),
    query,
    limit,
  );
}

function isCreditLimitError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.message.includes("Monthly AI credit limit");
}

async function processSinglePendingEmbedding(
  supabase: SupabaseClient,
  userId: string,
  noteId: string,
  content: string,
) {
  const normalizedContent = content.trim();
  if (!normalizedContent) return false;

  // Reserve credit atomically BEFORE doing expensive API work.
  await checkCredits(supabase, userId);

  let result;
  try {
    result = await genAI.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: normalizedContent,
      config: { outputDimensionality: 768 },
    });
  } catch (apiError) {
    await refundCredit(supabase, userId);
    throw apiError;
  }

  const vector = extractEmbedding(result);
  if (!vector) {
    await refundCredit(supabase, userId);
    throw new Error("Failed to generate embedding");
  }

  // Update only if content still matches and embedding is still pending.
  const { data: updatedRows, error: updateError } = await supabase
    .from("notes")
    .update({ embedding: vector })
    .eq("id", noteId)
    .eq("user_id", userId)
    .eq("content", content)
    .is("embedding", null)
    .select("id");

  if (updateError) {
    await refundCredit(supabase, userId);
    throw new Error(updateError.message);
  }
  // Another worker already processed this note — refund the reserved credit.
  if (!updatedRows || updatedRows.length === 0) {
    await refundCredit(supabase, userId);
    return false;
  }

  revalidatePath("/dashboard/notes");
  revalidatePath(`/dashboard/notes/${noteId}`);

  return true;
}

async function processPendingEmbeddingsForUser(
  supabase: SupabaseClient,
  userId: string,
  maxJobs = BACKGROUND_EMBED_BATCH_SIZE,
) {
  const { data, error } = await supabase
    .from("notes")
    .select("id, content")
    .eq("user_id", userId)
    .is("embedding", null)
    .order("created_at", { ascending: true })
    .limit(maxJobs);

  if (error) throw new Error(error.message);
  const pendingNotes = (data as { id: string; content: string }[] | null) || [];

  for (const note of pendingNotes) {
    try {
      await processSinglePendingEmbedding(
        supabase,
        userId,
        String(note.id),
        String(note.content || ""),
      );
    } catch (jobError) {
      console.error("Background embedding job failed:", jobError);
      if (isCreditLimitError(jobError)) break;
    }
  }
}

function scheduleEmbeddingDrain(
  supabase: SupabaseClient,
  userId: string,
  maxJobs = BACKGROUND_EMBED_BATCH_SIZE,
) {
  after(async () => {
    try {
      await processPendingEmbeddingsForUser(supabase, userId, maxJobs);
    } catch (error) {
      console.error("Background embedding queue failed:", error);
    }
  });
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

// Refund a single credit (best-effort, used when work fails after reservation)
async function refundCredit(supabase: SupabaseClient, userId: string) {
  for (let attempt = 0; attempt < MAX_CREDIT_UPDATE_ATTEMPTS; attempt += 1) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("credits_used")
      .eq("id", userId)
      .single();

    if (error || !profile) return; // best-effort: don't throw on refund failure

    const currentUsage =
      typeof profile.credits_used === "number" ? profile.credits_used : 0;
    if (currentUsage <= 0) return;

    const { data: updatedRows } = await supabase
      .from("profiles")
      .update({ credits_used: currentUsage - 1 })
      .eq("id", userId)
      .eq("credits_used", currentUsage)
      .select("credits_used");

    if (updatedRows && updatedRows.length > 0) return;
  }
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
  if (!embeddingLimiter.check(user.id))
    return { error: "Too many requests. Please slow down." };

  try {
    // Perform checks inside try/catch so errors return nicely
    await checkNoteLimit(supabase, user.id);
    await checkCharLimit(supabase, user.id, content);
    await assertCreditsAvailable(supabase, user.id);

    // Save immediately, then index in the background queue.
    const { error } = await supabase.from("notes").insert({
      user_id: user.id,
      content: content,
      embedding: null,
      tags,
    });

    if (error) throw new Error(error.message);

    scheduleEmbeddingDrain(supabase, user.id, BACKGROUND_EMBED_BATCH_SIZE);

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];
  if (!embeddingLimiter.check(user.id)) return [];
  scheduleEmbeddingDrain(supabase, user.id, 2);

  try {
    const result = await genAI.models.embedContent({
      model: EMBEDDING_MODEL,
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

    const relatedNotes =
      (data as { id: string; content: string; similarity: number }[] | null) ||
      [];

    if (relatedNotes.length > 0) return relatedNotes;

    return await fetchKeywordFallbackNotes(supabase, user.id, query, 5);
  } catch (error) {
    console.error("Search error:", error);
    try {
      return await fetchKeywordFallbackNotes(supabase, user.id, query, 5);
    } catch (fallbackError) {
      console.error("Search keyword fallback error:", fallbackError);
      return [];
    }
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

    // 4. Update immediately, then re-index in the background queue.
    const { error } = await supabase
      .from("notes")
      .update({ content, embedding: null, tags })
      .eq("id", noteId);

    if (error) throw error;

    scheduleEmbeddingDrain(supabase, user.id, BACKGROUND_EMBED_BATCH_SIZE);

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
  if (!chatLimiter.check(user.id))
    return { answer: "You're sending messages too quickly. Please slow down.", sources: [] };
  scheduleEmbeddingDrain(supabase, user.id, 2);

  try {
    // 1. Reserve credit atomically BEFORE doing any work.
    //    Prevents concurrent requests from bypassing limits.
    await checkCredits(supabase, user.id);
    const chatHistoryContext = buildHistoryContext(
      history,
      MAX_CHAT_HISTORY_MESSAGES,
      MAX_CHAT_HISTORY_CHARS,
    );

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
        await refundCredit(supabase, user.id);
        return { answer: "You don't have any notes to summarize yet.", sources: [] };
      }

      const contextText = buildSummaryContext(notes, MAX_SUMMARY_CONTEXT_CHARS);

      if (!contextText) {
        await refundCredit(supabase, user.id);
        return { answer: "I couldn't find any note content to summarize.", sources: [] };
      }

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `
        You are a Second Brain AI. Summarize the user's notes clearly and concisely.
        Provide a short overview and then 3-6 bullet points of key themes.
        RECENT_CHAT_CONTEXT:
        ${chatHistoryContext || "None"}
        NOTES: ${contextText}
        `,
      });

      return {
        answer: response.text || "",
        sources: buildCitationSources(
          (notes as SourceNote[] | null | undefined) || [],
          userQuestion,
        ),
      };
    }

    if (wantsSynthesis) {
      let relatedNotes: { id: string; content: string; similarity?: number }[] =
        [];

      try {
        const result = await genAI.models.embedContent({
          model: EMBEDDING_MODEL,
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
        await refundCredit(supabase, user.id);
        return { answer: "You don't have any notes to use yet.", sources: [] };
      }

      const contextText = buildSummaryContext(
        mergedNotes,
        MAX_SYNTHESIS_CONTEXT_CHARS,
      );

      if (!contextText) {
        await refundCredit(supabase, user.id);
        return { answer: "I couldn't build a context from your notes.", sources: [] };
      }

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `
        You are a Second Brain AI. Use the notes below to synthesize an answer.
        If the user asks for a plan, propose a concise, practical plan.
        RECENT_CHAT_CONTEXT:
        ${chatHistoryContext || "None"}
        NOTES: ${contextText}
        QUESTION: ${userQuestion}
        `,
      });

      return {
        answer: response.text || "",
        sources: buildCitationSources(
          mergedNotes as SourceNote[],
          userQuestion,
        ),
      };
    }

    let relatedNotes: { id: string; content: string; similarity?: number }[] =
      [];

    try {
      // 2. Embed Question
      const result = await genAI.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: userQuestion,
        config: { outputDimensionality: 768 },
      });

      const vector = extractEmbedding(result);

      if (vector) {
        // 3. Find relevant notes
        const { data, error } = await supabase.rpc("match_notes", {
          query_embedding: vector,
          match_threshold: 0.3,
          match_count: 5,
        });

        if (error) throw new Error("Database error");

        relatedNotes =
          (data as { id: string; content: string; similarity?: number }[]) || [];
      }
    } catch (retrievalError) {
      console.error("Chat embedding retrieval error:", retrievalError);
    }

    if (!relatedNotes.length) {
      relatedNotes = await fetchKeywordFallbackNotes(
        supabase,
        user.id,
        userQuestion,
        5,
      );
    }

    // 4. Credit already reserved at the top of this function.

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
      RECENT_CHAT_CONTEXT:
      ${chatHistoryContext || "None"}
      CONTEXT: ${contextText}
      QUESTION: ${userQuestion}
      `,
    });

    return {
      answer: response.text || "",
      sources: buildCitationSources(
        (relatedNotes as SourceNote[] | null | undefined) || [],
        userQuestion,
      ),
    };
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
  if (!embeddingLimiter.check(user.id))
    return { error: "Too many requests. Please slow down." };

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

  let notesToInsert: {
    user_id: string;
    content: string;
    embedding: null;
    tags: string[];
  }[] = [];
  try {
    notesToInsert = cleanedNotes.map((note) => {
      if (note.content.length > maxChars) {
        throw new Error(`Note too long. Max length is ${maxChars} characters.`);
      }

      return {
        user_id: user.id,
        content: note.content,
        embedding: null,
        tags: note.tags,
      };
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Import failed",
      imported: 0,
    };
  }

  const { error: insertError } = await supabase
    .from("notes")
    .insert(notesToInsert);

  if (insertError) {
    return {
      error: insertError.message,
      imported: 0,
    };
  }

  scheduleEmbeddingDrain(
    supabase,
    user.id,
    Math.min(
      BACKGROUND_EMBED_BATCH_SIZE + notesToInsert.length,
      MAX_IMPORT_NOTES,
    ),
  );

  revalidatePath("/dashboard/notes");
  return { success: true, imported: notesToInsert.length };
}

// 8. Auth Actions (Standard)
export async function signUp(formData: FormData) {
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  if (!authLimiter.check(ip))
    return { error: "Too many attempts. Please try again later." };

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
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  if (!authLimiter.check(ip))
    return { error: "Too many attempts. Please try again later." };

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
