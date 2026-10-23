import React, { useMemo, useState } from 'react';
import { AdviserClass } from '../../types';
import { GradeMatrix, SubjectGradeEntry, getQuarterKeys } from '../../utils/adviserUtils';
import { TrendingUp, Users, AlertTriangle, BookOpen } from 'lucide-react';

interface Props {
  adviserClass: AdviserClass;
  gradeMatrix: GradeMatrix;
}

/** Grade used for the selected period. A composite subject only counts once all components are graded. */
function getPeriodGrade(subj: SubjectGradeEntry, period: string): number | null {
  if (period === 'Final') return subj.finalGrade;
  if (subj.isLanguageGroup && subj.languageComponents?.length) {
    const complete = subj.languageComponents.every(c => subj.languageQuarters?.[c]?.[period] != null);
    if (!complete) return null;
  }
  return subj.quarters[period] ?? null;
}

export default function PerformanceDashboard({ adviserClass, gradeMatrix }: Props) {
  const quarterKeys = getQuarterKeys(adviserClass.workspace);
  const subjects = gradeMatrix.length > 0 ? gradeMatrix[0].subjects.map(s => s.subjectName) : [];

  const latestQuarterWithData = [...quarterKeys].reverse().find(qk =>
    gradeMatrix.some(row => row.subjects.some(s => s.quarters[qk] !== null))
  );
  const hasPartialData = gradeMatrix.some(row =>
    row.subjects.some(s => s.finalGrade === null && quarterKeys.some(qk => s.quarters[qk] !== null))
  );
  const [activePeriod, setActivePeriod] = useState<string>(
    hasPartialData && latestQuarterWithData ? latestQuarterWithData : 'Final'
  );

  const stats = useMemo(() => {
    let totalPass = 0;
    let totalFail = 0;
    let totalPromoted = 0;
    let totalRetained = 0;

    gradeMatrix.forEach(row => {
      if (row.promotionStatus === 'Promoted') totalPromoted++;
      if (row.promotionStatus === 'Retained') totalRetained++;

      row.subjects.forEach(subj => {
        const grade = getPeriodGrade(subj, activePeriod);
        if (grade !== null) {
          if (grade >= adviserClass.promotionPassingGrade) {
            totalPass++;
          } else {
            totalFail++;
          }
        }
      });
    });

    return { totalPass, totalFail, totalPromoted, totalRetained };
  }, [gradeMatrix, adviserClass.promotionPassingGrade, activePeriod]);

  const subjectAverages = useMemo(() => {
    const avgs: Record<string, { total: number; count: number; pass: number; fail: number }> = {};
    subjects.forEach(s => avgs[s] = { total: 0, count: 0, pass: 0, fail: 0 });

    gradeMatrix.forEach(row => {
      row.subjects.forEach(subj => {
        const grade = getPeriodGrade(subj, activePeriod);
        if (grade !== null && avgs[subj.subjectName]) {
          avgs[subj.subjectName].total += grade;
          avgs[subj.subjectName].count++;
          if (grade >= adviserClass.promotionPassingGrade) {
            avgs[subj.subjectName].pass++;
          } else {
            avgs[subj.subjectName].fail++;
          }
        }
      });
    });

    return Object.entries(avgs).map(([name, data]) => ({
      name,
      average: data.count > 0 ? (data.total / data.count) : 0,
      passRate: data.count > 0 ? (data.pass / data.count) * 100 : 0,
      failRate: data.count > 0 ? (data.fail / data.count) * 100 : 0
    }));
  }, [gradeMatrix, subjects, adviserClass.promotionPassingGrade, activePeriod]);

  const StatCard = ({ title, value, subtext, icon }: any) => (
    <div className="adviser-panel p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium text-slate-600 dark:text-slate-400">{title}</div>
        <div className="shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true">{icon}</div>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-800 dark:text-slate-100">{value}</div>
      {subtext && <div className="mt-1 text-xs text-pretty tabular-nums text-slate-500 dark:text-slate-400">{subtext}</div>}
    </div>
  );

  return (
    <div className="adviser-page">
      <div>
        <h2 className="adviser-heading">Class performance</h2>
        <p className="adviser-description mt-1">
          {activePeriod === 'Final'
            ? 'Analytics on class passing rates and subject averages based on official final ratings.'
            : `Analytics on passing rates and subject averages based on ${activePeriod} grades recorded so far.`}
        </p>
      </div>

      <div className="adviser-periods" role="group" aria-label="Grading period">
        <button
          onClick={() => setActivePeriod('Final')}
          aria-pressed={activePeriod === 'Final'}
          className="adviser-period"
        >
          Final Grades
        </button>
        {quarterKeys.map(q => (
          <button
            key={q}
            onClick={() => setActivePeriod(q)}
            aria-pressed={activePeriod === q}
            className="adviser-period"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={gradeMatrix.length}
          icon={<Users className="size-4" />}
        />
        <StatCard
          title="Promoted"
          value={stats.totalPromoted}
          subtext={<>
            {activePeriod !== 'Final' && <span className="block">Final-cycle status</span>}
            {`${((stats.totalPromoted / (gradeMatrix.length || 1)) * 100).toFixed(1)}% of class`}
          </>}
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          title="Retained"
          value={stats.totalRetained}
          subtext={<>
            {activePeriod !== 'Final' && <span className="block">Final-cycle status</span>}
            Needs Finalization
          </>}
          icon={<AlertTriangle className="size-4" />}
        />
        <StatCard
          title={activePeriod === 'Final' ? 'Total Subject Grades' : `${activePeriod} Grades`}
          value={stats.totalPass + stats.totalFail}
          subtext={`${stats.totalFail} failed grades`}
          icon={<BookOpen className="size-4" />}
        />
      </div>

      <div className="adviser-panel overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-semibold text-balance text-slate-800 dark:text-slate-100">Subject Performance Breakdown</h3>
          <p className="adviser-description mt-1">
            {activePeriod === 'Final'
              ? 'Computed from complete final ratings only.'
              : `Computed from ${activePeriod} grades; composite subjects count only when every component is graded.`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-2xl text-left border-collapse text-sm tabular-nums">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                <th scope="col" className="px-5 py-4 font-medium text-slate-600 dark:text-slate-400">Subject</th>
                <th scope="col" className="px-5 py-4 font-medium text-slate-600 dark:text-slate-400 text-center">Class Average</th>
                <th scope="col" className="px-5 py-4 font-medium text-slate-600 dark:text-slate-400 text-center">Passing Rate</th>
                <th scope="col" className="px-5 py-4 font-medium text-slate-600 dark:text-slate-400 text-center">Failing Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {subjectAverages.length === 0 ? (
                <tr><td colSpan={4} className="text-center px-5 py-12 text-slate-500 dark:text-slate-400">No subject data available.</td></tr>
              ) : null}
              {subjectAverages.map((subj, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-200">{subj.name}</td>
                  <td className="px-5 py-4 text-center font-semibold text-slate-600 dark:text-slate-300">
                    {subj.average > 0 ? subj.average.toFixed(2) : '—'}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">
                        {subj.passRate > 0 ? `${subj.passRate.toFixed(1)}%` : '—'}
                      </span>
                      <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden" aria-hidden="true">
                        <div className="h-full bg-emerald-500" style={{ width: `${subj.passRate}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className={`font-medium ${subj.failRate > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {subj.failRate > 0 ? `${subj.failRate.toFixed(1)}%` : '0%'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
