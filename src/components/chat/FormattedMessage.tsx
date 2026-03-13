"use client";

import React from 'react';

export const FormattedMessage = ({ content }: { content: string }) => {
    const parts = content.split(/(@\w+)/g);
    return (
        <span>
            {parts.map((part, i) => {
                if (part.startsWith('@')) {
                    return (
                        <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 font-medium cursor-pointer hover:bg-indigo-500/50 transition-colors select-none">
                            {part}
                        </span>
                    );
                }
                return part;
            })}
        </span>
    );
};
