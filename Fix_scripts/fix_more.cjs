const fs = require('fs');
const path = require('path');

const replaceInFile = (relPath, replacements) => {
  const filePath = path.join(__dirname, relPath);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [from, to] of replacements) {
    if (typeof from === 'string' ? content.includes(from) : from.test(content)) {
      content = content.replace(from, to);
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(filePath, content, 'utf8');
};

const SUM_REPLACEMENTS = [
  [/wwRawSum/g, 'wowRawSum'],
  [/wwMaxSum/g, 'wowMaxSum'],
  [/wwPercentage/g, 'wowPercentage'],
  [/ptRawSum/g, 'pptRawSum'],
  [/ptMaxSum/g, 'pptMaxSum'],
  [/ptPercentage/g, 'pptPercentage'],
  [/qeRawSum/g, 'qsteRawSum'],
  [/qeMaxSum/g, 'qsteMaxSum'],
  [/qePercentage/g, 'qstePercentage'],
  [/weightedQA/g, 'weightedQSTE'],
  [/weightedPT/g, 'weightedPPT'],
  [/weightedWW/g, 'weightedWOW']
];

replaceInFile('src/utils.ts', SUM_REPLACEMENTS);
replaceInFile('src/utils.ts', [
  [/{ wow: number; pt: number; qa: number }/g, '{ wow: number; ppt: number; qste: number }']
]);
replaceInFile('src/components/ClassManagerView.tsx', SUM_REPLACEMENTS);
replaceInFile('src/components/DashboardView.tsx', SUM_REPLACEMENTS);
replaceInFile('src/utils/pdfExport.ts', SUM_REPLACEMENTS);
replaceInFile('src/utils/adviser/sf9Export.ts', SUM_REPLACEMENTS);

// Also need to fix ClassManagerView type errors:
replaceInFile('src/components/ClassManagerView.tsx', [
  [/'QE' \| 'WOW' \| 'PPT'/g, "'QSTE' | 'WOW' | 'PPT'"],
  [/'QE' \| 'PPT' \| 'WOW'/g, "'QSTE' | 'PPT' | 'WOW'"],
  [/"QE" \| "PPT" \| "WOW"/g, '"QSTE" | "PPT" | "WOW"'],
  [/"QE" \| "WOW" \| "PPT"/g, '"QSTE" | "WOW" | "PPT"']
]);

console.log('Fixed sums and leftovers');
