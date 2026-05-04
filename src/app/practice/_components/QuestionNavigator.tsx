"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QuestionAttempt } from "../_lib/practiceDb";
import { QuestionData } from "../_lib/storageUtils";
import { Check, X, CircleDash, Bookmark } from "lucide-react";

interface QuestionNavigatorProps {
  questions: QuestionData[];
  currentIndex: number;
  attempts: Record<number, QuestionAttempt>;
  onSelectQuestion: (index: number) => void;
  isQuiz?: boolean;
}

export function QuestionNavigator({
  questions,
  currentIndex,
  attempts,
  onSelectQuestion,
  isQuiz
}: QuestionNavigatorProps) {
  
  return (
    <div className="flex flex-col w-full h-full bg-card rounded-xl border p-4 shadow-sm">
      <h3 className="font-semibold text-lg mb-4 select-none">Question Navigator</h3>
      
      <div className="grid grid-cols-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 gap-2 flex-1 content-start overflow-y-auto pr-2 pb-4">
        {questions.map((q, idx) => {
          const attempt = attempts[q.number];
          const isCurrent = idx === currentIndex;
          
          let stateClass = "bg-muted text-muted-foreground border-transparent hover:bg-muted/80";
          let Icon = CircleDash;
          
          if (attempt) {
            // In Quiz mode or if tracked without validation, we might just show "answered"
            if (isQuiz) {
              if ((attempt as any).markedForReview) {
                 stateClass = "bg-yellow-500/20 text-yellow-600 border-yellow-500/30 dark:text-yellow-400";
                 Icon = Bookmark;
              } else if (attempt.skipped) {
                 stateClass = "bg-gray-500/20 text-gray-600 border-gray-500/30 dark:text-gray-400";
              } else {
                 stateClass = "bg-primary/20 text-primary border-primary/30";
                 Icon = Check; // Answered
              }
            } else {
              // Practice mode reveals validation colors
              if (attempt.isCorrect) {
                stateClass = "bg-emerald-500/20 text-emerald-600 border-emerald-500/30 dark:text-emerald-400";
                Icon = Check;
              } else if (attempt.skipped) {
                 stateClass = "bg-gray-500/20 text-gray-600 border-gray-500/30 dark:text-gray-400";
              } else {
                stateClass = "bg-rose-500/20 text-rose-600 border-rose-500/30 dark:text-rose-400";
                Icon = X;
              }
            }
          }
          
          if (isCurrent) {
            stateClass = cn(stateClass, "ring-2 ring-primary ring-offset-2 ring-offset-background");
          }

          return (
            <Button
              key={q.number}
              variant="outline"
              className={cn(
                "h-12 w-full p-0 flex flex-col items-center justify-center relative font-mono transition-all",
                stateClass
              )}
              onClick={() => onSelectQuestion(idx)}
            >
              <span>{idx + 1}</span>
            </Button>
          );
        })}
      </div>
      
      {/* Legend below the grid */}
      {!isQuiz ? (
        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground pt-4 border-t mt-auto px-2 justify-between">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500/40" /> Correct</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-500/40" /> Wrong</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-muted border" /> Unseen</div>
        </div>
      ) : (
        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground pt-4 border-t mt-auto px-2 justify-between">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-primary/40" /> Answered</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-500/40" /> Review</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-muted border" /> Unseen</div>
        </div>
      )}
    </div>
  );
}
