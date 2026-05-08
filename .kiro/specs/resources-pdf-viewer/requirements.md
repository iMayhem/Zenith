# Requirements Document

## Introduction

The Resources feature replaces the existing "PYQ" (Previous Year Questions) section in the Zenith study app. Instead of MCQ-based question practice sessions, the Resources section provides users with access to coaching institute module PDFs from ALLEN, AAKASH, PHYSICS WALLAH, and CAREER WILL. Users can browse modules by institute and subject, then open and read PDFs directly within an embedded in-app PDF viewer — no external app or download required.

The existing `/practice` route and all MCQ-related functionality (question sessions, answer keys, quiz mode, practice history) will be removed and replaced by this new Resources section.

## Glossary

- **Resources_Section**: The renamed section of the app (previously "PYQ") accessible at `/resources`, providing PDF module access.
- **Institute**: A coaching organisation whose modules are available. One of: ALLEN, AAKASH, PHYSICS_WALLAH, CAREER_WILL.
- **Module**: A PDF document belonging to a specific institute, subject, and optionally a chapter or topic.
- **PDF_Viewer**: The embedded in-app component that renders a PDF file without navigating away from the app.
- **Subject**: An academic subject (e.g., Physics, Chemistry, Biology, Mathematics) under which modules are organised.
- **Resource_Catalog**: The Firestore `resources` collection that stores metadata for all available modules.
- **User**: An authenticated Zenith user browsing the Resources section.

## Requirements

### Requirement 1: Rename and Replace the PYQ Section

**User Story:** As a user, I want the old "PYQ" section to be replaced by a "Resources" section, so that I can access coaching module PDFs instead of MCQ practice.

#### Acceptance Criteria

1. THE Resources_Section SHALL be accessible at the `/resources` route.
2. THE Resources_Section SHALL replace the existing PYQ link in the desktop navigation bar and the mobile navigation sheet with a link pointing to `/resources` labelled "Resources".
3. THE Resources_Section SHALL display the label "Resources" in the desktop navigation bar and mobile navigation sheet, with the active state (`bg-white/10 text-white` CSS classes) applied when the current pathname starts with `/resources`.
4. WHEN a user navigates to `/practice`, THE system SHALL issue a permanent redirect (HTTP 308) to `/resources`.
5. WHEN a user navigates to `/practice/session` or `/practice/history`, THE system SHALL redirect to `/resources` so that no MCQ content is served.

---

### Requirement 2: Institute Selection

**User Story:** As a user, I want to choose a coaching institute, so that I can browse modules specific to that institute.

#### Acceptance Criteria

1. THE Resources_Section SHALL display a selection interface listing the four institutes: ALLEN, AAKASH, PHYSICS WALLAH, and CAREER WILL.
2. WHEN a user selects an institute, THE Resources_Section SHALL fetch subjects for that institute from the Resource_Catalog and display them; WHILE the fetch is in progress, THE Resources_Section SHALL display a loading indicator.
3. WHILE no institute is selected, THE Resources_Section SHALL not render the subject list or module list.
4. IF no subjects exist for the selected institute in the Resource_Catalog, THEN THE Resources_Section SHALL display a "No modules available" message.
5. IF the subject fetch fails, THEN THE Resources_Section SHALL display an error message and a retry option that re-fetches subjects for the same institute.

---

### Requirement 3: Subject and Module Browsing

**User Story:** As a user, I want to browse modules by subject within a chosen institute, so that I can find the specific PDF I need.

#### Acceptance Criteria

1. WHEN a user selects a subject, THE Resources_Section SHALL display a list of available modules for that institute and subject combination; IF no modules exist for that combination, THEN THE Resources_Section SHALL display a "No modules available" message.
2. THE Resources_Section SHALL display each module's `displayName`.
3. IF a module has a `chapterName` or `topicName`, THEN THE Resources_Section SHALL display it beneath the `displayName` in the format "chapterName — topicName" (omitting whichever field is absent).
4. WHEN a user selects a module, THE Resources_Section SHALL open the PDF_Viewer for that module.
5. WHILE modules are loading from the Resource_Catalog, THE Resources_Section SHALL display a loading indicator.
6. IF the Resource_Catalog fetch fails, THEN THE Resources_Section SHALL display an error message and a retry option that re-fetches from the Resource_Catalog.
7. THE Resources_Section SHALL display modules ordered by their `sortOrder` field in ascending order.

---

### Requirement 4: Embedded PDF Viewer

**User Story:** As a user, I want to open PDFs directly inside the app, so that I can read module content without leaving Zenith or downloading files.

#### Acceptance Criteria

1. WHEN a user opens a module, THE PDF_Viewer SHALL render the PDF in the same viewport without opening a new browser tab or triggering a file download.
2. THE PDF_Viewer SHALL support scrolling through multi-page PDF documents.
3. THE PDF_Viewer SHALL provide a close or back control that returns the user to the module list for the previously selected institute and subject.
4. WHILE a PDF is loading, THE PDF_Viewer SHALL display a loading indicator.
5. IF a PDF has not finished loading within 10 seconds or encounters a load error, THEN THE PDF_Viewer SHALL display an error message with a retry option that re-attempts loading the same PDF URL, and a back option that returns to the module list.
6. WHILE a PDF is open, THE PDF_Viewer SHALL display the module's `displayName` as a visible title.

---

### Requirement 5: Resource Catalog Data Structure

**User Story:** As an admin, I want a well-defined data structure for storing module metadata, so that modules can be managed and extended without code changes.

#### Acceptance Criteria

1. THE Resource_Catalog SHALL store each module as a Firestore document in the `resources` collection with the following fields: `institute` (string, one of `"ALLEN"`, `"AAKASH"`, `"PHYSICS_WALLAH"`, `"CAREER_WILL"`), `subject` (string), `displayName` (string), `pdfUrl` (string, valid URL), `sortOrder` (number), and optional `chapterName` (string) and `topicName` (string).
2. THE Resources_Section SHALL fetch module metadata by querying the `resources` Firestore collection filtered by `institute` and `subject`; no hardcoded module arrays SHALL exist in application code.
3. WHEN the `resources` Firestore collection is updated with new or modified documents, THE Resources_Section SHALL reflect those changes on the next page load without requiring a server restart or code deployment.
4. IF a module document in the Resource_Catalog omits `chapterName` or `topicName`, THEN THE Resources_Section SHALL still display and open that module without error.

---

### Requirement 6: Navigation Updates

**User Story:** As a user, I want consistent navigation to the Resources section across desktop and mobile, so that I can reach it from anywhere in the app.

#### Acceptance Criteria

1. THE Resources_Section SHALL appear in the desktop header navigation bar with the label "Resources" and the `BookOpen` icon, replacing the existing PYQ navigation link.
2. THE Resources_Section SHALL appear in the mobile hamburger Sheet menu with the label "Resources" and the `BookOpen` icon, replacing the existing PYQ navigation link.
3. WHEN the user is on a route whose pathname starts with `/resources`, THE navigation link SHALL apply the active state styles (`bg-white/10 text-white` CSS classes) to the "Resources" link in both the desktop nav bar and the mobile Sheet menu.
4. THE `MobileBottomNav.tsx` component SHALL not be modified; the Resources section SHALL not appear in the mobile bottom navigation bar.
