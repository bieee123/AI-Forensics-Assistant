# AGENT BRIEF — Frontend Implementation
## Agentic AI Digital Forensics Assistant

> **Read this entire document before writing a single line of code.**
> This brief is complete and self-contained. Do not deviate from the specs below.
> Do not add features not listed here. Do not use libraries not listed here.

---

## 0. Context

You are building the frontend for a **digital forensics triage assistant** used by system programmers at PT Teknologi Nasional Indonesia Siber (LTI). The design reference is **Wazuh** — a professional SOC security dashboard. The UI must look and feel like a real enterprise security tool, not a student project.

The backend API is already live at `http://localhost:8000`. All endpoints are working. Your job is frontend only.

---

## 1. Project State (What Already Exists)

```
frontend/
├── src/app/
│   ├── globals.css      ← YOU WILL REPLACE THIS
│   ├── layout.tsx       ← YOU WILL REPLACE THIS
│   └── page.tsx         ← YOU WILL REPLACE THIS
├── package.json         ← already has next, react, tailwindcss
├── postcss.config.mjs   ← already exists, do not touch
├── next.config.ts       ← already exists, do not touch
└── tsconfig.json        ← already exists, do not touch
```

**No `tailwind.config.ts` exists** — this project uses Next.js 15 with Tailwind configured via `postcss.config.mjs`. Add a `tailwind.config.ts` file as specified below.

---

## 2. Install These Packages First

```bash
npm install next-themes lucide-react recharts
npm install -D @types/react
```

Do not install any other packages.

---

## 3. Design System

### 3.1 Color Tokens (CSS Variables)

```css
/* Light mode — :root */
--bg-base: #F0F2F8;
--bg-elevated: #FFFFFF;
--bg-hover: #E8EBF5;
--border-subtle: #D0D5E8;
--border-strong: #A0AACB;
--text-primary: #0F1117;
--text-secondary: #4A5275;
--text-muted: #8B92A9;
--accent: #0096B7;
--accent-hover: #007A96;
--accent-bg: rgba(0, 150, 183, 0.10);

/* Dark mode — .dark */
--bg-base: #0F1117;
--bg-elevated: #1A1D27;
--bg-hover: #21253A;
--border-subtle: #2D3249;
--border-strong: #3D4466;
--text-primary: #E8ECF4;
--text-secondary: #8B92A9;
--text-muted: #5A6080;
--accent: #00B4D8;
--accent-hover: #0096B7;
--accent-bg: rgba(0, 180, 216, 0.12);

/* Severity — same in both modes */
--severity-critical: #FF4D6A;
--severity-high: #FF8C42;
--severity-medium: #FFD166;  /* use #c9a52e for text on light bg */
--severity-low: #06D6A0;
--severity-info: #4ECDC4;
```

### 3.2 Typography

- **UI font:** Inter (Google Fonts) — weights 400, 500, 600, 700
- **Monospace font:** JetBrains Mono (Google Fonts) — for log lines, IPs, hashes, raw_message
- **Base size:** 14px body text

### 3.3 Spacing & Layout

```
Topbar height:    48px (full-width, fixed, dark strip #0B0E14 in BOTH light and dark mode —
                  this is a permanent brand strip, not theme-reactive)
Sidebar width:    240px (collapsed: 64px icon-only, toggle button)
Main padding:     24px horizontal, 24px vertical
Card gap:         16px
Card border-radius: 8px
Card border:      1px solid var(--border-subtle)
Card background:  var(--bg-elevated)
Page header height: 56px
```

**Layout structure (top to bottom / left to right):**
```
┌─────────────────────────────────────────────────────────────┐
│ Topbar (48px, full width)                                    │
│  [Brand: mark + "DFA" + "Forensics Assistant"] ... spacer ...│
│  [Breadcrumb: Home / <Current Page>] | [Lang] [Theme] [Logout]│
│  [Avatar]                                                     │
├───────────────┬─────────────────────────────────────────────┤
│ Sidebar        │ Main content (page-header + page-body)      │
│ (240/64px)     │                                               │
└───────────────┴─────────────────────────────────────────────┘
```

There is **no hamburger icon** in the topbar — sidebar collapse/expand is controlled only by
the Collapse button at the bottom of the sidebar itself.

