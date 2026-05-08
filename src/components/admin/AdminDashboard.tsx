"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Users, Timer, Activity, Send, Loader2, LayoutDashboard, Bug, BookOpen } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/context/NotificationContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from '@/lib/api';
import { usePresence } from '@/features/study';

import UserManagement from './UserManagement';
import FeedbackManagement from './FeedbackManagement';
import ResourcesManagement from './ResourcesManagement';
export default function AdminDashboard() {
    const [notificationMessage, setNotificationMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();
    const { addNotification } = useNotifications();
    const { studyUsers } = usePresence(); // Real-time active users

    const [stats, setStats] = useState({
        totalUsers: 0,
        totalMinutes: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Using leaderboard as proxy for all users for now
                const users = await api.study.getLeaderboard();
                const totalMins = users.reduce((acc, u) => acc + (u.total_minutes || 0), 0);
                setStats({
                    totalUsers: users.length,
                    totalMinutes: totalMins
                });
            } catch (e) {
                console.error("Failed to fetch admin stats", e);
            }
        };
        fetchStats();
    }, []);

    const handleSendGlobalNotification = async () => {
        if (notificationMessage.trim()) {
            setIsSending(true);
            try {
                await addNotification(notificationMessage.trim(), undefined, undefined, 'global');
                toast({ title: "Sent!", description: "Notification broadcasted." });
                setNotificationMessage('');
            } catch (error) {
                toast({ variant: "destructive", title: "Error", description: "Failed to send." });
            } finally {
                setIsSending(false);
            }
        }
    };

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                        Admin Console
                    </h1>
                    <p className="text-zinc-400">Manage yourverse.</p>
                </div>
                {/* Real-time status indicator */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-bold">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    SYSTEM ONLINE
                </div>
            </div>

            <Tabs defaultValue="dashboard" className="w-full">
                <TabsList className="bg-[#1e1f22] border border-zinc-800 p-1">
                    <TabsTrigger value="dashboard" className="gap-2">
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="users" className="gap-2">
                        <Users className="w-4 h-4" /> User Management
                    </TabsTrigger>
                    <TabsTrigger value="feedback" className="gap-2">
                        <Bug className="w-4 h-4" /> Feedback
                    </TabsTrigger>
                    <TabsTrigger value="resources" className="gap-2">
                        <BookOpen className="w-4 h-4" /> Resources
                    </TabsTrigger>
                </TabsList>

                {/* DASHBOARD TAB */}
                <TabsContent value="dashboard" className="space-y-6 mt-6">
                    <div className="grid gap-6 md:grid-cols-3">
                        <Card className="bg-[#1e1f22]/50 border-zinc-800">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400">Total Users</CardTitle>
                                <Users className="h-4 w-4 text-indigo-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
                                <p className="text-xs text-zinc-500">Registered across platform</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-[#1e1f22]/50 border-zinc-800">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400">Global Focus Time</CardTitle>
                                <Timer className="h-4 w-4 text-indigo-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">
                                    {Math.floor(stats.totalMinutes / 60)}h {stats.totalMinutes % 60}m
                                </div>
                                <p className="text-xs text-zinc-500">Collective productivity</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-[#1e1f22]/50 border-zinc-800">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400">Live Sessions</CardTitle>
                                <Activity className="h-4 w-4 text-green-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{studyUsers.length}</div>
                                <p className="text-xs text-zinc-500">Users currently online</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Notifications */}
                    <Card className="bg-[#1e1f22]/50 border-zinc-800">
                        <CardHeader>
                            <CardTitle>Global Broadcast</CardTitle>
                            <CardDescription>Send a persistent alert to all connected clients.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                placeholder="Type your alert message..."
                                value={notificationMessage}
                                onChange={(e) => setNotificationMessage(e.target.value)}
                                className="bg-black/20 border-zinc-700 focus:border-indigo-500"
                            />
                            <Button
                                onClick={handleSendGlobalNotification}
                                disabled={isSending || !notificationMessage.trim()}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                {isSending ? "Sending..." : "Broadcast Message"}
                            </Button>
                        </CardContent>
                    </Card>

                </TabsContent>

                {/* USER MANAGEMENT TAB */}
                <TabsContent value="users" className="mt-6">
                    <UserManagement />
                </TabsContent>

                <TabsContent value="feedback" className="mt-6">
                    <FeedbackManagement />
                </TabsContent>

                <TabsContent value="resources" className="mt-6">
                    <ResourcesManagement />
                </TabsContent>
            </Tabs>
        </div>
    );
}