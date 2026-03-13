"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, NotebookText, Brain, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/context/NotificationContext';

export default function MobileBottomNav() {
    const pathname = usePathname();
    const { notifications } = useNotifications();
    const unreadCount = notifications.filter(n => !n.read).length;

    const navItems = [
        { path: '/mobile', icon: Home, label: 'Home' },
        { path: '/mobile/personal', icon: Brain, label: 'Focus' },
        { path: '/mobile/study', icon: Sparkles, label: 'Study' },
        { path: '/mobile/journal', icon: NotebookText, label: 'Journal' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-[72px] bg-black/80 backdrop-blur-xl border-t border-white/10 z-50 px-2 pb-safe">
            <div className="flex items-center justify-around h-full pt-1 pb-4">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.path;

                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors relative",
                                isActive ? "text-white" : "text-white/40 hover:text-white/80"
                            )}
                        >
                            <div className={cn(
                                "p-1.5 rounded-full transition-all duration-300",
                                isActive && "bg-accent/20"
                            )}>
                                <Icon className={cn("w-5 h-5", isActive && "text-accent fill-accent/20")} />
                            </div>
                            <span className={cn(
                                "text-[10px] font-medium tracking-wide",
                                isActive && "text-accent"
                            )}>
                                {item.label}
                            </span>

                            {/* Notification Dot Example on Home */}
                            {item.path === '/mobile' && unreadCount > 0 && (
                                <span className="absolute top-2 right-4 flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </span>
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
