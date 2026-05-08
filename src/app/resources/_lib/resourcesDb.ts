import { firestore } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import type { ResourceNode } from './types';

/**
 * Fetches all child nodes for a given parent directory.
 * @param parentId The ID of the parent folder, or null for the root directory.
 */
export async function getNodes(parentId: string | null): Promise<ResourceNode[]> {
  const q = query(
    collection(firestore, 'resourceNodes'),
    where('parentId', '==', parentId),
    orderBy('type', 'desc'), // 'folder' > 'file', so folders appear first
    orderBy('createdAt', 'desc')
  );

  const snap = await getDocs(q);
  return snap.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<ResourceNode, 'id'>),
  }));
}
