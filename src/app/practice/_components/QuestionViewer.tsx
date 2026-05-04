"use client";

import { useState, useEffect } from "react";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RefreshCw, Loader2 } from "lucide-react";
import { QuestionData } from "../_lib/storageUtils";
import { cn } from "@/lib/utils";

interface QuestionViewerProps {
  question: QuestionData | null;
  currentIndex: number;
  totalQuestions: number;
  onNext: () => void;
  onPrev: () => void;
}

export function QuestionViewer({
  question,
  currentIndex,
  totalQuestions,
  onNext,
  onPrev,
}: QuestionViewerProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Reset loading state when question changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [question?.url]);

  if (!question) {
    return (
      <div className="flex flex-col items-center justify-center h-full border rounded-xl bg-muted/20">
        <p className="text-muted-foreground">No questions found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full h-full">
      {/* Header strip */}
      <div className="flex items-center justify-between text-sm text-muted-foreground font-medium bg-card px-4 py-2 border rounded-full shrink-0">
        <span>Question {currentIndex + 1} of {totalQuestions}</span>
      </div>

      {/* Fixed-height image container */}
      <div className="relative w-full flex-1 rounded-xl border bg-card overflow-hidden flex items-center justify-center min-h-0">
        
        {/* Skeleton spinner while loading */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {imageError ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-destructive gap-4">
            <p>Failed to load question image.</p>
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setImageError(false);
                setImageLoaded(false);
                setRetryKey(k => k + 1);
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </div>
        ) : (
          <NextImage
            key={`${question.url}-${retryKey}`}
            src={question.url}
            alt={`Question ${question.number}`}
            fill
            sizes="(max-width: 1024px) 100vw, 70vw"
            quality={50}
            priority={currentIndex === 0}
            className={cn(
              "object-contain transition-opacity duration-200 select-none !relative",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => { setImageLoaded(true); setImageError(false); }}
            onError={() => { setImageError(true); setImageLoaded(false); }}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 shrink-0">
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
