"use client";

import Link from 'next/link';
import { Sparkles, Bell, BookOpenCheck, Home, NotebookText, CheckCheck, Bug, Loader2, ShoppingBag, Brain, Pin, PinOff, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/context/NotificationContext';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import UserAvatar from '@/components/UserAvatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { usePresence } from '@/features/study';
import { AppearanceSettings } from '@/features/settings/components/AppearanceSettings';
import { Settings, Palette } from 'lucide-react';
import { db } from '@/lib/firebase';
import { ref, push, serverTimestamp } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';

export default function Header() {
    const pathname = usePathname();
    const { notifications, markAsRead, markAllAsRead, togglePin } = useNotifications();
    const unreadCount = notifications.filter(n => !n.read).length;

    // Feedback/Bug Report State
    const { username } = usePresence();
    const { toast } = useToast();
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [feedbackText, setFeedbackText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmitFeedback = async () => {
        if (!feedbackText.trim()) return;
        setIsSubmitting(true);
        try {
            await push(ref(db, 'feedback'), {
                reporter: username || 'Anonymous',
                message: feedbackText.trim(),
                timestamp: serverTimestamp(),
                type: 'bug_or_suggestion',
                status: 'open'
            });
            toast({ title: "Feedback Sent", description: "Thanks for helping us improve Liorea!" });
            setFeedbackText("");
            setIsFeedbackOpen(false);
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Could not send report. Try again." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <header
            className={cn(
                "fixed top-0 left-0 right-0 z-50 px-4 h-[72px] flex items-center",
                "border-b border-white/5 transition-colors duration-500",
                "bg-background/60 backdrop-blur-xl"
            )}
        >
            <div className="container mx-auto flex justify-between items-center">
                <Link href="/home" className={cn(
                    "flex items-center gap-2 text-xl font-bold tracking-tight",
                    'text-white'
                )}>
                    <BookOpenCheck className="w-7 h-7" />
                    Liorea
                </Link>
                <nav className="flex items-center gap-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-discord-text-muted hover:bg-discord-gray hover:text-discord-text rounded-full" title="Appearance">
                                <Palette className="w-5 h-5 text-white/80" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl h-[85vh] p-0 bg-background border-border overflow-hidden rounded-xl">
                            <AppearanceSettings />
                        </DialogContent>
                    </Dialog>

                    <Link href="/settings">
                        <Button variant="ghost" size="icon" className="text-discord-text-muted hover:bg-discord-gray hover:text-discord-text rounded-full" title="Settings">
                            <Settings className="w-5 h-5 text-white/80" />
                        </Button>
                    </Link>
                    {/* <Link href="/shop">
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white rounded-full" title="Item Shop">
                            <ShoppingBag className="w-5 h-5" />
                        </Button>
                    </Link> */}

                    {/* BUG REPORT / FEEDBACK BUTTON */}
                    <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white rounded-full" title="Report Bug / Suggestion">
                                <Bug className="w-5 h-5" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-black/40 backdrop-blur-xl border-white/20 text-white sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Report Bug or Suggestion</DialogTitle>
                                <DialogDescription className="text-white/60">
                                    Found a glitch or have an idea? Let us know below.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <Textarea
                                    placeholder="Describe the bug or your suggestion..."
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)}
                                    className="bg-black/20 border-white/20 text-white min-h-[120px] focus-visible:ring-offset-0 focus-visible:ring-white/30"
                                />
                            </div>
                            <DialogFooter>
                                <Button
                                    onClick={handleSubmitFeedback}
                                    disabled={isSubmitting || !feedbackText.trim()}
                                    className="bg-white text-black hover:bg-white/90"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Submit
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* NOTIFICATIONS */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white rounded-full relative">
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-0 right-0 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                                    </span>
                                )}
                                <span className="sr-only">Notifications</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 bg-black/20 backdrop-blur-md border-white/20 text-white" align="end">
                            <div className="grid gap-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium leading-none">Notifications</h4>
                                    {notifications.length > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={markAllAsRead}
                                            className="h-6 text-[10px] px-2 text-white/50 hover:text-accent hover:bg-white/10"
                                        >
                                            <CheckCheck className="w-3 h-3 mr-1" /> Mark all read
                                        </Button>
                                    )}
                                </div>
                                <Separator className="bg-white/10" />
                                <ScrollArea className="h-72">
                                    {notifications.length > 0 ? (
                                        <div className="grid gap-2">
                                            {notifications.map((notification) => {
                                                const fromUser = notification.message.split(' ')[0];
                                                return (
                                                    <div
                                                        key={notification.id}
                                                        className={cn(
                                                            "mb-2 grid grid-cols-[auto_1fr_auto] gap-3 items-start pb-4 last:mb-0 last:pb-0 hover:bg-white/5 p-2 rounded cursor-pointer transition-colors relative group/item",
                                                            !notification.read && "bg-white/5",
                                                            notification.pinned && "border-l-2 border-accent pl-1.5"
                                                        )}
                                                        onClick={() => {
                                                            markAsRead(notification.id);
                                                            if (notification.link) {
                                                                window.location.href = notification.link;
                                                            }
                                                        }}
                                                    >
                                                        <div className="relative mt-1">
                                                            {notification.type === 'global' ? (
                                                                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                                                                    <Sparkles className="w-4 h-4 text-accent" />
                                                                </div>
                                                            ) : (
                                                                <UserAvatar username={fromUser} className="w-8 h-8" />
                                                            )}
                                                            {!notification.read && (
                                                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-sky-500 ring-2 ring-black" />
                                                            )}
                                                            {notification.pinned && (
                                                                <Pin className="absolute -bottom-1 -right-1 w-3 h-3 text-accent fill-accent" />
                                                            )}
                                                        </div>

                                                        <div className="space-y-1">
                                                            <p className={`text-sm leading-snug ${!notification.read ? 'font-semibold text-white' : 'text-white/80'}`}>
                                                                {notification.message}
                                                            </p>
                                                            <p className="text-[10px] text-muted-foreground">
                                                                {new Date(notification.timestamp).toLocaleString()}
                                                            </p>
                                                        </div>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className={cn(
                                                                "h-7 w-7 rounded-full opacity-0 group-hover/item:opacity-100 transition-opacity",
                                                                notification.pinned ? "opacity-100 text-accent" : "text-white/30 hover:text-white"
                                                            )}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                togglePin(notification.id);
                                                            }}
                                                            title={notification.pinned ? "Unpin" : "Pin"}
                                                        >
                                                            {notification.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                                                        </Button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-8">No new notifications.</p>
                                    )}
                                </ScrollArea>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <div className="hidden lg:flex items-center gap-2">
                        <Link href="/home" className={cn(
                            "flex items-center gap-2 py-1.5 px-3 rounded-full transition-colors text-sm",
                            'text-white/80 hover:text-white bg-black/20 backdrop-blur-sm',
                            pathname === '/home' && 'bg-white/10 text-white'
                        )}>
                            <Home className="w-4 h-4" />
                            <span>Home</span>
                        </Link>

                        <Link href="/personal" className={cn(
                            "flex items-center gap-2 py-1.5 px-3 rounded-full transition-colors text-sm",
                            'text-white/80 hover:text-white bg-black/20 backdrop-blur-sm',
                            pathname === '/personal' && 'bg-white/10 text-white'
                        )}>
                            <Brain className="w-4 h-4" />
                            <span>Personal</span>
                        </Link>

                        <Link href="/study-together" className={cn(
                            "flex items-center gap-2 py-1.5 px-3 rounded-full transition-colors text-sm",
                            'text-white/80 hover:text-white bg-black/20 backdrop-blur-sm',
                            pathname === '/study-together' && 'bg-white/10 text-white'
                        )}>
                            <Sparkles className="w-4 h-4" />
                            <span>Study Room</span>
                        </Link>

                        <Link href="/journal" className={cn(
                            "flex items-center gap-2 py-1.5 px-3 rounded-full transition-colors text-sm",
                            'text-white/80 hover:text-white bg-black/20 backdrop-blur-sm',
                            pathname === '/journal' && 'bg-white/10 text-white'
                        )}>
                            <NotebookText className="w-4 h-4" />
                            <span>Journal</span>
                        </Link>

                        <Link href="/changelog" className={cn(
                            "flex items-center gap-2 py-1.5 px-3 rounded-full transition-colors text-sm",
                            'text-white/80 hover:text-white bg-black/20 backdrop-blur-sm',
                            pathname === '/changelog' && 'bg-white/10 text-white'
                        )}>
                            <CheckCheck className="w-4 h-4" />
                            <span>Changelog</span>
                        </Link>
                    </div>

                    {/* MOBILE MENU */}
                    <div className="lg:hidden ml-1">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white rounded-full">
                                    <Menu className="w-6 h-6" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="bg-black/80 backdrop-blur-xl border-white/10 text-white w-[280px]">
                                <SheetHeader className="text-left mb-6">
                                    <SheetTitle className="text-white flex items-center gap-2">
                                        <BookOpenCheck className="w-5 h-5 text-accent" />
                                        Liorea Navigation
                                    </SheetTitle>
                                </SheetHeader>
                                <div className="flex flex-col gap-3">
                                    <Link href="/home" className={cn(
                                        "flex items-center gap-3 py-3 px-4 rounded-xl transition-colors text-base",
                                        'text-white/80 hover:text-white hover:bg-white/10',
                                        pathname === '/home' && 'bg-white/10 text-white font-medium'
                                    )}>
                                        <Home className="w-5 h-5" />
                                        Home
                                    </Link>
                                    <Link href="/personal" className={cn(
                                        "flex items-center gap-3 py-3 px-4 rounded-xl transition-colors text-base",
                                        'text-white/80 hover:text-white hover:bg-white/10',
                                        pathname === '/personal' && 'bg-white/10 text-white font-medium'
                                    )}>
                                        <Brain className="w-5 h-5" />
                                        Personal
                                    </Link>
                                    <Link href="/study-together" className={cn(
                                        "flex items-center gap-3 py-3 px-4 rounded-xl transition-colors text-base",
                                        'text-white/80 hover:text-white hover:bg-white/10',
                                        pathname === '/study-together' && 'bg-white/10 text-white font-medium'
                                    )}>
                                        <Sparkles className="w-5 h-5" />
                                        Study Room
                                    </Link>
                                    <Link href="/journal" className={cn(
                                        "flex items-center gap-3 py-3 px-4 rounded-xl transition-colors text-base",
                                        'text-white/80 hover:text-white hover:bg-white/10',
                                        pathname === '/journal' && 'bg-white/10 text-white font-medium'
                                    )}>
                                        <NotebookText className="w-5 h-5" />
                                        Journal
                                    </Link>
                                    <Link href="/changelog" className={cn(
                                        "flex items-center gap-3 py-3 px-4 rounded-xl transition-colors text-base",
                                        'text-white/80 hover:text-white hover:bg-white/10',
                                        pathname === '/changelog' && 'bg-white/10 text-white font-medium'
                                    )}>
                                        <CheckCheck className="w-5 h-5" />
                                        Changelog
                                    </Link>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                </nav>
            </div>
        </header>
    );
}