**Sidebar nav is grouped into three labelled sections** (uppercase, 10px, `text-muted`,
hidden when collapsed but the section still renders as a thin divider line):
- **Overview** — Dashboard
- **Forensics** — Upload, Artifact Acquisition, Analysis, Timeline, History, Report
- **System** — Settings

**Sidebar bottom** (in this exact order, top to bottom):
1. Collapse/Expand toggle button (chevron flips direction + icon-only when collapsed)
2. Profile row — avatar + name + role on the left, a small logout icon button pinned to
   the far right of the **same row** (not a separate row/button). When the sidebar is
   collapsed, the entire profile row (name, role, and logout icon) is hidden — only the
   avatar circle remains, centered, matching the icon-only rail treatment of the other nav
   items above it. This avoids a separate full-width logout button rendering awkwardly in
   the 64px collapsed rail.

Every nav button (including Collapse) carries a `title` attribute equal to its label, so
hovering an icon in collapsed mode shows a native tooltip.

### 3.4 Severity Badge Component

Pill-shaped badge, always uppercase, small text:
```
critical → bg rgba(255,77,106,0.12)  text #FF4D6A  border rgba(255,77,106,0.3)
high     → bg rgba(255,140,66,0.12)  text #FF8C42  border rgba(255,140,66,0.3)
medium   → bg rgba(255,209,102,0.12) text #c9a52e  border rgba(255,209,102,0.3)
low      → bg rgba(6,214,160,0.12)   text #06D6A0  border rgba(6,214,160,0.3)
info     → bg rgba(78,205,196,0.12)  text #4ECDC4  border rgba(78,205,196,0.3)
```

---

## 4. Files to Create

Create every file listed below. No exceptions, no shortcuts.

### 4.1 `tailwind.config.ts`

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-base":        "var(--bg-base)",
        "bg-elevated":    "var(--bg-elevated)",
        "bg-hover":       "var(--bg-hover)",
        "border-subtle":  "var(--border-subtle)",
        "border-strong":  "var(--border-strong)",
        "text-primary":   "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted":     "var(--text-muted)",
        accent:           "var(--accent)",
        "accent-hover":   "var(--accent-hover)",
        "accent-bg":      "var(--accent-bg)",
        critical:         "#FF4D6A",
        high:             "#FF8C42",
        medium:           "#FFD166",
        low:              "#06D6A0",
        info:             "#4ECDC4",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
```

---

### 4.2 `src/app/globals.css` (replace existing)

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-base: #F0F2F8;
  --bg-elevated: #FFFFFF;
  --bg-hover: #E8EBF5;
  --border-subtle: #D0D5E8;
  --border-strong: #A0AACB;
  --text-primary: #0F1117;
  --text-secondary: #4A5275;
  --text-muted: #8B92A9;
  --accent: #0096B7;
  --accent-hover: #007A96;
  --accent-bg: rgba(0, 150, 183, 0.10);
  --severity-critical: #FF4D6A;
  --severity-high: #FF8C42;
  --severity-medium: #FFD166;
  --severity-low: #06D6A0;
  --severity-info: #4ECDC4;
}

.dark {
  --bg-base: #0F1117;
  --bg-elevated: #1A1D27;
  --bg-hover: #21253A;
  --border-subtle: #2D3249;
  --border-strong: #3D4466;
  --text-primary: #E8ECF4;
  --text-secondary: #8B92A9;
  --text-muted: #5A6080;
  --accent: #00B4D8;
  --accent-hover: #0096B7;
  --accent-bg: rgba(0, 180, 216, 0.12);
}

* { box-sizing: border-box; }

body {
  background-color: var(--bg-base);
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
}

.font-mono { font-family: 'JetBrains Mono', monospace; }

/* Severity badges */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border: 1px solid;
  white-space: nowrap;
}
.badge-critical { background: rgba(255,77,106,0.12);  color: #FF4D6A; border-color: rgba(255,77,106,0.3); }
.badge-high     { background: rgba(255,140,66,0.12);  color: #FF8C42; border-color: rgba(255,140,66,0.3); }
.badge-medium   { background: rgba(255,209,102,0.12); color: #c9a52e; border-color: rgba(255,209,102,0.3); }
.badge-low      { background: rgba(6,214,160,0.12);   color: #06D6A0; border-color: rgba(6,214,160,0.3); }
.badge-info     { background: rgba(78,205,196,0.12);  color: #4ECDC4; border-color: rgba(78,205,196,0.3); }

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

/* Status dot pulse */
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.status-dot-active { animation: pulse-dot 2s ease-in-out infinite; }

/* Timeline connector line */
.timeline-line {
  position: absolute;
  left: 5px;
  top: 20px;
  bottom: 0;
  width: 2px;
  background: var(--border-subtle);
}
```

