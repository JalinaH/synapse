"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { chatWithBrain } from "@/app/actions";
import { Send, Bot, User, Sparkles } from "lucide-react";
import Markdown from "react-markdown";
import { useTheme } from "@/components/theme-provider";

interface Source {
  id: string;
  content: string;
  similarity: number;
  snippet?: string;
  highlight?: string;
}

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[] | null;
};

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

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I am your second brain. Ask me anything about your notes.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput("");
    setIsLoading(true);

    // Add user message immediately
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);

    // Call Server Action
    try {
      const { answer, sources } = await chatWithBrain(messages, userMsg);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: answer, sources },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error accessing your brain.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 h-[calc(100vh-64px)] flex flex-col">
      {/* Chat Container */}
      <div
        className={`flex-1 flex flex-col rounded-2xl border shadow-lg overflow-hidden transition-colors ${
          isDark
            ? "bg-neutral-900/80 border-neutral-800 shadow-black/30"
            : "bg-white/80 border-gray-100 shadow-gray-200/60"
        }`}
      >
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {/* Avatar */}
              {msg.role === "assistant" && (
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                  <Bot size={18} className="text-white" />
                </div>
              )}

              {/* Bubble */}
              <div
                className={`max-w-[75%] rounded-2xl p-4 ${
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
                  <Markdown>{msg.content}</Markdown>
                </div>

                {/* Citations / Sources */}
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
                          key={source.id}
                          href={buildCitationHref(source)}
                          className={`text-xs px-2 py-1 rounded-lg border truncate max-w-[150px] ${
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

              {/* User Avatar */}
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

        {/* Input Area */}
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
              placeholder="Ask your second brain..."
              className={`flex-1 p-4 rounded-xl border transition-colors ${
                isDark
                  ? "bg-neutral-950 border-neutral-800 text-gray-100 placeholder:text-gray-500 focus:border-neutral-600"
                  : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-gray-400"
              } outline-none`}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
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
