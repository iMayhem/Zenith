import { db } from "@/lib/firebase";
import { ref, set, get, push } from "firebase/database";

export interface QuestionAttempt {
  questionNumber: number;
  selectedAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpentMs: number;
  skipped?: boolean;
  markedForReview?: boolean;
}

export interface PracticeSession {
  id?: string;
  userId: string;
  subject: string;
  classVal: string;
  chapter: string;
  topic: string;
  startTime: number;
  endTime: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  skippedQuestions: number;
  accuracy: number;
  isQuiz: boolean;
  attempts: QuestionAttempt[];
}

/**
 * Saves a completed practice session to Firebase RTDB in an isolated path.
 */
export const savePracticeSession = async (userId: string, session: PracticeSession) => {
  const sessionRef = push(ref(db, `practice_sessions/${userId}`));
  const sessionId = sessionRef.key as string;
  
  await set(sessionRef, {
    ...session,
    id: sessionId
  });
  
  return sessionId;
};

/**
 * Fetches the user's practice history from RTDB isolating from other platform stats.
 */
export const fetchPracticeHistory = async (userId: string): Promise<PracticeSession[]> => {
  const historyRef = ref(db, `practice_sessions/${userId}`);
  const snapshot = await get(historyRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.values(data) as PracticeSession[];
  }
  return [];
};
