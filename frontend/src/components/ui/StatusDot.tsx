interface Props { active: boolean; label?: string; }

export default function StatusDot({ active, label }: Props) {
  return (
    <span className="flex items-center gap-2">
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? "status-dot-active" : ""}`}
        style={{ backgroundColor: active ? "var(--severity-low)" : "var(--severity-critical)" }}
      />
      {label && (
        <span className="text-sm" style={{ color: active ? "var(--severity-low)" : "var(--severity-critical)" }}>
          {label}
        </span>
      )}
    </span>
  );
}
