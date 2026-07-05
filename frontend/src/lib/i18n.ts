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
            lastUpdated: "Last updated",
        },
        upload: {
            title: "Upload Log File",
            dropzone: "Drop your log file here, or click to browse",
            supported: "Supported: .log, .txt, .json, .ndjson",
            browse: "Browse File", paste: "Or paste raw log content",
            detected: "File type detected", submit: "Upload & Ingest",
            recent: "Recent Uploads", analyze: "Analyze", view: "View",
            success: "entries ingested successfully",
        },
        analysis: {
            title: "Analysis", severity: "Severity", narrative: "Narrative Report",
            iocSummary: "IoC Summary", timeline: "Attack Timeline",
            reanalyze: "Re-analyze", export: "Export", incidents: "incidents",
            loading: "Analyzing log file...", estimatedTime: "This may take 30–90 seconds",
            recommendation: "Recommendation",
            steps: {
                parsing: "Parsing log entries", extracting: "Extracting IoC indicators",
                querying: "Querying knowledge base", generating: "Generating AI analysis...",
            },
        },
        history: {
            title: "Upload History", search: "Search", filter: "Filter",
            filename: "Filename", type: "Type", entries: "Entries",
            date: "Date", actions: "Actions", view: "View", analyze: "Analyze",
            showing: "Showing", of: "of", uploads: "uploads",
        },
        settings: {
            title: "Settings", appearance: "Appearance", theme: "Theme",
            language: "Language", systemStatus: "System Status",
            connected: "Connected", online: "Online", disconnected: "Disconnected",
            modelConfig: "Model Configuration", about: "About", version: "Version",
            light: "Light", dark: "Dark", system: "System",
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
            lastUpdated: "Terakhir diperbarui",
        },
        upload: {
            title: "Unggah File Log",
            dropzone: "Letakkan file log di sini, atau klik untuk memilih",
            supported: "Didukung: .log, .txt, .json, .ndjson",
            browse: "Pilih File", paste: "Atau tempel konten log mentah",
            detected: "Tipe file terdeteksi", submit: "Unggah & Ingesti",
            recent: "Unggahan Terbaru", analyze: "Analisis", view: "Lihat",
            success: "entri berhasil diingesti",
        },
        analysis: {
            title: "Analisis", severity: "Tingkat Keparahan",
            narrative: "Laporan Naratif", iocSummary: "Ringkasan IoC",
            timeline: "Timeline Serangan", reanalyze: "Analisis Ulang",
            export: "Ekspor", incidents: "insiden",
            loading: "Menganalisis file log...",
            estimatedTime: "Proses ini mungkin memakan waktu 30–90 detik",
            recommendation: "Rekomendasi",
            steps: {
                parsing: "Mem-parsing entri log", extracting: "Mengekstrak indikator IoC",
                querying: "Mengkueri basis pengetahuan", generating: "Menghasilkan analisis AI...",
            },
        },
        history: {
            title: "Riwayat Unggahan", search: "Cari", filter: "Filter",
            filename: "Nama File", type: "Tipe", entries: "Entri",
            date: "Tanggal", actions: "Tindakan", view: "Lihat", analyze: "Analisis",
            showing: "Menampilkan", of: "dari", uploads: "unggahan",
        },
        settings: {
            title: "Pengaturan", appearance: "Tampilan", theme: "Tema",
            language: "Bahasa", systemStatus: "Status Sistem",
            connected: "Terhubung", online: "Online", disconnected: "Terputus",
            modelConfig: "Konfigurasi Model", about: "Tentang", version: "Versi",
            light: "Terang", dark: "Gelap", system: "Sistem",
        },
    },
} as const;

export type Lang = keyof typeof translations;
export type Translations = typeof translations.en;