const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Remove mode="standard" from AdminSBAReport
content = content.replace(
`                        getNurseryReportCardHtml={getNurseryReportCardHtml}
                        nurseryChecklists={nurseryChecklists}
                        mode="standard"
                      />`,
`                        getNurseryReportCardHtml={getNurseryReportCardHtml}
                        nurseryChecklists={nurseryChecklists}
                      />`
);

// 2. Add the AdminNurseryReport component exactly before AdminMidtermReport
const newComponent = `
type AdminNurseryReportProps = {
  reports: CommentReport[];
  nurseryChecklists: NurseryChecklistRecord[];
  termAttendanceRecords: TermAttendanceRecord[];
  reportSettings: ReportSettingsRecord[];
  getNurseryReportCardHtml: any;
};

function AdminNurseryReport({
  reports,
  nurseryChecklists,
  termAttendanceRecords,
  reportSettings,
  getNurseryReportCardHtml,
}: AdminNurseryReportProps) {
  const availableClasses = SCHOOL_CLASSES.filter(c => c.isNursery);
  const [classFilter, setClassFilter] = useState(availableClasses[0]?.id ?? "creche");
  const [yearFilter, setYearFilter] = useState("2025/2026");
  const [termFilter, setTermFilter] = useState("Term 3");
  const [studentFilter, setStudentFilter] = useState("");

  const hasSetDefault = useRef(false);
  useEffect(() => {
    if (hasSetDefault.current || reports.length === 0) return;
    const sorted = [...reports].sort((a: any, b: any) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
    const latest = sorted[0];
    if (latest?.academicYear) setYearFilter(latest.academicYear);
    if (latest?.term) setTermFilter(latest.term);
    hasSetDefault.current = true;
  }, [reports]);

  const studentsInClass = useMemo(() => {
    const studentSet = new Set<string>();
    const addStudent = (name?: string) => { if (name?.trim()) studentSet.add(name.trim()); };

    reports.forEach((report) => {
      if (
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
    });

    return Array.from(studentSet).sort((a, b) => a.localeCompare(b));
  }, [reports, nurseryChecklists, classFilter, yearFilter, termFilter]);

  useEffect(() => {
    if (studentFilter && !studentsInClass.includes(studentFilter)) {
      setStudentFilter("");
    }
  }, [studentsInClass, studentFilter]);

  const selectedStudents = studentFilter ? [studentFilter] : studentsInClass;

  const handlePrintReportCards = () => {
    if (selectedStudents.length === 0) {
      alert("No students available for report cards.");
      return;
    }
    if (!yearFilter || !termFilter) {
      alert("Select year and term before printing report cards.");
      return;
    }

    const config = reportSettings.find(
      (s) =>
        normalizeDisplayValue(s.academicYear) === normalizeDisplayValue(yearFilter) &&
        normalizeDisplayValue(s.term) === normalizeDisplayValue(termFilter)
    ) || { reopeningDate: "", vacationDate: "" };

    const reopeningDate = config.reopeningDate || "";
    const vacationDate = config.vacationDate || "";

    // Count distinct students in attendance or reports for roll
    const activeStudents = Array.from(new Set([
      ...reports.filter(r => r.classId === classFilter && normalizeDisplayValue(r.academicYear) === normalizeDisplayValue(yearFilter) && normalizeDisplayValue(r.term) === normalizeDisplayValue(termFilter)).map(r => r.studentName),
      ...termAttendanceRecords.filter(t => t.classId === classFilter && normalizeDisplayValue(t.academicYear) === normalizeDisplayValue(yearFilter) && normalizeDisplayValue(t.term) === normalizeDisplayValue(termFilter)).map(t => t.studentName),
      ...nurseryChecklists.filter(c => c.classId === classFilter && normalizeDisplayValue(c.academicYear) === normalizeDisplayValue(yearFilter) && normalizeDisplayValue(c.term) === normalizeDisplayValue(termFilter)).map(c => c.studentName)
    ])).filter(name => name?.trim());
    const classRoll = activeStudents.length || 1;

    const sectionsHtml = selectedStudents.map((studentName) => {
      return getNurseryReportCardHtml(
        studentName,
        classFilter,
        yearFilter,
        termFilter,
        reopeningDate,
        vacationDate,
        classRoll,
        nurseryChecklists,
        reports,
        termAttendanceRecords
      );
    }).join("\\n");

    const html = \`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Bulk Report Cards</title>
<style>
  @media print {
    body { margin: 0; padding: 0; background: #fff; }
    .page-container {
      page-break-after: always !important;
      page-break-inside: avoid !important;
      height: 100vh !important;
      max-height: 100vh !important;
    }
    .page-container:last-child {
      page-break-after: avoid !important;
    }
  }
</style>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background: #fff;">
\${sectionsHtml}
<script>window.onload = () => window.print();</script>
</body>
</html>\`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      alert("Pop-up blocked. Please allow pop-ups for this site.");
      return;
    }
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Class</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring"
            >
              {availableClasses.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Academic Year</label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring"
            >
              <option value="2024/2025">2024/2025</option>
              <option value="2025/2026">2025/2026</option>
              <option value="2026/2027">2026/2027</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Term</label>
            <select
              value={termFilter}
              onChange={(e) => setTermFilter(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring"
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Student</label>
            <select
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring"
            >
              <option value="">All Students</option>
              {studentsInClass.map((student) => (
                <option key={student} value={student}>{student}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handlePrintReportCards}
            className="rounded-xl bg-sky-500 px-6 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110"
          >
            Print Report Cards
          </button>
        </div>
      </div>
    </div>
  );
}

`;

content = content.replace("type AdminMidtermReportProps", newComponent + "type AdminMidtermReportProps");


// 3. Update the render block to use AdminNurseryReport
content = content.replace(
`                      <AdminSBAReport
                        sbaRecords={sbaRecords}
                        weeklyTests={weeklyTests}
                        midterms={midterms}
                        reports={reports}
                        classLookup={classLookup}
                        saveStudentTraits={saveStudentTraits}
                        termAttendanceRecords={termAttendanceRecords}
                        reportSettings={reportSettings}
                        getNurseryReportCardHtml={getNurseryReportCardHtml}
                        nurseryChecklists={nurseryChecklists}
                        mode="nursery"
                      />`,
`                      <AdminNurseryReport
                        reports={reports}
                        nurseryChecklists={nurseryChecklists}
                        termAttendanceRecords={termAttendanceRecords}
                        reportSettings={reportSettings}
                        getNurseryReportCardHtml={getNurseryReportCardHtml}
                      />`
);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log("Successfully implemented AdminNurseryReport!");
