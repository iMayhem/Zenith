"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResourceModule } from "../_lib/types";

interface PdfViewerProps {
  module: ResourceModule;
  onClose: () => void;
}

type ViewerState = "loading" | "loaded" | "error" | "timeout";

export function PdfViewer({ module, onClose }: PdfViewerProps) {
  const [viewerState, setViewerState] = useState<ViewerState>("loading");
  const [retryKey, setRetryKey] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reset to loading state on each retry (retryKey change)
    setViewerState("loading");

    timeoutRef.current = setTimeout(() => {
      setViewerState("timeout");
    }, 10_000);

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [retryKey]);

  function handleLoad() {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
    setViewerState("loaded");
  }

  function handleError() {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
    setViewerState("error");
  }

  function handleRetry() {
    setRetryKey((k) => k + 1);
  }

  const showIframe = viewerState !== "error" && viewerState !== "timeout";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white/70 hover:text-white hover:bg-white/10"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-sm font-medium text-white truncate">
          {module.displayName}
        </h1>
      </div>

      {/* Content area */}
      <div className="relative flex flex-col flex-1 overflow-hidden">
        {/* iframe — hidden when in error/timeout state */}
        {showIframe && (
          <iframe
            key={retryKey}
            src={module.pdfUrl}
            title={module.displayName}
            className="w-full flex-1 border-0"
            onLoad={handleLoad}
            onError={handleError}
          />
        )}

        {/* Loading spinner overlay */}
        {viewerState === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <Loader2 className="w-8 h-8 animate-spin text-white/60" />
          </div>
        )}

        {/* Error / timeout state */}
        {(viewerState === "error" || viewerState === "timeout") && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-white/70 text-sm">
              {viewerState === "timeout"
                ? "The PDF took too long to load. Please try again."
                : "Failed to load the PDF. Please try again."}
            </p>
            <div className="flex gap-3">
              <Button
                variant="default"
                onClick={handleRetry}
                className="bg-white/10 text-white hover:bg-white/20"
              >
                Retry
              </Button>
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
