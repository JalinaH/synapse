import { describe, it, expect } from "vitest";
import {
  extractEmbedding,
  normalizeTagValue,
  normalizeTags,
  resolveCreditState,
  isSummaryRequest,
  isSynthesisRequest,
  buildSummaryContext,
  mergeNotesById,
  normalizeWhitespace,
  findCaseInsensitiveIndex,
  getCitationTerms,
  pickHighlightText,
  buildCitationSnippet,
  buildCitationSources,
  buildHistoryContext,
  rankKeywordFallbackNotes,
  parseTagsInput,
} from "@/lib/helpers";

// --- extractEmbedding ---

describe("extractEmbedding", () => {
  it("extracts from embedding.values", () => {
    expect(extractEmbedding({ embedding: { values: [1, 2, 3] } })).toEqual([1, 2, 3]);
  });

  it("extracts from embeddings[0].values", () => {
    expect(extractEmbedding({ embeddings: [{ values: [4, 5] }] })).toEqual([4, 5]);
  });

  it("prefers embedding over embeddings", () => {
    expect(
      extractEmbedding({
        embedding: { values: [1] },
        embeddings: [{ values: [2] }],
      }),
    ).toEqual([1]);
  });

  it("returns undefined for empty response", () => {
    expect(extractEmbedding({})).toBeUndefined();
  });
});

// --- normalizeTagValue ---

describe("normalizeTagValue", () => {
  it("lowercases and trims", () => {
    expect(normalizeTagValue("  Hello  ")).toBe("hello");
  });

  it("strips leading hash symbols", () => {
    expect(normalizeTagValue("##tag")).toBe("tag");
  });

  it("replaces spaces with hyphens", () => {
    expect(normalizeTagValue("my tag name")).toBe("my-tag-name");
  });

  it("handles combined transformations", () => {
    expect(normalizeTagValue("  ##My  Tag  ")).toBe("my-tag");
  });
});

// --- normalizeTags ---

describe("normalizeTags", () => {
  it("normalizes and deduplicates tags", () => {
    expect(normalizeTags(["Hello", "hello", "World"])).toEqual(["hello", "world"]);
  });

  it("filters empty tags", () => {
    expect(normalizeTags(["", "  ", "valid"])).toEqual(["valid"]);
  });
});

// --- resolveCreditState ---

describe("resolveCreditState", () => {
  const now = new Date("2025-03-15T12:00:00Z");

  it("starts a new cycle when no billing start date", () => {
    const result = resolveCreditState(
      { tier: "free", credits_used: 100, billing_start_date: null },
      now,
    );
    expect(result.isNewCycle).toBe(true);
    expect(result.normalizedUsage).toBe(0);
    expect(result.tier).toBe("free");
    expect(result.limit).toBe(1000);
  });

  it("continues existing cycle within window", () => {
    const billingStart = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
    const result = resolveCreditState(
      {
        tier: "pro",
        credits_used: 200,
        billing_start_date: billingStart.toISOString(),
      },
      now,
    );
    expect(result.isNewCycle).toBe(false);
    expect(result.normalizedUsage).toBe(200);
    expect(result.tier).toBe("pro");
    expect(result.limit).toBe(5000);
  });

  it("resets when billing window exceeded (>30 days)", () => {
    const oldBilling = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
    const result = resolveCreditState(
      {
        tier: "ultra",
        credits_used: 5000,
        billing_start_date: oldBilling.toISOString(),
      },
      now,
    );
    expect(result.isNewCycle).toBe(true);
    expect(result.normalizedUsage).toBe(0);
  });

  it("defaults to free tier for invalid tier", () => {
    const result = resolveCreditState({ tier: "invalid" }, now);
    expect(result.tier).toBe("free");
    expect(result.limit).toBe(1000);
  });

  it("defaults credits_used to 0 when null", () => {
    const result = resolveCreditState({ credits_used: null }, now);
    expect(result.currentUsage).toBe(0);
  });
});

