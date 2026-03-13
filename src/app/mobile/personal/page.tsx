"use client";

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatProvider, ChatPanel } from '@/features/chat';
import { StudyGrid, usePresence } from '@/features/study';
import MobileBottomNav from '../components/MobileBottomNav';
import { Skeleton } from '@/components/ui/skeleton';

function MobilePersonalContent() {
    const { studyUsers, joinSession, leaveSession, username } = usePresence();
    const searchParams = useSearchParams();
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

    useEffect(() => {
        if (activeRoomId) return;

        const urlCode = searchParams.get('code');
        if (urlCode && username) {
            setActiveRoomId(urlCode);
        } else if (username) {
            const storageKey = `zenith_personal_room_${username}`;
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                setActiveRoomId(stored);
            } else {
                const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
                localStorage.setItem(storageKey, newId);
                setActiveRoomId(newId);
            }
        }
    }, [username, activeRoomId, searchParams]);

    useEffect(() => {
        if (activeRoomId) {
            joinSession(activeRoomId);
            return () => {
                if (activeRoomId) leaveSession(activeRoomId);
            };
        }
    }, [joinSession, leaveSession, activeRoomId]);

    if (!activeRoomId) {
        return <Skeleton className="h-full w-full bg-black/40" />;
    }

    return (
        <ChatProvider roomId={activeRoomId}>
            <div className="flex flex-col h-full bg-transparent p-4 pb-0">
                {/* Top Avatar Grid (30% height on mobile) */}
                <div className="w-full h-[25vh] shrink-0 flex flex-col bg-card/80 backdrop-blur-xl rounded-2xl border border-border shadow-xl overflow-hidden p-3 mb-4">
                    <StudyGrid users={studyUsers} />
                </div>

                {/* Primary Chat Area */}
                <div className="flex-1 min-h-0 flex flex-col bg-transparent rounded-2xl overflow-hidden mb-2">
                    <ChatPanel hideHeader hideSettings />
                </div>
            </div>
            <MobileBottomNav />
        </ChatProvider>
    );
}

export default function MobilePersonalRoute() {
    return (
        <Suspense fallback={<Skeleton className="h-full w-full bg-black/40" />}>
            <MobilePersonalContent />
        </Suspense>
    );
}
