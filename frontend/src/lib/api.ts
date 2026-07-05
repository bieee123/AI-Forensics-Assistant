const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = {
    async getSummary() {
        const res = await fetch(`${BASE_URL}/logs/summary`);
        if (!res.ok) throw new Error("Failed to fetch summary");
        return res.json();
    },

    async getUploads() {
        const res = await fetch(`${BASE_URL}/logs/uploads`);
        if (!res.ok) throw new Error("Failed to fetch uploads");
        return res.json();
    },

    async getEntries(uploadId: number) {
        const res = await fetch(`${BASE_URL}/logs/entries?upload_id=${uploadId}`);
        if (!res.ok) throw new Error("Failed to fetch entries");
        return res.json();
    },

    async uploadFile(file: File) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`${BASE_URL}/upload/`, { method: "POST", body: formData });
        if (!res.ok) throw new Error("Upload failed");
        return res.json();
    },

    async analyze(uploadId: number) {
        const res = await fetch(`${BASE_URL}/analyze/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ upload_id: uploadId }),
        });
        if (!res.ok) throw new Error("Analysis failed");
        return res.json();
    },

    async getHealth() {
        const res = await fetch(`${BASE_URL}/health`);
        if (!res.ok) throw new Error("Health check failed");
        return res.json();
    },
};