import React, { useState, useMemo } from 'react';
import { AdviserClass } from '../../types';
import { GradeMatrix, getQuarterKeys, getQuarterRanking } from '../../utils/adviserUtils';
import { Trophy, Medal, Award, Search, Users, AlertCircle, ArrowUpDown } from 'lucide-react';

interface Props {
  adviserClass: AdviserClass;
  gradeMatrix: GradeMatrix;
}

export default function RankingsTab({ adviserClass, gradeMatrix }: Props) {
  const [filterSex, setFilterSex] = useState<'All' | 'Male' | 'Female'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const quarterKeys = getQuarterKeys(adviserClass.workspace);
  const latestQuarterWithData = [...quarterKeys].reverse().find(qk =>
    gradeMatrix.some(row => row.subjects.some(s => s.quarters[qk] !== null))
  );
  const hasPartialData = gradeMatrix.some(row =>
    row.subjects.some(s => s.finalGrade === null && quarterKeys.some(qk => s.quarters[qk] !== null))
  );
  const [activePeriod, setActivePeriod] = useState<string>(
    hasPartialData && latestQuarterWithData ? latestQuarterWithData : 'Final'
  );

  // 1. Process rankings & statistics
  const studentsWithGrades = useMemo(() => {
    if (activePeriod === 'Final') {
      return gradeMatrix
        .filter(s => s.generalAverage !== null)
        .sort((a, b) => (b.generalAverage ?? 0) - (a.generalAverage ?? 0))
        .map(s => ({ ...s, displayAverage: s.generalAverage as number }));
    }

    // Per-quarter ranking: average of the subjects graded in that quarter,
    // with tied averages sharing the same rank.
    const ranked = getQuarterRanking(gradeMatrix, activePeriod);
    let previousRank = 0;
    ranked.forEach((row, i) => {
      row.rank = i > 0 && row.quarterAverage === ranked[i - 1].quarterAverage ? previousRank : i + 1;
      previousRank = row.rank;
    });
    return ranked.map(s => ({ ...s, displayAverage: s.quarterAverage as number }));
  }, [gradeMatrix, activePeriod]);

  // Compute key stats
  const stats = useMemo(() => {
    if (studentsWithGrades.length === 0) {
      return { classAverage: 0, highest: 0, lowest: 0, honorsCount: 0 };
    }
    const averages = studentsWithGrades.map(s => s.displayAverage);
    const sum = averages.reduce((a, b) => a + b, 0);
    const classAverage = Math.round((sum / averages.length) * 100) / 100;
    const highest = Math.max(...averages);
    const lowest = Math.min(...averages);
    // Honors are only awarded on the completed final rating, never per quarter.
    const honorsCount = activePeriod === 'Final'
      ? studentsWithGrades.filter(s => s.honorsLabel !== null).length
      : 0;

    return { classAverage, highest, lowest, honorsCount };
  }, [studentsWithGrades, activePeriod]);

  // Filtered leaderboard
  const filteredLeaderboard = useMemo(() => {
    return studentsWithGrades.filter(s => {
      const matchSex = filterSex === 'All' || s.sex === filterSex;
      const matchQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.lrn.includes(searchQuery);
      return matchSex && matchQuery;
    });
  }, [studentsWithGrades, filterSex, searchQuery]);

  return (
    <div className="adviser-page">
      {/* Header */}
      <div>
        <h2 className="adviser-heading">Class rankings</h2>
        <p className="adviser-description mt-1">
          {activePeriod === 'Final'
            ? 'Official list of student rankings based on General Average and honors classification.'
            : `Ranking of learners based on their ${activePeriod} average across subjects with grades in that quarter.`}
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

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Class Average */}
        <div className="adviser-panel p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Class Average</div>
            <Users className="size-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-800 dark:text-slate-100">
            {stats.classAverage ? stats.classAverage.toFixed(2) : '—'}
          </div>
        </div>

        {/* Top Performer */}
        <div className="adviser-panel p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Highest G.A.</div>
            <Trophy className="size-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-800 dark:text-slate-100">
            {stats.highest ? stats.highest.toFixed(2) : '—'}
          </div>
        </div>

        {/* Lowest Performer */}
        <div className="adviser-panel p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Lowest G.A.</div>
            <ArrowUpDown className="size-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-800 dark:text-slate-100">
            {stats.lowest ? stats.lowest.toFixed(2) : '—'}
          </div>
        </div>

        {/* Honors Candidates */}
        <div className="adviser-panel p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Honors Candidates</div>
            <Award className="size-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-800 dark:text-slate-100">
            {activePeriod === 'Final' ? <>{stats.honorsCount} <span className="text-sm font-normal text-slate-600 dark:text-slate-400">students</span></> : '—'}
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="adviser-panel p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            aria-label="Search learners by LRN or name"
            placeholder="Search LRN or Student Name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 w-full"
          />
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by sex">
          {['All', 'Male', 'Female'].map(gender => (
            <button
              key={gender}
              onClick={() => setFilterSex(gender as any)}
              aria-pressed={filterSex === gender}
              className="adviser-button aria-pressed:bg-slate-100 aria-pressed:text-slate-900 dark:aria-pressed:bg-slate-800 dark:aria-pressed:text-slate-100"
            >
              {gender}
            </button>
          ))}
        </div>
      </div>

      {/* Rankings Leaderboard Grid */}
      <div className="adviser-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl text-left border-collapse text-sm tabular-nums">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
                <th scope="col" className="px-5 py-4 font-medium text-slate-600 dark:text-slate-400 text-center w-16">Rank</th>
                <th scope="col" className="px-5 py-4 font-medium text-slate-600 dark:text-slate-400">Learner Name</th>
                <th scope="col" className="px-5 py-4 font-medium text-slate-600 dark:text-slate-400 w-24 text-center">Sex</th>
                <th scope="col" className="px-5 py-4 font-medium text-slate-600 dark:text-slate-400 w-32 text-center">
                  {activePeriod === 'Final' ? 'Gen. Average' : 'Quarter Average'}
                </th>
                {activePeriod === 'Final' && (
                  <>
                    <th scope="col" className="px-5 py-4 font-medium text-slate-600 dark:text-slate-400">Honors Classification</th>
                    <th scope="col" className="px-5 py-4 font-medium text-slate-600 dark:text-slate-400 w-32 text-center">Promotion Status</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLeaderboard.length === 0 ? (
                <tr>
                  <td colSpan={activePeriod === 'Final' ? 6 : 4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
                    <AlertCircle className="size-6 mx-auto text-slate-400" aria-hidden="true" />
                    <div>
                      {studentsWithGrades.length === 0
                        ? (activePeriod === 'Final'
                            ? 'No students have complete final grades yet.'
                            : `No students have grades for ${activePeriod} yet.`)
                        : 'No students meet the search/filter criteria.'}
                    </div>
                  </td>
                </tr>
              ) : null}

              {filteredLeaderboard.map((student) => {
                const isTop3 = student.rank && student.rank <= 3;
                const honorsClass = student.honorsLabel;

                return (
                  <tr key={student.lrn} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5 text-center font-semibold">
                      {isTop3 ? (
                        <span className={`inline-flex items-center justify-center size-6 rounded-md ${
                          student.rank === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' :
                          student.rank === 2 ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' :
                          'bg-amber-50 text-amber-800 dark:bg-amber-900/10 dark:text-amber-400'
                        }`}>
                          {student.rank}
                        </span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">{student.rank}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        {student.name}
                        {student.rank === 1 && <Medal className="size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">LRN: {student.lrn}</div>
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-600 dark:text-slate-400">
                      {student.sex}
                    </td>
                    <td className="px-5 py-3.5 text-center font-semibold text-slate-900 dark:text-slate-100">
                      {student.displayAverage.toFixed(2)}%
                    </td>
                    {activePeriod === 'Final' && (
                      <>
                        <td className="px-5 py-3.5">
                          {honorsClass ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-md border border-amber-200/50 dark:border-amber-900/50">
                              <Award className="size-3.5 shrink-0" aria-hidden="true" />
                              {honorsClass}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${
                            student.promotionStatus === 'Promoted' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                            student.promotionStatus === 'Retained' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {student.promotionStatus}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
