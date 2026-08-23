const fs = require('fs');
let content = fs.readFileSync('src/components/ClassManagerView.tsx', 'utf8');

content = content.replace(/'WW' \| 'PT' \| 'QE'/g, `'WOW' | 'PPT' | 'QSTE'`);
content = content.replace(/cat: 'WW' \| 'PT' \| 'QE' = 'WW'/g, `cat: 'WOW' | 'PPT' | 'QSTE' = 'WOW'`);
content = content.replace(/setModalAssCategory\('WW'\)/g, `setModalAssCategory('WOW')`);
content = content.replace(/cat === 'WW'/g, `cat === 'WOW'`);
content = content.replace(/cat === 'PT'/g, `cat === 'PPT'`);
content = content.replace(/=== 'QE'/g, `=== 'QSTE'`);

content = content.replace(/wwPercentage/g, 'wowPercentage');
content = content.replace(/ptPercentage/g, 'pptPercentage');
content = content.replace(/qePercentage/g, 'qstePercentage');
content = content.replace(/weightedWW/g, 'weightedWOW');
content = content.replace(/weightedPT/g, 'weightedPPT');
content = content.replace(/weightedQA/g, 'weightedQSTE');

content = content.replace(/activeProject\.assessments/g, '(activeQuarterData?.assessments || [])');
content = content.replace(/activeProject\.scores/g, '(activeQuarterData?.scores || {})');
content = content.replace(/activeProject\.quarter/g, 'activeQuarterId');

content = content.replace(/clearScoreInActive\(/g, 'clearScoreInActive(activeQuarterId, ');
content = content.replace(/updateScoreInActive\(/g, 'updateScoreInActive(activeQuarterId, ');
content = content.replace(/deleteAssessmentFromActive\(/g, 'deleteAssessmentFromActive(activeQuarterId, ');
content = content.replace(/addAssessmentToActive\(/g, 'addAssessmentToActive(activeQuarterId, ');
content = content.replace(/updateAssessmentInActive\(/g, 'updateAssessmentInActive(activeQuarterId, ');
content = content.replace(/reorderAssessmentsInActive\(/g, 'reorderAssessmentsInActive(activeQuarterId, ');

fs.writeFileSync('src/components/ClassManagerView.tsx', content, 'utf8');
console.log('ClassManagerView fixed');