---

### 4.3 `src/app/layout.tsx` (replace existing)

```tsx
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "DFA — Digital Forensics Assistant",
  description: "Agentic AI Digital Forensics Assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

### 4.4 `src/lib/i18n.ts`

```ts
export const translations = {
  en: {
    nav: {
      dashboard: "Dashboard", upload: "Upload", analysis: "Analysis",
      timeline: "Timeline", history: "History", settings: "Settings",
    },
    dashboard: {
      title: "Dashboard", totalUploads: "Total Uploads",
      logEntries: "Log Entries", telemetryEntries: "Telemetry Entries",
      criticalAlerts: "Critical Alerts", recentUploads: "Recent Uploads",
      viewAll: "View All", quickActions: "Quick Actions",
      uploadLog: "Upload Log File", analyzeLatest: "Analyze Latest",
      lastUpdated: "Last updated", noData: "No uploads yet",
    },
    upload: {
      title: "Upload Log File",
      dropzone: "Drop your log file here, or click to browse",
      supported: "Supported: .log, .txt, .json, .ndjson",
      browse: "Browse File", paste: "Or paste raw log content",
      detected: "File type detected", submit: "Upload & Ingest",
      recent: "Recent Uploads", analyze: "Analyze", view: "View",
      success: "entries ingested successfully",
      error: "Upload failed. Please try again.",
      noRecent: "No uploads yet. Upload a log file above.",
    },
    analysis: {
      title: "Analysis", severity: "Severity", narrative: "Narrative Report",
      iocSummary: "IoC Summary", attackTimeline: "Attack Timeline",
      reanalyze: "Re-analyze", export: "Export", incidents: "incidents",
      loading: "Analyzing log file...",
      estimatedTime: "This may take 30–90 seconds on CPU inference",
      recommendation: "Recommendation", noResult: "No analysis yet.",
      runAnalysis: "Run Analysis",
      steps: {
        parsing: "Parsing log entries",
        extracting: "Extracting IoC indicators",
        querying: "Querying knowledge base",
        generating: "Generating AI analysis...",
      },
    },
    timeline: {
      title: "Attack Timeline", filter: "Filter",
      allEvents: "All Events", allIPs: "All IPs",
      noEvents: "No events to display.",
      expand: "Show detail", collapse: "Hide detail",
    },
    history: {
      title: "Upload History", search: "Search uploads...", filter: "Filter",
      filename: "Filename", type: "Type", entries: "Entries",
      date: "Date", actions: "Actions", view: "View", analyze: "Analyze",
      showing: "Showing", of: "of", uploads: "uploads",
      noHistory: "No uploads yet.",
    },
    settings: {
      title: "Settings", appearance: "Appearance", theme: "Theme",
      language: "Language", systemStatus: "System Status",
      connected: "Connected", online: "Online", disconnected: "Disconnected",
      modelConfig: "Model Configuration", about: "About", version: "Version",
      light: "Light", dark: "Dark",
    },
    login: {
      title: "Secure Login", subtitle: "Forensic Triage — Powered by Local AI",
      username: "Username", password: "Password", submit: "Sign In",
      error: "Invalid credentials. Please try again.",
      usernameRequired: "Username is required",
      passwordRequired: "Password is required",
    },
  },
  id: {
    nav: {
      dashboard: "Dasbor", upload: "Unggah", analysis: "Analisis",
      timeline: "Timeline", history: "Riwayat", settings: "Pengaturan",
    },
    dashboard: {
      title: "Dasbor", totalUploads: "Total Unggahan",
      logEntries: "Entri Log", telemetryEntries: "Entri Telemetri",
      criticalAlerts: "Peringatan Kritis", recentUploads: "Unggahan Terbaru",
      viewAll: "Lihat Semua", quickActions: "Tindakan Cepat",
      uploadLog: "Unggah File Log", analyzeLatest: "Analisis Terbaru",
      lastUpdated: "Terakhir diperbarui", noData: "Belum ada unggahan",
    },
    upload: {
      title: "Unggah File Log",
      dropzone: "Letakkan file log di sini, atau klik untuk memilih",
      supported: "Didukung: .log, .txt, .json, .ndjson",
      browse: "Pilih File", paste: "Atau tempel konten log mentah",
      detected: "Tipe file terdeteksi", submit: "Unggah & Ingesti",
      recent: "Unggahan Terbaru", analyze: "Analisis", view: "Lihat",
      success: "entri berhasil diingesti",
      error: "Unggahan gagal. Silakan coba lagi.",
      noRecent: "Belum ada unggahan. Unggah file log di atas.",
    },
    analysis: {
      title: "Analisis", severity: "Tingkat Keparahan",
      narrative: "Laporan Naratif", iocSummary: "Ringkasan IoC",
      attackTimeline: "Timeline Serangan", reanalyze: "Analisis Ulang",
      export: "Ekspor", incidents: "insiden",
      loading: "Menganalisis file log...",
      estimatedTime: "Proses ini mungkin memakan waktu 30–90 detik",
      recommendation: "Rekomendasi", noResult: "Belum ada analisis.",
      runAnalysis: "Jalankan Analisis",
      steps: {
        parsing: "Mem-parsing entri log",
        extracting: "Mengekstrak indikator IoC",
        querying: "Mengkueri basis pengetahuan",
        generating: "Menghasilkan analisis AI...",
      },
    },
    timeline: {
      title: "Timeline Serangan", filter: "Filter",
      allEvents: "Semua Kejadian", allIPs: "Semua IP",
      noEvents: "Tidak ada kejadian untuk ditampilkan.",
      expand: "Tampilkan detail", collapse: "Sembunyikan detail",
    },
    history: {
      title: "Riwayat Unggahan", search: "Cari unggahan...", filter: "Filter",
      filename: "Nama File", type: "Tipe", entries: "Entri",
      date: "Tanggal", actions: "Tindakan", view: "Lihat", analyze: "Analisis",
      showing: "Menampilkan", of: "dari", uploads: "unggahan",
      noHistory: "Belum ada unggahan.",
    },
    settings: {
      title: "Pengaturan", appearance: "Tampilan", theme: "Tema",
      language: "Bahasa", systemStatus: "Status Sistem",
      connected: "Terhubung", online: "Online", disconnected: "Terputus",
      modelConfig: "Konfigurasi Model", about: "Tentang", version: "Versi",
      light: "Terang", dark: "Gelap",
    },
    login: {
      title: "Login Aman", subtitle: "Triage Forensik — Ditenagai AI Lokal",
      username: "Nama Pengguna", password: "Kata Sandi", submit: "Masuk",
      error: "Kredensial tidak valid. Silakan coba lagi.",
      usernameRequired: "Nama pengguna wajib diisi",
      passwordRequired: "Kata sandi wajib diisi",
    },
  },
} as const;

