import { SelectionInterface } from "./_components/SelectionInterface";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PracticeSelectionPage() {
  return (
    <div className="h-screen w-full overflow-hidden bg-muted/20 flex flex-col">
      <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col items-center flex-1 justify-center gap-4 w-full">
        
        <div className="text-center space-y-2 flex flex-col items-center">
          <div className="inline-flex items-center justify-center p-2.5 bg-primary/10 rounded-full">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Practice Arena</h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Target specific topics and master your exams right away. Your progress is isolated and saved automatically.
          </p>
        </div>

        <SelectionInterface />

        <Link href="/practice/history" passHref>
          <Button variant="link" className="text-muted-foreground hover:text-primary text-sm">
            View Practice History & Analytics
          </Button>
        </Link>
      </div>
    </div>
  );
}
