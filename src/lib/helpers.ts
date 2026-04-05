import { getTierConfig } from "@/lib/tiers";

// --- Constants ---

export const CREDIT_RESET_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_CITATION_SNIPPET_CHARS = 180;
export const MAX_CITATION_HIGHLIGHT_CHARS = 96;
export const MAX_CITATION_TERMS = 12;
export const MIN_CITATION_TERM_CHARS = 3;
export const MAX_CHAT_HISTORY_MESSAGES = 12;
export const MAX_CHAT_HISTORY_CHARS = 4000;

// --- Types ---

export type EmbeddingResponse = {
  embedding?: { values?: number[] };
  embeddings?: { values?: number[] }[];
};

export type CreditProfile = {
  tier?: string | null;
  credits_used?: number | null;
  billing_start_date?: string | null;
};

export type SourceNote = {
  id?: string | null;
  content?: string | null;
  similarity?: number | null;
};

export type CitationSource = {
  id: string;
  content: string;
  similarity: number;
  snippet: string;
  highlight: string;
};

export type KeywordCandidateNote = {
  id: string;
  content: string;
  created_at?: string | null;
};

export type KeywordScoredNote = {
  id: string;
  content: string;
  similarity: number;
  score: number;
  createdAt: number;
};

// --- Pure helper functions ---

export function extractEmbedding(result: EmbeddingResponse) {
  return result.embedding?.values || result.embeddings?.[0]?.values;
}

