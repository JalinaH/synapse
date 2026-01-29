"use client";

import { Navbar } from "@/components/navbar";
import { useTheme } from "@/components/theme-provider";
import { Space_Grotesk } from "next/font/google";

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={`${grotesk.className} min-h-screen transition-colors ${
        isDark ? "bg-[#050505] text-gray-50" : "bg-gray-50 text-black"
      }`}
    >
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
