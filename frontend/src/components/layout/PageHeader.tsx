interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="flex items-center justify-between px-6 h-14 border-b border-border-subtle bg-bg-elevated sticky top-0 z-5">
      <div>
        <h1 className="text-base font-semibold text-text-primary m-0">{title}</h1>
        {subtitle && <p className="text-[11px] text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