export function normalizeTagValue(tag: string) {
  return tag
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export function normalizeTags(tags: string[]) {
  const normalized = tags.map(normalizeTagValue).filter(Boolean);
  return Array.from(new Set(normalized));
}

export function resolveCreditState(profile: CreditProfile, now: Date) {
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

export function isSummaryRequest(question: string) {
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

export function isSynthesisRequest(question: string) {
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

export function buildSummaryContext(
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

export function mergeNotesById<T extends { id?: string | null }>(
  ...lists: T[][]
) {
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

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function findCaseInsensitiveIndex(text: string, query: string) {
  if (!query) return -1;
  return text.toLowerCase().indexOf(query.toLowerCase());
}

export function getCitationTerms(question: string) {
  const terms = question.toLowerCase().match(/[a-z0-9]{3,}/g) || [];
  const unique = Array.from(new Set(terms.map((term) => term.trim())));
  unique.sort((a, b) => b.length - a.length);
  return unique.slice(0, MAX_CITATION_TERMS);
}

export function pickHighlightText(content: string, question: string) {
  const cleanedContent = normalizeWhitespace(content);
  if (!cleanedContent) return "";

  const normalizedQuestion = normalizeWhitespace(question);
  if (
    normalizedQuestion.length >= MIN_CITATION_TERM_CHARS &&
    normalizedQuestion.length <= MAX_CITATION_HIGHLIGHT_CHARS
  ) {
    const fullMatchIndex = findCaseInsensitiveIndex(
      cleanedContent,
      normalizedQuestion,
    );
    if (fullMatchIndex >= 0) {
      return cleanedContent.slice(
        fullMatchIndex,
        fullMatchIndex + normalizedQuestion.length,
      );
    }
  }

  const terms = getCitationTerms(normalizedQuestion);
  for (const term of terms) {
    if (term.length < MIN_CITATION_TERM_CHARS) continue;
    const termIndex = findCaseInsensitiveIndex(cleanedContent, term);
    if (termIndex >= 0) {
      return cleanedContent.slice(termIndex, termIndex + term.length);
    }
  }

  return cleanedContent.slice(0, MAX_CITATION_HIGHLIGHT_CHARS);
}

export function buildCitationSnippet(content: string, highlight: string) {
  const cleanedContent = normalizeWhitespace(content);
  if (!cleanedContent) return "";

  const normalizedHighlight = normalizeWhitespace(highlight);
  if (!normalizedHighlight) {
    const preview = cleanedContent.slice(0, MAX_CITATION_SNIPPET_CHARS).trim();
    return cleanedContent.length > preview.length ? `${preview}...` : preview;
  }

  const matchIndex = findCaseInsensitiveIndex(
    cleanedContent,
    normalizedHighlight,
  );
  if (matchIndex === -1) {
    const preview = cleanedContent.slice(0, MAX_CITATION_SNIPPET_CHARS).trim();
    return cleanedContent.length > preview.length ? `${preview}...` : preview;
  }

  const remainingChars = Math.max(
    MAX_CITATION_SNIPPET_CHARS - normalizedHighlight.length,
    0,
  );
  const start = Math.max(matchIndex - Math.floor(remainingChars / 2), 0);
  const end = Math.min(
    start + MAX_CITATION_SNIPPET_CHARS,
    cleanedContent.length,
  );

  let snippet = cleanedContent.slice(start, end).trim();
  if (start > 0) snippet = `...${snippet}`;
  if (end < cleanedContent.length) snippet = `${snippet}...`;
  return snippet;
}

export function buildCitationSources(notes: SourceNote[], question: string) {
  const sources: CitationSource[] = [];
  const seenIds = new Set<string>();

  for (const note of notes) {
    const id = note.id ? String(note.id) : "";
    const content = normalizeWhitespace(String(note.content || ""));
    if (!id || !content || seenIds.has(id)) continue;
    seenIds.add(id);

    const highlightCandidate = pickHighlightText(content, question);
    const snippet = buildCitationSnippet(content, highlightCandidate);
    const highlight = normalizeWhitespace(
      highlightCandidate || snippet.slice(0, MAX_CITATION_HIGHLIGHT_CHARS),
    );

    sources.push({
      id,
      content,
      similarity:
        typeof note.similarity === "number" && Number.isFinite(note.similarity)
          ? note.similarity
          : 0,
      snippet,
      highlight,
    });
  }

  return sources;
}

export function buildHistoryContext(
  history: { role: string; content: string }[],
  maxMessages: number,
  maxChars: number,
) {
  if (!Array.isArray(history) || history.length === 0) return "";

  const recent = history.slice(-maxMessages);
  const chunks: string[] = [];
  let total = 0;

  for (const message of recent) {
    const role = message.role === "assistant" ? "Assistant" : "User";
    const content = normalizeWhitespace(message.content || "");
    if (!content) continue;
    const line = `${role}: ${content}`;
    if (total + line.length > maxChars) break;
    chunks.push(line);
    total += line.length;
  }

  return chunks.join("\n");
}

export function rankKeywordFallbackNotes(
  notes: KeywordCandidateNote[],
  query: string,
  limit: number,
) {
  const normalizedQuery = normalizeWhitespace(query).toLowerCase();
  const terms = getCitationTerms(normalizedQuery);
  const scored: KeywordScoredNote[] = [];

  for (const note of notes) {
    const content = normalizeWhitespace(note.content || "");
    if (!content) continue;
    const lowerContent = content.toLowerCase();
    let score = 0;

    if (normalizedQuery && lowerContent.includes(normalizedQuery)) {
      score += 6;
    }

    for (const term of terms) {
      if (!term || term.length < MIN_CITATION_TERM_CHARS) continue;
      if (!lowerContent.includes(term)) continue;
      score += term.length >= 6 ? 1.5 : 1;
    }

    if (score <= 0) continue;

    scored.push({
      id: note.id,
      content,
      similarity: Math.min(0.2 + score / 12, 0.89),
      score,
      createdAt: new Date(note.created_at || 0).getTime() || 0,
    });
  }

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.createdAt - a.createdAt;
    })
    .slice(0, Math.max(1, limit))
    .map(({ id, content, similarity }) => ({ id, content, similarity }));
}

export function parseTagsInput(raw: string | File | null) {
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
