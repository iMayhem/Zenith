"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RefreshCw, Maximize2, Minimize2, Loader2 } from "lucide-react";
import { QuestionData } from "../_lib/storageUtils";
import { cn } from "@/lib/utils";

interface QuestionViewerProps {
  question: QuestionData | null;
  currentIndex: number;
  totalQuestions: number;
  onNext: () => void;
  onPrev: () => void;
  isLoadingFile?: boolean;
}

export function QuestionViewer({
  question,
  currentIndex,
  totalQuestions,
  onNext,
  onPrev,
  isLoadingFile
}: QuestionViewerProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // If no questions are loaded yet
  if (!question && !isLoadingFile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-xl bg-muted/20">
        <p className="text-muted-foreground">No questions found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header Panel */}
      <div className="flex items-center justify-between text-sm text-muted-foreground font-medium bg-card px-4 py-2 border rounded-full">
        <span>Question {currentIndex + 1} of {totalQuestions}</span>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 sm:hidden"
          onClick={() => setIsZoomed(!isZoomed)}
        >
          {isZoomed ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main Image View */}
      <div 
        className={cn(
          "relative w-full rounded-xl border bg-card overflow-hidden flex items-center justify-center min-h-[300px]",
          isZoomed ? "hover:cursor-zoom-out" : "hover:cursor-zoom-in"
        )}
        onClick={() => !imageError && setIsZoomed(!isZoomed)}
      >
        {isLoadingFile && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-foreground">Loading image...</p>
          </div>
        )}
        
        {imageError && !isLoadingFile ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-destructive">
            <p className="mb-4">Failed to load question image.</p>
            <Button 
              variant="outline" 
              onClick={(e) => {
                e.stopPropagation();
                setImageError(false);
                setRetryKey(k => k + 1);
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </div>
        ) : (
          question && (
            <img 
              key={`${question.url}-${retryKey}`}
              src={question.url}
              alt={`Question ${question.number}`}
              className={cn(
                "object-contain transition-all duration-300",
                isZoomed ? "w-full h-auto scale-125 object-top" : "max-w-full max-h-[60vh]"
              )}
              onLoad={() => setImageError(false)}
              onError={() => setImageError(true)}
            />
          )
        )}
      </div>

      {/* Navigation Layer */}
      <div className="flex items-center justify-between gap-4 mt-2">
        <Button 
          variant="outline" 
          onClick={onPrev} 
          disabled={currentIndex === 0}
          className="w-[120px]"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        <Button 
          variant="default" 
          onClick={onNext} 
          disabled={currentIndex === totalQuestions - 1}
          className="w-[120px]"
        >
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
