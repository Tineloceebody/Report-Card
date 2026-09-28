import { AnimatePresence, motion } from "framer-motion";
import { AcademicYearPicker } from "./src/components/AcademicYearPicker";
import { Eye, EyeOff, KeyRound, ChevronDown, Download, Edit2, Trash2, Printer, Users, BarChart3, Settings, LogOut, Plus, Link, LayoutDashboard, Menu, X, FileText, Target, Award, Calendar, MessageSquare, UserX, LayoutGrid } from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { DashboardCards } from "./components/DashboardCards";
import { AdminDashboardCards } from "./components/AdminDashboardCards";
import { db, auth } from "./firebase";
// @ts-ignore
import { signInAnonymously } from "firebase/auth";
// @ts-ignore
import {
  collection,
  onSnapshot,
  query,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  updateDoc
} from "firebase/firestore";
import * as XLSX from "xlsx";
import {
  ChartsContainer,
  BarPlot,
  LinePlot,
  MarkPlot,
  ChartsXAxis,
  ChartsYAxis,
  ChartsTooltip
} from '@mui/x-charts';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const SUBJECTS: { id: string; name: string }[] = [
  { id: "english-language", name: "English Language" },
  { id: "mathematics", name: "Mathematics" },
  { id: "science", name: "Science" },
  { id: "computing", name: "Computing" },
  { id: "history", name: "History" },
  { id: "social-studies", name: "Social Studies" },
  { id: "creative-arts", name: "CAD" },
  { id: "rme", name: "R. M. E" },
  { id: "french", name: "French" },
  { id: "ghanaian-language", name: "Ghanaian Language" },
  { id: "career-tech", name: "Career Tech" },
];

const SUBJECT_NAME_ALIASES: Record<string, string> = {
  english: "English Language",
  literacy: "English Language",
  "english language": "English Language",
  mathematics: "Mathematics",
  maths: "Mathematics",
  numeracy: "Mathematics",
  "r m e": "R. M. E",
  rme: "R. M. E",
  religious: "R. M. E",
  moral: "R. M. E",
  "religious and moral education": "R. M. E",
  "creative arts": "CAD",
  "creative arts and design": "CAD",
  "creative arts design": "CAD",
  cad: "CAD",
  "ghanaian language": "Ghanaian Language",
  french: "French",
  computing: "Computing",
  science: "Science",
  history: "History",
  "social studies": "Social Studies",
  "career tech": "Career Tech",
  "career technology": "Career Tech",
};

const normalizeDisplayValue = (value?: string) =>
  (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const standardizeTerm = (val?: string) => {
  const norm = normalizeDisplayValue(val);
  if (norm.includes("1")) return "term 1";
  if (norm.includes("2")) return "term 2";
  if (norm.includes("3")) return "term 3";
  return norm;
};

const getCanonicalSubjectName = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  const normalized = normalizeDisplayValue(trimmed);
  const subjectMatch = SUBJECTS.find((subject) => normalizeDisplayValue(subject.name) === normalized);
  if (subjectMatch) return subjectMatch.name;

  return SUBJECT_NAME_ALIASES[normalized] ?? trimmed;
};

const subjectNamesMatch = (left?: string, right?: string) => {
  return normalizeDisplayValue(getCanonicalSubjectName(left)) === normalizeDisplayValue(getCanonicalSubjectName(right));
};

type MidtermFormProps = {
  schoolClassId: string;
  activeTeacher: TeacherAccount;
  midterms: Midterm[];
  reports: CommentReport[];
  submitMidterm: (data: Omit<Midterm, "id" | "submittedAt" | "calculatedScore">) => Promise<void>;
  deleteMidterm: (id: string) => Promise<void>;
  weeklyTests?: any[];
  sbaRecords?: any[];
  termAttendanceRecords?: any[];
  nurseryChecklists?: any[];
  promotionHistoryRecords?: any[];
};

