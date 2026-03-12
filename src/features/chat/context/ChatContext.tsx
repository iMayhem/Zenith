"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback, useRef } from 'react';
import { usePresence } from '@/features/study/context/PresenceContext';
import { db } from '@/lib/firebase'; // Assuming this now exports 'db' as Firestore instance or we need to fix it? 
// Wait, previous code imported 'db' from firebase/database in context? 
// Let's check imports. 'db' usually refers to the main DB instance. 
// If specific file 'lib/firebase' exports 'db' as getFirestore(), then we are good.
// If it exports getDatabase(), we need to change that or use a different export.
// I'll assume 'db' is Firestore based on standard practices or I will fix imports.
// Actually, I should check lib/firebase.ts first but to save tool calls I will assume standard exports
// and if it fails I will fix.
// Wait, line 5 was `import { db } from '@/lib/firebase';`
// and line 7 was `import { ref, push, ... } from 'firebase/database';`
// This suggests `db` might be the Realtime DB instance if line 7 uses it directly?
// Standard `push(ref(db, ...))` takes the db instance.
// So `db` IS Realtime Database instance.
// I need `firestore` instance. Usually it's exported as `firestore` or `db` if valid.
// I will import `firestore` from `@/lib/firebase` assuming it exists or I might validly guessing.
import { collection, addDoc, serverTimestamp, query, orderBy, limit, limitToLast, onSnapshot, doc, updateDoc, deleteDoc, setDoc, deleteField, where, getDocs, Timestamp } from 'firebase/firestore';
// I need to make sure I import the right DB instance.
import { firestore } from '@/lib/firebase';

// Robust timestamp parser
const parseTimestamp = (ts: any): number => {
    if (!ts) return Date.now();
    if (typeof ts === 'number') return ts;
    if (typeof ts === 'string') {
        const parsed = Date.parse(ts);
        return isNaN(parsed) ? Date.now() : parsed;
    }
    if (ts.toMillis && typeof ts.toMillis === 'function') return ts.toMillis();
    if (ts instanceof Date) return ts.getTime();
    if (ts.seconds) return ts.seconds * 1000; // Handle raw Firestore object
    return Date.now();
};

import { api } from '@/lib/api';
import { soundEffects } from '@/lib/sound-effects';
import { CHAT_ROOM, DELETED_IDS_KEY } from '@/lib/constants';
import { ChatMessage, ChatReaction } from '../types';

