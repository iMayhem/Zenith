import { firestore } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

/**
 * Types for the Firestore curriculum schema.
 */
export interface TopicEntry {
  displayName: string;
  storageName: string; // The raw folder name inside the chapter storagePath
  sortOrder: number;
}

export interface ChapterEntry {
  displayName: string;
  storagePath: string;
  sortOrder: number;
  topics?: TopicEntry[];
}

interface ClassData {
  chapters: ChapterEntry[];
}

interface SubjectDoc {
  displayName: string;
  classes: Record<string, ClassData>;
}

// In-memory cache to avoid repeated Firestore reads within a session
let cachedSubjects: string[] | null = null;
let cachedDocs: Record<string, SubjectDoc> = {};

/**
 * Fetches the full subject document from Firestore (with caching).
 */
async function getSubjectDoc(subject: string): Promise<SubjectDoc | null> {
  if (cachedDocs[subject]) return cachedDocs[subject];

  const snap = await getDoc(doc(firestore, "curriculum", subject));
  if (!snap.exists()) return null;

  const data = snap.data() as SubjectDoc;
  cachedDocs[subject] = data;
  return data;
}

/**
 * Returns all available subject names.
 */
export async function getSubjects(): Promise<string[]> {
  if (cachedSubjects) return cachedSubjects;

  const snap = await getDocs(collection(firestore, "curriculum"));
  cachedSubjects = snap.docs.map(d => d.data().displayName || d.id);
  return cachedSubjects;
}

/**
 * Returns class levels for a subject (e.g., ["Class 11", "Class 12"]).
 */
export async function getClasses(subject: string): Promise<string[]> {
  const subDoc = await getSubjectDoc(subject);
  if (!subDoc) return [];
  return Object.keys(subDoc.classes);
}

/**
 * Returns chapters for a subject + class, each with displayName and storagePath.
 */
export async function getChapters(subject: string, classVal: string): Promise<ChapterEntry[]> {
  const subDoc = await getSubjectDoc(subject);
  if (!subDoc || !subDoc.classes[classVal]) return [];
  return subDoc.classes[classVal].chapters.sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Returns topics for a specific chapter.
 */
export async function getTopics(subject: string, classVal: string, chapterStoragePath: string): Promise<TopicEntry[]> {
  const subDoc = await getSubjectDoc(subject);
  if (!subDoc || !subDoc.classes[classVal]) return [];
  
  const chapter = subDoc.classes[classVal].chapters.find(c => c.storagePath === chapterStoragePath);
  if (!chapter || !chapter.topics) return [];
  
  return [...chapter.topics].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Clears the in-memory cache (useful for admin tools that update curriculum).
 */
export function clearCurriculumCache() {
  cachedSubjects = null;
  cachedDocs = {};
}
