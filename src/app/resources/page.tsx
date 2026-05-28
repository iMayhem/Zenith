'use client';

import { Lock, Home } from 'lucide-react';
import Link from 'next/link';

export default function ResourcesPage() {
  return (
    <div className="h-full w-full min-h-[calc(100dvh-72px)] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
        
        {/* Glowing Lock Icon Container */}
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl blur-xl animate-pulse" />
          <div className="relative inline-flex items-center justify-center p-5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
            <Lock className="h-10 w-10" />
          </div>
        </div>

        {/* Text content */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Resources Locked
          </h1>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-xs mx-auto">
            The Resources library is temporarily locked. Check back later!
          </p>
        </div>

        {/* Action Button */}
        <Link href="/home" className="w-full">
          <button className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white text-black hover:bg-zinc-200 active:scale-[0.98] transition-all font-semibold text-sm">
            <Home className="w-4 h-4" />
            Back to Home
          </button>
        </Link>
      </div>
    </div>
  );
}
