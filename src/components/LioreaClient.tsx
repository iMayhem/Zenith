"use client";

import { PresencePanel, WelcomePanel, StatusPanel, usePresence } from '@/features/study';
import Header from '@/components/layout/Header';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Terminal } from 'lucide-react';
import { useMemo, useEffect } from 'react';
import { useBackground } from '@/context/BackgroundContext';
import { useRouter } from 'next/navigation';
import { Skeleton } from './ui/skeleton';
import { ErrorBoundary } from './ui/ErrorBoundary';
import VersionInfo from './VersionInfo';
import ExamCountdown from './ExamCountdown';

export default function LioreaClient() {
  const { error, isLoading: isBackgroundLoading } = useBackground();
  const { communityUsers, username } = usePresence();
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  const jeeTargetDate = useMemo(() => new Date(`${currentYear}-01-21T09:00:00`), [currentYear]);
  const jeeSession2TargetDate = useMemo(() => new Date(`${currentYear}-04-02T09:00:00`), [currentYear]);
  const neetTargetDate = useMemo(() => new Date(`${currentYear}-05-03T14:00:00`), [currentYear]);

  useEffect(() => {
    // If the background is done loading and we find there's no user, redirect.
    if (!isBackgroundLoading && !username) {
      router.push('/');
    }
  }, [isBackgroundLoading, username, router]);

  // Show a loading skeleton while we're waiting for user/background data
  if (isBackgroundLoading || !username) {
    return <Skeleton className="h-screen w-screen bg-transparent" />;
  }

  return (
    <>
      {error && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md">
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Background Error</AlertTitle>
            <AlertDescription>
              Could not load backgrounds from the worker: {error}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <Header />

      {/* Main Layout - Flexbox for precise geometric centering */}
      <main className="relative z-1 min-h-[calc(100dvh-72px)] md:h-screen w-full flex flex-col md:flex-row overflow-y-auto md:overflow-hidden pt-[72px] pb-10 md:pb-0 gap-8 md:gap-0">

        {/* Center Column - Welcome & Status (Moves to top on mobile) */}
        <div className="flex-1 flex flex-col items-center justify-center relative md:pb-32 order-1 md:order-2 mt-8 md:mt-0">
          <div className="flex flex-col items-center justify-center gap-8 w-full max-w-2xl px-4">
            <ErrorBoundary name="Welcome Panel">
              <WelcomePanel />
            </ErrorBoundary>

            <div className="flex flex-col gap-4 w-full max-w-sm">
              <ErrorBoundary name="Status Panel">
                <StatusPanel />
              </ErrorBoundary>
            </div>
          </div>
        </div>

        {/* Left Column - Community Panel (Moves to middle on mobile) */}
        <div className="flex w-full px-4 md:px-0 md:w-72 flex-col md:pl-4 md:pb-4 md:pt-6 h-[400px] md:h-full shrink-0 order-2 md:order-1">
          <div className="w-full h-full">
            {/* Inner container takes full height of this column */}
            <ErrorBoundary name="Presence Panel">
              <PresencePanel users={communityUsers} />
            </ErrorBoundary>
          </div>
        </div>



        {/* Right Column - Exam Timers (Moves to bottom on mobile) */}
        <div className="flex w-full px-4 md:px-0 md:w-72 flex-col md:pr-4 md:pb-4 md:pt-6 h-auto md:h-full shrink-0 gap-3 order-3">
          <ExamCountdown title="JEE Mains (Session 1)" targetDate={jeeTargetDate} displayDate="21-30 Jan 26" />
          <ExamCountdown title="JEE Mains (Session 2)" targetDate={jeeSession2TargetDate} displayDate="2-9 Apr 26" />
          <ExamCountdown title="NEET UG" targetDate={neetTargetDate} displayDate="3 May 26" />
        </div>

      </main>

      <VersionInfo />
    </>
  );
}