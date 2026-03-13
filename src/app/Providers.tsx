"use client";

import React, { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { NotificationProvider } from '@/context/NotificationContext';
import { BackgroundProvider } from '@/context/BackgroundContext';
import { PresenceProvider } from '@/features/study';
import BackgroundDisplay from '@/components/layout/BackgroundDisplay';
import { FocusProvider } from '@/context/FocusContext';
import FocusOverlay from '@/components/layout/FocusOverlay';
import { NavigationEvents } from '@/components/layout/NavigationEvents';
import { UserContextMenuProvider } from '@/context/UserContextMenuContext';
import { SettingsProvider } from '@/context/SettingsContext';
import GlobalUserContextMenu from '@/components/layout/GlobalUserContextMenu';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import ConnectionStatus from '@/components/layout/ConnectionStatus';
import { useKeepAlive } from '@/hooks/use-keep-alive';

export function Providers({ children }: { children: React.ReactNode }) {
    useKeepAlive();
    return (
        <>
            <Suspense>
                <NavigationEvents />
            </Suspense>

            {/* Connection status indicator */}
            <ConnectionStatus />

            <ErrorBoundary name="Background Provider">
                <BackgroundProvider>
                    <ErrorBoundary name="Settings Provider">
                        <SettingsProvider>
                            <BackgroundDisplay />
                            <ErrorBoundary name="Presence Provider">
                                <PresenceProvider>
                                    <ErrorBoundary name="Notification Provider">
                                        <NotificationProvider>
                                            <ErrorBoundary name="User Context Menu Provider">
                                                <UserContextMenuProvider>
                                                    <ErrorBoundary name="Focus Provider">
                                                        <FocusProvider>
                                                            <FocusOverlay />
                                                            {children}
                                                            <GlobalUserContextMenu />
                                                        </FocusProvider>
                                                    </ErrorBoundary>
                                                </UserContextMenuProvider>
                                            </ErrorBoundary>
                                        </NotificationProvider>
                                    </ErrorBoundary>
                                </PresenceProvider>
                            </ErrorBoundary>
                        </SettingsProvider>
                    </ErrorBoundary>
                </BackgroundProvider>
            </ErrorBoundary>
            <Toaster />
        </>
    );
}
