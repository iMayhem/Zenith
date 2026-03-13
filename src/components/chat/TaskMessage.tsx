import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TaskListContent {
    type: 'task_list';
    title: string;
    items: string[];
}

interface TaskMessageProps {
    postId: number | string;
    content: TaskListContent;
    isOwner: boolean;
    taskStates: Record<number, boolean>;
    onToggle: (index: number) => void;
}

export const TaskMessage: React.FC<TaskMessageProps> = ({ postId, content, isOwner, taskStates, onToggle }) => {
    return (
        <div className="bg-[#1e1e24] rounded-lg p-2.5 pl-3 border border-white/10 w-full max-w-[340px] relative overflow-hidden mt-1 shadow-sm">
            {/* Green accent line */}
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#22c55e]"></div>

            <div className="ml-1 mb-2">
                <h3 className="text-white font-semibold text-[15px] leading-none">{content.title}</h3>
            </div>

            <div className="flex flex-col gap-1.5 ml-1">
                {content.items.map((item, idx) => {
                    const isCompleted = !!taskStates[idx];
                    return (
                        <div key={idx} className="flex items-start gap-2 group">
                            <span className="text-white/40 font-mono text-[11px] pt-[2px] w-3">{idx + 1}.</span>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggle(idx);
                                }}
                                disabled={!isOwner}
                                className={cn(
                                    "shrink-0 w-3.5 h-3.5 rounded-sm flex items-center justify-center transition-colors border-none mt-[2px]",
                                    isCompleted
                                        ? "bg-[#22c55e]"
                                        : "bg-[#ef4444]", // Red for unchecked as per prototype
                                    !isOwner && "cursor-default opacity-80"
                                )}
                            >
                                {isCompleted && <Check className="w-[10px] h-[10px] text-black font-bold" strokeWidth={4} />}
                            </button>

                            <div className={cn(
                                "text-[13px] text-white/90 leading-tight",
                                isCompleted && "opacity-60"
                            )}>
                                {item}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-2 ml-1 text-[9px] text-white/20 font-mono">
                © {new Date().getFullYear()} Liorea Task System
            </div>
        </div>
    );
};
