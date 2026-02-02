import { createClient } from "@/lib/supabase/server";
import { updateProfile, signOut } from "@/app/actions";
import { SubscriptionCard } from "@/components/subscription-card";
import { User, Mail, Calendar, Save, LogOut, ShieldCheck } from "lucide-react";

export default async function ProfilePage() {
  const supabase = await createClient();

  // 1. Fetch Auth User
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // 2. Fetch Profile Data (Including new subscription columns)
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Helper: Get Initials for Avatar
  const initials =
    `${profile?.first_name?.[0] || ""}${profile?.last_name?.[0] || ""}`.toUpperCase() ||
    "U";

  // Helper: Format Dates
  const joinDate = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const cycleDate = new Date(
    profile?.billing_start_date || new Date(),
  ).toLocaleDateString("en-US", { day: "numeric", month: "short" });

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-(--border) pb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Account Settings
          </h1>
          <p className="text-(--muted) mt-1">
            Manage your personal info and subscription plan.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 text-sm font-medium rounded-full border border-emerald-500/20">
          <ShieldCheck size={14} />
          <span>Secure Connection</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* === LEFT COLUMN: Identity & Usage (Read Only) === */}
        <div className="lg:col-span-1 space-y-6">
          {/* Identity Card */}
          <div className="bg-(--surface) p-6 rounded-2xl border border-(--border) shadow-sm flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-linear-to-br from-(--border) to-background text-foreground rounded-full flex items-center justify-center text-3xl font-bold mb-4 shadow-inner">
              {initials}
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {profile?.first_name} {profile?.last_name}
            </h2>
            <p className="text-sm text-(--muted) mb-6 font-mono">
              {profile?.email || user.email}
            </p>

            <div className="flex items-center gap-2 text-xs text-(--muted) bg-background px-3 py-1.5 rounded-full border border-(--border)">
              <Calendar size={12} />
              <span>Member since {joinDate}</span>
            </div>
          </div>

          {/* Subscription Card (Re-usable Component) */}
          <SubscriptionCard
            tier={profile?.tier || "free"}
            usage={profile?.credits_used || 0}
          />

          <p className="text-xs text-center text-(--muted)">
            Next billing cycle starts on {cycleDate}
          </p>
        </div>

        {/* === RIGHT COLUMN: Forms & Actions (Editable) === */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info Form */}
          <section className="bg-(--surface) p-8 rounded-2xl border border-(--border) shadow-sm relative overflow-hidden">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <User size={20} className="text-(--muted)" />
              Personal Information
            </h3>

            <form action={updateProfile} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-(--muted)">
                    First Name
                  </label>
                  <input
                    name="firstName"
                    defaultValue={profile?.first_name || ""}
                    className="w-full p-2.5 border border-(--border) rounded-lg bg-background text-foreground focus:ring-2 focus:ring-foreground focus:border-transparent outline-none transition"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-(--muted)">
                    Last Name
                  </label>
                  <input
                    name="lastName"
                    defaultValue={profile?.last_name || ""}
                    className="w-full p-2.5 border border-(--border) rounded-lg bg-background text-foreground focus:ring-2 focus:ring-foreground focus:border-transparent outline-none transition"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-(--muted)">
                  Email Address
                </label>
                <div className="flex items-center gap-3 w-full p-2.5 border border-(--border) bg-background rounded-lg text-(--muted) cursor-not-allowed">
                  <Mail size={16} />
                  <span>{user.email}</span>
                </div>
                <p className="text-[11px] text-(--muted)">
                  To change your email, please contact support.
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="bg-foreground text-background px-6 py-2.5 rounded-lg hover:opacity-90 transition flex items-center gap-2 text-sm font-medium"
                >
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </form>
          </section>

          {/* Danger Zone */}
          <section className="bg-red-500/10 p-8 rounded-2xl border border-red-500/20">
            <h3 className="text-sm font-bold text-red-500 mb-2 uppercase tracking-wide">
              Danger Zone
            </h3>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <p className="text-sm text-red-500/80">
                Sign out of your account on this device. Your data will remain
                safe.
              </p>
              <form action={signOut}>
                <button className="whitespace-nowrap bg-(--surface) text-red-500 border border-red-500/20 px-5 py-2 rounded-lg hover:bg-red-500/10 transition flex items-center gap-2 text-sm font-medium shadow-sm">
                  <LogOut size={16} /> Sign Out
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
