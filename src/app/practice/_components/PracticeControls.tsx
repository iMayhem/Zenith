"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuestionAttempt } from "../_lib/practiceDb";

const OPTIONS = ["a", "b", "c", "d"];
const LABEL_MAP: Record<string, string> = { "a": "A", "b": "B", "c": "C", "d": "D" };

interface PracticeControlsProps {
  questionNumber: number; // e.g. 1
  correctAnswer: string | null;
  attempt: QuestionAttempt | undefined; // exists if submitted
  isQuizMode: boolean;
  onAttemptSubmit: (attempt: { selected: string, isCorrect: boolean, skipped?: boolean }) => void;
  onNextQuestion: () => void;
  isLastQuestion: boolean;
}

export function PracticeControls({
  questionNumber,
  correctAnswer,
  attempt,
  isQuizMode,
  onAttemptSubmit,
  onNextQuestion,
  isLastQuestion
}: PracticeControlsProps) {
  
  const [selected, setSelected] = useState<string | null>(null);

  // Sync internal UI selection to attempt if already answered. Useful for back/forward.
  useEffect(() => {
    setSelected(attempt?.selectedAnswer || null);
  }, [attempt, questionNumber]);

  const handleSubmit = () => {
    if (!selected) return;

    // Normalizing the parsed answer which can sometimes be "a" or "A" or "1" depending on the engine
    // In zenith_sync.py usually it returned whatever Gemini extracted.
    const normalizedCorrect = correctAnswer?.toLowerCase() || "";
    // Let's assume the correct answer matches one of "a", "b", "c", "d"
    // Validating against null/empty answer key
    const isCorrect = normalizedCorrect === selected;
    
    onAttemptSubmit({
      selected,
      isCorrect
    });
  };

  const handleSkip = () => {
    onAttemptSubmit({
      selected: "",
      isCorrect: false,
      skipped: true
    });
    onNextQuestion();
  };

  const isAnswered = !!attempt && !attempt.skipped;

  return (
    <div className="w-full space-y-4">
      {/* Options */}
      <div className="flex gap-4">
        {OPTIONS.map((opt) => {
          let stateClass = "bg-card hover:bg-muted";
          
          if (isAnswered && !isQuizMode) {
             // Validate and format if already answered in non-quiz mode
             if (opt === correctAnswer?.toLowerCase()) {
                stateClass = "bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400"; // Revealed Correct
             } else if (opt === selected) {
                stateClass = "bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-400"; // Revealed Incorrect
             } else {
                stateClass = "opacity-50 pointer-events-none"; // Mute non-relevant options
             }
          } else if (isAnswered && isQuizMode) {
             if (opt === selected) {
                stateClass = "bg-primary text-primary-foreground"; // Selected in quiz
             }
          } else {
            // Not answered yet
            if (opt === selected) {
              stateClass = "border-primary bg-primary/10 text-primary ring-1 ring-primary";
            }
          }

          return (
            <Button
              key={opt}
              variant="outline"
              disabled={isAnswered && !isQuizMode}
              className={cn(
                "flex-1 h-14 font-bold text-lg transition-all",
                stateClass
              )}
              onClick={() => setSelected(opt)}
            >
              {LABEL_MAP[opt]}
            </Button>
          );
        })}
      </div>

      {/* Action Buttons & Feedback Layer */}
      <div className="pt-2 border-t mt-4 flex justify-between items-center h-[60px]">
        
        {/* Feedback Area */}
        <div className="flex-1">
          {(!correctAnswer && !isQuizMode) ? (
            <div className="flex items-center text-sm text-yellow-600 font-medium">
              <AlertCircle className="w-4 h-4 mr-2" />
              Answer key unavailable.
            </div>
          ) : (
            isAnswered && !isQuizMode && attempt ? (
              attempt.isCorrect ? (
                <div className="flex items-center text-emerald-600 font-bold dark:text-emerald-400 text-sm md:text-base animate-in fade-in zoom-in duration-300">
                  <Check className="w-5 h-5 mr-1" />
                  Correct Answer!
                </div>
              ) : (
                <div className="flex items-center text-rose-600 font-bold dark:text-rose-400 text-sm md:text-base animate-in fade-in zoom-in duration-300">
                  <X className="w-5 h-5 mr-1" />
                  Incorrect. Correct is {LABEL_MAP[correctAnswer?.toLowerCase() || "a"]}
                </div>
              )
            ) : null
          )}
        </div>

        {/* Action Right */}
        <div className="flex items-center gap-3">
          {!isAnswered ? (
             <>
               <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground mr-2">
                 Skip
               </Button>
               <Button 
                onClick={handleSubmit} 
                className="w-32"
                disabled={!selected}
               >
                 Submit
               </Button>
             </>
          ) : (
            !isLastQuestion && (
              <Button onClick={onNextQuestion} className="w-32 animate-in slide-in-from-right-2">
                Next <span className="hidden sm:inline">&nbsp;Question</span>
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
