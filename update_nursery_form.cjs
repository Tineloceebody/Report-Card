const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add standardizeTerm
const normalizeFunc = `const normalizeDisplayValue = (value?: string) =>
  (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\\s+/g, " ")
    .trim();`;

const standardizeFunc = `const standardizeTerm = (val?: string) => {
  const norm = normalizeDisplayValue(val);
  if (norm.includes("1")) return "term 1";
  if (norm.includes("2")) return "term 2";
  if (norm.includes("3")) return "term 3";
  return norm;
};`;

if (!content.includes('const standardizeTerm')) {
    content = content.replace(normalizeFunc, normalizeFunc + "\n\n" + standardizeFunc);
}

// 2. Change NurseryChecklistForm to use Term 1/2/3 and show submitted students
const oldNurseryFormReturn = `        )}
      </div>
    </div>
  );
}`;

const savedStudentsBlock = `        )}
      </div>

      <div className="mt-8 rounded-xl border border-white/10 bg-slate-900/60 p-4">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">Saved Checklists for {term} ({academicYear})</h4>
        {nurseryChecklists.filter(c => 
          c.classId === schoolClassId &&
          normalizeDisplayValue(c.academicYear) === normalizeDisplayValue(academicYear) &&
          standardizeTerm(c.term) === standardizeTerm(term)
        ).length === 0 ? (
          <p className="text-xs text-slate-500">No checklists saved for this term yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {nurseryChecklists
              .filter(c => 
                c.classId === schoolClassId &&
                normalizeDisplayValue(c.academicYear) === normalizeDisplayValue(academicYear) &&
                standardizeTerm(c.term) === standardizeTerm(term)
              )
              .sort((a, b) => a.studentName.localeCompare(b.studentName))
              .map(record => (
                <div key={record.id} className="rounded-lg bg-emerald-500/10 px-3 py-1.5 border border-emerald-500/20 flex items-center gap-2">
                  <span className="text-xs font-medium text-emerald-400">{record.studentName}</span>
                </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}`;

content = content.replace(oldNurseryFormReturn, savedStudentsBlock);

// 3. Update comparison in NurseryChecklistForm
content = content.replace(
`        normalizeDisplayValue(c.academicYear) === normalizeDisplayValue(academicYear) &&
        normalizeDisplayValue(c.term) === normalizeDisplayValue(term)`,
`        normalizeDisplayValue(c.academicYear) === normalizeDisplayValue(academicYear) &&
        standardizeTerm(c.term) === standardizeTerm(term)`
);

// Update dropdowns in NurseryChecklistForm
content = content.replace(
`              <option value="1st Term">1st Term</option>
              <option value="2nd Term">2nd Term</option>
              <option value="3rd Term">3rd Term</option>`,
`              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>`
);
content = content.replace(`const [term, setTerm] = useState(propTerm || "1st Term");`, `const [term, setTerm] = useState(propTerm || "Term 1");`);


// 4. Update AdminNurseryReport
content = content.replace(
`      if (
        report.classId === classFilter &&
        normalizeDisplayValue(report.academicYear) === normalizeDisplayValue(yearFilter) &&
        normalizeDisplayValue(report.term) === normalizeDisplayValue(termFilter)
      ) {
        addStudent(report.studentName);
      }
    });

    nurseryChecklists.forEach((record) => {
      if (
        record.classId === classFilter &&
        normalizeDisplayValue(record.academicYear) === normalizeDisplayValue(yearFilter) &&
        normalizeDisplayValue(record.term) === normalizeDisplayValue(termFilter)
      ) {
        addStudent(record.studentName);
      }
    });`,
`      if (
        report.classId === classFilter &&
        normalizeDisplayValue(report.academicYear) === normalizeDisplayValue(yearFilter) &&
        standardizeTerm(report.term) === standardizeTerm(termFilter)
      ) {
        addStudent(report.studentName);
      }
    });

    nurseryChecklists.forEach((record) => {
      if (
        record.classId === classFilter &&
        normalizeDisplayValue(record.academicYear) === normalizeDisplayValue(yearFilter) &&
        standardizeTerm(record.term) === standardizeTerm(termFilter)
      ) {
        addStudent(record.studentName);
      }
    });`
);

content = content.replace(
`      ...reports.filter(r => r.classId === classFilter && normalizeDisplayValue(r.academicYear) === normalizeDisplayValue(yearFilter) && normalizeDisplayValue(r.term) === normalizeDisplayValue(termFilter)).map(r => r.studentName),
      ...termAttendanceRecords.filter(t => t.classId === classFilter && normalizeDisplayValue(t.academicYear) === normalizeDisplayValue(yearFilter) && normalizeDisplayValue(t.term) === normalizeDisplayValue(termFilter)).map(t => t.studentName),
      ...nurseryChecklists.filter(c => c.classId === classFilter && normalizeDisplayValue(c.academicYear) === normalizeDisplayValue(yearFilter) && normalizeDisplayValue(c.term) === normalizeDisplayValue(termFilter)).map(c => c.studentName)`,
`      ...reports.filter(r => r.classId === classFilter && normalizeDisplayValue(r.academicYear) === normalizeDisplayValue(yearFilter) && standardizeTerm(r.term) === standardizeTerm(termFilter)).map(r => r.studentName),
      ...termAttendanceRecords.filter(t => t.classId === classFilter && normalizeDisplayValue(t.academicYear) === normalizeDisplayValue(yearFilter) && standardizeTerm(t.term) === standardizeTerm(termFilter)).map(t => t.studentName),
      ...nurseryChecklists.filter(c => c.classId === classFilter && normalizeDisplayValue(c.academicYear) === normalizeDisplayValue(yearFilter) && standardizeTerm(c.term) === standardizeTerm(termFilter)).map(c => c.studentName)`
);

// 5. Update ReportConfig (reportSettings) just in case
content = content.replace(
`    const config = reportSettings.find(
      (s) =>
        normalizeDisplayValue(s.academicYear) === normalizeDisplayValue(yearFilter) &&
        normalizeDisplayValue(s.term) === normalizeDisplayValue(termFilter)
    )`,
`    const config = reportSettings.find(
      (s) =>
        normalizeDisplayValue(s.academicYear) === normalizeDisplayValue(yearFilter) &&
        standardizeTerm(s.term) === standardizeTerm(termFilter)
    )`
);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log("Successfully updated NurseryChecklistForm and AdminNurseryReport term logic!");
