"use client";

import { Loader2, AlertCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResourceModule, FetchState } from "../_lib/types";

interface ModuleListProps {
  modules: ResourceModule[];
  fetchState: FetchState;
  onSelect: (module: ResourceModule) => void;
  onRetry: () => void;
}

function getSubtitle(module: ResourceModule): string | null {
  const { chapterName, topicName } = module;
  if (chapterName && topicName) return `${chapterName} — ${topicName}`;
  if (chapterName) return chapterName;
  if (topicName) return topicName;
  return null;
}

export function ModuleList({ modules, fetchState, onSelect, onRetry }: ModuleListProps) {
  if (fetchState === "loading") {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (fetchState === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load modules.</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  if (fetchState === "success" && modules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <BookOpen className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No modules available.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {modules.map((module) => {
        const subtitle = getSubtitle(module);
        return (
          <button
            key={module.id}
            onClick={() => onSelect(module)}
            className="w-full text-left rounded-lg border border-white/5 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10 hover:border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <p className="text-sm font-medium text-foreground leading-snug">
              {module.displayName}
            </p>
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                {subtitle}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
