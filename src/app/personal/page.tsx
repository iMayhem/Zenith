"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import BottomControlBar from '@/features/study/components/BottomControlBar';
import { usePresence } from '@/features/study';
import { ChatProvider, ChatPanel } from '@/features/chat';
import { StudyGrid } from '@/features/study';
import { motion } from 'framer-motion';
import { Copy, Check, Users, LogIn, Brain, UserPlus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/context/NotificationContext';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Reusing same loading animation
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

import { Suspense } from 'react';

function PersonalStudyContent() {
    const { studyUsers, joinSession, leaveSession, username, leaderboardUsers } = usePresence();
    const searchParams = useSearchParams();
    const { addNotification } = useNotifications();
    const { toast } = useToast();

    const [isJoining, setIsJoining] = useState(true);
    const [showCopied, setShowCopied] = useState(false);
    const [joinDialogOpen, setJoinDialogOpen] = useState(false);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [joinInputCode, setJoinInputCode] = useState("");
    const [inviteUsername, setInviteUsername] = useState("");
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

    // 1. Auto-Join from URL or LocalStorage
    useEffect(() => {
        // Prevent multi-trigger
        if (activeRoomId) return;

        const urlCode = searchParams.get('code');
        if (urlCode && username) {
            // Priority: URL Code
            setActiveRoomId(urlCode);
            // Ideally notify user they are joining via link?
        } else if (username) {
            // Fallback: Local Personal Room
            const storageKey = `zenith_personal_room_${username}`;
            const stored = localStorage.getItem(storageKey);

            if (stored) {
                setActiveRoomId(stored);
            } else {
                // Generate a random 6-character code
                const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
                localStorage.setItem(storageKey, newId);
                setActiveRoomId(newId);
            }
        }
    }, [username, activeRoomId, searchParams]);

    // Derived: Are we in our own room?
    const isOwner = username && activeRoomId === localStorage.getItem(`zenith_personal_room_${username}`);

    useEffect(() => {
        if (activeRoomId) {
            joinSession(activeRoomId);
            const timer = setTimeout(() => setIsJoining(false), 1500);
            return () => {
                clearTimeout(timer);
                if (activeRoomId) leaveSession(activeRoomId);
            };
        }
    }, [joinSession, leaveSession, activeRoomId]);

    const handleCopyInvite = () => {
        if (!activeRoomId) return;
        navigator.clipboard.writeText(activeRoomId);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
        toast({ title: "Code Copied", description: "Share this code with friends to let them join." });
    };

    const handleJoinRoom = () => {
        if (!joinInputCode.trim()) return;
        const code = joinInputCode.trim();
        setActiveRoomId(code);
        setJoinDialogOpen(false);
        setJoinInputCode("");
        setIsJoining(true); // Trigger loading animation again for UX
        toast({ title: "Joining Room", description: `Entering room: ${code}` });
    };

    const handleInviteFriend = async () => {
        if (!inviteUsername.trim() || !username || !activeRoomId) return;
        const target = inviteUsername.trim();
        if (target === username) {
            toast({ variant: "destructive", title: "Error", description: "You cannot invite yourself." });
            return;
        }

        try {
            await addNotification(
                `${username} invited you to their study room.`,
                target,
                `/personal?code=${activeRoomId}`,
                'personal'
            );
            toast({ title: "Invite Sent", description: `Invited ${target} to join.` });
            setInviteDialogOpen(false);
            setInviteUsername("");
        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: "Failed to send invite." });
        }
    };

    if (isJoining || !activeRoomId) {
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
                    <h1 className="text-2xl font-semibold">Preparing specific room...</h1>
                </motion.div>
            </div>
        );
    }

    return (
        <ChatProvider roomId={activeRoomId}>
            <div className="bg-transparent min-h-screen text-foreground overflow-hidden font-sans antialiased flex flex-col">
                <Header />

                {/* Content Container */}
                <main className="container mx-auto pt-20 px-4 h-screen flex gap-6 pb-20 relative">

                    {/* LEFT: Study Grid Panel */}
                    <div className="w-[45%] flex flex-col bg-card/80 backdrop-blur-xl rounded-2xl border border-border shadow-xl overflow-hidden p-6 relative">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                {isOwner ? "My Room" : "Friend's Room"}
                                <span className={cn("text-xs font-normal px-2 py-0.5 rounded-full", isOwner ? "text-muted-foreground bg-white/10" : "text-indigo-200 bg-indigo-500/20")}>
                                    {isOwner ? "Personal" : "Joined"}
                                </span>
                            </h2>
                            <div className="flex items-center gap-2">
                                {/* Invite Button */}
                                {isOwner && (
                                    <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 gap-2 text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20">
                                                <UserPlus className="w-4 h-4" />
                                                <span className="text-xs">Invite</span>
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[425px] bg-[#1e1f22] border-zinc-700 text-zinc-100">
                                            <DialogHeader>
                                                <DialogTitle>Invite a Friend</DialogTitle>
                                                <DialogDescription className="text-zinc-400">
                                                    Send a notification to a friend to join this room directly.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-4 py-4">
                                                <div className="flex flex-col gap-2 relative">
                                                    <Input
                                                        id="invite-username"
                                                        placeholder="Enter username..."
                                                        value={inviteUsername}
                                                        onChange={(e) => setInviteUsername(e.target.value)}
                                                        className="col-span-3 bg-black/20 border-zinc-700 text-white focus:ring-indigo-500"
                                                        autoComplete="off"
                                                    />
                                                    {/* User Dropdown */}
                                                    {inviteUsername.length > 0 && (
                                                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#2b2d31] border border-zinc-700 rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
                                                            {leaderboardUsers
                                                                .filter(u => u.username.toLowerCase().includes(inviteUsername.toLowerCase()) && u.username !== username)
                                                                .slice(0, 5)
                                                                .map(user => (
                                                                    <button
                                                                        key={user.username}
                                                                        className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-indigo-500/20 hover:text-white flex items-center gap-2 transition-colors"
                                                                        onClick={() => setInviteUsername(user.username)}
                                                                    >
                                                                        {user.photoURL ? (
                                                                            <img src={user.photoURL} alt={user.username} className="w-5 h-5 rounded-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] text-indigo-300">
                                                                                {user.username[0].toUpperCase()}
                                                                            </div>
                                                                        )}
                                                                        {user.username}
                                                                    </button>
                                                                ))}
                                                            {leaderboardUsers.filter(u => u.username.toLowerCase().includes(inviteUsername.toLowerCase()) && u.username !== username).length === 0 && (
                                                                <div className="px-3 py-2 text-sm text-zinc-500 italic">No users found</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button type="submit" onClick={handleInviteFriend} className="bg-indigo-600 hover:bg-indigo-700 text-white">Send Invite</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                )}

                                {/* Join Button */}
                                <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-white bg-white/5 hover:bg-white/10">
                                            <LogIn className="w-4 h-4" />
                                            <span className="text-xs">Join Friend</span>
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px] bg-[#1e1f22] border-zinc-700 text-zinc-100">
                                        <DialogHeader>
                                            <DialogTitle>Join a Private Room</DialogTitle>
                                            <DialogDescription className="text-zinc-400">
                                                Enter the room code shared by your friend to study together.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="flex flex-col gap-2">
                                                <Input
                                                    id="code"
                                                    placeholder="e.g. room-username"
                                                    value={joinInputCode}
                                                    onChange={(e) => setJoinInputCode(e.target.value)}
                                                    className="col-span-3 bg-black/20 border-zinc-700 text-white focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit" onClick={handleJoinRoom} className="bg-indigo-600 hover:bg-indigo-700 text-white">Join Room</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                {/* Copy Button */}
                                <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-white" onClick={handleCopyInvite}>
                                    {showCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    <span className="text-xs">Copy Code</span>
                                </Button>
                            </div>
                        </div>
                        <StudyGrid users={studyUsers} />
                    </div>

                    {/* RIGHT: Chat Panel */}
                    <div className="flex-1 flex flex-col bg-transparent rounded-2xl border-none shadow-none overflow-hidden relative">
                        <ChatPanel />
                    </div>

                </main>

                <BottomControlBar />

            </div>
        </ChatProvider>
    );
}

export default function PersonalStudyPage() {
    return (
        <Suspense fallback={
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
                    <h1 className="text-2xl font-semibold">Loading room...</h1>
                </motion.div>
            </div>
        }>
            <PersonalStudyContent />
        </Suspense>
    );
}