export type Lang = keyof typeof translations;

// Simple hook — store language in localStorage
export function getLang(): Lang {
  if (typeof window === "undefined") return "en";
  return (localStorage.getItem("dfa-lang") as Lang) || "en";
}

export function setLang(lang: Lang) {
  if (typeof window !== "undefined") localStorage.setItem("dfa-lang", lang);
}

export function t(lang: Lang) {
  return translations[lang];
}
```

---

### 4.5 `src/lib/api.ts`

```ts
const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getSummary:  () => req<Summary>("/logs/summary"),
  getUploads:  () => req<Upload[]>("/logs/uploads"),
  getEntries:  (id: number) => req<LogEntry[]>(`/logs/entries?upload_id=${id}`),
  getTelemetry:(id: number) => req<TelemetryEntry[]>(`/logs/telemetry?upload_id=${id}`),
  getHealth:   () => req<Health>("/health"),
  uploadFile:  (file: File) => {
    const fd = new FormData(); fd.append("file", file);
    return req<UploadResult>("/upload/", { method: "POST", body: fd });
  },
  analyze: (uploadId: number) =>
    req<AnalysisResult>("/analyze/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upload_id: uploadId }),
    }),
};

// Types
export interface Summary {
  total_uploads: number;
  total_log_entries: number;
  total_telemetry_entries: number;
  recent_uploads: Upload[];
}
export interface Upload {
  upload_id: number;
  filename: string;
  uploaded_at: string;
  total_entries: number;
}
export interface LogEntry {
  id: number; upload_id: number; timestamp: string;
  host: string; source: string; event_type: string;
  source_ip: string; user: string; port: string;
  auth_method: string; status: string; raw_message: string;
}
export interface TelemetryEntry {
  id: number; upload_id: number; timestamp: string;
  event_type: string; source: string; details: string;
}
export interface UploadResult {
  filename: string; upload_id: number;
  file_type: string; total_entries_parsed: number;
}
export interface AnalysisResult {
  upload_id: number; total_incidents: number;
  attack_timeline: LogEntry[]; ioc_summary: string[];
  narrative_report: string; severity_overall: string;
}
export interface Health {
  status: string; ollama_connected: boolean; chromadb_connected: boolean;
}
```

---

### 4.6 `src/lib/utils.ts`

```ts
export function severityBadgeClass(s: string) {
  switch (s?.toUpperCase()) {
    case "CRITICAL": return "badge badge-critical";
    case "HIGH":     return "badge badge-high";
    case "MEDIUM":   return "badge badge-medium";
    case "LOW":      return "badge badge-low";
    default:         return "badge badge-info";
  }
}

