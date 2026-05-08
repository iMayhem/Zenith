# Design Document: Resources PDF Viewer

## Overview

The Resources feature replaces the existing `/practice` (PYQ/MCQ) section with a `/resources` section where users browse coaching institute module PDFs (ALLEN, AAKASH, PHYSICS WALLAH, CAREER WILL) and open them in an embedded in-app PDF viewer. The feature is a pure client-side page backed by Firestore, with no new npm dependencies — PDF rendering uses a native `<iframe>` element.

The existing `/practice` route and all MCQ-related components are removed. Permanent redirects ensure no broken links remain. Navigation in `Header.tsx` is updated to point to `/resources` with the `BookOpen` icon.

---

## Architecture

```
Browser
│
├── /resources (Next.js App Router page)
│   │
│   ├── layout.tsx          — metadata wrapper
│   └── page.tsx            — orchestrates all state, renders child components
│       │
│       ├── InstituteSelector   — 4-button grid, emits selectedInstitute
│       ├── SubjectList         — list of subjects for selected institute
│       ├── ModuleList          — module cards for selected subject
│       └── PdfViewer           — iframe viewer, shown when a module is open
│
├── _lib/
│   ├── types.ts            — shared TypeScript interfaces
│   └── resourcesDb.ts      — Firestore query functions (getSubjects, getModules)
│
└── Firestore
    └── resources/          — collection
        └── {docId}         — document: institute, subject, displayName,
                              pdfUrl, sortOrder, chapterName?, topicName?
```

### Request / Data Flow

```
User selects institute
  → page.tsx calls getSubjects(institute)
    → Firestore query: resources WHERE institute == X (distinct subjects)
      → SubjectList renders

User selects subject
  → page.tsx calls getModules(institute, subject)
    → Firestore query: resources WHERE institute == X AND subject == Y ORDER BY sortOrder ASC
      → ModuleList renders

User selects module
  → page.tsx sets activeModule state
    → PdfViewer renders with pdfUrl
      → <iframe src={pdfUrl}> loads PDF
```

---

## Firestore Schema

### Collection: `resources`

Each document represents one PDF module.

| Field         | Type   | Required | Description                                              |
|---------------|--------|----------|----------------------------------------------------------|
| `institute`   | string | ✓        | One of `"ALLEN"`, `"AAKASH"`, `"PHYSICS_WALLAH"`, `"CAREER_WILL"` |
| `subject`     | string | ✓        | e.g. `"Physics"`, `"Chemistry"`, `"Biology"`, `"Mathematics"` |
| `displayName` | string | ✓        | Human-readable module name shown in the UI               |
| `pdfUrl`      | string | ✓        | Direct URL to the PDF (Firebase Storage or CDN)          |
| `sortOrder`   | number | ✓        | Ascending sort within a subject                          |
| `chapterName` | string | ✗        | Optional chapter label                                   |
| `topicName`   | string | ✗        | Optional topic label                                     |

**Example document:**
```json
{
  "institute": "ALLEN",
  "subject": "Physics",
  "displayName": "Mechanics Module 1",
  "pdfUrl": "https://firebasestorage.googleapis.com/...",
  "sortOrder": 1,
  "chapterName": "Kinematics",
  "topicName": "Projectile Motion"
}
```

**Recommended Firestore composite index:**
- `institute` ASC + `subject` ASC + `sortOrder` ASC

---

## TypeScript Interfaces (`_lib/types.ts`)

```typescript
export type InstituteId = 'ALLEN' | 'AAKASH' | 'PHYSICS_WALLAH' | 'CAREER_WILL';

export interface InstituteOption {
  id: InstituteId;
  label: string;       // Display label, e.g. "Physics Wallah"
}

export interface ResourceModule {
  id: string;          // Firestore document ID
  institute: InstituteId;
  subject: string;
  displayName: string;
  pdfUrl: string;
  sortOrder: number;
  chapterName?: string;
  topicName?: string;
}

export type FetchState = 'idle' | 'loading' | 'success' | 'error';
```

---

## Data Layer (`_lib/resourcesDb.ts`)

```typescript
import { firestore } from '@/lib/firebase';
import {
  collection, query, where, orderBy, getDocs
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
```

---

## Component Breakdown

### `page.tsx` — State Orchestrator

Holds all page-level state. No global store needed.

```typescript
// State shape
const [selectedInstitute, setSelectedInstitute] = useState<InstituteId | null>(null);
const [selectedSubject, setSelectedSubject]     = useState<string | null>(null);
const [activeModule, setActiveModule]           = useState<ResourceModule | null>(null);

const [subjects, setSubjects]   = useState<string[]>([]);
const [modules, setModules]     = useState<ResourceModule[]>([]);

const [subjectFetch, setSubjectFetch] = useState<FetchState>('idle');
const [moduleFetch, setModuleFetch]   = useState<FetchState>('idle');
```

