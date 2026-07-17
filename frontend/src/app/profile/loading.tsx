import AppShell from "@/components/layout/AppShell";

export default function ProfileLoading() {
  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto flex items-center justify-center h-64">
        <div className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>Loading...</div>
      </div>
    </AppShell>
  );
}
