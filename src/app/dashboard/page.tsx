"use client";

import { useState } from "react";
import { addNote, searchNotes, signOut } from "@/app/actions";

interface Note {
  id: string;
  content: string;
  similarity: number;
}

export default function Dashboard() {
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  async function handleSearch(formData: FormData) {
    setIsSearching(true);
    const query = formData.get("query") as string;
    const results = await searchNotes(query);
    setSearchResults(results);
    setIsSearching(false);
  }

  return (
    <div className="max-w-4xl mx-auto p-10">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold">Synapse 🧠</h1>
        <form action={signOut}>
          <button className="text-sm text-red-500 hover:underline">
            Sign Out
          </button>
        </form>
      </div>

      {/* 1. Add Note Section */}
      <div className="mb-12 p-6 bg-gray-50 rounded-xl border">
        <h2 className="text-xl font-semibold mb-4">Add to Memory</h2>
        <form
          action={async (formData) => {
            await addNote(formData);
            alert("Note saved to brain!");
            // clear form here if you want
          }}
        >
          <textarea
            name="content"
            className="w-full p-3 border rounded-md min-h-[100px] mb-3"
            placeholder="What did you learn today?"
            required
          />
          <button
            type="submit"
            className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800"
          >
            Save Note
          </button>
        </form>
      </div>

      {/* 2. Search Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Recall Memory</h2>
        <form action={handleSearch} className="flex gap-2">
          <input
            name="query"
            className="flex-1 p-3 border rounded-md"
            placeholder="Ask your second brain..."
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            {isSearching ? "Thinking..." : "Ask"}
          </button>
        </form>
      </div>

      {/* 3. Results Display */}
      <div className="space-y-4">
        {searchResults.map((note) => (
          <div
            key={note.id}
            className="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition"
          >
            <p className="text-gray-800">{note.content}</p>
            <div className="mt-2 text-xs text-green-600 font-mono">
              Similarity Match: {(note.similarity * 100).toFixed(1)}%
            </div>
          </div>
        ))}
        {searchResults.length === 0 && !isSearching && (
          <p className="text-gray-400 text-center italic">No memories found.</p>
        )}
      </div>
    </div>
  );
}
