# Implementation Plan: Resources PDF Viewer

## Overview

Replace the existing `/practice` (PYQ/MCQ) section with a `/resources` section backed by Firestore. Users browse coaching institute module PDFs (ALLEN, AAKASH, PHYSICS WALLAH, CAREER WILL) and open them in an embedded in-app `<iframe>` PDF viewer. No new npm dependencies are required. The implementation proceeds bottom-up: types → data layer → components → page → navigation → redirects → cleanup.

---

## Tasks

- [x] 1. Create TypeScript types (`_lib/types.ts`)
  - [x] 1.1 Create `src/app/resources/_lib/types.ts` with all shared interfaces
    - Define `InstituteId` union type: `'ALLEN' | 'AAKASH' | 'PHYSICS_WALLAH' | 'CAREER_WILL'`
    - Define `InstituteOption` interface with `id: InstituteId` and `label: string`
    - Define `ResourceModule` interface with all required and optional fields (`id`, `institute`, `subject`, `displayName`, `pdfUrl`, `sortOrder`, `chapterName?`, `topicName?`)
    - Define `FetchState` type: `'idle' | 'loading' | 'success' | 'error'`
    - _Requirements: 5.1, 5.4_
    - _Design: TypeScript Interfaces (`_lib/types.ts`)_

- [x] 2. Create Firestore data layer (`_lib/resourcesDb.ts`)
  - [x] 2.1 Create `src/app/resources/_lib/resourcesDb.ts` with Firestore query functions
    - Implement `getSubjects(institute: InstituteId): Promise<string[]>` — queries `resources` collection filtered by `institute`, deduplicates `subject` values client-side, returns sorted array
    - Implement `getModules(institute: InstituteId, subject: string): Promise<ResourceModule[]>` — queries `resources` collection filtered by `institute` and `subject`, ordered by `sortOrder` ascending, maps docs to `ResourceModule`
    - Import `firestore` from `@/lib/firebase` and Firestore SDK functions from `firebase/firestore`
    - _Requirements: 5.2, 5.3, 3.7_
    - _Design: Data Layer (`_lib/resourcesDb.ts`)_
  - [ ]* 2.2 Write unit tests for `resourcesDb.ts`
    - Mock `firebase/firestore` `getDocs` to return controlled snapshots
    - Test `getSubjects` deduplication and sort behaviour
    - Test `getModules` correct mapping of doc data to `ResourceModule` shape
    - Test that both functions propagate thrown errors (for error-state coverage)
    - _Requirements: 5.2, 5.3_

- [x] 3. Create `InstituteSelector` component
  - [x] 3.1 Create `src/app/resources/_components/InstituteSelector.tsx`
    - Accept props: `selected: InstituteId | null`, `onSelect: (institute: InstituteId) => void`
    - Render a 2×2 grid of buttons for ALLEN, AAKASH, PHYSICS WALLAH, CAREER WILL using the `InstituteOption` labels
    - Apply `bg-white/10 text-white` active styling to the currently selected institute button
    - _Requirements: 2.1, 2.3_
    - _Design: `InstituteSelector.tsx`_
  - [ ]* 3.2 Write unit tests for `InstituteSelector`
    - Test that all four institute buttons render
    - Test that clicking a button calls `onSelect` with the correct `InstituteId`
    - Test that the selected button receives active styling and others do not
    - _Requirements: 2.1_

- [x] 4. Create `SubjectList` component
  - [x] 4.1 Create `src/app/resources/_components/SubjectList.tsx`
    - Accept props: `subjects: string[]`, `selected: string | null`, `fetchState: FetchState`, `onSelect: (subject: string) => void`, `onRetry: () => void`
    - Render a spinner when `fetchState === 'loading'`
    - Render an error message and "Retry" button (calls `onRetry`) when `fetchState === 'error'`
    - Render "No modules available" when `fetchState === 'success'` and `subjects.length === 0`
    - Render a scrollable list of subject buttons with active styling on the selected subject when subjects are present
    - _Requirements: 2.2, 2.4, 2.5_
    - _Design: `SubjectList.tsx`_
  - [ ]* 4.2 Write unit tests for `SubjectList`
    - Test loading spinner renders when `fetchState === 'loading'`
    - Test error message and Retry button render when `fetchState === 'error'`; clicking Retry calls `onRetry`
    - Test "No modules available" renders when `fetchState === 'success'` and subjects is empty
    - Test subject buttons render and clicking one calls `onSelect` with the correct subject
    - _Requirements: 2.2, 2.4, 2.5_

