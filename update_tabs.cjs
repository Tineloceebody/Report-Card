const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Update the useState hook to include "sba-nc-report"
content = content.replace(
    'useState<"accounts" | "weekly-report" | "midterm-report" | "sba-report" | "data-editor" | "report-settings">("accounts");',
    'useState<"accounts" | "weekly-report" | "midterm-report" | "sba-report" | "sba-nc-report" | "data-editor" | "report-settings">("accounts");'
);

// 2. Add the SBA N/C button to the sidebar
const sbaReportButton = `                    <button
                      onClick={() => { setAdminActiveTab("sba-report"); setIsMobileMenuOpen(false); }}
                      className={\`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-all duration-300 \${
                        adminActiveTab === "sba-report" 
                        ? "bg-amber-500 text-slate-950 shadow-xl shadow-amber-500/20" 
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }\`}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      SBA Reports
                    </button>`;

const sbaNcButton = `
                    <button
                      onClick={() => { setAdminActiveTab("sba-nc-report"); setIsMobileMenuOpen(false); }}
                      className={\`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-all duration-300 \${
                        adminActiveTab === "sba-nc-report" 
                        ? "bg-amber-500 text-slate-950 shadow-xl shadow-amber-500/20" 
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }\`}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      SBA N/C
                    </button>`;

content = content.replace(sbaReportButton, sbaReportButton + sbaNcButton);


// 3. Update AdminSBAReportProps
const oldProps = `type AdminSBAReportProps = {
  weeklyTests: WeeklyTestRecord[];
  sbaRecords: SBARecord[];
  midterms: Midterm[];
  reports: CommentReport[];
  classLookup: Record<string, typeof SCHOOL_CLASSES[0]>;
  saveStudentTraits: (classId: string, studentName: string, year: string, term: string, traitData: any) => Promise<void>;
  termAttendanceRecords: TermAttendanceRecord[];
  reportSettings: ReportSettingsRecord[];
  getNurseryReportCardHtml: any;
  nurseryChecklists: NurseryChecklistRecord[];
};`;

const newProps = `type AdminSBAReportProps = {
  weeklyTests: WeeklyTestRecord[];
  sbaRecords: SBARecord[];
  midterms: Midterm[];
  reports: CommentReport[];
  classLookup: Record<string, typeof SCHOOL_CLASSES[0]>;
  saveStudentTraits: (classId: string, studentName: string, year: string, term: string, traitData: any) => Promise<void>;
  termAttendanceRecords: TermAttendanceRecord[];
  reportSettings: ReportSettingsRecord[];
  getNurseryReportCardHtml: any;
  nurseryChecklists: NurseryChecklistRecord[];
  mode?: "standard" | "nursery";
};`;

content = content.replace(oldProps, newProps);

// 4. Update AdminSBAReport signature and default classFilter
const oldSignature = `}: AdminSBAReportProps) {
  const [classFilter, setClassFilter] = useState(SCHOOL_CLASSES[0]?.id ?? "");`;

const newSignature = `  mode = "standard",
}: AdminSBAReportProps) {
  const availableClasses = SCHOOL_CLASSES.filter(c => mode === "nursery" ? c.isNursery : !c.isNursery);
  const [classFilter, setClassFilter] = useState(availableClasses[0]?.id ?? "");

  // When mode changes, reset the class filter to the first valid option
  useEffect(() => {
    const validClasses = SCHOOL_CLASSES.filter(c => mode === "nursery" ? c.isNursery : !c.isNursery);
    if (!validClasses.some(c => c.id === classFilter)) {
      setClassFilter(validClasses[0]?.id ?? "");
    }
  }, [mode, classFilter]);`;

content = content.replace(oldSignature, newSignature);

// 5. Hide table block if mode === "nursery"
const oldTableBlock = `<div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">`;

const newTableBlock = `{mode === "standard" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">`;

content = content.replace(oldTableBlock, newTableBlock);

// We need to find where the table wrapper div ends to close the brace
// It's a `<div className="overflow-x-auto"> ... </table> </div>`
const oldTableEnd = `</table>
        </div>`;
