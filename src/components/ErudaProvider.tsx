"use client";

import { useEffect } from 'react';

export default function ErudaProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        if (typeof window !== 'undefined') {
            import('eruda').then((eruda) => {
                eruda.default.init();
            });
        }
    }, []);

    return <>{children}</>;
}
