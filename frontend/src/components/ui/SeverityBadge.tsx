import { severityBadgeClass } from "@/lib/utils";

export default function SeverityBadge({ severity }: { severity: string }) {
  return <span className={severityBadgeClass(severity)}>{severity}</span>;
}