// --- isSummaryRequest ---

describe("isSummaryRequest", () => {
  it.each([
    "Summarize my notes",
    "Give me a summary",
    "Quick recap please",
    "Overview of everything",
    "Show all notes",
    "What are my notes about?",
    "Tell me everything",
  ])("returns true for: %s", (q) => {
    expect(isSummaryRequest(q)).toBe(true);
  });

  it("returns false for regular questions", () => {
    expect(isSummaryRequest("What is React?")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isSummaryRequest("")).toBe(false);
    expect(isSummaryRequest("   ")).toBe(false);
  });
});

// --- isSynthesisRequest ---

describe("isSynthesisRequest", () => {
  it.each([
    "Create a plan",
    "Build me a roadmap",
    "What strategy should I use?",
    "Combine my research",
    "Synthesize the data",
    "Based on my notes, what should I do?",
    "From my notes, generate a plan",
    "Across my notes, what themes emerge?",
    "Overall, what have I learned?",
    "Create a diet plan",
    "Suggest a meal",
  ])("returns true for: %s", (q) => {
    expect(isSynthesisRequest(q)).toBe(true);
  });

  it("returns false for regular questions", () => {
    expect(isSynthesisRequest("What is TypeScript?")).toBe(false);
  });
});

// --- buildSummaryContext ---

describe("buildSummaryContext", () => {
  it("joins notes with separator", () => {
    const notes = [{ content: "Note 1" }, { content: "Note 2" }];
    expect(buildSummaryContext(notes, 1000)).toBe("Note 1\n---\nNote 2");
  });

  it("respects maxChars limit", () => {
    const notes = [{ content: "AAAA" }, { content: "BBBB" }, { content: "CCCC" }];
    const result = buildSummaryContext(notes, 10);
    expect(result).toBe("AAAA\n---\nBBBB");
  });

  it("skips empty content", () => {
    const notes = [{ content: "" }, { content: "  " }, { content: "Valid" }];
    expect(buildSummaryContext(notes, 1000)).toBe("Valid");
  });
});

// --- mergeNotesById ---

describe("mergeNotesById", () => {
  it("merges two lists deduplicating by id", () => {
    const a = [{ id: "1", text: "a" }];
    const b = [{ id: "1", text: "b" }, { id: "2", text: "c" }];
    const result = mergeNotesById(a, b);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("a"); // keeps first occurrence
    expect(result[1].text).toBe("c");
  });

  it("includes items with no id", () => {
    const a = [{ id: null as string | null, text: "no-id" }];
    const b = [{ id: "1" as string | null, text: "has-id" }];
    const result = mergeNotesById(a, b);
    expect(result).toHaveLength(2);
  });
});

// --- normalizeWhitespace ---

describe("normalizeWhitespace", () => {
  it("collapses multiple spaces", () => {
    expect(normalizeWhitespace("hello   world")).toBe("hello world");
  });

  it("trims and collapses newlines/tabs", () => {
    expect(normalizeWhitespace("  hello\n\tworld  ")).toBe("hello world");
  });
});

// --- findCaseInsensitiveIndex ---

describe("findCaseInsensitiveIndex", () => {
  it("finds match regardless of case", () => {
    expect(findCaseInsensitiveIndex("Hello World", "hello")).toBe(0);
    expect(findCaseInsensitiveIndex("Hello World", "WORLD")).toBe(6);
  });

  it("returns -1 for no match", () => {
    expect(findCaseInsensitiveIndex("Hello", "xyz")).toBe(-1);
  });

  it("returns -1 for empty query", () => {
    expect(findCaseInsensitiveIndex("Hello", "")).toBe(-1);
  });
});

// --- getCitationTerms ---

