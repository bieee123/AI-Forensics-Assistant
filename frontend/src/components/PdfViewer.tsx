"use client";
import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SkeletonCard, SkeletonTable } from "@/components/ui/Skeleton";

const pdfWorkerVersion = pdfjs.version || "6.1.200";
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfWorkerVersion}/pdf.worker.min.mjs`;
}

export default function PdfViewer({ blobUrl }: { blobUrl: string }) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  const pageWidth = Math.min(740, window.innerWidth - 420);

  return (
    <div className="w-full h-full flex flex-col">
      {numPages && numPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-2 text-xs"
             style={{ color: "var(--text-secondary)", flexShrink: 0 }}>
          <button onClick={() => setPageNumber(p => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="p-1 rounded cursor-pointer disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronLeft size={16} />
          </button>
          <span className="font-medium">
            Page {pageNumber} of {numPages}
          </span>
          <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
            className="p-1 rounded cursor-pointer disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto flex justify-center"
           style={{ background: "var(--bg-base)" }}>
        <div style={{ minHeight: "100%", padding: "16px 0" }}>
          <Document
            file={blobUrl}
            onLoadSuccess={({ numPages: n }) => {
              setNumPages(n);
              setPageNumber(1);
            }}
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
            <Page
              pageNumber={pageNumber}
              width={pageWidth}
              renderTextLayer
              renderAnnotationLayer
            />
          </Document>
        </div>
      </div>
    </div>
  );
}
