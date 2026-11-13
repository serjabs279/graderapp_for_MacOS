# SRPHS Academic Grading System

An offline-first academic grading system for SRPHS, built around current DepEd assessment policy. It runs as a desktop application (Tauri) with a browser mode for development, and is designed so that a teacher can compute, check, and export grades with no network connection and no server.

The application is local to the machine it runs on: gradebooks live in local storage, are mirrored to the app data directory so a reinstall does not destroy them, and are exported as versioned JSON archives for backup and transfer.

> This is a school tool in active development. It implements DepEd policy as understood by its authors and is not an official DepEd product. Always confirm computed grades against the current official orders before they are used for promotion, retention, or reporting.

## What it does

- **Gradebook management** — classes, sections, subjects, learners, quarterly grading periods, and adviser assignments.
- **DepEd computation** — weighted scores, transmutation, and final grades following DO 8, s. 2015, with MATATAG adjustments and the policy switch effective SY 2027–2028.
- **Reassessment and adjustment** — mastery and reassessment policies, plus recorded grade adjustments that override the computed grade while preserving the original.
- **Intervention flags** — learners below the passing threshold are surfaced for intervention rather than silently computed and filed.
- **SF9 / SF10 output** — report card and permanent record generation, including a cumulative LRN-indexed SF10 matrix.
- **TSEK score import** — imports scanned exam results, mapping exam categories onto gradebook columns while refusing mismatched sections, duplicate columns, and inconsistent perfect scores.
- **PDF and Excel exports** — printable class records and spreadsheet exports for handover.
- **Backup and restore** — timestamped JSON backups, a 30-minute backup reminder, and restore validation that rejects malformed, incomplete, or unsupported-version archives with a specific reason.
- **Yearly reset** — carries learners forward into a new school year without destroying the previous year's record.

## Stack

| Layer | Choice |
|---|---|
| Shell | Tauri 2 (Rust) — macOS bundles, Android scaffolding |
| UI | React 19 + TypeScript 5.8 |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 |
| Charts | Recharts |
| Documents | jsPDF / jspdf-autotable, pdf-lib, html2pdf |
| Spreadsheets | SheetJS (`xlsx`) |
| Tests | `node --test` with `tsx` |

## Repository layout

```
src/
  App.tsx                 Shell: mounts views, starts the backup reminder
  components/             Dashboard, class manager, settings, modals, sidebar
  components/adviser/     Adviser-grade flows: SF9 export, grade import, learners
  context/                App state and toast providers
  utils/                  Grading, persistence, import/export, validation, logging
  utils/__tests__/        Unit tests for grading, archives, storage, TSEK import
  calendar/  data/        School calendar handling and seed data
src-tauri/                Rust shell, capabilities, bundler config
docs/                     Domain specifications (SF10 generator contract)
System_audits/            Self-audits of the codebase
```

## Getting started

Requires Node 22 or newer.

```bash
npm install
npm run dev        # browser preview at http://localhost:3000
```

For the desktop application you also need Rust and the Tauri system prerequisites for your platform, then:

```bash
npm run desktop        # dev window with hot reload
npm run desktop:build  # production bundle
```

Android scaffolding is present and under active work — see `ANDROID_IMPLEMENTATION_PLAN.md`:

```bash
npm run dev:android
npm run build:android   # APK
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | Production frontend build into `dist/` |
| `npm run preview` | Serve the built frontend |
| `npm run lint` | `tsc --noEmit` — type check only |
| `npm test` | Unit test suite |
| `npm run desktop` | Tauri dev window |
| `npm run desktop:build` | Tauri production bundle |
| `npm run tauri` | Raw Tauri CLI passthrough |

## Testing

```bash
npm run lint
npm test
```

The suite currently covers grading computation and transmutation boundaries, the SY 2027–2028 policy switch, subject weighting, adviser utilities, archive validation, storage-quota fallback, and the TSEK import pipeline end to end.

`npm test` enumerates its test files explicitly in `package.json`. **A new `*.test.ts` file is not picked up until it is added to that list** — a script that globs the directory would remove this foot-gun.

CI runs `npm ci`, `npm run lint`, and `npm test` on every push to `main` and every pull request (`.github/workflows/ci.yml`). A separate, manually triggered workflow builds macOS bundles for Apple Silicon and Intel.

## Data and backup model

Gradebooks are held in `localStorage` and mirrored on every write to the Tauri app-data directory (`edu.srphsi.gradeapp`), which survives uninstall and reinstall. On startup the app prefers local storage, falls back to the app-data copy, and seeds an empty workspace only when both are absent.

Backups are JSON archives carrying a `metadata` block (`archiveVersion`, `schoolYear`, `calendarType`, `createdAt`, `createdBy`). Restore runs `validateArchive`, which rejects invalid JSON, missing metadata fields, unsupported archive versions, and archives without a `projects` array — each with a message that names the actual problem, because a teacher restoring a file needs to know what is wrong, not merely that it failed.

## Documentation

- [`docs/SF10_GENERATOR_SPECIFICATION.md`](docs/SF10_GENERATOR_SPECIFICATION.md) — SF10 permanent-record contract, LRN cumulative vault, and the JSON interface advisers export.
- [`System_audits/COMPREHENSIVE_CODEBASE_AUDIT.md`](System_audits/COMPREHENSIVE_CODEBASE_AUDIT.md) and [`System_audits/CODABASE_AUDIT.md`](System_audits/CODABASE_AUDIT.md) — internal audits, including known rough edges.
- [`ANDROID_IMPLEMENTATION_PLAN.md`](ANDROID_IMPLEMENTATION_PLAN.md) — Android port plan.

## Status

Version 2.0.2. The grading, import, validation, and export paths are covered by tests; the UI layer is not. `ClassManagerView` is a known maintainability hotspot at roughly 4,900 lines and is a candidate for splitting by concern.

No license file is present. Absent one, the code is all rights reserved — add a license before distributing it beyond the intended school.
