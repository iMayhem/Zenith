import { firestore } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import type { InstituteId, ResourceModule } from './types';

/**
 * Returns distinct subject names for a given institute.
 * Fetches all matching docs and deduplicates client-side
 * (avoids needing a separate subjects sub-collection).
 */
export async function getSubjects(institute: InstituteId): Promise<string[]> {
  const q = query(
    collection(firestore, 'resources'),
    where('institute', '==', institute)
  );
  const snap = await getDocs(q);
  const subjects = new Set<string>();
  snap.forEach(doc => subjects.add(doc.data().subject as string));
  return Array.from(subjects).sort();
}

/**
 * Returns all modules for a given institute + subject, ordered by sortOrder.
 */
export async function getModules(
  institute: InstituteId,
  subject: string
): Promise<ResourceModule[]> {
  const q = query(
    collection(firestore, 'resources'),
    where('institute', '==', institute),
    where('subject', '==', subject),
    orderBy('sortOrder', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<ResourceModule, 'id'>),
  }));
}
