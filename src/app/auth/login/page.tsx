import Link from "next/link";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  const login = async () => {
    "use server";
    redirect("/");
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white shadow-lg shadow-gray-200">
            <span className="text-lg font-semibold">S</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
          <p className="text-sm text-gray-500">
            Sign in to your Synapse workspace
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-xl shadow-gray-200/60">
          <form className="space-y-4" action={login}>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-gray-700"
                htmlFor="email"
              >
                Email
              </label>
              <input
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-inner focus:border-gray-400 focus:outline-none"
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-gray-700"
                htmlFor="password"
              >
                Password
              </label>
              <input
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-inner focus:border-gray-400 focus:outline-none"
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-gray-300/60 transition hover:bg-black"
            >
              Sign In
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>Don&apos;t have an account?</span>
            <Link
              href="/auth/register"
              className="font-semibold text-gray-900 hover:underline"
            >
              Create one
            </Link>
          </div>

          {message && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 text-center">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
