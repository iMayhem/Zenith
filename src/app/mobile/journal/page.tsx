"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePresence } from '@/features/study';
import { useToast } from '@/hooks/use-toast';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { db, firestore } from '@/lib/firebase';
import { ref, onValue, set, serverTimestamp } from 'firebase/database';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { compressImage } from '@/lib/compress';
import { api } from '@/lib/api';
import { JournalSidebar } from '@/app/journal/components/JournalSidebar';
import { JournalChat } from '@/app/journal/components/JournalChat';
import { Journal } from '@/app/journal/types';
import MobileBottomNav from '../components/MobileBottomNav';
import { Skeleton } from '@/components/ui/skeleton';

function MobileJournalContent() {
    const { username, leaderboardUsers } = usePresence();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [journals, setJournals] = useState<Journal[]>([]);
    const [activeJournal, setActiveJournal] = useState<Journal | null>(null);
    const [followedIds, setFollowedIds] = useState<number[]>([]);
    const [newTitle, setNewTitle] = useState("");
    const [newTags, setNewTags] = useState("");
    const [journalToDelete, setJournalToDelete] = useState<number | null>(null);
    const [updatingJournalId, setUpdatingJournalId] = useState<number | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const cardFileInputRef = useRef<HTMLInputElement>(null);

    const fetchJournals = async () => { try { const data = await api.journal.list(); setJournals(data); } catch (e) { console.error(e); } };

    useEffect(() => {
        const init = async () => {
            if (username) { try { const data = await api.journal.getFollowing(username); setFollowedIds(data); } catch (e) { } }
            if (journals.length === 0) await fetchJournals();
            const targetId = searchParams.get('id');
            if (targetId) {
                const found = journals.find(j => j.id.toString() === targetId);
                if (!found) {
                    try { const list = await api.journal.list(); setJournals(list); const freshFound = list.find(j => j.id.toString() === targetId); if (freshFound) { setActiveJournal(freshFound); } } catch (e) { }
                } else { setActiveJournal(found); }
            } else { setActiveJournal(null); }
        };
        init();
        const globalRef = ref(db, 'journal_global_signal/last_updated');
        const unsubscribe = onValue(globalRef, (snapshot) => { if (snapshot.exists()) fetchJournals(); });
        return () => unsubscribe();
    }, [searchParams, username]);

    const notifyGlobalUpdate = () => set(ref(db, 'journal_global_signal/last_updated'), serverTimestamp());

    const handleOpenJournal = (journal: Journal) => { router.push(`/mobile/journal?id=${journal.id}`); };
    const handleBackToGallery = () => { router.push('/mobile/journal'); };

    const createJournal = async () => {
        if (!newTitle.trim() || !username) return;
        try {
            await api.journal.create({ username, title: newTitle, tags: newTags, images: "", theme: "bg-black" });
            setNewTitle(""); setNewTags(""); setIsCreateDialogOpen(false); notifyGlobalUpdate();
        } catch (e) { console.error(e); }
    };

    const handleDeleteJournal = async () => {
        if (!journalToDelete || !username) return;
        try {
            await api.journal.delete(journalToDelete, username);
            toast({ title: "Deleted" });
            setJournalToDelete(null);
            if (activeJournal?.id === journalToDelete) router.push('/mobile/journal');
            notifyGlobalUpdate();
        } catch (e) { console.error(e); }
    };

    const handleCardUploadClick = (journalId: number, e: React.MouseEvent) => { e.stopPropagation(); setUpdatingJournalId(journalId); cardFileInputRef.current?.click(); };

    const handleCardFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !updatingJournalId || !username) return;
        const files = Array.from(e.target.files);
        if (files.length > 4) { toast({ variant: "destructive", title: "Limit" }); return; }
        toast({ title: "Uploading..." });
        try {
            const urls: string[] = [];
            for (const file of files) {
                const compressed = await compressImage(file);
                const { url } = await api.upload.put(compressed);
                urls.push(url);
            }
            await api.journal.updateImages(updatingJournalId, urls.join(","), username);
            notifyGlobalUpdate();
        } catch (error) { toast({ variant: "destructive", title: "Error" }); } finally { setUpdatingJournalId(null); if (cardFileInputRef.current) cardFileInputRef.current.value = ""; }
    };

    const handleFollowToggle = async () => {
        if (!activeJournal || !username) return;
        const isFollowing = followedIds.includes(activeJournal.id);

        if (isFollowing) {
            setFollowedIds(prev => prev.filter(id => id !== activeJournal.id));
        } else {
            setFollowedIds(prev => [...prev, activeJournal.id]);
        }

        try {
            const followerRef = doc(firestore, `journals/${activeJournal.id}/followers/${username}`);
            if (isFollowing) {
                await Promise.all([api.journal.follow(activeJournal.id, username), deleteDoc(followerRef)]);
            } else {
                await Promise.all([api.journal.follow(activeJournal.id, username), setDoc(followerRef, { username, followed_at: serverTimestamp() })]);
            }
        } catch (e) {
            console.error("Follow toggle failed", e);
        }
    };

    const sortedJournals = useMemo(() => { return [...journals].sort((a, b) => { const aFollow = followedIds.includes(a.id) ? 1 : 0; const bFollow = followedIds.includes(b.id) ? 1 : 0; if (aFollow !== bFollow) return bFollow - aFollow; return b.last_updated - a.last_updated; }); }, [journals, followedIds]);

    if (!username) {
        return <Skeleton className="h-full w-full bg-black/40" />;
    }

    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden relative">
            <input type="file" ref={cardFileInputRef} className="hidden" accept="image/*" multiple onChange={handleCardFileChange} />

            <div className="flex-1 w-full h-full relative">
                {/* Master View (Sidebar Grid) */}
                {!activeJournal && (
                    <div className="absolute inset-0 p-4 pb-0 no-scrollbar overflow-y-auto">
                        <JournalSidebar
                            sortedJournals={sortedJournals}
                            activeJournal={activeJournal}
                            followedIds={followedIds}
                            username={username || ""}
                            onOpenJournal={handleOpenJournal}
                            onUploadClick={handleCardUploadClick}
                            onDeleteClick={setJournalToDelete}
                            newTitle={newTitle}
                            setNewTitle={setNewTitle}
                            newTags={newTags}
                            setNewTags={setNewTags}
                            onCreateJournal={createJournal}
                            isCreateDialogOpen={isCreateDialogOpen}
                            setIsCreateDialogOpen={setIsCreateDialogOpen}
                        />
                    </div>
                )}

                {/* Detail View (Chat) */}
                {activeJournal && (
                    <div className="absolute inset-0">
                        <JournalChat
                            activeJournal={activeJournal}
                            username={username || ""}
                            isFollowed={followedIds.includes(activeJournal.id)}
                            onToggleFollow={handleFollowToggle}
                            onBack={handleBackToGallery}
                            leaderboardUsers={leaderboardUsers}
                        />
                    </div>
                )}
            </div>

            <AlertDialog open={!!journalToDelete} onOpenChange={() => setJournalToDelete(null)}>
                <AlertDialogContent className="bg-black/40 backdrop-blur-xl border-white/20 text-white w-[90vw] max-w-lg rounded-2xl">
                    <AlertDialogHeader><AlertDialogTitle>Delete Journal?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel className="bg-transparent border-white/20 text-white hover:bg-white/10">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteJournal} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <MobileBottomNav />
        </div>
    );
}

export default function MobileJournalRoute() {
    return (
        <Suspense fallback={<Skeleton className="h-full w-full bg-black/40" />}>
            <MobileJournalContent />
        </Suspense>
    );
}
