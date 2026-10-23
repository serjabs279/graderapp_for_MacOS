import React from 'react';
import { AdviserClass } from '../../types';
import { StudentGradeRow, getQuarterKeys, computeAttendanceSummary, computeSubjectFinal } from '../../utils/adviserUtils';
import { X, User, BookOpen, Award, BarChart2, Calendar } from 'lucide-react';

interface Props {
  student: StudentGradeRow;
  adviserClass: AdviserClass;
  onClose: () => void;
}

function GradeBadge({ grade, passingGrade }: { grade: number | null; passingGrade: number }) {
  if (grade === null) return <span className="text-slate-300 dark:text-slate-600 tabular-nums">—</span>;
  const isFailing = grade < passingGrade;
  const isExcellent = grade >= 90;
  return (
    <span
      className={`tabular-nums font-medium text-sm px-2 py-0.5 rounded-lg ${
        isFailing
          ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
          : isExcellent
          ? "bg-slate-50 dark:bg-slate-950/30 text-slate-600 dark:text-slate-400"
          : "bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300"
      } `}
    >
      {grade}
    </span>
  );
}

export default function StudentGradesModal({ student, adviserClass, onClose }: Props) {
  const quarterKeys = getQuarterKeys(adviserClass.workspace);
  const passingGrade = adviserClass.promotionPassingGrade ?? 75;
  const attSummary = computeAttendanceSummary(adviserClass, student.lrn);

  const failingSubjects = student.subjects.filter(
    s => s.finalGrade !== null && s.finalGrade < passingGrade
  );

  const genAvgDisplay = student.generalAverage != null
    ? student.generalAverage.toFixed(2)
    : '—';

  return (
    <div className="ui-dialog-overlay z-[60]">
      <div role="dialog" aria-modal="true" aria-label={`Grades for ${student.name}`} className="ui-dialog max-w-3xl">

        {/* Header */}
        <div className="ui-dialog-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight text-balance">{student.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-slate-500 tabular-nums">{student.lrn}</span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-sm text-slate-500">{student.sex}</span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  {adviserClass.gradeLevel} - {adviserClass.section}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="adviser-button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="ui-dialog-body flex-1 space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-300 dark:border-slate-800 flex flex-col gap-1">
            <div className="text-sm text-slate-500 font-medium flex items-center gap-1">
              <BarChart2 className="w-3 h-3" /> Gen. Average
            </div>
            <div className={`text-2xl font-semibold leading-none ${
              student.generalAverage === null ? "text-slate-300" :
              student.generalAverage < passingGrade ? "text-red-500 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
            } `}>
              {genAvgDisplay}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-300 dark:border-slate-800 flex flex-col gap-1">
            <div className="text-sm text-slate-500 font-medium flex items-center gap-1">
              <Award className="w-3 h-3" /> Honors
            </div>
            <div className="text-sm font-semibold leading-snug text-amber-600 dark:text-amber-400 truncate">
              {student.honorsLabel || 'None'}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-300 dark:border-slate-800 flex flex-col gap-1">
            <div className="text-sm text-slate-500 font-medium flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Status
            </div>
            <div className={`text-sm font-semibold leading-snug ${
              student.promotionStatus === "Retained" ? "text-red-500 dark:text-red-400" :
              student.promotionStatus === "Promoted" ? "text-slate-600 dark:text-slate-400" :
              "text-slate-500"
            } `}>
              {student.promotionStatus || 'Pending'}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-300 dark:border-slate-800 flex flex-col gap-1">
            <div className="text-sm text-slate-500 font-medium flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Absences
            </div>
            <div className="text-2xl font-semibold leading-none text-slate-700 dark:text-slate-300">
              {attSummary ? attSummary.totalDaysAbsent : '—'}
            </div>
          </div>
        </div>

        {/* Scrollable grade table */}
        <div className="min-w-0">

          {failingSubjects.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl text-sm text-red-700 dark:text-red-400 font-semibold">
              ⚠️ {failingSubjects.length} failing subject{failingSubjects.length > 1 ? 's' : ''}:{' '}
              {failingSubjects.map(s => s.subjectName).join(', ')}
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left border-collapse tabular-nums">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 min-w-[180px]">Subject</th>
                  {quarterKeys.map(q => (
                    <th key={q} className="px-3 py-3 text-center font-medium text-slate-500 dark:text-slate-400 min-w-[72px]">{q}</th>
                  ))}
                  <th className="px-3 py-3 text-center font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 min-w-[80px]">Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {student.subjects.map((subj, idx) => {
                  if (subj.isLanguageGroup && subj.languageComponents) {
                    return (
                      <React.Fragment key={idx}>
                        {subj.languageComponents.map((comp, cIdx) => {
                          const compFinal = subj.languageQuarters
                            ? computeSubjectFinal(subj.languageQuarters[comp] || {}, adviserClass.workspace)
                            : null;
                          return (
                            <tr key={`${idx}-comp-${cIdx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 bg-slate-50/30 dark:bg-slate-800/10">
                              <td className="px-4 py-2 pl-8 text-slate-500 dark:text-slate-400 italic">
                                {comp}
                                <span className="ml-1 text-sm font-medium text-slate-500 not-italic">component</span>
                              </td>
                              {quarterKeys.map(q => (
                                <td key={q} className="px-3 py-2 text-center">
                                  <GradeBadge grade={subj.languageQuarters?.[comp]?.[q] ?? null} passingGrade={passingGrade} />
                                </td>
                              ))}
                              <td className="px-3 py-2 text-center bg-amber-50/30 dark:bg-amber-950/10">
                                <GradeBadge grade={compFinal} passingGrade={passingGrade} />
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="border-b-2 border-amber-100 dark:border-amber-900/40 hover:bg-amber-50/30 dark:hover:bg-amber-950/10">
                          <td className="px-4 py-2.5 font-semibold text-amber-700 dark:text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-xl bg-amber-500 inline-block mr-1.5 mb-0.5"></span>
                            {subj.subjectName}
                            <span className="ml-1 text-sm font-medium text-amber-400">composite</span>
                          </td>
                          {quarterKeys.map(q => (
                            <td key={q} className="px-3 py-2.5 text-center font-semibold text-amber-700 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/10">
                              {subj.quarters[q] ?? '—'}
                            </td>
                          ))}
                          <td className="px-3 py-2.5 text-center bg-amber-50/50 dark:bg-amber-950/20">
                            <GradeBadge grade={subj.finalGrade} passingGrade={passingGrade} />
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  }

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className={`px-4 py-2.5 font-semibold ${
                        subj.finalGrade !== null && subj.finalGrade < passingGrade
                          ? "text-red-700 dark:text-red-400"
                          : "text-slate-700 dark:text-slate-200"
                      } `}>
                        {subj.subjectName}
                        {subj.finalGrade !== null && subj.finalGrade < passingGrade && (
                          <span className="ml-1.5 text-sm font-semibold text-red-500 bg-red-50 dark:bg-red-950/30 px-1 py-0.5 rounded">FAIL</span>
                        )}
                      </td>
                      {quarterKeys.map(q => (
                        <td key={q} className="px-3 py-2.5 text-center">
                          <GradeBadge grade={subj.quarters[q] ?? null} passingGrade={passingGrade} />
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center bg-amber-50/30 dark:bg-amber-950/10">
                        <GradeBadge grade={subj.finalGrade} passingGrade={passingGrade} />
                      </td>
                    </tr>
                  );
                })}

                {/* General Average row */}
                <tr className="bg-amber-50 dark:bg-amber-950/20 border-t-2 border-amber-200 dark:border-amber-800/50">
                  <td className="px-4 py-3 font-semibold text-amber-800 dark:text-amber-300 text-sm">
                    General Average
                  </td>
                  {quarterKeys.map(q => {
                    const qGrades = student.subjects.map(s => s.quarters[q]).filter((g): g is number => g !== null);
                    const qAvg = qGrades.length > 0
                      ? Math.round((qGrades.reduce((a, b) => a + b, 0) / qGrades.length) * 100) / 100
                      : null;
                    return (
                      <td key={q} className="px-3 py-3 text-center font-semibold text-amber-700 dark:text-amber-400 tabular-nums text-sm">
                        {qAvg?.toFixed(2) ?? '—'}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-center bg-amber-100 dark:bg-amber-900/30">
                    <span className={`font-semibold tabular-nums text-base ${
                      student.generalAverage === null ? "text-slate-500" :
                      student.generalAverage < passingGrade ? "text-red-600 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
                    } `}>
                      {student.generalAverage?.toFixed(2) ?? '—'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {(student.rank || student.honorsLabel) && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {student.rank && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Class Rank: #{student.rank}</span>
                </div>
              )}
              {student.honorsLabel && (
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/50 rounded-xl">
                  <Award className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-400">{student.honorsLabel}</span>
                </div>
              )}
            </div>
          )}
        </div>

        </div>
        {/* Footer */}
        <div className="ui-dialog-footer justify-between">
          <p className="text-sm text-slate-500 text-pretty">
            Passing Grade: <span className="font-medium">{passingGrade}</span>
          </p>
          <button
            onClick={onClose}
            className="adviser-button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
