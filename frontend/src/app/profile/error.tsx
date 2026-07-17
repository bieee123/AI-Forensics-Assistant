"use client";
import { useEffect } from "react";
import AppShell from "@/components/layout/AppShell";

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Profile page error:", error);
  }, [error]);

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto flex flex-col items-center justify-center h-64 gap-4">
        <div className="font-mono text-xs" style={{ color: "#FF3B30" }}>
          Something went wrong loading your profile.
        </div>
        <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {error.message}
        </div>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-md text-xs font-semibold border-none cursor-pointer"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          Try again
        </button>
        <a
          href="/dashboard"
          className="text-[11px] underline"
          style={{ color: "var(--accent)" }}
        >
          Back to Dashboard
        </a>
      </div>
    </AppShell>
  );
}
