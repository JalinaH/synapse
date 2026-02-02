import { signOut } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-8">Settings</h1>

      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">
            Email Address
          </label>
          <div className="p-3 bg-gray-50 rounded-md border font-mono text-sm">
            {user?.email}
          </div>
        </div>

        <div className="pt-4 border-t">
          <form action={signOut}>
            <button className="text-red-600 text-sm font-medium hover:underline">
              Sign out of Synapse
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