export function eventDotColor(eventType: string): string {
  switch (eventType) {
    case "successful_login":     return "#06D6A0";
    case "invalid_user_attempt":
    case "failed_login":         return "#FF8C42";
    case "privilege_escalation": return "#FF4D6A";
    case "session_opened":       return "#4ECDC4";
    default:                     return "#8B92A9";
  }
}

export function fileTypeBadge(filename: string) {
  if (!filename) return { label: "unknown", cls: "badge badge-info" };
  if (filename.endsWith(".json") || filename.includes("telemetry"))
    return { label: "telemetry", cls: "badge badge-info" };
  return { label: "auth.log", cls: "badge badge-low" };
}

export function fmtDate(s: string) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return s; }
}

export function fmtTime(s: string) {
  if (!s) return "—";
  try { return new Date(s).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
  catch { return s.slice(11, 19) || s; }
}
```

---

### 4.7 `src/components/layout/Sidebar.tsx`

```tsx
"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard, Upload, Brain, GitCommitHorizontal,
  History, Settings, Sun, Moon, Globe, ChevronLeft, ChevronRight
} from "lucide-react";
import { getLang, setLang, t, Lang } from "@/lib/i18n";

const navItems = (tr: ReturnType<typeof t>) => [
  { href: "/dashboard", icon: LayoutDashboard, label: tr.nav.dashboard },
  { href: "/upload",    icon: Upload,           label: tr.nav.upload },
  { href: "/analysis",  icon: Brain,            label: tr.nav.analysis },
  { href: "/timeline",  icon: GitCommitHorizontal, label: tr.nav.timeline },
  { href: "/history",   icon: History,          label: tr.nav.history },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { theme, setTheme } = useTheme();
  const [lang, setLangState] = useState<Lang>("en");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => { setLangState(getLang()); }, []);

  const toggleLang = () => {
    const next = lang === "en" ? "id" : "en";
    setLang(next); setLangState(next);
    window.dispatchEvent(new Event("lang-change"));
  };

  const tr = t(lang);
  const items = navItems(tr);

  return (
    <aside
      style={{ width: collapsed ? 64 : 240 }}
      className="flex flex-col h-screen bg-bg-elevated border-r border-border-subtle transition-all duration-200 flex-shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-border-subtle gap-3">
        <div className="w-7 h-7 rounded bg-accent flex items-center justify-center flex-shrink-0">
          <Brain size={16} color="#fff" />
        </div>
        {!collapsed && (
          <span className="font-bold text-text-primary text-sm tracking-wide">DFA</span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "?");
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors relative
                ${active
                  ? "bg-accent-bg text-accent font-medium"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                }`}
            >
              {active && (
                <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-accent rounded-r" />
              )}
              <Icon size={16} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="border-t border-border-subtle py-3 space-y-1">
        {/* Settings */}
        <button
          onClick={() => router.push("/settings")}
          title={collapsed ? tr.nav.settings : undefined}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
            ${pathname === "/settings"
              ? "bg-accent-bg text-accent"
              : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            }`}
        >
          <Settings size={16} className="flex-shrink-0" />
          {!collapsed && <span>{tr.nav.settings}</span>}
        </button>

        {/* Language toggle */}
        <button
          onClick={toggleLang}
          title="Toggle language / Ganti bahasa"
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
        >
          <Globe size={16} className="flex-shrink-0" />
          {!collapsed && (
            <span className="font-mono text-xs">
              {lang === "en" ? "EN → ID" : "ID → EN"}
            </span>
          )}
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Toggle theme"
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
        >
          {theme === "dark"
            ? <Sun size={16} className="flex-shrink-0" />
            : <Moon size={16} className="flex-shrink-0" />
          }
          {!collapsed && (
            <span>{theme === "dark" ? tr.settings.light : tr.settings.dark}</span>
          )}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-muted hover:bg-bg-hover hover:text-text-secondary transition-colors"
        >
          {collapsed
            ? <ChevronRight size={16} className="flex-shrink-0" />
            : <ChevronLeft size={16} className="flex-shrink-0" />
          }
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
```

---

### 4.8 `src/components/layout/AppShell.tsx`

```tsx
"use client";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
```

---

### 4.9 `src/components/layout/PageHeader.tsx`

```tsx
interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-elevated">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
        {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
```

---

### 4.10 `src/components/ui/SeverityBadge.tsx`

```tsx
import { severityBadgeClass } from "@/lib/utils";

export default function SeverityBadge({ severity }: { severity: string }) {
  return <span className={severityBadgeClass(severity)}>{severity}</span>;
}
```

---

### 4.11 `src/components/ui/StatCard.tsx`

```tsx
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
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} style={{ color: iconColor }} />
        <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold text-text-primary">{value}</div>
      {trend && (
        <div className="text-xs mt-1" style={{ color: trendColor || "var(--text-muted)" }}>{trend}</div>
      )}
    </div>
  );
}
```

---

### 4.12 `src/components/ui/StatusDot.tsx`

```tsx
interface Props { active: boolean; label?: string; }

