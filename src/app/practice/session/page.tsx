"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense, useCallback } from "react";
import { fetchQuestions, fetchAnswerKey, QuestionData } from "../_lib/storageUtils";
import { savePracticeSession, QuestionAttempt, PracticeSession } from "../_lib/practiceDb";
import { QuestionViewer } from "../_components/QuestionViewer";
import { QuestionNavigator } from "../_components/QuestionNavigator";
import { PracticeControls } from "../_components/PracticeControls";
import { QuizTimer } from "../_components/QuizTimer";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext"; // Liorea uses standard auth context - replacing this to firebase direct if needed, but assuming global exists.

// Fallback logic just in case global Auth doesn't exist
import { auth } from "@/lib/firebase";

function SessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const subject = searchParams.get("subject") || "";
  const classVal = searchParams.get("classVal") || "";
  const chapter = searchParams.get("chapter") || "";
  const topic = searchParams.get("topic") || "";
  
  const isQuiz = searchParams.get("isQuiz") === "true";
  const timeLimit = parseInt(searchParams.get("timeLimit") || "30", 10);
  
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attempts, setAttempts] = useState<Record<number, QuestionAttempt>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStartTime, setSessionStartTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    async function initSession() {
      if (!subject || !classVal || !chapter || !topic) return;
      
      try {
        const [fetchedQ, fetchedA] = await Promise.all([
          fetchQuestions(subject, classVal, chapter, topic),
          fetchAnswerKey(subject, classVal, chapter)
        ]);
        
        setQuestions(fetchedQ);
        if (fetchedA) setAnswers(fetchedA);
      } catch (e) {
        console.error(e);
      } finally {
         setIsLoading(false);
         setSessionStartTime(Date.now());
         setQuestionStartTime(Date.now());
      }
    }
    
    initSession();
  }, [subject, classVal, chapter, topic]);

  // Preloading next 3 images
  useEffect(() => {
    if (questions.length === 0) return;
    
    for (let i = currentIndex + 1; i <= Math.min(currentIndex + 3, questions.length - 1); i++) {
        const img = new Image();
        img.src = questions[i].url;
    }
  }, [currentIndex, questions]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "ArrowRight") handleNext();
        else if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, questions.length]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setQuestionStartTime(Date.now());
    }
  }, [currentIndex, questions.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setQuestionStartTime(Date.now());
    }
  }, [currentIndex]);
  
  const handleAttemptSubmit = (attemptData: { selected: string, isCorrect: boolean, skipped?: boolean }) => {
    const qData = questions[currentIndex];
    const timeSpentMs = Date.now() - questionStartTime;
    
    setAttempts(prev => ({
      ...prev,
      [qData.number]: {
        questionNumber: qData.number,
        selectedAnswer: attemptData.selected,
        correctAnswer: answers[String(qData.number)] || "",
        isCorrect: attemptData.isCorrect,
        timeSpentMs,
        skipped: !!attemptData.skipped
      } as QuestionAttempt & { skipped?: boolean }
    }));
  };

  const finishSession = async () => {
    setIsFinished(true);
    
    // Save to RTDB
    const user = auth.currentUser;
    if (user) {
        const attemptsList = Object.values(attempts);
        const correct = attemptsList.filter(a => a.isCorrect).length;
        const skipped = attemptsList.filter(a => (a as any).skipped).length;
        const incorrect = attemptsList.length - correct - skipped;
        
        const session: PracticeSession = {
           userId: user.uid,
           subject, classVal, chapter, topic,
           startTime: sessionStartTime,
           endTime: Date.now(),
           totalQuestions: questions.length,
           correctAnswers: correct,
           incorrectAnswers: incorrect,
           skippedQuestions: skipped,
           accuracy: attemptsList.length > 0 ? (correct / (attemptsList.length - skipped)) * 100 : 0,
           isQuiz,
           attempts: attemptsList
        };
        
        try {
           await savePracticeSession(user.uid, session);
        } catch (e) {
           console.error("Failed to save session", e);
        }
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-4 font-medium text-lg">Preparing Practice Session...</span>
      </div>
    );
  }

  if (isFinished) {
    const attemptsList = Object.values(attempts);
    const correct = attemptsList.filter(a => a.isCorrect).length;
    const skipped = attemptsList.filter(a => (a as any).skipped).length;
    const incorrect = attemptsList.length - correct - skipped;
    const accuracy = attemptsList.length > 0 ? (correct / (attemptsList.length - skipped)) * 100 : 0;
    
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-6 bg-muted/20">
         <div className="max-w-md w-full bg-card border rounded-2xl shadow-sm p-8 text-center flex flex-col gap-6">
            <h2 className="text-3xl font-bold tracking-tight">Session Complete!</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted p-4 rounded-xl flex flex-col items-center">
                 <span className="text-sm text-muted-foreground font-medium">Questions Attempted</span>
                 <span className="text-2xl font-bold mt-1">{attemptsList.length} / {questions.length}</span>
              </div>
              <div className="bg-muted p-4 rounded-xl flex flex-col items-center">
                 <span className="text-sm text-muted-foreground font-medium">Accuracy</span>
                 <span className="text-2xl font-bold text-primary mt-1">{accuracy.toFixed(1)}%</span>
              </div>
              <div className="bg-muted p-4 rounded-xl flex flex-col items-center">
                 <span className="text-sm text-muted-foreground font-medium">Correct</span>
                 <span className="text-2xl font-bold text-emerald-500 mt-1">{correct}</span>
              </div>
              <div className="bg-muted p-4 rounded-xl flex flex-col items-center">
                 <span className="text-sm text-muted-foreground font-medium">Incorrect</span>
                 <span className="text-2xl font-bold text-rose-500 mt-1">{incorrect}</span>
              </div>
            </div>

            <Button size="lg" className="mt-4" onClick={() => router.push('/practice')}>
               Return to Practice Arena
            </Button>
         </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  // Convert current question number to string for Answer Key dict lookup (e.g., "5" or "10")
  const currentAnswer = currentQ ? (answers[String(currentQ.number)] || null) : null;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      
      {/* Top Banner */}
      <div className="h-14 border-b flex items-center justify-between px-4 lg:px-6 bg-card shrink-0">
         <div className="flex items-center gap-3">
             <Button variant="ghost" size="icon" onClick={() => router.push('/practice')} aria-label="Back">
                 <ArrowLeft className="h-5 w-5" />
             </Button>
             <div className="hidden sm:block">
                 <h1 className="font-semibold">{subject} • {classVal} {isQuiz ? "- QUIZ" : ""}</h1>
                 <p className="text-xs text-muted-foreground truncate max-w-[200px] md:max-w-md">{topic}</p>
             </div>
         </div>
         
         <div className="flex items-center gap-3">
             {isQuiz && <QuizTimer timeLimitMinutes={timeLimit} onTimeUp={finishSession} />}
             
             {isQuiz && currentQ && (
                <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={() => {
                       setAttempts(prev => ({
                           ...prev,
                           [currentQ.number]: {
                               ...prev[currentQ.number],
                               questionNumber: currentQ.number,
                               correctAnswer: answers[String(currentQ.number)] || "",
                               isCorrect: false,
                               timeSpentMs: 0,
                               markedForReview: !prev[currentQ.number]?.markedForReview
                           }
                       }));
                   }}
                   className={cn(attempts[currentQ.number]?.markedForReview && "bg-yellow-500/20 text-yellow-600")}
                >
                   <Bookmark className="h-4 w-4 mr-2" /> 
                   <span className="hidden sm:inline">Review</span>
                </Button>
             )}
             
             <Button variant={isQuiz ? "default" : "outline"} size="sm" onClick={finishSession}>
                 {isQuiz ? "Submit Quiz" : "End Session Early"}
             </Button>
         </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row p-4 lg:p-6 gap-6">
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 pb-20 lg:pb-0">
             <QuestionViewer 
                question={currentQ || null}
                currentIndex={currentIndex}
                totalQuestions={questions.length}
                onNext={handleNext}
                onPrev={handlePrev}
             />
             
             {currentQ && (
                 <PracticeControls 
                    questionNumber={currentQ.number}
                    correctAnswer={currentAnswer}
                    attempt={attempts[currentQ.number]}
                    isQuizMode={isQuiz}
                    onAttemptSubmit={handleAttemptSubmit}
                    onNextQuestion={handleNext}
                    isLastQuestion={currentIndex === questions.length - 1}
                 />
             )}
          </div>

          {/* Sidebar Area */}
          <div className="w-full lg:w-[320px] xl:w-[380px] shrink-0 h-[400px] lg:h-full">
              <QuestionNavigator 
                 questions={questions}
                 currentIndex={currentIndex}
                 attempts={attempts}
                 onSelectQuestion={setCurrentIndex}
                 isQuiz={isQuiz}
              />
          </div>

      </div>
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={<div className="flex p-10"><Loader2 className="animate-spin h-8 w-8"/></div>}>
      <SessionContent />
    </Suspense>
  );
}