describe("getCitationTerms", () => {
  it("extracts alphanumeric terms of 3+ chars", () => {
    const terms = getCitationTerms("What is machine learning?");
    expect(terms).toContain("machine");
    expect(terms).toContain("learning");
    expect(terms).toContain("what");
    expect(terms).not.toContain("is"); // too short
  });

  it("sorts by length descending", () => {
    const terms = getCitationTerms("abc defghi");
    expect(terms[0]).toBe("defghi");
    expect(terms[1]).toBe("abc");
  });

  it("deduplicates terms", () => {
    const terms = getCitationTerms("test test test");
    expect(terms).toEqual(["test"]);
  });

  it("limits to MAX_CITATION_TERMS", () => {
    const longQuery = Array.from({ length: 20 }, (_, i) => `term${i}longword`).join(" ");
    const terms = getCitationTerms(longQuery);
    expect(terms.length).toBeLessThanOrEqual(12);
  });
});

// --- pickHighlightText ---

describe("pickHighlightText", () => {
  it("returns full question match when found in content", () => {
    const content = "This is about machine learning algorithms";
    const result = pickHighlightText(content, "machine learning");
    expect(result).toBe("machine learning");
  });

  it("falls back to longest matching term", () => {
    const content = "TypeScript is great for development";
    const result = pickHighlightText(content, "Why is Python better than TypeScript?");
    expect(result.toLowerCase()).toContain("typescript");
  });

  it("returns start of content when nothing matches", () => {
    const content = "Some completely unrelated content here";
    const result = pickHighlightText(content, "xyz123abc456");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns empty for empty content", () => {
    expect(pickHighlightText("", "query")).toBe("");
  });
});

// --- buildCitationSnippet ---

describe("buildCitationSnippet", () => {
  it("returns content preview when no highlight", () => {
    const snippet = buildCitationSnippet("Short content", "");
    expect(snippet).toBe("Short content");
  });

  it("adds ellipsis for long content without highlight", () => {
    const longContent = "A".repeat(300);
    const snippet = buildCitationSnippet(longContent, "");
    expect(snippet).toContain("...");
    expect(snippet.length).toBeLessThanOrEqual(190); // 180 + "..."
  });

  it("centers snippet around highlight", () => {
    const content = "A".repeat(100) + "HIGHLIGHT" + "B".repeat(100);
    const snippet = buildCitationSnippet(content, "HIGHLIGHT");
    expect(snippet).toContain("HIGHLIGHT");
  });

  it("returns empty for empty content", () => {
    expect(buildCitationSnippet("", "test")).toBe("");
  });
});

// --- buildCitationSources ---

describe("buildCitationSources", () => {
  it("builds sources from valid notes", () => {
    const notes = [
      { id: "1", content: "Machine learning note", similarity: 0.95 },
      { id: "2", content: "TypeScript guide", similarity: 0.8 },
    ];
    const sources = buildCitationSources(notes, "machine learning");
    expect(sources).toHaveLength(2);
    expect(sources[0].id).toBe("1");
    expect(sources[0].similarity).toBe(0.95);
    expect(sources[0].snippet.length).toBeGreaterThan(0);
    expect(sources[0].highlight.length).toBeGreaterThan(0);
  });

  it("deduplicates by id", () => {
    const notes = [
      { id: "1", content: "Content A", similarity: 0.9 },
      { id: "1", content: "Content B", similarity: 0.8 },
    ];
    const sources = buildCitationSources(notes, "test");
    expect(sources).toHaveLength(1);
  });

  it("skips notes with no id or content", () => {
    const notes = [
      { id: null, content: "No id", similarity: 0.5 },
      { id: "1", content: "", similarity: 0.5 },
      { id: "2", content: "Valid", similarity: 0.5 },
    ];
    const sources = buildCitationSources(notes, "test");
    expect(sources).toHaveLength(1);
    expect(sources[0].id).toBe("2");
  });

  it("defaults similarity to 0 for non-finite values", () => {
    const notes = [{ id: "1", content: "Test", similarity: NaN }];
    const sources = buildCitationSources(notes, "test");
    expect(sources[0].similarity).toBe(0);
  });
});

// --- buildHistoryContext ---

