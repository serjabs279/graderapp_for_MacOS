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
                  Inside the workspace, define assessments for **Written Works (WW)**, **Performance Tasks (PT)**, and the **Quarterly Exam (QE)**. Custom maximum raw scores ensure proper weighted grade computation.
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
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-xs space-y-4">
            <h3 className="font-sans font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Cpu className="h-5 w-5 text-indigo-600" />
              Technology Stack
            </h3>

            <div className="space-y-3 pt-1">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Desktop Shell</span>
                <span className="text-xs font-sans font-bold text-slate-400 dark:text-slate-500">Electron v31.2.0</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Frontend Engine</span>
                <span className="text-xs font-sans font-bold text-slate-400 dark:text-slate-500">React v18 + Vite</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Local Database</span>
                <span className="text-xs font-sans font-bold text-slate-400 dark:text-slate-500">SQLite3 (node-sqlite3)</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Database ORM</span>
                <span className="text-xs font-sans font-bold text-slate-400 dark:text-slate-500">Drizzle ORM</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">State Management</span>
                <span className="text-xs font-sans font-bold text-slate-400 dark:text-slate-500">Zustand</span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">PDF Generator</span>
                <span className="text-xs font-sans font-bold text-slate-400 dark:text-slate-500">pdfmake v0.2.10</span>
              </div>
            </div>
          </div>

          {/* Database Architecture Block */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-xs space-y-4">
            <h3 className="font-sans font-black text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-600" />
              Desktop Storage Model
            </h3>
            <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed font-semibold">
              When distributed as a `.dmg` or `.exe` app, the system embeds SQLite to maintain database integrity locally.
            </p>
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150/70 dark:border-slate-850 flex items-start gap-3">
              <HardDrive className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-550 dark:text-slate-400 leading-relaxed font-bold">
                <span className="font-extrabold text-slate-850 dark:text-slate-200">LOCAL-FIRST INTEGRITY:</span> All grading data remains on your physical desktop storage. No internet, no latency, no cloud leakage.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