**Render logic:**
- If `activeModule !== null` → render `<PdfViewer>`
- Else → render `<InstituteSelector>` + (if institute selected) `<SubjectList>` + (if subject selected) `<ModuleList>`

**Institute selection handler:**
```typescript
async function handleInstituteSelect(institute: InstituteId) {
  setSelectedInstitute(institute);
  setSelectedSubject(null);
  setActiveModule(null);
  setModules([]);
  setSubjectFetch('loading');
  try {
    const data = await getSubjects(institute);
    setSubjects(data);
    setSubjectFetch('success');
  } catch {
    setSubjectFetch('error');
  }
}
```

**Subject selection handler:**
```typescript
async function handleSubjectSelect(subject: string) {
  setSelectedSubject(subject);
  setActiveModule(null);
  setModuleFetch('loading');
  try {
    const data = await getModules(selectedInstitute!, subject);
    setModules(data);
    setModuleFetch('success');
  } catch {
    setModuleFetch('error');
  }
}
```

---

### `InstituteSelector.tsx`

**Props:**
```typescript
interface InstituteSelectorProps {
  selected: InstituteId | null;
  onSelect: (institute: InstituteId) => void;
}
```

**Behaviour:**
- Renders a 2×2 grid of buttons for the four institutes.
- Selected institute button gets `bg-white/10 text-white` active styling.
- Institute labels: `{ ALLEN: 'ALLEN', AAKASH: 'AAKASH', PHYSICS_WALLAH: 'Physics Wallah', CAREER_WILL: 'Career Will' }`

---

### `SubjectList.tsx`

**Props:**
```typescript
interface SubjectListProps {
  subjects: string[];
  selected: string | null;
  fetchState: FetchState;
  onSelect: (subject: string) => void;
  onRetry: () => void;
}
```

**Behaviour:**
- `fetchState === 'loading'` → spinner
- `fetchState === 'error'` → error message + "Retry" button (calls `onRetry`)
- `fetchState === 'success'` and `subjects.length === 0` → "No modules available" message
- `fetchState === 'success'` and subjects present → horizontal scrollable pill list or vertical list of subject buttons
- Selected subject gets active styling

---

### `ModuleList.tsx`

**Props:**
```typescript
interface ModuleListProps {
  modules: ResourceModule[];
  fetchState: FetchState;
  onSelect: (module: ResourceModule) => void;
  onRetry: () => void;
}
```

**Behaviour:**
- `fetchState === 'loading'` → spinner
- `fetchState === 'error'` → error message + "Retry" button
- `fetchState === 'success'` and `modules.length === 0` → "No modules available" message
- `fetchState === 'success'` and modules present → list of cards, each showing:
  - `displayName` (primary text)
  - If `chapterName` or `topicName` present: secondary line formatted as `"chapterName — topicName"` (omitting whichever is absent)
- Clicking a card calls `onSelect(module)`

---

### `PdfViewer.tsx`

**Props:**
```typescript
interface PdfViewerProps {
  module: ResourceModule;
  onClose: () => void;
}
```

**Internal state:**
```typescript
type ViewerState = 'loading' | 'loaded' | 'error' | 'timeout';
const [viewerState, setViewerState] = useState<ViewerState>('loading');
```

**Behaviour:**
- Renders a full-viewport overlay (or full-height panel) with:
  - Header bar: back/close button (calls `onClose`) + `module.displayName` title
  - `<iframe src={module.pdfUrl} ...>` fills remaining height
- On mount, starts a 10-second `setTimeout`. If `onLoad` fires before timeout → `setViewerState('loaded')`. If timeout fires first → `setViewerState('timeout')`.
- `iframe` `onLoad` → clears timeout, sets state to `'loaded'`
- `iframe` `onError` → clears timeout, sets state to `'error'`
- `viewerState === 'loading'` → overlay spinner on top of iframe
- `viewerState === 'timeout'` or `'error'` → hides iframe, shows error message with:
  - "Retry" button: resets state to `'loading'`, remounts iframe (via key prop increment)
  - "Back" button: calls `onClose`

**iframe attributes:**
```tsx
<iframe
  key={retryKey}           // increment on retry to force remount
  src={module.pdfUrl}
  className="w-full flex-1 border-0"
  title={module.displayName}
  onLoad={() => { clearTimeout(timeoutRef.current); setViewerState('loaded'); }}
  onError={() => { clearTimeout(timeoutRef.current); setViewerState('error'); }}
/>
```

---

## Redirect Strategy

Add redirects to `next.config.ts` using the `redirects` async function:

```typescript
async redirects() {
  return [
    {
      source: '/practice',
      destination: '/resources',
      permanent: true,   // HTTP 308
    },
    {
      source: '/practice/session',
      destination: '/resources',
      permanent: true,
    },
    {
      source: '/practice/history',
      destination: '/resources',
      permanent: true,
    },
  ];
},
```

