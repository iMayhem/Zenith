# Requirements Document

## Introduction

This document specifies requirements for enhancing the Resources feature with a hierarchical navigation system and PDF caching capabilities. The current system provides a three-level navigation (Institute → Subject → Module), but needs to be expanded to support a six-level hierarchy (Exam Type → Institute → Category → Year → Subject → Module) with dynamic category management and client-side PDF caching for improved performance.

## Glossary

- **Resources_System**: The application module that manages and displays educational PDF resources
- **Navigation_Hierarchy**: The six-level structure for organizing resources (Exam Type → Institute → Category → Year → Subject → Module)
- **Admin_Panel**: The administrative interface for managing resource metadata and uploads
- **PDF_Cache**: Browser-based storage mechanism for caching downloaded PDF files
- **Cache_Manager**: Component responsible for managing cached PDF files and storage limits
- **Firestore_Database**: The backend database storing resource metadata
- **Breadcrumb_Navigation**: UI component showing the current navigation path
- **Category**: A classification level for resources (e.g., Modules, Test Series, Notes)
- **Subcategory**: A nested classification within a Category (e.g., Leader Test Series, Classroom Major Series)
- **Exam_Type**: The top-level classification (NEET or JEE)
- **Institute**: The coaching center providing the resource (ALLEN, AAKASH, PHYSICSWALLAH, etc.)
- **Year**: The academic year for the resource (2024, 2025, etc.)
- **Subject**: The academic subject (Physics, Chemistry, Biology, Mathematics)
- **Module**: An individual PDF resource document
- **Service_Worker**: Browser background script for handling caching operations
- **Cache_API**: Browser API for storing and retrieving cached resources

## Requirements

### Requirement 1: Six-Level Navigation Hierarchy

**User Story:** As a student, I want to navigate through a structured hierarchy to find my resources, so that I can quickly locate the specific materials I need for my exam preparation.

#### Acceptance Criteria

1. WHEN a user accesses the Resources page, THE Resources_System SHALL display the Exam Type selection as the first level
2. WHEN a user selects an Exam Type, THE Resources_System SHALL display available Institutes for that Exam Type
3. WHEN a user selects an Institute, THE Resources_System SHALL display available Categories for that Institute
4. WHEN a user selects a Category, THE Resources_System SHALL display available Years for that Category
5. WHEN a user selects a Year, THE Resources_System SHALL display available Subjects for that Year
6. WHEN a user selects a Subject, THE Resources_System SHALL display the list of Modules for that Subject
7. THE Resources_System SHALL maintain the navigation state across all six levels
8. WHEN a user navigates to any level, THE Resources_System SHALL preserve the selections from previous levels

### Requirement 2: Breadcrumb Navigation

**User Story:** As a student, I want to see my current location in the navigation hierarchy, so that I understand where I am and can easily navigate back to previous levels.

#### Acceptance Criteria

1. WHILE a user is navigating the hierarchy, THE Resources_System SHALL display a Breadcrumb_Navigation component showing the current path
2. THE Breadcrumb_Navigation SHALL display all selected levels from Exam Type to the current level
3. WHEN a user clicks on any breadcrumb item, THE Resources_System SHALL navigate to that level and clear all selections below it
4. THE Breadcrumb_Navigation SHALL update immediately when the user makes a selection at any level
5. WHEN a user is at the first level, THE Breadcrumb_Navigation SHALL display only the current level name

### Requirement 3: Dynamic Category Management

**User Story:** As an administrator, I want to create and manage resource categories dynamically, so that I can organize resources according to evolving educational needs.

#### Acceptance Criteria

1. THE Admin_Panel SHALL provide a dedicated interface for managing Categories
2. THE Admin_Panel SHALL allow administrators to create new Categories with a name and sort order
3. THE Admin_Panel SHALL allow administrators to edit existing Category names and sort orders
4. THE Admin_Panel SHALL allow administrators to delete Categories that have no associated resources
5. WHEN a Category has associated resources, THE Admin_Panel SHALL prevent deletion and display a warning message
6. THE Admin_Panel SHALL display all Categories ordered by their sort order value
7. WHEN an administrator creates or modifies a Category, THE Resources_System SHALL reflect the changes immediately for all users

