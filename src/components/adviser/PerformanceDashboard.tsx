import React, { useMemo } from 'react';
import { AdviserClass } from '../../types';
import { GradeMatrix, getQuarterKeys } from '../../utils/adviserUtils';
import { BarChart3, TrendingUp, Users, AlertTriangle, BookOpen } from 'lucide-react';

interface Props {
  adviserClass: AdviserClass;
  gradeMatrix: GradeMatrix;
}

export default function PerformanceDashboard({ adviserClass, gradeMatrix }: Props) {
  const quarterKeys = getQuarterKeys(adviserClass.workspace);
  const subjects = gradeMatrix.length > 0 ? gradeMatrix[0].subjects.map(s => s.subjectName) : [];

  const stats = useMemo(() => {
    let totalPass = 0;
    let totalFail = 0;
    let totalPromoted = 0;
    let totalRetained = 0;

    gradeMatrix.forEach(row => {
      if (row.promotionStatus === 'Promoted') totalPromoted++;
      if (row.promotionStatus === 'Retained') totalRetained++;

      // Count subjects passed/failed based on final grade
      row.subjects.forEach(subj => {
        if (subj.finalGrade !== null) {
          if (subj.finalGrade >= adviserClass.promotionPassingGrade) {
            totalPass++;
          } else {
            totalFail++;
          }
        }
      });
    });

    return { totalPass, totalFail, totalPromoted, totalRetained };
  }, [gradeMatrix, adviserClass.promotionPassingGrade]);

  const subjectAverages = useMemo(() => {
    const avgs: Record<string, { total: number; count: number; pass: number; fail: number }> = {};
    subjects.forEach(s => avgs[s] = { total: 0, count: 0, pass: 0, fail: 0 });

    gradeMatrix.forEach(row => {
      row.subjects.forEach(subj => {
        if (subj.finalGrade !== null && avgs[subj.subjectName]) {
          avgs[subj.subjectName].total += subj.finalGrade;
          avgs[subj.subjectName].count++;
          if (subj.finalGrade >= adviserClass.promotionPassingGrade) {
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
  }, [gradeMatrix, subjects, adviserClass.promotionPassingGrade]);

  const StatCard = ({ title, value, subtext, icon, color }: any) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-start gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-slate-500 dark:text-slate-400 text-sm font-bold">{title}</div>
        <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{value}</div>
        {subtext && <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold">{subtext}</div>}
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-amber-500" /> Class Performance Dashboard
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Analytics on class passing rates and subject averages.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Students" 
          value={gradeMatrix.length} 
          icon={<Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
          color="bg-blue-50 dark:bg-blue-950/40"
        />
        <StatCard 
          title="Promoted" 
          value={stats.totalPromoted} 
          subtext={`${((stats.totalPromoted / (gradeMatrix.length || 1)) * 100).toFixed(1)}% of class`}
          icon={<TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />}
          color="bg-emerald-50 dark:bg-emerald-950/40"
        />
        <StatCard 
          title="Retained" 
          value={stats.totalRetained} 
          subtext="Needs Finalization"
          icon={<AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />}
          color="bg-red-50 dark:bg-red-950/40"
        />
        <StatCard 
          title="Total Subject Grades" 
          value={stats.totalPass + stats.totalFail} 
          subtext={`${stats.totalFail} failed grades`}
          icon={<BookOpen className="h-6 w-6 text-amber-600 dark:text-amber-400" />}
          color="bg-amber-50 dark:bg-amber-950/40"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg">Subject Performance Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 font-bold text-slate-500">Subject</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-center">Class Average</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-center">Passing Rate</th>
                <th className="px-6 py-4 font-bold text-slate-500 text-center">Failing Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {subjectAverages.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-slate-400">No subject data available.</td></tr>
              ) : null}
              {subjectAverages.map((subj, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{subj.name}</td>
                  <td className="px-6 py-4 text-center font-mono font-bold text-slate-600 dark:text-slate-300">
                    {subj.average > 0 ? subj.average.toFixed(2) : '—'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {subj.passRate > 0 ? `${subj.passRate.toFixed(1)}%` : '—'}
                      </span>
                      <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${subj.passRate}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className={`font-mono font-bold ${subj.failRate > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
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
