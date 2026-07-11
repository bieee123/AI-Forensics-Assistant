"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Upload, Terminal, Brain, Clock,
  History, FileText, Settings, ChevronLeft, ChevronRight, LogOut,
} from "lucide-react";
import { getLang, t, Lang } from "@/lib/i18n";

const NAV_SECTIONS = [
  {
    labelKey: "overview",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard" },
    ],
  },
  {
    labelKey: "forensics",
    items: [
      { href: "/upload", icon: Upload, labelKey: "upload" },
      { href: "/acquisition", icon: Terminal, labelKey: "acquisition" },
      { href: "/analysis", icon: Brain, labelKey: "analysis" },
      { href: "/timeline", icon: Clock, labelKey: "timeline" },
      { href: "/history", icon: History, labelKey: "history" },
      { href: "/report", icon: FileText, labelKey: "report" },
    ],
  },
  {
    labelKey: "system",
    items: [
      { href: "/settings", icon: Settings, labelKey: "settings" },
    ],
  },
];

const SECTION_LABELS: Record<string, { en: string; id: string }> = {
  overview: { en: "Overview", id: "Ikhtisar" },
  forensics: { en: "Forensics", id: "Forensik" },
  system: { en: "System", id: "Sistem" },
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>("en");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => { setLangState(getLang()); }, []);

  useEffect(() => {
    const handler = () => setLangState(getLang());
    window.addEventListener("lang-change", handler);
    return () => window.removeEventListener("lang-change", handler);
  }, []);

  const tr = t(lang);

  const handleLogout = () => {
    document.cookie = "dfa-authed=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    router.push("/login");
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname?.startsWith(href);
  };

  return (
    <aside
      style={{ width: collapsed ? 64 : 240 }}
      className="flex flex-col h-full bg-bg-elevated border-r border-border-subtle transition-all duration-150 flex-shrink-0"
    >
      {/* Nav items */}
      <nav className="flex-1 py-2.5 overflow-y-auto overflow-x-hidden">
        {NAV_SECTIONS.map((section) => {
          const secLabel = SECTION_LABELS[section.labelKey];
          const labelText = secLabel ? (lang === "id" ? secLabel.id : secLabel.en) : section.labelKey;

          return (
            <div key={section.labelKey}>
              {/* Section label */}
              <div
                className={`text-[10px] uppercase tracking-wider font-semibold whitespace-nowrap transition-all
                  ${collapsed ? "text-center py-3.5" : "px-4 pt-3.5 pb-1.5"}`}
                style={{ color: "var(--text-muted)" }}
              >
                {collapsed ? (
                  <div style={{ margin: "0 14px", height: 1, background: "var(--border-subtle)" }} />
                ) : (
                  <span>{labelText}</span>
                )}
              </div>

              {section.items.map(({ href, icon: Icon, labelKey }) => {
                const active = isActive(href);
                const label = tr.nav[labelKey as keyof typeof tr.nav] || labelKey;

                return (
                  <button
                    key={href}
                    onClick={() => router.push(href)}
                    title={collapsed ? label : undefined}
                    className={`w-full flex items-center gap-3 py-2.5 text-sm border-l-[3px] border-l-transparent font-sans text-left relative transition-colors
                      ${collapsed ? "justify-center px-0" : "px-4"}
                      ${active
                        ? "bg-accent-bg text-accent font-semibold border-l-accent"
                        : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                      }`}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    {!collapsed && <span>{label}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="border-t border-border-subtle py-2">
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`w-full flex items-center gap-3 py-2.5 text-sm text-text-muted hover:bg-bg-hover hover:text-text-secondary transition-colors font-sans
            ${collapsed ? "justify-center px-0" : "px-4"}`}
        >
          {collapsed ? <ChevronRight size={16} className="flex-shrink-0" /> : <ChevronLeft size={16} className="flex-shrink-0" />}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>

        {/* Profile row */}
        <div
          onClick={() => router.push("/profile")}
          className={`flex items-center gap-2.5 py-3 border-t border-border-subtle cursor-pointer transition-colors hover:bg-bg-hover ${collapsed ? "justify-center px-0" : "px-4"}`}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            A1
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 overflow-hidden">
                <div className="text-[13px] font-semibold text-text-primary whitespace-nowrap overflow-hidden text-ellipsis">analyst01</div>
                <div className="text-[11px] text-text-muted whitespace-nowrap overflow-hidden text-ellipsis">Forensic Analyst</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                title="Logout"
                className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 border-none cursor-pointer text-text-muted hover:bg-bg-hover hover:text-critical"
              >
                <LogOut size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