The existing `src/app/practice/` directory is deleted entirely after redirects are in place.

---

## Navigation Changes (`Header.tsx`)

Two locations need updating — both the desktop nav and the mobile Sheet menu.

**Desktop nav** — replace the `/practice` link:
```tsx
// Before
<Link href="/practice" className={cn(..., pathname === '/practice' && 'bg-white/10 text-white')}>
  <BookOpen className="w-4 h-4" />
  <span>PYQ</span>
</Link>

// After
<Link href="/resources" className={cn(..., pathname.startsWith('/resources') && 'bg-white/10 text-white')}>
  <BookOpen className="w-4 h-4" />
  <span>Resources</span>
</Link>
```

**Mobile Sheet menu** — replace the `/practice` link:
```tsx
// Before
<Link href="/practice" className={cn(..., pathname === '/practice' && 'bg-white/10 text-white font-medium')}>
  <BookOpen className="w-5 h-5" />
  Previous Year Questions
</Link>

// After
<Link href="/resources" className={cn(..., pathname.startsWith('/resources') && 'bg-white/10 text-white font-medium')}>
  <BookOpen className="w-5 h-5" />
  Resources
</Link>
```

`BookOpen` is already imported in `Header.tsx` — no new icon import needed.

`MobileBottomNav.tsx` is **not modified**.

---

## State Flow Diagram

```
page.tsx state machine:

[Initial]
  selectedInstitute = null
  selectedSubject   = null
  activeModule      = null
        │
        ▼ user clicks institute
[Institute Selected]
  subjectFetch = loading → success/error
  selectedSubject = null (reset)
        │
        ▼ user clicks subject
[Subject Selected]
  moduleFetch = loading → success/error
  activeModule = null (reset)
        │
        ▼ user clicks module card
[PDF Open]
  activeModule = ResourceModule
  PdfViewer renders
        │
        ▼ user clicks back/close
[Subject Selected]  ← returns here (institute + subject preserved)
```

---

## Error Handling

| Scenario | Component | Behaviour |
|---|---|---|
| `getSubjects()` throws | `page.tsx` → `SubjectList` | `subjectFetch = 'error'`; SubjectList shows error + Retry button; retry calls `handleInstituteSelect` again |
| `getModules()` throws | `page.tsx` → `ModuleList` | `moduleFetch = 'error'`; ModuleList shows error + Retry button; retry calls `handleSubjectSelect` again |
| PDF iframe `onError` | `PdfViewer` | Shows error message with Retry (remounts iframe) and Back (calls `onClose`) |
| PDF load timeout (10s) | `PdfViewer` | Same as `onError` — shows error with Retry and Back |
| Module missing `chapterName`/`topicName` | `ModuleList` | Omits the absent field from the subtitle line; no error thrown |
| Empty subjects list | `SubjectList` | Renders "No modules available" message |
| Empty modules list | `ModuleList` | Renders "No modules available" message |

---

## Layout (`layout.tsx`)

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resources | Liorea',
  description: 'Browse coaching institute module PDFs from ALLEN, AAKASH, Physics Wallah, and Career Will.',
};

export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full w-full bg-background">
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
```

---

## Files to Create / Modify / Delete

### Create
| Path | Purpose |
|---|---|
| `src/app/resources/layout.tsx` | Metadata + layout wrapper |
| `src/app/resources/page.tsx` | Main page, state orchestrator |
| `src/app/resources/_lib/types.ts` | Shared TypeScript interfaces |
| `src/app/resources/_lib/resourcesDb.ts` | Firestore query functions |
| `src/app/resources/_components/InstituteSelector.tsx` | Institute picker |
| `src/app/resources/_components/SubjectList.tsx` | Subject list |
| `src/app/resources/_components/ModuleList.tsx` | Module cards |
| `src/app/resources/_components/PdfViewer.tsx` | iframe PDF viewer |

### Modify
| Path | Change |
|---|---|
| `next.config.ts` | Add `redirects()` for `/practice`, `/practice/session`, `/practice/history` |
| `src/components/layout/Header.tsx` | Replace `/practice` → `/resources` in desktop nav and mobile Sheet |

### Delete
| Path | Reason |
|---|---|
| `src/app/practice/` (entire directory) | Replaced by `/resources`; redirects handle old URLs |

---

## Dependencies

No new npm packages required. The implementation uses:
- `firebase/firestore` — already installed (`firebase ^11.10.0`)
- `lucide-react` — already installed (`BookOpen` icon)
- Native browser `<iframe>` — no PDF library needed
- `next/navigation` (`usePathname`) — already used in `Header.tsx`
- Tailwind CSS + shadcn/ui — already installed
