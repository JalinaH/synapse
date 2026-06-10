"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { chatWithBrain } from "@/app/actions";
import {
  Bot,
  MessageSquare,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Send,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import Markdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { useTheme } from "@/components/theme-provider";

interface Source {
  id: string;
  content: string;
  similarity: number;
  snippet?: string;
  highlight?: string;
}

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  sources?: Source[] | null;
};

type Thread = {
  id: string;
  title: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
};

const CHAT_STORAGE_KEY = "synapse-chat-threads-v1";
const ACTIVE_THREAD_STORAGE_KEY = "synapse-chat-active-thread-v1";
const DEFAULT_THREAD_TITLE = "New thread";
const WELCOME_MESSAGE =
  "Hello! I am your second brain. Ask me anything about your notes.";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createMessage(
  role: "user" | "assistant",
  content: string,
  sources: Source[] | null = null,
): Message {
  return {
    id: createId(),
    role,
    content,
    createdAt: new Date().toISOString(),
    sources,
  };
}

function createThread(title = DEFAULT_THREAD_TITLE): Thread {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title,
    pinned: false,
    createdAt: now,
    updatedAt: now,
    messages: [createMessage("assistant", WELCOME_MESSAGE)],
  };
}

function parseDateOrNow(value: unknown) {
  if (typeof value !== "string") return new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function sortThreads(threads: Thread[]) {
  return [...threads].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  });
}

