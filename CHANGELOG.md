# Changelog

All notable changes to Liorea will be documented in this file.
    
## [1.2.0] - 2026-05-28

### ✨ New Features
- **Dedicated Mobile App**: Implemented a dedicated mobile experience with tailored routes (`/mobile`), custom layouts, and a dedicated bottom navigation bar.
- **Resources Library**: Added hierarchical folder and module navigation, allowing users to browse subject-specific documents and view PDFs directly in the application.
- **Practice & Quiz System**: Introduced comprehensive practice modules featuring session tracking, history tracking, Firestore curriculum synchronization, and performance optimization.
- **Anti-Sleep Keep Alive**: Added a `useKeepAlive` hook integrating Wake Lock API to prevent the browser/device from sleeping during study sessions.
- **Journal Optimistic UI**: Implemented nonce-based reconciliation for journal posts to provide instant message sending feedback.

### 🎨 UI/UX Improvements
- **Mobile Menu and Responsiveness**: Redesigned navigation sheets and optimized layout grids across all key components for seamless mobile access.
- **Journal Chat Revamp**: Standardized post layout, spacing, typography, image display, scroll anchoring, and actions hover states.
- **Improved Countdown Timers**: Updated the dashboard with clean, explicit timers for Re-NEET UG 2026, JEE Mains 2027 (Session 1), and NEET UG 2027.
- **Timer Panel Scroll**: Added vertical overflow scroll support to the right-side timer panel to prevent layout overflow.
- **Resources Lock State**: Temporarily locked the resources tab, replacing it with a premium lock screen and disabled menu state.

### ⚡ Performance Improvements
- **Practice Session Caching**: Configured next.config image caching and preloading for faster module loading.
- **Scroll Anchoring**: Refactored journal chat context with Firestore pagination and scroll anchoring to maintain position during infinite scroll.

### 🐛 Bug Fixes
- **Timer Maintenance**: Removed outdated JEE Mains Session 2 countdown timers.
- **Scrolling Behavior**: Resolved scroll jumping when new chat items and reactions occur.
- **Mobile Warnings**: Refactored warning components out of global providers to prevent unnecessary mobile overlays.

---

## [1.1.0] - 2026-01-04

### ✨ New Features
- **Focus Chamber Overlay**: Fully immersive, real-time grid showing all active focusers with live updates.
- **Focus Activity Feed**: Real-time tracking of focus room entries and exits within the chamber.
- **Focus Pulse**: Beautiful purple pulsing glow effects for users in deep focus mode.
- **Refined Presence Indicators**: New premium visual indicators and row highlights for focusers in the community panel.

### 🎨 UI/UX Improvements
- **Layout Consistency**: Unified alignment grid in Community Panel for Online, Offline, and Focus states.
- **Smooth Transitions**: GPU-accelerated glow animations and soft-pulse indicators.

### 🐛 Bug Fixes
- **Stability**: Resolved critical ReferenceErrors and React render loops in Focus Room components.
- **Alignment**: Fixed layout-breaking border shifts in the Presence Panel.

---

## [1.0.2] - 2026-01-04

### ✨ New Features
- **Username Change**: Added ability for users to change their display name directly from Profile Settings.
- **Instant Sync**: Username changes now reflect instantly across the entire application without refresh.

### 🔧 Technical Improvements
- **API updates**: Enhanced profile update endpoint to support optional username modification.
- **Validation**: Integrated client-side validation for minimum username length.

---

## [1.0.1] - 2025-12-26

### ✨ New Features
- **18 Color Themes**: Added 6 new vibrant themes (Crimson, Sapphire, Mint, Coral, Indigo, Gold) for total of 18 themes
- **Mute Button**: Added sound effects mute/unmute toggle in study room chat header
- **Compact Emoji Picker**: Reduced to 20 most commonly used emojis with smart layout

### 🎨 UI/UX Improvements
- **Leaderboard Redesign**: Compact dropdown for timeframe selection, removed clutter, increased spacing
- **Top 20 Display**: Limited leaderboard to show only top 20 users across all timeframes
- **Smooth Scrolling**: Added GPU acceleration and performance optimizations for silky-smooth scrolling
- **Loading Optimizations**: Added eager presence initialization and loading skeletons for instant feedback
- **Changelog Page**: Redesigned with timeline-style layout and scrollable panel

