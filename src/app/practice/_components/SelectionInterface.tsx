"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSubjects, getClasses, getChapters, getTopics, ChapterEntry, TopicEntry } from "../_lib/curriculumDb";
import { syncStorageTopicsToFirestore } from "../_lib/syncTopics";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export function SelectionInterface() {
  const router = useRouter();

  // Selected values
  const [subject, setSubject] = useState<string>("");
  const [classVal, setClassVal] = useState<string>("");
  const [chapterPath, setChapterPath] = useState<string>(""); // We now map the selected 'storagePath'
  const [topicStorageName, setTopicStorageName] = useState<string>("");
  
  // Quiz Options
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [timeLimit, setTimeLimit] = useState<number>(30);
  
  // Available Data
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [availableChapters, setAvailableChapters] = useState<ChapterEntry[]>([]);
  const [availableTopics, setAvailableTopics] = useState<TopicEntry[]>([]);
  
  // Loading states
  const [isLoadingInit, setIsLoadingInit] = useState(true);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  // Errors
  const [topicError, setTopicError] = useState<string | null>(null);

  // 1. Initial Load: Fetch Subjects
  useEffect(() => {
    async function loadInit() {
      try {
        const subs = await getSubjects();
        setAvailableSubjects(subs);
      } catch (err) {
        console.error("Failed to load subjects:", err);
      } finally {
        setIsLoadingInit(false);
      }
    }
    loadInit();
  }, []);

  // 2. Fetch Classes when Subject changes
  useEffect(() => {
    async function loadClasses() {
      if (!subject) return;
      setIsLoadingClasses(true);
      try {
        const cls = await getClasses(subject);
        setAvailableClasses(cls);
        setClassVal("");
        setChapterPath("");
        setTopicStorageName("");
      } finally {
        setIsLoadingClasses(false);
      }
    }
    loadClasses();
  }, [subject]);

  // 3. Fetch Chapters when Class changes
  useEffect(() => {
    async function loadChapters() {
      if (!subject || !classVal) return;
      setIsLoadingChapters(true);
      try {
        const chapters = await getChapters(subject, classVal);
        setAvailableChapters(chapters);
        setChapterPath("");
        setTopicStorageName("");
      } finally {
        setIsLoadingChapters(false);
      }
    }
    loadChapters();
  }, [subject, classVal]);

  // 4. Fetch Topics when Chapter changes (now strictly from Firestore mapping)
  useEffect(() => {
    async function loadTopics() {
      if (!chapterPath || !subject || !classVal) return;
      setIsLoadingTopics(true);
      setTopicError(null);
      setTopicStorageName("");
      setAvailableTopics([]);

      try {
        const mappedTopics = await getTopics(subject, classVal, chapterPath);
        if (mappedTopics.length === 0) setTopicError("No topics mapped. Run sync first.");
        else setAvailableTopics(mappedTopics);
      } catch (err) {
        console.error("Failed to load topics:", err);
        setTopicError("Failed to fetch topics.");
      } finally {
        setIsLoadingTopics(false);
      }
    }
    loadTopics();
  }, [chapterPath, subject, classVal]);

  const handleStartPractice = () => {
    if (!subject || !classVal || !chapterPath || !topicStorageName) return;
    
    const params = new URLSearchParams({
      subject,
      classVal,
      chapterPath,
      topic: topicStorageName, // We pass the raw storageName to the session!
      ...(isQuizMode ? { isQuiz: "true", timeLimit: timeLimit.toString() } : {})
    });
    
    router.push(`/practice/session?${params.toString()}`);
  };

  if (isLoadingInit) {
    return (
      <div className="flex justify-center p-10 h-64 items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-5xl w-full mx-auto p-6 border rounded-xl shadow-sm bg-card text-card-foreground text-left">
      <div className="grid grid-cols-12 gap-6">
        
        {/* Subject */}
        <div className="col-span-2 space-y-2">
          <Label htmlFor="subject" className="pl-1">Subject</Label>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger id="subject">
              <SelectValue placeholder="Select Subject" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto">
              {availableSubjects.map((sub) => (
                <SelectItem key={sub} value={sub}>{sub}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Class */}
        <div className="col-span-2 space-y-2 relative">
          <Label htmlFor="classVal" className="pl-1">Class</Label>
          <Select value={classVal} onValueChange={setClassVal} disabled={!subject || isLoadingClasses}>
            <SelectTrigger id="classVal">
              <SelectValue placeholder={isLoadingClasses ? "..." : "Select Class"} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto">
              {availableClasses.map((cls) => (
                <SelectItem key={cls} value={cls}>{cls}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Chapter */}
        <div className="col-span-4 space-y-2 relative">
          <Label htmlFor="chapter" className="pl-1">Chapter</Label>
          <Select value={chapterPath} onValueChange={setChapterPath} disabled={!classVal || isLoadingChapters || availableChapters.length === 0}>
            <SelectTrigger id="chapter">
              <SelectValue placeholder={isLoadingChapters ? "Loading..." : "Select Chapter"} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto">
              {availableChapters.map((chap) => (
                <SelectItem key={chap.storagePath} value={chap.storagePath}>
                  {chap.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Topic */}
        <div className="col-span-4 space-y-2">
          <Label htmlFor="topic" className="pl-1">Topic</Label>
          
          <div className="relative w-full">
            <Select value={topicStorageName} onValueChange={setTopicStorageName} disabled={!chapterPath || isLoadingTopics || availableTopics.length === 0}>
              <SelectTrigger id="topic">
                <SelectValue placeholder={isLoadingTopics ? "Loading topics..." : "Select Topic"} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {availableTopics.map((t) => (
                  <SelectItem key={t.storageName} value={t.storageName}>{t.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {isLoadingTopics && (
              <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
          </div>
          {topicError && (
            <p className="text-sm text-destructive mt-1 pl-1">{topicError}</p>
          )}
        </div>

        {/* Practice Mode Options */}
        <div className="col-span-12 pt-5 mt-2 border-t flex items-start gap-12">
          <div className="space-y-4">
            <Label className="pl-1">Practice Mode Options</Label>
            <div className="flex items-center gap-4">
              <Button 
                variant={!isQuizMode ? "default" : "outline"}
                onClick={() => setIsQuizMode(false)}
                className="w-40"
              >
                Practice Mode
              </Button>
              <Button 
                variant={isQuizMode ? "default" : "outline"}
                onClick={() => setIsQuizMode(true)}
                className="w-40"
              >
                Quiz Mode
              </Button>
            </div>
          </div>

          <div className="w-[300px]">
            {isQuizMode && (
               <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 pt-1 border-l pl-8">
                   <Label htmlFor="timeLimit" className="pl-1">Time Limit (Minutes)</Label>
                   <Select value={timeLimit.toString()} onValueChange={(val) => setTimeLimit(Number(val))}>
                     <SelectTrigger id="timeLimit">
                       <SelectValue placeholder="Select Time" />
                     </SelectTrigger>
                     <SelectContent>
                       {[15, 30, 45, 60].map(mins => (
                          <SelectItem key={mins} value={mins.toString()}>{mins} Minutes</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
               </div>
            )}
          </div>
          
          <div className="ml-auto mt-auto mb-1 flex items-center gap-4">
             <Button 
               className="w-[200px]" 
               size="lg" 
               disabled={!subject || !classVal || !chapterPath || !topicStorageName}
               onClick={handleStartPractice}
             >
               Start Solving
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
