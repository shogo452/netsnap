# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Run all tests:** `npx vitest run`
- **Run a single test file:** `npx vitest run tests/utils.test.js`
- **Run tests in watch mode:** `npx vitest`

No build step — this is an unpacked Chrome extension loaded directly from source.

## Architecture

NetSnap is a Chrome Manifest V3 extension that captures network requests as HAR and takes screenshots.

**Data flow:** `chrome.devtools.network API → devtools.js → chrome.storage.local → popup.js → Clipboard / File`

- `devtools.js` — Runs in the DevTools panel context. Captures HAR entries via `chrome.devtools.network`, strips response bodies, and writes to `chrome.storage.local`. Capped at 2000 entries.
- `background.js` — Service worker. Handles `captureTab` messages to take visible-tab screenshots via `chrome.tabs.captureVisibleTab`.
- `popup.js` — Main popup UI logic. Reads HAR entries from storage, renders a filterable/selectable list, and handles HAR copy/download and screenshot display. Uses ES modules (`type="module"` in popup.html).
- `utils.js` — Pure utility functions (`formatSize`, `formatTime`, `statusClass`, `extractPath`) shared between popup.js and tests.
- `popup.html` / `popup.css` — Popup markup and styles.

## Key Conventions

- **No bundler.** All JS runs directly in the browser as ES modules or Chrome extension scripts. `devtools.js` and `background.js` are non-module scripts (no import/export); `popup.js` uses ES module imports.
- **Pure functions go in `utils.js`** to keep them testable. DOM-dependent code stays in `popup.js`.
- **Vanilla JS only** — no frameworks or libraries in the extension itself. Vitest is the sole dev dependency.
- Chrome extension APIs (`chrome.storage`, `chrome.tabs`, `chrome.devtools`, `chrome.runtime`) are used directly without wrappers.
