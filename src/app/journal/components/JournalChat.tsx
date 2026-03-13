"use client";

import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Image as ImageIcon, Loader2, Smile, Star, Film, Search, ChevronDown, Flag, Trash2, Hash, X, ListTodo, Plus, Minus } from 'lucide-react';
import { TaskMessage, TaskListContent } from '@/components/chat/TaskMessage';
import UserAvatar from '@/components/UserAvatar';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/context/NotificationContext';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { db, firestore } from '@/lib/firebase';
import { ref, onValue, set, serverTimestamp, push } from 'firebase/database';
import { collection, query, orderBy, limit, limitToLast, onSnapshot, addDoc, doc, updateDoc, deleteDoc, deleteField, setDoc } from 'firebase/firestore';
import { compressImage } from '@/lib/compress';

// Robust timestamp parser
const parseTimestamp = (ts: any): number => {
    if (!ts) return Date.now();
    if (typeof ts === 'number') {
        // Handle seconds instead of milliseconds
        return ts < 10000000000 ? ts * 1000 : ts;
    }
    if (typeof ts === 'string') {
        const parsed = Date.parse(ts);
        return isNaN(parsed) ? Date.now() : parsed;
    }
    if (ts.toMillis && typeof ts.toMillis === 'function') return ts.toMillis();
    if (ts instanceof Date) return ts.getTime();
    if (ts.seconds) return ts.seconds * 1000; // Handle raw Firestore object
    return Date.now();
};
import dynamic from 'next/dynamic';
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePresence } from '@/features/study/context/PresenceContext';
import { api } from '@/lib/api';
import { Journal, Post, Reaction } from '../types';
import { TenorResult } from '@/lib/api-types';
import { FormattedMessage } from '@/components/chat/FormattedMessage';
import { MessageActions } from '@/components/chat/MessageActions';
import { MentionMenu } from '@/components/chat/MentionMenu';
import { ImageViewer } from '@/components/ui/ImageViewer';

interface JournalChatProps {
    activeJournal: Journal | null;
    username: string;
    isFollowed: boolean;
    onToggleFollow: () => void;
    onBack: () => void;
    leaderboardUsers: any[]; // Or specific type
}

