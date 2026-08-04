const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const oldFuncStartRegex = /function getNurseryReportCardHtml\([\s\S]*?\)\s*\{[\s\S]*?const records = nurseryChecklists\.filter/;

// Wait, doing this via regex replacement of the entire function is risky if we don't match perfectly.
// Let's match from `function getNurseryReportCardHtml` to the end of the template literal `  \`;\n};`

const startTag = "function getNurseryReportCardHtml(";
const startIndex = content.indexOf(startTag);
if (startIndex === -1) {
    console.error("Could not find getNurseryReportCardHtml");
    process.exit(1);
}

const endTag = "  `;\n};";
const endIndex = content.indexOf(endTag, startIndex);
if (endIndex === -1) {
    console.error("Could not find end of getNurseryReportCardHtml");
    process.exit(1);
}

const newFunctionStr = `function getNurseryReportCardHtml(
  studentName: string,
  schoolClassId: string,
  academicYear: string,
  term: string,
  reopeningDate: string,
  vacationDate: string,
  classRoll: number,
  nurseryChecklists: NurseryChecklistRecord[],
  reports: CommentReport[],
  termAttendanceRecords: TermAttendanceRecord[]
) {
  const record = nurseryChecklists.find((c: NurseryChecklistRecord) =>
    normalizeDisplayValue(c.studentName) === normalizeDisplayValue(studentName) &&
    c.classId === schoolClassId &&
    normalizeDisplayValue(c.academicYear) === normalizeDisplayValue(academicYear) &&
    standardizeTerm(c.term) === standardizeTerm(term)
  );

  const report = reports.find((r: CommentReport) =>
    normalizeDisplayValue(r.studentName) === normalizeDisplayValue(studentName) &&
    r.classId === schoolClassId &&
    normalizeDisplayValue(r.academicYear) === normalizeDisplayValue(academicYear) &&
    standardizeTerm(r.term) === standardizeTerm(term)
  );

  let attRecord = termAttendanceRecords.find(
    a => normalizeDisplayValue(a.studentName) === normalizeDisplayValue(studentName) &&
         normalizeDisplayValue(a.classId) === normalizeDisplayValue(schoolClassId) &&
         normalizeDisplayValue(a.academicYear) === normalizeDisplayValue(academicYear) &&
         standardizeTerm(a.term) === standardizeTerm(term)
  );
  if (!attRecord) {
    attRecord = termAttendanceRecords.find(
      a => normalizeDisplayValue(a.studentName) === normalizeDisplayValue(studentName) &&
           normalizeDisplayValue(a.academicYear) === normalizeDisplayValue(academicYear) &&
           standardizeTerm(a.term) === standardizeTerm(term)
    );
  }

  const attendanceVal = attRecord
    ? (attRecord.totalPossible ? \`\${attRecord.totalAttendance} / \${attRecord.totalPossible}\` : \`\${attRecord.totalAttendance}\`)
    : "";

  const sex = report?.sex || "";
  const className = SCHOOL_CLASSES.find(c => c.id === schoolClassId)?.name || schoolClassId;

  const renderChecklistRows = (startIdx: number, endIdx: number) => {
    return NURSERY_QUESTIONS.slice(startIdx, endIdx + 1).map(q => \`
      <tr>
        <td style="border: 1.5px solid #000; padding: 3px 5px; font-size: 9px;">\${q.text}</td>
        <td style="border: 1.5px solid #000; padding: 3px; text-align: center; font-weight: 700; font-size: 9px;">\${record?.ratings?.[q.id] || ""}</td>
      </tr>
    \`).join("");
  };

  return \`
    <!-- Page 1 -->
    <div class="page-container" style="box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; height: 100vh; max-height: 100vh;">
      <div>
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; border-bottom: 1.5px solid #000; padding-bottom: 2px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <!-- Dummy Logo -->
            <div style="width: 32px; height: 32px; border: 1.5px solid #000; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px;">YB</div>
            <div style="font-weight: 800; font-size: 12px;">YERIEL BRACHA SCHOOL</div>
          </div>
          <div style="font-size: 10px; font-weight: 700; color: #475569;">STUDENT'S PROGRESS REPORT</div>
        </div>

        <div style="text-align: center; font-weight: 800; font-size: 11px; margin-bottom: 4px;">NURSERY/CRECHE SECTION</div>

        <!-- Info Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px; border: 1.5px solid #000; font-size: 9.5px;">
          <tr>
            <td colspan="2" style="border: 1.5px solid #000; padding: 3px 5px; font-weight: 700;">NAME: <span style="font-weight: 500;">\${studentName.toUpperCase()}</span></td>
            <td colspan="2" style="border: 1.5px solid #000; padding: 3px 5px; font-weight: 700;">CLASS: <span style="font-weight: 500;">\${className.toUpperCase()}</span></td>
          </tr>
          <tr>
            <td style="border: 1.5px solid #000; padding: 3px 5px; font-weight: 700; width: 25%;">TERM: <span style="font-weight: 500;">\${term.toUpperCase()}</span></td>
            <td style="border: 1.5px solid #000; padding: 3px 5px; font-weight: 700; width: 25%;">SEX: <span style="font-weight: 500;">\${sex.toUpperCase()}</span></td>
            <td style="border: 1.5px solid #000; padding: 3px 5px; font-weight: 700; width: 25%;">CLASS ROLL: <span style="font-weight: 500;">\${classRoll}</span></td>
          </tr>
          <tr>
            <td style="border: 1.5px solid #000; padding: 3px 5px; font-weight: 700;">ACADEMIC YEAR: <span style="font-weight: 500;">\${academicYear}</span></td>
            <td style="border: 1.5px solid #000; padding: 3px 5px; font-weight: 700;">ATTENDANCE: <span style="font-weight: 500;">\${attendanceVal || ""}</span></td>
            <td colspan="2" style="border: 1.5px solid #000; padding: 3px 5px; font-weight: 700;">DATE: <span style="font-weight: 500;">\${vacationDate || ""}</span></td>
          </tr>
        </table>

        <!-- Legend Box -->
        <div class="legend-box" style="width: 100%; border: 1.5px solid #000; background: #f8fafc; padding: 3px; font-size: 9px; font-weight: 700; text-align: center; margin-bottom: 4px; box-sizing: border-box;">
          RATING SCALE: &nbsp; &nbsp; Y = YES &nbsp; | &nbsp; P/S = PARTIAL/SOMETIMES &nbsp; | &nbsp; NES = NEEDS EFFORT AND SPECIAL ATTENTION
        </div>

        <!-- Checklist Table Page 1 -->
        <table class="checklist-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9.5px; box-sizing: border-box;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 1.5px solid #000;">
              <th style="border: 1.5px solid #000; padding: 3px; text-align: left; width: 85%;">DEVELOPMENTAL MILESTONES / INDICATORS</th>
              <th style="border: 1.5px solid #000; padding: 3px; text-align: center; width: 15%;">RATING</th>
            </tr>
          </thead>
          <tbody>
            \${renderChecklistRows(0, 17)}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Page 2 -->
    <div class="page-container" style="box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; height: 100vh; max-height: 100vh;">
      <div>
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #000; padding-bottom: 2px; margin-bottom: 4px;">
          <span style="font-size: 10px; font-weight: 800;">YERIEL BRACHA SCHOOL - CHECKLIST CONTINUED</span>
          <span style="font-size: 10px; font-weight: 700; color: #475569;">STUDENT: \${studentName.toUpperCase()}</span>
        </div>

        <!-- Checklist Table Page 2 -->
        <table class="checklist-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9.5px;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 1.5px solid #000;">
              <th style="border: 1.5px solid #000; padding: 3px; text-align: left; width: 85%;">DEVELOPMENTAL MILESTONES / INDICATORS</th>
              <th style="border: 1.5px solid #000; padding: 3px; text-align: center; width: 15%;">RATING</th>
            </tr>
          </thead>
          <tbody>
            \${renderChecklistRows(18, 35)}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Page 3 -->
    <div class="page-container" style="box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; height: 100vh; max-height: 100vh;">
      <div>
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #000; padding-bottom: 2px; margin-bottom: 4px;">
          <span style="font-size: 10px; font-weight: 800;">YERIEL BRACHA SCHOOL - CHECKLIST CONTINUED</span>
          <span style="font-size: 10px; font-weight: 700; color: #475569;">STUDENT: \${studentName.toUpperCase()}</span>
        </div>

        <!-- Checklist Table Page 3 -->
        <table class="checklist-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9.5px;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 1.5px solid #000;">
              <th style="border: 1.5px solid #000; padding: 3px; text-align: left; width: 85%;">DEVELOPMENTAL MILESTONES / INDICATORS</th>
              <th style="border: 1.5px solid #000; padding: 3px; text-align: center; width: 15%;">RATING</th>
            </tr>
          </thead>
          <tbody>
            \${renderChecklistRows(36, 51)}
          </tbody>
        </table>

        <!-- Phonics and Numbers Table -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 4px; border: 1.5px solid #000; font-size: 9.5px;">
          <tr style="background: #f1f5f9;">
            <td style="border: 1.5px solid #000; padding: 3px; font-weight: 700; width: 40%; text-transform: uppercase;">Literacy & Numeral Recognition Details</td>
            <td style="border: 1.5px solid #000; padding: 3px; font-weight: 700; text-align: center; width: 60%;">DETAILS</td>
          </tr>
          <tr>
            <td style="border: 1.5px solid #000; padding: 3px; font-weight: 700; font-size: 9px;">Which Phonics Sounds recognized and sounded correctly?</td>
            <td style="border: 1.5px solid #000; padding: 3px; text-align: center; font-size: 9px; word-wrap: break-word;">\${record?.phonicsText || ""}</td>
          </tr>
          <tr>
            <td style="border: 1.5px solid #000; padding: 3px; font-weight: 700; font-size: 9px;">Which Numbers can he or she recognize?</td>
            <td style="border: 1.5px solid #000; padding: 3px; text-align: center; font-size: 9px; word-wrap: break-word;">\${record?.numbersText || ""}</td>
          </tr>
        </table>

        <!-- Remarks Table -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 4px; border: 1.5px solid #000; font-size: 9.5px;">
          <tr style="background: #f1f5f9;">
            <td style="border: 1.5px solid #000; padding: 3px; font-weight: 700; text-transform: uppercase;">TEACHER'S GENERAL REMARKS AND CONDUCT</td>
          </tr>
          <tr>
            <td style="border: 1.5px solid #000; padding: 5px; line-height: 1.35; font-size: 9px; background: #fff; min-height: 40px;">
              \${report?.comment ? \`<div>\${report.comment}</div>\` : \`<div style="color: #64748b;">No comment report submitted yet.</div>\`}
            </td>
          </tr>
        </table>

        <!-- Footer/Signatures Table -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 4px; border: 1.5px solid #000; font-size: 9.5px; background: #fff;">
          <tr>
            <td style="border: 1.5px solid #000; padding: 10px; width: 60%; height: 42px; vertical-align: bottom;">
              <div style="display: flex; align-items: flex-end; justify-content: space-between;">
                <span style="font-weight: 700; font-size: 9.5px;">Supervisor's Signature:</span>
                <div style="border-bottom: 1.5px dashed #000; width: 180px; height: 1px; margin-bottom: 2px;"></div>
              </div>
            </td>
            <td style="border: 1.5px solid #000; padding: 5px 10px; width: 40%; text-align: center; background: #f8fafc; font-weight: 700; vertical-align: middle;">
              <div style="font-size: 9px; color: #475569;">NEXT TERM BEGINS:</div>
              <div style="font-weight: 800; font-size: 10.5px; margin-top: 2px; border: 1.5px solid #000; padding: 2px; background: #fff;">\${reopeningDate || ""}</div>
            </td>
          </tr>
        </table>
      </div>
    </div>`;

const finalContent = content.substring(0, startIndex) + newFunctionStr + content.substring(endIndex + endTag.length - 3);

fs.writeFileSync('src/App.tsx', finalContent, 'utf-8');
console.log("Successfully replaced getNurseryReportCardHtml!");
