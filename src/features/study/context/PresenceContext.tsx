"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback, useRef } from 'react';
import { db, firestore, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, set, onDisconnect, serverTimestamp, increment, update, remove, query, limitToLast } from 'firebase/database';
import {
    collection,
    query as queryFirestore,
    where,
    orderBy,
    limit as limitFirestore,
    onSnapshot,
    doc,
    setDoc,
    getDoc,
    deleteDoc,
    increment as incrementFirestore,
    serverTimestamp as serverTimestampFirestore,
    getDocs,
    writeBatch
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

import { api } from '@/lib/api';

export interface StudyUser {
    username: string;
    total_study_time: number;
    status: 'Online';
    photoURL?: string;
    status_text?: string;
    equipped_frame?: string;
    trend?: 'up' | 'down' | 'same';
    is_focus_mode?: boolean;
}

export interface CommunityUser {
    username: string;
    status: 'Online' | 'Offline';
    last_seen: number;
    status_text?: string;
    is_studying: boolean;
    photoURL?: string;
    equipped_frame?: string;
    is_focus_mode?: boolean;
}

interface PresenceContextType {
    username: string | null;
    userImage: string | null;
    setUsername: (name: string | null) => void;
    setUserImage: (url: string | null) => void;
    studyUsers: StudyUser[];
    communityUsers: CommunityUser[];
    leaderboardUsers: StudyUser[];
    weeklyLeaderboard: StudyUser[];
    allTimeLeaderboard: StudyUser[];
    selectedTimeframe: 'daily' | 'weekly' | 'alltime';
    setSelectedTimeframe: (timeframe: 'daily' | 'weekly' | 'alltime') => void;
    isStudying: boolean;
    joinSession: (roomId?: string) => void;
    leaveSession: (roomId?: string) => void;
    joinedRoomId: string | null;
    updateStatusMessage: (msg: string) => Promise<void>;
    getUserImage: (username: string) => string | undefined;

    getUserFrame: (username: string) => string | undefined;
    userRoles: Record<string, string>;
    isMod: (username: string) => boolean;
    isFirebaseAuthReady: boolean;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export const PresenceProvider = ({ children }: { children: ReactNode }) => {
    const [username, setUsernameState] = useState<string | null>(null);
    const [userImage, setUserImageState] = useState<string | null>(null);
    const [userFrame, setUserFrameState] = useState<string | null>(null);

    const setUserImage = useCallback((url: string | null) => {
        setUserImageState(url);
        if (url) localStorage.setItem('liorea-user-image', url);
        else localStorage.removeItem('liorea-user-image');
    }, []);

    const [studyUsers, setStudyUsers] = useState<StudyUser[]>([]);
    const [communityUsers, setCommunityUsers] = useState<CommunityUser[]>([]);
    const [historicalLeaderboard, setHistoricalLeaderboard] = useState<StudyUser[]>([]);
    const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<StudyUser[]>([]);
    const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<StudyUser[]>([]);
    const [selectedTimeframe, setSelectedTimeframe] = useState<'daily' | 'weekly' | 'alltime'>('daily');
    const [userRoles, setUserRoles] = useState<Record<string, string>>({});

    const [isStudying, setIsStudying] = useState(false);
    const [joinedRoomId, setJoinedRoomId] = useState<string | null>(null);
    const unsavedMinutesRef = useRef(0);
    const { toast } = useToast();
    const [presenceInitialized, setPresenceInitialized] = useState(false);
    const [isFirebaseAuthReady, setIsFirebaseAuthReady] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setIsFirebaseAuthReady(!!user);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const storedUser = localStorage.getItem('liorea-username');
        const storedImage = localStorage.getItem('liorea-user-image');
        if (storedUser) setUsernameState(storedUser);
        if (storedImage) setUserImageState(storedImage); // Load immediately
    }, []);

    const setUsername = useCallback((name: string | null) => {
        const oldName = username;
        setUsernameState(name);

        if (name) {
            localStorage.setItem('liorea-username', name);

            // Handle Cleanup of Old Username (Duplication Fix)
            if (oldName && oldName !== name) {
                console.log(`Cleaning up old identity: ${oldName} -> ${name}`);

                // 1. Remove from Realtime DB nodes
                remove(ref(db, `/community_presence/${oldName}`));
                remove(ref(db, `/study_room_presence/${oldName}`));

                // 2. Remove from Firestore Persistent Metadata
                deleteDoc(doc(firestore, 'users', oldName)).catch(() => { });

                // 3. Migrate Firebase Realtime DB Data (Notifications & Pinned)
                const migrateFirebaseData = async () => {
                    try {
                        // A. Notifications
                        const oldNotifRef = ref(db, `user_notifications/${oldName}`);
                        const newNotifRef = ref(db, `user_notifications/${name}`);
                        onValue(oldNotifRef, (snapshot) => {
                            const data = snapshot.val();
                            if (data) {
                                set(newNotifRef, data).then(() => remove(oldNotifRef));
                            }
                        }, { onlyOnce: true });

                        // B. Pinned Notifications
                        const oldPinnedRef = ref(db, `user_pinned/${oldName}`);
                        const newPinnedRef = ref(db, `user_pinned/${name}`);
                        onValue(oldPinnedRef, (snapshot) => {
                            const data = snapshot.val();
                            if (data) {
                                set(newPinnedRef, data).then(() => remove(oldPinnedRef));
                            }
                        }, { onlyOnce: true });

                        // 4. Migrate Firestore Chats (So user can still delete them)
                        const chatsQuery = queryFirestore(collection(firestore, 'chats'), where('username', '==', oldName));
                        const chatSnaps = await getDocs(chatsQuery);
                        const chatBatch = writeBatch(firestore);
                        chatSnaps.forEach(chatDoc => {
                            chatBatch.update(chatDoc.ref, { username: name });
                        });
                        await chatBatch.commit();

                        // 5. Migrate Firestore Daily Stats (Leaderboard progress)
                        const statsQuery = queryFirestore(collection(firestore, 'daily_stats'), where('username', '==', oldName));
                        const statsSnaps = await getDocs(statsQuery);
                        const statsBatch = writeBatch(firestore);
                        statsSnaps.forEach(statDoc => {
                            statsBatch.update(statDoc.ref, { username: name });
                        });
                        await statsBatch.commit();

                    } catch (e) {
                        console.error("Firebase migration failed", e);
                    }
                };
                migrateFirebaseData();

                // 6. Update RTDB for new name immediately to avoid race
                update(ref(db, `/community_presence/${name}`), {
                    username: name,
                    status: 'Online',
                    last_seen: serverTimestamp(),
                    is_studying: false
                });
            }
        } else {
            if (oldName) {
                remove(ref(db, `/study_room_presence/${oldName}`));
                update(ref(db, `/community_presence/${oldName}`), {
                    status: 'Offline',
                    last_seen: serverTimestamp(),
                    is_studying: false
                });
            }
            localStorage.removeItem('liorea-username');
            localStorage.removeItem('liorea-user-image');
            setUserImage(null);
            setUserFrameState(null);
            setIsStudying(false);
        }
    }, [username, setUserImage]);

    // --- EAGER PRESENCE INITIALIZATION ---
    // Set online status immediately, don't wait for Firebase connection
    useEffect(() => {
        if (!username) return;

        const commRef = ref(db, `/community_presence/${username}`);

        // Set online status IMMEDIATELY (optimistic)
        update(commRef, {
            username: username,
            status: 'Online',
            last_seen: serverTimestamp(),
            is_studying: false
        }).then(() => {
            setPresenceInitialized(true);
        }).catch(err => {
            console.error("Failed to set initial presence:", err);
            setPresenceInitialized(true); // Still mark as initialized
        });

        // Cleanup on unmount
        return () => {
            update(commRef, {
                status: 'Offline',
                last_seen: serverTimestamp(),
                is_studying: false
            });
        };
    }, [username]);

    // --- GLOBAL PRESENCE (Write) ---
    useEffect(() => {
        if (!username) return;

        // 1. Realtime DB: Ephemeral Status
        const commRef = ref(db, `/community_presence/${username}`);
        const connectionRef = ref(db, '.info/connected');

        // 2. Firestore: Persistent Profile
        const userRef = doc(firestore, 'users', username);

        const unsubscribe = onValue(connectionRef, async (snap: any) => {
            if (snap.val() === true) {
                // Fetch latest profile data from D1 to ensure Firestore is up to date on connect
                let savedStatus = "";
                let savedPhoto = userImage || "";
                let savedFrame = userFrame || "";

                try {
                    // SYNC FROM D1 (Source of Truth)
                    const data = await api.auth.getStatus(username);
                    if (data.status_text) savedStatus = data.status_text;
                    if (data.photoURL) {
                        savedPhoto = data.photoURL;
                        setUserImage(savedPhoto); // Sync to local state
                    }
                    if (data.equipped_frame) {
                        savedFrame = data.equipped_frame;
                        setUserFrameState(savedFrame);
                    }

                    // SYNC TO FIRESTORE (Read Replica for Realtime)
                    await setDoc(userRef, {
                        username,
                        photoURL: savedPhoto,
                        equipped_frame: savedFrame,
                        last_seen: serverTimestampFirestore(),
                        status_text: savedStatus // Sync status too
                    }, { merge: true });

                    // Also update Realtime DB for "I am here"
                    await onDisconnect(commRef).update({
                        status: 'Offline',
                        last_seen: serverTimestamp(),
                        is_studying: false
                    });

                    update(commRef, {
                        username: username, // key for identification
                        status: 'Online',
                        last_seen: serverTimestamp(),
                        is_studying: false // Default false until joinSession
                    });

                } catch (e) { console.error("Presence sync failed", e); }
            }
        });

        return () => {
            unsubscribe();
            onDisconnect(commRef).cancel();
        };
    }, [username, userImage, userFrame]);

    // --- DATA LISTENERS ---

    // 0. Firestore Users List (Profile Data Source)
    // We listen to ALL users (assuming reasonable scale) or we could query.
    // Ideally we only fetch profiles of online users, but for now we'll listen to the collection to get updates.
    const [firestoreProfiles, setFirestoreProfiles] = useState<Map<string, any>>(new Map());
    useEffect(() => {
        if (!isFirebaseAuthReady) return;
        const q = queryFirestore(collection(firestore, 'users'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const map = new Map<string, any>();
            snapshot.docs.forEach(doc => {
                map.set(doc.id, doc.data());
            });
            setFirestoreProfiles(map);
        });
        return () => unsubscribe();
    }, []);

    // 1. Leaderboard (Live from Firestore 'daily_stats')
    // Auto-reset at midnight by tracking 'currentDate'
    const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const checkDate = () => {
            const now = new Date().toISOString().split('T')[0];
            if (now !== currentDate) {
                setCurrentDate(now);
            }
        };
        // Check every minute
        const interval = setInterval(checkDate, 60000);
        return () => clearInterval(interval);
    }, [currentDate]);

    useEffect(() => {
        if (!isFirebaseAuthReady) return;
        // Query depends on 'currentDate' so it resets exactly when day flips
        const q = queryFirestore(
            collection(firestore, 'daily_stats'),
            where('date', '==', currentDate),
            orderBy('minutes', 'desc'),
            limitFirestore(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: StudyUser[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    username: data.username,
                    total_study_time: (data.minutes || 0) * 60,
                    status: 'Online' as 'Online',
                    photoURL: data.photoURL,
                    status_text: data.status_text,
                    equipped_frame: data.equipped_frame
                };
            }).filter(u => u.username);
            setHistoricalLeaderboard(list);
        });

        return () => unsubscribe();
    }, [currentDate]);

    // 1b. Weekly Leaderboard (Last 7 days aggregation)
    useEffect(() => {
        if (!isFirebaseAuthReady) return;
        const getDateDaysAgo = (days: number) => {
            const date = new Date();
            date.setDate(date.getDate() - days);
            return date.toISOString().split('T')[0];
        };

        const startDate = getDateDaysAgo(7);
        const endDate = new Date().toISOString().split('T')[0];

        const q = queryFirestore(
            collection(firestore, 'daily_stats'),
            where('date', '>=', startDate),
            where('date', '<=', endDate)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // Aggregate by username
            const userMap = new Map<string, {
                username: string;
                totalMinutes: number;
                photoURL?: string;
                status_text?: string;
                equipped_frame?: string;
            }>();

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (!data.username) return;

                const existing = userMap.get(data.username) || {
                    username: data.username,
                    totalMinutes: 0,
                    photoURL: data.photoURL,
                    status_text: data.status_text,
                    equipped_frame: data.equipped_frame
                };

                existing.totalMinutes += data.minutes || 0;
                // Keep most recent profile data
                if (data.photoURL) existing.photoURL = data.photoURL;
                if (data.status_text) existing.status_text = data.status_text;
                if (data.equipped_frame) existing.equipped_frame = data.equipped_frame;

                userMap.set(data.username, existing);
            });

            const list: StudyUser[] = Array.from(userMap.values())
                .map(user => ({
                    username: user.username,
                    total_study_time: user.totalMinutes * 60, // Convert to seconds
                    status: 'Online' as const,
                    photoURL: user.photoURL,
                    status_text: user.status_text,
                    equipped_frame: user.equipped_frame
                }))
                .sort((a, b) => b.total_study_time - a.total_study_time)
                .slice(0, 50); // Top 50

            setWeeklyLeaderboard(list);
        });

        return () => unsubscribe();
    }, []);

    // 1c. All-Time Leaderboard (All historical data aggregation)
    useEffect(() => {
        if (!isFirebaseAuthReady) return;
        const q = queryFirestore(
            collection(firestore, 'daily_stats'),
            orderBy('date', 'desc'),
            limitFirestore(500) // Optimized limit - reduced from 2000
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // Aggregate by username
            const userMap = new Map<string, {
                username: string;
                totalMinutes: number;
                photoURL?: string;
                status_text?: string;
                equipped_frame?: string;
            }>();

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (!data.username) return;

                const existing = userMap.get(data.username) || {
                    username: data.username,
                    totalMinutes: 0,
                    photoURL: data.photoURL,
                    status_text: data.status_text,
                    equipped_frame: data.equipped_frame
                };

                existing.totalMinutes += data.minutes || 0;
                // Keep most recent profile data
                if (data.photoURL) existing.photoURL = data.photoURL;
                if (data.status_text) existing.status_text = data.status_text;
                if (data.equipped_frame) existing.equipped_frame = data.equipped_frame;

                userMap.set(data.username, existing);
            });

            const list: StudyUser[] = Array.from(userMap.values())
                .map(user => ({
                    username: user.username,
                    total_study_time: user.totalMinutes * 60, // Convert to seconds
                    status: 'Online' as const,
                    photoURL: user.photoURL,
                    status_text: user.status_text,
                    equipped_frame: user.equipped_frame
                }))
                .sort((a, b) => b.total_study_time - a.total_study_time)
                .slice(0, 100); // Top 100

            setAllTimeLeaderboard(list);
        });

        return () => unsubscribe();
    }, []);

    // 2. Study Room Users (Throttled + Hybrid Firestore/RDB)
    useEffect(() => {
        if (!joinedRoomId) {
            setStudyUsers([]);
            return;
        }
        if (joinedRoomId !== 'public' && !isFirebaseAuthReady) return;

        let unsubscribe: any = () => { };
        let animationFrameId: number;

        if (joinedRoomId === 'public') {
            // RDB Logic (Legacy & Fast for Public)
            const path = '/study_room_presence';
            const roomRef = ref(db, path);
            let latestData: any = null;
            let lastUpdate = 0;

            const processUpdates = () => {
                const now = Date.now();
                if (now - lastUpdate > 1000 && latestData) {
                    const list: StudyUser[] = Object.values(latestData)
                        .filter((u: any) => u && u.username)
                        .map((u: any) => ({
                            username: u.username,
                            photoURL: u.photoURL,
                            equipped_frame: u.equipped_frame,
                            total_study_time: Number(u.total_study_time) || 0,
                            status: 'Online'
                        }));
                    list.sort((a, b) => b.total_study_time - a.total_study_time);

                    setStudyUsers(prev => {
                        if (prev.length !== list.length) return list;
                        const isSame = prev.length === list.length && prev[0]?.username === list[0]?.username && prev[0]?.total_study_time === list[0]?.total_study_time;
                        return isSame ? prev : list;
                    });
                    lastUpdate = now;
                }
                animationFrameId = requestAnimationFrame(processUpdates);
            };

            unsubscribe = onValue(roomRef, (snapshot) => {
                latestData = snapshot.val();
            });
            processUpdates();
        } else {
            // Firestore Logic (Personal Rooms)
            const roomRef = collection(firestore, 'rooms', joinedRoomId, 'presence');
            unsubscribe = onSnapshot(roomRef, (snapshot) => {
                const now = Date.now();
                const list: StudyUser[] = [];
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    // Heartbeat Check: Hide if stale > 2 minutes
                    const lastSeen = data.last_seen?.toMillis ? data.last_seen.toMillis() : (data.last_seen || 0);
                    if (now - lastSeen < 120000 && data.username) { // 2 minutes & Valid Username
                        list.push({
                            username: data.username,
                            photoURL: data.photoURL,
                            equipped_frame: data.equipped_frame,
                            total_study_time: data.total_study_time || 0,
                            status: 'Online'
                        });
                    }
                });
                list.sort((a, b) => b.total_study_time - a.total_study_time);
                setStudyUsers(list);
            });
        }

        return () => {
            unsubscribe();
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [joinedRoomId]);

    // 3. Community Presence (State Source)
    useEffect(() => {
        const globalRef = query(ref(db, '/community_presence'), limitToLast(100));
        let latestData: any = null;
        let lastUpdate = 0;
        let animationFrameId: number;

        const processUpdates = () => {
            const now = Date.now();
            if (now - lastUpdate > 1000 && latestData) { // 1 second throttle
                // 1. Get raw presence data
                const rawList = Object.values(latestData)
                    .filter((u: any) => u && u.username)
                    .map((u: any) => {
                        // 2. Merge with Firestore Profile Data
                        const profile = firestoreProfiles.get(u.username) || {};
                        return {
                            username: u.username,
                            status: u.status || 'Offline',
                            last_seen: u.last_seen || Date.now(),
                            is_studying: u.is_studying || false,
                            is_focus_mode: u.is_focus_mode || false,

                            // Merged Fields
                            photoURL: profile.photoURL || u.photoURL || "", // Fallback to RDB if migrated slowly
                            equipped_frame: profile.equipped_frame || u.equipped_frame || "",
                            status_text: profile.status_text || u.status_text || ""
                        };
                    });

                const uniqueMap = new Map<string, CommunityUser>();
                rawList.forEach((user: any) => {
                    const existing = uniqueMap.get(user.username);
                    if (!existing) {
                        uniqueMap.set(user.username, user);
                    } else {
                        const isNewer = user.last_seen > existing.last_seen;
                        const isOnline = user.status === 'Online';
                        if (isOnline || (isNewer && existing.status !== 'Online')) {
                            uniqueMap.set(user.username, user);
                        }
                    }
                });

                const list = Array.from(uniqueMap.values());
                list.sort((a, b) => {
                    if (a.status === 'Online' && b.status !== 'Online') return -1;
                    if (a.status !== 'Online' && b.status === 'Online') return 1;
                    return b.last_seen - a.last_seen;
                });

                setCommunityUsers(prev => {
                    if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
                    return list;
                });
                lastUpdate = now;
            }
            animationFrameId = requestAnimationFrame(processUpdates);
        };

        const unsubscribe = onValue(globalRef, (snapshot) => {
            latestData = snapshot.val();
        });

        processUpdates();

        return () => {
            unsubscribe();
            cancelAnimationFrame(animationFrameId);
        };
    }, [firestoreProfiles]); // Re-run when profiles update

    const leaderboardUsers = useMemo(() => {
        const map = new Map<string, StudyUser>();

        // 1. Seed with ALL users from Firestore Profiles (Base Roster)
        firestoreProfiles.forEach((data, uid) => {
            if (data && data.username) {
                map.set(data.username, {
                    username: data.username,
                    total_study_time: 0,
                    status: 'Online', // Status will be overwritten by Community merging if actually online
                    photoURL: data.photoURL,
                    status_text: data.status_text,
                    equipped_frame: data.equipped_frame
                });
            }
        });

        // 2. Merge Today's Stats (Overwrites 0 time with actual time)
        historicalLeaderboard.forEach(user => {
            if (user.username) {
                const existing = map.get(user.username);
                if (existing) {
                    existing.total_study_time = user.total_study_time;
                    // Keep profile data if missing in stats, or update if stats has newer (unlikely for profile info)
                } else {
                    map.set(user.username, user);
                }
            }
        });

        // 3. Merge Live Study Room Data
        studyUsers.forEach(user => {
            if (user.username) {
                const existing = map.get(user.username);
                if (existing) {
                    // Update time if live time is greater (it should be)
                    existing.total_study_time = Math.max(existing.total_study_time, user.total_study_time);
                    existing.status = 'Online';
                } else {
                    map.set(user.username, user);
                }
            }
        });

        // 4. Merge Community Presence (Online Status / Metadata)
        communityUsers.forEach(user => {
            if (user.username && map.has(user.username)) {
                const existing = map.get(user.username)!;
                // Update Metadata
                if (!existing.photoURL && user.photoURL) existing.photoURL = user.photoURL;
                if (!existing.equipped_frame && user.equipped_frame) existing.equipped_frame = user.equipped_frame;
                if (user.status_text) existing.status_text = user.status_text;
                if (user.is_focus_mode !== undefined) existing.is_focus_mode = user.is_focus_mode;
            }
        });

        const list = Array.from(map.values()).sort((a, b) => b.total_study_time - a.total_study_time);

        return list;
    }, [historicalLeaderboard, studyUsers, communityUsers, firestoreProfiles]);

    // --- CENTRAL IMAGE/FRAME LOOKUP ---
    const userLookups = useMemo(() => {
        const imageMap = new Map<string, string>();
        const frameMap = new Map<string, string>();

        // 1. Current User (Priority)
        if (username) {
            if (userImage) imageMap.set(username, userImage);
            if (userFrame) frameMap.set(username, userFrame);
        }

        // 2. Data Sources
        [historicalLeaderboard, communityUsers, studyUsers].forEach(list => {
            list.forEach(u => {
                if (u.photoURL) imageMap.set(u.username, u.photoURL);
                if (u.equipped_frame) frameMap.set(u.username, u.equipped_frame);
            });
        });

        return { imageMap, frameMap };
    }, [username, userImage, userFrame, historicalLeaderboard, communityUsers, studyUsers]);

    const getUserImage = useCallback((targetUsername: string) => {
        return userLookups.imageMap.get(targetUsername);
    }, [userLookups]);

    const getUserFrame = useCallback((targetUsername: string) => {
        return userLookups.frameMap.get(targetUsername);
    }, [userLookups]);

    // 5. Initialize/Maintain Study Session
    useEffect(() => {
        if (!joinedRoomId || !username) return;
        if (joinedRoomId !== 'public' && !isFirebaseAuthReady) return;

        let rdbRef: any;
        let firestoreHeartbeatInterval: NodeJS.Timeout;

        const initializeSession = async () => {
            let initialSeconds = 0;

            try {
                const today = new Date().toISOString().split('T')[0];
                const statsRef = doc(firestore, 'daily_stats', `${today}_${username}`);
                const statsSnap = await getDoc(statsRef);
                if (statsSnap.exists()) {
                    const data = statsSnap.data();
                    if (data.minutes) initialSeconds = data.minutes * 60;
                }
            } catch (e) { console.error(e); }

            if (joinedRoomId === 'public') {
                // RDB (Legacy)
                rdbRef = ref(db, `/study_room_presence/${username}`);
                set(rdbRef, {
                    username,
                    photoURL: userImage || "",
                    equipped_frame: userFrame || "",
                    total_study_time: initialSeconds,
                    status: 'Online'
                });
                onDisconnect(rdbRef).remove();
            } else {
                // Firestore (Personal)
                const roomUserRef = doc(firestore, 'rooms', joinedRoomId, 'presence', username);
                const updateHeartbeat = async () => {
                    try {
                        await setDoc(roomUserRef, {
                            username,
                            photoURL: userImage || "",
                            equipped_frame: userFrame || "",
                            total_study_time: initialSeconds, // Note: This might need to update if we want live time in personal room without refreshing.
                            // Currently `total_study_time` in presence is static initial or only updated slightly.
                            // Ideally this should sync with the timer loop.
                            last_seen: serverTimestampFirestore(),
                            status: 'Online'
                        }, { merge: true });
                    } catch (e) { }
                };

                updateHeartbeat();
                firestoreHeartbeatInterval = setInterval(updateHeartbeat, 60000); // Heartbeat every 1m

                // Best effort cleanup
                const cleanup = () => { deleteDoc(roomUserRef).catch(() => { }); };
                window.addEventListener('beforeunload', cleanup);
                return () => window.removeEventListener('beforeunload', cleanup);
            }
        };

        initializeSession();

        return () => {
            if (rdbRef) {
                remove(rdbRef);
                onDisconnect(rdbRef).cancel();
            }
            if (firestoreHeartbeatInterval) clearInterval(firestoreHeartbeatInterval);
            if (joinedRoomId !== 'public') {
                deleteDoc(doc(firestore, 'rooms', joinedRoomId, 'presence', username)).catch(() => { });
            }
        };
    }, [joinedRoomId, username, userImage, userFrame]);

    // --- TIMER (Writes to Firestore) ---
    useEffect(() => {
        if (!username || !isStudying) return;

        const updateFirestore = async () => {
            const today = new Date().toISOString().split('T')[0];
            const docId = `${today}_${username}`;
            const docRef = doc(firestore, 'daily_stats', docId);

            try {
                // Don't include status_text here to avoid overwriting it with empty string
                await setDoc(docRef, {
                    username,
                    minutes: incrementFirestore(1),
                    date: today,
                    photoURL: userImage || "",
                    last_updated: serverTimestampFirestore(),
                }, { merge: true });
            } catch (e) { console.error("Firestore timer update failed", e); }
        };

        const flushToCloudflare = () => {
            // Keep D1 backup functionality for redundancy
            const minutesToAdd = unsavedMinutesRef.current;
            if (minutesToAdd > 0) {
                unsavedMinutesRef.current = 0;
                api.study.updateTime(username, minutesToAdd)
                    .catch(e => { });
            }
        };

        const interval = setInterval(() => {
            // Legacy Realtime DB update (Required for live StudyGrid UI)
            const myStudyTimeRef = ref(db, `/study_room_presence/${username}/total_study_time`);
            set(myStudyTimeRef, increment(60));

            // Sync to Firestore
            updateFirestore();

            unsavedMinutesRef.current += 1;
            if (unsavedMinutesRef.current >= 1) flushToCloudflare();
        }, 60000);

        return () => {
            clearInterval(interval);
            flushToCloudflare();
        };
    }, [username, isStudying, userImage]);

    const joinSession = useCallback((roomId: string = "public") => {
        setJoinedRoomId(roomId);
        setIsStudying(true);
    }, []);
    const leaveSession = useCallback((specificRoomId?: string) => {
        if (specificRoomId && joinedRoomId !== specificRoomId) return; // Don't leave if we already switched rooms
        setIsStudying(false);
        setJoinedRoomId(null);
    }, [joinedRoomId]);

    const updateStatusMessage = useCallback(async (msg: string) => {
        if (!username) return;

        // 1. Update Realtime DB (Legacy/Community Panel Immediate)
        update(ref(db, `/community_presence/${username}`), { status_text: msg });

        // 2. Update Firestore Profile
        const userRef = doc(firestore, 'users', username);
        setDoc(userRef, { status_text: msg }, { merge: true });

        // 3. Update Daily Stats (for Leaderboard visibility)
        const today = new Date().toISOString().split('T')[0];
        const statsRef = doc(firestore, 'daily_stats', `${today}_${username}`);
        setDoc(statsRef, { status_text: msg }, { merge: true });

        // 4. D1 Backup
        api.auth.updateStatus(username, msg);

        toast({ title: "Status Updated" });
    }, [username, toast]);



    const isMod = useCallback((u: string) => userRoles[u] === 'mod', [userRoles]);

    const value = useMemo(() => ({
        username, userImage, setUsername, setUserImage,
        studyUsers, leaderboardUsers, communityUsers,
        weeklyLeaderboard, allTimeLeaderboard,
        selectedTimeframe, setSelectedTimeframe,
        isStudying, joinSession, leaveSession, updateStatusMessage,
        getUserImage, getUserFrame,
        userRoles, isMod, joinedRoomId, isFirebaseAuthReady
    }), [username, userImage, setUsername, setUserImage, studyUsers, leaderboardUsers, communityUsers, weeklyLeaderboard, allTimeLeaderboard, selectedTimeframe, isStudying, joinSession, leaveSession, updateStatusMessage, getUserImage, getUserFrame, userRoles, isMod, joinedRoomId, isFirebaseAuthReady]);

    return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
};

export const usePresence = () => {
    const c = useContext(PresenceContext);
    if (c === undefined) throw new Error("usePresence error");
    return c;
};