import React from 'react';
import {
  GraduationCap,
  HelpCircle,
  ShieldCheck,
  Settings,
  Cpu,
  Database,
  FileText,
  Key,
  Flame,
  CheckCircle2,
  HardDrive
} from 'lucide-react';

export default function AboutView() {
  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Page Title */}
      <div className="border-b border-slate-100 dark:border-slate-850 pb-4">
        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">System Manual & Desktop Blueprint</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">Official reference guide, technology stack configurations, and offline workflow instructions.</p>
      </div>

      {/* Main Vision Banner */}
      <div className="bg-gradient-to-br from-indigo-500/10 to-teal-500/10 dark:from-indigo-950/20 dark:to-teal-950/20 border border-indigo-100/50 dark:border-indigo-950/40 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start">
        <div className="p-4 bg-indigo-600 text-white rounded-2xl shrink-0">
          <GraduationCap className="h-8 w-8" />
        </div>
        <div className="space-y-3">
          <h3 className="font-sans font-black text-base text-slate-900 dark:text-slate-100 tracking-tight">
            SRPHS Academic Grading System (Desktop Shell)
          </h3>
          <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed font-semibold">
            An offline-first desktop application engineered for Philippine high schools that enables teachers to create independent grading projects, manage assessment matrices, record marks, automatically calculate final quarterly remarks, and print DepEd-compliant class record sheets.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-[9px] font-sans font-bold bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-md">
              Version: Stable v1.0.0 (Phases 1-10)
            </span>
            <span className="text-[9px] font-sans font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100/30 px-2.5 py-1 rounded-md">
              Host: Electron Native Shell
            </span>
            <span className="text-[9px] font-sans font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100/30 px-2.5 py-1 rounded-md">
              Engine: SQLite3 + Drizzle ORM
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Workflow (Left Column, spans 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Workflow Guide */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-xs space-y-4">
            <h3 className="font-sans font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-indigo-600" />
              Standard Project-Based Workflow
            </h3>
            <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed font-semibold">
              Instead of cluttering a global database, this application operates like a professional spreadsheet or document editor. Each **Grading Project** is self-contained. Follow these steps:
            </p>

            <div className="relative border-l-2 border-indigo-100 dark:border-indigo-950 ml-3.5 pl-6 space-y-6 py-2">
              <div className="relative">
                <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white dark:border-slate-900 flex items-center justify-center text-[10px] text-white font-bold" />
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">1. Create or Open a Project</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
                  Go to the Project Hub and enter the Class parameters (Grade level, Section, Subject, School Year, Quarter, and Teacher name). Click "Create Project" or open a recently created project.
                </p>
              </div>

              <div className="relative">
                <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white dark:border-slate-900 flex items-center justify-center text-[10px] text-white font-bold" />
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">2. Build the Assessment Matrix</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
                  Inside the workspace, define assessments for **Written/Oral Works (WOW)**, **Performance/ Product tasks (PT)**, and the **Quarterly/Term Exams (QE)**. Custom maximum raw scores ensure proper weighted grade computation.
                </p>
              </div>

              <div className="relative">
                <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white dark:border-slate-900 flex items-center justify-center text-[10px] text-white font-bold" />
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">3. Manage Students & Record Scores</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
                  Add student rosters manually, or use our offline **Excel/CSV batch import template** to automatically populate LRNs and genders. Enter marks inside the high-performance keyboard-friendly gradebook matrix.
                </p>
              </div>

              <div className="relative">
                <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white dark:border-slate-900 flex items-center justify-center text-[10px] text-white font-bold" />
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">4. Export Reports & Back Up</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
                  Review calculated percentages and remarks instantly. Click **Print / Export** to generate printable PDF copies of the DepEd Class Record or download local JSON backup copies for security.
                </p>
              </div>
            </div>
          </div>

          {/* Legislative standards card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-xs space-y-4">
            <h3 className="font-sans font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              DepEd Grading Policy Guidelines
            </h3>
            <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed font-semibold">
              The system calculates scores directly complying with the **Philippine Department of Education (DepEd) policy directives**:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850">
                <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">0-Based Grading Policy</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed font-medium">
                  Calculates grades without any transmutation where final grades equal the raw initial weighted score rounded to the nearest integer. Here, 0 is 0, 70 is 70, and 100 is 100.
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850">
                <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">MATATAG Adjusted Transmutation (2027+)</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed font-medium">
                  The official **Adjusted Transmutation Table** implemented starting S.Y. 2027-2028 under the MATATAG curriculum. It scales initial grades from 70% to 100% proportionally to card grades of 75% to 100%, and maps scores below 70% to grades of 60% to 74%.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tech Specs & Desktop info */}
        <div className="space-y-6">
          {/* Tech Stack Specs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-xs">
            <h3 className="font-sans font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Cpu className="h-5 w-5 text-emerald-600" />
              Technology Stack
            </h3>

            <div className="grid grid-cols-[140px_1fr] gap-y-5 gap-x-6 text-xs">

              <div className="font-bold text-slate-800 dark:text-slate-200">
                Desktop Shell
              </div>
              <div className="text-slate-400 dark:text-slate-500 font-semibold">
                Tauri 2.11.5
              </div>

              <div className="font-bold text-slate-800 dark:text-slate-200">
                Frontend Engine
              </div>
              <div className="text-slate-400 dark:text-slate-500 font-semibold">
                React v18 + Vite
              </div>

              <div className="font-bold text-slate-800 dark:text-slate-200">
                Local Database
              </div>
              <div className="text-slate-400 dark:text-slate-500 font-semibold">
                SQLite3 (node-sqlite3)
              </div>

              <div className="font-bold text-slate-800 dark:text-slate-200">
                Database ORM
              </div>
              <div className="text-slate-400 dark:text-slate-500 font-semibold">
                Drizzle ORM
              </div>

              <div className="font-bold text-slate-800 dark:text-slate-200">
                State Management
              </div>
              <div className="text-slate-400 dark:text-slate-500 font-semibold">
                Zustand
              </div>

              <div className="font-bold text-slate-800 dark:text-slate-200">
                PDF Generator
              </div>
              <div className="text-slate-400 dark:text-slate-500 font-semibold">
                pdf-lib v1.17.1 (Vector Data Engine)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 