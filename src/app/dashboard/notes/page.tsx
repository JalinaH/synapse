import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, Calendar, ArrowRight } from "lucide-react";

export default async function NotesLibraryPage() {
  const supabase = await createClient();

  // Fetch all notes, newest first
  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Library</h1>
          <p className="text-gray-500 mt-1">
            {notes?.length || 0} memories stored
          </p>
        </div>
        <Link
          href="/dashboard"
          className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition"
        >
          <Plus size={18} /> New Note
        </Link>
      </div>

      {/* Grid of Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {notes?.map((note) => (
          <Link
            key={note.id}
            href={`/dashboard/notes/${note.id}`}
            className="group block bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-purple-200 transition-all duration-200"
          >
            <div className="h-32 overflow-hidden mb-4 relative">
              {/* Fade out effect at bottom of text */}
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent" />
              <p className="text-gray-600 line-clamp-5 font-mono text-sm leading-relaxed">
                {note.content}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Calendar size={12} />
                {new Date(note.created_at).toLocaleDateString()}
              </div>
              <span className="text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-200">
                <ArrowRight size={16} />
              </span>
            </div>
          </Link>
        ))}

        {/* Empty State */}
        {notes?.length === 0 && (
          <div className="col-span-full text-center py-20 bg-gray-50 rounded-2xl border border-dashed">
            <h3 className="text-gray-500 font-medium">Your brain is empty.</h3>
            <p className="text-sm text-gray-400 mb-4">
              Add your first note to start building connections.
            </p>
            <Link href="/dashboard" className="text-blue-600 hover:underline">
              Go to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
