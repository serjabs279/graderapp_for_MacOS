# SRPHS Grading Application: Android Migration & Complete System Upgrade Plan

## Executive Summary
This document is a comprehensive, line-by-line synthesis of **every single prompt, bug report, architectural inquiry, DepEd policy directive, and feature implementation requested tonight**. It serves as an authoritative specification and step-by-step **Android Implementation Plan (Tauri v2 Mobile APK)**.

---

## Part 1: Full Historical Prompt Inventory & Changes Made Tonight

### 1. In-Gradebook Teacher Credentials & Info Editing
- **User Prompt**: *"teachers info editing inside the gradebook itself, because some teachers forget to set their info first before making a gradebook, so we should have this function."*
- **Implementation**:
  - Added an interactive **Teacher Info & Class Settings Modal** directly within [`ClassManagerView.tsx`](file:///src/components/ClassManagerView.tsx).
  - Teachers can edit: Teacher Name, School Name, Subject Name, Grade Level, Section, Passing Grade, DepEd Policy (`2015` vs `2027 MATATAG`), and Subject Weights without leaving the active gradebook.
  - Implemented and overloaded `updateProjectTeacherInfo` in [`AppContext.tsx`](file:///src/context/AppContext.tsx) to persist these edits seamlessly to local state and native disk storage.

---

### 2. Teacher-Only Grade Adjustment Feature with Proportional Distribution & Audit Logging
- **User Prompt**: 
  - *"Add a teacher-only Grade Adjustment feature to the Gradebook."*
  - *"Create an ON/OFF toggle. When ON, display a purple adjustment row under WW, PT, and QSTE. The teacher enters the desired adjusted quarterly grade, for example, 80 to 81."*
  - *"The system should calculate the difference, +1 in this example, and distribute the equivalent adjustment across WW, PT, and QSTE using the existing grading formula and component weights. Do not change the original scores. The purple row should show only the additional points applied to each component."*
  - *"The adjusted grade should override the current quarterly grade while the original computed grade remains preserved."*
  - *"Record every adjustment in an action log with student, teacher, subject, original grade, adjusted grade, difference, reason, date, and timestamp."*
  - *"When exporting the gradebook to JSON, export the adjusted quarterly grade. If no adjustment exists, export the original grade as usual. When the toggle is OFF, the gradebook must work exactly as it currently does."*
- **Implementation**:
  - **Data Schema** ([`types.ts`](file:///src/types.ts)): Added `GradeAdjustmentEntry` and extended `QuarterData` with `adjustmentModeEnabled?: boolean` and `adjustments?: Record<string, GradeAdjustmentEntry>`.
  - **Math Distribution** ([`utils.ts`](file:///src/utils.ts)): Implemented `computeGradeAdjustmentDistribution(difference, weights)` which calculates $\Delta$ and distributes points across Written Works, Performance Tasks, and Quarterly Exams according to the subject's active component weights.
  - **UI & Controls** ([`ClassManagerView.tsx`](file:///src/components/ClassManagerView.tsx)):
    - Added purple toggle switch and highlighted purple adjustment row beneath student grades.
    - Added Modal to input target adjusted grade (`60–100`) and justification reason.
    - Preserved original raw scores intact while displaying component point deltas.
    - Integrated Audit Log Modal showing historical adjustments with timestamps.
  - **JSON Export** ([`utils/subjectGradeExport.ts`](file:///src/utils/subjectGradeExport.ts)): `computeProjectStudentGrade` resolves `adjustmentEntry.adjustedGrade` when adjustment mode is active, ensuring exported JSONs convey the official adjusted grade to the Adviser Portal.

---

### 3. Grade Computation & Transmutation Parity (Teacher vs Adviser Matrix)
- **User Prompt**: 
  - *"grade computation review, grade in the imported json sometimes do not calculate well in the adviser portal, example: 75 in the generated json from the teacher but in the adviser grade matrix its 74"*
  - *"review the transmutation table it seems off follow the image provided (Table 4. Adjusted Transmutation Table)"*
- **Implementation**:
  - Audited grade calculation pipeline between teacher gradebook calculation (`computeProjectStudentGrade`) and exported JSON values.
  - Resolved rounding discrepancies by strictly passing final transmuted integer grades into the exported JSON and ensuring the Adviser Grade Matrix does not re-transmute already transmuted subject grades.
  - **Calibrated `transmuteGrade2027` with 100% fidelity to DepEd *Table 4. Adjusted Transmutation Table***:
    - Upper brackets: `99.50-100.00` → `100`, `98.32-99.49` → `99`, `97.14-98.31` → `98`, `95.96-97.13` → `97`, down to `75.90-77.07` → `80`.
    - Passing boundary: `70.00-71.17` → `75`.
    - Lower brackets: `65.34-69.99` → `74`, `60.67-65.33` → `73`, down to `0.00-4.67` → `60`.

---

### 4. Smart Excel Class Record Import Engine
- **User Prompt**: *"excel import for the gradebook for the records encoded in the excel, this must automatically identify and assign the scores to the designated columns, must be able to recognize rows named or belongs to written, performance and quarterly exam"*
- **Implementation**:
  - Created [`src/utils/excelImportParser.ts`](file:///src/utils/excelImportParser.ts) powered by `xlsx`.
  - Scans spreadsheet headers to heuristically detect:
    - Learner Reference Numbers (LRN), Full Names (Last Name, First Name), and Gender/Sex.
    - Assessment column categories: `WOW` / Written Works, `PPT` / Performance Tasks, and `QSTE` / Quarterly Exams.
    - Highest Possible Scores (HPS).
  - Added an intuitive **Excel Import Modal** in [`ClassManagerView.tsx`](file:///src/components/ClassManagerView.tsx) that previews recognized learners and columns before merging them into the active roster and quarter record.

---

### 5. Adviser Direct Grade Entry (for Part-Time / Non-App Teachers)
- **User Prompt**:
  - *"Add a new feature under the Adviser Portal's Override section called 'Direct Grade Entry'."*
  - *"Treat this as a separate self-contained module. Do not place the implementation directly in App.tsx."*
  - *"The adviser should be able to create a new subject directly from this section. When the adviser creates the subject, it should automatically appear in the class Grade Matrix for that section."*
  - *"For subjects created through Direct Grade Entry, the adviser should be able to manually enter the quarterly grade for each student without requiring a teacher gradebook, Excel import, or JSON file. This is intended for part-time teachers who provide only the final quarterly grades."*
  - *"The adviser should be able to: Create the subject and assign it... Enter the quarterly grade directly... Edit or correct... Save the grades and have them immediately reflected in the Grade Matrix... Include the grades in the normal report and JSON export process... Keep an action log... Clearly mark these subjects as Adviser Direct Entry subjects internally... Do not change the existing teacher gradebook workflow... this subjects from the override section must also appear in the sf 9 of the students."*
- **Implementation**:
  - Created dedicated module [`src/components/adviser/directGradeEntry/DirectGradeEntryTab.tsx`](file:///src/components/adviser/directGradeEntry/DirectGradeEntryTab.tsx).
  - Integrated tab into [`AdviserPortalView.tsx`](file:///src/components/adviser/AdviserPortalView.tsx) with icon and description.
  - Updated [`types.ts`](file:///src/types.ts): added `isDirectEntry?: boolean`, `directEntryTeacher?: string`, and override log actions `'Direct Grade Entry Created'`, `'Direct Grade Saved'`, and `'Direct Grade Edited'`.
  - Synchronizes directly into `adviserClass.importedGrades`, automatically rendering in Grade Matrix, Rankings, Awardees, and SF-9 report cards.

---

### 6. Academic Excellence Certificate Generator & WYSIWYG Live Preview
- **User Prompts**:
  - *"certificate generation for all the academic achievers, the size of the paper must be an A4, orientation is portrait and must fit 2 certificates in 1 page specifically 2 students in 1 a4 paper, make sure the certificate has a good design."*
  - *"THIS IS YOUR CITATION IN THE CERTIFICATEGENERATOR.TS... TURN THAT INTO THIS: CERTIFICATE OF ACADEMIC EXCELLENCE... for the 1ST QUARTER of the Academic Year 2026-2027 in Grade 7 - STA... Given and signed this (date here) the adviser can and must manually input the date of the certificate giving, so add that feature in the certificate generator and also add HTML preview of the certificate"*
  - *"certificate contents are too small, too much negative space, I suggest you adjust the font size also make the name of the student auto scale according to the length of his or her name it should be staying one line only"*
  - *"the date format of the given this must be date, month and year. example: 13th of September 2026 at San Roque Parish High School Incorporated's Campus."*
  - *"remove that campus word in the certificate just SAN ROQUE PARISH HIGH SCHOOL, INC."*
- **Implementation**:
  - **Generator Engine** ([`src/utils/adviser/certificateGenerator.ts`](file:///src/utils/adviser/certificateGenerator.ts)):
    - A4 Portrait format ($210 \times 297\text{ mm}$), precisely divided into two $148.5\text{ mm}$ halves with ornate double-gold borders, corner embellishments, DepEd/School logos, and a cut line.
    - **Single-Line Auto-Scaling Font Algorithm**: Continuously computes `doc.getTextWidth()` in a loop, dynamically scaling student name font sizes between `18pt` and `9pt` to guarantee long names never wrap or overflow.
    - **DepEd Date Ordinal Formatter**: `getDefaultCertificateDate()` outputs formatted ordinals: `13th of September 2026 at SAN ROQUE PARISH HIGH SCHOOL, INC.`
    - Configurable Quarter citation (e.g., `1st Quarter`, `2nd Quarter`, or `Academic Year`).
  - **Live WYSIWYG HTML Preview Modal** ([`src/components/adviser/CertificatePreviewModal.tsx`](file:///src/components/adviser/CertificatePreviewModal.tsx)):
    - Full preview matching the golden certificate design with quarter selector, editable date/venue input, student pagination/carousel, and direct PDF generation.
  - **Awardees Trigger** ([`src/components/adviser/AwardeesTab.tsx`](file:///src/components/adviser/AwardeesTab.tsx)): Added "Preview Certificate" eye button and fixed missing React `useMemo` import.

---

### 7. Zero Data-Wipe Native Persistence Across Updates (Android APK, macOS DMG, Windows EXE)
- **User Prompts**:
  - *"if i wer to create a new .exe, .apk and .dmg file wil this new version overrides my old files or data entry? answer directly and briefly"*
  - *"duhhh it removed my data and replaced it with the hardcoded ones after the update, what is a safer update method"*
  - *"does this mean that the older version before this update will retain its data?"*
  - *"WILL THIS PATCH UPDATE WORKS ON ANDROID APK AND MAC DMG? WILL THIS NOT ERASE THEIR OLD WORKS?"*
- **Implementation**:
  - Installed and configured `@tauri-apps/plugin-fs` across Rust backend ([`src-tauri/Cargo.toml`](file:///src-tauri/Cargo.toml), [`src-tauri/src/lib.rs`](file:///src-tauri/src-tauri/src/lib.rs)) and Tauri capabilities ([`src-tauri/capabilities/default.json`](file:///src-tauri/capabilities/default.json)).
  - Built [`src/utils/tauriPersistence.ts`](file:///src/utils/tauriPersistence.ts):
    - **Dual-Layer Storage**: Writes instantaneously to `localStorage` for UI speed while asynchronously mirroring all data to native disk storage (`BaseDirectory.AppData/data/*.json`).
    - **Automatic Restore on Startup**: In [`AppContext.tsx`](file:///src/context/AppContext.tsx), if `localStorage` is cleared or empty after an app update, data automatically hydrates from the native `AppData` directory.
    - In-place updates (`adb install -r` on Android or overwriting the app bundle on macOS/Windows) preserve internal app data storage without data loss.

---

### 8. In-Gradebook Custom Component Weights Editing
- **User Prompt**: *"also add in the teacher edit info the edit subject weights if they accidentally set the wrong subject weights even though we have already the global settingd"*
- **Implementation**:
  - Enhanced the Teacher Info modal in [`ClassManagerView.tsx`](file:///src/components/ClassManagerView.tsx) to include editable inputs for Written Works (`WW %`), Performance Tasks (`PT %`), and Quarterly Exams (`QE %`).
  - Added dynamic validation requiring weights to sum to exactly `100%`.
  - Added one-click DepEd preset buttons (`20-50-30` and `20-60-20`) for immediate correction.

---

### 9. DepEd Trimester Grading Weights Policy (SY 2026–2027 Guidelines)
- **User Prompt**:
  - *"Core Subjects (Araling Panlipunan, English, Filipino, Mathematics, Science, and GMRC / Values Education): Written Works make up 20%, Performance Tasks account for 50%, and Summative Tests & Term Exams comprise 30%."*
  - *"EPP / TLE and MAPEH: Written Works stand at 20%, Performance Tasks take 60%, and Summative Tests & Term Exams complete the remaining 20% follow this"*
- **Implementation**:
  - Updated [`src/utils.ts`](file:///src/utils.ts) and [`src/data/seedData.ts`](file:///src/data/seedData.ts) default weight profiles:
    - **Core Subjects**: `20% WW`, `50% PT`, `30% QE/ST`.
    - **EPP / TLE / MAPEH**: `20% WW`, `60% PT`, `20% QE/ST`.
  - Fully wired into the grading engine, seed records, and gradebook component calculations.

---

### 10. Runtime Bug Fixes & Type Safety
- **Prompt / Bug 1**: `TypeError: can't access property "teacherName", info is undefined updateProjectTeacherInfo AppContext.tsx:842`
  - *Fix*: Added signature overloading in `updateProjectTeacherInfo` to handle both `(info)` and `(projectId, info)` caller patterns safely.
- **Prompt / Bug 2**: `Uncaught ReferenceError: useMemo is not defined at AwardeesTab (AwardeesTab.tsx:14:20)`
  - *Fix*: Added `useMemo` to React imports in [`AwardeesTab.tsx`](file:///src/components/adviser/AwardeesTab.tsx).
- **Prompt / Bug 3**: `TypeError: Cannot read properties of undefined (reading 'toFixed') at ClassManagerView.tsx:1638:185`
  - *Fix*: Applied null-coalescing fallbacks `(computed.adjustmentEntry.wwAdjustment ?? 0).toFixed(2)` in table cells and adjustment logs.
- **Prompt / Bug 4**: `error TS2305: Module '"../../types"' has no exported member 'GradeMatrix' at AwardeesTab.tsx`
  - *Fix*: Updated import from `../../utils/adviserUtils` where `GradeMatrix` and `StudentGradeRow` are defined, and provided strict type annotations for array sorting and filtering.
- **Prompt / Bug 5**: `error TS2345 / TS2339 in ClassManagerView.tsx Excel import merge`
  - *Fix*: Properly mapped parsed Excel students and assessment columns to strict `Student` and `Assessment` model instances with generated unique IDs (`id`, `order`) and translated scores safely from temporary keys to student/assessment IDs.

---

### 11. Full Roster Export with Inactive Learner Highlighting (Dropped / Transferred)
- **User Prompt**: 
  - *"when exporting json file from the gradebook there are some students that are not being imported, SILANG and ZAPATA is not found in the JSON file"*
  - *"Option B (Code adjustment I want all enrolled students exported regardless of status): but their names and their own columns (scores) cells will be highlighted with red to remind teachers that they are not in school anymore"*
- **Implementation**:
  - **Export Engine Overhaul** ([`src/utils/subjectGradeExport.ts`](file:///src/utils/subjectGradeExport.ts)):
    - Modified `generateSubjectGradeJSON` so that **all students** (including `Dropped` and `Transferred`) are exported rather than filtering exclusively for active students.
    - Updated `SubjectGradeExportJSON` in [`src/types.ts`](file:///src/types.ts) to include the `status` field (`'Active' | 'Dropped' | 'Transferred'`) in every learner grade record.
  - **ClassManagerView Inactive Visual Warning** ([`src/components/ClassManagerView.tsx`](file:///src/components/ClassManagerView.tsx)):
    - Added red/rose tinting across inactive learner rows (`bg-rose-50/60 dark:bg-rose-950/30`).
    - Added pulsing badges (`DROPPED`, `TRANSFERRED`) adjacent to learner names with line-through styling.
    - Highlighted all score cells (Written Works, Performance Tasks, Quarterly Exam) with rose borders/backgrounds to clearly remind teachers that the learner is no longer in school.

---

### 12. Pre-Export & Pre-Import Verification Notification Modals
- **User Prompt**: 
  - *"I need a modal as a notif status to review who are the students and how many students will be exported in the json file, before proceeding to export and the same thing also in the import, before the grade reaches the grade matrix the teacher will be able to verify how many students and who are they and if ever a student from the advisers roster is not present in the teachers json, it will be flagged with missing grades to alert the subject teacher, also I want the status of every student reflect in that notification modal so that all teachers will remember that the student has dropped or transferred"*
- **Implementation**:
  - **Teacher Export Review Modal** ([`src/components/TeacherExcelExportModal.tsx`](file:///src/components/TeacherExcelExportModal.tsx)):
    - Converted export workflow into a 2-step wizard (`select` -> `review`).
    - Added comprehensive pre-export summary: total students, active count, inactive count (dropped/transferred), and quarter grades.
    - Added interactive student review table with status badges and score highlights before generating `.json` or `.xlsx`.
  - **Adviser Import Verification Modal** ([`src/components/adviser/ImportVerificationModal.tsx`](file:///src/components/adviser/ImportVerificationModal.tsx)):
    - Intercepts grade file import in [`GradeImportPanel.tsx`](file:///src/components/adviser/GradeImportPanel.tsx) before grades are committed to the Grade Matrix.
    - Computes reconciliation between the teacher's JSON and the adviser's official section roster:
      - Shows 4 distinct summary metric cards: **Total in File**, **Active Students**, **Inactive Students**, and **Missing from File**.
      - Flags students present in the adviser roster but absent from the teacher's JSON as **MISSING GRADES** with an alert badge.
      - Displays student status flags (`Active`, `Dropped`, `Transferred`) alongside their quarterly grades.
      - Provides explicit "Confirm Import" and "Cancel" buttons, guaranteeing full transparency before modifying the grade matrix.

---

## Part 2: Comprehensive Android Implementation Plan

### 1. Platform Architecture & Data Storage Guarantees
- **Mobile Target**: Android 7.0+ (API Level 24 through 34).
- **Packaging Framework**: Tauri v2 Mobile targeting native Android WebView.
- **Physical Data Storage Directory**:
  `/data/data/com.srphs.gradingapp/files/data/`
  - Stored inside Android's internal app sandbox.
  - **In-Place Update Guarantee**: Running `adb install -r <new_apk>` replaces application code while preserving `/data/data/com.srphs.gradingapp/` completely untouched.
  - **Dual-Layer Auto Recovery**: Even if the Android OS resets WebSQL or WebView `localStorage`, `bootstrapAppDataBackup()` automatically detects and restores all classes and grades from the internal JSON files.

---

### 2. Android Project Configuration & Permissions

#### A. Tauri Capabilities ([`src-tauri/capabilities/default.json`](file:///src-tauri/capabilities/default.json))
Ensure native permissions are configured for file system read/write in app data:
```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for SRPHS Grading App",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "fs:default",
    "fs:allow-appdata-read",
    "fs:allow-appdata-write",
    "fs:allow-appdata-recursive",
    "dialog:default",
    "opener:default"
  ]
}
```

#### B. Android Manifest (`src-tauri/gen/android/app/src/main/AndroidManifest.xml`)
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />

    <application
        android:label="SRPHS Grading"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:theme="@style/Theme.TauriApp"
        android:hardwareAccelerated="true"
        android:windowSoftInputMode="adjustResize">
        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:launchMode="singleTask"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

---

### 3. Step-by-Step Android Build Commands

1. **Initialize Android Project**:
   ```bash
   npm run tauri android init
   ```
2. **Build Universal Debug APK**:
   ```bash
   npm run tauri android build -- --apk
   ```
   *Generated Path*: `src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk`

3. **Generate Production Signing Keystore**:
   ```bash
   keytool -genkey -v -keystore srphs-release.keystore -alias srphs -keyalg RSA -keysize 2048 -validity 10000
   ```
4. **Configure `src-tauri/gen/android/keystore.properties`**:
   ```properties
   storeFile=../../../../srphs-release.keystore
   storePassword=your_password
   keyAlias=srphs
   keyPassword=your_password
   ```
5. **Build Signed Release APK**:
   ```bash
   npm run tauri android build -- --apk
   ```
   *Generated Path*: `src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk`

---

### 4. Zero Data-Wipe Upgrade Verification Runbook

| Step | Action | Expected Result |
|---|---|---|
| **1** | Install initial build: `adb install app-v1.0.0.apk` | App installs cleanly on Android device/emulator. |
| **2** | Encode classes, import Excel sheets, set custom weights, and add Direct Grade Entry subjects. | Data renders in Gradebook, Grade Matrix, and persists to `/data/data/com.srphs.gradingapp/files/data/`. |
| **3** | Install updated build over existing app: `adb install -r app-v1.0.1.apk` | APK updates in-place without triggering uninstallation. |
| **4** | Launch the application. | All classes, rosters, custom weights, adjustments, and certificates load with 100% fidelity. |

---

## Part 3: Copy-and-Paste Developer / AI Prompt

```text
================================================================================
AI PROMPT: REBUILD, VERIFY & PACKAGE SRPHS GRADING APP FOR ANDROID PLATFORM
================================================================================

Role: Senior Full-Stack & Mobile Systems Engineer
Target Platform: Android APK (Tauri v2 Mobile, API Level 24 to 34)

Context & Objectives:
Build and verify the SRPHS Grading Application for Android containing all major tonight's features, DepEd policies, and native anti-wipe persistence mechanisms.

Key Specifications to Validate:
1. DepEd Trimester Grading Weights:
   - Core Subjects (English, Filipino, Math, Science, AP, ESP/GMRC): 20% WW, 50% PT, 30% QE/ST.
   - EPP/TLE & MAPEH: 20% WW, 60% PT, 20% QE/ST.
   - Support in-gradebook custom weights editing with 100% sum validation and presets.

2. Teacher-Only Grade Adjustment:
   - Purple toggle switch under WW, PT, and QSTE.
   - Proportional difference distribution across components; original raw scores preserved.
   - Action log records student, teacher, subject, delta, reason, and timestamp.
   - Exported JSON outputs the adjusted quarterly grade.
   - Null-coalescing safety against undefined adjustment fields.

3. Smart Excel Class Record Import:
   - Parses DepEd e-Class Record spreadsheets, auto-categorizing WW, PT, and QE columns.

4. Adviser Direct Grade Entry:
   - Dedicated module in Adviser Portal for part-time faculty.
   - Auto-reflected in Grade Matrix, Rankings, Awardees, and SF-9 cards with audit trails.

5. DepEd Academic Excellence Certificates:
   - A4 Portrait format (2 certificates per page).
   - Single-line auto-scaling student names (18pt down to 9pt based on text width).
   - Formatted date: "[Day]th of [Month] [Year] at SAN ROQUE PARISH HIGH SCHOOL, INC."
   - Live WYSIWYG HTML preview modal with PDF export.

6. Anti-Data Wipe Dual-Layer Persistence:
   - Bridges localStorage with native Android AppData (/data/data/com.srphs.gradingapp/files/data/*.json) via @tauri-apps/plugin-fs.
   - In-place updates (`adb install -r`) must never erase user data.

7. Full Roster Export & Inactive Highlighting:
   - Export all enrolled learners in JSON regardless of status (active, dropped, transferred).
   - Inactive learners visually highlighted with red/rose row tint, line-through name, pulsing status badges, and tinted score cells in the Gradebook.

8. Pre-Export & Pre-Import Verification Notification Modals:
   - Teacher Export: 2-step review modal displaying total, active, and inactive learners with full roster inspection prior to generating JSON/Excel.
   - Adviser Import: Modal intercepting file upload showing reconciliation cards (In File, Active, Inactive, Missing from Roster), flagging missing students with "MISSING GRADES", and requiring explicit confirmation before updating Grade Matrix.

9. Android Build Command:
   - `npm run tauri android build -- --apk`
================================================================================
```