### Requirement 4: Subcategory Management

**User Story:** As an administrator, I want to create subcategories within categories, so that I can provide finer-grained organization for resource types like Test Series.

#### Acceptance Criteria

1. THE Admin_Panel SHALL allow administrators to create Subcategories within any Category
2. THE Admin_Panel SHALL allow administrators to assign a name and sort order to each Subcategory
3. THE Admin_Panel SHALL allow administrators to edit existing Subcategory names and sort orders
4. THE Admin_Panel SHALL allow administrators to delete Subcategories that have no associated resources
5. WHEN a user selects a Category that has Subcategories, THE Resources_System SHALL display the Subcategory selection level before the Year level
6. WHERE a Category has no Subcategories, THE Resources_System SHALL skip the Subcategory level and proceed directly to Year selection
7. THE Admin_Panel SHALL display Subcategories grouped by their parent Category

### Requirement 5: Exam Type Management

**User Story:** As an administrator, I want to manage exam types, so that I can support different competitive examinations.

#### Acceptance Criteria

1. THE Admin_Panel SHALL allow administrators to create new Exam Types with a name and sort order
2. THE Admin_Panel SHALL allow administrators to edit existing Exam Type names and sort orders
3. THE Admin_Panel SHALL allow administrators to delete Exam Types that have no associated resources
4. THE Admin_Panel SHALL display all Exam Types ordered by their sort order value
5. WHEN an administrator creates or modifies an Exam Type, THE Resources_System SHALL reflect the changes immediately for all users

### Requirement 6: Institute Management

**User Story:** As an administrator, I want to manage coaching institutes, so that I can add new institutes or update existing ones as needed.

#### Acceptance Criteria

1. THE Admin_Panel SHALL allow administrators to create new Institutes with a name, identifier, and sort order
2. THE Admin_Panel SHALL allow administrators to edit existing Institute names and sort orders
3. THE Admin_Panel SHALL allow administrators to delete Institutes that have no associated resources
4. THE Admin_Panel SHALL display all Institutes ordered by their sort order value
5. WHEN an administrator creates or modifies an Institute, THE Resources_System SHALL reflect the changes immediately for all users

### Requirement 7: Year Management

**User Story:** As an administrator, I want to manage academic years, so that I can organize resources by their publication year.

#### Acceptance Criteria

1. THE Admin_Panel SHALL allow administrators to create new Years with a year value and sort order
2. THE Admin_Panel SHALL allow administrators to edit existing Year values and sort orders
3. THE Admin_Panel SHALL allow administrators to delete Years that have no associated resources
4. THE Admin_Panel SHALL display all Years ordered by their sort order value in descending order
5. WHEN an administrator creates or modifies a Year, THE Resources_System SHALL reflect the changes immediately for all users

### Requirement 8: Enhanced PDF Upload with Full Metadata

**User Story:** As an administrator, I want to upload PDFs with complete hierarchical metadata, so that they appear in the correct location in the navigation hierarchy.

#### Acceptance Criteria

1. THE Admin_Panel SHALL provide a PDF upload form with fields for all hierarchy levels (Exam Type, Institute, Category, Subcategory, Year, Subject)
2. THE Admin_Panel SHALL validate that all required metadata fields are filled before allowing upload
3. WHEN an administrator selects a Category without Subcategories, THE Admin_Panel SHALL hide the Subcategory field
4. WHEN an administrator selects a Category with Subcategories, THE Admin_Panel SHALL require Subcategory selection
5. THE Admin_Panel SHALL upload the PDF file to Firebase Storage with a path structure reflecting the hierarchy
6. THE Admin_Panel SHALL save the PDF metadata to Firestore_Database with all hierarchy fields
7. WHEN the upload completes successfully, THE Admin_Panel SHALL display a success message and clear the form
8. IF the upload fails, THEN THE Admin_Panel SHALL display an error message and retain the form data

