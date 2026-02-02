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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-500 mt-1">
            Manage your personal info and subscription plan.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full border border-green-100">
          <ShieldCheck size={14} />
          <span>Secure Connection</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* === LEFT COLUMN: Identity & Usage (Read Only) === */}
        <div className="lg:col-span-1 space-y-6">
          {/* Identity Card */}
          <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-linear-to-br from-gray-100 to-gray-200 text-gray-700 rounded-full flex items-center justify-center text-3xl font-bold mb-4 shadow-inner">
              {initials}
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {profile?.first_name} {profile?.last_name}
            </h2>
            <p className="text-sm text-gray-500 mb-6 font-mono">
              {profile?.email}
            </p>

            <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full">
              <Calendar size={12} />
              <span>Member since {joinDate}</span>
            </div>
          </div>

          {/* Subscription Card (Re-usable Component) */}
          <SubscriptionCard
            tier={profile?.tier || "free"}
            usage={profile?.credits_used || 0}
          />

          <p className="text-xs text-center text-gray-400">
            Next billing cycle starts on {cycleDate}
          </p>
        </div>

        {/* === RIGHT COLUMN: Forms & Actions (Editable) === */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info Form */}
          <section className="bg-white p-8 rounded-2xl border shadow-sm relative overflow-hidden">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <User size={20} className="text-gray-400" />
              Personal Information
            </h3>

            <form action={updateProfile} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <input
                    name="firstName"
                    defaultValue={profile?.first_name || ""}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <input
                    name="lastName"
                    defaultValue={profile?.last_name || ""}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="flex items-center gap-3 w-full p-2.5 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed">
                  <Mail size={16} />
                  <span>{user.email}</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  To change your email, please contact support.
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition flex items-center gap-2 text-sm font-medium"
                >
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </form>
          </section>

          {/* Danger Zone */}
          <section className="bg-red-50/50 p-8 rounded-2xl border border-red-100">
            <h3 className="text-sm font-bold text-red-900 mb-2 uppercase tracking-wide">
              Danger Zone
            </h3>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <p className="text-sm text-red-700/80">
                Sign out of your account on this device. Your data will remain
                safe.
              </p>
              <form action={signOut}>
                <button className="whitespace-nowrap bg-white text-red-600 border border-red-200 px-5 py-2 rounded-lg hover:bg-red-50 hover:border-red-300 transition flex items-center gap-2 text-sm font-medium shadow-sm">
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
