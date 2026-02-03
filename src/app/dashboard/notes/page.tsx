import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, Calendar, ArrowRight } from "lucide-react";
import { getTierConfig } from "@/lib/tiers";

export default async function NotesLibraryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("tier").eq("id", user.id).single()
    : { data: null };

  // Fetch all notes, newest first
  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false });

  const notesCount = notes?.length || 0;
  const { notes: notesLimit } = getTierConfig(profile?.tier);
  const hasNoteLimit = Number.isFinite(notesLimit);
  const isAtLimit = hasNoteLimit && notesCount >= notesLimit;
  const notesUsageLabel = hasNoteLimit
    ? `${notesCount.toLocaleString()} of ${notesLimit.toLocaleString()} memories used`
    : `${notesCount.toLocaleString()} memories stored`;

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            My Library
          </h1>
          <p className="text-muted mt-1">{notesUsageLabel}</p>
          {isAtLimit && (
            <p className="text-xs text-red-500 mt-1">
              Note limit reached. Upgrade to add more notes.
            </p>
          )}
        </div>
        {isAtLimit ? (
          <div className="bg-surface text-muted px-4 py-2 rounded-lg flex items-center gap-2 cursor-not-allowed border border-border">
            <Plus size={18} /> Note limit reached
          </div>
        ) : (
          <Link
            href="/dashboard"
            className="bg-foreground text-background px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition"
          >
            <Plus size={18} /> New Note
          </Link>
        )}
      </div>

      {/* Grid of Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {notes?.map((note) => (
          <Link
            key={note.id}
            href={`/dashboard/notes/${note.id}`}
            className="group block bg-surface border border-border rounded-2xl p-6 hover:shadow-lg hover:border-emerald-500/30 transition-all duration-200"
          >
            <div className="h-32 overflow-hidden mb-4 relative">
              {/* Fade out effect at bottom of text */}
              <div className="absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-surface to-transparent" />
              <p className="text-muted line-clamp-5 font-mono text-sm leading-relaxed">
                {note.content}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted">
                <Calendar size={12} />
                {new Date(note.created_at).toLocaleDateString()}
              </div>
              <span className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity transform -translate-x-2.5 group-hover:translate-x-0 duration-200">
                <ArrowRight size={16} />
              </span>
            </div>
          </Link>
        ))}

        {/* Empty State */}
        {notes?.length === 0 && (
          <div className="col-span-full text-center py-20 bg-surface rounded-2xl border border-dashed border-border">
            <h3 className="text-muted font-medium">
              Your brain is empty.
            </h3>
            <p className="text-sm text-muted mb-4">
              Add your first note to start building connections.
            </p>
            <Link
              href="/dashboard"
              className="text-emerald-500 hover:underline"
            >
              Go to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