### Requirement 9: PDF Metadata Editing

**User Story:** As an administrator, I want to edit metadata for existing PDFs, so that I can correct errors or reorganize resources.

#### Acceptance Criteria

1. THE Admin_Panel SHALL display a list of all uploaded PDFs with their current metadata
2. THE Admin_Panel SHALL allow administrators to select a PDF for editing
3. WHEN a PDF is selected for editing, THE Admin_Panel SHALL populate the edit form with current metadata values
4. THE Admin_Panel SHALL allow administrators to modify any metadata field except the PDF file itself
5. WHEN an administrator saves metadata changes, THE Admin_Panel SHALL update the Firestore_Database document
6. THE Resources_System SHALL reflect metadata changes immediately for all users
7. THE Admin_Panel SHALL validate that all required fields remain filled when editing

### Requirement 10: PDF Deletion

**User Story:** As an administrator, I want to delete PDFs that are no longer needed, so that I can keep the resource library current and relevant.

#### Acceptance Criteria

1. THE Admin_Panel SHALL allow administrators to select a PDF for deletion
2. WHEN an administrator initiates deletion, THE Admin_Panel SHALL display a confirmation dialog
3. WHEN deletion is confirmed, THE Admin_Panel SHALL delete the PDF file from Firebase Storage
4. THE Admin_Panel SHALL delete the corresponding metadata document from Firestore_Database
5. IF deletion fails, THEN THE Admin_Panel SHALL display an error message and retain the PDF in the system
6. WHEN deletion succeeds, THE Admin_Panel SHALL display a success message and remove the PDF from the list

### Requirement 11: Resource Reordering

**User Story:** As an administrator, I want to change the display order of resources, so that I can prioritize important materials.

#### Acceptance Criteria

1. THE Admin_Panel SHALL display resources with their current sort order values
2. THE Admin_Panel SHALL allow administrators to modify the sort order value for any resource
3. WHEN an administrator changes a sort order value, THE Admin_Panel SHALL update the Firestore_Database document
4. THE Resources_System SHALL display resources ordered by their sort order value in ascending order
5. THE Admin_Panel SHALL allow administrators to reorder items using drag-and-drop interaction
6. WHEN an administrator uses drag-and-drop reordering, THE Admin_Panel SHALL update sort order values for all affected items

### Requirement 12: Browser-Based PDF Caching

**User Story:** As a student, I want PDFs to load instantly when I access them again, so that I can study efficiently without waiting for downloads.

#### Acceptance Criteria

1. WHEN a user opens a PDF for the first time, THE Resources_System SHALL download the PDF from Firebase Storage and display it
2. THE Resources_System SHALL store the downloaded PDF in the PDF_Cache using the Cache_API
3. WHEN a user opens a previously viewed PDF, THE Resources_System SHALL retrieve it from the PDF_Cache instead of downloading it again
4. THE Resources_System SHALL use the PDF URL as the cache key for storage and retrieval
5. THE PDF_Cache SHALL persist across browser sessions
6. WHEN a cached PDF is retrieved, THE Resources_System SHALL display it within 100 milliseconds

### Requirement 13: Cache Size Management

**User Story:** As a student, I want the cache to manage its size automatically, so that it doesn't consume excessive storage on my device.

#### Acceptance Criteria

1. THE Cache_Manager SHALL track the total size of all cached PDFs
2. WHEN the total cache size exceeds 100 megabytes, THE Cache_Manager SHALL remove the least recently accessed PDF
3. THE Cache_Manager SHALL continue removing PDFs until the total size is below 100 megabytes
4. THE Cache_Manager SHALL maintain a record of access timestamps for each cached PDF
5. WHEN a cached PDF is accessed, THE Cache_Manager SHALL update its access timestamp
6. THE Cache_Manager SHALL store cache metadata in browser local storage

### Requirement 14: Manual Cache Clearing

**User Story:** As a student, I want to manually clear the PDF cache, so that I can free up storage space when needed.

