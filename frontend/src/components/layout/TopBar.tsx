"use client";
import { Suspense } from "react";

export default function TopBar() {
  return (
    <Suspense fallback={<div className="h-12" style={{ background: "#0B0E14" }} />}>
      <TopBarContent />
    </Suspense>
  );
}

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  Shield, Home, ChevronRight, Sun, Moon, LogOut,
} from "lucide-react";
import { getLang, setLang, Lang } from "@/lib/i18n";

const PAGE_LABELS: Record<string, string> = {
  dashboard: "Dashboard", upload: "Upload", acquisition: "Artifact Acquisition",
  analysis: "Analysis", timeline: "Timeline", history: "History",
  report: "Report", settings: "Settings",
};

const PAGE_LABELS_ID: Record<string, string> = {
  dashboard: "Dasbor", upload: "Unggah", acquisition: "Akuisisi Artefak",
  analysis: "Analisis", timeline: "Timeline", history: "Riwayat",
  report: "Laporan", settings: "Pengaturan",
};

function TopBarContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const [lang, setLangState] = useState<Lang>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); setLangState(getLang()); }, []);

  useEffect(() => {
    const handler = () => setLangState(getLang());
    window.addEventListener("lang-change", handler);
    return () => window.removeEventListener("lang-change", handler);
  }, []);

  const toggleLang = () => {
    const next = lang === "en" ? "id" : "en";
    setLang(next);
    setLangState(next);
    window.dispatchEvent(new Event("lang-change"));
  };

  const uploadId = searchParams.get("upload_id");
  const detailLabel = uploadId ? `Upload #${uploadId}` : null;

  const getPageName = (): string => {
    const segment = pathname?.split("/")[1] || "dashboard";
    if (segment === "login") return "";
    const labels = lang === "id" ? PAGE_LABELS_ID : PAGE_LABELS;
    return labels[segment] || segment;
  };

  const currentPage = getPageName();

  const handleLogout = () => {
    document.cookie = "dfa-authed=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    router.push("/login");
  };

  return (
    <div className="topbar h-12 flex-shrink-0 flex items-center gap-3.5 px-3.5 border-b border-white/8 relative z-30"
      style={{ background: "#0B0E14", color: "#fff" }}>
      {/* Brand */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-[26px] h-[26px] rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
          <Shield size={16} />
        </div>
        <div>
          <div className="font-bold text-[13.5px] tracking-wide whitespace-nowrap">DFA</div>
          <div className="text-[9.5px] whitespace-nowrap" style={{ color: "rgba(255,255,255,0.45)", marginTop: -2 }}>
            Forensics Assistant
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Breadcrumb */}
      {currentPage && (
        <div className="flex items-center gap-1.5 text-xs whitespace-nowrap select-none" style={{ color: "rgba(255,255,255,0.55)" }}>
          <span
            onClick={() => router.push("/")}
            className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <Home size={12} style={{ opacity: 0.5 }} />
            Home
          </span>
          <ChevronRight size={12} style={{ opacity: 0.5 }} />
          <span
            onClick={() => router.push(`/${pathname?.split("/")[1] || "dashboard"}`)}
            className="font-semibold cursor-pointer hover:opacity-80 transition-opacity"
            style={{ color: "#fff" }}
          >
            {currentPage}
          </span>
          {detailLabel && (
            <>
              <ChevronRight size={12} style={{ opacity: 0.5 }} />
              <span style={{ color: "rgba(255,255,255,0.8)" }}>{detailLabel}</span>
            </>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="w-px h-5 flex-shrink-0" style={{ background: "rgba(255,255,255,0.12)" }} />

      {/* Language toggle */}
      <button
        onClick={toggleLang}
        title="Toggle language"
        className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 border-none cursor-pointer font-mono text-[11px] gap-1.5 px-2.5"
        style={{ color: "rgba(255,255,255,0.65)", background: "none" }}
        onMouseEnter={e => { (e.target as HTMLElement).style.background = "rgba(255,255,255,0.08)"; (e.target as HTMLElement).style.color = "#fff"; }}
        onMouseLeave={e => { (e.target as HTMLElement).style.background = "none"; (e.target as HTMLElement).style.color = "rgba(255,255,255,0.65)"; }}
      >
        {lang.toUpperCase()}
      </button>

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        title="Toggle theme"
        className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 border-none cursor-pointer"
        style={{ color: "rgba(255,255,255,0.65)", background: "none" }}
        onMouseEnter={e => { (e.target as HTMLElement).style.background = "rgba(255,255,255,0.08)"; (e.target as HTMLElement).style.color = "#fff"; }}
        onMouseLeave={e => { (e.target as HTMLElement).style.background = "none"; (e.target as HTMLElement).style.color = "rgba(255,255,255,0.65)"; }}
      >
        {mounted && theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Avatar — placed BEFORE logout so it's not accidentally clicked */}
      <div
        onClick={() => router.push("/profile")}
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 cursor-pointer"
        style={{ background: "var(--accent)", color: "#fff" }}
        title="analyst01"
      >
        A1
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        title="Logout"
        className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 border-none cursor-pointer"
        style={{ color: "rgba(255,255,255,0.65)", background: "none" }}
        onMouseEnter={e => { (e.target as HTMLElement).style.background = "rgba(255,255,255,0.08)"; (e.target as HTMLElement).style.color = "#fff"; }}
        onMouseLeave={e => { (e.target as HTMLElement).style.background = "none"; (e.target as HTMLElement).style.color = "rgba(255,255,255,0.65)"; }}
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