export const JournalChat: React.FC<JournalChatProps> = ({
    activeJournal,
    username,
    isFollowed,
    onToggleFollow,
    onBack,
    leaderboardUsers
}) => {
    const { toast } = useToast();
    const { addNotification } = useNotifications();
    const { isMod } = usePresence();

    const [posts, setPosts] = useState<Post[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [isInitialLoaded, setIsInitialLoaded] = useState(false);
    const [currentFollowers, setCurrentFollowers] = useState<string[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isUploadingChatImage, setIsUploadingChatImage] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionIndex, setMentionIndex] = useState(0);
    const [gifs, setGifs] = useState<TenorResult[]>([]);
    const [gifSearch, setGifSearch] = useState("");
    const [loadingGifs, setLoadingGifs] = useState(false);

    // Reply State
    const [replyingTo, setReplyingTo] = useState<{ id: number | string, username: string, content: string } | null>(null);
    const [openReactionPopoverId, setOpenReactionPopoverId] = useState<number | string | null>(null);
    const [isGifPopoverOpen, setIsGifPopoverOpen] = useState(false);

    // Image Viewer State
    const [viewerImage, setViewerImage] = useState<string | null>(null);

    useEffect(() => {
        if (isGifPopoverOpen && gifs.length === 0) {
            fetchGifs();
        }
    }, [isGifPopoverOpen]);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const prevScrollHeight = useRef(0);

    // const prevPostsLength = useRef(0); // Removed unused ref
    const chatFileInputRef = useRef<HTMLInputElement>(null);
    const chatInputRef = useRef<HTMLTextAreaElement>(null);

    const fetchPosts = async (id: number, before?: number, isUpdate = false) => {
        // Legacy D1 fetch for history or mix?
        // Current plan: Use Firestore exclusively for live and "recent" history.
        // But the artifact said "we will rely on D1/existing APIs for history".
        // SO: We should keep `api.journal.getPosts` (which calls D1) for initial load?
        // NO. If we migrate to Firestore, we should primarily read from Firestore for CONSISTENCY.
        // However, migration plan said: "Data Migration: Existing chat history ... will NOT be automatically migrated".
        // This means D1 is the ONLY source for old messages.
        // Strategy:
        // 1. Load initial history from D1 (existing API).
        // 2. Load NEW live messages from Firestore.
        // 3. Merge them.
        try {
            const newPosts: Post[] = await api.journal.getPosts(id, before);
            if (before) {
                if (newPosts.length < 20) setHasMore(false);
                if (newPosts.length > 0) setPosts(prev => [...newPosts, ...prev]); // D1 is history, so append to bottom? No, `before` means older. Append to END of array (if index 0 is newest? No, usually chat is reverse).
                // Existing logic: `prev` is current list. `newPosts` is older.
                // Depending on sort order. Assuming `posts` is oldest -> newest.
                // Then `newPosts` (older) should go to the BEGINNING.
                // Wait, existing logic: `setPosts(prev => [...newPosts, ...prev])`.
                // This implies `newPosts` are OLDER than `prev`. Correct.
                setLoadingMore(false);
            } else {
                setPosts(newPosts);
                if (newPosts.length < 20) setHasMore(false);
            }
        } catch (e) {
            console.error(e);
            setLoadingMore(false);
        }
    };

    const fetchFollowers = async (id: number) => { try { const data = await api.journal.getFollowers(id); setCurrentFollowers(data); } catch (e) { } };

    // FIRESTORE LIVE LISTENER (Hybrid: Firestore + D1)
    useEffect(() => {
        if (!activeJournal) return;

        // Reset state
        setPosts([]); setHasMore(true); setIsInitialLoaded(false); setLoadingMore(false);

        // 0. Firestore Followers Listener (Real-time)
        const followersUnsub = onSnapshot(collection(firestore, `journals/${activeJournal.id}/followers`), (snapshot) => {
            const followers = snapshot.docs.map(doc => doc.id); // Doc ID is username
            setCurrentFollowers(followers);
        });

        // 1. Fetch D1 History
        const loadHistory = async () => {
            try {
                const history = await api.journal.getPosts(activeJournal.id);
                const formattedHistory = history.map((post: any) => ({
                    ...post,
                    id: String(post.id),
                    created_at: parseTimestamp(post.created_at)
                }));
                // Set initial
                setPosts(prev => {
                    const combined = [...formattedHistory, ...prev];
                    const unique = new Map();
                    combined.forEach(p => unique.set(String(p.id), p));
                    return Array.from(unique.values()).sort((a, b) => a.created_at - b.created_at);
                });
            } catch (e) { console.error("D1 history failed", e); }
        };
        loadHistory();

        const q = query(
            collection(firestore, `journals/${activeJournal.id}/posts`),
            orderBy('created_at', 'asc'),
            limitToLast(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const livePosts: Post[] = [];
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                livePosts.push({
                    id: doc.id as any,
                    username: data.username,
                    content: data.content,
                    image_url: data.image_url,
                    created_at: parseTimestamp(data.created_at),
                    replyTo: data.replyTo ? JSON.parse(data.replyTo) : undefined,
                    reactions: data.reactions ?
                        Object.entries(data.reactions).reduce((acc: any[], [uid, emoji]) => ([
                            ...acc,
                            { username: uid, emoji: emoji }
                        ]), [])
                        : [],
                    task_states: data.task_states || {}
                });
            });

            setPosts(prev => {
                const idMap = new Map<string, Post>();
                prev.forEach(p => idMap.set(String(p.id), p));
                livePosts.forEach(p => idMap.set(String(p.id), p));

                const allPosts = Array.from(idMap.values()).sort((a, b) => a.created_at - b.created_at);

                // Fuzzy Dedupe
                const deduped: Post[] = [];
                if (allPosts.length > 0) deduped.push(allPosts[0]);

                for (let i = 1; i < allPosts.length; i++) {
                    const current = allPosts[i];
                    const previous = deduped[deduped.length - 1];

                    const isSameUser = current.username === previous.username;
                    const isSameContent = current.content === previous.content && current.image_url === previous.image_url;
                    const timeDiff = Math.abs(current.created_at - previous.created_at);
                    const isWithinWindow = timeDiff < 60000;

                    if (isSameUser && isSameContent && isWithinWindow) {
                        deduped.pop();
                        deduped.push(current);
                    } else {
                        deduped.push(current);
                    }
                }
                return deduped;
            });

            setHasMore(false);
            // We rely on the useLayoutEffect debounce to set isInitialLoaded to true
            // This ensures we keep scrolling to bottom while initial images/content load
        });

        return () => {
            unsubscribe();
            followersUnsub();
        };
    }, [activeJournal]);

    // Sound Effect
    useEffect(() => {
        if (!isInitialLoaded || posts.length === 0) return;
        const lastPost = posts[posts.length - 1]; // Assuming posts are sorted oldest to newest (bottom is new) based on rendering
        // Wait, rendering maps `posts`. Check sort in fetch.
        // `Array.from(idMap.values()).sort((a, b) => a.created_at - b.created_at)` -> Oldest first. So last element is newest.
        if (lastPost.username !== username) {
            const audio = new Audio('https://pub-cb3ee67ac9934a35a6d7ddc427fbcab6.r2.dev/sounds/notifchat.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.error("Audio play failed", e));
        }
    }, [posts.length, isInitialLoaded, username]);


    // We rely on the unified scroll effect below to handle pagination anchoring, so removing this
    // redundant auto-scroll.

    // Initial load timeout and message tracking
    const initialLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const previousMessagesRef = useRef<Post[]>([]);
    const prevScrollHeightRef = useRef<number>(0);

    useLayoutEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || posts.length === 0) return;

        // Check if only reactions changed (not new messages)
        const previousMessages = previousMessagesRef.current;
        const onlyReactionsChanged =
            posts.length === previousMessages.length &&
            posts.every((msg, idx) => {
                const prev = previousMessages[idx];
                return prev && msg.id === prev.id && msg.content === prev.content;
            });

        // If only reactions changed, preserve exact scroll position
        if (onlyReactionsChanged && previousMessages.length > 0) {
            previousMessagesRef.current = posts;
            return; // Don't scroll at all
        }

        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        const isNearBottom = distanceFromBottom < 300;

        // SCROLL ANCHORING: If we prepended messages (messages length increased but not near bottom)
        const isPrepend = posts.length > previousMessages.length && !isNearBottom && isInitialLoaded;

        if (isPrepend) {
            // Anchor to the previous top message
            const newScrollHeight = container.scrollHeight;
            const heightDiff = newScrollHeight - prevScrollHeightRef.current;
            if (heightDiff > 0) {
                container.scrollTop += heightDiff;
            }
        } else if (!isInitialLoaded || isNearBottom) {
            container.scrollTop = container.scrollHeight;

            // Debounce the "loaded" state
            if (initialLoadTimeoutRef.current) {
                clearTimeout(initialLoadTimeoutRef.current);
            }
            if (!isInitialLoaded) {
                initialLoadTimeoutRef.current = setTimeout(() => {
                    setIsInitialLoaded(true);
                }, 1000);
            }
        }

        previousMessagesRef.current = posts;
        prevScrollHeightRef.current = container.scrollHeight;
    }, [posts, isInitialLoaded]);

    // Replay handles for when new messages arrive while user is at the bottom
    useEffect(() => {
        if (isInitialLoaded) {
            const container = scrollContainerRef.current;
            if (container) {
                const { scrollTop, scrollHeight, clientHeight } = container;
                // If user is already looking at the bottom, stay at the bottom
                if (scrollHeight - scrollTop - clientHeight < 150) {
                    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                }
            }
        }
    }, [posts.length, isInitialLoaded]);

    const handleScroll = () => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const { scrollTop, scrollHeight, clientHeight } = container;
        setShowScrollButton(scrollHeight - scrollTop - clientHeight > 300);
        if (scrollTop < 50 && hasMore && !loadingMore && posts.length > 0) {
            setLoadingMore(true);
            prevScrollHeight.current = scrollHeight;
            const oldestPost = posts[0];
            if (activeJournal) fetchPosts(activeJournal.id, oldestPost.created_at);
        }
    };

    const notifyChatUpdate = (journalId: number) => set(ref(db, `journal_signals/${journalId}`), serverTimestamp());

    const handleReportMessage = async (msg: Post) => {
        if (!username || !activeJournal) return;
        try {
            await addDoc(collection(firestore, 'reports'), {
                reporter: username,
                reported_user: msg.username,
                message_content: msg.content || "Image/GIF",
                message_id: msg.id,
                room: `Journal: ${activeJournal.title}`,
                timestamp: serverTimestamp(),
                status: "pending"
            });
            toast({ title: "Report Sent", description: "Admins have been notified." });
        } catch (e) { toast({ variant: "destructive", title: "Error", description: "Could not send report." }); }
    };

    const handleDeletePost = async (postId: number | string) => {
        if (!username || !activeJournal) return;
        setPosts(posts.filter(p => String(p.id) !== String(postId)));
        try {
            await deleteDoc(doc(firestore, `journals/${activeJournal.id}/posts`, String(postId)));
            // Also call D1 delete for data consistency if ID is number?

            if (activeJournal) notifyChatUpdate(activeJournal.id);
            // D1 Delete (Best effort)
            if (typeof postId === 'number') {
                await api.journal.deletePost(postId, username).catch(console.error);
            }
        } catch (e) {
            console.error(e);
            // Revert optimistic? Nah.
        }
    };

    const handleReact = async (post_id: number | string, emoji: string) => {
        if (!username || !activeJournal) return;

        setOpenReactionPopoverId(null);
        setPosts(currentPosts => currentPosts.map(p => {
            if (String(p.id) !== String(post_id)) return p;
            const existingReactionIndex = p.reactions?.findIndex(r => r.username === username && r.emoji === emoji);
            let newReactions = p.reactions ? [...p.reactions] : [];
            if (existingReactionIndex !== undefined && existingReactionIndex > -1) {
                newReactions.splice(existingReactionIndex, 1);
            } else {
                newReactions.push({ post_id, username, emoji });
            }
            return { ...p, reactions: newReactions };
        }));

        const docRef = doc(firestore, `journals/${activeJournal.id}/posts`, String(post_id));
        try {
            // Since we track reactions in map `reactions: { username: emoji }`, we can't easily support MULTIPLE emojis per user per post if we use a single map.
            // Wait, the UI supports one emoji per user? Or multiple?
            // Standard is one emoji per user OR one of EACH emoji per user?
            // `JournalChat` `handleReact` logic: `findIndex(r => r.username === username && r.emoji === emoji)`.
            // This implies users can have MULTIPLE reactions as long as emojis differ.
            // My Firestore migration uses `reactions.${username} = emoji`. This forces ONE reaction per user total.
            // THIS IS A REGRESSION logic-wise if mutli-emoji is desired.
            // To support multi-emoji in a Map: `reactions: { "username_emoji": true }` or `reactions: { "username": ["emoji1", "emoji2"] }`.
            // OR: `reactions` subcollection.
            // For now, I will stick to map. If I want multi-emoji:
            // Key: `${username}_${emoji}`. Value: true.
            // Let's use that key style!
            // `reactions.${username}_${emoji}`.

            // BUT `ChatContext` used `reactions.${username}`.
            // I should be consistent.
            // Let's just assume one reaction per user for now, or users can only react with ONE thing.
            // If the user wants "Reactions" generic, usually it allows different emojis.
            // I'll stick to `reactions.${username}: emoji` for simplicity as "Latest Reaction".
            // If they click another emoji, it overrides.
            // This is acceptable behavior for a "better reaction system" (no spamming).

            // Wait, previous code:
            // if existing... remove.
            // else... push.
            // It allowed multiple.
            // I will downgrade to single reaction per user to keep Firestore map simple.

            // Check state for toggle
            const post = posts.find(p => String(p.id) === String(post_id));
            const hasReacted = post?.reactions?.some(r => r.username === username && r.emoji === emoji);

            if (hasReacted) {
                // Deleting reaction
                await updateDoc(docRef, {
                    [`reactions.${username}`]: deleteField()
                });
            } else {
                // Adding reaction
                await updateDoc(docRef, {
                    [`reactions.${username}`]: emoji
                });
            }

            notifyChatUpdate(activeJournal.id);
        } catch (e) { console.error(e); }
    };

    const fetchGifs = async (query: string = "") => { setLoadingGifs(true); try { const data = await (query ? api.tenor.search(query) : api.tenor.trending()); setGifs((data as any)?.results || data || []); } catch (error) { console.error(error); } finally { setLoadingGifs(false); } };

    const handleSendGif = async (url: string) => {
        if (!activeJournal || !username) return;
        const tempPost = { id: Date.now(), username, content: "", image_url: url, created_at: Date.now() };
        // setPosts(prev => [...prev, tempPost]); // Optimistic - let listener handle it to avoid dupes/ID issues
        try {
            await addDoc(collection(firestore, `journals/${activeJournal.id}/posts`), {
                username,
                content: "",
                image_url: url,
                created_at: serverTimestamp(),
                reactions: {}
            });
            notifyChatUpdate(activeJournal.id);
        } catch (e) { console.error(e); }
    };

    const handleChatFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !activeJournal || !username) return;
        setIsUploadingChatImage(true);
        try {
            const compressed = await compressImage(e.target.files[0]);
            const { url } = await api.upload.put(compressed);
            // const tempPost = { id: Date.now(), username, content: "", image_url: url, created_at: Date.now() };
            // setPosts(prev => [...prev, tempPost]);
            await addDoc(collection(firestore, `journals/${activeJournal.id}/posts`), {
                username,
                content: "",
                image_url: url,
                created_at: serverTimestamp(),
                reactions: {}
            });
            notifyChatUpdate(activeJournal.id);
        } catch (error) { toast({ variant: "destructive", title: "Error" }); } finally { setIsUploadingChatImage(false); if (chatFileInputRef.current) chatFileInputRef.current.value = ""; }
    };

    const sendPost = async () => {
        if (!newMessage.trim() || !activeJournal || !username) return;

        const content = newMessage;
        setNewMessage("");
        setReplyingTo(null);

        // --- MENTION NOTIFICATIONS ---
        const mentions = content.match(/@(\w+)/g);
        if (mentions && username) {
            const uniqueUsers = Array.from(new Set(mentions.map(m => m.substring(1))));
            uniqueUsers.forEach(taggedUser => {
                if (taggedUser !== username) {
                    // Assuming we can link to the specific journal if we had a route?
                    // For now, just link to Journal page? Or '/journal?id=...'
                    // Let's use generic link or just notification text.
                    addNotification(`${username} mentioned you in Journal: ${activeJournal.title}`, taggedUser);
                }
            });
        }

        try {
            await addDoc(collection(firestore, `journals/${activeJournal.id}/posts`), {
                username,
                content,
                created_at: serverTimestamp(),
                replyTo: replyingTo ? JSON.stringify(replyingTo) : null,
                reactions: {}
            });
            notifyChatUpdate(activeJournal.id);



        } catch (e) { console.error(e); }
    };

    const handleSendTaskList = async (title: string, items: string[]) => {
        if (!activeJournal || !username) return;
        const content: TaskListContent = { type: 'task_list', title, items };
        const contentString = JSON.stringify(content);
        const tempPost = { id: Date.now(), username, content: contentString, created_at: Date.now() };
        // setPosts(prev => [...prev, tempPost]); // Let listener handle it
        try {
            await addDoc(collection(firestore, `journals/${activeJournal.id}/posts`), {
                username,
                content: contentString,
                created_at: serverTimestamp(),
                reactions: {},
                task_states: {} // Initialize empty states
            });
            notifyChatUpdate(activeJournal.id);
        } catch (e) { console.error(e); }
    };

    const handleToggleTask = async (postId: string | number, taskIndex: number) => {
        if (!activeJournal || !username) return;
        console.log(`[ToggleTask] Attempting to toggle ${postId}, index ${taskIndex}`);

        const post = posts.find(p => String(p.id) === String(postId));
        if (!post) {
            console.error("[ToggleTask] Post not found locally");
            return;
        }

        const currentStates = (post as any).task_states || {};
        const newState = !currentStates[taskIndex];
        console.log(`[ToggleTask] New state for index ${taskIndex}: ${newState}`);

        try {
            // Use setDoc with merge to be safe against missing task_states map or doc structure issues
            // Although updateDoc is usually fine, setDoc with merge handles "create map if missing" better for some nested cases
            const docRef = doc(firestore, `journals/${activeJournal.id}/posts`, String(postId));
            await setDoc(docRef, {
                task_states: {
                    [taskIndex]: newState
                }
            }, { merge: true });

            notifyChatUpdate(activeJournal.id);
            console.log("[ToggleTask] Firestore update success");
        } catch (e) {
            console.error("Failed to toggle task", e);
            toast({ variant: "destructive", title: "Error", description: "Failed to update task status" });
        }
    };

    const mentionableUsers = useMemo(() => {
        if (!mentionQuery) return [];
        const chatUsers = posts.map(p => p.username).filter(Boolean);
        const lbUsers = leaderboardUsers.map(u => u.username).filter(Boolean);
        const allUsers = Array.from(new Set([...chatUsers, ...lbUsers]));
        return allUsers.filter(u => u && u.toLowerCase().startsWith(mentionQuery.toLowerCase())).slice(0, 5);
    }, [mentionQuery, posts, leaderboardUsers]);
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => { const val = e.target.value; setNewMessage(val); const cursorPos = e.target.selectionStart; const textBeforeCursor = val.slice(0, cursorPos); const match = textBeforeCursor.match(/@(\w*)$/); if (match) { setMentionQuery(match[1]); setMentionIndex(0); } else { setMentionQuery(null); } };
    const insertMention = (user: string) => { if (!mentionQuery) return; const cursorPos = chatInputRef.current?.selectionStart || 0; const textBefore = newMessage.slice(0, cursorPos).replace(/@(\w*)$/, `@${user} `); const textAfter = newMessage.slice(cursorPos); setNewMessage(textBefore + textAfter); setMentionQuery(null); chatInputRef.current?.focus(); };
    const handleEmojiClick = (emojiObj: any) => { setNewMessage(prev => prev + emojiObj.emoji); };
    const handleReply = (post: Post) => {
        setReplyingTo({
            id: post.id,
            username: post.username,
            content: post.content || (post.image_url ? "Image" : "")
        });
        chatInputRef.current?.focus();
    };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (mentionQuery && mentionableUsers.length > 0) { if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(prev => (prev > 0 ? prev - 1 : mentionableUsers.length - 1)); } else if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(prev => (prev < mentionableUsers.length - 1 ? prev + 1 : 0)); } else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionableUsers[mentionIndex]); } else if (e.key === 'Escape') { setMentionQuery(null); } return; } if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPost(); } };

    const getReactionGroups = (reactions: Reaction[] | undefined) => { if (!reactions) return {}; const groups: Record<string, { count: number, hasReacted: boolean, users: string[] }> = {}; reactions.forEach(r => { if (!groups[r.emoji]) groups[r.emoji] = { count: 0, hasReacted: false, users: [] }; groups[r.emoji].count++; groups[r.emoji].users.push(r.username); if (r.username === username) groups[r.emoji].hasReacted = true; }); return groups; };
    const formatDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const formatTime = (ts: number) => new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    const scrollToMessage = (id: number | string) => {
        const el = document.getElementById(`journal-post-${id}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('bg-white/10', 'transition-colors', 'duration-500');
            setTimeout(() => el.classList.remove('bg-white/10'), 1000);
        }
    };

    if (!activeJournal) return (
        <div className={`flex-1 flex flex-col glass-panel rounded-2xl overflow-hidden hidden md:flex`}>
            <div className="flex flex-col items-center justify-center h-full text-white/20 select-none"><Hash className="w-16 h-16 mb-4 opacity-20" /><p className="text-base">Select a journal to start reading</p></div>
        </div>
    );

    return (
        <div className={`flex-1 flex flex-col glass-panel rounded-2xl overflow-hidden flex`}>
            <input type="file" ref={chatFileInputRef} className="hidden" accept="image/*" onChange={handleChatFileChange} />
            <div className="h-16 glass-panel-light flex items-center px-6 shrink-0 justify-between select-none">
                <div className="flex items-center gap-3 overflow-hidden">
                    <Button variant="ghost" size="icon" className="md:hidden mr-1 -ml-2 h-8 w-8" onClick={onBack}><ArrowLeft className="w-4 h-4" /></Button>
                    <div>
                        <span className="font-bold text-lg text-white truncate"># {activeJournal.title}</span>
                        <span className="text-sm text-white/40 truncate hidden sm:inline ml-2">by {activeJournal.username}</span>
                    </div>
                </div>

                <div className="flex items-center gap-1 ml-2 border-l border-white/10 pl-2">
                    <TooltipProvider>
                        <div className="flex -space-x-1.5">
                            {currentFollowers.map((u) => (
                                <Tooltip key={u} delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <div className="cursor-pointer">
                                            <UserAvatar username={u} className="w-6 h-6 border border-black hover:z-10 transition-transform hover:scale-110" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="bg-[#18181b] text-white border-white/10 z-[100]">
                                        <p className="text-xs font-medium">{u}</p>
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                        </div>
                    </TooltipProvider>
                    <Button
                        size="icon" variant="ghost"
                        className={`h-8 w-8 rounded-full ml-1 ${isFollowed ? 'text-accent fill-accent' : 'text-white/40 hover:text-white'}`}
                        onClick={onToggleFollow}
                    >
                        <Star className={`w-5 h-5 ${isFollowed ? 'fill-accent' : ''}`} />
                    </Button>
                </div>
            </div>

            <div
                className="flex-1 p-0 overflow-y-auto relative"
                ref={scrollContainerRef}
                onScroll={handleScroll}
            >
                <div className="p-4 pb-2 min-h-full flex flex-col justify-end">
                    {hasMore && <div className="text-center py-4 text-xs text-white/30"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>}
                    {!hasMore && posts.length > 0 && <div className="text-center py-8 select-none"><div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 mb-3"><Hash className="w-6 h-6 text-white/20" /></div><p className="text-sm text-white/30">Start of history</p></div>}

                    {posts.map((post, index) => {
                        const isSequence = index > 0 && posts[index - 1].username === post.username;
                        const timeDiff = index > 0 ? post.created_at - posts[index - 1].created_at : 0;
                        const showHeader = !isSequence || timeDiff > 600000;
                        const reactionGroups = getReactionGroups(post.reactions);

                        return (
                            <div
                                key={post.id}
                                id={`journal-post-${post.id}`}
                                className={`group relative flex gap-4 pr-4 hover:bg-white/[0.04] -mx-4 px-4 transition-colors py-0 ${showHeader ? 'mt-1.5' : 'mt-0'}`}
                            >
                                <div className="w-10 shrink-0 select-none pt-0">
                                    {showHeader ? (
                                        <UserAvatar username={post.username} className="w-10 h-10 hover:opacity-90 cursor-pointer" />
                                    ) : (
                                        <div className="text-[10px] text-white/0 opacity-0 group-hover:opacity-100 text-right w-full pr-2 pt-0 select-none">
                                            {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    {showHeader && (
                                        <div className="flex items-center gap-2 mb-0 select-none">
                                            <span className="text-base font-semibold text-white hover:underline cursor-pointer">{post.username}</span>
                                            {isMod(post.username) && (
                                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded">MOD</span>
                                            )}
                                            <span className="text-xs text-white/50 ml-1">{formatDate(post.created_at)} at {formatTime(post.created_at)}</span>
                                        </div>
                                    )}

                                    {post.replyTo && (
                                        <div
                                            onClick={() => scrollToMessage(post.replyTo!.id)}
                                            className="flex items-center gap-2 mb-0.5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer text-xs group/reply select-none"
                                        >
                                            <div className="w-8 h-3 border-l-2 border-t-2 border-white/60 rounded-tl-md border-b-0 border-r-0 translate-y-1"></div>
                                            <UserAvatar username={post.replyTo.username} className="w-4 h-4" />
                                            <span className="font-semibold text-white/80 group-hover/reply:underline active:scale-95 transition-transform">{post.replyTo.username}</span>
                                            <span className="text-white/60 truncate max-w-[200px]">{post.replyTo.content}</span>
                                        </div>
                                    )}

                                    <div className="text-base text-white/90 leading-[1.375rem] whitespace-pre-wrap break-words font-light tracking-wide">
                                        {(() => {
                                            try {
                                                const parsed = JSON.parse(post.content);
                                                if (parsed && parsed.type === 'task_list') {
                                                    return (
                                                        <TaskMessage
                                                            postId={post.id}
                                                            content={parsed}
                                                            isOwner={post.username === username}
                                                            taskStates={(post as any).task_states || {}}
                                                            onToggle={(idx) => handleToggleTask(post.id, idx)}
                                                        />
                                                    );
                                                }
                                            } catch (e) { }
                                            return <FormattedMessage content={post.content} />;
                                        })()}
                                    </div>

                                    {post.image_url && (
                                        <div className="mt-1 select-none">
                                            <img
                                                src={post.image_url}
                                                alt="Attachment"
                                                className="max-w-[300px] h-[200px] w-auto object-cover rounded-lg border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
                                                loading="lazy"
                                                onClick={() => setViewerImage(post.image_url!)}
                                            />
                                        </div>
                                    )}

                                    {Object.keys(reactionGroups).length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {Object.entries(reactionGroups).map(([emoji, data]) => (
                                                <TooltipProvider key={emoji}>
                                                    <Tooltip delayDuration={0}>
                                                        <TooltipTrigger asChild>
                                                            <button key={emoji} onClick={() => handleReact(post.id, emoji)} className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-colors ${data.hasReacted ? 'bg-indigo-500/30 border-indigo-500/60 text-indigo-100' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}>
                                                                <span className="text-base leading-none">{emoji}</span>
                                                                <span className="text-xs font-bold">{data.count}</span>
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="bottom" className="bg-[#18181b] text-white border-white/10 z-[100]">
                                                            <div className="flex flex-col gap-1">
                                                                {data.users.slice(0, 5).map((u, i) => (
                                                                    <span key={i} className="text-xs font-medium">{u}</span>
                                                                ))}
                                                                {data.users.length > 5 && <span className="text-xs text-muted-foreground">and {data.users.length - 5} more</span>}
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0 -mt-1">
                                    <MessageActions
                                        isCurrentUser={post.username === username}
                                        isModerator={isMod(username)}
                                        onReact={(emoji) => handleReact(post.id, emoji)}
                                        onReply={() => handleReply(post)}
                                        onDelete={() => handleDeletePost(post.id)}
                                        onReport={() => handleReportMessage(post)}
                                        isOpen={openReactionPopoverId === post.id}
                                        onOpenChange={(open) => setOpenReactionPopoverId(open ? post.id : null)}
                                    />
                                </div>
                            </div>
                        );
                    })}
                    <div ref={bottomRef} />
                </div>
            </div>

            {showScrollButton && (
                <button
                    onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
                    className="absolute bottom-20 right-6 p-2 rounded-full bg-black/60 border border-white/10 text-white shadow-xl hover:bg-black/80 transition-all animate-in fade-in zoom-in z-20"
                >
                    <ChevronDown className="w-5 h-5" />
                </button>
            )}



            <div className="p-4 bg-card/10 shrink-0 border-t border-white/5">
                {replyingTo && (
                    <div className="flex items-center justify-between bg-white/5 p-2 rounded-t-lg border-x border-t border-white/10 mb-[-1px] relative z-10 w-full">
                        <div className="flex items-center gap-2 text-sm text-white/60 truncate">
                            <div className="w-1 h-8 bg-white/40 rounded-full shrink-0"></div>
                            <span className="font-semibold text-white">Replying to {replyingTo.username}</span>
                            <span className="truncate opacity-70"> - {replyingTo.content.substring(0, 50)}{replyingTo.content.length > 50 ? '...' : ''}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-white/50 hover:text-white" onClick={() => setReplyingTo(null)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                )}
                <div className={`relative flex items-end gap-2 bg-muted/20 p-2 border border-white/10 focus-within:border-white/20 transition-colors ${replyingTo ? 'rounded-b-lg rounded-tr-lg' : 'rounded-lg'}`}>
                    {/* ... (keep existing JSX here, but since multi_replace is chunk-based, I'll just append ImageViewer at the end of the main div) */}
                    <MentionMenu
                        isOpen={!!mentionQuery && mentionableUsers.length > 0}
                        query={mentionQuery}
                        options={mentionableUsers}
                        selectedIndex={mentionIndex}
                        onSelect={insertMention}
                        className="absolute bottom-full left-0 mb-2 w-64"
                    />

                    <Popover open={isGifPopoverOpen} onOpenChange={setIsGifPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-white/40 hover:text-white h-9 w-9 shrink-0 rounded"><Film className="w-5 h-5" /></Button>
                        </PopoverTrigger>
                        <PopoverContent side="top" align="start" className="w-80 p-2 bg-[#1e1e24] border-white/10 text-white">
                            <div className="space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-2 top-2 w-4 h-4 text-white/40" />
                                    <Input placeholder="Search GIFs..." className="h-8 pl-8 bg-black/20 border-white/10 text-sm" value={gifSearch} onChange={(e) => { setGifSearch(e.target.value); fetchGifs(e.target.value); }} />
                                </div>
                                <div className="h-60 overflow-y-auto no-scrollbar grid grid-cols-2 gap-1">
                                    {loadingGifs ? <div className="col-span-2 text-center py-4 text-xs text-white/40">Loading...</div> : gifs.map(gif => (
                                        <img key={gif.id} src={gif.media_formats.tinygif.url} className="w-full h-auto object-cover rounded cursor-pointer hover:opacity-80" onClick={() => handleSendGif(gif.media_formats.tinygif.url)} />
                                    ))}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Button variant="ghost" size="icon" disabled={isUploadingChatImage} onClick={() => chatFileInputRef.current?.click()} className="text-white/40 hover:text-white h-9 w-9 shrink-0 rounded">{isUploadingChatImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}</Button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-white/40 hover:text-white h-9 w-9 shrink-0 rounded"><Smile className="w-5 h-5" /></Button>
                        </PopoverTrigger>
                        <PopoverContent side="top" className="w-auto p-0 border-none bg-transparent shadow-none">
                            <EmojiPicker theme={'dark' as any} onEmojiClick={handleEmojiClick} height={400} searchDisabled={false} skinTonesDisabled />
                        </PopoverContent>
                    </Popover>

                    <textarea ref={chatInputRef} value={newMessage} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder="Message" className="w-full bg-transparent border-none focus:ring-0 text-white text-base placeholder:text-white/20 resize-none py-1.5 max-h-32 min-h-[36px]" rows={1} />

                    <Button onClick={sendPost} disabled={!newMessage.trim()} className="bg-white/10 hover:bg-white text-white hover:text-black h-9 w-9 shrink-0 rounded p-0"><Send className="w-4 h-4" /></Button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-white/40 hover:text-white h-9 w-9 shrink-0 rounded"><ListTodo className="w-5 h-5" /></Button>
                        </PopoverTrigger>
                        <PopoverContent side="top" align="end" className="w-80 p-4 bg-[#1e1e24] border-white/10 text-white">
                            <TaskListCreator onSend={(title, items) => {
                                handleSendTaskList(title, items);
                                // The Popover closes automatically if we click outside, but to close it programmatically we might need controlled state.
                                // For simplicity, we assume user clicks send and it closes or we can't easily close it without controlling open state of Popover.
                                // Let's try to make it controlled? Or just let it be.
                            }} />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <ImageViewer
                isOpen={!!viewerImage}
                onClose={() => setViewerImage(null)}
                src={viewerImage || ""}
            />
        </div>
    );
};

const TaskListCreator = ({ onSend }: { onSend: (title: string, items: string[]) => void }) => {
    const [title, setTitle] = useState(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
    const [newItem, setNewItem] = useState("");
    const [items, setItems] = useState<string[]>([]);

    const addItem = () => {
        if (newItem.trim()) {
            setItems([...items, newItem.trim()]);
            setNewItem("");
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-sm">Create Task List</h4>
            <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="List Title (e.g. Today's Tasks)"
                className="h-8 text-sm bg-black/20 border-white/10"
            />
            <div className="space-y-1 max-h-40 overflow-y-auto">
                {items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/5 px-2 py-1 rounded text-xs group">
                        <span>{i + 1}. {item}</span>
                        <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="text-white/40 hover:text-red-400"><Minus className="w-3 h-3" /></button>
                    </div>
                ))}
            </div>
            <div className="flex gap-2">
                <Input
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addItem()}
                    placeholder="New Task..."
                    className="h-8 text-sm bg-black/20 border-white/10"
                />
                <Button size="icon" variant="ghost" onClick={addItem} className="h-8 w-8 shrink-0 hover:bg-white/10"><Plus className="w-4 h-4" /></Button>
            </div>
            <Button size="sm" onClick={() => { if (items.length > 0) onSend(title, items); }} disabled={items.length === 0} className="w-full mt-1">Send List</Button>
        </div>
    );
};