### ⚡ Performance Improvements
- **Leaderboard Optimization**: Implemented React.memo and useMemo to prevent unnecessary re-renders
- **Presence Loading**: Optimized initialization to show users online faster
- **Chat Loading**: Added delay to prevent race conditions with presence system
- **Scroll Performance**: GPU-accelerated scrolling with hardware acceleration

### 🐛 Bug Fixes
- **Version Display**: Removed "Beta" tag, now shows stable v1.0.1
- **Theme Types**: Fixed TypeScript errors for new color themes
- **Notification Persistence**: Fixed read status not persisting across sessions
- **Reaction System**: Fixed multiple reactions per user functionality

### 🔧 Technical Improvements
- **Error Handling**: Improved error logging for presence sync and chat history
- **Sound Effects**: Better state management with getEnabled() method
- **Memoization**: Optimized component rendering across the app

---

## [1.0.0] - 2025-12-25

### 🎉 Official Release
- Removed beta status - Liorea is now stable!

### ✨ Major Features

#### Chat & Messaging
- **Multiple Reactions**: Users can now add multiple different emoji reactions to the same message
- **Smart Emoji Picker**: Curated selection of 48 most-used emojis with frequency tracking
- **Optimized Message Loading**: Reduced initial load from 100 to 50 messages for faster performance
- **Message Deletion**: Instant UI updates when deleting messages without page refresh
- **GIF Support**: Integrated Tenor API for GIF sharing in chat

#### Sound Effects
- **UI Sound System**: Added subtle sound effects for:
  - Message send/receive
  - Reactions
  - Focus mode toggle
- **User Preferences**: Volume control and enable/disable options
- **Smart Notifications**: Sounds only play for truly new messages (not on page load)

#### Leaderboard
- **Multi-Timeframe Views**: Daily, Weekly, and All-Time leaderboards
- **Real-time Updates**: Live leaderboard data synced via Firestore
- **Optimized Queries**: Reduced data fetching for better performance

#### Study Features
- **Focus Mode Indicator**: Visual badge shows when users are in focus mode
- **Personal Study Rooms**: Private study spaces with room persistence
- **Screen Sharing**: WebRTC-based screen sharing with TURN server support

#### Notifications
- **Per-User Read Status**: Notification read status now persists per user across sessions
- **Dual Notification System**: Separate global and personal notifications
- **Smart Alerts**: Notifications with proper categorization and links

### 🐛 Bug Fixes
- Fixed chat scroll jumping when adding reactions
- Fixed "[object Object]" display in reactions
- Fixed notification sounds playing on initial page load
- Fixed localStorage SSR errors in sound effects
- Fixed circular dependency between FocusContext and PresenceContext
- Fixed message deletion requiring page refresh
- Fixed notification read status not persisting across sessions

### ⚡ Performance Improvements
- **Firebase Optimization**: 60-70% reduction in Firestore reads
- **Query Limits**: Optimized all queries with appropriate limits
- **Smart Caching**: Implemented caching for frequently accessed data
- **Scroll Optimization**: Prevented unnecessary re-renders during reactions

### 🔧 Technical Improvements
- Migrated chat system from Realtime Database to Firestore
- Implemented optimistic UI updates for better UX
- Added proper TypeScript types throughout
- Improved error handling and logging
- Better React.memo optimization for message components

---

## [0.1.0] - Previous Beta Releases

### Features from Beta
- Initial study together functionality
- Basic chat system
- User presence tracking
- Daily leaderboard
- Journal feature
- Admin panel
- Google OAuth authentication
- Soundscape mixer
- Timer functionality

---

## Version History

- **v1.2.0** (2026-05-28) - Mobile app experience, resources library, and practice system
- **v1.1.0** (2026-01-04) - Focus chamber overlay and real-time activity feed
- **v1.0.0** (2025-12-25) - Official stable release
- **v0.1.0** (Beta) - Initial development versions
