"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import BottomControlBar from '@/features/study/components/BottomControlBar';
import { usePresence } from '@/features/study';
import { ChatProvider, ChatPanel } from '@/features/chat';
import { StudyGrid } from '@/features/study';
import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';
import BigPomodoroTimer from '@/features/timer/components/BigPomodoroTimer';

// ... (keep loading variants same if possible or simplify imports above)

// Loading Animation Variants
const loadingContainerVariants = {
  start: { transition: { staggerChildren: 0.2 } },
  end: { transition: { staggerChildren: 0.2 } },
};

const loadingCircleVariants = {
  start: { y: "0%" },
  end: { y: "100%" },
};

const loadingCircleTransition = {
  duration: 0.5,
  repeat: Infinity,
  repeatType: "reverse" as const,
  ease: "easeInOut",
};

export default function StudyTogetherPage() {
  const { studyUsers, joinSession, leaveSession } = usePresence();
  const [isJoining, setIsJoining] = useState(true);

  useEffect(() => {
    // Start the session
    joinSession("public");

    // Show a "joining" state for a short period for better UX
    const timer = setTimeout(() => {
      setIsJoining(false);
    }, 1500);

    // On component unmount, stop counting time and clear timer
    return () => {
      clearTimeout(timer);
      leaveSession("public");
    };
  }, [joinSession, leaveSession]);

  if (isJoining) {
    return (
      <div className="bg-transparent text-foreground h-screen w-screen flex flex-col items-center justify-center">
        <Header />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-6 text-white"
        >
          <motion.div
            className="flex justify-around items-center w-16 h-8"
            variants={loadingContainerVariants}
            initial="start"
            animate="end"
          >
            <motion.span className="block w-3 h-3 bg-accent rounded-full" variants={loadingCircleVariants} transition={loadingCircleTransition} />
            <motion.span className="block w-3 h-3 bg-accent rounded-full" variants={loadingCircleVariants} transition={loadingCircleTransition} />
            <motion.span className="block w-3 h-3 bg-accent rounded-full" variants={loadingCircleVariants} transition={loadingCircleTransition} />
          </motion.div>
          <h1 className="text-2xl font-semibold">Joining study room...</h1>
        </motion.div>
      </div>
    );
  }

  return (
    <ChatProvider roomId="public">
      <div className="bg-transparent min-h-screen text-foreground overflow-hidden font-sans antialiased flex flex-col">
        <Header />

        {/* Content Container - Match Journal's Layout */}
        <main className="container mx-auto pt-20 px-4 h-screen flex flex-col md:flex-row gap-4 md:gap-6 pb-20">

          {/* TOP/LEFT: Study Grid Panel (Solid) - No Header */}
          <div className="w-full h-[25vh] shrink-0 md:h-auto md:w-[45%] flex flex-col bg-card/80 backdrop-blur-xl rounded-2xl border border-border shadow-xl overflow-hidden p-4 md:p-6">
            <StudyGrid users={studyUsers} />
          </div>

          {/* BOTTOM/RIGHT: Chat Panel (Solid) */}
          <div className="flex-1 min-h-0 flex flex-col bg-transparent rounded-2xl border-none shadow-none overflow-hidden relative">
            <ChatPanel />
          </div>

        </main>

        {/* BOTTOM CONTROL BAR */}
        <BottomControlBar />

      </div>
    </ChatProvider>
  );
}