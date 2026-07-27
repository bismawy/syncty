# Changelog

All notable changes to the **Syncty** project will be documented in this file.

---

## [1.1.0] - 2026-07-27

### 🚀 Highlights
- **Initial Public Release of Syncty** — Zero-Knowledge End-to-End Encrypted bookmark synchronization extension for Chromium & Firefox browsers.

### ✨ Key Features

#### 🛡️ Security & Privacy (Zero-Knowledge E2E)
- **Client-Side Encryption**: Bookmarks are encrypted locally in the browser using **AES-GCM** before sync. The backend server only sees opaque encrypted blobs.
- **12-Word Indonesian Mnemonic**: Secret key derivation via PBKDF2 + HKDF. Your secret key never leaves your device.
- **Device Registry & Conflict Resolution**: Automatic conflict resolution via timestamp and version tracking per device.

#### 📊 Dashboard & New Tab Page
- **Custom New Tab Experience**: Overrides browser new tab with a clean, fast dashboard.
- **Search Engine Bar**: Multi-engine search support (Google, DuckDuckGo, Bing, Brave, Ecosia, etc.).
- **Top & Favorite Sites**: Quick access grid with automatic favicon fetching.
- **Hijri Calendar Widget**: Built-in Hijri & Gregorian date display.

#### 🧰 Bookmark Management & Optimization Tools
- **Duplicate Links Cleaner**: Detect and remove duplicate bookmark URLs across folders.
- **Domain Grouping**: Automatically organize and group bookmarks by domain/host.
- **Empty Folders Detector**: Quickly locate and clean up empty bookmark directories.
- **Folder Merging Tool**: Merge folders with identical names to prevent duplicate directory sprawl.
- **Trash & Recovery**: Soft-delete system allowing item restoration or permanent purge.

#### 🔄 Cross-Platform & Backend
- **WXT Multi-Browser Support**: Built for Chromium (Chrome, Edge, Brave) & Firefox.
- **Cloudflare Worker + D1 Backend**: Lightweight, low-latency sync server built on Cloudflare Workers and D1 SQLite.
