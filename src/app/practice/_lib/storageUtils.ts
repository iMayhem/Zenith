import { storage } from "@/lib/firebase";
import { ref, listAll, getDownloadURL, getBytes } from "firebase/storage";

export interface QuestionData {
  name: string;
  url: string;
  number: number;
}

/**
 * Fetches available topic folders for a selected Chapter by reading Storage prefixes.
 * Now takes the full chapter storagePath (e.g. "Physics/Class 11/01 Units and Measurements")
 */
export const fetchTopics = async (chapterStoragePath: string): Promise<string[]> => {
  const folderRef = ref(storage, chapterStoragePath);
  const res = await listAll(folderRef);
  return res.prefixes.map(p => p.name);
};

/**
 * Loads all image questions for a specific topic, assigns URLs, and sorts by question number.
 */
export const fetchQuestions = async (chapterStoragePath: string, topic: string): Promise<QuestionData[]> => {
  const folderRef = ref(storage, `${chapterStoragePath}/${topic}`);
  const res = await listAll(folderRef);
  
  const fetchTasks = res.items.map(async (item) => {
    const url = await getDownloadURL(item);
    // e.g. "q_5.png" -> 5
    const match = item.name.match(/\d+/);
    const num = match ? parseInt(match[0], 10) : 0;
    return { name: item.name, url, number: num };
  });
  
  const questions = await Promise.all(fetchTasks);
  // Ensure array is properly sorted mathematically rather than alphabetically
  return questions.sort((a, b) => a.number - b.number);
};

/**
 * Retrieves answers.json mapped by question number locally overriding with cache API
 */
export const fetchAnswerKey = async (chapterStoragePath: string): Promise<Record<string, string> | null> => {
  const cacheKey = `answerKey_${chapterStoragePath.replace(/\//g, '_')}`;
  
  try {
    // 1. Try hitting local storage cache first
    const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
    if (cached) {
      return JSON.parse(cached);
    }
    
    // 2. Fetch from Firebase
    const keyRef = ref(storage, `${chapterStoragePath}/answers.json`);
    const buffer = await getBytes(keyRef);
    const decoder = new TextDecoder("utf-8");
    const jsonString = decoder.decode(buffer);
    const parsed = JSON.parse(jsonString);
    
    // 3. Keep in cache to limit Firebase queries significantly on repeat attempts
    if (typeof window !== 'undefined') {
      localStorage.setItem(cacheKey, JSON.stringify(parsed));
    }
    return parsed;
    
  } catch (error) {
    console.error(`Failed to fetch answer key for ${chapterStoragePath}:`, error);
    return null; // Graceful degradation for chapters without an answers.json file
  }
};
