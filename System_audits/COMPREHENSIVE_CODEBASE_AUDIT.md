# SRPHS Grading App — Comprehensive Visual Audit

Generated: 2026-07-28

Scope: This document is a static, no-code-change audit of the repository. It describes the architecture, documentation quality, dependency relationships, and the purpose of each major file, with strong emphasis on the source tree under src/.

---

## 1. Executive Summary

The SRPHS Grading App is a desktop-first, offline academic grading system built around React, TypeScript, Vite, Electron, and a browser-based local storage model. The product is organized around two main user experiences:

1. Teacher gradebook workflows for creating grading projects, managing roster data, adding assessments, entering scores, and computing grade outputs.
2. Adviser portal workflows for consolidating subject grades, building grade matrices, ranking students, determining honors, and generating SF-9 / report-card-style outputs.

From a structural standpoint, the codebase is already fairly rich and feature-complete. The main strengths are:

- Clear separation between app shell, context/state, UI views, and utility modules.
- Strong support for both JHS and SHS grading logic.
- A well-developed adviser workflow with multiple specialized sub-components.
- Mature export/reporting support through PDF and Excel utilities.

The biggest risks from a review perspective are:

- Very large view components that carry substantial UI and business logic together.
- Centralized state management in one context provider that handles authentication, persistence, project editing, adviser data, and backup/restore.
- Documentation and implementation are not perfectly aligned in places, especially around storage and database claims.
- The app appears to rely on localStorage rather than an actual database layer, despite some UI copy mentioning SQLite/Drizzle concepts.

---

## 2. Documentation Review

### What the repository already documents well

- The project has a detailed audit file that describes the overall product vision, architecture, stack, and goals.
- The app UI includes a manual/about view that explains the intended workflow, curriculum logic, and policy context.
- The codebase includes strong domain-specific terminology for grading, advisers, transmutation policies, and report generation.

### Documentation gaps and observations

- The documentation is broad but not yet fully mapped to the actual implementation details in each file.
- Some references in the user-facing documentation mention SQLite/Drizzle/desktop database architecture, but the current implementation appears to use localStorage-based persistence in the React context layer.
- The current documentation would benefit from a source-by-source map so future maintainers can quickly identify what each folder and file is responsible for.

### Audit conclusion on documentation

The project is conceptually well documented, but a file-by-file source map is still helpful for onboarding and future refactoring work.

---

## 3. Dependency Map

### Application entry points

- Root entry: index.html
- Frontend bootstrap: src/main.tsx
- Main app container: src/App.tsx
- Global state provider: src/context/AppContext.tsx
- Electron shell: electron/main.js
- Electron preload bridge: electron/preload.js

### Core dependency relationships

- App.tsx renders the application shell and conditionally opens the Gradebook Workspace and Adviser Portal as modal overlays.
- AppContext provides the core domain state and persistence layer for projects, students, assessments, scores, adviser classes, and settings.
- DashboardView, ClassManagerView, SettingsView, Sidebar, LoginView, and AboutView consume AppContext and render the main user experiences.
- Adviser portal features are split into dedicated sub-components under src/components/adviser/ and rely on adviser utilities in src/utils/adviserUtils.ts and export helpers in src/utils/adviser/.
- PDF and Excel export features are handled by utility modules under src/utils/, with adviser-specific export support under src/utils/adviser/.

### Runtime dependencies

- React and React DOM: UI framework
- Vite + React plugin: build tooling and dev environment
- Electron: desktop packaging and shell
- Tailwind CSS 4: styling utility layer
- Lucide React: icon set
- Motion: animation layer
- Recharts: charting in adviser performance views
- jsPDF + jsPDF AutoTable: PDF generation
- pdf-lib: PDF rendering/exporting
- html2canvas / html2pdf.js: PDF fallback and DOM export support
- xlsx: Excel import/export support

### Major dependency flow

- UI -> AppContext -> localStorage persistence
- UI -> utility modules for grading/transmutation/export logic
- Adviser UI -> adviserUtils -> imported grades / ranking / award computations
- Electron shell -> BrowserWindow -> React app in Vite dev or built dist bundle

