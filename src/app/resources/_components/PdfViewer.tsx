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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Reset to loading state on each retry (retryKey change)
    setViewerState("loading");
    console.log('📄 PdfViewer: Loading PDF:', module.displayName);
    console.log('📄 PdfViewer: PDF URL:', module.pdfUrl);

    // Set a shorter timeout to auto-mark as loaded if iframe doesn't fire onLoad
    // PDFs in iframes often don't trigger onLoad reliably
    timeoutRef.current = setTimeout(() => {
      console.log('⏱️ PdfViewer: Auto-marking as loaded (iframe onLoad may not fire for PDFs)');
      setViewerState("loaded");
    }, 3_000); // 3 seconds - if iframe hasn't errored by then, assume it's loading

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [retryKey, module]);

  function handleLoad() {
    console.log('✅ PdfViewer: PDF loaded successfully');
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
    setViewerState("loaded");
  }

  function handleError(e: React.SyntheticEvent<HTMLIFrameElement, Event>) {
    console.error('❌ PdfViewer: Failed to load PDF', e);
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
    setViewerState("error");
  }

  function handleRetry() {
    setRetryKey((k) => k + 1);
  }

  const showIframe = viewerState !== "error" && viewerState !== "timeout";

  function handleOpenInNewTab() {
    window.open(module.pdfUrl, '_blank');
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ height: '100vh', width: '100vw' }}>
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0" style={{ height: '60px' }}>
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
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenInNewTab}
          className="ml-auto text-white/70 hover:text-white hover:bg-white/10"
        >
          Open in New Tab
        </Button>
      </div>

      {/* Content area */}
      <div className="relative flex flex-col flex-1 overflow-hidden">
        {/* iframe — hidden when in error/timeout state */}
        {showIframe && (
          <iframe
            ref={iframeRef}
            key={retryKey}
            src={module.pdfUrl}
            title={module.displayName}
            className="w-full flex-1 border-0"
            style={{ height: 'calc(100vh - 60px)' }}
            onLoad={handleLoad}
            onError={handleError}
            allow="fullscreen"
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