#### Acceptance Criteria

1. THE Resources_System SHALL provide a "Clear Cache" option in the application settings
2. WHEN a user selects "Clear Cache", THE Resources_System SHALL display a confirmation dialog showing the current cache size
3. WHEN the user confirms cache clearing, THE Cache_Manager SHALL delete all cached PDFs from the PDF_Cache
4. THE Cache_Manager SHALL delete all cache metadata from local storage
5. WHEN cache clearing completes, THE Resources_System SHALL display a success message
6. THE Resources_System SHALL display the current cache size in the settings interface

### Requirement 15: Cache Status Indicators

**User Story:** As a student, I want to see which PDFs are cached, so that I know which ones will load instantly.

#### Acceptance Criteria

1. WHILE displaying the Module list, THE Resources_System SHALL show a visual indicator for each cached PDF
2. THE Resources_System SHALL display a different visual indicator for PDFs that are not cached
3. WHEN a PDF is being downloaded and cached, THE Resources_System SHALL display a progress indicator
4. THE Resources_System SHALL update cache indicators immediately when a PDF is cached or removed from cache

### Requirement 16: Hierarchical Data Model

**User Story:** As a developer, I want an efficient Firestore data model, so that the system can query resources quickly at each hierarchy level.

#### Acceptance Criteria

1. THE Firestore_Database SHALL store hierarchy configuration in separate collections (examTypes, institutes, categories, subcategories, years)
2. THE Firestore_Database SHALL store PDF metadata in a resources collection with fields for all hierarchy levels
3. THE Firestore_Database SHALL support compound queries filtering by multiple hierarchy fields
4. THE Firestore_Database SHALL maintain indexes for efficient querying at each hierarchy level
5. WHEN querying for available options at any level, THE Resources_System SHALL return results within 500 milliseconds
6. THE Firestore_Database SHALL store sort order values as numeric fields for efficient ordering

### Requirement 17: Backward Compatibility

**User Story:** As a system administrator, I want existing uploaded PDFs to remain accessible, so that no content is lost during the system upgrade.

#### Acceptance Criteria

1. THE Resources_System SHALL detect PDF documents that lack new hierarchy fields (examType, category, year)
2. WHEN a legacy PDF is detected, THE Resources_System SHALL assign default values for missing hierarchy fields
3. THE Resources_System SHALL display legacy PDFs in a designated "Legacy" category
4. THE Admin_Panel SHALL allow administrators to update legacy PDFs with complete hierarchy metadata
5. THE Resources_System SHALL continue to support queries using the original three-level hierarchy (Institute → Subject → Module) for legacy content

### Requirement 18: Empty State Handling

**User Story:** As a student, I want clear feedback when no resources are available, so that I understand whether content is missing or still loading.

#### Acceptance Criteria

1. WHEN no options are available at any hierarchy level, THE Resources_System SHALL display an empty state message
2. THE empty state message SHALL indicate whether the level is empty or still loading
3. WHEN a user reaches the Module level and no PDFs exist, THE Resources_System SHALL display a message suggesting they check back later or contact support
4. THE Resources_System SHALL display different empty state messages for each hierarchy level
5. THE empty state message SHALL include relevant context about the current selection path

### Requirement 19: Search and Filter Functionality

**User Story:** As a student, I want to search and filter resources at each level, so that I can quickly find specific materials without browsing through all options.

#### Acceptance Criteria

1. THE Resources_System SHALL provide a search input field at each hierarchy level
2. WHEN a user types in the search field, THE Resources_System SHALL filter displayed options to match the search query
3. THE Resources_System SHALL perform case-insensitive matching on item names
4. THE Resources_System SHALL update the filtered results within 100 milliseconds of each keystroke
5. WHEN the search query is cleared, THE Resources_System SHALL display all available options again
6. THE Resources_System SHALL display a message when no items match the search query

### Requirement 20: Responsive Design

**User Story:** As a student, I want the Resources interface to work well on my mobile device, so that I can access materials on the go.

#### Acceptance Criteria

