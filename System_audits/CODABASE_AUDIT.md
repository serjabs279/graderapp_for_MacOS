# SRPHS Academic Grading System — Complete Codebase Audit

> **Generated:** April 2025  
> **Project:** SRPHS Grading App (Offline Desktop)  
> **Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, Electron, jsPDF, pdf-lib, XLSX  
> **Repository Root:** `SRPHS-GRADING-APP/`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Stack & Dependencies](#3-technology-stack--dependencies)
4. [Dependency Map](#4-dependency-map)
5. [File Summaries](#5-file-summaries)
6. [Code Quality Audit](#6-code-quality-audit)
7. [Performance Considerations](#7-performance-considerations)
8. [Security Audit](#8-security-audit)
9. [Testing Status](#9-testing-status)
10. [Recommendations](#10-recommendations)

---

## 1. Executive Summary

The SRPHS Grading System is an **offline-first academic grading desktop application** built for San Roque Parish High School, Incorporated (SRPHS). It supports Philippine DepEd's grading policies (DO 8, s. 2015 and MATATAG 2027) for both **Junior High School (JHS)** and **Senior High School (SHS)** tracks.

**Two Primary Workspaces:**

1. **Teacher Gradebook** — Individual subject teachers create projects, manage rosters, build assessments (Written Works, Performance Tasks, Exams), enter scores, compute transmuted grades.
2. **Adviser Portal** — Class advisers consolidate subject grades from all teachers, build grade matrices, compute rankings, determine honors awardees, generate SF-9 Report Cards (PDF), and maintain an audit trail.

**Key Metrics:**
- ~4,000+ lines of TypeScript/React code across 30+ files
- 25+ React components (9 core, 9+ adviser sub-components)
- 10 utility/helper modules
- 2 seed data projects with 16 student records
- Full PDF generation (SF9, Class Records, Consolidated Reports) via **both** jsPDF and pdf-lib
- Full Excel import/export via SheetJS (xlsx)
- 100% offline — localStorage persistence, Electron desktop shell

---

## 2. Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│                   Electron Shell                        │
│  (main.js — window + preload.js — context bridge)       │
└──────────────────────┬─────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────┐
│                  React Application                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────┐  │
│  │  App.tsx │  │ Sidebar  │  │AppContext│  │Types  │  │
│  └────┬─────┘  └──────────┘  └────┬─────┘  └───────┘  │
│       │                            │                   │
│  ┌────▼────────────────────────────┘                   │
│  │  Route (activeRoute):                               │
│  │  dashboard → DashboardView                          │
│  │  class-manager → ClassManagerView (modal overlay)   │
│  │  adviser → AdviserPortalView (modal overlay)        │
│  │  settings → SettingsView                            │
│  │  about → AboutView                                  │
│  └─────────────────────────────────────────────────────│
│                                                        │
│  ┌──────────── ADVISER PORTAL ───────────────────────┐ │
│  │ Masterlist | Import | Matrix | Rankings | Awardees│ │
│  │ Performance | SF-9 | Override Log | Settings      │ │
│  └───────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
    ┌─────────▼─────────┐         ┌───────────▼──────────┐
    │ localStorage DB     │        │ File System Exports  │
    │ (srphs_projects_p2, │        │ - PDF (jsPDF/pdf-lib)│
    │ srphs_adviser_*,    │        │ - Excel (XLSX)       │
    │ srphs_settings_p2)  │        │ - JSON Backup        │
    └─────────────────────┘        └──────────────────────┘
```

### Design Pattern

Custom **React Context** (`AppContext`) acts as the global state manager with ~50+ exposed methods. No external state library (Redux/Zustand). Data persisted entirely in `localStorage` under `srphs_*` prefixed keys.

---

## 3. Technology Stack & Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` + `react-dom` | ^19.0.1 | UI framework |
| `vite` + plugin-react | ^6.2.3 | Build tool |
| `tailwindcss` + `@tailwindcss/vite` | ^4.1.14 | CSS utility framework |
| `lucide-react` | ^0.546.0 | Icon library |
| `motion` | ^12.23.24 | Animation |
| `recharts` | ^3.10.0 | Charting |
| `jspdf` + `jspdf-autotable` | ^4.2.1 | PDF generation (SF-9) |
| `pdf-lib` | ^1.17.1 | PDF generation (Class Records) |
| `html2canvas` + `html2pdf.js` | ^1.4.1 / ^0.14.0 | DOM-to-PDF fallbacks |
| `xlsx` | ^0.18.5 | Excel read/write |
| `express` | ^4.21.2 | Web server |
| `@google/genai` | ^2.4.0 | Gemini AI integration |
| `dotenv` | ^17.2.3 | Environment config |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ~5.8.2 | Type system |
| `electron` + `electron-builder` | ^35.1.0 | Desktop shell + packaging |
| `concurrently` + `wait-on` | ^9.0.1 | Dev script orchestration |
| `tsx` | ^4.21.0 | TS execution |

---

## 4. Dependency Map

### 4.1 High-Level Dependency Flow

The application is composed of four major layers:

1. Desktop shell layer
   - Electron loads the React app inside a native desktop window.
   - The `electron/main.js` file controls window creation and packaging behavior.

2. Presentation layer
   - `src/App.tsx` acts as the top-level shell.
   - Views such as `DashboardView`, `ClassManagerView`, `SettingsView`, `LoginView`, and `AboutView` render the visible workspace.

3. State and domain layer
   - `src/context/AppContext.tsx` centralizes most application behavior.
   - This provider owns project creation, roster updates, score editing, adviser class management, settings, authentication, and backup/restore operations.

4. Utility and export layer
   - `src/utils.ts` contains grade computation and transmutation helpers.
   - `src/utils/pdfExport.ts` and `src/utils/teacherExcelExport.ts` support reporting and export workflows.
   - Adviser-specific reporting is handled by `src/utils/adviserUtils.ts`, `src/utils/adviser/adviserExports.ts`, and `src/utils/adviser/sf9Export.ts`.

### 4.2 Key Internal Dependencies

- `App.tsx` depends on `AppContext`, the sidebar, dashboard, class manager, settings, about, and adviser portal views.
- `DashboardView` depends on `AppContext`, grading utilities, and PDF export helpers.
- `ClassManagerView` depends on `AppContext`, grade computation logic, and Excel/PDF export modules.
- `AdviserPortalView` depends on adviser-specific subcomponents and adviser utility functions.
- `SettingsView` depends on `AppContext` for backup/restore, settings updates, and credential management.
- `LoginView` depends on the authentication helpers exposed by `AppContext`.

### 4.3 Dependency Summary by Area

- Core UI shell: `src/App.tsx`, `src/components/Sidebar.tsx`, `src/components/LoginView.tsx`
- Teacher workflow: `src/components/DashboardView.tsx`, `src/components/ClassManagerView.tsx`, `src/components/TeacherExcelExportModal.tsx`
- Adviser workflow: `src/components/adviser/*`
- Shared grading logic: `src/utils.ts`, `src/utils/adviserUtils.ts`
- Report/export logic: `src/utils/pdfExport.ts`, `src/utils/teacherExcelExport.ts`, `src/utils/adviser/sf9Export.ts`
- Type definitions: `src/types.ts`
- Seed/demo data: `src/data/seedData.ts`

---

## 5. File Summaries

### 5.1 Root-Level Files

- `package.json` — Declares scripts, dependencies, and Electron packaging configuration.
- `tsconfig.json` — TypeScript compiler settings for the app.
- `vite.config.ts` — Vite build and plugin configuration.
- `index.html` — Root HTML shell for the React/Vite app.
- `metadata.json` — Supplementary app metadata.

### 5.2 Electron Shell Files

- `electron/main.js` — Creates the desktop window, loads the app, and configures shell behavior.
- `electron/preload.js` — Exposes a minimal bridge API to the renderer process.

### 5.3 Source Files in `src/`

- `src/main.tsx` — React entry point that mounts the application.
- `src/App.tsx` — Main app container and overlay-based workspace switcher.
- `src/types.ts` — Core domain model for students, assessments, projects, adviser classes, and grading settings.
- `src/utils.ts` — Shared grading utilities including transmutation tables and subject-weight resolution.
- `src/data/seedData.ts` — Demo seed projects and default global settings.

### 5.4 View Components

- `src/components/Sidebar.tsx` — Navigation and workspace switching.
- `src/components/LoginView.tsx` — Login, account creation, and superuser bypass UI.
- `src/components/DashboardView.tsx` — Project hub, analytics, and consolidated reporting entry point.
- `src/components/ClassManagerView.tsx` — Main gradebook workspace for managing students, assessments, and scores.
- `src/components/SettingsView.tsx` — System settings, backup/restore, and configuration tools.
- `src/components/AboutView.tsx` — User-facing documentation/manual view.
- `src/components/TeacherExcelExportModal.tsx` — Export modal for teacher gradebook data.

### 5.5 Adviser Components

- `src/components/adviser/AdviserPortalView.tsx` — Main adviser portal container and tab router.
- `src/components/adviser/AdviserStudentManager.tsx` — Adviser-side student masterlist management.
- `src/components/adviser/GradeImportPanel.tsx` — Import of teacher-submitted grades into adviser class data.
- `src/components/adviser/GradeMatrixTab.tsx` — Consolidated grade matrix display.
- `src/components/adviser/RankingsTab.tsx` — Ranking calculations and list view.
- `src/components/adviser/AwardeesTab.tsx` — Honor awardee summary page.
- `src/components/adviser/PerformanceDashboard.tsx` — Charts and class-performance metrics.
- `src/components/adviser/SF9Generator.tsx` — Report-card/SF-9 generation workflow.
- `src/components/adviser/SF9RatingModal.tsx` — Observed value and attendance entry for report cards.
- `src/components/adviser/ImportedSubjectSummaryModal.tsx` — Summary modal for imported subject data.
- `src/components/adviser/AdviserSettingsPanel.tsx` — Adviser-specific configuration panel.
- `src/components/adviser/OverrideLogTab.tsx` — Manual override and audit log review.

### 5.6 Utility Modules

- `src/utils/adviserUtils.ts` — Matrix construction, honors classification, promotion logic, and attendance summary helpers.
- `src/utils/pdfExport.ts` — Class record and consolidated grading PDF export logic.
- `src/utils/teacherExcelExport.ts` — Excel export for teacher gradebooks.
- `src/utils/adviser/adviserExports.ts` — Adviser export helpers.
- `src/utils/adviser/sf9Export.ts` — SF-9 report-card generation logic.

---

## 6. Code Quality Audit

### 6.1 Strengths

- The codebase is organized by feature and workflow rather than by random file scattering.
- The domain model is relatively clear, especially for projects, students, assessments, and adviser classes.
- The UI is polished and consistent, making the app feel more complete than a minimal prototype.
- Shared business logic is partly separated into utilities rather than being embedded entirely inside components.

### 6.2 Maintainability Concerns

- Several major components are large and contain both UI and business logic, which increases complexity.
- `AppContext` acts as a catch-all for state, persistence, and app operations. This makes it a central point of failure and a likely growth bottleneck.
- There is evidence of repeated patterns in the UI layer, especially in modal handling, inline alerts, and report/export flows.
- Some parts of the implementation appear to be built quickly for functionality rather than for long-term structure.

### 6.3 Code Structure Assessment

The codebase is usable and coherent, but it would benefit from continued refactoring toward smaller, focused modules. If this project is going to be maintained for years, separating feature-specific logic from view components would improve readability and reduce coupling.

### 6.4 Quality Summary

Overall quality is good for a feature-rich internal tool, but the app is now at the point where maintainability should become a deliberate design priority rather than an incidental outcome.

---

## 7. Performance Considerations

### 7.1 Current Performance Profile

The app appears to be responsive for its current scope because it is a local desktop app and does not rely on a remote backend. Most operations happen in memory and are persisted to `localStorage`, which keeps interactions quick for small-to-medium datasets.

### 7.2 Likely Bottlenecks

- Large React components may re-render more than necessary when state changes frequently.
- The adviser portal and dashboard may become slower as the number of students and imported grades increases.
- PDF export operations can be expensive, particularly when generating large reports or processing many rows.
- Frequent localStorage writes for every data update can become a performance concern if the data volume grows significantly.

### 7.3 Optimization Opportunities

- Split large components into smaller presentational pieces.
- Memoize derived values where repeated calculations are expensive.
- Consider batching large updates to reduce state churn.
- Keep export generation asynchronous where possible so the UI remains responsive during report creation.

---

## 8. Security Audit

### 8.1 What Is Secure About the Current Approach

- The app is offline-first, which reduces exposure to typical remote attack vectors.
- The Electron shell is minimal and uses context isolation, which is a solid default security posture.
- The app avoids direct external network access in its core workflow.

### 8.2 Main Security Risks and Concerns

- Authentication is implemented in the front end and is not a robust security boundary for real multi-user environments.
- Default or hard-coded credentials are visible in the code and should not be treated as production-grade security.
- Data is stored in `localStorage`, which is not encrypted and is not suitable for sensitive or regulated data.
- Imported files and clipboard-based data entry could become vectors for malformed data or injection-style issues if not validated carefully.
- The app currently appears to rely on local trust rather than stronger access control, encryption, or server-side validation.

### 8.3 Security Summary

For an internal school-grade tool, the current approach is acceptable for offline use, but it should not be treated as a hardened enterprise security system.

---

## 9. Testing Status

### 9.1 Current State

No dedicated automated test suite was observed in the provided repository snapshot. The application appears to be manually exercised through the UI and local workflows rather than through automated test coverage.

### 9.2 What This Means

- Core grade calculations may be correct but are not currently protected by regression tests.
- Export behavior, ranking logic, honors logic, and adviser workflows are especially important candidates for automated verification.
- A lack of tests increases the risk of regressions during future refactoring or dependency upgrades.

### 9.3 Recommended Testing Focus

- Unit tests for transmutation and grading logic.
- Unit tests for adviser matrix construction and ranking logic.
- UI tests for core flows such as creating projects, adding students, and entering grades.
- Export tests for PDF and Excel generation where possible.

---

## 10. Recommendations

1. Continue modularizing the app by splitting large components into smaller, focused modules.
2. Refactor `AppContext` into smaller feature-specific providers or services over time.
3. Improve documentation so it stays aligned with the actual implementation, especially around persistence and storage.
4. Add automated tests around grading logic and export workflows.
5. Replace or supplement `localStorage` with a more robust persistence strategy if the app grows in scope or sensitivity.
6. Formalize validation rules for imported data and user-entered values to reduce edge-case failures.
7. Keep the current polished UI, but reduce duplication in modal and notification patterns.
8. Treat the adviser portal as a mission-critical workflow and continue hardening its data flows and audit capabilities.

---

## Final Assessment

The SRPHS Grading App is a thoughtful, feature-rich, and visually polished application that already covers a broad set of teacher and adviser workflows. Its biggest opportunity is not vision but maintainability: as the codebase grows, a more modular architecture and stronger automated testing will make it more resilient and easier to evolve.
