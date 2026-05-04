"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizTimerProps {
  timeLimitMinutes: number;
  onTimeUp: () => void;
}

export function QuizTimer({ timeLimitMinutes, onTimeUp }: QuizTimerProps) {
  const [timeLeft, setTimeLeft] = useState(timeLimitMinutes * 60);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, onTimeUp]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  const isWarning = timeLeft < 300; // less than 5 mins
  const isDanger = timeLeft < 60; // less than 1 min

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-md font-mono font-bold text-lg transition-colors duration-300",
      isDanger ? "bg-destructive/20 text-destructive animate-pulse" : 
      isWarning ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-500" : 
      "bg-secondary text-secondary-foreground"
    )}>
      <Clock className="w-5 h-5" />
      {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
    </div>
  );
}
