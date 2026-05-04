"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchPracticeHistory, PracticeSession } from "../_lib/practiceDb";
import { auth } from "@/lib/firebase";
import { Loader2, ArrowLeft, History, Trophy, AlertTriangle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ensuring auth completes first
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const data = await fetchPracticeHistory(user.uid);
          // Sort by start time descending
          setSessions(data.sort((a, b) => b.startTime - a.startTime));
        } catch (e) {
          console.error(e);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const stats = useMemo(() => {
    if (sessions.length === 0) return null;
    
    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalTimeMs = 0;
    const chaptersAcc: Record<string, { correct: number; total: number }> = {};
    
    sessions.forEach(s => {
      totalQuestions += s.totalQuestions;
      totalCorrect += s.correctAnswers;
      totalTimeMs += (s.endTime || s.startTime) - s.startTime;
      
      const chapKey = `${s.subject} - ${s.chapter}`;
      if (!chaptersAcc[chapKey]) chaptersAcc[chapKey] = { correct: 0, total: 0 };
      chaptersAcc[chapKey].correct += s.correctAnswers;
      chaptersAcc[chapKey].total += (s.totalQuestions - s.skippedQuestions);
    });

    const weakTopics = Object.entries(chaptersAcc)
       .map(([topic, counts]) => ({ topic, accuracy: counts.total > 0 ? (counts.correct / counts.total) * 100 : 0 }))
       .filter(t => t.total !== 0 && t.accuracy < 60)
       .sort((a, b) => a.accuracy - b.accuracy);

    return {
      overallAccuracy: (totalCorrect / totalQuestions) * 100 || 0,
      totalSessions: sessions.length,
      totalTimeMins: Math.round(totalTimeMs / 60000),
      weakTopics
    };
  }, [sessions]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-card">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-muted/20">
      
      <div className="bg-card border-b px-4 py-4 md:px-8 flex items-center gap-4 shrink-0 shadow-sm z-10 sticky top-0">
         <Button variant="ghost" size="icon" onClick={() => router.push('/practice')} aria-label="Back">
             <ArrowLeft className="h-5 w-5" />
         </Button>
         <h1 className="text-xl font-bold flex items-center gap-2">
           <History className="w-5 h-5 text-primary" /> Practice History
         </h1>
      </div>

      <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8 pb-24">
         
         {!stats ? (
           <div className="text-center py-20 bg-card rounded-2xl border">
               <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
               <p className="text-muted-foreground">You haven't completed any practice sessions yet.</p>
               <Button className="mt-4" onClick={() => router.push('/practice')}>Start Practicing</Button>
           </div>
         ) : (
           <>
             {/* Key Metrics */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center hover:shadow-md transition">
                    <Trophy className="w-8 h-8 text-yellow-500 mb-2" />
                    <span className="text-sm text-muted-foreground font-medium">Overall Accuracy</span>
                    <span className="text-3xl font-extrabold mt-1 text-primary">{stats.overallAccuracy.toFixed(1)}%</span>
                 </div>
                 
                 <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center hover:shadow-md transition">
                    <History className="w-8 h-8 text-blue-500 mb-2" />
                    <span className="text-sm text-muted-foreground font-medium">Sessions Completed</span>
                    <span className="text-3xl font-extrabold mt-1">{stats.totalSessions}</span>
                 </div>
                 
                 <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center hover:shadow-md transition">
                    <ClockIcon className="w-8 h-8 text-emerald-500 mb-2" />
                    <span className="text-sm text-muted-foreground font-medium">Total Time Spent</span>
                    <span className="text-3xl font-extrabold mt-1">{stats.totalTimeMins} min</span>
                 </div>
             </div>

             {/* Recommended Review */}
             {stats.weakTopics.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6">
                   <h2 className="text-lg font-bold text-destructive mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" /> Recommended for Review (Under 60%)
                   </h2>
                   <div className="flex flex-wrap gap-2">
                     {stats.weakTopics.map(wt => (
                        <div key={wt.topic} className="bg-background rounded-full px-4 py-1.5 text-sm font-medium border text-foreground/80 flex items-center gap-2">
                          <span className="truncate max-w-[200px]">{wt.topic}</span>
                          <span className="text-destructive">{wt.accuracy.toFixed(1)}%</span>
                        </div>
                     ))}
                   </div>
                </div>
             )}

             {/* Session List */}
             <div>
                <h2 className="text-lg font-bold mb-4 px-2">Past Sessions</h2>
                <div className="flex flex-col gap-3">
                  {sessions.map((s) => (
                    <div key={s.id || s.startTime} className="bg-card border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 shadow-sm hover:shadow-md transition group">
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                             <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                               {s.isQuiz ? "QUIZ" : "PRACTICE"}
                             </span>
                             <span className="text-xs text-muted-foreground font-medium">
                               {new Date(s.startTime).toLocaleDateString()} at {new Date(s.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </span>
                          </div>
                          <h3 className="font-bold text-base md:text-lg text-foreground/90">{s.subject} • {s.classVal}</h3>
                          <p className="text-sm text-muted-foreground truncate max-w-xs md:max-w-md">{s.chapter} - {s.topic}</p>
                       </div>
                       
                       <div className="flex items-center gap-4 md:gap-6 self-start md:self-auto bg-muted/50 md:bg-transparent p-2 md:p-0 rounded-lg w-full md:w-auto">
                          <div className="flex flex-col items-center">
                             <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Acc</span>
                             <span className="font-bold text-primary">{s.accuracy.toFixed(0)}%</span>
                          </div>
                          <div className="flex flex-col items-center">
                             <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Q's</span>
                             <span className="font-bold">{s.correctAnswers}/{s.totalQuestions}</span>
                          </div>
                          <Button 
                             size="sm" 
                             variant="outline"
                             className="ml-auto w-full md:w-auto md:opacity-0 md:group-hover:opacity-100 transition"
                             onClick={() => {
                               // Start Practice Again with same parameters
                               const params = new URLSearchParams({
                                  subject: s.subject, classVal: s.classVal, chapter: s.chapter, topic: s.topic,
                                  ...(s.isQuiz ? { isQuiz: "true" } : {})
                               });
                               router.push(`/practice/session?${params.toString()}`);
                             }}
                          >
                            Restart
                          </Button>
                       </div>
                    </div>
                  ))}
                </div>
             </div>
           </>
         )}

      </div>
    </div>
  );
}

function ClockIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