export default function StatusDot({ active, label }: Props) {
  return (
    <span className="flex items-center gap-2">
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? "status-dot-active" : ""}`}
        style={{ backgroundColor: active ? "var(--severity-low)" : "var(--severity-critical)" }}
      />
      {label && <span className="text-sm" style={{ color: active ? "var(--severity-low)" : "var(--severity-critical)" }}>{label}</span>}
    </span>
  );
}
```

---

### 4.13 `src/components/ui/AnalysisLoader.tsx`

```tsx
"use client";
import { useState, useEffect } from "react";
import { Brain } from "lucide-react";

const STEPS = [
  { key: "parsing",    delay: 0 },
  { key: "extracting", delay: 2000 },
  { key: "querying",   delay: 5000 },
  { key: "generating", delay: 8000 },
];

interface Props {
  steps: { parsing: string; extracting: string; querying: string; generating: string };
  estimatedTime: string;
  onCancel?: () => void;
}

export default function AnalysisLoader({ steps, estimatedTime, onCancel }: Props) {
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    const timers = STEPS.slice(0, 3).map(s =>
      setTimeout(() => setDone(prev => [...prev, s.key]), s.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-12 h-12 rounded-full bg-accent-bg flex items-center justify-center mb-6 animate-pulse">
        <Brain size={24} style={{ color: "var(--accent)" }} />
      </div>
      <div className="space-y-3 w-full max-w-xs mb-6">
        {STEPS.map(s => {
          const isDone = done.includes(s.key);
          const isActive = s.key === "generating" || (s.key !== "generating" && !isDone);
          return (
            <div key={s.key} className="flex items-center gap-3 text-sm">
              <span className="w-5 text-center flex-shrink-0">
                {isDone ? "✅" : s.key === "generating" ? "⏳" : "○"}
              </span>
              <span className={isDone ? "text-text-secondary line-through" : "text-text-primary"}>
                {steps[s.key as keyof typeof steps]}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-text-muted mb-4">{estimatedTime}</p>
      {onCancel && (
        <button
          onClick={onCancel}
          className="text-xs text-text-muted hover:text-text-secondary underline"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
```

---

### 4.14 Page Files

Create all page files. Each page must:
- Use `"use client"` at the top
- Use `AppShell` as the wrapper
- Use `PageHeader` for the page title
- Call the API via `api.*` functions
- Show loading state while fetching
- Show empty state with the correct i18n string when no data
- Read language from `getLang()` and listen to `"lang-change"` window event to re-render

---

#### `src/app/page.tsx` (redirect to dashboard)

```tsx
import { redirect } from "next/navigation";
export default function Home() { redirect("/dashboard"); }
```

---

#### `src/app/login/page.tsx`

Full-page centered layout. No sidebar. Dark/light aware.

Fields: Username (text input), Password (password input with show/hide toggle).

On submit: for now, accept any non-empty username/password and redirect to `/dashboard`. Store `dfa-authed=true` in localStorage. No real auth backend yet.

Show field-level validation errors if submitted empty. Show general error toast if credentials are wrong (simulate with: reject if username is "wrong").

Bottom of page: language toggle (EN/ID) + theme toggle (sun/moon icon).

---

#### `src/app/dashboard/page.tsx`

Fetches `api.getSummary()` on mount.

Layout — 4 stat cards in a row:
- Total Uploads → `summary.total_uploads` — icon: `Upload`
- Log Entries → `summary.total_log_entries` — icon: `FileText`
- Telemetry Entries → `summary.total_telemetry_entries` — icon: `Activity`
- Critical Alerts → `0` (hardcoded for now, no analysis history) — icon: `AlertCircle`, iconColor: `#FF4D6A`

Below stat cards — 2 columns:
- Left (60%): Recent Uploads table — columns: `#`, `Filename`, `Entries`, `Date`, `[Analyze]` button
- Right (40%): Quick Actions card — two buttons: `[+ Upload Log File]` (routes to `/upload`), `[⚡ Analyze Latest]` (routes to `/analysis?upload_id={latest_id}`)

All labels from i18n. Refresh button in page header calls `api.getSummary()` again.

---

#### `src/app/upload/page.tsx`

Two sections stacked:

**Section 1 — Upload zone:**
- Drop zone (dashed border, centered icon + text). On file drop or browse: show filename + detected file type badge (auto-detect: `.json` → "telemetry", otherwise → "auth.log"). Submit button calls `api.uploadFile(file)`. On success: show green toast with entry count. On error: show red toast.
- Textarea below drop zone for paste (placeholder = i18n paste text). If user pastes text and hits submit, create a Blob and upload it as `pasted_log.txt`.

**Section 2 — Recent uploads table:**
Columns: `#`, `Filename`, `Type badge`, `Entries`, `Date`, `[View]` `[Analyze]` buttons.
- `[View]` → `/analysis?upload_id=N` (shows result if exists, else shows "Run Analysis" button)
- `[Analyze]` → `/analysis?upload_id=N&run=true` (auto-triggers analysis)

Fetches `api.getUploads()` on mount and after each successful upload.

---

#### `src/app/analysis/page.tsx`

Reads `?upload_id` and `?run` from URL search params.

**If no `upload_id`:** show "Select an upload from History or Upload page" with link to `/upload`.

**If `upload_id` exists but `?run` is not set:** fetch result from URL state (pass via router state) or show "Run Analysis" button. If result already in state, show result directly.

**If `?run=true`:** auto-call `api.analyze(uploadId)` on mount. While loading: show `<AnalysisLoader />` component. On complete: show full result.

**Result layout:**

1. **Severity header card** — colored left border matching severity. Shows: `[SeverityBadge]  Severity: HIGH  ·  5 incidents  ·  sample_auth.log  ·  Jul 1 2026`

2. **Narrative Report card** — white card, body text. Full `narrative_report` string. If it contains "Recommendation:", split and show recommendation in a separate highlighted block with amber left border.

3. **IoC Summary card** — list of IPs. Each IP as a monospace chip with copy-to-clipboard button.

4. **Attack Timeline table** — columns: `Time`, `Event Type`, `Source IP`, `User`, `Auth Method`, `Status`. Rows color-coded: `successful_login` = subtle green row, `invalid_user_attempt` / `failed_login` = subtle amber row, `privilege_escalation` = subtle red row. `raw_message` shown in collapsed expand row (click row to expand).

Page header actions: `[Re-analyze]` button (re-calls analyze), `[Export JSON]` button (downloads result as JSON file).

---

#### `src/app/timeline/page.tsx`

Reads `?upload_id` from URL. If none, show selector (list of recent uploads from `api.getUploads()`).

Fetches `api.getEntries(uploadId)` on mount.

Renders a vertical timeline:
- Left: thin vertical line (2px, `var(--border-subtle)`)
- Each event: colored dot (size 12px, color from `eventDotColor(event_type)`), time in monospace, event_type badge, IP + user
- Group events by minute — show minute divider (e.g., `── 15:05 ──`) between groups
- Click event → expand inline detail card showing all fields

Filter bar at top: `[All Events ▼]` dropdown by event_type, `[All IPs ▼]` dropdown by source_ip.

---

#### `src/app/history/page.tsx`

Fetches `api.getUploads()` on mount.

Full-width table:
Columns: `#` (upload_id), `Filename`, `Type` (badge), `Entries`, `Uploaded At`, `Actions`.
Actions per row: `[View]` → `/analysis?upload_id=N`, `[Analyze]` → `/analysis?upload_id=N&run=true`.

Search bar above table — client-side filter by filename.
Shows "Showing N of M uploads" below table.
Empty state: centered icon + i18n `noHistory` text.

---

#### `src/app/settings/page.tsx`

Sections:

**Appearance:**
- Theme: 2 buttons `[Light]` `[Dark]` (active = accent background). Uses `next-themes` `setTheme`.
- Language: 2 buttons `[English]` `[Bahasa Indonesia]` (active = accent background). Uses `setLang()`.

**System Status:**
Fetches `api.getHealth()` on mount.
Rows:
- Ollama LLM — `StatusDot` active/inactive — label: model name "llama3:8b"
- ChromaDB RAG — hardcoded active (no endpoint) — label: "nomic-embed-text"
- PostgreSQL — hardcoded active — label: "forensics_db"
- API Backend — active if health fetch succeeded — label: "http://localhost:8000"

**Model Configuration:**
Static read-only rows: LLM Model, Embedding Model, API Base URL.

**About:**
Version: `1.0.0 — Sprint 3`
Client: `PT Teknologi Nasional Indonesia Siber (LTI)`
Project: `Agentic AI Digital Forensics Assistant`

---

## 5. Routing & Auth Guard

Add a middleware file `src/middleware.ts`:

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isAuthed = request.cookies.get("dfa-authed")?.value === "true";
  const isLoginPage = request.nextUrl.pathname === "/login";

  if (!isAuthed && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isAuthed && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

On login success, set cookie: `document.cookie = "dfa-authed=true; path=/"`.
On logout (add logout button to sidebar bottom, icon: `LogOut`): clear cookie and redirect to `/login`.

---

## 6. Environment File

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 7. Quality Rules — Non-Negotiable

1. **No placeholder content.** Every page must fetch real data from the API. No hardcoded lorem ipsum, no fake arrays.
2. **Loading states required.** Every `useEffect` that fetches data must show a loading skeleton or spinner while fetching.
3. **Empty states required.** Every list/table must handle the empty case with an icon + i18n message.
4. **Error states required.** Every API call must catch errors and show a visible error message.
5. **No inline styles except color values** that must reference a CSS variable or a computed value (e.g., `style={{ color: eventDotColor(e.event_type) }}`). All other styling via Tailwind utility classes.
6. **Language-reactive.** All text must come from `t(lang)`. Listen to `"lang-change"` window event to re-render on language switch (use `useState` + `useEffect` with `window.addEventListener`).
7. **Dark mode must work.** Test every component in both modes. Never hardcode `#fff` or `#000` — always use CSS variables.
8. **Font mono for technical data.** Timestamps, IP addresses, SHA-256 hashes, raw_message, port numbers — always `font-mono`.
9. **`"use client"` on every page component** that uses state, effects, or browser APIs.
10. **No `any` types** in TypeScript unless absolutely unavoidable. Use the types defined in `api.ts`.

---

## 8. Final Checklist Before Done

- [ ] `npm run build` passes with zero errors
- [ ] All 7 pages render in dark mode without layout breaks
- [ ] All 7 pages render in light mode without layout breaks
- [ ] Language switch EN→ID updates all visible text without page reload
- [ ] `/dashboard` shows real data from `GET /logs/summary`
- [ ] `/upload` successfully uploads a file and shows the entry count
- [ ] `/analysis?upload_id=1&run=true` shows the full analysis result after loading
- [ ] `/timeline?upload_id=1` shows the vertical timeline with colored dots
- [ ] `/history` shows the full upload list with working action buttons
- [ ] `/settings` shows live system status from `GET /health`
- [ ] Sidebar active state highlights correctly on every page
- [ ] Sidebar collapses to icon-only mode correctly
