"use client";

import { useEffect, useState } from 'react';
import { ChatProvider, ChatPanel } from '@/features/chat';
import { StudyGrid, usePresence } from '@/features/study';
import MobileBottomNav from '../components/MobileBottomNav';
import { Skeleton } from '@/components/ui/skeleton';

export default function MobileStudyRoute() {
    const { studyUsers, joinSession, leaveSession, username } = usePresence();
    const globalRoomId = "global_study";

    useEffect(() => {
        joinSession(globalRoomId);
        return () => {
            leaveSession(globalRoomId);
        };
    }, [joinSession, leaveSession]);

    if (!username) {
        return <Skeleton className="h-full w-full bg-black/40" />;
    }

    return (
        <ChatProvider roomId={globalRoomId}>
            <div className="flex flex-col h-full bg-transparent p-4 pb-0">
                {/* Global Study Grid */}
                <div className="w-full h-[25vh] shrink-0 flex flex-col bg-card/80 backdrop-blur-xl rounded-2xl border border-border shadow-xl overflow-hidden p-3 mb-4">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            Global Room
                            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full text-indigo-200 bg-indigo-500/20">
                                Public
                            </span>
                        </h2>
                    </div>
                    <StudyGrid users={studyUsers} />
                </div>

                {/* Main Chat Panel */}
                <div className="flex-1 min-h-0 flex flex-col bg-transparent rounded-2xl overflow-hidden mb-2">
                    <ChatPanel hideHeader hideSettings />
                </div>
            </div>
            <MobileBottomNav />
        </ChatProvider>
    );
}