1. THE Resources_System SHALL display the navigation hierarchy in a single-column layout on mobile devices (screen width less than 768 pixels)
2. THE Resources_System SHALL display the navigation hierarchy in a multi-column layout on desktop devices (screen width 768 pixels or greater)
3. THE Breadcrumb_Navigation SHALL wrap to multiple lines on narrow screens
4. THE Resources_System SHALL use touch-friendly button sizes (minimum 44 pixels height) on mobile devices
5. THE Resources_System SHALL maintain full functionality on both mobile and desktop devices
6. THE PDF viewer SHALL adapt to the screen size and orientation

### Requirement 21: Loading States

**User Story:** As a student, I want to see loading indicators when data is being fetched, so that I know the system is working and not frozen.

#### Acceptance Criteria

1. WHEN the Resources_System is fetching data for any hierarchy level, THE Resources_System SHALL display a loading indicator
2. THE loading indicator SHALL appear within 100 milliseconds of initiating the data fetch
3. THE loading indicator SHALL be replaced by the actual content when data loading completes
4. IF data loading fails, THEN THE Resources_System SHALL display an error message with a retry option
5. WHEN a user clicks the retry option, THE Resources_System SHALL attempt to fetch the data again

### Requirement 22: Service Worker Implementation

**User Story:** As a developer, I want to use a Service Worker for PDF caching, so that caching works reliably across different browsers and scenarios.

#### Acceptance Criteria

1. THE Resources_System SHALL register a Service_Worker when the application loads
2. THE Service_Worker SHALL intercept fetch requests for PDF files
3. WHEN a PDF is requested, THE Service_Worker SHALL check if it exists in the PDF_Cache
4. IF the PDF exists in cache, THEN THE Service_Worker SHALL return the cached version
5. IF the PDF does not exist in cache, THEN THE Service_Worker SHALL fetch it from the network and store it in the PDF_Cache
6. THE Service_Worker SHALL handle cache storage errors gracefully and fall back to network requests
7. THE Service_Worker SHALL implement the cache size management logic specified in Requirement 13

### Requirement 23: Cache Versioning

**User Story:** As a student, I want to receive updated versions of PDFs when they are modified, so that I always have the latest content.

#### Acceptance Criteria

1. THE Resources_System SHALL include a version identifier or timestamp in the PDF metadata
2. WHEN a PDF is updated in Firebase Storage, THE Admin_Panel SHALL update the version identifier in Firestore_Database
3. WHEN a user requests a PDF, THE Service_Worker SHALL compare the cached version identifier with the current version in metadata
4. IF the version identifiers differ, THEN THE Service_Worker SHALL fetch the new version from the network and update the cache
5. IF the version identifiers match, THEN THE Service_Worker SHALL serve the cached version
6. THE Cache_Manager SHALL store version identifiers alongside cached PDFs

### Requirement 24: Admin Panel Navigation

**User Story:** As an administrator, I want a well-organized admin panel, so that I can efficiently manage all aspects of the Resources system.

#### Acceptance Criteria

1. THE Admin_Panel SHALL organize management functions into logical sections (Hierarchy Management, PDF Management, Cache Settings)
2. THE Admin_Panel SHALL provide tabbed navigation between different management sections
3. THE Admin_Panel SHALL display the current section prominently
4. THE Admin_Panel SHALL maintain the selected section when the page is refreshed
5. THE Admin_Panel SHALL be accessible only to users with administrator privileges
6. WHEN a non-administrator attempts to access the Admin_Panel, THE Resources_System SHALL display an access denied message

### Requirement 25: Bulk Operations

**User Story:** As an administrator, I want to perform bulk operations on multiple PDFs, so that I can efficiently manage large numbers of resources.

#### Acceptance Criteria

