const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/utils.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Undo the mess
content = content.replace(
`  let pptMaxSum = 0;
  let qsteRawSum = 0;
  let qsteMaxSum = 0;
  let ptGradesCount = 0;
  ptAssessments.forEach(a => {
    const score = studentScores[a.id];
    if (score !== undefined) {
      pptRawSum += score;
      if (a.category === 'PPT') { pptMaxSum += a.perfectScore; }
      if (a.category === 'QSTE') { qsteMaxSum += a.perfectScore; }
      ptGradesCount++;
    }
  });`,
`  let pptMaxSum = 0;
  let ptGradesCount = 0;
  ptAssessments.forEach(a => {
    const score = studentScores[a.id];
    if (score !== undefined) {
      pptRawSum += score;
      pptMaxSum += a.perfectScore;
      ptGradesCount++;
    }
  });`
);

// Fix line 216
content = content.replace(/a\.category === 'QE'/g, "a.category === 'QSTE'");

fs.writeFileSync(filePath, content, 'utf8');
