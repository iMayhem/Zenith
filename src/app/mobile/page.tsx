"use client";

import { usePresence, WelcomePanel, StatusPanel, PresencePanel } from '@/features/study';
import { useBackground } from '@/context/BackgroundContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import ExamCountdown from '@/components/ExamCountdown';
import { useMemo } from 'react';
import MobileBottomNav from './components/MobileBottomNav';

export default function MobileHomePage() {
    const { communityUsers, username } = usePresence();
    const { isLoading: isBackgroundLoading } = useBackground();

    const reNeetTargetDate = useMemo(() => new Date("2026-06-21T14:00:00"), []);
    const jeeTargetDate = useMemo(() => new Date("2027-01-24T09:00:00"), []);
    const neetTargetDate = useMemo(() => new Date("2027-05-02T14:00:00"), []);

    if (isBackgroundLoading || !username) {
        return <Skeleton className="h-full w-full bg-black/40" />;
    }

    return (
        <>
            <div className="flex flex-col min-h-full p-4 gap-6 pt-8 pb-8">
                <header className="mb-2">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Liorea</h1>
                    <p className="text-sm text-white/50">Mobile Experience</p>
                </header>

                <div className="w-full max-w-sm mx-auto flex flex-col gap-6">
                    <ErrorBoundary name="Mobile Welcome Panel">
                        <WelcomePanel />
                    </ErrorBoundary>

                    <ErrorBoundary name="Mobile Status Panel">
                        <StatusPanel />
                    </ErrorBoundary>

                    {/* Community Stack */}
                    <div className="h-[400px] w-full mt-4">
                        <ErrorBoundary name="Mobile Presence Panel">
                            <PresencePanel users={communityUsers} />
                        </ErrorBoundary>
                    </div>

                    {/* Timers Stack */}
                    <div className="flex flex-col gap-3 mt-4">
                        <h3 className="text-sm font-semibold text-white/80 px-1">Upcoming Exams</h3>
                        <ExamCountdown title="Re-NEET UG 2026" targetDate={reNeetTargetDate} displayDate="21 Jun 26" />
                        <ExamCountdown title="JEE Mains 2027 (Session 1)" targetDate={jeeTargetDate} displayDate="24 Jan 27" />
                        <ExamCountdown title="NEET UG 2027" targetDate={neetTargetDate} displayDate="2 May 27" />
                    </div>
                </div>
            </div>

            <MobileBottomNav />
        </>
    );
}
