import Link from "next/link";
import { Check, Crown, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    cadence: "month",
    credits: "1,500",
    speed: "Standard",
    support: "Community",
    icon: Sparkles,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$12",
    cadence: "month",
    credits: "5,000",
    speed: "Fast",
    support: "Priority",
    icon: Zap,
  },
  {
    id: "ultra",
    name: "Ultra",
    price: "$24",
    cadence: "month",
    credits: "7,500",
    speed: "Fastest",
    support: "VIP",
    icon: Crown,
  },
] as const;

export default async function SubscribePage({
  searchParams,
}: {
  searchParams?: { plan?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <div className="rounded-2xl border border-(--border) bg-(--surface) p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-foreground">Subscription</h1>
          <p className="text-(--muted) mt-2">
            You need to sign in to manage your subscription.
          </p>
          <Link
            href="/auth/login"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90 transition"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  const currentPlan = (profile?.tier || "free") as (typeof plans)[number]["id"];
  const selectedPlan = (plans.find((plan) => plan.id === searchParams?.plan) ||
    plans.find((plan) => plan.id === currentPlan) ||
    plans[1]) as (typeof plans)[number];

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Choose your plan
          </h1>
          <p className="text-(--muted) mt-1">
            Upgrade anytime. Your notes and embeddings stay intact.
          </p>
        </div>
        <Link
          href="/dashboard/profile"
          className="text-sm font-semibold text-(--muted) hover:text-foreground transition"
        >
          Back to profile
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {plans.map((plan) => {
            const isSelected = plan.id === selectedPlan.id;
            const isCurrent = plan.id === currentPlan;
            const Icon = plan.icon;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-6 transition-all shadow-sm bg-(--surface) ${
                  isSelected
                    ? "border-emerald-500/50 shadow-emerald-500/10"
                    : "border-(--border)"
                }`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Icon size={18} className="text-emerald-500" />
                      {plan.name}
                      {isCurrent && (
                        <span className="ml-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-500">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-(--muted) text-sm">
                      {plan.credits} credits · {plan.speed} AI · {plan.support}{" "}
                      support
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-foreground">
                        {plan.price}
                      </div>
                      <div className="text-xs text-(--muted)">
                        per {plan.cadence}
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/subscribe?plan=${plan.id}`}
                      className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                        isSelected
                          ? "bg-foreground text-background"
                          : "border border-(--border) text-foreground hover:border-emerald-500/40"
                      }`}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </Link>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-(--muted)">
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-500" />
                    Vector search included
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-500" />
                    Unlimited notes
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-500" />
                    Export anytime
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <aside className="rounded-2xl border border-(--border) bg-(--surface) p-6 shadow-sm h-fit">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck size={16} className="text-emerald-500" />
            Checkout summary
          </div>
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-(--muted)">Selected plan</span>
              <span className="font-semibold text-foreground">
                {selectedPlan.name}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-(--muted)">Monthly price</span>
              <span className="font-semibold text-foreground">
                {selectedPlan.price}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-(--muted)">Included credits</span>
              <span className="font-semibold text-foreground">
                {selectedPlan.credits}
              </span>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-500">
            Billed monthly. Cancel anytime.
          </div>

          <button
            type="button"
            className={`mt-6 w-full rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              selectedPlan.id === currentPlan
                ? "border border-(--border) text-(--muted) cursor-not-allowed"
                : "bg-foreground text-background hover:opacity-90"
            }`}
            disabled={selectedPlan.id === currentPlan}
          >
            {selectedPlan.id === currentPlan
              ? "Current plan"
              : `Proceed with ${selectedPlan.name}`}
          </button>

          <p className="mt-3 text-[11px] text-(--muted)">
            Payments aren’t wired yet. We’ll connect Stripe next.
          </p>
        </aside>
      </div>
    </div>
  );
}
