"use client";

import { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';


import { Send, MessageSquare, Plus, Film, Smile, Search, Trash2, Loader2, ChevronDown, Flag, Image as ImageIcon, X, Volume2, VolumeX } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { ChatMessage } from '../types';
import { usePresence } from '@/features/study/context/PresenceContext';
import { useNotifications } from '@/context/NotificationContext';
import UserAvatar from '@/components/UserAvatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import dynamic from 'next/dynamic';
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });
import { db } from '@/lib/firebase';
// import { ref, push, serverTimestamp } from 'firebase/database'; // Removed
import { useToast } from '@/hooks/use-toast';
import { compressImage } from '@/lib/compress';

import { api } from '@/lib/api';
import { FormattedMessage } from '@/components/chat/FormattedMessage';
import { MessageActions } from '@/components/chat/MessageActions';
import { MentionMenu } from '@/components/chat/MentionMenu';
import { ChatMessageItem } from './ChatMessageItem';
import { soundEffects } from '@/lib/sound-effects';

type TenorResult = { id: string; media_formats: { tinygif: { url: string }; mediumgif: { url: string }; gif: { url: string }; } }

interface ChatPanelProps {
    hideHeader?: boolean;
    hideSettings?: boolean;
}

export default function ChatPanel({ hideHeader, hideSettings }: ChatPanelProps = {}) {
    const {
        messages, sendMessage, sendReaction, sendTypingEvent,
        typingUsers, loadMoreMessages, hasMore, deleteMessage, retryMessage
    } = useChat();
    const { username, leaderboardUsers } = usePresence();
    const { addNotification } = useNotifications();
    const { toast } = useToast();
    const [newMessage, setNewMessage] = useState('');

    // SCROLL REFS
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [isInitialLoaded, setIsInitialLoaded] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const prevScrollHeight = useRef(0);

    // GIF & Emoji State
    const [gifs, setGifs] = useState<TenorResult[]>([]);
    const [gifSearch, setGifSearch] = useState("");
    const [loadingGifs, setLoadingGifs] = useState(false);
    const [openReactionPopoverId, setOpenReactionPopoverId] = useState<string | null>(null);
    const [isGifPopoverOpen, setIsGifPopoverOpen] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ id: string, username: string, message: string } | null>(null);

    const [debugLogs, setDebugLogs] = useState<string[]>([]);

    const handleReactionWrapped = async (id: string, emoji: string) => {
        setDebugLogs(prev => [`[${new Date().toLocaleTimeString()}] Reacting to ${id} with ${emoji}...`, ...prev]);
        try {
            await sendReaction(id, emoji);
            setDebugLogs(prev => [`[${new Date().toLocaleTimeString()}] Success`, ...prev]);
        } catch (e: any) {
            setDebugLogs(prev => [`[${new Date().toLocaleTimeString()}] Error: ${e?.message || e}`, ...prev]);
        }
    };




    useEffect(() => {
        if (isGifPopoverOpen && gifs.length === 0) {
            fetchGifs();
        }
    }, [isGifPopoverOpen]);

    // Image Upload State
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !username) return;

        setIsUploading(true);
        try {
            const compressed = await compressImage(e.target.files[0]);
            const { url } = await api.upload.put(compressed);
            sendMessage("", url); // Send message with image URL
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Image upload failed." });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // Mention State
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionIndex, setMentionIndex] = useState(0);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Pagination & Infinite Scroll
    const topSentinelRef = useRef<HTMLDivElement>(null);
    const [isInitialLoadingMore, setIsInitialLoadingMore] = useState(false);
    const prevScrollHeightRef = useRef<number>(0);

    // Observer for Top Sentinel (Load More)
    useEffect(() => {
        if (!hasMore) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && isInitialLoaded) {
                console.log("[ChatDebug] Top sentinel hit - triggers loadMore");
                loadMoreMessages();
            }
        }, { threshold: 1.0 });

        if (topSentinelRef.current) observer.observe(topSentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, isInitialLoaded, loadMoreMessages]);

    // Initial load timeout and message tracking
    const initialLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const previousMessagesRef = useRef<ChatMessage[]>([]);

    useLayoutEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || messages.length === 0) return;

        // Check if only reactions changed (not new messages)
        const previousMessages = previousMessagesRef.current;
        const onlyReactionsChanged =
            messages.length === previousMessages.length &&
            messages.every((msg, idx) => {
                const prev = previousMessages[idx];
                return prev && msg.id === prev.id && msg.message === prev.message;
            });

        // If only reactions changed, preserve exact scroll position
        if (onlyReactionsChanged && previousMessages.length > 0) {
            previousMessagesRef.current = messages;
            return; // Don't scroll at all
        }

        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        const isNearBottom = distanceFromBottom < 300;

        // SCROLL ANCHORING: If we prepended messages (messages length increased but not near bottom)
        const isPrepend = messages.length > previousMessages.length && !isNearBottom && isInitialLoaded;

        if (isPrepend) {
            // Anchor to the previous top message
            const newScrollHeight = container.scrollHeight;
            const heightDiff = newScrollHeight - prevScrollHeightRef.current;
            if (heightDiff > 0) {
                container.scrollTop += heightDiff;
            }
        } else if (!isInitialLoaded || isNearBottom) {
            container.scrollTop = container.scrollHeight;
            if (!isInitialLoaded) setIsInitialLoaded(true);
        }

        previousMessagesRef.current = messages;
        prevScrollHeightRef.current = container.scrollHeight;
    }, [messages, isInitialLoaded]);

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
    }, [messages.length, isInitialLoaded]);

    const handleScroll = () => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const { scrollTop, scrollHeight, clientHeight } = container;
        setShowScrollButton(scrollHeight - scrollTop - clientHeight > 300);
        if (scrollTop < 50 && hasMore) {
            prevScrollHeight.current = scrollHeight;
            loadMoreMessages();
        }
    };

    // --- ACTIONS ---

    const handleReply = (msg: ChatMessage) => {
        setReplyingTo({
            id: msg.id,
            username: msg.username,
            message: msg.message || (msg.image_url ? "Image" : "")
        });
        inputRef.current?.focus();
    };

    const handleSendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim()) return;

        const mentions = newMessage.match(/@(\w+)/g);
        if (mentions && username) {
            const uniqueUsers = Array.from(new Set(mentions.map(m => m.substring(1))));
            uniqueUsers.forEach(taggedUser => {
                if (taggedUser !== username) {
                    addNotification(`${username} mentioned you in Study Room`, taggedUser, '/study-together');
                }
            });
        }

        sendMessage(newMessage, undefined, replyingTo || undefined);
        setNewMessage('');
        setReplyingTo(null);
    };

    const handleSendGif = (url: string) => { sendMessage("", url); };

    const fetchGifs = async (query: string = "") => {
        setLoadingGifs(true);
        try {
            const data = await (query ? api.tenor.search(query) : api.tenor.trending());
            setGifs(data.results || []);
        } catch (error) { console.error("Failed to fetch GIFs", error); } finally { setLoadingGifs(false); }
    };

    const mentionableUsers = useMemo(() => {
        if (!mentionQuery) return [];
        const allUsers = leaderboardUsers.filter(u => u && u.username).map(u => u.username);
        return allUsers.filter(u => u && u.toLowerCase().startsWith(mentionQuery.toLowerCase())).slice(0, 5);
    }, [mentionQuery, leaderboardUsers]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setNewMessage(val);
        sendTypingEvent();
        const cursorPos = e.target.selectionStart || 0;
        const textBeforeCursor = val.slice(0, cursorPos);
        const match = textBeforeCursor.match(/@(\w*)$/);
        if (match) { setMentionQuery(match[1]); setMentionIndex(0); } else { setMentionQuery(null); }
    };

    const insertMention = (user: string) => {
        if (!mentionQuery) return;
        const cursorPos = inputRef.current?.selectionStart || 0;
        const textBefore = newMessage.slice(0, cursorPos).replace(/@(\w*)$/, `@${user} `);
        const textAfter = newMessage.slice(cursorPos);
        setNewMessage(textBefore + textAfter);
        setMentionQuery(null);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (mentionQuery && mentionableUsers.length > 0) {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionIndex(prev => (prev > 0 ? prev - 1 : mentionableUsers.length - 1));
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionIndex(prev => (prev < mentionableUsers.length - 1 ? prev + 1 : 0));
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertMention(mentionableUsers[mentionIndex]);
            } else if (e.key === 'Escape') {
                setMentionQuery(null);
            }
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const getTypingMessage = () => {
        if (typingUsers.length === 0) return null;
        if (typingUsers.length === 1) return `${typingUsers[0]} is typing...`;
        if (typingUsers.length === 2) return `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
        return 'Several people are typing...';
    };

    const formatDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const formatTime = (ts: number) => new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    const getReactionGroups = (reactions: Record<string, any> | undefined) => {
        if (!reactions) return {};
        const groups: Record<string, { count: number, hasReacted: boolean, users: string[] }> = {};
        Object.values(reactions).forEach((r: any) => {
            // Handle both single emoji (string) and multiple emojis (array)
            const emojis = Array.isArray(r.emoji) ? r.emoji : [r.emoji];
            emojis.forEach((emoji: string) => {
                if (!groups[emoji]) groups[emoji] = { count: 0, hasReacted: false, users: [] };
                groups[emoji].count++;
                groups[emoji].users.push(r.username);
                if (r.username === username) groups[emoji].hasReacted = true;
            });
        });
        return groups;
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-card/80 backdrop-blur-xl border border-border rounded-2xl overflow-hidden shadow-2xl">
            {/* Configurable Header */}
            {!hideHeader && (
                <div className="h-16 flex items-center px-6 py-5 shrink-0 justify-between select-none border-b border-border bg-card/50">
                    <div className="flex items-center gap-3">
                        <MessageSquare className="w-5 h-5 text-muted-foreground" />
                        <div>
                            <span className="font-bold text-base text-foreground">Study Room</span>
                            <span className="text-xs text-muted-foreground hidden sm:inline ml-2">General Channel</span>
                        </div>
                    </div>

                    {/* Mute Button */}
                    {!hideSettings && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                                soundEffects.setEnabled(!soundEffects.getEnabled());
                            }}
                        >
                            {soundEffects.getEnabled() ? (
                                <Volume2 className="w-4 h-4" />
                            ) : (
                                <VolumeX className="w-4 h-4" />
                            )}
                        </Button>
                    )}
                </div>
            )}

            {/* Chat Area */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 p-0 overflow-y-auto relative"
            >
                <div className="p-4 pb-2 min-h-full flex flex-col justify-end">
                    {/* Sentinel for Infinite Scroll */}
                    <div ref={topSentinelRef} className="h-4 w-full flex items-center justify-center">
                        {hasMore && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground opacity-50" />}
                    </div>

                    {messages.map((msg, index) => {
                        const isSequence = index > 0 && messages[index - 1].username === msg.username;
                        const timeDiff = index > 0 ? msg.timestamp - messages[index - 1].timestamp : 0;
                        const showHeader = !isSequence || timeDiff > 300000;

                        const isCurrentUser = msg.username === username;
                        const reactionGroups = getReactionGroups(msg.reactions);

                        return (
                            <ChatMessageItem
                                key={msg.id}
                                msg={msg}
                                isSequence={isSequence}
                                showHeader={showHeader}
                                isCurrentUser={isCurrentUser}
                                reactionGroups={reactionGroups}
                                openReactionPopoverId={openReactionPopoverId}
                                onReact={handleReactionWrapped}
                                onReply={() => handleReply(msg)}
                                onDelete={deleteMessage}
                                onRetry={() => retryMessage(msg)}
                                onOpenChange={(open) => setOpenReactionPopoverId(open ? msg.id : null)}
                                formatDate={formatDate}
                                formatTime={formatTime}
                            />
                        );
                    })}
                    <div ref={bottomRef} />
                </div>
            </div>

            {showScrollButton && (
                <button
                    onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
                    className="absolute bottom-20 right-6 p-2 rounded-full bg-popover border border-border text-popover-foreground shadow-xl hover:bg-popover/90 transition-all animate-in fade-in zoom-in z-20"
                >
                    <ChevronDown className="w-5 h-5" />
                </button>
            )}

            {typingUsers.length > 0 && (
                <div className="absolute bottom-16 left-4 text-xs text-muted-foreground italic animate-pulse bg-popover/50 px-2 py-1 rounded z-20">
                    {getTypingMessage()}
                </div>
            )}

            {/* Mention Dropup */}


            {/* Input Area - Journal Style */}
            <div className="p-4 shrink-0 bg-card/50 border-t border-border">
                {replyingTo && (
                    <div className="flex items-center justify-between bg-muted/30 p-2 rounded-t-lg border-x border-t border-border mb-[-1px] relative z-10">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground truncate">
                            <div className="w-1 h-8 bg-primary/40 rounded-full shrink-0"></div>
                            <span className="font-semibold text-primary">Replying to {replyingTo.username}</span>
                            <span className="truncate opacity-70"> - {replyingTo.message.substring(0, 50)}{replyingTo.message.length > 50 ? '...' : ''}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyingTo(null)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                )}
                <div className={`relative flex items-end gap-2 bg-muted/40 p-2 border border-border focus-within:border-primary/50 transition-colors ${replyingTo ? 'rounded-b-lg rounded-tr-lg' : 'rounded-lg'}`}>
                    {/* Mention Menu */}
                    <MentionMenu
                        isOpen={!!mentionQuery && mentionableUsers.length > 0}
                        query={mentionQuery}
                        options={mentionableUsers}
                        selectedIndex={mentionIndex}
                        onSelect={insertMention}
                        className="absolute bottom-full left-0 mb-2 w-64"
                    />

                    {/* Hidden Date Input for Image Upload */}
                    <Input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                    />

                    <Popover open={isGifPopoverOpen} onOpenChange={setIsGifPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-9 w-9 shrink-0 rounded"><Film className="w-5 h-5" /></Button>
                        </PopoverTrigger>
                        <PopoverContent side="top" align="start" className="w-80 p-2 bg-popover border-border text-popover-foreground">
                            <div className="space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-2 top-2 w-4 h-4 text-muted-foreground" />
                                    <Input placeholder="Search GIFs..." className="h-8 pl-8 bg-muted border-border text-sm" value={gifSearch} onChange={(e) => { setGifSearch(e.target.value); fetchGifs(e.target.value); }} />
                                </div>
                                <div className="h-60 overflow-y-auto no-scrollbar grid grid-cols-2 gap-1">
                                    {loadingGifs ? <div className="col-span-2 text-center py-4 text-xs text-muted-foreground">Loading...</div> : gifs.map(gif => (
                                        <img key={gif.id} src={gif.media_formats.tinygif.url} className="w-full h-auto object-cover rounded cursor-pointer hover:opacity-80" onClick={() => handleSendGif(gif.media_formats.mediumgif.url)} />
                                    ))}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Button variant="ghost" size="icon" disabled={isUploading} onClick={() => fileInputRef.current?.click()} className="text-muted-foreground hover:text-foreground h-9 w-9 shrink-0 rounded">
                        {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                    </Button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-9 w-9 shrink-0 rounded"><Smile className="w-5 h-5" /></Button>
                        </PopoverTrigger>
                        <PopoverContent side="top" className="w-auto p-0 border-none bg-transparent shadow-none">
                            <EmojiPicker theme={'dark' as any} onEmojiClick={(e) => setNewMessage(prev => prev + e.emoji)} height={400} searchDisabled={false} skinTonesDisabled className="custom-emoji-picker" />
                        </PopoverContent>
                    </Popover>

                    <textarea
                        ref={inputRef}
                        value={newMessage}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Message"
                        className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-foreground text-base placeholder:text-muted-foreground/50 resize-none py-1.5 max-h-32 min-h-[36px]"
                        rows={1}
                    />

                    <Button onClick={() => handleSendMessage()} disabled={!newMessage.trim()} className="bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground h-9 w-9 shrink-0 rounded p-0">
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>

        </div>
    );
}