describe("buildHistoryContext", () => {
  it("formats history with role labels", () => {
    const history = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
    ];
    const result = buildHistoryContext(history, 10, 1000);
    expect(result).toBe("User: Hello\nAssistant: Hi there");
  });

  it("limits to maxMessages (takes last N)", () => {
    const history = [
      { role: "user", content: "First" },
      { role: "user", content: "Second" },
      { role: "user", content: "Third" },
    ];
    const result = buildHistoryContext(history, 2, 1000);
    expect(result).toContain("Second");
    expect(result).toContain("Third");
    expect(result).not.toContain("First");
  });

  it("respects maxChars limit", () => {
    const history = [
      { role: "user", content: "Short" },
      { role: "user", content: "A".repeat(5000) },
    ];
    const result = buildHistoryContext(history, 10, 50);
    expect(result.length).toBeLessThanOrEqual(50);
  });

  it("returns empty for empty/invalid history", () => {
    expect(buildHistoryContext([], 10, 1000)).toBe("");
    expect(buildHistoryContext(null as unknown as [], 10, 1000)).toBe("");
  });

  it("skips messages with empty content", () => {
    const history = [
      { role: "user", content: "" },
      { role: "user", content: "Valid" },
    ];
    const result = buildHistoryContext(history, 10, 1000);
    expect(result).toBe("User: Valid");
  });
});

// --- rankKeywordFallbackNotes ---

describe("rankKeywordFallbackNotes", () => {
  it("ranks notes by keyword match score", () => {
    const notes = [
      { id: "1", content: "machine learning algorithms" },
      { id: "2", content: "cooking recipes for dinner" },
      { id: "3", content: "machine learning with Python" },
    ];
    const result = rankKeywordFallbackNotes(notes, "machine learning", 5);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].id).toBe("1"); // or "3", both match
  });

  it("gives higher score to exact query match", () => {
    const notes = [
      { id: "1", content: "machine learning is great" },
      { id: "2", content: "learning about machines today" },
    ];
    const result = rankKeywordFallbackNotes(notes, "machine learning", 5);
    // Note 1 has exact phrase match (score +6), note 2 only has term matches
    expect(result[0].id).toBe("1");
  });

  it("returns empty for no matches", () => {
    const notes = [{ id: "1", content: "completely unrelated" }];
    const result = rankKeywordFallbackNotes(notes, "quantum physics", 5);
    expect(result).toHaveLength(0);
  });

  it("respects limit parameter", () => {
    const notes = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      content: `This note mentions the keyword test${i}`,
    }));
    const result = rankKeywordFallbackNotes(notes, "keyword", 3);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("caps similarity below 0.89", () => {
    const notes = [{ id: "1", content: "machine learning algorithms are great" }];
    const result = rankKeywordFallbackNotes(notes, "machine learning algorithms are great", 5);
    expect(result[0].similarity).toBeLessThanOrEqual(0.89);
  });
});

// --- parseTagsInput ---

describe("parseTagsInput", () => {
  it("parses comma-separated tags", () => {
    expect(parseTagsInput("react, typescript, next")).toEqual([
      "react",
      "typescript",
      "next",
    ]);
  });

  it("parses JSON array", () => {
    expect(parseTagsInput('["React", "TypeScript"]')).toEqual([
      "react",
      "typescript",
    ]);
  });

  it("returns empty for null/empty", () => {
    expect(parseTagsInput(null)).toEqual([]);
    expect(parseTagsInput("")).toEqual([]);
    expect(parseTagsInput("   ")).toEqual([]);
  });

  it("handles invalid JSON gracefully", () => {
    expect(parseTagsInput("[invalid")).toEqual([]);
  });

  it("normalizes and deduplicates", () => {
    expect(parseTagsInput("React, react, REACT")).toEqual(["react"]);
  });

  it("strips hash prefixes", () => {
    expect(parseTagsInput("#react, ##typescript")).toEqual([
      "react",
      "typescript",
    ]);
  });
});