- [x] 5. Create `ModuleList` component
  - [x] 5.1 Create `src/app/resources/_components/ModuleList.tsx`
    - Accept props: `modules: ResourceModule[]`, `fetchState: FetchState`, `onSelect: (module: ResourceModule) => void`, `onRetry: () => void`
    - Render a spinner when `fetchState === 'loading'`
    - Render an error message and "Retry" button (calls `onRetry`) when `fetchState === 'error'`
    - Render "No modules available" when `fetchState === 'success'` and `modules.length === 0`
    - Render module cards showing `displayName` as primary text; if `chapterName` or `topicName` is present, render a secondary line formatted as `"chapterName — topicName"` (omitting whichever field is absent)
    - Clicking a card calls `onSelect(module)`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.4_
    - _Design: `ModuleList.tsx`_
  - [ ]* 5.2 Write unit tests for `ModuleList`
    - Test loading, error, and empty-state renders
    - Test that `displayName` is shown for each module card
    - Test subtitle line formatting: both fields present, only `chapterName`, only `topicName`, neither field
    - Test that clicking a card calls `onSelect` with the correct `ResourceModule`
    - _Requirements: 3.2, 3.3, 5.4_

- [x] 6. Create `PdfViewer` component
  - [x] 6.1 Create `src/app/resources/_components/PdfViewer.tsx`
    - Accept props: `module: ResourceModule`, `onClose: () => void`
    - Maintain internal `viewerState: 'loading' | 'loaded' | 'error' | 'timeout'` and `retryKey: number` state
    - Render a full-viewport overlay with a header bar containing a back/close button (calls `onClose`) and `module.displayName` as the title
    - Render `<iframe key={retryKey} src={module.pdfUrl} title={module.displayName} className="w-full flex-1 border-0" onLoad={...} onError={...} />`
    - On mount, start a 10-second `setTimeout` stored in a `useRef`; if `onLoad` fires first, clear the timeout and set state to `'loaded'`; if timeout fires first, set state to `'timeout'`; if `onError` fires, clear timeout and set state to `'error'`
    - When `viewerState === 'loading'`, render an overlay spinner on top of the iframe
    - When `viewerState === 'timeout'` or `'error'`, hide the iframe and show an error message with a "Retry" button (increments `retryKey`, resets state to `'loading'`) and a "Back" button (calls `onClose`)
    - Clear the timeout ref in a `useEffect` cleanup to prevent memory leaks
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
    - _Design: `PdfViewer.tsx`_
  - [ ]* 6.2 Write unit tests for `PdfViewer`
    - Test that the module `displayName` is rendered in the header
    - Test that the back/close button calls `onClose`
    - Test that the loading spinner is shown initially
    - Test that firing `onLoad` on the iframe transitions state to `'loaded'` and hides the spinner
    - Test that firing `onError` on the iframe shows the error UI with Retry and Back buttons
    - Test that clicking Retry increments the key (remounts iframe) and resets to loading state
    - _Requirements: 4.3, 4.4, 4.5, 4.6_