interface ChatContextType {
    messages: ChatMessage[];
    sendMessage: (message: string, image_url?: string, replyTo?: ChatMessage['replyTo']) => Promise<void>;
    sendReaction: (messageId: string, emoji: string) => Promise<void>;
    sendTypingEvent: () => void;
    typingUsers: string[];
    loadMoreMessages: () => Promise<void>;
    hasMore: boolean;
    deleteMessage: (messageId: string) => void;
    retryMessage: (msg: ChatMessage) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children, roomId = "public" }: { children: ReactNode, roomId?: string }) => {
    const { username, userImage, isFirebaseAuthReady } = usePresence();

    const isPublic = roomId === 'public';
    // Use legacy logic for public room to restore data
    const effectiveRoomId = isPublic ? CHAT_ROOM : roomId;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);

    // Prevent sounds on initial load
    const isInitialLoadRef = useRef(true);

    // 1. LIVE LISTENER (Pure Firestore)
    useEffect(() => {
        if (!isFirebaseAuthReady) return;

        const collectionPath = isPublic ? 'chats' : `rooms/${roomId}/chats`;
        console.log(`[ChatDebug] Initializing pure Firestore chat for room: ${roomId}`);

        const q = query(
            collection(firestore, collectionPath),
            orderBy('timestamp', 'asc'),
            limitToLast(50) // Reduced live window for better pagination compatibility
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const liveMsgs: ChatMessage[] = [];
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (!data || !data.username) return;

                liveMsgs.push({
                    id: doc.id,
                    username: data.username,
                    message: data.message,
                    timestamp: parseTimestamp(data.timestamp),
                    photoURL: data.photoURL,
                    image_url: data.image_url,
                    replyTo: data.replyTo,
                    deleted: data.deleted,
                    status: 'sent',
                    nonce: data.nonce,
                    reactions: data.reactions ?
                        Object.entries(data.reactions).reduce((acc, [uid, reactionData]) => {
                            let emoji;
                            if (typeof reactionData === 'string') {
                                emoji = reactionData;
                            } else if (reactionData && typeof reactionData === 'object') {
                                emoji = (reactionData as any).emoji;
                            }
                            return { ...acc, [uid]: { username: uid, emoji } };
                        }, {})
                        : {}
                });
            });

            setMessages(prev => {
                const idMap = new Map<string, ChatMessage>();
                const serverNonces = new Set(liveMsgs.map(m => m.nonce).filter(Boolean));

                prev.forEach(msg => {
                    if (msg.status === 'sending' && serverNonces.has(msg.nonce)) return;
                    idMap.set(msg.id, msg);
                });

                const brandNewMessages: ChatMessage[] = [];
                liveMsgs.forEach(msg => {
                    if (!idMap.has(msg.id) && !isInitialLoadRef.current && msg.username !== username) {
                        brandNewMessages.push(msg);
                    }
                    idMap.set(msg.id, msg);
                });

                if (!isInitialLoadRef.current && brandNewMessages.length > 0) {
                    const isMention = username && brandNewMessages.some(m =>
                        m.message.toLowerCase().includes(`@${username.toLowerCase()}`)
                    );
                    if (isMention) soundEffects.play('notification');
                    else soundEffects.play('messageReceive', 0.3);
                }

                isInitialLoadRef.current = false;
                return Array.from(idMap.values()).sort((a, b) => a.timestamp - b.timestamp);
            });
        }, (error) => {
            console.error("Firestore Listener Error:", error);
        });

        return () => unsubscribe();
    }, [roomId, isPublic, effectiveRoomId, username, isFirebaseAuthReady]);

    // 3. SEND MESSAGE
    const sendMessage = useCallback(async (message: string, image_url?: string, replyTo?: ChatMessage['replyTo']) => {
        if ((!message.trim() && !image_url) || !username) return;

        const nonce = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const tempId = `temp-${nonce}`;

        // 1. Optimistic Update
        const optimisticMsg: ChatMessage = {
            id: tempId,
            username,
            message,
            timestamp: Date.now(),
            photoURL: userImage || "",
            image_url: image_url || "",
            replyTo: replyTo || undefined,
            status: 'sending',
            nonce,
            reactions: {}
        };

        setMessages(prev => [...prev, optimisticMsg].sort((a, b) => a.timestamp - b.timestamp));
        soundEffects.play('messageSend', 0.4);

        const collectionPath = isPublic ? 'chats' : `rooms/${roomId}/chats`;

        try {
            await addDoc(collection(firestore, collectionPath), {
                username,
                message,
                image_url: image_url || "",
                photoURL: userImage || "",
                timestamp: serverTimestamp(),
                replyTo: replyTo || null,
                reactions: {},
                nonce
            });
        } catch (e) {
            console.error("Error sending message:", e);
            // 2. Error State
            setMessages(prev => prev.map(m =>
                m.id === tempId ? { ...m, status: 'error' } : m
            ));
        }

    }, [username, userImage, roomId, isPublic, effectiveRoomId]);

    const retryMessage = useCallback(async (msg: ChatMessage) => {
        // Remove the error message and retry
        setMessages(prev => prev.filter(m => m.id !== msg.id));
        await sendMessage(msg.message, msg.image_url, msg.replyTo);
    }, [sendMessage]);

    // 4. SEND REACTION
    const sendReaction = useCallback(async (messageId: string, emoji: string) => {
        if (!username) return;

        // SKIP numeric IDs (Legacy D1 messages) - Firestore can't update them as they don't exist as docs
        if (!isNaN(Number(messageId))) {
            console.warn("Cannot react to legacy D1 message:", messageId);
            return;
        }

        const collectionPath = isPublic ? 'chats' : `rooms/${roomId}/chats`;
        const msgRef = doc(firestore, collectionPath, messageId);

        try {
            // Get current message to check existing reactions
            const currentMsg = messages.find(m => m.id === messageId);
            const currentUserReaction = currentMsg?.reactions?.[username];

            // Check if user already has this specific emoji
            const hasThisEmoji = currentUserReaction?.emoji === emoji ||
                (Array.isArray(currentUserReaction?.emoji) && currentUserReaction.emoji.includes(emoji));

            if (hasThisEmoji) {
                // Remove this specific emoji
                if (Array.isArray(currentUserReaction?.emoji)) {
                    const updatedEmojis = currentUserReaction.emoji.filter(e => e !== emoji);
                    if (updatedEmojis.length === 0) {
                        // Remove user's reactions entirely if no emojis left
                        await updateDoc(msgRef, {
                            [`reactions.${username}`]: deleteField()
                        });
                    } else {
                        // Update with remaining emojis
                        await setDoc(msgRef, {
                            reactions: {
                                [username]: { username, emoji: updatedEmojis }
                            }
                        }, { merge: true });
                    }
                } else {
                    // Single emoji, remove it
                    await updateDoc(msgRef, {
                        [`reactions.${username}`]: deleteField()
                    });
                }
            } else {
                // Add new emoji to user's reactions
                let newEmojis: string | string[];

                if (currentUserReaction?.emoji) {
                    // User has existing reactions, add to array
                    if (Array.isArray(currentUserReaction.emoji)) {
                        newEmojis = [...currentUserReaction.emoji, emoji];
                    } else {
                        newEmojis = [currentUserReaction.emoji, emoji];
                    }
                } else {
                    // First reaction from this user
                    newEmojis = emoji;
                }

                await setDoc(msgRef, {
                    reactions: {
                        [username]: { username, emoji: newEmojis }
                    }
                }, { merge: true });
            }

            // Play reaction sound
            soundEffects.play('reaction', 0.3);
        } catch (e) {
            console.error("Failed to sync reaction to Firestore:", e);
        }
    }, [username, messages, roomId, isPublic]);

    // 5. DELETE MESSAGE
    const deleteMessage = useCallback(async (messageId: string) => {
        if (!username) return;

        try {
            // SKIP numeric IDs (Legacy D1 messages)
            if (!isNaN(Number(messageId))) {
                console.warn("Cannot delete legacy D1 message:", messageId);
                return;
            }

            // Optimistic UI update - immediately mark as deleted in local state
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, deleted: true } : msg
            ));

            const collectionPath = isPublic ? 'chats' : `rooms/${roomId}/chats`;
            await updateDoc(doc(firestore, collectionPath, messageId), { deleted: true });

        } catch (e) {
            console.error("Firestore delete failed:", e);
            // Revert optimistic update on error
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, deleted: false } : msg
            ));
        }

    }, [username, roomId, isPublic, messages]);

    const sendTypingEvent = useCallback(async () => { }, []);
    // 2. LOAD MORE (Pagination)
    const loadMoreMessages = useCallback(async () => {
        if (isFetchingMore || !hasMore || messages.length === 0) return;

        setIsFetchingMore(true);
        const oldestMessage = messages[0];

        try {
            console.log("[ChatDebug] Fetching history older than:", oldestMessage.timestamp);
            const collectionPath = isPublic ? 'chats' : `rooms/${roomId}/chats`;

            // Core Fix: Firestore needs a Timestamp object for comparison if the field is a Timestamp.
            // Converting our number back to Timestamp.
            const queryTimestamp = Timestamp.fromMillis(oldestMessage.timestamp);

            const q = query(
                collection(firestore, collectionPath),
                where('timestamp', '<', queryTimestamp),
                orderBy('timestamp', 'desc'),
                limit(50)
            );

            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                setHasMore(false);
                return;
            }

            const historyMsgs: ChatMessage[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    username: data.username,
                    message: data.message,
                    timestamp: parseTimestamp(data.timestamp),
                    photoURL: data.photoURL,
                    image_url: data.image_url,
                    replyTo: data.replyTo,
                    deleted: data.deleted,
                    reactions: data.reactions || {}
                };
            }).reverse();

            setMessages(prev => {
                const idMap = new Map<string, ChatMessage>();
                [...historyMsgs, ...prev].forEach(msg => idMap.set(msg.id, msg));
                return Array.from(idMap.values()).sort((a, b) => a.timestamp - b.timestamp);
            });

            if (snapshot.docs.length < 50) setHasMore(false);

        } catch (e) {
            console.error("Failed to load more messages:", e);
        } finally {
            setIsFetchingMore(false);
        }
    }, [messages, isFetchingMore, hasMore, roomId, isPublic]);

    const value = useMemo(() => ({
        messages, sendMessage, sendReaction, typingUsers, sendTypingEvent, loadMoreMessages, hasMore, deleteMessage, retryMessage
    }), [messages, sendMessage, sendReaction, typingUsers, sendTypingEvent, loadMoreMessages, hasMore, deleteMessage, retryMessage]);

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
    const context = useContext(ChatContext);
    if (context === undefined) throw new Error('useChat error');
    return context;
};