export type InstituteId = 'ALLEN' | 'AAKASH' | 'PHYSICS_WALLAH' | 'CAREER_WILL';

export interface InstituteOption {
  id: InstituteId;
  label: string; // Display label, e.g. "Physics Wallah"
}

export interface ResourceModule {
  id: string; // Firestore document ID
  institute: InstituteId;
  subject: string;
  displayName: string;
  pdfUrl: string;
  sortOrder: number;
  chapterName?: string;
  topicName?: string;
}

export type FetchState = 'idle' | 'loading' | 'success' | 'error';