function clipText(value: string, limit: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit)}...`;
}

function deriveThreadTitleFromPrompt(content: string) {
  const trimmed = content.replace(/\s+/g, " ").trim();
  if (!trimmed) return DEFAULT_THREAD_TITLE;
  return clipText(trimmed, 48);
}

function getThreadPreview(thread: Thread) {
  const latestUserMessage = [...thread.messages]
    .reverse()
    .find((message) => message.role === "user");
  const fallback = thread.messages[thread.messages.length - 1];
  return clipText((latestUserMessage || fallback)?.content || "", 56);
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function buildCitationHref(source: Source) {
  const params = new URLSearchParams();
  const highlight = (source.highlight || source.snippet || "").trim();
  if (highlight) {
    params.set("highlight", highlight);
  }
  const query = params.toString();
  return query
    ? `/dashboard/notes/${source.id}?${query}`
    : `/dashboard/notes/${source.id}`;
}

function parseSource(value: unknown): Source | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const id = String(candidate.id || "").trim();
  const content = String(candidate.content || "").trim();
  if (!id || !content) return null;
  return {
    id,
    content,
    similarity:
      typeof candidate.similarity === "number" ? candidate.similarity : 0,
    snippet:
      typeof candidate.snippet === "string" ? candidate.snippet : undefined,
    highlight:
      typeof candidate.highlight === "string" ? candidate.highlight : undefined,
  };
}

function parseMessage(value: unknown): Message | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const role = candidate.role === "assistant" ? "assistant" : "user";
  const content = String(candidate.content || "").trim();
  if (!content) return null;
  const rawSources = Array.isArray(candidate.sources) ? candidate.sources : [];
  const sources = rawSources.map(parseSource).filter(Boolean) as Source[];
  return {
    id:
      typeof candidate.id === "string" && candidate.id
        ? candidate.id
        : createId(),
    role,
    content,
    createdAt: parseDateOrNow(candidate.createdAt),
    sources: sources.length > 0 ? sources : null,
  };
}

function parseThread(value: unknown): Thread | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const rawMessages = Array.isArray(candidate.messages) ? candidate.messages : [];
  const messages = rawMessages.map(parseMessage).filter(Boolean) as Message[];

  return {
    id:
      typeof candidate.id === "string" && candidate.id
        ? candidate.id
        : createId(),
    title:
      typeof candidate.title === "string" && candidate.title.trim()
        ? clipText(candidate.title.trim(), 80)
        : DEFAULT_THREAD_TITLE,
    pinned: Boolean(candidate.pinned),
    createdAt: parseDateOrNow(candidate.createdAt),
    updatedAt: parseDateOrNow(candidate.updatedAt),
    messages: messages.length > 0 ? messages : [createMessage("assistant", WELCOME_MESSAGE)],
  };
}

function loadThreadsFromStorage() {
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortThreads(parsed.map(parseThread).filter(Boolean) as Thread[]);
  } catch {
    return [];
  }
}

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) || null,
    [threads, activeThreadId],
  );

  const activeMessages = activeThread?.messages || [];

  useEffect(() => {
    const loadedThreads = loadThreadsFromStorage();
    let storedActiveThreadId: string | null = null;
    try {
      storedActiveThreadId = window.localStorage.getItem(
        ACTIVE_THREAD_STORAGE_KEY,
      );
    } catch {
      // localStorage may be unavailable (private browsing, storage disabled)
    }

    if (loadedThreads.length === 0) {
      const firstThread = createThread();
      setThreads([firstThread]);
      setActiveThreadId(firstThread.id);
      setIsHydrated(true);
      return;
    }

    setThreads(loadedThreads);
    setActiveThreadId(
      storedActiveThreadId &&
        loadedThreads.some((thread) => thread.id === storedActiveThreadId)
        ? storedActiveThreadId
        : loadedThreads[0].id,
    );
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(threads));
      if (activeThreadId) {
        window.localStorage.setItem(ACTIVE_THREAD_STORAGE_KEY, activeThreadId);
      } else {
        window.localStorage.removeItem(ACTIVE_THREAD_STORAGE_KEY);
      }
    } catch {
      // localStorage may be full or unavailable
    }
  }, [threads, activeThreadId, isHydrated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThreadId, activeMessages.length, isLoading]);

  function createNewThread(activate = true) {
    const thread = createThread();
    setThreads((prev) => sortThreads([thread, ...prev]));
    if (activate) setActiveThreadId(thread.id);
  }

  function renameThread(threadId: string) {
    const thread = threads.find((item) => item.id === threadId);
    if (!thread) return;
    const nextTitle = window.prompt("Rename thread", thread.title);
    if (!nextTitle) return;
    const title = clipText(nextTitle.trim(), 80);
    if (!title) return;

    setThreads((prev) =>
      sortThreads(
        prev.map((item) =>
          item.id === threadId
            ? { ...item, title, updatedAt: new Date().toISOString() }
            : item,
        ),
      ),
    );
  }

  function toggleThreadPin(threadId: string) {
    setThreads((prev) =>
      sortThreads(
        prev.map((thread) =>
          thread.id === threadId
            ? {
                ...thread,
                pinned: !thread.pinned,
                updatedAt: new Date().toISOString(),
              }
            : thread,
        ),
      ),
    );
  }

  function deleteThread(threadId: string) {
    const thread = threads.find((item) => item.id === threadId);
    if (!thread) return;
    const shouldDelete = window.confirm(
      `Delete "${thread.title}"? This cannot be undone.`,
    );
    if (!shouldDelete) return;

    let nextActiveThreadId: string | null = null;
    setThreads((prev) => {
      const remaining = prev.filter((item) => item.id !== threadId);
      if (remaining.length === 0) {
        const replacement = createThread();
        nextActiveThreadId = replacement.id;
        return [replacement];
      }
      const sorted = sortThreads(remaining);
      if (activeThreadId === threadId) {
        nextActiveThreadId = sorted[0].id;
      }
      return sorted;
    });

    if (nextActiveThreadId) {
      setActiveThreadId(nextActiveThreadId);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !activeThread) return;

    const question = input.trim();
    const threadId = activeThread.id;
    const historyForModel = activeThread.messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
    const userMessage = createMessage("user", question);

    setInput("");
    setIsLoading(true);

    setThreads((prev) =>
      sortThreads(
        prev.map((thread) => {
          if (thread.id !== threadId) return thread;
          const hasPreviousUserMessages = thread.messages.some(
            (message) => message.role === "user",
          );
          return {
            ...thread,
            title:
              !hasPreviousUserMessages && thread.title === DEFAULT_THREAD_TITLE
                ? deriveThreadTitleFromPrompt(question)
                : thread.title,
            messages: [...thread.messages, userMessage],
            updatedAt: new Date().toISOString(),
          };
        }),
      ),
    );

    try {
      const { answer, sources } = await chatWithBrain(historyForModel, question);
      const assistantMessage = createMessage(
        "assistant",
        answer || "I couldn't generate a response.",
        (sources as Source[] | null | undefined) || null,
      );

      setThreads((prev) =>
        sortThreads(
          prev.map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  messages: [...thread.messages, assistantMessage],
                  updatedAt: new Date().toISOString(),
                }
              : thread,
          ),
        ),
      );
    } catch {
      const fallbackMessage = createMessage(
        "assistant",
        "Sorry, I encountered an error accessing your brain.",
      );
      setThreads((prev) =>
        sortThreads(
          prev.map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  messages: [...thread.messages, fallbackMessage],
                  updatedAt: new Date().toISOString(),
                }
              : thread,
          ),
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isHydrated) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div
          className={`rounded-2xl border p-6 ${
            isDark
              ? "bg-neutral-900/80 border-neutral-800"
              : "bg-white/80 border-gray-100"
          }`}
        >
          <p className={isDark ? "text-gray-400" : "text-gray-500"}>
            Loading threads...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 h-[calc(100vh-64px)]">
      <aside
        className={`rounded-2xl border shadow-lg overflow-hidden transition-colors flex flex-col ${
          isDark
            ? "bg-neutral-900/80 border-neutral-800 shadow-black/30"
            : "bg-white/80 border-gray-100 shadow-gray-200/60"
        }`}
      >
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isDark ? "border-neutral-800" : "border-gray-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-emerald-500" />
            <span className="text-sm font-semibold">Saved Threads</span>
          </div>
          <button
            type="button"
            onClick={() => createNewThread(true)}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              isDark
                ? "bg-white text-black hover:bg-gray-100"
                : "bg-black text-white hover:bg-gray-900"
            }`}
          >
            <Plus size={14} /> New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {threads.map((thread) => {
            const isActive = thread.id === activeThreadId;
            return (
              <div
                key={thread.id}
                role="button"
                tabIndex={0}
                onClick={() => setActiveThreadId(thread.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveThreadId(thread.id);
                  }
                }}
                className={`w-full cursor-pointer text-left rounded-xl border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                  isActive
                    ? isDark
                      ? "border-emerald-500/50 bg-neutral-800"
                      : "border-emerald-500/40 bg-emerald-50"
                    : isDark
                      ? "border-neutral-800 bg-neutral-900/70 hover:border-neutral-700"
                      : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {thread.title}
                    </p>
                    <p
                      className={`text-xs mt-1 truncate ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {getThreadPreview(thread) || "No messages yet"}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      {thread.pinned && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                          Pinned
                        </span>
                      )}
                      <span
                        className={`text-[10px] ${
                          isDark ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        {formatShortDate(thread.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleThreadPin(thread.id);
                      }}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
                        isDark
                          ? "border-neutral-700 text-gray-300 hover:border-amber-500/40"
                          : "border-gray-200 text-gray-600 hover:border-amber-500/40"
                      }`}
                      title={thread.pinned ? "Unpin thread" : "Pin thread"}
                    >
                      {thread.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        renameThread(thread.id);
                      }}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
                        isDark
                          ? "border-neutral-700 text-gray-300 hover:border-neutral-500"
                          : "border-gray-200 text-gray-600 hover:border-gray-400"
                      }`}
                      title="Rename thread"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteThread(thread.id);
                      }}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
                        isDark
                          ? "border-neutral-700 text-red-400 hover:border-red-500/40"
                          : "border-gray-200 text-red-500 hover:border-red-500/40"
                      }`}
                      title="Delete thread"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      <div
        className={`flex flex-col rounded-2xl border shadow-lg overflow-hidden transition-colors ${
          isDark
            ? "bg-neutral-900/80 border-neutral-800 shadow-black/30"
            : "bg-white/80 border-gray-100 shadow-gray-200/60"
        }`}
      >
        <div
          className={`px-5 py-3 border-b flex items-center justify-between ${
            isDark ? "border-neutral-800" : "border-gray-200"
          }`}
        >
          <div>
            <p className="text-sm font-semibold">
              {activeThread?.title || DEFAULT_THREAD_TITLE}
            </p>
            <p className={isDark ? "text-xs text-gray-400" : "text-xs text-gray-500"}>
              Continue any past conversation from your saved threads.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                  <Bot size={18} className="text-white" />
                </div>
              )}

              <div
                className={`max-w-[78%] rounded-2xl p-4 ${
                  msg.role === "user"
                    ? isDark
                      ? "bg-white text-black"
                      : "bg-black text-white"
                    : isDark
                      ? "bg-neutral-800 border border-neutral-700"
                      : "bg-gray-50 border border-gray-200"
                }`}
              >
                <div
                  className={`prose prose-sm max-w-none ${
                    msg.role === "user"
                      ? isDark
                        ? ""
                        : "prose-invert"
                      : isDark
                        ? "prose-invert"
                        : ""
                  }`}
                >
                  <Markdown rehypePlugins={[rehypeSanitize]}>{msg.content}</Markdown>
                </div>

                {msg.sources && msg.sources.length > 0 && (
                  <div
                    className={`mt-3 pt-3 border-t ${
                      isDark ? "border-neutral-700" : "border-gray-200"
                    }`}
                  >
                    <p
                      className={`text-xs font-semibold mb-2 flex items-center gap-1 ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      <Sparkles size={12} className="text-amber-500" /> Sources
                      used:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((source) => (
                        <Link
                          key={`${msg.id}-${source.id}`}
                          href={buildCitationHref(source)}
                          className={`text-xs px-2 py-1 rounded-lg border truncate max-w-[160px] ${
                            isDark
                              ? "bg-neutral-900 border-neutral-700 text-gray-300 hover:border-amber-500/50 hover:text-gray-100"
                              : "bg-white border-gray-200 text-gray-600 hover:border-amber-500/50 hover:text-gray-900"
                          }`}
                          title={source.snippet || source.content}
                        >
                          {(source.snippet || source.content).substring(0, 24)}
                          {(source.snippet || source.content).length > 24
                            ? "..."
                            : ""}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isDark ? "bg-neutral-700" : "bg-gray-200"
                  }`}
                >
                  <User
                    size={18}
                    className={isDark ? "text-gray-300" : "text-gray-600"}
                  />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Bot size={18} className="text-white animate-pulse" />
              </div>
              <div
                className={`p-4 rounded-2xl border ${
                  isDark
                    ? "bg-neutral-800 border-neutral-700"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <span className={isDark ? "text-gray-400" : "text-gray-500"}>
                  Thinking...
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div
          className={`p-4 border-t ${
            isDark
              ? "bg-neutral-900 border-neutral-800"
              : "bg-white border-gray-200"
          }`}
        >
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Continue this thread..."
              className={`flex-1 p-4 rounded-xl border transition-colors ${
                isDark
                  ? "bg-neutral-950 border-neutral-800 text-gray-100 placeholder:text-gray-500 focus:border-neutral-600"
                  : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-gray-400"
              } outline-none`}
              disabled={isLoading || !activeThread}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || !activeThread}
              className="px-6 py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
            >
              {isLoading ? (
                "Thinking..."
              ) : (
                <>
                  <Send size={18} /> Send
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