---

## 4. Source Area Review

## 4.1 Root Project Files

### package.json

Purpose: Declares the app identity, dependencies, scripts, and Electron packaging configuration.

Observations:
- The project is configured as a Vite + React + Electron application.
- Scripts exist for dev, desktop dev, build, and desktop packaging.
- The app is designed for offline desktop use and includes support for export-oriented workflows.

### tsconfig.json

Purpose: TypeScript compiler configuration for the application.

Observations:
- Standard TypeScript setup for a modern React/Vite codebase.
- Likely appropriate for the current scale of the project.

### vite.config.ts

Purpose: Vite configuration and plugin setup.

Observations:
- Designed for React integration and local dev usage.
- Likely straightforward and conventional.

### index.html

Purpose: Root HTML entry for Vite.

Observations:
- Minimal bootstrap shell for mounting the React app.

### metadata.json

Purpose: Provides metadata about the project or package.

Observations:
- Likely supplemental project metadata rather than core runtime logic.

---

## 4.2 Electron Shell Files

### electron/main.js

Purpose: Creates the Electron window, sets window preferences, loads the app in development or production mode, and handles window-level behavior.

Observations:
- The shell is lightweight and conventional.
- It uses a secure preload bridge pattern with contextIsolation enabled.
- It does not appear to implement any special desktop-specific data or storage layer beyond the browser app.

### electron/preload.js

Purpose: Exposes a minimal API to the renderer via contextBridge.

Observations:
- Minimal and safe.
- Good fit for current architecture.

---

## 4.3 src/ Root Files

### src/main.tsx

Purpose: React DOM entry point that mounts the main App component.

Observations:
- Standard React bootstrap logic.
- Keeps the application entry simple and conventional.

### src/App.tsx

Purpose: The top-level application shell and route orchestrator.

Observations:
- This file controls the overall presentation of the app and opens major workspaces as large overlay panels.
- The Gradebook Workspace and Adviser Portal are implemented as modal-style overlays rather than fully separate routes.
- The structure is visually rich and user-friendly, but it effectively creates a single-page shell that swaps between major workspaces.

### src/types.ts

Purpose: Defines the core domain data model for projects, students, assessments, adviser classes, imported grades, override logs, attendance, and grading-policy settings.

Observations:
- This is one of the most important files in the codebase because it centralizes the business vocabulary of the application.
- It is quite comprehensive and supports both JHS and SHS workflows.
- The presence of adviser-specific types shows the system is not just a simple gradebook; it is a broader school record and reporting platform.

### src/utils.ts

Purpose: Contains grading transmutation logic, subject-weight matching, and grade-computation helpers.

Observations:
- This file is central to the grading engine.
- It implements both DepEd 2015 and MATATAG 2027 transmutation logic.
- It also includes profile-based SHS weighting logic for different assessment profiles.
- Because this file combines multiple concerns, it is a good candidate for future modularization if the app grows further.

### src/data/seedData.ts

Purpose: Provides initial demo projects and default global settings.

Observations:
- The seed data is useful for demonstration and onboarding.
- It gives the app a realistic starting state with sample students, assessments, and quarters.
- It also demonstrates the expected project shape and sample grading workflow.

---

## 4.4 src/context/

### src/context/AppContext.tsx

Purpose: The heart of the application state and persistence layer.

Observations:
- This is the central orchestrator for projects, auth, settings, adviser classes, and local storage persistence.
- It exposes a very large API surface and manages many operations including create, save, duplicate, archive, delete, import roster, add assessment, update scores, backup/restore, and adviser operations.
- The implementation carries a lot of important business logic, which makes it a crucial file for maintainability.
- It also performs data migration logic when loading archived or older project records.
- The persistence strategy is based on localStorage and a set of custom keys such as srphs_projects_p2 and srphs_adviser_classes.

### Audit interpretation

This file is highly functional but also the most likely place where complexity will accumulate over time. It would be beneficial to split persistence, auth, project-domain logic, and adviser-specific logic into smaller modules if the app is refactored later.

