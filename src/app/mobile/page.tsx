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

    const currentYear = new Date().getFullYear();
    const jeeTargetDate = useMemo(() => new Date(`${currentYear}-01-21T09:00:00`), [currentYear]);
    const jeeSession2TargetDate = useMemo(() => new Date(`${currentYear}-04-02T09:00:00`), [currentYear]);
    const neetTargetDate = useMemo(() => new Date(`${currentYear}-05-03T14:00:00`), [currentYear]);

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
                        <ExamCountdown title="JEE Mains (Session 1)" targetDate={jeeTargetDate} displayDate="21-30 Jan 26" />
                        <ExamCountdown title="JEE Mains (Session 2)" targetDate={jeeSession2TargetDate} displayDate="2-9 Apr 26" />
                        <ExamCountdown title="NEET UG" targetDate={neetTargetDate} displayDate="3 May 26" />
                    </div>
                </div>
            </div>

            <MobileBottomNav />
        </>
    );
}