- [x] 7. Checkpoint — Ensure all component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Create `/resources` page and layout
  - [x] 8.1 Create `src/app/resources/layout.tsx`
    - Export `metadata` with `title: 'Resources | Liorea'` and an appropriate `description`
    - Render a `<div className="flex flex-col h-full w-full bg-background">` wrapper with a `<main className="flex-1 overflow-hidden relative">` containing `{children}`
    - _Requirements: 1.1_
    - _Design: Layout (`layout.tsx`)_
  - [x] 8.2 Create `src/app/resources/page.tsx` as the state orchestrator
    - Mark as `'use client'`
    - Declare all page-level state: `selectedInstitute`, `selectedSubject`, `activeModule`, `subjects`, `modules`, `subjectFetch`, `moduleFetch`
    - Implement `handleInstituteSelect`: resets subject/module/modules state, sets `subjectFetch` to `'loading'`, calls `getSubjects`, updates subjects and fetch state, handles errors
    - Implement `handleSubjectSelect`: resets module/activeModule state, sets `moduleFetch` to `'loading'`, calls `getModules`, updates modules and fetch state, handles errors
    - Render `<PdfViewer>` when `activeModule !== null`; otherwise render `<InstituteSelector>` plus (conditionally) `<SubjectList>` and `<ModuleList>`
    - Wire retry callbacks: subject retry re-calls `handleInstituteSelect(selectedInstitute!)`; module retry re-calls `handleSubjectSelect(selectedSubject!)`
    - _Requirements: 1.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.4, 3.5, 3.6, 4.3_
    - _Design: `page.tsx` — State Orchestrator, State Flow Diagram_

- [x] 9. Update `Header.tsx` navigation
  - [x] 9.1 Update desktop nav link in `src/components/layout/Header.tsx`
    - Replace the `/practice` `<Link>` with a `/resources` link
    - Change the label from `"PYQ"` (or equivalent) to `"Resources"`
    - Change the active-state condition from `pathname === '/practice'` to `pathname.startsWith('/resources')`
    - Keep the existing `BookOpen` icon (no new import needed)
    - _Requirements: 1.2, 1.3, 6.1, 6.3_
    - _Design: Navigation Changes (`Header.tsx`) — Desktop nav_
  - [x] 9.2 Update mobile Sheet menu link in `src/components/layout/Header.tsx`
    - Replace the `/practice` `<Link>` in the mobile Sheet with a `/resources` link
    - Change the label to `"Resources"` and update the active-state condition to `pathname.startsWith('/resources')`
    - Do not modify `MobileBottomNav.tsx`
    - _Requirements: 1.2, 1.3, 6.2, 6.3, 6.4_
    - _Design: Navigation Changes (`Header.tsx`) — Mobile Sheet menu_

- [x] 10. Add redirects to `next.config.ts`
  - [x] 10.1 Add a `redirects()` async function to `next.config.ts`
    - Add permanent (HTTP 308) redirects: `/practice` → `/resources`, `/practice/session` → `/resources`, `/practice/history` → `/resources`
    - Ensure the existing config options are preserved
    - _Requirements: 1.4, 1.5_
    - _Design: Redirect Strategy_

- [x] 11. Delete `src/app/practice/` directory
  - [x] 11.1 Remove the entire `src/app/practice/` directory and all its contents
    - Delete all files under `src/app/practice/` including `_components/`, `_lib/`, `history/`, `session/`, `page.tsx`, `layout.tsx`, `error.tsx`
    - Verify no remaining imports in the codebase reference `src/app/practice/`
    - _Requirements: 1.1, 1.4, 1.5_
    - _Design: Files to Create / Modify / Delete — Delete_

- [x] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical boundaries
- No new npm packages are required; all dependencies (`firebase`, `lucide-react`, Tailwind, shadcn/ui) are already installed
- The `<iframe>`-based PDF viewer requires no PDF rendering library
- Task 11 (delete `/practice`) should only be executed after Task 10 (redirects) is in place to avoid broken links

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1", "4.1", "5.1", "6.1"] },
    { "id": 3, "tasks": ["3.2", "4.2", "5.2", "6.2", "8.1"] },
    { "id": 4, "tasks": ["8.2"] },
    { "id": 5, "tasks": ["9.1", "9.2", "10.1"] },
    { "id": 6, "tasks": ["11.1"] }
  ]
}
```