---

## 4.5 src/components/

### src/components/Sidebar.tsx

Purpose: Main navigation and workspace switching UI.

Observations:
- Handles the curriculum workspace toggle between JHS and SHS.
- Provides route navigation to Dashboard, Gradebook Workspace, Adviser Portal, Settings, and About.
- The sidebar is polished and strongly visual, which helps the app feel like a desktop application rather than a basic web form.

### src/components/LoginView.tsx

Purpose: Authentication and account creation screen.

Observations:
- Includes login, registration, and superuser bypass flows.
- Uses local app state rather than a separate backend service.
- The screen is visually complete and fairly user-friendly.

### src/components/DashboardView.tsx

Purpose: Project Hub and consolidated reporting dashboard.

Observations:
- One of the larger and more important components in the app.
- Supports project creation, project management, analytics views, and consolidated class reporting.
- It appears to contain both UI layout logic and substantial domain logic for filtering, grouping, analytics, and export preparation.
- This file is a strong example of a component that is doing many jobs at once.

### src/components/ClassManagerView.tsx

Purpose: The main teacher gradebook workspace.

Observations:
- This is the core editing environment for gradebook data.
- Supports roster management, assessment creation, score entry, undo/redo, CSV-like imports, export actions, reporting tabs, and project settings.
- It is highly feature-rich and appears to be the main engine for day-to-day teacher use.
- Like DashboardView, it is fairly large and mixes a large amount of UI and business logic.

### src/components/SettingsView.tsx

Purpose: Global settings and backup/restore controls.

Observations:
- Provides school defaults, grading weight matrices, theme selection, credential settings, logo handling, and backup/restore actions.
- This is an important administrative screen for configuration and data safety.
- The presence of backup/restore functionality is a strong quality feature for an offline desktop application.

### src/components/AboutView.tsx

Purpose: System manual and product overview UI.

Observations:
- Acts as a documentation and orientation screen.
- It explains the intended workflow and policy context in a polished way.
- It is not a core business logic file, but it helps the app feel complete and professional.

### src/components/TeacherExcelExportModal.tsx

Purpose: Modal for exporting teacher grade book data to Excel.

Observations:
- Focused utility component for export selection and configuration.
- Small but relevant part of the reporting workflow.

---

## 4.6 src/components/adviser/

### src/components/adviser/AdviserPortalView.tsx

Purpose: Main container for all adviser portal features.

Observations:
- The adviser portal is implemented as a tabbed workspace with many specialized modules.
- The top-level component acts as the coordinator for class selection, creation, and tab navigation.
- It is well structured for a multi-feature admin workflow.

### src/components/adviser/AdviserStudentManager.tsx

Purpose: Student masterlist management for an adviser class.

Observations:
- Allows adding, editing, deleting, and bulk-entry of students.
- Makes the adviser portal feel like a true class management tool, not just a reporting surface.

### src/components/adviser/GradeImportPanel.tsx

Purpose: Importing subject grade files into the adviser class.

Observations:
- This is a major feature for consolidating teacher-submitted grades.
- It supports the core workflow of turning exported teacher data into official adviser-class grade data.

### src/components/adviser/GradeMatrixTab.tsx

Purpose: Displays consolidated grade matrices by subject and quarter.

Observations:
- The matrix tab is central to the adviser’s review process.
- It likely serves the main decision-making view for grade consolidation and monitoring.

### src/components/adviser/RankingsTab.tsx

Purpose: Computes and displays rankings.

Observations:
- Important for honors and class-position review.
- It gives the adviser a clear view of ranking outcomes based on consolidated data.

### src/components/adviser/AwardeesTab.tsx

Purpose: Displays honor awardees and recognition outcomes.

Observations:
- This tab turns the grade matrix into actionable award decisions.
- It is an important part of the student-recognition workflow.

### src/components/adviser/PerformanceDashboard.tsx

Purpose: Visual performance dashboard for class-level analytics.

Observations:
- Uses charts and summary metrics to provide a more analytical review interface.
- A strong sign that the adviser portal is more than a simple spreadsheet wrapper.