const newTableEnd = `</table>
        </div>
      )}`;
content = content.replace(oldTableEnd, newTableEnd);


// 6. Update the App component to render both tabs
const oldAppTab = `{adminActiveTab === "sba-report" && (
                    <motion.div 
                      key="sba-report"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="glass-card p-4 md:p-8 min-h-[600px]"
                    >
                      <div className="flex items-center gap-4 mb-8">
                        <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                          <LayoutDashboard className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <div>
                          <h2 className="text-xl md:text-2xl font-bold text-white">SBA Report Cards</h2>
                          <p className="text-sm text-slate-400">Generate end-of-term printable reports</p>
                        </div>
                      </div>
                      <AdminSBAReport 
                        weeklyTests={weeklyTests} 
                        sbaRecords={sbaRecords}
                        midterms={midterms}
                        reports={reports}
                        classLookup={classLookup}
                        saveStudentTraits={saveStudentTraits}
                        termAttendanceRecords={termAttendanceRecords}
                        reportSettings={reportSettings}
                        getNurseryReportCardHtml={getNurseryReportCardHtml}
                        nurseryChecklists={nurseryChecklists}
                      />
                    </motion.div>
                )}`;

const newAppTab = `{adminActiveTab === "sba-report" && (
                    <motion.div 
                      key="sba-report"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="glass-card p-4 md:p-8 min-h-[600px]"
                    >
                      <div className="flex items-center gap-4 mb-8">
                        <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                          <LayoutDashboard className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <div>
                          <h2 className="text-xl md:text-2xl font-bold text-white">SBA Report Cards</h2>
                          <p className="text-sm text-slate-400">Generate end-of-term printable reports for standard classes</p>
                        </div>
                      </div>
                      <AdminSBAReport 
                        weeklyTests={weeklyTests} 
                        sbaRecords={sbaRecords}
                        midterms={midterms}
                        reports={reports}
                        classLookup={classLookup}
                        saveStudentTraits={saveStudentTraits}
                        termAttendanceRecords={termAttendanceRecords}
                        reportSettings={reportSettings}
                        getNurseryReportCardHtml={getNurseryReportCardHtml}
                        nurseryChecklists={nurseryChecklists}
                        mode="standard"
                      />
                    </motion.div>
                )}

                {adminActiveTab === "sba-nc-report" && (
                    <motion.div 
                      key="sba-nc-report"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="glass-card p-4 md:p-8 min-h-[600px]"
                    >
                      <div className="flex items-center gap-4 mb-8">
                        <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                          <LayoutDashboard className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <div>
                          <h2 className="text-xl md:text-2xl font-bold text-white">SBA N/C Report Cards</h2>
                          <p className="text-sm text-slate-400">Generate end-of-term printable reports for Nursery & Creche</p>
                        </div>
                      </div>
                      <AdminSBAReport 
                        weeklyTests={weeklyTests} 
                        sbaRecords={sbaRecords}
                        midterms={midterms}
                        reports={reports}
                        classLookup={classLookup}
                        saveStudentTraits={saveStudentTraits}
                        termAttendanceRecords={termAttendanceRecords}
                        reportSettings={reportSettings}
                        getNurseryReportCardHtml={getNurseryReportCardHtml}
                        nurseryChecklists={nurseryChecklists}
                        mode="nursery"
                      />
                    </motion.div>
                )}`;

content = content.replace(oldAppTab, newAppTab);

// Update class options inside AdminSBAReport class dropdown
const oldSelect = `<select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              hasSetDefault.current = false;
            }}
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none ring-amber-500 transition focus:ring-2"
          >
            {SCHOOL_CLASSES.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>`;

const newSelect = `<select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              hasSetDefault.current = false;
            }}
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none ring-amber-500 transition focus:ring-2"
          >
            {SCHOOL_CLASSES.filter(c => mode === "nursery" ? c.isNursery : !c.isNursery).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>`;

content = content.replace(oldSelect, newSelect);


fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log("Successfully updated tabs!");
