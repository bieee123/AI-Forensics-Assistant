import Link from "next/link";

interface Crumb {
  label: string;
  href?: string;
}

interface Props {
  title: string;
  subtitle?: string;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, crumbs, actions }: Props) {
  return (
    <div className="flex items-center justify-between px-6 h-14 border-b border-border-subtle bg-bg-elevated sticky top-0 z-5">
      <div>
        {crumbs && crumbs.length > 0 && (
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