export function MidtermForm({
  schoolClassId,
  activeTeacher,
  midterms,
  reports,
  submitMidterm,
  deleteMidterm,
  weeklyTests = [],
  sbaRecords = [],
  termAttendanceRecords = [],
  promotionHistoryRecords = [],
}: MidtermFormProps) {
  const [academicYear, setAcademicYear] = useState("2025/2026");
  const [term, setTerm] = useState("Term 1");
  const [subject, setSubject] = useState("");
  const [bulkScores, setBulkScores] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allowedSubjectIds = activeTeacher.permissions?.find(p => p.classId === schoolClassId)?.subjectIds ?? [];
  const allowedSubjects = SUBJECTS.filter(s => allowedSubjectIds.includes(s.id));
  const allStudentsInClass = useMemo(() => {
    const studentMap = new Map<string, string>();
    const addName = (name?: string) => {
      const trimmed = name?.trim();
      if (!trimmed) return;
      const key = normalizeDisplayValue(trimmed);
      if (!studentMap.has(key)) studentMap.set(key, trimmed);
    };

    const isClassMatch = (cId?: string) => cId === schoolClassId || normalizeDisplayValue(cId) === normalizeDisplayValue(schoolClassId);
    const isYearMatch = (y?: string) => !academicYear || normalizeDisplayValue(y) === normalizeDisplayValue(academicYear);

    // 1. Records matching the selected academic year
    (reports || []).forEach(r => { if (isClassMatch(r.classId) && isYearMatch(r.academicYear)) addName(r.studentName); });
    (midterms || []).forEach(m => { if (isClassMatch(m.classId) && isYearMatch(m.academicYear)) addName(m.studentName); });
    (weeklyTests || []).forEach(t => { if (isClassMatch(t.classId) && isYearMatch(t.academicYear)) addName(t.studentName); });
    (sbaRecords || []).forEach(s => { if (isClassMatch(s.classId) && isYearMatch(s.academicYear)) addName(s.studentName); });
    (termAttendanceRecords || []).forEach(a => { if (isClassMatch(a.classId) && isYearMatch(a.academicYear)) addName(a.studentName); });

    // 2. Add students promoted INTO this class for the selected academic year
    (promotionHistoryRecords || []).forEach(ph => {
      if (!ph.isReversed && isClassMatch(ph.destClassId) && (isYearMatch(ph.destAcademicYear) || !academicYear)) {
        addName(ph.studentName);
      }
    });

    // 3. Exclude students promoted OUT of this class
    const promotedOutKeys = new Set(
      (promotionHistoryRecords || [])
        .filter(ph =>
          !ph.isReversed &&
          isClassMatch(ph.sourceClassId) &&
          (isYearMatch(ph.sourceAcademicYear) ||
           isYearMatch(ph.destAcademicYear) ||
           normalizeDisplayValue(ph.destClassId) !== normalizeDisplayValue(schoolClassId))
        )
        .map(ph => normalizeDisplayValue(ph.studentId || ph.studentName))
    );

    promotedOutKeys.forEach(key => studentMap.delete(key));

    return Array.from(studentMap.values()).sort((a, b) => a.localeCompare(b));
  }, [reports, midterms, weeklyTests, sbaRecords, termAttendanceRecords, promotionHistoryRecords, schoolClassId, academicYear]);

  const teacherMidterms = useMemo(() => midterms.filter(m => m.teacherId === activeTeacher.id && m.classId === schoolClassId), [midterms, activeTeacher.id, schoolClassId]);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const groupedMidterms = useMemo(() => {
    const sortedMidterms = [...teacherMidterms].sort((a, b) => {
      const yearA = a.academicYear || "";
      const yearB = b.academicYear || "";
      if (yearA !== yearB) return yearB.localeCompare(yearA);

      const termA = a.term || "";
      const termB = b.term || "";
      if (termA !== termB) return termA.localeCompare(termB);

      const subA = a.subject || "";
      const subB = b.subject || "";
      if (subA !== subB) return subA.localeCompare(subB);

      const nameA = a.studentName || "";
      const nameB = b.studentName || "";
      return nameA.localeCompare(nameB);
    });

    return sortedMidterms.reduce((groups, record) => {
      const subjectGroup = groups[record.subject] ?? [];
      subjectGroup.push(record);
      groups[record.subject] = subjectGroup;
      return groups;
    }, {} as Record<string, Midterm[]>);
  }, [teacherMidterms]);

  useEffect(() => {
    if (!academicYear || !term || !subject) return;

    const existingMap: Record<string, string> = {};
    allStudentsInClass.forEach((sName) => {
      const existing = midterms.find(
        (m) =>
          m.classId === schoolClassId &&
          normalizeDisplayValue(m.studentName) === normalizeDisplayValue(sName) &&
          normalizeDisplayValue(m.academicYear) === normalizeDisplayValue(academicYear) &&
          normalizeDisplayValue(m.term) === normalizeDisplayValue(term) &&
          subjectNamesMatch(m.subject, subject)
      );
      if (existing) {
        existingMap[sName] = String(existing.score);
      }
    });
    setBulkScores(existingMap);
  }, [schoolClassId, academicYear, term, subject, allStudentsInClass, midterms]);

  const handleBulkSubmit = async () => {
    if (!academicYear || !term || !subject) {
      alert("Please complete the year, term, and subject before submitting.");
      return;
    }
    if (!allowedSubjects.some(s => subjectNamesMatch(s.name, subject))) {
      alert("Selected subject is not assigned to you for this class.");
      return;
    }

    const entries = Object.entries(bulkScores).filter(([_, data]) => data.trim() !== "");
    if (entries.length === 0) {
      alert("Enter at least one midterm score before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      for (const [student, scoreValue] of entries) {
        const parsedScore = parseFloat(scoreValue);
        if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
          continue;
        }

        await submitMidterm({
          teacherId: activeTeacher.id,
          teacherName: activeTeacher.fullName,
          classId: schoolClassId,
          studentName: student,
          academicYear,
          term,
          subject,
          score: parsedScore,
          maxScore: 100,
        });
      }
      setBulkScores({});
      alert(`Successfully submitted midterms for ${entries.length} student(s).`);
    } catch (err) {
      console.error(err);
      alert("Failed to submit midterm scores. See console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filledCount = Object.values(bulkScores).filter((value) => value?.trim() !== "").length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Midterm Exam Input</h3>
          <span className="text-xs text-slate-400">Max Score: 100</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Academic Year</label>
            <AcademicYearPicker
              value={academicYear}
              onChange={setAcademicYear}
              allowEmpty
              placeholder="-- Select Year --"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Term</label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring"
            >
              <option value="">-- Select Term --</option>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Subject</label>
            {allowedSubjects.length > 0 ? (
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring"
              >
                <option value="">-- Select Subject --</option>
                {allowedSubjects.map((sub) => (
                  <option key={sub.id} value={sub.name}>{sub.name}</option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-rose-400">No assigned subjects for this class.</p>
            )}
          </div>
          <div className="flex items-end">
            <button
              onClick={handleBulkSubmit}
              disabled={isSubmitting || filledCount === 0 || !academicYear || !term || allowedSubjects.length === 0}
              className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-50"
            >
              {!academicYear || !term
                ? "Select Year & Term to submit"
                : isSubmitting
                ? "Submitting..."
                : `Submit ${filledCount} Midterm Score${filledCount === 1 ? "" : "s"}`}
            </button>
          </div>
          <div className="flex items-center px-4 py-3 rounded-2xl border border-white/15 bg-slate-950/40">
            <p className="text-xs text-slate-400">Filled: {filledCount}/{allStudentsInClass.length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-lg font-semibold text-white">Enter Scores for All Students</h4>
          <p className="text-xs text-slate-400">Empty rows are skipped</p>
        </div>
        <div className="max-h-[460px] overflow-x-auto overflow-y-auto rounded-xl border border-white/10">
          <table className="min-w-full w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-950 text-[10px] md:text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="min-w-[160px] px-3 md:px-4 py-3 font-semibold">Student</th>
                <th className="min-w-[200px] px-3 md:px-4 py-3 font-semibold">Score (/100)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {allStudentsInClass.map((name) => {
                const value = bulkScores[name]?.trim() ?? "";
                return (
                  <tr key={name} className="hover:bg-white/5">
                    <td className="px-3 md:px-4 py-3 text-slate-200 text-xs md:text-sm">{name}</td>
                    <td className="px-3 md:px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={value}
                        onChange={(e) => setBulkScores((prev) => ({ ...prev, [name]: e.target.value }))}
                        placeholder="0"
                        className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-4 py-3.5 text-base font-semibold outline-none transition focus:ring-2 focus:ring-amber-500 text-white placeholder:text-slate-500"
                        style={{ color: "#ffffff", WebkitTextFillColor: "#ffffff" }}
                      />
                    </td>
                  </tr>
                );
              })}
              {allStudentsInClass.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-500 italic">No students found. Add them in the Comments tab.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="mb-3 text-lg font-semibold text-white">Recent Midterms</h4>
        {teacherMidterms.length === 0 ? (
          <p className="text-sm text-slate-500">No midterm records yet for this class.</p>
        ) : (
          <div className="space-y-3">
            {Object.keys(groupedMidterms).sort().map((subjectName) => {
              const subjectRecords = groupedMidterms[subjectName];
              return (
                <div key={subjectName} className="rounded-2xl border border-white/10 bg-slate-950/30">
                  <button
                    type="button"
                    onClick={() => setExpandedSubject(expandedSubject === subjectName ? null : subjectName)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-white"
                  >
                    <div>
                      <p className="font-semibold">{subjectName}</p>
                      <p className="text-[11px] text-slate-400">{subjectRecords.length} record{subjectRecords.length === 1 ? "" : "s"}</p>
                    </div>
                    <span className="text-amber-400 text-lg">{expandedSubject === subjectName ? "−" : "+"}</span>
                  </button>
                  {expandedSubject === subjectName && (
                    <div className="space-y-2 border-t border-white/10 px-4 py-3">
                      {subjectRecords.map((m) => (
                        <div key={m.id} className="rounded-2xl border border-white/5 bg-slate-900/70 p-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-100">{m.studentName}</p>
                            <p className="text-[11px] text-slate-400">{m.academicYear} • {m.term}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-amber-400 font-bold">{m.score}/100</span>
                            <button
                              onClick={() => confirm("Delete this midterm?") && deleteMidterm(m.id)}
                              className="text-rose-400 hover:text-rose-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

type SBAFieldFormProps = {
  schoolClassId: string;
  activeTeacher: TeacherAccount;
  sbaRecords: SBARecord[];
  reports: CommentReport[];
  submitSbaRecord: (data: SBARecordInput) => Promise<void>;
  mode: "project" | "group" | "exam";
  title: string;
  label: string;
  maxScore: number;
  weeklyTests?: any[];
  midterms?: any[];
  termAttendanceRecords?: any[];
  nurseryChecklists?: any[];
  promotionHistoryRecords?: any[];
};

export function SBAFieldForm({
  schoolClassId,
  activeTeacher,
  sbaRecords,
  reports,
  submitSbaRecord,
  mode,
  title,
  label,
  maxScore,
  weeklyTests = [],
  midterms = [],
  termAttendanceRecords = [],
  promotionHistoryRecords = [],
}: SBAFieldFormProps) {
  const [academicYear, setAcademicYear] = useState("2025/2026");
  const [term, setTerm] = useState("Term 1");
  const [subject, setSubject] = useState("");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allowedSubjectIds = activeTeacher.permissions?.find(p => p.classId === schoolClassId)?.subjectIds ?? [];
  const allowedSubjects = SUBJECTS.filter(s => allowedSubjectIds.includes(s.id));

  const allStudentsInClass = useMemo(() => {
    const studentMap = new Map<string, string>();
    const addName = (name?: string) => {
      const trimmed = name?.trim();
      if (!trimmed) return;
      const key = normalizeDisplayValue(trimmed);
      if (!studentMap.has(key)) studentMap.set(key, trimmed);
    };

    const isClassMatch = (cId?: string) => cId === schoolClassId || normalizeDisplayValue(cId) === normalizeDisplayValue(schoolClassId);
    const isYearMatch = (y?: string) => !academicYear || normalizeDisplayValue(y) === normalizeDisplayValue(academicYear);

    // 1. Records matching the selected academic year
    (reports || []).forEach(r => { if (isClassMatch(r.classId) && isYearMatch(r.academicYear)) addName(r.studentName); });
    (sbaRecords || []).forEach(s => { if (isClassMatch(s.classId) && isYearMatch(s.academicYear)) addName(s.studentName); });
    (weeklyTests || []).forEach(t => { if (isClassMatch(t.classId) && isYearMatch(t.academicYear)) addName(t.studentName); });
    (midterms || []).forEach(m => { if (isClassMatch(m.classId) && isYearMatch(m.academicYear)) addName(m.studentName); });
    (termAttendanceRecords || []).forEach(a => { if (isClassMatch(a.classId) && isYearMatch(a.academicYear)) addName(a.studentName); });

    // 2. Add students promoted INTO this class for the selected academic year
    (promotionHistoryRecords || []).forEach(ph => {
      if (!ph.isReversed && isClassMatch(ph.destClassId) && (isYearMatch(ph.destAcademicYear) || !academicYear)) {
        addName(ph.studentName);
      }
    });

    // 3. Exclude students promoted OUT of this class
    const promotedOutKeys = new Set(
      (promotionHistoryRecords || [])
        .filter(ph =>
          !ph.isReversed &&
          isClassMatch(ph.sourceClassId) &&
          (isYearMatch(ph.sourceAcademicYear) ||
           isYearMatch(ph.destAcademicYear) ||
           normalizeDisplayValue(ph.destClassId) !== normalizeDisplayValue(schoolClassId))
        )
        .map(ph => normalizeDisplayValue(ph.studentId || ph.studentName))
    );

    promotedOutKeys.forEach(key => studentMap.delete(key));

    return Array.from(studentMap.values()).sort((a, b) => a.localeCompare(b));
  }, [reports, sbaRecords, weeklyTests, midterms, termAttendanceRecords, promotionHistoryRecords, schoolClassId, academicYear]);

  const currentSbaRecords = useMemo(() => {
    return sbaRecords.filter(record =>
      record.teacherId === activeTeacher.id &&
      record.classId === schoolClassId &&
      record.academicYear === academicYear &&
      record.term === term &&
      subjectNamesMatch(record.subject, subject)
    );
  }, [sbaRecords, activeTeacher.id, schoolClassId, academicYear, term, subject]);

  const getSbaRecordForStudent = (studentName: string) => {
    return currentSbaRecords.find(record => record.studentName === studentName);
  };

  useEffect(() => {
    if (!academicYear || !term || !subject) return;

    const existingMap: Record<string, string> = {};
    allStudentsInClass.forEach((sName) => {
      const existing = sbaRecords.find(
        (r) =>
          r.classId === schoolClassId &&
          normalizeDisplayValue(r.studentName) === normalizeDisplayValue(sName) &&
          normalizeDisplayValue(r.academicYear) === normalizeDisplayValue(academicYear) &&
          normalizeDisplayValue(r.term) === normalizeDisplayValue(term) &&
          subjectNamesMatch(r.subject, subject)
      );
      if (existing) {
        const val = mode === "group" ? existing.groupWorkScore : mode === "project" ? existing.projectWorkScore : existing.examScore;
        if (val !== undefined && val !== null && val > 0) {
          existingMap[sName] = String(val);
        }
      }
    });
    setScores(existingMap);
  }, [schoolClassId, academicYear, term, subject, mode, allStudentsInClass, sbaRecords]);

  const handleSaveAll = async () => {
    if (!academicYear || !term || !subject) {
      alert("Please select year, term, and subject before saving scores.");
      return;
    }

    setIsSubmitting(true);
    try {
      for (const studentName of allStudentsInClass) {
        const rawValue = scores[studentName]?.trim();
        if (!rawValue) continue;

        const existing = getSbaRecordForStudent(studentName);
        const parsedScore = Number(parseFloat(rawValue).toFixed(2));
        const payload: SBARecordInput = {
          id: existing?.id,
          teacherId: activeTeacher.id,
          teacherName: activeTeacher.fullName,
          classId: schoolClassId,
          studentName,
          academicYear,
          term,
          subject,
          groupWorkScore: existing?.groupWorkScore ?? 0,
          projectWorkScore: existing?.projectWorkScore ?? 0,
          examScore: existing?.examScore ?? 0,
        };

        if (mode === "group") payload.groupWorkScore = parsedScore;
        if (mode === "project") payload.projectWorkScore = parsedScore;
        if (mode === "exam") payload.examScore = parsedScore;

        await submitSbaRecord(payload);
      }
      alert(`Saved ${title.toLowerCase()} for ${allStudentsInClass.length} student(s).`);
    } catch (error) {
      console.error(error);
      alert(`Failed to save ${title.toLowerCase()}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <span className="text-xs text-slate-400">Max Score: {maxScore}</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Academic Year</label>
            <AcademicYearPicker
              value={academicYear}
              onChange={setAcademicYear}
              allowEmpty
              placeholder="-- Select Year --"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Term</label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring"
            >
              <option value="">-- Select Term --</option>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring"
            >
              <option value="">-- Select Subject --</option>
              {allowedSubjects.map((sub) => (
                <option key={sub.id} value={sub.name}>{sub.name}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={!academicYear || !term || !subject || allStudentsInClass.length === 0 || isSubmitting}
          className="mt-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : `Save ${label} Scores`}
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-950 text-[10px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-3 py-3">Student</th>
              <th className="px-3 py-3 min-w-[200px]">{label} ({maxScore})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {allStudentsInClass.map((studentName) => {
              const existing = getSbaRecordForStudent(studentName);
              const currentValue = existing ? (mode === "group" ? existing.groupWorkScore : mode === "project" ? existing.projectWorkScore : existing.examScore) : "";
              return (
                <tr key={studentName} className="hover:bg-white/5">
                  <td className="px-3 py-3 font-medium text-slate-100">{studentName}</td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      min="0"
                      max={maxScore}
                      value={scores[studentName] ?? currentValue ?? ""}
                      onChange={(e) => setScores(prev => ({ ...prev, [studentName]: e.target.value }))}
                      placeholder="0"
                      className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-4 py-3 text-base font-semibold outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder:text-slate-500 transition"
                      style={{ color: "#ffffff", WebkitTextFillColor: "#ffffff" }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type SBAReportPanelProps = {
  schoolClassId: string;
  activeTeacher: TeacherAccount;
  weeklyTests: WeeklyTest[];
  midterms: Midterm[];
  sbaRecords: SBARecord[];
  reports: CommentReport[];
  termAttendanceRecords: TermAttendanceRecord[];
  reportSettings: ReportSettingsRecord[];
  nurseryChecklists?: NurseryChecklistRecord[];
};

export function SBAReportPanel({
  schoolClassId,
  activeTeacher,
  weeklyTests,
  midterms,
  sbaRecords,
  reports,
  termAttendanceRecords,
  reportSettings,
  nurseryChecklists = [],
}: SBAReportPanelProps) {
  const [academicYear, setAcademicYear] = useState("2025/2026");
  const [term, setTerm] = useState("Term 3");

  const hasSetDefault = useRef(false);
  useEffect(() => {
    if (hasSetDefault.current || reports.length === 0) return;
    const classReports = reports.filter((r: any) => r.classId === schoolClassId);
    if (classReports.length > 0) {
      const sorted = [...classReports].sort((a: any, b: any) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
      const latest = sorted[0];
      if (latest?.academicYear) setAcademicYear(latest.academicYear);
      if (latest?.term) setTerm(latest.term);
      hasSetDefault.current = true;
    }
  }, [schoolClassId, reports]);
  const [subject, setSubject] = useState("");
  const [weekLabel, setWeekLabel] = useState("");

  const allowedSubjectIds = activeTeacher.permissions?.find(p => p.classId === schoolClassId)?.subjectIds ?? [];
  const allowedSubjects = SUBJECTS.filter(s => allowedSubjectIds.includes(s.id));
  const allStudentsInClass = useMemo(() => {
    const studentMap = new Map<string, string>();
    const addName = (name?: string) => {
      const trimmed = name?.trim();
      if (!trimmed) return;
      const key = normalizeDisplayValue(trimmed);
      if (!studentMap.has(key)) studentMap.set(key, trimmed);
    };
    reports.forEach(r => { if (r.classId === schoolClassId || normalizeDisplayValue(r.classId) === normalizeDisplayValue(schoolClassId)) addName(r.studentName); });
    weeklyTests.forEach(t => { if (t.classId === schoolClassId || normalizeDisplayValue(t.classId) === normalizeDisplayValue(schoolClassId)) addName(t.studentName); });
    midterms.forEach(m => { if (m.classId === schoolClassId || normalizeDisplayValue(m.classId) === normalizeDisplayValue(schoolClassId)) addName(m.studentName); });
    sbaRecords.forEach(s => { if (s.classId === schoolClassId || normalizeDisplayValue(s.classId) === normalizeDisplayValue(schoolClassId)) addName(s.studentName); });
    return Array.from(studentMap.values()).sort((a, b) => a.localeCompare(b));
  }, [reports, weeklyTests, midterms, sbaRecords, schoolClassId]);

  const weekOptions = useMemo(() => {
    const weeks = new Set<string>();
    weeklyTests.forEach(test => {
      if (
        test.classId === schoolClassId &&
        (!academicYear || normalizeDisplayValue(test.academicYear) === normalizeDisplayValue(academicYear)) &&
        (!term || normalizeDisplayValue(test.term) === normalizeDisplayValue(term)) &&
        (!subject || subjectNamesMatch(test.subject, subject))
      ) {
        weeks.add(test.weekLabel);
      }
    });
    return Array.from(weeks).sort((a, b) => parseInt(a.replace(/\D/g, ""), 10) - parseInt(b.replace(/\D/g, ""), 10));
  }, [weeklyTests, schoolClassId, academicYear, term, subject]);

  useEffect(() => {
    if (weekOptions.length === 0) {
      setWeekLabel("");
      return;
    }
    setWeekLabel((current) => (current && weekOptions.includes(current) ? current : weekOptions[0]));
  }, [weekOptions]);

  const getWeeklyTestScore = (studentName: string) => {
    const subjectTests = weeklyTests.filter(
      (test) =>
        test.classId === schoolClassId &&
        normalizeDisplayValue(test.studentName) === normalizeDisplayValue(studentName) &&
        normalizeDisplayValue(test.academicYear) === normalizeDisplayValue(academicYear) &&
        standardizeTerm(test.term) === standardizeTerm(term) &&
        subjectNamesMatch(test.subject, subject)
    );
    return subjectTests.length > 0
      ? Number((subjectTests.reduce((sum, t) => sum + (t.calculatedScore ?? 0), 0) / subjectTests.length).toFixed(2))
      : 0;
  };

  const getMidtermScore = (studentName: string) => {
    const record = midterms
      .filter(m =>
        m.classId === schoolClassId &&
        normalizeDisplayValue(m.studentName) === normalizeDisplayValue(studentName) &&
        normalizeDisplayValue(m.academicYear) === normalizeDisplayValue(academicYear) &&
        standardizeTerm(m.term) === standardizeTerm(term) &&
        subjectNamesMatch(m.subject, subject)
      )
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
    if (!record || record.score <= 0) return 5;
    return Number(((record.score / 100) * 20).toFixed(2));
  };

  const getSbaValue = (studentName: string, field: "groupWorkScore" | "projectWorkScore" | "examScore") => {
    const record = sbaRecords
      .filter(entry =>
        entry.classId === schoolClassId &&
        normalizeDisplayValue(entry.studentName) === normalizeDisplayValue(studentName) &&
        normalizeDisplayValue(entry.academicYear) === normalizeDisplayValue(academicYear) &&
        standardizeTerm(entry.term) === standardizeTerm(term) &&
        subjectNamesMatch(entry.subject, subject)
      )
      .sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime())[0];
    return record?.[field] ?? 0;
  };

  const getReportRemark = (score: number) => {
    if (score >= 80) return "A";
    if (score > 69) return "AP";
    if (score > 59) return "D";
    return "B";
  };

  const getStudentReportSubjects = (studentName: string) => {
    const subjects = new Set<string>();
    const addSubjectIfValid = (subj: string) => {
      const canonical = getCanonicalSubjectName(subj);
      if (canonical && canonical.toLowerCase() !== "unknown subject" && canonical.toLowerCase() !== "unknown") {
        subjects.add(canonical);
      }
    };
    weeklyTests.forEach(test => {
      if (
        test.classId === schoolClassId &&
        normalizeDisplayValue(test.studentName) === normalizeDisplayValue(studentName) &&
        normalizeDisplayValue(test.academicYear) === normalizeDisplayValue(academicYear) &&
        standardizeTerm(test.term) === standardizeTerm(term)
      ) addSubjectIfValid(test.subject);
    });
    midterms.forEach(m => {
      if (
        m.classId === schoolClassId &&
        normalizeDisplayValue(m.studentName) === normalizeDisplayValue(studentName) &&
        normalizeDisplayValue(m.academicYear) === normalizeDisplayValue(academicYear) &&
        standardizeTerm(m.term) === standardizeTerm(term)
      ) addSubjectIfValid(m.subject);
    });
    sbaRecords.forEach(record => {
      if (
        record.classId === schoolClassId &&
        normalizeDisplayValue(record.studentName) === normalizeDisplayValue(studentName) &&
        normalizeDisplayValue(record.academicYear) === normalizeDisplayValue(academicYear) &&
        standardizeTerm(record.term) === standardizeTerm(term)
      ) addSubjectIfValid(record.subject);
    });
    return Array.from(subjects).sort();
  };

  const getStudentSubjectReport = (studentName: string, subjectName: string) => {
    const subjectTests = weeklyTests.filter(
      (test) =>
        test.classId === schoolClassId &&
        normalizeDisplayValue(test.studentName) === normalizeDisplayValue(studentName) &&
        normalizeDisplayValue(test.academicYear) === normalizeDisplayValue(academicYear) &&
        standardizeTerm(test.term) === standardizeTerm(term) &&
        subjectNamesMatch(test.subject, subjectName)
    );
    const weeklyValue = subjectTests.length > 0
      ? Number((subjectTests.reduce((sum, t) => sum + (t.calculatedScore ?? 0), 0) / subjectTests.length).toFixed(2))
      : 0;

    const midterm = midterms
      .filter(m =>
        m.classId === schoolClassId &&
        normalizeDisplayValue(m.studentName) === normalizeDisplayValue(studentName) &&
        normalizeDisplayValue(m.academicYear) === normalizeDisplayValue(academicYear) &&
        standardizeTerm(m.term) === standardizeTerm(term) &&
        subjectNamesMatch(m.subject, subjectName)
      )
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];

    const sbaRecord = sbaRecords
      .filter(entry =>
        entry.classId === schoolClassId &&
        normalizeDisplayValue(entry.studentName) === normalizeDisplayValue(studentName) &&
        normalizeDisplayValue(entry.academicYear) === normalizeDisplayValue(academicYear) &&
        standardizeTerm(entry.term) === standardizeTerm(term) &&
        subjectNamesMatch(entry.subject, subjectName)
      )
      .sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime())[0];

    const midtermValue = (!midterm || midterm.score <= 0) ? 5 : Number(((midterm.score / 100) * 20).toFixed(2));
    const groupWorkScore = Number(sbaRecord?.groupWorkScore ?? 0);
    const projectWorkScore = Number(sbaRecord?.projectWorkScore ?? 0);
    const examScore = Number(sbaRecord?.examScore ?? 0);

    const total60 = weeklyValue + midtermValue + groupWorkScore + projectWorkScore;
    const classScore = Number(((total60 / 60) * 50).toFixed(2));
    const examScoreSubtotal = Number((examScore * 0.5).toFixed(2));
    const total = Number((classScore + examScoreSubtotal).toFixed(2));

    const deficits: string[] = [];
    if (weeklyValue === 0) deficits.push("Weekly Tests");
    if (!midterm || midterm.score <= 0) deficits.push("Midterm");
    if (groupWorkScore === 0) deficits.push("Group Work");
    if (projectWorkScore === 0) deficits.push("Project Work");
    if (examScore === 0) deficits.push("Exam");

    const isSbaIncomplete = deficits.length > 0;

    const remark = isSbaIncomplete ? "IC" : getReportRemark(total);

    return {
      subjectName,
      classScore,
      examScoreSubtotal,
      total,
      remark,
      deficits,
      weeklyValue,
      midtermValue,
      groupWorkScore,
      projectWorkScore,
      examScore,
      total60
    };
  };

  const getStudentReportCardData = (studentName: string) => {
    const subjects = getStudentReportSubjects(studentName);
    const rows = subjects.map((subjectName) => getStudentSubjectReport(studentName, subjectName));
    const totalMarks = Number(rows.reduce((sum, row) => sum + row.total, 0).toFixed(2));
    const average = subjects.length ? Number((totalMarks / subjects.length).toFixed(2)) : 0;
    const overallRemark = getReportRemark(average);
    return { subjects, rows, totalMarks, average, overallRemark };
  };



  const handlePrintStudentReportCard = (studentName: string) => {
    const isNursery = schoolClassId === "creche" || schoolClassId === "nursery-1" || schoolClassId === "nursery-2";
    if (!academicYear || !term || (!isNursery && !weekLabel)) {
      alert("Select year and term before printing a report card.");
      return;
    }

    if (isNursery) {
      const config = reportSettings.find(
        (s) => normalizeDisplayValue(s.academicYear) === normalizeDisplayValue(academicYear) &&
               normalizeDisplayValue(s.term) === normalizeDisplayValue(term)
      );
      const vacationDate = config?.vacationDate || "";
      const reopeningDate = config?.reopeningDate || "";

      const activeStudents = getActiveClassStudents(schoolClassId, academicYear, term, reports, weeklyTests, midterms, sbaRecords, nurseryChecklists);
      const classRoll = activeStudents.length || 1;

      const nurseryHtml = getNurseryReportCardHtml(
        studentName,
        schoolClassId,
        academicYear,
        term,
        reopeningDate,
        vacationDate,
        classRoll,
        nurseryChecklists,
        reports,
        termAttendanceRecords
      );

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <base href="${typeof window !== 'undefined' ? window.location.origin : ''}/" />
  <title>Report Card - ${studentName}</title>
  <style>
    @page { margin: 10mm; }
    @media print {
      body { margin: 0; padding: 0; background: #fff; }
      .page-container {
        page-break-after: always !important;
        page-break-inside: avoid !important;
      }
      .page-container:last-child {
        page-break-after: avoid !important;
      }
    }
  </style>
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background: #fff;">
  ${nurseryHtml}
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

      const win = window.open("", "_blank", "width=900,height=700");
      if (!win) {
        alert("Pop-up blocked. Please allow pop-ups for this site.");
        return;
      }
      win.document.write(html);
      win.document.close();
      return;
    }

    const config = reportSettings.find(
      (s) => normalizeDisplayValue(s.academicYear) === normalizeDisplayValue(academicYear) &&
             normalizeDisplayValue(s.term) === normalizeDisplayValue(term)
    );
    const vacationDate = config?.vacationDate || "";
    const reopeningDate = config?.reopeningDate || "";

    const activeStudents = getActiveClassStudents(schoolClassId, academicYear, term, reports, weeklyTests, midterms, sbaRecords);
    const classRoll = activeStudents.length || 1;

    const report = getStudentReportCardData(studentName);
    const className = SCHOOL_CLASSES.find((c) => c.id === schoolClassId)?.name ?? schoolClassId;

    // Fetch report details
    const reportDoc = reports.find(
      r => normalizeDisplayValue(r.studentName) === normalizeDisplayValue(studentName) &&
           r.classId === schoolClassId &&
           normalizeDisplayValue(r.academicYear) === normalizeDisplayValue(academicYear) &&
           normalizeDisplayValue(r.term) === normalizeDisplayValue(term)
    );
    const sex = reportDoc?.sex || "";
    const conduct = reportDoc?.conduct || "";
    const attitude = reportDoc?.attitude || "";
    const interest = reportDoc?.interest || "";
    const commentText = reportDoc?.comment || "";

    // Fetch attendance
    let attRecord = termAttendanceRecords.find(
      a => normalizeDisplayValue(a.studentName) === normalizeDisplayValue(studentName) &&
           normalizeDisplayValue(a.classId) === normalizeDisplayValue(schoolClassId) &&
           normalizeDisplayValue(a.academicYear) === normalizeDisplayValue(academicYear) &&
           normalizeDisplayValue(a.term) === normalizeDisplayValue(term)
    );
    if (!attRecord) {
      attRecord = termAttendanceRecords.find(
        a => normalizeDisplayValue(a.studentName) === normalizeDisplayValue(studentName) &&
             normalizeDisplayValue(a.academicYear) === normalizeDisplayValue(academicYear) &&
             normalizeDisplayValue(a.term) === normalizeDisplayValue(term)
      );
    }
    const attendanceVal = attRecord
      ? (attRecord.totalPossible ? `${attRecord.totalAttendance} / ${attRecord.totalPossible}` : `${attRecord.totalAttendance}`)
      : "";

    // Calculate class averages and BECE grades for printedRows
    const printedRows = report.subjects.map((subName) => {
      const row = getStudentSubjectReport(studentName, subName);
      const totals = activeStudents.map(name => getStudentSubjectReport(name, subName).total).filter(t => t > 0);
      const classAvg = totals.length > 0 ? Number((totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1)) : 0;
      const grade = getBeceGrade(row.total);
      return {
        ...row,
        classAvg,
        grade,
      };
    });

    const totalClassScore = printedRows.reduce((sum, r) => sum + r.classScore, 0);
    const totalExamScore = printedRows.reduce((sum, r) => sum + r.examScoreSubtotal, 0);
    const totalScore = printedRows.reduce((sum, r) => sum + r.total, 0);
    const totalClassAverage = printedRows.reduce((sum, r) => sum + r.classAvg, 0);

    const rowsHtml = printedRows.map((row) => `
      <tr style="border: 1px solid #000;">
        <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 11px; font-weight: 500;">${row.subjectName.toUpperCase()}</td>
        <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 11.5px; font-weight: 600; text-align: center;">${row.classScore.toFixed(1)}</td>
        <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 11.5px; font-weight: 600; text-align: center;">${row.examScoreSubtotal.toFixed(1)}</td>
        <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 12px; font-weight: bold; text-align: center;">${row.total.toFixed(1)}</td>
        <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 12px; font-weight: bold; text-align: center;">${row.grade}</td>
        <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 11px; text-align: center;">${row.classAvg.toFixed(1)}</td>
        <td style="border: 1px solid #000; padding: 3.5px 5px; font-size: 11.5px; font-weight: 600; text-align: center;">${row.remark}</td>
      </tr>
    `).join("");

    const deficitsList = printedRows
      .filter(row => row.remark === "IC" && row.deficits && row.deficits.length > 0)
      .map(row => `${row.subjectName} (${row.deficits.join(", ")})`)
      .join(", ");

    const deficitsHtml = deficitsList
      ? `<div style="margin-top: 4px; font-size: 11px; font-weight: 700; border: 1.5px solid #000; padding: 6px; background: #fff; font-family:'Segoe UI', Arial, sans-serif;">Outstanding Subject(s): ${deficitsList}</div>`
      : "";

    // SVG Bar Chart
    const svgWidth = 730;
    const svgHeight = 90;
    const numSubjects = printedRows.length || 1;
    const slotWidth = svgWidth / numSubjects;
    const barWidth = 20;

    const svgBars = printedRows.map((r, idx) => {
      const xCenter = 50 + idx * slotWidth + slotWidth / 2;
      const barX = xCenter - barWidth / 2;
      const score = r.total;
      const barHeight = score * 0.8; // scale down
      const barY = 90 - barHeight;

      const displayLabel = r.subjectName.toUpperCase() === "R. M. E" ? "R.M.E" : r.subjectName.toUpperCase();
      const words = displayLabel.split(" ");
      const tspans = words.map((w, wIdx) => `<tspan x="${xCenter}" dy="${wIdx === 0 ? 0 : 8}">${w}</tspan>`).join("");

      return `
        <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" fill="#52525b" />
        <text x="${xCenter}" y="101" font-size="7" font-family="'Segoe UI', Arial, sans-serif" text-anchor="middle" font-weight="bold">
          ${tspans}
        </text>
      `;
    }).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${studentName}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; color: #0f172a; background: #fff; }
    .page { 
      width: 100vw; 
      height: 98vh; 
      max-height: 98vh; 
      box-sizing: border-box; 
      page-break-after: always; 
      page-break-inside: avoid;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 10px;
    }
    .page:last-child { page-break-after: auto; }
    @media print { 
      body { margin: 0; padding: 0; } 
      .page { 
        height: 100vh; 
        max-height: 100vh; 
        padding: 5mm; 
        page-break-after: always; 
        page-break-inside: avoid; 
        box-sizing: border-box;
      } 
    }
  </style>
</head>
<body>
  <div class="page">
    <div style="border: 1.5px solid #000; padding: 8px 10px; width: 100%; box-sizing: border-box;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; border-bottom: 2px solid #000; padding-bottom: 4px;">
        <div style="width: 95px; display: flex; align-items: center; justify-content: center;">
          <img src="/ybs.png" alt="YBS Logo" style="width: 81px; height: 81px; object-fit: contain;" />
        </div>
        <div style="flex: 1; text-align: center;">
          <div style="font-size:22.5px; font-weight:800; font-family:'Outfit', 'Segoe UI', Arial, sans-serif; letter-spacing: 0.5px; line-height: 1.1;">YERIEL BRACHA SCHOOL</div>
          <div style="font-size:10px; font-weight:700; margin-top:2px;">P. O. BOX DT 2962, Adenta- Accra</div>
          <div style="font-size:10px; font-weight:700;">Tel: 026668550</div>
          <div style="font-size:10px; font-style:italic; font-weight:700; margin-top:2px;">Motto : Head Heart Hand</div>
          <div style="font-size:13px; font-weight:800; margin-top:3px; letter-spacing: 1px; text-decoration: underline;">STUDENT TERMINAL REPORT</div>
        </div>
        <div style="width: 95px; display: flex; align-items: center; justify-content: center;">
          <div style="width: 75px; height: 90px; border: 1.5px solid #000; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: #475569; background: #fff;">Photo</div>
        </div>
      </div>

      <table style="width:100%; border-collapse: collapse; margin-top: 6px; border: 1.5px solid #000;">
        <tr>
          <td colspan="2" style="background: #e2e8f0; padding: 4px 15px; text-align: left; font-weight: 800; font-size: 12.5px; border: 1.5px solid #000; font-family:'Segoe UI', Arial, sans-serif;">NAME OF STUDENT: ${studentName.toUpperCase()}</td>
        </tr>
        <tr>
          <td style="padding: 4px; font-size: 11px; font-weight: 700; width: 50%; border: 1.5px solid #000;">Sex: <span style="font-weight: 500;">${sex.toUpperCase()}</span></td>
          <td style="padding: 4px; font-size: 11px; font-weight: 700; width: 50%; border: 1.5px solid #000; text-align: right;">Class Roll: <span style="font-weight: 500;">${classRoll}</span></td>
        </tr>
        <tr>
          <td style="padding: 4px; font-size: 11px; font-weight: 700; border: 1.5px solid #000;">CLASS: <span style="font-weight: 500;">${className}</span></td>
          <td style="padding: 4px; font-size: 11px; font-weight: 700; border: 1.5px solid #000; text-align: right;">Term: <span style="font-weight: 500;">${term.replace(/\D/g, "") || term}</span></td>
        </tr>
        <tr>
          <td style="padding: 4px; font-size: 11px; font-weight: 700; border: 1.5px solid #000;">ATTENDANCE: <span style="font-weight: 500;">${attendanceVal || "N/A"}</span></td>
          <td style="padding: 4px; font-size: 11px; font-weight: 700; border: 1.5px solid #000; text-align: right;">Date: <span style="font-weight: 500;">${vacationDate}</span></td>
        </tr>
      </table>

      <table style="width:100%; border-collapse: collapse; margin-top: 6px; border: 1.5px solid #000;">
        <thead>
          <tr style="border: 1.5px solid #000; background: #f1f5f9;">
            <th style="border: 1.5px solid #000; padding: 3.5px 5px; font-size: 10.5px; text-align: left; width: 25%;">Subject</th>
            <th style="border: 1.5px solid #000; padding: 3.5px 5px; font-size: 10.5px; text-align: center; width: 12%;">Class Score (50%)</th>
            <th style="border: 1.5px solid #000; padding: 3.5px 5px; font-size: 10.5px; text-align: center; width: 12%;">Exam Score (50%)</th>
            <th style="border: 1.5px solid #000; padding: 3.5px 5px; font-size: 11px; text-align: center; width: 12%;">Total score</th>
            <th style="border: 1.5px solid #000; padding: 3.5px 5px; font-size: 11px; text-align: center; width: 8%;">Grade</th>
            <th style="border: 1.5px solid #000; padding: 3.5px 5px; font-size: 10.5px; text-align: center; width: 15%;">CLASS AVERAGE</th>
            <th style="border: 1.5px solid #000; padding: 3.5px 5px; font-size: 10.5px; text-align: center; width: 16%;">Remark</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr style="font-weight: 800; border-top: 2px solid #000; background: #f8fafc;">
            <td style="border: 1.5px solid #000; padding: 3.5px 5px; font-size: 11px;">TOTAL</td>
            <td style="border: 1.5px solid #000; padding: 3.5px 5px; font-size: 11.5px; text-align: center;">${totalClassScore.toFixed(1)}</td>
            <td style="border: 1.5px solid #000; padding: 3.5px 5px; font-size: 11.5px; text-align: center;">${totalExamScore.toFixed(1)}</td>
            <td style="border: 1.5px solid #000; padding: 3.5px 5px; font-size: 12px; text-align: center;">${totalScore.toFixed(1)}</td>
            <td style="border: 1.5px solid #000; padding: 3.5px 5px;"></td>
            <td style="border: 1.5px solid #000; padding: 3.5px 5px; font-size: 11px; text-align: center;">${totalClassAverage.toFixed(1)}</td>
            <td style="border: 1.5px solid #000; padding: 3.5px 5px;"></td>
          </tr>
        </tbody>
      </table>

      <table style="width:100%; border-collapse: collapse; margin-top: 4px; border: 1.5px solid #000;">
        <tr>
          <td rowspan="2" style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; font-weight: 800; text-align: center; width: 15%; background: #f1f5f9;">IF TOTAL SCORE</td>
          <td style="border: 1.5px solid #000; padding: 2px; font-size: 7.5px; text-align: center; font-weight: 700; width: 35%; background: #fff;">&gt;=80 - A , &gt;=75 - P , &gt;=70 - AP</td>
          <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; font-weight: 800; text-align: center; background: #f8fafc; width: 10%;">A</td>
          <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; font-weight: 800; text-align: center; background: #f8fafc; width: 10%;">P</td>
          <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; font-weight: 800; text-align: center; background: #f8fafc; width: 10%;">AP</td>
          <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; font-weight: 800; text-align: center; background: #f8fafc; width: 10%;">D</td>
          <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; font-weight: 800; text-align: center; background: #f8fafc; width: 10%;">B</td>
          <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; font-weight: 800; text-align: center; background: #f8fafc; width: 10%;">IC</td>
        </tr>
        <tr>
          <td style="border: 1.5px solid #000; padding: 2px; font-size: 7.5px; text-align: center; font-weight: 700; background: #fff;">&gt;=50 - D , &lt;=50 - B</td>
          <td style="border: 1.5px solid #000; padding: 2px; font-size: 7.5px; text-align: center; color: #475569;">Advance</td>
          <td style="border: 1.5px solid #000; padding: 2px; font-size: 7.5px; text-align: center; color: #475569;">Proficient</td>
          <td style="border: 1.5px solid #000; padding: 2px; font-size: 7.5px; text-align: center; color: #475569;">Approaching Proficiency</td>
          <td style="border: 1.5px solid #000; padding: 2px; font-size: 7.5px; text-align: center; color: #475569;">Developing</td>
          <td style="border: 1.5px solid #000; padding: 2px; font-size: 7.5px; text-align: center; color: #475569;">Beginning</td>
          <td style="border: 1.5px solid #000; padding: 2px; font-size: 7.5px; text-align: center; color: #475569;">Incomplete</td>
        </tr>
      </table>
      ${deficitsHtml}

      <div style="background: #e2e8f0; border: 1.5px solid #000; border-top: none; text-align: center; font-weight: 800; font-size: 9.5px; padding: 1.5px; letter-spacing: 0.5px; font-family:'Segoe UI', Arial, sans-serif;">GRAPHICAL REPRESENTATION OF RESULT BY TOTAL SCORE</div>
      <div style="border: 1.5px solid #000; border-top: none; padding: 5px 10px 3px 10px; display: flex; justify-content: center; height: 115px; background: #fff;">
        <svg viewBox="0 0 800 120" width="100%" height="120">
          <line x1="50" y1="10" x2="780" y2="10" stroke="#cbd5e1" stroke-dasharray="3,3" />
          <line x1="50" y1="50" x2="780" y2="50" stroke="#cbd5e1" stroke-dasharray="3,3" />
          <line x1="50" y1="90" x2="780" y2="90" stroke="#000" stroke-width="1.5" />
          
          <text x="40" y="13" font-size="8" font-family="'Segoe UI', Arial, sans-serif" text-anchor="end" font-weight="bold">100</text>
          <text x="40" y="53" font-size="8" font-family="'Segoe UI', Arial, sans-serif" text-anchor="end" font-weight="bold">50</text>
          <text x="40" y="93" font-size="8" font-family="'Segoe UI', Arial, sans-serif" text-anchor="end" font-weight="bold">0</text>
          
          ${svgBars}
        </svg>
      </div>

      <!-- Reopen date & Overall score box -->
      <div style="display: flex; justify-content: space-between; margin-top: 5px; align-items: stretch; gap: 10px;">
        <div style="flex: 1; border: 1.5px solid #000; padding: 5px; font-size: 10.5px; font-weight: 700; display: flex; align-items: center; justify-content: space-between; background: #fff;">
          <span>School Reopens on:</span>
          <span style="border: 1.5px solid #000; padding: 3px 8px; font-weight: 800; background: #f8fafc; font-size: 10px;">${reopeningDate}</span>
        </div>
        <table style="border: 1.5px solid #000; border-collapse: collapse; font-size: 10px; width: 170px; background: #fff;">
          <tr>
            <td style="border: 1.5px solid #000; padding: 3px; font-weight: 700; background: #f1f5f9;">Overall Score</td>
            <td style="border: 1.5px solid #000; padding: 3px; font-weight: 800; text-align: center; width: 70px;">${totalScore.toFixed(1)}</td>
          </tr>
          <tr>
            <td style="border: 1.5px solid #000; padding: 3px; font-weight: 700; text-align: right; background: #f1f5f9;">Out of</td>
            <td style="border: 1.5px solid #000; padding: 3px; font-weight: 800; text-align: center;">${(printedRows.length * 100).toFixed(1)}</td>
          </tr>
        </table>
      </div>

      <!-- Traits and comments Section -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 5px; border: 1.5px solid #000; font-size: 10px; background: #fff;">
        <tr style="background: #f1f5f9;">
          <td style="border: 1.5px solid #000; padding: 4px; font-weight: 700; text-align: center; width: 33.3%;">Conduct</td>
          <td style="border: 1.5px solid #000; padding: 4px; font-weight: 700; text-align: center; width: 33.3%;">Attitude</td>
          <td style="border: 1.5px solid #000; padding: 4px; font-weight: 700; text-align: center; width: 33.3%;">Interest</td>
        </tr>
        <tr>
          <td style="border: 1.5px solid #000; padding: 4px; font-weight: 800; text-align: center; font-size: 11px;">${conduct.toUpperCase() || "—"}</td>
          <td style="border: 1.5px solid #000; padding: 4px; font-weight: 800; text-align: center; font-size: 11px;">${attitude.toUpperCase() || "—"}</td>
          <td style="border: 1.5px solid #000; padding: 4px; font-weight: 800; text-align: center; font-size: 11px;">${interest.toUpperCase() || "—"}</td>
        </tr>
        <tr>
          <td colspan="3" style="border: 1.5px solid #000; padding: 6px; line-height: 1.4; min-height: 35px;">
            <div style="font-weight: 700; text-decoration: underline; margin-bottom: 2px;">Class Master/Mistress' Comment:</div>
            <div style="font-size: 11px; color: #0f172a;">${commentText || "No comment report submitted."}</div>
          </td>
        </tr>
      </table>

      <!-- Signatures Section -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 5px; border: 1.5px solid #000; font-size: 10px; background: #fff;">
        <tr>
          <td style="border: 1.5px solid #000; padding: 12px 10px; width: 50%; height: 50px; vertical-align: bottom;">
            <div style="display: flex; align-items: flex-end; justify-content: space-between;">
              <span style="font-weight: 700; font-size: 11px;">Class Teacher's Signature:</span>
              <div style="border-bottom: 1.5px dashed #000; width: 160px; height: 1px; margin-bottom: 2px;"></div>
            </div>
          </td>
          <td style="border: 1.5px solid #000; padding: 12px 10px; width: 50%; height: 50px; vertical-align: bottom;">
            <div style="display: flex; align-items: flex-end; justify-content: space-between;">
              <span style="font-weight: 700; font-size: 11px;">Headmaster / Headmistress' Signature:</span>
              <div style="border-bottom: 1.5px dashed #000; width: 140px; height: 1px; margin-bottom: 2px;"></div>
            </div>
          </td>
        </tr>
      </table>
    </div>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      alert("Pop-up blocked. Please allow pop-ups for this site.");
      return;
    }
    win.document.write(html);
    win.document.close();
  };

  const handlePrintStudentSbaSheet = (studentName: string) => {
    if (!academicYear || !term) {
      alert("Select academic year and term before printing the SBA breakdown.");
      return;
    }

    const activeStudents = getActiveClassStudents(schoolClassId, academicYear, term, reports, weeklyTests, midterms, sbaRecords);
    const classRoll = activeStudents.length || 1;

    const studentSubjects = getStudentReportSubjects(studentName);
    const rowsHtml = studentSubjects.map((subj) => {
      const report = getStudentSubjectReport(studentName, subj);
      const cw = (report.weeklyValue / 2).toFixed(1);
      const hw = (report.weeklyValue / 2).toFixed(1);
      const group = report.groupWorkScore.toFixed(1);
      const project = report.projectWorkScore.toFixed(1);
      const test2 = report.midtermValue.toFixed(1);
      const tot60 = report.total60.toFixed(1);
      const scaled50 = report.classScore.toFixed(1);

      return `
        <tr>
          <td class="left" style="font-weight: 600;">${subj.toUpperCase()}</td>
          <td>${cw}</td>
          <td>${hw}</td>
          <td>${group}</td>
          <td>${project}</td>
          <td>${test2}</td>
          <td style="font-weight: 700; background: #f8fafc;">${tot60}</td>
          <td style="font-weight: 700; background: #f1f5f9;">${scaled50}</td>
        </tr>
      `;
    }).join("");

    const className = SCHOOL_CLASSES.find((c) => c.id === schoolClassId)?.name ?? schoolClassId;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Student SBA Sheet</title>
  <style>
    @page { size: portrait; margin: 8mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 10px; color: #0f172a; background: #fff; }
    .page { max-width: 800px; margin: 0 auto; height: 100%; box-sizing: border-box; }
    .report-container { border: 2px solid #000; padding: 12px; height: 98vh; display: flex; flex-direction: column; background: #fff; position: relative; box-sizing: border-box; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1.5px solid #000; padding: 6px 8px; font-size: 11px; }
    th { background: #cbd5e1; color: #000; font-weight: 800; font-family:'Segoe UI', Arial, sans-serif; }
    td { text-align: center; }
    td.left { text-align: left; }
    @media print {
      body { padding: 0; background: none; }
      .page { margin: 0; width: 100%; height: 100%; }
      .report-container { height: 98vh; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="report-container">
      <!-- Header Section -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 4px;">
        <div style="width: 95px; display: flex; align-items: center; justify-content: center;">
          <img src="/ybs.png" alt="YBS Logo" style="width: 81px; height: 81px; object-fit: contain;" />
        </div>
        <div style="flex: 1; text-align: center;">
          <div style="font-size:22.5px; font-weight:800; font-family:'Outfit', 'Segoe UI', Arial, sans-serif; letter-spacing: 0.5px; line-height: 1.1;">YERIEL BRACHA SCHOOL</div>
          <div style="font-size:10px; font-weight:700; margin-top:2px;">P. O. BOX DT 2962, Adenta- Accra</div>
          <div style="font-size:10px; font-weight:700;">Tel: 026668550</div>
          <div style="font-size:10px; font-style:italic; font-weight:700; margin-top:2px;">Motto : Head Heart Hand</div>
          <div style="font-size:13px; font-weight:800; margin-top:3px; letter-spacing: 1px; text-decoration: underline;">STUDENT SBA BREAKDOWN SHEET</div>
        </div>
        <div style="width: 95px; display: flex; align-items: center; justify-content: center;">
          <div style="width: 75px; height: 90px; border: 1.5px solid #000; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: #475569; background: #fff;">Photo</div>
        </div>
      </div>

      <!-- Student Profile Section -->
      <table style="width:100%; border-collapse: collapse; margin-top: 6px; border: 1.5px solid #000;">
        <tr>
          <td colspan="2" style="background: #cbd5e1; padding: 6px 15px; text-align: left; font-weight: 800; font-size: 12.5px; border: 1.5px solid #000; font-family:'Segoe UI', Arial, sans-serif;">NAME OF STUDENT: ${studentName.toUpperCase()}</td>
        </tr>
        <tr>
          <td style="padding: 4px; font-size: 11px; font-weight: 700; width: 50%; border: 1.5px solid #000; text-align: left;">CLASS: <span style="font-weight: 500;">${className}</span></td>
          <td style="padding: 4px; font-size: 11px; font-weight: 700; width: 50%; border: 1.5px solid #000; text-align: right;">Term: <span style="font-weight: 500;">${term}</span></td>
        </tr>
        <tr>
          <td style="padding: 4px; font-size: 11px; font-weight: 700; border: 1.5px solid #000; text-align: left;">Academic Year: <span style="font-weight: 500;">${academicYear}</span></td>
          <td style="padding: 4px; font-size: 11px; font-weight: 700; border: 1.5px solid #000; text-align: right;">Class Roll: <span style="font-weight: 500;">${classRoll}</span></td>
        </tr>
      </table>

      <!-- SBA Breakdown Table -->
      <table>
        <thead>
          <tr>
            <th style="text-align: left; width: 30%;">Subject</th>
            <th>C/W (10)</th>
            <th>H/W (10)</th>
            <th>Group (10)</th>
            <th>Project (10)</th>
            <th>Test 2 (20)</th>
            <th>Total (/60)</th>
            <th>SBA (/50)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      alert("Pop-up blocked. Please allow pop-ups for this site.");
      return;
    }
    win.document.write(html);
    win.document.close();
  };

  const handlePrintSba = () => {
    if (allStudentsInClass.length === 0) {
      alert("No students available for SBA report.");
      return;
    }
    if (!academicYear || !term || !subject || !weekLabel) {
      alert("Select year, term, subject and week to print the SBA report.");
      return;
    }

    const rows = allStudentsInClass.map(studentName => {
      const weeklyScore = getWeeklyTestScore(studentName);
      const classWorkScore = Number((weeklyScore / 2).toFixed(2));
      const homeworkScore = Number((weeklyScore / 2).toFixed(2));
      const testScore = getMidtermScore(studentName);
      const groupWorkScore = Number(getSbaValue(studentName, "groupWorkScore"));
      const projectWorkScore = Number(getSbaValue(studentName, "projectWorkScore"));
      const examScore = Number(getSbaValue(studentName, "examScore"));
      const total60 = classWorkScore + homeworkScore + groupWorkScore + projectWorkScore + testScore;
      const subtotalA = Number(((total60 / 60) * 50).toFixed(2));
      const subtotalB = Number((examScore * 0.5).toFixed(2));
      return {
        studentName,
        classWorkScore,
        homeworkScore,
        testScore,
        groupWorkScore,
        projectWorkScore,
        total60: Number(total60.toFixed(2)),
        subtotalA,
        examScore: Number(examScore.toFixed(2)),
        subtotalB,
        totalAplusB: Number((subtotalA + subtotalB).toFixed(2)),
      };
    });

    const sortedRows = rows.sort((a, b) => b.totalAplusB - a.totalAplusB || a.studentName.localeCompare(b.studentName));
    let lastScore: number | null = null;
    let lastPosition = 0;
    const rowsWithPosition = sortedRows.map((row, index) => {
      const position = row.totalAplusB === lastScore ? lastPosition : index + 1;
      lastScore = row.totalAplusB;
      lastPosition = position;
      return { ...row, position };
    });

    const printRows = sortSbaRowsByStudentName(rowsWithPosition);
    const rowsHtml = printRows.map((row) => `
      <tr>
        <td>${row.studentName}</td>
        <td>${row.classWorkScore.toFixed(2)}</td>
        <td>${row.homeworkScore.toFixed(2)}</td>
        <td>${row.groupWorkScore.toFixed(2)}</td>
        <td>${row.projectWorkScore.toFixed(2)}</td>
        <td>${row.testScore.toFixed(2)}</td>
        <td>${row.total60.toFixed(2)}</td>
        <td>${row.subtotalA.toFixed(2)}</td>
        <td>${row.examScore.toFixed(2)}</td>
        <td>${row.subtotalB.toFixed(2)}</td>
        <td>${row.totalAplusB.toFixed(2)}</td>
        <td>${row.position}</td>
      </tr>
    `).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SBA Report</title>
  <style>
    @page { size: landscape; margin: 8mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 12px; color: #0f172a; background: #fff; }
    .header { text-align: center; margin-bottom: 18px; }
    .header h1 { margin-bottom: 6px; font-size: 26px; }
    .header p { margin: 0; color: #475569; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 7px; font-size: 11px; }
    th { background: #f8fafc; color: #0f172a; font-weight: 700; }
    td { color: #0f172a; }
    .footer { margin-top: 24px; font-size: 12px; color: #64748b; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>SBA Report</h1>
    <p>Class: ${schoolClassId} | Year: ${academicYear} | Term: ${term} | Subject: ${subject} | Weekly Test: ${weekLabel}</p>
    <p>C/W(10) + H/W(10) + G/W(10) + PROJECT(10) + TEST(20) | TOTAL(/60) | SUB A(/50) + EXAM(100) | SUB B(/50)</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Student</th>
        <th>C/W(10)</th>
        <th>H/W(10)</th>
        <th>G/W(10)</th>
        <th>PROJECT(10)</th>
        <th>TEST(20)</th>
        <th>TOTAL(/60)</th>
        <th>SUB A(/50)</th>
        <th>EXAM(100)</th>
        <th>SUB B(/50)</th>
        <th>TOTAL A + B</th>
        <th>POSITION</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="footer">Generated on ${new Date().toLocaleString()}</div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=1100,height=700");
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
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Academic Year</label>
            <AcademicYearPicker
              value={academicYear}
              onChange={setAcademicYear}
              allowEmpty
              placeholder="-- Select Year --"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Term</label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring"
            >
              <option value="">-- Select Term --</option>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring"
            >
              <option value="">-- Select Subject --</option>
              {allowedSubjects.map((sub) => (
                <option key={sub.id} value={sub.name}>{sub.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-300">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Auto-selected week</p>
          <p className="mt-1 font-medium text-amber-300">{weekLabel || "No matching weekly test found"}</p>
        </div>
        <button
          onClick={handlePrintSba}
          className="mt-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110"
        >
          Print SBA Report
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-lg font-semibold text-white">Individual Report Cards</h4>
          <span className="text-xs text-slate-400">{allStudentsInClass.length} student(s)</span>
        </div>
        <div className="space-y-2">
          {allStudentsInClass.length === 0 ? (
            <p className="text-sm text-slate-500">No students available for report cards.</p>
          ) : (
            allStudentsInClass.map((studentName) => {
              const report = getStudentReportCardData(studentName);
              return (
                <div key={studentName} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-950/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-slate-100">{studentName}</p>
                    {report.subjects.length > 0 ? (
                      <p className="text-xs text-slate-400">
                        Subjects: {report.subjects.length} • Total Marks: {report.totalMarks.toFixed(2)} • Average: {report.average.toFixed(2)} • Remark: {report.overallRemark}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">No subject data available yet for this student.</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePrintStudentReportCard(studentName)}
                      className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20"
                    >
                      Print Report Card
                    </button>
                    <button
                      onClick={() => handlePrintStudentSbaSheet(studentName)}
                      className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/20"
                    >
                      Print SBA Breakdown
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

type AdminWeeklyReportProps = {
  weeklyTests: WeeklyTest[];
  teacherAccounts: TeacherAccount[];
  classLookup: Record<string, ClassRoom>;
  readOnly?: boolean;
};
