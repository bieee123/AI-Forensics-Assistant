"use client";
import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { SkeletonCard, SkeletonTable } from "@/components/ui/Skeleton";

const pdfWorkerVersion = pdfjs.version || "6.1.200";
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfWorkerVersion}/pdf.worker.min.mjs`;
}

export default function PdfViewer({ blobUrl }: { blobUrl: string }) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pageWidth = Math.max(400, Math.min(760, containerWidth - 32));

  return (
    <div ref={containerRef} className="w-full h-full overflow-y-auto flex justify-center"
         style={{ background: "var(--bg-base)" }}>
      <div style={{ minHeight: "100%", padding: "16px 0" }}>
        <Document
          file={blobUrl}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={
            <div className="max-w-[780px] mx-auto space-y-4 p-8">
              <SkeletonCard lines={3} />
              <SkeletonTable rows={4} cols={4} />
              <SkeletonCard lines={4} />
            </div>
          }
          error={
            <div className="flex items-center justify-center h-full text-sm"
                 style={{ color: "var(--text-muted)" }}>
              Failed to load PDF preview.
            </div>
          }>
          {numPages && Array.from({ length: numPages }, (_, i) => (
            <Page key={i + 1} pageNumber={i + 1} width={pageWidth}
                  renderTextLayer renderAnnotationLayer />
          ))}
        </Document>
      </div>
    </div>
  );
}
