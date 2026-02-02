"use client";

import { Zap, Crown } from "lucide-react";

interface Props {
  tier: "free" | "pro" | "ultra";
  usage: number;
}

export function SubscriptionCard({ tier = "free", usage = 0 }: Props) {
  const limits = { free: 1500, pro: 5000, ultra: 7500 };
  const limit = limits[tier] || 1500;
  const percentage = Math.min((usage / limit) * 100, 100);
  const remaining = limit - usage;

  const handleUpgrade = (plan: string) => {
    // In the future, this calls your Stripe Checkout Server Action
    alert(`Redirecting to Stripe to upgrade to ${plan}...`);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
      {/* 1. CURRENT USAGE STATS */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wide text-gray-500">
              {tier === "ultra" ? (
                <Crown className="text-yellow-500 fill-yellow-500" size={16} />
              ) : tier === "pro" ? (
                <Zap className="text-blue-500 fill-blue-500" size={16} />
              ) : (
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px]">
                  FREE TIER
                </span>
              )}
              Current Plan
            </h3>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold text-gray-900">
              {usage.toLocaleString()}
            </span>
            <span className="text-gray-400 text-sm">
              {" "}
              / {limit.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-2">
          <div
            className={`h-full transition-all duration-500 ${
              percentage > 90 ? "bg-red-500" : "bg-black"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Monthly Usage</span>
          <span
            className={
              remaining < 100 ? "text-red-500 font-bold" : "text-gray-500"
            }
          >
            {remaining.toLocaleString()} credits left
          </span>
        </div>
      </div>

      {/* 2. UPGRADE TEASER (Hidden if Ultra) */}
      {tier !== "ultra" && (
        <div className="pt-6 border-t border-dashed">
          <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Zap size={16} className="text-yellow-500" /> Upgrade & Unlock
          </h4>
          <p className="text-xs text-gray-500 mb-4">
            Get more credits, faster AI speeds, and priority vector indexing.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleUpgrade("pro")}
              disabled={tier === "pro"}
              className="py-2 px-3 text-xs font-bold rounded-lg border border-gray-200 hover:border-black hover:bg-gray-50 transition disabled:opacity-50"
            >
              Pro (5k)
            </button>
            <button
              onClick={() => handleUpgrade("ultra")}
              className="py-2 px-3 text-xs font-bold rounded-lg bg-black text-white hover:bg-gray-800 transition"
            >
              Ultra (7.5k)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
