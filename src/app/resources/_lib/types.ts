export interface ResourceNode {
  id: string;
  type: 'folder' | 'file';
  name: string;
  parentId: string | null; // null represents the root directory
  pdfUrl?: string; // Only present if type === 'file'
  createdAt: number;
}

export type FetchState = 'idle' | 'loading' | 'success' | 'error';