1. THE Admin_Panel SHALL allow administrators to select multiple PDFs using checkboxes
2. THE Admin_Panel SHALL provide bulk actions for selected PDFs (delete, change category, change year)
3. WHEN an administrator initiates a bulk action, THE Admin_Panel SHALL display a confirmation dialog showing the number of affected items
4. WHEN a bulk action is confirmed, THE Admin_Panel SHALL process all selected items and display progress
5. IF any items fail during bulk processing, THEN THE Admin_Panel SHALL display a summary of successes and failures
6. THE Admin_Panel SHALL allow administrators to select all PDFs matching current filters with a single action

### Requirement 26: Audit Logging

**User Story:** As a system administrator, I want to track all administrative actions, so that I can monitor system usage and troubleshoot issues.

#### Acceptance Criteria

1. WHEN an administrator creates, modifies, or deletes any resource or hierarchy item, THE Resources_System SHALL create an audit log entry
2. THE audit log entry SHALL include the administrator's user ID, action type, timestamp, and affected item details
3. THE Resources_System SHALL store audit logs in a separate Firestore_Database collection
4. THE Admin_Panel SHALL provide an interface for viewing audit logs
5. THE Admin_Panel SHALL allow filtering audit logs by date range, administrator, and action type
6. THE audit log SHALL retain entries for at least 90 days

### Requirement 27: Performance Optimization

**User Story:** As a student, I want the Resources interface to respond quickly, so that I can navigate efficiently without delays.

#### Acceptance Criteria

1. WHEN a user selects an option at any hierarchy level, THE Resources_System SHALL display the next level within 500 milliseconds
2. THE Resources_System SHALL prefetch data for the next hierarchy level when a user hovers over an option for more than 500 milliseconds
3. THE Resources_System SHALL cache hierarchy configuration data in browser memory for the duration of the session
4. THE Resources_System SHALL implement pagination for levels with more than 50 items
5. WHEN pagination is active, THE Resources_System SHALL display 50 items per page
6. THE Resources_System SHALL use lazy loading for PDF thumbnails if thumbnails are implemented

### Requirement 28: Error Recovery

**User Story:** As a student, I want the system to recover gracefully from errors, so that temporary issues don't prevent me from accessing resources.

#### Acceptance Criteria

1. WHEN a network error occurs during data fetching, THE Resources_System SHALL display an error message with a retry button
2. WHEN a user clicks the retry button, THE Resources_System SHALL attempt to fetch the data again
3. THE Resources_System SHALL implement exponential backoff for retry attempts (1 second, 2 seconds, 4 seconds)
4. IF three retry attempts fail, THEN THE Resources_System SHALL display a message suggesting the user check their connection or try again later
5. WHEN the PDF_Cache is unavailable, THE Resources_System SHALL fall back to direct network requests without caching
6. THE Resources_System SHALL log errors to the browser console for debugging purposes

### Requirement 29: Accessibility Compliance

**User Story:** As a student with disabilities, I want the Resources interface to be accessible, so that I can use it with assistive technologies.

#### Acceptance Criteria

1. THE Resources_System SHALL provide keyboard navigation for all interactive elements
2. THE Resources_System SHALL maintain a logical tab order through the navigation hierarchy
3. THE Resources_System SHALL provide ARIA labels for all buttons and interactive elements
4. THE Resources_System SHALL announce navigation changes to screen readers
5. THE Resources_System SHALL maintain a minimum contrast ratio of 4.5:1 for all text elements
6. THE Resources_System SHALL support screen reader navigation through the Breadcrumb_Navigation

### Requirement 30: Analytics Integration

**User Story:** As a product manager, I want to track how students use the Resources feature, so that I can make data-driven improvements.

#### Acceptance Criteria

1. WHEN a user selects an option at any hierarchy level, THE Resources_System SHALL log an analytics event with the level name and selected value
2. WHEN a user opens a PDF, THE Resources_System SHALL log an analytics event with the PDF identifier and metadata
3. WHEN a PDF is served from cache, THE Resources_System SHALL log a cache hit event
4. WHEN a PDF is downloaded from the network, THE Resources_System SHALL log a cache miss event
5. THE Resources_System SHALL track the time spent viewing each PDF
6. THE Resources_System SHALL not log any personally identifiable information in analytics events
