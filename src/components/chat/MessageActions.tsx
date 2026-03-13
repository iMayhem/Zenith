"use client";

import React, { useState, useEffect } from 'react';
import { Smile, Trash2, Reply, Flag } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface MessageActionsProps {
    isCurrentUser: boolean;
    isModerator: boolean;
    onReact: (emoji: string) => void;
    onReply: () => void;
    onDelete: () => void;
    onReport?: () => void;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

// Default frequently used emojis
const DEFAULT_FREQUENT_EMOJIS = ['👍', '❤️', '😂'];

// Curated list of 20 most commonly used emojis
const ALL_EMOJIS = [
    // Positive reactions
    '👍', '❤️', '😂', '🔥', '✨',
    // Expressions
    '😊', '🎉', '👏', '💯', '🙌',
    // Thinking/Support
    '🤔', '👀', '💪', '🙏', '✅',
    // Misc popular
    '⭐', '💡', '🎯', '🚀', '😎'
];

export const MessageActions: React.FC<MessageActionsProps> = ({
    isCurrentUser,
    isModerator,
    onReact,
    onReply,
    onDelete,
    onReport,
    isOpen,
    onOpenChange
}) => {
    const [frequentEmojis, setFrequentEmojis] = useState<string[]>(DEFAULT_FREQUENT_EMOJIS);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Load frequently used emojis from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('frequent-emojis');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setFrequentEmojis(parsed.slice(0, 3)); // Always keep top 3
                }
            } catch (e) {
                console.error('Failed to parse frequent emojis:', e);
            }
        }
    }, []);

    // Track emoji usage
    const trackEmojiUsage = (emoji: string) => {
        try {
            const stored = localStorage.getItem('emoji-usage');
            const usage: Record<string, number> = stored ? JSON.parse(stored) : {};
            usage[emoji] = (usage[emoji] || 0) + 1;
            localStorage.setItem('emoji-usage', JSON.stringify(usage));

            // Update frequent emojis (top 3 most used)
            const sorted = Object.entries(usage)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([emoji]) => emoji);

            setFrequentEmojis(sorted);
            localStorage.setItem('frequent-emojis', JSON.stringify(sorted));
        } catch (e) {
            console.error('Failed to track emoji usage:', e);
        }
    };

    const handleReact = (emoji: string) => {
        trackEmojiUsage(emoji);
        onReact(emoji);
        setShowEmojiPicker(false);
    };

    return (
        <div className="flex items-center gap-1">
            {/* Emoji Reaction Button with Picker */}
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                    <button
                        className="hover:bg-accent/50 rounded p-1 transition-colors"
                        title="Add reaction"
                    >
                        <Smile className="w-3.5 h-3.5" />
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-64 p-0 bg-popover border-border"
                    align="start"
                    side="top"
                >
                    <div className="p-2">
                        {/* Frequently Used (Top 3) */}
                        <div className="mb-2">
                            <div className="text-xs font-medium text-muted-foreground mb-1 px-1">
                                Frequently Used
                            </div>
                            <div className="flex gap-1">
                                {frequentEmojis.map((emoji) => (
                                    <button
                                        key={emoji}
                                        onClick={() => handleReact(emoji)}
                                        className="hover:bg-accent/70 rounded p-2 text-xl transition-colors flex items-center justify-center"
                                        title={emoji}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* All Reactions */}
                        <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
                            All Reactions
                        </div>
                        <div className="grid grid-cols-5 gap-1 p-2"
                            style={{
                                maxHeight: '200px',
                                overflowY: 'auto'
                            }}
                        >
                            {ALL_EMOJIS.map((emoji) => (
                                <button
                                    key={emoji}
                                    onClick={() => handleReact(emoji)}
                                    className="hover:bg-accent/70 rounded p-2 text-xl transition-colors flex items-center justify-center"
                                    title={emoji}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            {/* Reply Button */}
            <button
                onClick={onReply}
                className="hover:bg-accent/50 rounded p-1 transition-colors"
                title="Reply"
            >
                <Reply className="w-3.5 h-3.5" />
            </button>

            {/* Delete Button (only for current user or moderators) */}
            {(isCurrentUser || isModerator) && (
                <button
                    onClick={onDelete}
                    className="hover:bg-destructive/20 text-destructive rounded p-1 transition-colors"
                    title="Delete message"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            )}

            {/* Report Button (for others) */}
            {onReport && !isCurrentUser && (
                <button
                    onClick={onReport}
                    className="hover:bg-destructive/20 text-destructive rounded p-1 transition-colors"
                    title="Report message"
                >
                    <Flag className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
};
