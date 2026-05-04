"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PRACTICE_STRUCTURE, Subject, ClassLevel } from "../_lib/constants";
import { fetchTopics } from "../_lib/storageUtils";
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
  const [subject, setSubject] = useState<Subject | "">("");
  const [classVal, setClassVal] = useState<ClassLevel | "">("");
  const [chapter, setChapter] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [timeLimit, setTimeLimit] = useState<number>(30); // minutes
  
  const [availableChapters, setAvailableChapters] = useState<string[]>([]);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);

  // Update chapters when subject or class changes
  useEffect(() => {
    if (subject && classVal) {
      const chapters = [...(PRACTICE_STRUCTURE[subject]?.[classVal] || [])];
      setAvailableChapters(chapters);
      setChapter("");
      setTopic("");
      setAvailableTopics([]);
    }
  }, [subject, classVal]);

  // Update topics when chapter changes
  useEffect(() => {
    async function loadTopics() {
      if (!subject || !classVal || !chapter) return;
      
      setIsLoadingTopics(true);
      setTopicError(null);
      setTopic(""); // reset topic
      setAvailableTopics([]);

      try {
        const topics = await fetchTopics(subject, classVal, chapter);
        if (topics.length === 0) {
          setTopicError("No topics available for this chapter.");
        } else {
          setAvailableTopics(topics);
        }
      } catch (err) {
        console.error("Failed to load topics:", err);
        setTopicError("Failed to fetch topics from database. Check connection.");
      } finally {
        setIsLoadingTopics(false);
      }
    }
    
    loadTopics();
  }, [subject, classVal, chapter]);

  const handleStartPractice = () => {
    if (!subject || !classVal || !chapter || !topic) return;
    
    const params = new URLSearchParams({
      subject,
      classVal,
      chapter,
      topic,
      ...(isQuizMode ? { isQuiz: "true", timeLimit: timeLimit.toString() } : {})
    });
    
    router.push(`/practice/session?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-4 max-w-5xl w-full mx-auto p-6 border rounded-xl shadow-sm bg-card text-card-foreground text-left">
      <div className="grid grid-cols-12 gap-6">
        
        {/* Subject Selection */}
        <div className="col-span-2 space-y-2">
          <Label htmlFor="subject" className="pl-1">Subject</Label>
          <Select value={subject} onValueChange={(val: Subject) => setSubject(val)}>
            <SelectTrigger id="subject">
              <SelectValue placeholder="Select Subject" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(PRACTICE_STRUCTURE).map((sub) => (
                <SelectItem key={sub} value={sub}>{sub}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Class Selection */}
        <div className="col-span-2 space-y-2">
          <Label htmlFor="classVal" className="pl-1">Class</Label>
          <Select value={classVal} onValueChange={(val: ClassLevel) => setClassVal(val)} disabled={!subject}>
            <SelectTrigger id="classVal">
              <SelectValue placeholder="Select Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Class 11">Class 11</SelectItem>
              <SelectItem value="Class 12">Class 12</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Chapter Selection */}
        <div className="col-span-4 space-y-2">
          <Label htmlFor="chapter" className="pl-1">Chapter</Label>
          <Select value={chapter} onValueChange={setChapter} disabled={!subject || !classVal || availableChapters.length === 0}>
            <SelectTrigger id="chapter">
              <SelectValue placeholder="Select Chapter" />
            </SelectTrigger>
            <SelectContent>
              {availableChapters.map((chap) => (
                <SelectItem key={chap} value={chap}>
                  {chap.replace(/^\d+\s/, "")} {/* Shows without the number format gracefully */}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Topic Selection */}
        <div className="col-span-4 space-y-2">
          <Label htmlFor="topic" className="pl-1">Topic</Label>
          
          <div className="relative w-full">
            <Select value={topic} onValueChange={setTopic} disabled={!chapter || isLoadingTopics || availableTopics.length === 0}>
              <SelectTrigger id="topic">
                <SelectValue placeholder={isLoadingTopics ? "Loading topics..." : "Select Topic"} />
              </SelectTrigger>
              <SelectContent>
                {availableTopics.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
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

        {/* Practice Mode Toggle */}
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
          
          <div className="ml-auto mt-auto mb-1">
             <Button 
               className="w-[200px]" 
               size="lg" 
               disabled={!subject || !classVal || !chapter || !topic}
               onClick={handleStartPractice}
             >
               Start Practice
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
