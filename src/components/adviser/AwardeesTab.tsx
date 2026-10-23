import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AdviserClass, HonorsLabel } from '../../types';
import { GradeMatrix, StudentGradeRow, getQuarterHonors, getQuarterKeys, getQuarterTrackedSubjects, isQuarterComplete } from '../../utils/adviserUtils';
import { generateAcademicAchieverCertificates, getDefaultCertificateDate } from '../../utils/adviser/certificateGenerator';
import { exportFile } from '../../utils/fileExportAdapter';
import { isAndroid } from '../../utils/platform';
import { globalToast } from '../../context/ToastContext';
import { Star, Printer, Medal, Award, Eye, Download, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CertificatePreviewModal from './CertificatePreviewModal';

interface Props {
  adviserClass: AdviserClass;
  gradeMatrix: GradeMatrix;
}

export default function AwardeesTab({ adviserClass, gradeMatrix }: Props) {
  const { globalSettings } = useApp();
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
  const [periodLabel, setPeriodLabel] = useState<string>(
    activePeriod === 'Final' ? 'Full Year' : activePeriod
  );
  const [givenDate, setGivenDate] = useState<string>(() => {
    return getDefaultCertificateDate(globalSettings.schoolName || (adviserClass as any).schoolName || 'SAN ROQUE PARISH HIGH SCHOOL, INC.');
  });
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  const handlePeriodChange = (period: string) => {
    setActivePeriod(period);
    // Certificate wording follows the period whose awardees are on screen.
    setPeriodLabel(period === 'Final' ? 'Full Year' : period);
  };

  const awardees = useMemo(() => {
    const honorWeight = (h: HonorsLabel | undefined) => {
      if (h === 'With Highest Honors') return 3;
      if (h === 'With High Honors') return 2;
      if (h === 'With Honors') return 1;
      return 0;
    };

    let rows: StudentGradeRow[];
    if (activePeriod === 'Final') {
      rows = gradeMatrix.filter(s => Boolean(s.honorsLabel));
    } else {
      // A quarter award needs every subject graded so far that quarter; a
      // learner with a missing subject or component is not yet eligible.
      const trackedSubjects = getQuarterTrackedSubjects(gradeMatrix, activePeriod);
      rows = gradeMatrix.flatMap(s => {
        if (!isQuarterComplete(s, activePeriod, trackedSubjects)) return [];
        const { average, honorsLabel } = getQuarterHonors(s, activePeriod, adviserClass.honorsCriteria);
        if (average === null || honorsLabel === null) return [];
        // The certificate and list PDFs read generalAverage, so carry the
        // quarter average through it for quarter-scoped awardees.
        return [{ ...s, generalAverage: average, honorsLabel }];
      });
    }

    return rows.sort((a, b) => {
      const wA = honorWeight(a.honorsLabel);
      const wB = honorWeight(b.honorsLabel);
      if (wA !== wB) return wB - wA;
      return (b.generalAverage ?? 0) - (a.generalAverage ?? 0);
    });
  }, [gradeMatrix, activePeriod, adviserClass.honorsCriteria]);

  const quarterCoverage = useMemo(() => {
    if (activePeriod === 'Final') return { total: 0, graded: 0, incomplete: 0 };
    const subjects = gradeMatrix[0]?.subjects ?? [];
    const tracked = getQuarterTrackedSubjects(gradeMatrix, activePeriod);
    const graded = subjects.filter(s => tracked.has(s.subjectName)).length;
    const hasAnyGrade = (row: StudentGradeRow) => row.subjects.some(s => s.quarters[activePeriod] != null);
    const incomplete = gradeMatrix.filter(row =>
      hasAnyGrade(row) && !isQuarterComplete(row, activePeriod, tracked)
    ).length;
    return { total: subjects.length, graded, incomplete };
  }, [gradeMatrix, activePeriod]);

  const averageLabel = activePeriod === 'Final' ? 'Final Average' : 'Quarter Average';

  const highestHonors = awardees.filter(a => a.honorsLabel === 'With Highest Honors');
  const highHonors = awardees.filter(a => a.honorsLabel === 'With High Honors');
  const honors = awardees.filter(a => a.honorsLabel === 'With Honors');

  const handleGenerateCertificates = async () => {
    if (awardees.length === 0) {
      globalToast.error('No academic achievers found to generate certificates for.', 'No Achievers');
      return;
    }
    try {
      const doc = generateAcademicAchieverCertificates(adviserClass, awardees, globalSettings, {
        periodLabel,
        givenDate,
        averageLabel: activePeriod === 'Final' ? 'General Average' : 'Quarter Average'
      });
      const filename = `Certificates_${adviserClass.gradeLevel}_${adviserClass.section}_${periodLabel.replace(/\s+/g, '_')}.pdf`;
      const pdfBytes = doc.output('arraybuffer');
      const saved = await exportFile({
        filename,
        content: new Uint8Array(pdfBytes),
        mimeType: 'application/pdf',
        title: 'Save Academic Achiever Certificates PDF'
      });
      if (saved) {
        globalToast.success(`Generated ${awardees.length} Academic Excellence Certificate(s) (A4 Portrait, 2 per page) saved as "${filename}".`, 'Certificates Generated');
      }
    } catch (err: any) {
      console.error('Certificate generation error:', err);
      globalToast.error('Failed to generate certificates: ' + (err.message || String(err)), 'Generation Error');
    }
  };

  const handleDownloadAwardeesListPDF = async () => {
    if (awardees.length === 0) {
      globalToast.error('No academic achievers found to export.', 'No Achievers');
      return;
    }
    try {
      const doc = new jsPDF({ format: 'a4', orientation: 'portrait' });
      const schoolName = globalSettings.schoolName || 'SAN ROQUE PARISH HIGH SCHOOL INCORPORATED';
      const region = adviserClass.region || globalSettings.region || '';
      const division = adviserClass.division || globalSettings.division || '';
      const depedLogo = adviserClass.depedLogoBase64 || globalSettings.depedLogoBase64;
      const schoolLogo = adviserClass.schoolLogoBase64 || globalSettings.schoolLogoBase64;

      let yPos = 16;
      if (schoolLogo) {
        try { doc.addImage(schoolLogo, 'PNG', 14, 10, 14, 14); } catch {}
      }
      if (depedLogo) {
        try { doc.addImage(depedLogo, 'PNG', 182, 10, 14, 14); } catch {}
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text("Republic of the Philippines", 105, yPos, { align: 'center' });
      yPos += 4.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text("Department of Education", 105, yPos, { align: 'center' });
      yPos += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      if (region) {
        doc.text(region, 105, yPos, { align: 'center' });
        yPos += 4.5;
      }
      if (division) {
        doc.text(division, 105, yPos, { align: 'center' });
        yPos += 4.5;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(schoolName.toUpperCase(), 105, yPos, { align: 'center' });
      yPos += 6;

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(14, yPos, 196, yPos);
      yPos += 7;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text("OFFICIAL LIST OF ACADEMIC EXCELLENCE AWARDEES", 105, yPos, { align: 'center' });
      yPos += 5.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Grade ${adviserClass.gradeLevel} - Section ${adviserClass.section}  |  School Year: ${adviserClass.schoolYear}  |  Period: ${periodLabel === 'Full Year' ? 'Full Academic Year' : periodLabel}`, 105, yPos, { align: 'center' });
      yPos += 6;

      const bodyData = awardees.map((row, idx) => [
        idx + 1,
        row.lrn,
        row.name.toUpperCase(),
        row.honorsLabel ?? 'Honors',
        row.generalAverage?.toFixed(2) ?? '—'
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['No.', 'LRN', 'Learner Name', 'Academic Honor', averageLabel]],
        body: bodyData,
        theme: 'grid',
        headStyles: { fillColor: [180, 130, 20], halign: 'center', fontSize: 9, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 2.2 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'center', cellWidth: 32 },
          2: { fontStyle: 'bold' },
          3: { halign: 'center', fontStyle: 'bold', cellWidth: 42 },
          4: { halign: 'right', fontStyle: 'bold', cellWidth: 26 }
        }
      });

      const finalY = (doc as any).lastAutoTable?.finalY ?? yPos + 60;
      let sigY = finalY + 22;
      if (sigY > 265) {
        doc.addPage();
        sigY = 30;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text((adviserClass.adviserName || 'Class Adviser').toUpperCase(), 50, sigY, { align: 'center' });
      doc.line(20, sigY - 4, 80, sigY - 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text("Class Adviser", 50, sigY + 4, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text((adviserClass.principalName || 'School Principal').toUpperCase(), 160, sigY, { align: 'center' });
      doc.line(130, sigY - 4, 190, sigY - 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text("School Head / Principal", 160, sigY + 4, { align: 'center' });

      const filename = `Awardees_List_${adviserClass.gradeLevel}_${adviserClass.section}_SY${adviserClass.schoolYear}.pdf`;
      const pdfBytes = doc.output('arraybuffer');
      const saved = await exportFile({
        filename,
        content: new Uint8Array(pdfBytes),
        mimeType: 'application/pdf',
        title: 'Save Awardees List PDF'
      });
      if (saved) {
        globalToast.success(`Awardees List exported as "${filename}".`, 'PDF Exported');
      }
    } catch (err: any) {
      console.error('Awardees list export error:', err);
      globalToast.error('Failed to export awardees list: ' + (err.message || String(err)), 'Export Error');
    }
  };

  const Section = ({ title, data }: { title: string; data: typeof awardees }) => {
    if (data.length === 0) return null;
    return (
      <section className="adviser-panel">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <Medal className="size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <h3 className="text-balance text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          <span className="ml-auto text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {data.length} learners
          </span>
        </div>
        <div className="overflow-x-auto" role="region" aria-label={title} tabIndex={0}>
          <table className="w-full min-w-xl text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                <th scope="col" className="px-5 py-3 font-medium text-slate-500 dark:text-slate-400 w-16 text-center">No.</th>
                <th scope="col" className="px-5 py-3 font-medium text-slate-500 dark:text-slate-400">Learner Name</th>
                <th scope="col" className="px-5 py-3 font-medium text-slate-500 dark:text-slate-400 text-right w-40">{averageLabel}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.map((row, idx) => (
                <tr key={row.lrn} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-5 py-3.5 text-center text-slate-500 dark:text-slate-400">{idx + 1}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-200">
                    {row.name}
                    <div className="mt-1 text-xs font-normal text-slate-500 dark:text-slate-400">LRN: {row.lrn}</div>
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-slate-700 dark:text-slate-200">
                    {row.generalAverage?.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  return (
    <div className="adviser-page">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="adviser-heading">Academic awardees</h2>
          <p className="adviser-description">
            {activePeriod === 'Final'
              ? 'Official school-year honors, awarded only once every subject has a complete final rating.'
              : `Honors candidates for ${activePeriod}, based on the subjects already graded in that quarter.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleGenerateCertificates}
            disabled={awardees.length === 0}
            className="adviser-button-primary"
          >
            <Award className="size-4" aria-hidden="true" /> Generate certificates (A4)
          </button>
          <button
            onClick={() => setShowPreviewModal(true)}
            disabled={awardees.length === 0}
            className="adviser-button"
          >
            <Eye className="size-4" aria-hidden="true" /> Preview & settings
          </button>
          <button
            onClick={handleDownloadAwardeesListPDF}
            disabled={awardees.length === 0}
            className="adviser-button"
            title="Download Official Awardees List PDF"
          >
            <Download className="size-4" aria-hidden="true" /> Download list PDF
          </button>
          <button
            onClick={() => { if (isAndroid()) handleDownloadAwardeesListPDF(); else window.print(); }}
            className="adviser-button"
          >
            <Printer className="size-4" aria-hidden="true" /> Print list
          </button>
        </div>
      </div>

      <div className="adviser-periods" role="group" aria-label="Grading period">
        <button
          onClick={() => handlePeriodChange('Final')}
          aria-pressed={activePeriod === 'Final'}
          className="adviser-period"
        >
          Final Grades
        </button>
        {quarterKeys.map(q => (
          <button
            key={q}
            onClick={() => handlePeriodChange(q)}
            aria-pressed={activePeriod === q}
            className="adviser-period"
          >
            {q}
          </button>
        ))}
      </div>

      {activePeriod !== 'Final' && (quarterCoverage.graded < quarterCoverage.total || quarterCoverage.incomplete > 0) && (
        <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 leading-relaxed">
            {quarterCoverage.graded < quarterCoverage.total && (
              <>Only {quarterCoverage.graded} of {quarterCoverage.total} subjects have {activePeriod} grades so far. </>
            )}
            {quarterCoverage.incomplete > 0 && (
              <>{quarterCoverage.incomplete} learner(s) with grades are not listed because at least one subject or component is still incomplete for them. </>
            )}
            These lists update automatically once the missing grades are imported.
          </p>
        </div>
      )}

      {awardees.length === 0 ? (
        <div className="adviser-panel px-4 py-12 text-center">
          <Star className="size-8 mx-auto text-slate-400 dark:text-slate-500 mb-4" aria-hidden="true" />
          <h3 className="text-balance text-base font-semibold text-slate-700 dark:text-slate-300">
            {activePeriod === 'Final' ? 'No Awardees Yet' : `No ${activePeriod} Awardees Yet`}
          </h3>
          <p className="text-pretty text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
            {activePeriod === 'Final'
              ? 'Honors are calculated from the final general average and the minimum grade requirement in any subject, once every subject has a complete final rating.'
              : `No learner meets the honors criteria for ${activePeriod} based on the subjects graded so far.`}
          </p>
        </div>
      ) : (
        <>
          <Section title="With Highest Honors" data={highestHonors} />
          <Section title="With High Honors" data={highHonors} />
          <Section title="With Honors" data={honors} />
        </>
      )}

      {/* Certificate HTML Preview & Settings Modal */}
      {showPreviewModal && (
        <CertificatePreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          adviserClass={adviserClass}
          awardees={awardees}
          globalSettings={globalSettings}
          periodLabel={periodLabel}
          givenDate={givenDate}
          onGivenDateChange={setGivenDate}
          averageLabel={activePeriod === 'Final' ? 'General Average' : 'Quarter Average'}
        />
      )}
    </div>
  );
}