### src/components/adviser/SF9Generator.tsx

Purpose: Generates SF-9 / report-card-style outputs.

Observations:
- This is a high-value feature because it connects internal grade data to formal school reporting artifacts.
- It is one of the most important modules for school administration workflows.

### src/components/adviser/SF9RatingModal.tsx

Purpose: Modal for entering observed values and attendance-related ratings for SF-9 generation.

Observations:
- Adds the school-record nuance needed for report card generation.
- Good evidence of domain-specific support beyond simple grade entry.

### src/components/adviser/ImportedSubjectSummaryModal.tsx

Purpose: Presents summary information for imported subject records.

Observations:
- Helpful for reassurance and auditing imported grade data before final consolidation.

### src/components/adviser/AdviserSettingsPanel.tsx

Purpose: Adviser-class settings and configuration UI.

Observations:
- Supports class-specific configuration such as logos, attendance structure, and policy settings.
- Strongly aligned with the need for school-office level customization.

### src/components/adviser/OverrideLogTab.tsx

Purpose: Displays manual override and change history.

Observations:
- This adds an audit trail capability, which is important for official grading and reporting systems.
- It is one of the more mature governance-related features in the app.

---

## 4.7 src/utils/

### src/utils/adviserUtils.ts

Purpose: Core computing utility for adviser-grade matrix construction, honors classification, promotion determination, and attendance summaries.

Observations:
- This file is essential for turning imported grades into useful adviser outputs.
- It maps raw imported data into rankings, honors, and promotion-ready structures.
- It is a good example of domain logic being moved out of UI components.

### src/utils/pdfExport.ts

Purpose: Handles class record and consolidated grading PDF export generation.

Observations:
- A substantial utility module that supports report generation.
- Likely one of the most important files for printable school outputs.
- It contains detailed PDF layout and summary logic.

### src/utils/teacherExcelExport.ts

Purpose: Exports teacher gradebook data to Excel.

Observations:
- Focused and useful for teacher workflow handoff and backup.

### src/utils/adviser/adviserExports.ts

Purpose: Adviser-specific export utilities.

Observations:
- Supports report-style export behavior for adviser workflows.

### src/utils/adviser/sf9Export.ts

Purpose: SF-9 generation logic.

Observations:
- This is a very domain-specific file and likely central to the final report-card generation experience.

---

## 5. Notable Strengths

- The app has a clear product identity and a strong educational domain focus.
- The gradebook and adviser workflows are both substantial and feature-rich.
- The UI is polished, with strong visual structure and distinct workspaces.
- The system supports both JHS and SHS use cases with profile-based grading logic.
- Report generation and export tools are well represented.
- The presence of override logging and backup/restore tools increases the system’s seriousness as an operational tool.

---

## 6. Notable Risks and Review Concerns

- Large components such as DashboardView and ClassManagerView appear to carry significant functional weight. They may become harder to maintain as features expand.
- The AppContext provider is very broad and acts as a central service layer. This can make future change management more difficult.
- The codebase currently appears to use localStorage for persistence rather than a real database layer despite some documentation suggesting otherwise.
- There is no visible test suite in the repository snapshot, which means the project may be harder to validate during future refactoring.
- Some strings and labels appear to contain minor spelling inconsistencies, which may not be critical but can affect polish.

---

## 7. Recommended Audit Takeaways

If this project is being prepared for refactoring, upgrade, or handoff, the highest-value next steps would be:

1. Keep the current feature scope and architecture but formalize the module boundaries more clearly.
2. Split large view components into smaller focused components.
3. Separate AppContext responsibilities into smaller domain-specific modules.
4. Document the actual persistence approach clearly so the product story matches the implementation.
5. Add automated validation and tests around grading calculations and export logic.

---

## 8. Bottom-Line Assessment

This is a well-conceived and visually polished desktop grading application with strong domain coverage and a clear educational purpose. The source tree is organized around meaningful features, and the adviser workflow in particular is impressive. The main improvement opportunity is not product vision, but maintainability: the app would benefit from a more modular structure as it grows and evolves.
