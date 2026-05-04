import { SelectionInterface } from "./_components/SelectionInterface";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PracticeSelectionPage() {
  return (
    <div className="h-full w-full overflow-y-auto bg-muted/20">
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-24 flex flex-col items-center">
        
        <div className="text-center mb-10 space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-2">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">Practice Arena</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Target specific topics and master your exams right away. Your progress is isolated and saved automatically.
          </p>
        </div>

        <SelectionInterface />

        <div className="mt-8 text-center">
          <Link href="/practice/history" passHref>
            <Button variant="link" className="text-muted-foreground hover:text-primary">
              View Practice History & Analytics
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
