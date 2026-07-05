import { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: string;
  trendColor?: string;
}

export default function StatCard({ label, value, icon: Icon, iconColor = "var(--accent)", trend, trendColor }: Props) {
  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-lg p-5">
      <div className="flex items-center gap-2 mb-2.5">
        <Icon size={14} style={{ color: iconColor }} />
        <span className="text-[11px] text-text-secondary uppercase tracking-wider font-medium">{label}</span>
      </div>
      <div className="text-[30px] font-bold text-text-primary">{value}</div>
      {trend && (
        <div className="text-xs mt-1" style={{ color: trendColor || "var(--text-muted)" }}>{trend}</div>
      )}
    </div>
  );
}
