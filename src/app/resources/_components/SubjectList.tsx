"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FetchState } from "../_lib/types";

interface SubjectListProps {
  subjects: string[];
  selected: string | null;
  fetchState: FetchState;
  onSelect: (subject: string) => void;
  onRetry: () => void;
}

export function SubjectList({
  subjects,
  selected,
  fetchState,
  onSelect,
  onRetry,
}: SubjectListProps) {
  if (fetchState === "loading") {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    );
  }

  if (fetchState === "error") {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <p className="text-sm text-white/60">Failed to load subjects.</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="text-white/70 hover:bg-white/5 hover:text-white"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (fetchState === "success" && subjects.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-white/50">
        No modules available
      </p>
    );
  }

  if (fetchState === "success") {
    return (
      <div className="flex flex-col gap-2">
        {subjects.map((subject) => (
          <Button
            key={subject}
            variant="ghost"
            onClick={() => onSelect(subject)}
            className={
              selected === subject
                ? "justify-start bg-white/10 text-white hover:bg-white/15 hover:text-white"
                : "justify-start text-white/70 hover:bg-white/5 hover:text-white"
            }
          >
            {subject}
          </Button>
        ))}
      </div>
    );
  }

  // fetchState === 'idle' — render nothing
  return null;
}
