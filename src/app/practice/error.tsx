"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function PracticeErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Practice Section Error:", error);
  }, [error]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md space-y-4 rounded-xl border border-destructive/20 bg-destructive/10 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-destructive">Something went wrong in Practice!</h2>
        <p className="text-sm text-muted-foreground">
          An isolated error occurred in this section. The rest of your platform is safe and unaffected.
        </p>
        <p className="rounded bg-background/50 p-2 text-xs font-mono text-destructive-foreground break-words truncate">
          {error.message}
        </p>
        <div className="flex gap-4 justify-center pt-2">
          <Button variant="default" onClick={() => reset()}>
            Try again
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Return Home
          </Button>
        </div>
      </div>
    </div>
  );
}
