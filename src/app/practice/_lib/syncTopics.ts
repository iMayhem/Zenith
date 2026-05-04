import { firestore } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { fetchTopics } from "./storageUtils";
import { getSubjects, getClasses, getChapters } from "./curriculumDb";

/**
 * Sweeps all existing chapters in Firestore.
 * For each chapter, it scans the Firebase Storage bucket for topic folders.
 * It writes those topics directly back into the chapter's Firestore document.
 * 
 * Run this once, then topics will be fully mapped and editable in Firestore.
 */
export async function syncStorageTopicsToFirestore(): Promise<void> {
  const subjects = await getSubjects();

  for (const subject of subjects) {
    // We update the whole document one subject at a time
    const subjectDocRef = doc(firestore, "curriculum", subject);
    const subjectSnap = await getDoc(subjectDocRef);
    if (!subjectSnap.exists()) continue;

    const data = subjectSnap.data() as any;
    let didUpdate = false;

    for (const classVal of Object.keys(data.classes)) {
      const chapters = data.classes[classVal].chapters;

      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        
        // If topics aren't mapped yet, or we want to force refresh:
        if (!chapter.topics || chapter.topics.length === 0) {
          try {
            console.log(`Scanning storage topics for: ${chapter.storagePath}`);
            const storageTopics = await fetchTopics(chapter.storagePath);
            
            // Map the raw storage folders to TopicEntry objects
            chapter.topics = storageTopics.map((topicName, idx) => ({
              displayName: topicName.replace(/^\d+\s/, ""), // Strip numbers
              storageName: topicName,
              sortOrder: idx
            }));
            
            didUpdate = true;
          } catch (e) {
            console.error(`Failed to scan topics for ${chapter.storagePath}`, e);
          }
        }
      }
    }

    if (didUpdate) {
      await updateDoc(subjectDocRef, data);
      console.log(`✅ Synced topics for ${subject} to Firestore.`);
    }
  }

  console.log("🎉 Complete! All topics are now mapped in Firestore.");
}
