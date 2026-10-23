import React from 'react';
import { useApp } from '../context/AppContext';
import { APP_VERSION } from '../types';
import { GraduationCap, HelpCircle, ShieldCheck, Cpu, ArrowLeft } from 'lucide-react';

export default function AboutView() {
  const { setActiveRoute } = useApp();

  return (
    <div className="ui-page pb-12">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h2 className="ui-heading">System Manual & Desktop Blueprint</h2>
          <p className="ui-description">Official reference guide, technology stack configurations, and offline workflow instructions.</p>
        </div>
        <button type="button" onClick={() => setActiveRoute('portal-select')} className="ui-button self-start shrink-0">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to Portal Selection
        </button>
      </header>

      <section className="ui-panel flex flex-col items-start gap-4 p-4 sm:flex-row sm:p-6">
        <div className="rounded-lg bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          <GraduationCap aria-hidden="true" className="size-6" />
        </div>
        <div className="min-w-0 space-y-3">
          <h3 className="ui-section-title">SRPHS Academic Grading System (Desktop Shell)</h3>
          <p className="ui-description">An offline-first desktop application engineered for Philippine high schools that enables teachers to create independent grading projects, manage assessment matrices, record marks, automatically calculate final quarterly remarks, and print DepEd-compliant class record sheets.</p>
          <div className="flex flex-wrap gap-2">
            <span className="ui-badge">Version: Stable v{APP_VERSION} (Phases 1-10)</span>
            <span className="ui-badge">Host: Tauri v2 Native Shell</span>
            <span className="ui-badge">Storage: Offline Local Data + Tauri Filesystem</span>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <section className="ui-panel space-y-4 p-4 sm:p-6">
            <h3 className="ui-section-title flex items-start gap-2">
              <HelpCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              Standard Project-Based Workflow
            </h3>
            <p className="ui-description">Instead of cluttering a global database, this application operates like a professional spreadsheet or document editor. Each <strong>Grading Project</strong> is self-contained. Follow these steps:</p>
            <ol className="list-decimal space-y-5 pl-5 text-sm text-slate-600 marker:font-medium dark:text-slate-400">
              <li className="pl-1">
                <h4 className="text-balance text-sm font-semibold text-slate-800 dark:text-slate-200">Create or Open a Project</h4>
                <p className="mt-1 text-pretty leading-relaxed">Go to the Project Hub and enter the Class parameters (Grade level, Section, Subject, School Year, Quarter, and Teacher name). Click "Create Project" or open a recently created project.</p>
              </li>
              <li className="pl-1">
                <h4 className="text-balance text-sm font-semibold text-slate-800 dark:text-slate-200">Build the Assessment Matrix</h4>
                <p className="mt-1 text-pretty leading-relaxed">Inside the workspace, define assessments for <strong>Written/Oral Works (WOW)</strong>, <strong>Performance/ Product tasks (PT)</strong>, and the <strong>Quarterly/Term Exams (QE)</strong>. Custom maximum raw scores ensure proper weighted grade computation.</p>
              </li>
              <li className="pl-1">
                <h4 className="text-balance text-sm font-semibold text-slate-800 dark:text-slate-200">Manage Students & Record Scores</h4>
                <p className="mt-1 text-pretty leading-relaxed">Add student rosters manually, or use our offline <strong>Excel/CSV batch import template</strong> to automatically populate LRNs and genders. Enter marks inside the high-performance keyboard-friendly gradebook matrix.</p>
              </li>
              <li className="pl-1">
                <h4 className="text-balance text-sm font-semibold text-slate-800 dark:text-slate-200">Export Reports & Back Up</h4>
                <p className="mt-1 text-pretty leading-relaxed">Review calculated percentages and remarks instantly. Click <strong>Print / Export</strong> to generate printable PDF copies of the DepEd Class Record or download local JSON backup copies for security.</p>
              </li>
            </ol>
          </section>

          <section className="ui-panel space-y-4 p-4 sm:p-6">
            <h3 className="ui-section-title flex items-start gap-2">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              DepEd Grading Policy Guidelines
            </h3>
            <p className="ui-description">The system calculates scores directly complying with the <strong>Philippine Department of Education (DepEd) policy directives</strong>:</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <section className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <h4 className="text-balance text-sm font-semibold text-slate-800 dark:text-slate-200">0-Based Grading Policy</h4>
                <p className="ui-description">Calculates grades without any transmutation where final grades equal the raw initial weighted score rounded to the nearest integer. Here, 0 is 0, 70 is 70, and 100 is 100.</p>
              </section>
              <section className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <h4 className="text-balance text-sm font-semibold text-slate-800 dark:text-slate-200">MATATAG Adjusted Transmutation (2027+)</h4>
                <p className="ui-description">The official <strong>Adjusted Transmutation Table</strong> implemented starting S.Y. 2027-2028 under the MATATAG curriculum. It scales initial grades from 70% to 100% proportionally to card grades of 75% to 100%, and maps scores below 70% to grades of 60% to 74%.</p>
              </section>
            </div>
          </section>
        </div>

        <section className="ui-panel min-w-0 self-start space-y-5 p-4 sm:p-6">
          <h3 className="ui-section-title flex items-center gap-2">
            <Cpu aria-hidden="true" className="size-5 shrink-0 text-emerald-600" />
            Technology Stack
          </h3>
          <dl className="space-y-4 text-sm">
            {[
              ['Desktop Shell', 'Tauri 2.11.5'],
              ['Frontend Engine', 'React v18 + Vite'],
              ['Local Database', 'SQLite3 (node-sqlite3)'],
              ['Database ORM', 'Drizzle ORM'],
              ['State Management', 'Zustand'],
              ['PDF Generator', 'pdf-lib v1.17.1 (Vector Data Engine)'],
            ].map(([label, value]) => (
              <div key={label} className="grid min-w-0 grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 sm:gap-x-4">
                <dt className="font-medium text-slate-800 dark:text-slate-200">{label}</dt>
                <dd className="min-w-0 break-words text-slate-600 dark:text-slate-400">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
