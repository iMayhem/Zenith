"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, DownloadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResourceNode } from "../_lib/types";

interface PdfViewerProps {
  module: ResourceNode;
  onClose: () => void;
}

type ViewerState = "loading" | "loaded" | "error" | "timeout";

export function PdfViewer({ module, onClose }: PdfViewerProps) {
  const [viewerState, setViewerState] = useState<ViewerState>("loading");
  const [retryKey, setRetryKey] = useState(0);
  const [pdfSource, setPdfSource] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;
    
    setViewerState("loading");
    setPdfSource(null);

    const pdfUrl = module.pdfUrl!;

    async function loadPdf() {
      try {
        console.log('📄 PdfViewer: Checking cache for PDF:', module.name);
        const cache = await caches.open('zenith-pdf-cache');
        let response = await cache.match(pdfUrl);
        
        if (response) {
          console.log('✅ PdfViewer: Found in cache, instant load!');
          if (isMounted) setIsCached(true);
        } else {
          console.log('☁️ PdfViewer: Not in cache, downloading and caching...');
          response = await fetch(pdfUrl);
          if (response.ok) {
            // Clone the response so we can both put it in cache and read it
            await cache.put(pdfUrl, response.clone());
            console.log('✅ PdfViewer: Cached successfully for future use.');
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        }
        
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        
        if (isMounted) {
          setPdfSource(objectUrl);
          setViewerState("loaded");
        }
      } catch (e) {
        console.error('❌ PdfViewer: Failed to load PDF via Cache API', e);
        // Fallback to direct URL if fetch/cache fails (e.g. CORS issues)
        if (isMounted) {
          console.log('⚠️ PdfViewer: Falling back to direct URL loading');
          setPdfSource(pdfUrl);
          setViewerState("loaded");
        }
      }
    }

    loadPdf();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [retryKey, module.pdfUrl, module.name]);

  function handleError(e: React.SyntheticEvent<HTMLIFrameElement, Event>) {
    console.error('❌ PdfViewer: iframe failed to load PDF', e);
    setViewerState("error");
  }

  function handleRetry() {
    setRetryKey((k) => k + 1);
  }

  function handleOpenInNewTab() {
    if (module.pdfUrl) window.open(module.pdfUrl, '_blank');
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
        <h1 className="text-sm font-medium text-white truncate flex items-center gap-2">
          {module.name}
          {isCached && <span className="text-[10px] uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full flex items-center gap-1"><DownloadCloud className="w-3 h-3"/> Cached</span>}
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
        {/* iframe */}
        {pdfSource && viewerState !== "error" && (
          <iframe
            ref={iframeRef}
            key={retryKey}
            src={pdfSource}
            title={module.name}
            className="w-full flex-1 border-0"
            style={{ height: 'calc(100vh - 60px)' }}
            onError={handleError}
            allow="fullscreen"
          />
        )}

        {/* Loading spinner overlay */}
        {viewerState === "loading" && (
          <div className="absolute inset-0 flex flex-col gap-4 items-center justify-center bg-background/80">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-zinc-400 text-sm animate-pulse">Loading PDF... This might take a moment.</p>
          </div>
        )}

        {/* Error state */}
        {viewerState === "error" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-white/70 text-sm">
              Failed to load the PDF. Please try again.
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
