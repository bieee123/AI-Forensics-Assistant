"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

const ROUTE_LABELS: Record<string, string> = {
  "/": "Home",
  "/dashboard": "Home",
  "/upload": "Upload",
  "/analysis": "Analysis",
  "/timeline": "Timeline",
  "/report": "Report",
  "/history": "History",
  "/settings": "Settings",
  "/acquisition": "Acquisition",
  "/profile": "Profile",
};

interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: Props) {
  const pathname = usePathname();
  const [detailLabel, setDetailLabel] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uploadId = params.get("upload_id");
    setDetailLabel(uploadId ? `Upload #${uploadId}` : null);
  }, [pathname]);

  const crumbs: { label: string; href?: string }[] = [];
  const baseKey = "/" + pathname.split("/").filter(Boolean)[0] || "/";
  const baseLabel = ROUTE_LABELS[pathname] || ROUTE_LABELS[baseKey];

  crumbs.push({ label: "Home", href: "/" });

  if (pathname !== "/" && pathname !== "/dashboard") {
    crumbs.push({
      label: baseLabel,
      href: detailLabel ? pathname : undefined,
    });
  }

  if (detailLabel) {
    crumbs.push({ label: detailLabel });
  }

  return (
    <div className="flex items-center justify-between px-6 h-14 border-b border-border-subtle bg-bg-elevated sticky top-0 z-5">
      <div>
        {crumbs.length > 1 && (
          <nav className="flex items-center gap-1.5 text-[11px] text-text-muted mb-0.5">
            {crumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span>/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-text-primary transition-colors no-underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-text-primary">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-base font-semibold text-text-primary m-0">{title}</h1>
        {subtitle && <p className="text-[11px] text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
