



















import { AnimatePresence, motion } from "framer-motion";
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

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: 'transparent' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

const bgTransition = { duration: 0.4, ease: "easeOut" } as const;

type ClassRoom = {
  id: string;
  name: string;
};

type TeacherAccount = {
  id: string;
  fullName: string;
  username: string;
  password: string;
  classIds: string[];
  // Permissions: for each class, which subjects the teacher can input
  permissions?: { classId: string; subjectIds: string[] }[];
};

type EditRecord = {
  editedBy: "teacher" | "principal";
  editorName: string;
  editedAt: string;
  previousStudentName: string;
  previousComment: string;
};

type CommentReport = {
  id: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  studentName: string;
  comment: string;
  academicYear: string;
  term: string;
  submittedAt: string;
  editHistory?: EditRecord[];
  lastEditedBy?: "teacher" | "principal";
  lastEditedAt?: string;
  sex?: "MALE" | "FEMALE" | "";
  conduct?: string;
  attitude?: string;
  interest?: string;
};

type WeeklyTest = {
  id: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  studentName: string;
  academicYear: string;
  term: string;
  weekLabel: string;
  subject: string;
  score: number;
  maxScore: number;
  calculatedScore: number;
  remark: string;
  submittedAt: string;
};

type Midterm = {
  id: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  studentName: string;
  academicYear: string;
  term: string;
  subject: string;
  score: number;
  maxScore: number; // always 100
  calculatedScore: number; // same as raw score for /100 reporting
  submittedAt: string;
};

type SBARecord = {
  id: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  studentName: string;
  academicYear: string;
  term: string;
  subject: string;
  groupWorkScore: number;
  projectWorkScore: number;
  examScore: number;
  submittedAt: string;
};

type TermAttendanceRecord = {
  id: string;
  teacherId: string;
  classId: string;
  academicYear: string;
  term: string;
  studentName: string;
  totalAttendance: number;
  totalPossible: number;
  submittedAt: string;
};

type NurseryChecklistRecord = {
  id: string;
  studentName: string;
  classId: string;
  academicYear: string;
  term: string;
  ratings: Record<string, string>;
  phonicsText?: string;
  numbersText?: string;
  teacherId: string;
  submittedAt: string;
};

const NUMBER_RECOGNITION_OPTIONS = [
  "0 -- 5",
  "0 -- 10",
  "0 -- 15",
  "0 -- 20",
  "0 -- 25",
  "0 -- 30",
  "0 -- 35",
  "0 -- 40",
  "0 -- 45",
  "0 -- 50"
];

type AttendanceRecord = {
  id: string;
  teacherId: string;
  classId: string;
  date: string; // YYYY-MM-DD
  present: string[];
  submittedAt: string;
};

type ReportSettingsRecord = {
  id: string;
  academicYear: string;
  term: string;
  vacationDate: string;
  reopeningDate: string;
};

type SBARecordInput = Omit<SBARecord, "id" | "submittedAt"> & Partial<Pick<SBARecord, "id">>;

const SCHOOL_CLASSES: ClassRoom[] = [
  { id: "creche", name: "Creche" },
  { id: "nursery-1", name: "Nursery 1" },
  { id: "nursery-2", name: "Nursery 2" },
  { id: "kindergarten-1", name: "Kindergarten 1" },
  { id: "kindergarten-2", name: "Kindergarten 2" },
  { id: "basic-1", name: "Basic 1" },
  { id: "basic-2", name: "Basic 2" },
  { id: "basic-3", name: "Basic 3" },
  { id: "basic-4", name: "Basic 4" },
  { id: "basic-5", name: "Basic 5" },
  { id: "basic-6", name: "Basic 6" },
  { id: "basic-7", name: "Basic 7" },
  { id: "basic-8", name: "Basic 8" },
  { id: "basic-9", name: "Basic 9" },
];

type NurseryQuestion = {
  id: string;
  category: string;
  text: string;
};

const NURSERY_QUESTIONS: NurseryQuestion[] = [
  // 1. FINE/GROSS MOTOR CO-ORDINATION
  { id: "motor_1", category: "FINE/GROSS MOTOR CO-ORDINATION", text: "Can he or she run, jump, hop and stop according to instructions?" },
  { id: "motor_2", category: "FINE/GROSS MOTOR CO-ORDINATION", text: "Does he or she display agility, strength and speed in relation to his or her physical size and stature?" },
  { id: "motor_3", category: "FINE/GROSS MOTOR CO-ORDINATION", text: "Does he or she know whether he or she is left or right-handed?" },
  { id: "motor_4", category: "FINE/GROSS MOTOR CO-ORDINATION", text: "Can he or she thread beads and use a pegboard and pegs?" },
  { id: "motor_5", category: "FINE/GROSS MOTOR CO-ORDINATION", text: "Does he or she draw and outline with confident lines?" },

  // 2. SOCIAL AND EMOTIONAL READINESS
  { id: "social_1", category: "SOCIAL AND EMOTIONAL READINESS", text: "Is the child normally happy?" },
  { id: "social_2", category: "SOCIAL AND EMOTIONAL READINESS", text: "Does he or she participate in group activities?" },
  { id: "social_3", category: "SOCIAL AND EMOTIONAL READINESS", text: "Can he or she play/work alone at times?" },
  { id: "social_4", category: "SOCIAL AND EMOTIONAL READINESS", text: "Is he or she able to complete tasks?" },
  { id: "social_5", category: "SOCIAL AND EMOTIONAL READINESS", text: "Can he or she follow instructions?" },
  { id: "social_6", category: "SOCIAL AND EMOTIONAL READINESS", text: "Can he or she accept criticism without becoming unduly upset?" },
  { id: "social_7", category: "SOCIAL AND EMOTIONAL READINESS", text: "Can he or she communicate and interact with adults other than his or her parents?" },
  { id: "social_8", category: "SOCIAL AND EMOTIONAL READINESS", text: "Is he or she eager to go to school?" },

  // 3. PERSONAL INDEPENDENCE
  { id: "personal_1", category: "PERSONAL INDEPENDENCE", text: "Is he or she able to perform normal daily activities independently?" },
  { id: "personal_2", category: "PERSONAL INDEPENDENCE", text: "Can he or she dress and undress himself or herself – buttons, zips, lace shoe etc?" },
  { id: "personal_3", category: "PERSONAL INDEPENDENCE", text: "Can he or she ask permission to leave the room using appropriate terminology?" },
  { id: "personal_4", category: "PERSONAL INDEPENDENCE", text: "Can he or she identify and name body parts of him or herself and others?" },

  // 4. VISUAL PERCEPTION
  { id: "visual_1", category: "VISUAL PERCEPTION", text: "Is he or she able to match similar objects?" },
  { id: "visual_2", category: "VISUAL PERCEPTION", text: "Can he or she remember details in a picture?" },
  { id: "visual_3", category: "VISUAL PERCEPTION", text: "Can he or she arrange objects or pictures in sequence?" },

  // 5. AUDITORY PERCEPTION
  { id: "auditory_1", category: "AUDITORY PERCEPTION", text: "Can he or she differentiate between sounds?" },
  { id: "auditory_2", category: "AUDITORY PERCEPTION", text: "Can he or she clap a simple rhythmic pattern (two long claps and one long clap)?" },
  { id: "auditory_3", category: "AUDITORY PERCEPTION", text: "Can he or she remember and repeat series of up to four words or numbers?" },

  // 6. ENVIRONMENTAL STUDIES
  { id: "env_1", category: "ENVIRONMENTAL STUDIES", text: "Can he or she mention names of parents and works they do?" },
  { id: "env_2", category: "ENVIRONMENTAL STUDIES", text: "Can he or she mention parts of his or her body and their functions?" },
  { id: "env_3", category: "ENVIRONMENTAL STUDIES", text: "Can he or she mention three things he or she can do to keep the environment clean?" },
  { id: "env_4", category: "ENVIRONMENTAL STUDIES", text: "Recognizes the existence of the Supreme Being?" },
  { id: "env_5", category: "ENVIRONMENTAL STUDIES", text: "Can he or she mention the name of school, location, class, name of class teacher?" },
  { id: "env_6", category: "ENVIRONMENTAL STUDIES", text: "Identifies the Ghana flag" },
  { id: "env_7", category: "ENVIRONMENTAL STUDIES", text: "Can he or she mention common celebrations in the home and community (e.g. birthday, festivals etc..)?" },
  { id: "env_8", category: "ENVIRONMENTAL STUDIES", text: "Identifies and talks about important places in the community? (e.g. clinics, police station, the chief's house, the church or mosque)" },
  { id: "env_9", category: "ENVIRONMENTAL STUDIES", text: "Identifies safe situations, materials and equipment in the home, School and community." },
  { id: "env_10", category: "ENVIRONMENTAL STUDIES", text: "Can he or she differentiate between clean and dirty water?" },
  { id: "env_11", category: "ENVIRONMENTAL STUDIES", text: "Can he or she identify three sources of light?" },
  { id: "env_12", category: "ENVIRONMENTAL STUDIES", text: "Can he or she demonstrate the sources and uses of water?" },
  { id: "env_13", category: "ENVIRONMENTAL STUDIES", text: "Can he or she say “Thank you” in appreciation?" },

  // 7. COGNITIVE DEVELOPMENT AND PROBLEM SOLVING / MATHEMATICS/NUMBER CONCEPT
  { id: "math_1", category: "COGNITIVE DEVELOPMENT AND PROBLEM SOLVING (MATHEMATICS)", text: "Can he or she sort or match up to five items or more according to categories? (e.g shape, colour, size, etc.)" },
  { id: "math_2", category: "COGNITIVE DEVELOPMENT AND PROBLEM SOLVING (MATHEMATICS)", text: "Can he or she draw or copy a triangle, circle, square, rectangle and cross?" },
  { id: "math_3", category: "COGNITIVE DEVELOPMENT AND PROBLEM SOLVING (MATHEMATICS)", text: "Does he or she recognize quantities or groups of objects? (more than, less than, the same)" },
  { id: "math_4", category: "COGNITIVE DEVELOPMENT AND PROBLEM SOLVING (MATHEMATICS)", text: "Does he or she demonstrate an understanding of quantity or numeral concept?" },
  { id: "math_5", category: "COGNITIVE DEVELOPMENT AND PROBLEM SOLVING (MATHEMATICS)", text: "Can he or she count with understanding up to at least 10 or more?" },

  // 8. LANGUAGE
  { id: "lang_1", category: "LANGUAGE", text: "Does he or she enjoy listening to stories?" },
  { id: "lang_2", category: "LANGUAGE", text: "Does he or she spend time looking at and paging through books?" },
  { id: "lang_3", category: "LANGUAGE", text: "Is he or she able to use English (or mother tongue) as his or her main means of communication?" },
  { id: "lang_4", category: "LANGUAGE", text: "Can he or she express himself or herself using adequate vocabulary?" },
  { id: "lang_5", category: "LANGUAGE", text: "Can he or she speak in sentences with generally correct language?" },
  { id: "lang_6", category: "LANGUAGE", text: "Does he or she express his or her needs through the use of language?" },
  { id: "lang_7", category: "LANGUAGE", text: "Can he or she ask and answer simple questions?" },
  { id: "lang_8", category: "LANGUAGE", text: "Can he or she identify and name objects in the environment and appropriately selected pictures?" },

  // 9. MUSIC, ART AND CREATIVITY
  { id: "music_1", category: "MUSIC, ART AND CREATIVITY", text: "Does he or she enjoy music, dancing, dramatization, modelling and moulding?" },
  { id: "music_2", category: "MUSIC, ART AND CREATIVITY", text: "Does he or she enjoy paper painting, finger painting, tearing and pasting?" },
  { id: "music_3", category: "MUSIC, ART AND CREATIVITY", text: "Can he or she trace, fold, cut and paste?" }
];

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

const SUBJECT_PRINT_LABELS: Record<string, string> = {
  "English Language": "Eng",
  Mathematics: "Math",
  Science: "Sci",
  Computing: "Comp",
  History: "Hist",
  "Social Studies": "Soc St",
  CAD: "CAD",
  "R. M. E": "RME",
  French: "French",
  "Ghanaian Language": "Ghana Lang",
  "Career Tech": "Career",
};

const ADMIN_USERNAME = "admin001";
const ADMIN_PASSWORD = "000000";
const PRINCIPAL_USERNAME = "principal001";
const PRINCIPAL_PASSWORD = "000000";
const APP_VERSION = "1.0.0";
const TEACHERS_STORAGE_KEY = "school-teachers";
const REPORTS_STORAGE_KEY = "school-reports";
const SESSION_KEY = "school-current-session";
const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours of inactivity

const normalizeDisplayValue = (value?: string) =>
  (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isStudentNameMatch = (nameA?: string, nameB?: string): boolean => {
  if (!nameA || !nameB) return false;
  const normA = normalizeDisplayValue(nameA);
  const normB = normalizeDisplayValue(nameB);
  if (normA === normB) return true;
  if (!normA || !normB) return false;

  const alphaA = normA.replace(/[^a-z]/g, "");
  const alphaB = normB.replace(/[^a-z]/g, "");
  if (alphaA && alphaB && alphaA === alphaB) return true;

  if (normA.includes(normB) || normB.includes(normA)) return true;

  const tokensA = normA.split(" ").filter((t) => t.length > 1);
  const tokensB = normB.split(" ").filter((t) => t.length > 1);
  if (tokensA.length > 0 && tokensB.length > 0) {
    const common = tokensA.filter((t) => tokensB.includes(t));
    if (common.length >= 2) return true;
    if ((tokensA.length === 1 || tokensB.length === 1) && common.length >= 1) return true;
  }
  return false;
};

const standardizeTerm = (val?: string) => {
  const norm = normalizeDisplayValue(val);
  if (norm.includes("1")) return "term 1";
  if (norm.includes("2")) return "term 2";
  if (norm.includes("3")) return "term 3";
  return norm;
};

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

const TERM_3_WEEKLY_SUBJECT_PLAN: Record<string, string> = {
  "week 1": "Career Tech",
  "week 2": "English Language",
  "week 3": "R. M. E",
  "week 4": "Mathematics",
  "week 5": "Computing",
  "week 6": "Science",
  "week 7": "CAD",
  "week 8": "History",
  "week 9": "Social Studies",
  "week 10": "French",
  "week 11": "Ghanaian Language",
};

const PRIMARY_TERM_3_WEEKLY_SUBJECT_PLAN: Record<string, string> = {
  "week 2": "English Language",
  "week 3": "R. M. E",
  "week 4": "Mathematics",
  "week 5": "Computing",
  "week 6": "Science",
  "week 7": "CAD",
  "week 9": "History",
  "week 10": "French",
  "week 11": "Ghanaian Language",
};

const getWeekNumber = (weekLabel?: string) => {
  const match = normalizeDisplayValue(weekLabel).match(/\d+/);
  return match ? Number(match[0]) : null;
};

const getTerm3WeeklySubject = (weekLabel?: string, classId?: string) => {
  const weekNumber = getWeekNumber(weekLabel);
  if (!weekNumber) return "";
  
  const isJHS = classId && (classId.startsWith("basic-7") || classId.startsWith("basic-8") || classId.startsWith("basic-9"));
  if (classId && !isJHS) {
    return PRIMARY_TERM_3_WEEKLY_SUBJECT_PLAN[`week ${weekNumber}`] ?? "";
  }
  
  return TERM_3_WEEKLY_SUBJECT_PLAN[`week ${weekNumber}`] ?? "";
};

const getBeceGrade = (score: number) => {
  if (score >= 90) return 1;
  if (score >= 80) return 2;
  if (score >= 70) return 3;
  if (score >= 60) return 4;
  if (score >= 55) return 5;
  if (score >= 50) return 6;
  if (score >= 40) return 7;
  if (score >= 35) return 8;
  return 9;
};

const getCanonicalSubjectName = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  const normalized = normalizeDisplayValue(trimmed);
  const subjectMatch = SUBJECTS.find((subject) => normalizeDisplayValue(subject.name) === normalized);
  if (subjectMatch) return subjectMatch.name;

  return SUBJECT_NAME_ALIASES[normalized] ?? trimmed;
};

const getTerm3WeeklyTestFields = (weekLabel?: string, subject?: string, classId?: string): Pick<WeeklyTest, "term" | "subject"> => ({
  term: "Term 3",
  subject: getTerm3WeeklySubject(weekLabel, classId) || getCanonicalSubjectName(subject),
});

const weeklyTestNeedsTerm3Update = (test: WeeklyTest) => {
  const next = getTerm3WeeklyTestFields(test.weekLabel, test.subject, test.classId);
  return test.term !== next.term || test.subject !== next.subject;
};

const subjectNamesMatch = (left?: string, right?: string) => {
  return normalizeDisplayValue(getCanonicalSubjectName(left)) === normalizeDisplayValue(getCanonicalSubjectName(right));
};

function sortSbaRowsByStudentName<T extends { studentName: string }>(rows: T[]) {
  return [...rows].sort((a, b) => a.studentName.localeCompare(b.studentName));
}

function getActiveClassStudents(
  classId: string,
  academicYear: string,
  term: string,
  reports: CommentReport[],
  weeklyTests?: WeeklyTest[],
  midterms?: Midterm[],
  sbaRecords?: SBARecord[],
  nurseryChecklists?: NurseryChecklistRecord[],
  termAttendanceRecords?: TermAttendanceRecord[]
): string[] {
  const studentMap = new Map<string, string>(); // normalizedKey -> displayString

  const addName = (name?: string) => {
    const trimmed = name?.trim();
    if (!trimmed) return;
    const key = normalizeDisplayValue(trimmed);
    if (!studentMap.has(key)) {
      studentMap.set(key, trimmed);
    }
  };

  const isClassMatch = (cId?: string) => cId === classId || normalizeDisplayValue(cId) === normalizeDisplayValue(classId);
  const isYearMatch = (y?: string) => normalizeDisplayValue(y) === normalizeDisplayValue(academicYear);
  const isTermMatch = (t?: string) => standardizeTerm(t) === standardizeTerm(term);

  // 1. Term-specific matches
  (reports ?? []).forEach(r => { if (isClassMatch(r.classId) && isYearMatch(r.academicYear) && isTermMatch(r.term)) addName(r.studentName); });
  (nurseryChecklists ?? []).forEach(c => { if (isClassMatch(c.classId) && isYearMatch(c.academicYear) && isTermMatch(c.term)) addName(c.studentName); });
  (weeklyTests ?? []).forEach(t => { if (isClassMatch(t.classId) && isYearMatch(t.academicYear) && isTermMatch(t.term)) addName(t.studentName); });
  (midterms ?? []).forEach(m => { if (isClassMatch(m.classId) && isYearMatch(m.academicYear) && isTermMatch(m.term)) addName(m.studentName); });
  (sbaRecords ?? []).forEach(s => { if (isClassMatch(s.classId) && isYearMatch(s.academicYear) && isTermMatch(s.term)) addName(s.studentName); });
  (termAttendanceRecords ?? []).forEach(a => { if (isClassMatch(a.classId) && isYearMatch(a.academicYear) && isTermMatch(a.term)) addName(a.studentName); });

  // 2. Class-wide fallback matches
  (reports ?? []).forEach(r => { if (isClassMatch(r.classId)) addName(r.studentName); });
  (nurseryChecklists ?? []).forEach(c => { if (isClassMatch(c.classId)) addName(c.studentName); });
  (weeklyTests ?? []).forEach(t => { if (isClassMatch(t.classId)) addName(t.studentName); });
  (midterms ?? []).forEach(m => { if (isClassMatch(m.classId)) addName(m.studentName); });
  (sbaRecords ?? []).forEach(s => { if (isClassMatch(s.classId)) addName(s.studentName); });
  (termAttendanceRecords ?? []).forEach(a => { if (isClassMatch(a.classId)) addName(a.studentName); });

  return Array.from(studentMap.values()).sort((a, b) => a.localeCompare(b));
}

type AdminSBAReportProps = {
  sbaRecords: SBARecord[];
  weeklyTests: WeeklyTest[];
  midterms: Midterm[];
  reports: CommentReport[];
  classLookup: Record<string, ClassRoom>;
  saveStudentTraits: (studentName: string, classId: string, academicYear: string, term: string, traits: any) => Promise<void>;
  termAttendanceRecords: TermAttendanceRecord[];
  reportSettings: ReportSettingsRecord[];
  getNurseryReportCardHtml: any;
  nurseryChecklists: NurseryChecklistRecord[];
};

function AdminSBAReport({
  sbaRecords,
  weeklyTests,
  midterms,
  reports,
  classLookup,
  saveStudentTraits: _saveStudentTraits,
  termAttendanceRecords,
  reportSettings,
  getNurseryReportCardHtml,
  nurseryChecklists,
}: AdminSBAReportProps) {
  const [classFilter, setClassFilter] = useState(SCHOOL_CLASSES[0]?.id ?? "basic-1");
  const [yearFilter, setYearFilter] = useState("2025/2026");
  const [termFilter, setTermFilter] = useState("Term 3");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [weekLabel, setWeekLabel] = useState("");

  const hasSetDefault = useRef(false);
  useEffect(() => {
    if (hasSetDefault.current || reports.length === 0) return;
    const sorted = [...reports].sort((a: any, b: any) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
    const latest = sorted[0];
    if (latest?.academicYear) setYearFilter(latest.academicYear);
    if (latest?.term) setTermFilter(latest.term);
    hasSetDefault.current = true;
  }, [reports]);

  const availableSubjects = useMemo(() => {
    const subjectSet = new Set<string>();
    const addSubject = (subject?: string) => {
      const canonicalSubject = getCanonicalSubjectName(subject);
      if (canonicalSubject) subjectSet.add(canonicalSubject);
    };

    weeklyTests.forEach((test) => {
      if (
        test.classId === classFilter &&
        normalizeDisplayValue(test.academicYear) === normalizeDisplayValue(yearFilter) &&
        normalizeDisplayValue(test.term) === normalizeDisplayValue(termFilter)
      ) {
        addSubject(test.subject);
      }
    });

    midterms.forEach((record) => {
      if (
        record.classId === classFilter &&
        normalizeDisplayValue(record.academicYear) === normalizeDisplayValue(yearFilter) &&
        normalizeDisplayValue(record.term) === normalizeDisplayValue(termFilter)
      ) {
        addSubject(record.subject);
      }
    });

    sbaRecords.forEach((record) => {
      if (
        record.classId === classFilter &&
        normalizeDisplayValue(record.academicYear) === normalizeDisplayValue(yearFilter) &&
        normalizeDisplayValue(record.term) === normalizeDisplayValue(termFilter)
      ) {
        addSubject(record.subject);
      }
    });

    return Array.from(subjectSet).sort();
  }, [weeklyTests, midterms, sbaRecords, classFilter, yearFilter, termFilter]);

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

    weeklyTests.forEach((test) => {
      if (
        test.classId === classFilter &&
        normalizeDisplayValue(test.academicYear) === normalizeDisplayValue(yearFilter) &&
        normalizeDisplayValue(test.term) === normalizeDisplayValue(termFilter)
      ) {
        addStudent(test.studentName);
      }
    });

    sbaRecords.forEach((record) => {
      if (
        record.classId === classFilter &&
        normalizeDisplayValue(record.academicYear) === normalizeDisplayValue(yearFilter) &&
        normalizeDisplayValue(record.term) === normalizeDisplayValue(termFilter)
      ) {
        addStudent(record.studentName);
      }
    });

    midterms.forEach((record) => {
      if (
        record.classId === classFilter &&
        normalizeDisplayValue(record.academicYear) === normalizeDisplayValue(yearFilter) &&
        normalizeDisplayValue(record.term) === normalizeDisplayValue(termFilter)
      ) {
        addStudent(record.studentName);
      }
    });

    termAttendanceRecords.forEach((record) => {
      if (
        record.classId === classFilter &&
        normalizeDisplayValue(record.academicYear) === normalizeDisplayValue(yearFilter) &&
        normalizeDisplayValue(record.term) === normalizeDisplayValue(termFilter)
      ) {
        addStudent(record.studentName);
      }
    });

    nurseryChecklists.forEach((record) => {
      if (
        (record.classId === classFilter || normalizeDisplayValue(record.classId) === normalizeDisplayValue(classFilter)) &&
        normalizeDisplayValue(record.academicYear) === normalizeDisplayValue(yearFilter) &&
        standardizeTerm(record.term) === standardizeTerm(termFilter)
      ) {
        addStudent(record.studentName);
      }
    });

    return Array.from(studentSet).sort((a, b) => a.localeCompare(b));
  }, [reports, weeklyTests, sbaRecords, midterms, termAttendanceRecords, nurseryChecklists, classFilter, yearFilter, termFilter]);

  const weekOptions = useMemo(() => {
    const weekSet = new Set<string>();
    weeklyTests.forEach((test) => {
      if (
        test.classId === classFilter &&
        normalizeDisplayValue(test.academicYear) === normalizeDisplayValue(yearFilter) &&
        normalizeDisplayValue(test.term) === normalizeDisplayValue(termFilter) &&
        (!subjectFilter || subjectNamesMatch(test.subject, subjectFilter))
      ) {
        if (test.weekLabel?.trim()) weekSet.add(test.weekLabel.trim());
      }
    });
    return Array.from(weekSet).sort((a, b) => parseInt(a.replace(/\D/g, ""), 10) - parseInt(b.replace(/\D/g, ""), 10));
  }, [weeklyTests, classFilter, yearFilter, termFilter, subjectFilter]);

  useEffect(() => {
    if (!availableSubjects.includes(subjectFilter)) {
      setSubjectFilter("");
    }
  }, [availableSubjects, subjectFilter]);

  useEffect(() => {
    if (!studentsInClass.includes(studentFilter)) {
      setStudentFilter("");
    }
  }, [studentsInClass, studentFilter]);

  useEffect(() => {
    setWeekLabel((current) => (current && weekOptions.includes(current) ? current : weekOptions[0] ?? ""));
  }, [weekOptions]);

  const getWeeklyTestScore = (studentName: string) => {
    const subjectTests = weeklyTests.filter(
      (test) =>
        test.classId === classFilter &&
        normalizeDisplayValue(test.studentName) === normalizeDisplayValue(studentName) &&
        normalizeDisplayValue(test.academicYear) === normalizeDisplayValue(yearFilter) &&
        normalizeDisplayValue(test.term) === normalizeDisplayValue(termFilter) &&
        subjectNamesMatch(test.subject, subjectFilter)
    );
    return subjectTests.length > 0
      ? Number((subjectTests.reduce((sum, t) => sum + (t.calculatedScore ?? 0), 0) / subjectTests.length).toFixed(2))
      : 0;
  };

  const getMidtermScore = (studentName: string) => {
    const record = midterms
      .filter((m) =>
        m.classId === classFilter &&
        normalizeDisplayValue(m.studentName) === normalizeDisplayValue(studentName) &&
        normalizeDisplayValue(m.academicYear) === normalizeDisplayValue(yearFilter) &&
        normalizeDisplayValue(m.term) === normalizeDisplayValue(termFilter) &&
        subjectNamesMatch(m.subject, subjectFilter)
      )
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
    if (!record || record.score <= 0) return 5;
    return Number(((record.score / 100) * 20).toFixed(2));
  };

  const getSbaValue = (studentName: string, field: "groupWorkScore" | "projectWorkScore" | "examScore") => {
    const record = sbaRecords.find((entry) =>
      entry.classId === classFilter &&
      normalizeDisplayValue(entry.studentName) === normalizeDisplayValue(studentName) &&
      normalizeDisplayValue(entry.academicYear) === normalizeDisplayValue(yearFilter) &&
      normalizeDisplayValue(entry.term) === normalizeDisplayValue(termFilter) &&
      subjectNamesMatch(entry.subject, subjectFilter)
    );
    return record?.[field] ?? 0;
  };

  const getStudentReportSubjects = (studentName: string) => {
    const subjects = new Set<string>();
    const addSubjectIfValid = (subj: string) => {
      const canonical = getCanonicalSubjectName(subj);
      if (canonical && canonical.toLowerCase() !== "unknown subject" && canonical.toLowerCase() !== "unknown") {
        subjects.add(canonical);
      }
    };
    weeklyTests.forEach((test) => {
      if (
        test.classId === classFilter &&
        normalizeDisplayValue(test.studentName) === normalizeDisplayValue(studentName) &&
        normalizeDisplayValue(test.academicYear) === normalizeDisplayValue(yearFilter) &&
        normalizeDisplayValue(test.term) === normalizeDisplayValue(termFilter)
      ) {
        addSubjectIfValid(test.subject);
      }
    });
    midterms.forEach((record) => {
      if (
        record.classId === classFilter &&
        normalizeDisplayValue(record.studentName) === normalizeDisplayValue(studentName) &&
        normalizeDisplayValue(record.academicYear) === normalizeDisplayValue(yearFilter) &&
        normalizeDisplayValue(record.term) === normalizeDisplayValue(termFilter)
      ) {
        addSubjectIfValid(record.subject);
      }
    });
    sbaRecords.forEach((record) => {
      if (
        record.classId === classFilter &&
        normalizeDisplayValue(record.studentName) === normalizeDisplayValue(studentName) &&
        normalizeDisplayValue(record.academicYear) === normalizeDisplayValue(yearFilter) &&
        normalizeDisplayValue(record.term) === normalizeDisplayValue(termFilter)
      ) {
        addSubjectIfValid(record.subject);
      }
    });
    return Array.from(subjects).sort();
  };

  const getStudentSubjectReport = (studentName: string, subjectName: string) => {
    const subjectTests = weeklyTests.filter(
      (test) =>
        test.classId === classFilter &&
        normalizeDisplayValue(test.studentName) === normalizeDisplayValue(studentName) &&
        normalizeDisplayValue(test.academicYear) === normalizeDisplayValue(yearFilter) &&
        normalizeDisplayValue(test.term) === normalizeDisplayValue(termFilter) &&
        subjectNamesMatch(test.subject, subjectName)
    );
    const weeklyValue = subjectTests.length > 0
      ? Number((subjectTests.reduce((sum, t) => sum + (t.calculatedScore ?? 0), 0) / subjectTests.length).toFixed(2))
      : 0;

    const midterm = midterms
      .filter((record) =>
        record.classId === classFilter &&
        normalizeDisplayValue(record.studentName) === normalizeDisplayValue(studentName) &&
        normalizeDisplayValue(record.academicYear) === normalizeDisplayValue(yearFilter) &&
        normalizeDisplayValue(record.term) === normalizeDisplayValue(termFilter) &&
        subjectNamesMatch(record.subject, subjectName)
      )
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];

    const sbaRecord = sbaRecords.find((entry) =>
      entry.classId === classFilter &&
      normalizeDisplayValue(entry.studentName) === normalizeDisplayValue(studentName) &&
      normalizeDisplayValue(entry.academicYear) === normalizeDisplayValue(yearFilter) &&
      normalizeDisplayValue(entry.term) === normalizeDisplayValue(termFilter) &&
      subjectNamesMatch(entry.subject, subjectName)
    );

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

  const getReportRemark = (score: number) => {
    if (score >= 80) return "A";
    if (score >= 75) return "P";
    if (score >= 70) return "AP";
    if (score >= 50) return "D";
    return "B";
  };

  const getGradeFromScore = (score: number) => {
    if (score >= 80) return 1;
    if (score >= 75) return 2;
    if (score >= 70) return 3;
    if (score >= 50) return 4;
    return 5;
  };

  const selectedStudents = studentFilter ? [studentFilter] : studentsInClass;

  const rows = useMemo(() => {
    return selectedStudents.map((studentName) => {
      const weeklyScore = getWeeklyTestScore(studentName);
      const midtermScore = getMidtermScore(studentName);
      const groupWorkScore = Number(getSbaValue(studentName, "groupWorkScore"));
      const projectWorkScore = Number(getSbaValue(studentName, "projectWorkScore"));
      const examScore = Number(getSbaValue(studentName, "examScore"));
      const total60 = Number((weeklyScore + midtermScore + groupWorkScore + projectWorkScore).toFixed(2));
      const subtotalA = Number(((total60 / 60) * 50).toFixed(2));
      const subtotalB = Number((examScore * 0.5).toFixed(2));
      const totalAplusB = Number((subtotalA + subtotalB).toFixed(2));

      const midtermRecord = midterms.find((m) =>
        m.classId === classFilter &&
        normalizeDisplayValue(m.studentName) === normalizeDisplayValue(studentName) &&
        normalizeDisplayValue(m.academicYear) === normalizeDisplayValue(yearFilter) &&
        normalizeDisplayValue(m.term) === normalizeDisplayValue(termFilter) &&
        subjectNamesMatch(m.subject, subjectFilter)
      );
      const isMidtermZeroOrMissing = !midtermRecord || midtermRecord.score <= 0;

      const isSbaIncomplete = weeklyScore === 0 || 
                              isMidtermZeroOrMissing || 
                              groupWorkScore === 0 || 
                              projectWorkScore === 0 ||
                              examScore === 0;

      const remark = isSbaIncomplete ? "IC" : getReportRemark(totalAplusB);

      return {
        studentName,
        weeklyScore,
        midtermScore,
        groupWorkScore,
        projectWorkScore,
        examScore,
        total60,
        subtotalA,
        subtotalB,
        totalAplusB,
        remark,
      };
    });
  }, [selectedStudents, weekLabel, classFilter, yearFilter, termFilter, subjectFilter, weeklyTests, midterms, sbaRecords]);

  const sortedRows = useMemo(() => {
    let lastScore: number | null = null;
    let lastPosition = 0;
    return [...rows]
      .sort((a, b) => b.totalAplusB - a.totalAplusB || a.studentName.localeCompare(b.studentName))
      .map((row, index) => {
        const position = row.totalAplusB === lastScore ? lastPosition : index + 1;
        lastScore = row.totalAplusB;
        lastPosition = position;
        return { ...row, position };
      });
  }, [rows]);

  const subjectLabel = subjectFilter || "Subject not selected";
  const className = classLookup[classFilter]?.name ?? classFilter;

  const handlePrintReportCards = () => {
    if (selectedStudents.length === 0) {
      alert("No students available for report cards.");
      return;
    }
    if (!yearFilter || !termFilter || !weekLabel) {
      alert("Select year, term, and week before printing report cards.");
      return;
    }

    const config = reportSettings.find(
      (s) => normalizeDisplayValue(s.academicYear) === normalizeDisplayValue(yearFilter) &&
             normalizeDisplayValue(s.term) === normalizeDisplayValue(termFilter)
    );
    const vacationDate = config?.vacationDate || "";
    const reopeningDate = config?.reopeningDate || "";

    const activeStudents = getActiveClassStudents(classFilter, yearFilter, termFilter, reports, weeklyTests, midterms, sbaRecords);
    const classRoll = activeStudents.length || 1;

    const isNursery = classFilter === "creche" || classFilter === "nursery-1" || classFilter === "nursery-2";
    if (isNursery) {
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
      }).join("\n");

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <base href="${typeof window !== 'undefined' ? window.location.origin : ''}/" />
  <title>Bulk Report Cards</title>
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
  ${sectionsHtml}
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

    const sectionsHtml = selectedStudents.map((studentName) => {
      const report = getStudentReportCardData(studentName);

      // Fetch report details
      const reportDoc = reports.find(
        r => normalizeDisplayValue(r.studentName) === normalizeDisplayValue(studentName) &&
             r.classId === classFilter &&
             normalizeDisplayValue(r.academicYear) === normalizeDisplayValue(yearFilter) &&
             normalizeDisplayValue(r.term) === normalizeDisplayValue(termFilter)
      );
      const sex = reportDoc?.sex || "";
      const conduct = reportDoc?.conduct || "";
      const attitude = reportDoc?.attitude || "";
      const interest = reportDoc?.interest || "";
      const commentText = reportDoc?.comment || "";

      // Fetch attendance
      let attRecord = termAttendanceRecords.find(
        a => normalizeDisplayValue(a.studentName) === normalizeDisplayValue(studentName) &&
             normalizeDisplayValue(a.classId) === normalizeDisplayValue(classFilter) &&
             normalizeDisplayValue(a.academicYear) === normalizeDisplayValue(yearFilter) &&
             normalizeDisplayValue(a.term) === normalizeDisplayValue(termFilter)
      );
      if (!attRecord) {
        attRecord = termAttendanceRecords.find(
          a => normalizeDisplayValue(a.studentName) === normalizeDisplayValue(studentName) &&
               normalizeDisplayValue(a.academicYear) === normalizeDisplayValue(yearFilter) &&
               normalizeDisplayValue(a.term) === normalizeDisplayValue(termFilter)
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
        const grade = getGradeFromScore(row.total);
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

      return `
        <div class="page">
          <!-- DEBUG ATTENDANCE:
            Student: ${studentName} (normalized: ${normalizeDisplayValue(studentName)})
            ClassFilter: ${classFilter} (normalized: ${normalizeDisplayValue(classFilter)})
            YearFilter: ${yearFilter} (normalized: ${normalizeDisplayValue(yearFilter)})
            TermFilter: ${termFilter} (normalized: ${normalizeDisplayValue(termFilter)})
            Record found: ${attRecord ? JSON.stringify(attRecord) : "NONE"}
            All records count: ${termAttendanceRecords.length}
            All records detail: ${JSON.stringify(termAttendanceRecords)}
          -->
          <div style="border: 1.5px solid #000; padding: 8px 10px; width: 100%; box-sizing: border-box;">
            <!-- Header layout with Logo, School details, and Photo slot -->
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

            <!-- Student Profile Section -->
            <div style="margin-top: 6px; border: 1.5px solid #000;">
              <div style="background: #cbd5e1; padding: 6px 15px; text-align: left; font-weight: 800; font-size: 12.5px; font-family:'Segoe UI', Arial, sans-serif;">NAME OF STUDENT: ${studentName.toUpperCase()}</div>
              <div style="display: flex; justify-content: space-between; padding: 6px 15px; font-size: 11px; font-weight: 700;">
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <div>Sex: <span style="font-weight: 500; margin-left: 45px;">${sex.toUpperCase()}</span></div>
                  <div>CLASS: <span style="font-weight: 500; margin-left: 30px;">${className}</span></div>
                  <div>ATTENDANCE: <span style="font-weight: 500; margin-left: 5px;">${attendanceVal || "N/A"}</span></div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <div>Class Roll: <span style="font-weight: 500; margin-left: 20px;">${classRoll}</span></div>
                  <div>Term: <span style="font-weight: 500; margin-left: 40px;">${termFilter.replace(/\D/g, "") || termFilter}</span></div>
                  <div>Date: <span style="font-weight: 500; margin-left: 45px;">${vacationDate}</span></div>
                </div>
              </div>
            </div>

            <!-- Performance Table Section -->
            <table style="width:100%; border-collapse: collapse; margin-top: 6px; border: 1.5px solid #000;">
              <thead>
                <tr style="border: 1.5px solid #000; background: #f1f5f9;">
                  <th style="border: 1.5px solid #000; padding: 3.5px 5px; font-size: 10.5px; text-align: left; width: 25%;">Subject</th>
                  <th style="border: 1.5px solid #000; padding: 3.5px 5px; font-size: 10.5px; text-align: center; width: 12%;">Class Score (50%)</th>
                  <th style="border: 1.5px solid #000; padding: 3.5px 5px; font-size: 10.5px; text-align: center; width: 12%;">Exam Score (50%)</th>
                  <th style="border: 1.5px solid #000; padding: 3.5px 5px; font-size: 11px; text-align: center; width: 12%;">Total score</th>
                  <th style="border: 1.5px solid #000; padding: 3.5px 5px; font-size: 11px; text-align: center; width: 8%;">Grade</th>
                  <th style="border: 1.5px solid #000; padding: 3.5px 5px; font-size: 10.5px; text-align: center; width: 15%;">CLASS AVERAGE</th>
                  <th style="border: 1.5px solid #000; padding: 3.5px 5px; font-size: 10.5px; text-align: center; width: 16%;">Comment</th>
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

            <!-- Legend Table Section -->
            <table style="width:100%; border-collapse: collapse; margin-top: 4px; border: 1.5px solid #000;">
              <tr>
                <td rowspan="2" style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; font-weight: 800; text-align: center; width: 15%; background: #f1f5f9;">IF TOTAL SCORE</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 7.5px; text-align: center; font-weight: 700; width: 35%; background: #fff;">&gt;=80 - A , &gt;=75 - P , &gt;=70 - AP</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; font-weight: 800; text-align: center; background: #f8fafc; width: 8.3%;">A</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; font-weight: 800; text-align: center; background: #f8fafc; width: 8.3%;">P</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; font-weight: 800; text-align: center; background: #f8fafc; width: 8.3%;">AP</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; font-weight: 800; text-align: center; background: #f8fafc; width: 8.3%;">D</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; font-weight: 800; text-align: center; background: #f8fafc; width: 8.3%;">B</td>
                <td style="border: 1.5px solid #000; padding: 2px; font-size: 8.5px; font-weight: 800; text-align: center; background: #f8fafc; width: 8.3%;">IC</td>
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

            <!-- Graphical Representation Banner -->
            <div style="background: #cbd5e1; border: 1.5px solid #000; border-top: none; text-align: center; font-weight: 800; font-size: 10.5px; padding: 3px; letter-spacing: 0.5px; font-family:'Segoe UI', Arial, sans-serif; margin-top: 4px; color: #333;">GRAPHICAL REPRESENTATION OF RESULT BY TOTAL SCORE</div>
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
      `;
    }).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Admin Report Cards</title>
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
  ${sectionsHtml}
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=1100,height=800");
    if (!win) {
      alert("Pop-up blocked. Please allow pop-ups for this site.");
      return;
    }
    win.document.write(html);
    win.document.close();
  };

  const handleExport = () => {
    if (sortedRows.length === 0) {
      alert("No SBA records to export for the current filters.");
      return;
    }
    const exportData = sortedRows.map((row) => ({
      Class: className,
      Year: yearFilter,
      Term: termFilter,
      Subject: subjectFilter,
      Student: row.studentName,
      "Exam /100": row.examScore,
      "Subtotal B 50%": row.subtotalB,
      "Total A+B": row.totalAplusB,
      Remark: row.remark,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "SBA Report");
    XLSX.writeFile(workbook, `SBA_Report_${className.replace(/\s+/g, "_")}_${subjectLabel.replace(/\s+/g, "_")}_${termFilter.replace(/\s+/g, "_")}_${yearFilter.replace("/", "-")}.xlsx`);
  };

  const handlePrintStudentSbaSheets = () => {
    if (selectedStudents.length === 0) {
      alert("No students selected/available for printing.");
      return;
    }
    if (!yearFilter || !termFilter) {
      alert("Select year and term before printing SBA breakdown sheets.");
      return;
    }

    const activeStudents = getActiveClassStudents(classFilter, yearFilter, termFilter, reports, weeklyTests, midterms, sbaRecords);
    const classRoll = activeStudents.length || 1;

    const sectionsHtml = selectedStudents.map((studentName) => {
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

      return `
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
              <td style="padding: 4px; font-size: 11px; font-weight: 700; width: 50%; border: 1.5px solid #000; text-align: right;">Term: <span style="font-weight: 500;">${termFilter}</span></td>
            </tr>
            <tr>
              <td style="padding: 4px; font-size: 11px; font-weight: 700; border: 1.5px solid #000; text-align: left;">Academic Year: <span style="font-weight: 500;">${yearFilter}</span></td>
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
      `;
    }).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Student SBA Sheets</title>
  <style>
    @page { size: portrait; margin: 8mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 10px; color: #0f172a; background: #fff; }
    .page { page-break-after: always; max-width: 800px; margin: 0 auto; height: 100%; box-sizing: border-box; }
    .page:last-child { page-break-after: avoid; }
    .report-container { border: 2px solid #000; padding: 12px; height: 100%; display: flex; flex-direction: column; background: #fff; position: relative; }
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
  ${sectionsHtml}
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

  const handlePrintClassPerformanceRanking = () => {
    if (studentsInClass.length === 0) {
      alert("No students available for performance ranking in this class.");
      return;
    }

    const performanceData = studentsInClass.map((studentName) => {
      const subjects = getStudentReportSubjects(studentName);
      const subjectReports = subjects.map((subjectName) => getStudentSubjectReport(studentName, subjectName));
      
      const totalMarks = Number(subjectReports.reduce((sum, row) => sum + (row.total || 0), 0).toFixed(2));
      const averageScore = subjects.length ? Number((totalMarks / subjects.length).toFixed(2)) : 0;
      const overallRemark = getReportRemark(averageScore);

      return {
        studentName,
        subjectsCount: subjects.length,
        totalMarks,
        averageScore,
        overallRemark,
      };
    });

    performanceData.sort((a, b) => b.totalMarks - a.totalMarks || a.studentName.localeCompare(b.studentName));

    let lastScore: number | null = null;
    let lastPosition = 0;
    const rankedData = performanceData.map((item, index) => {
      const position = item.totalMarks === lastScore ? lastPosition : index + 1;
      lastScore = item.totalMarks;
      lastPosition = position;

      const getOrdinal = (n: number) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };

      return {
        ...item,
        positionRank: getOrdinal(position),
        rawPosition: position,
      };
    });

    const className = classLookup[classFilter]?.name || classFilter;

    const rowsHtml = rankedData
      .map(
        (row) => `
      <tr>
        <td style="text-align: center; font-weight: bold; color: #b45309; background: #fffbebf5;">${row.positionRank}</td>
        <td style="font-weight: 600; color: #0f172a;">${row.studentName}</td>
        <td style="text-align: center;">${row.subjectsCount}</td>
        <td style="text-align: right; font-weight: bold; color: #1e293b;">${row.totalMarks.toFixed(2)}</td>
        <td style="text-align: right; font-weight: bold; color: #0369a1;">${row.averageScore.toFixed(2)}%</td>
        <td style="text-align: center; font-weight: 600;">${row.overallRemark}</td>
      </tr>
    `
      )
      .join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Class Performance Ranking - ${className}</title>
  <style>
    @page { size: portrait; margin: 12mm; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; padding: 20px; color: #0f172a; background: #fff; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; }
    .header h1 { margin: 0 0 6px 0; font-size: 24px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
    .header h2 { margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #d97706; }
    .meta-bar { display: flex; justify-content: space-between; font-size: 12px; color: #475569; margin-top: 8px; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th { background: #f8fafc; color: #334155; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; padding: 10px 12px; border: 1px solid #cbd5e1; }
    td { border: 1px solid #cbd5e1; padding: 9px 12px; vertical-align: middle; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .summary-box { margin-top: 20px; padding: 12px 16px; background: #f1f5f9; border-radius: 8px; font-size: 12px; color: #334155; display: flex; justify-content: space-between; }
    .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    @media print { body { margin: 0; padding: 10px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>CLASS PERFORMANCE RANKING REPORT</h1>
    <h2>${className}</h2>
    <div class="meta-bar">
      <span><strong>Academic Year:</strong> ${yearFilter}</span>
      <span><strong>Term:</strong> ${termFilter}</span>
      <span><strong>Total Class Roll:</strong> ${rankedData.length} Students</span>
      <span><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 10%;">Position</th>
        <th style="width: 35%; text-align: left;">Student Name</th>
        <th style="width: 12%;">Subjects</th>
        <th style="width: 15%; text-align: right;">Total Score</th>
        <th style="width: 13%; text-align: right;">Average (%)</th>
        <th style="width: 15%;">Performance Remark</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="summary-box">
    <span><strong>Top Performer:</strong> ${rankedData[0]?.studentName || "N/A"} (${rankedData[0]?.totalMarks || 0} pts)</span>
    <span><strong>Class Average:</strong> ${(rankedData.reduce((acc, curr) => acc + curr.averageScore, 0) / (rankedData.length || 1)).toFixed(2)}%</span>
  </div>

  <div class="footer">
    Report generated automatically by Teacher-Student Report System
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=1000,height=750");
    if (!win) {
      alert("Pop-up blocked. Please allow pop-ups for this site.");
      return;
    }
    win.document.write(html);
    win.document.close();
  };

  const handlePrint = () => {
    if (!subjectFilter || !weekLabel) {
      alert("Select class, subject, term and week before printing the SBA report.");
      return;
    }
    if (sortedRows.length === 0) {
      alert("No SBA rows available to print for the current filters.");
      return;
    }

    const printRows = sortSbaRowsByStudentName(sortedRows);
    const rowsHtml = printRows.map((row) => `
      <tr>
        <td>${row.studentName}</td>
        <td>${row.weeklyScore.toFixed(2)}</td>
        <td>${row.midtermScore.toFixed(2)}</td>
        <td>${row.groupWorkScore.toFixed(2)}</td>
        <td>${row.projectWorkScore.toFixed(2)}</td>
        <td>${row.total60.toFixed(2)}</td>
        <td>${row.subtotalA.toFixed(2)}</td>
        <td>${row.examScore.toFixed(2)}</td>
        <td>${row.subtotalB.toFixed(2)}</td>
        <td>${row.totalAplusB.toFixed(2)}</td>
        <td>${row.position}</td>
        <td>${row.remark}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SBA Report</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #0f172a; background: #fff; }
    .header { text-align: center; margin-bottom: 24px; }
    .header h1 { margin-bottom: 6px; font-size: 26px; }
    .header p { margin: 0; color: #475569; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 12px; }
    th { background: #f8fafc; color: #0f172a; font-weight: 700; }
    td { color: #0f172a; }
    .footer { margin-top: 24px; font-size: 12px; color: #64748b; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>SBA Report</h1>
    <p>Class: ${className} | Year: ${yearFilter} | Term: ${termFilter} | Subject: ${subjectFilter} | Weekly Test: ${weekLabel}</p>
    <p>Test 1 (Weekly Test) + Test 2 (Midterm /20) + Group Work /10 + Project Work /10 | Total /60 | Subtotal A 50% + Exam /100 | Subtotal B 50%</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Student</th>
        <th>Test 1</th>
        <th>Test 2</th>
        <th>Group</th>
        <th>Project</th>
        <th>Total /60</th>
        <th>Subtotal A</th>
        <th>Exam /100</th>
        <th>Subtotal B</th>
        <th>Total A+B</th>
        <th>Position</th>
        <th>Remark</th>
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
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Class</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring"
            >
              {SCHOOL_CLASSES.map((schoolClass) => (
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
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Subject</label>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring"
            >
              <option value="">-- Select Subject --</option>
              {availableSubjects.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Week</label>
            <select
              value={weekLabel}
              onChange={(e) => setWeekLabel(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring"
            >
              <option value="">-- Select Week --</option>
              {weekOptions.map((week) => (
                <option key={week} value={week}>{week}</option>
              ))}
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
          <div className="flex flex-wrap items-end gap-3">
            <button
              onClick={handlePrintClassPerformanceRanking}
              className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-md transition hover:brightness-110 flex items-center justify-center gap-1.5"
              title="Print ranking of all students in this class based on total accumulated scores"
            >
              <Award className="h-4 w-4" />
              Print Class Ranking
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110"
            >
              Print SBA
            </button>
            <button
              onClick={handlePrintReportCards}
              className="flex-1 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110"
            >
              Print Report Cards
            </button>
            <button
              onClick={handleExport}
              className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110"
            >
              Export Excel
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 overflow-x-auto">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-white">{className} SBA Summary</h4>
            <p className="text-xs text-slate-400">{subjectFilter ? `${subjectFilter} • ${yearFilter} • ${termFilter}` : "Select a subject to view SBA values."}</p>
          </div>
          <span className="text-xs text-slate-400">{sortedRows.length} student(s) shown</span>
        </div>

        {sortedRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-4 py-10 text-center text-slate-500">
            No SBA rows found for the selected class, year, term, subject and week.
          </div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Test 1</th>
                <th className="px-3 py-2">Test 2</th>
                <th className="px-3 py-2">Group</th>
                <th className="px-3 py-2">Project</th>
                <th className="px-3 py-2">Total /60</th>
                <th className="px-3 py-2">Subtotal A</th>
                <th className="px-3 py-2">Exam</th>
                <th className="px-3 py-2">Subtotal B</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedRows.map((row) => (
                <tr key={row.studentName} className="hover:bg-white/5">
                  <td className="px-3 py-2 text-xs text-slate-400">{row.position}</td>
                  <td className="px-3 py-2 font-medium text-white">{row.studentName}</td>
                  <td className="px-3 py-2">{row.weeklyScore.toFixed(2)}</td>
                  <td className="px-3 py-2">{row.midtermScore.toFixed(2)}</td>
                  <td className="px-3 py-2">{row.groupWorkScore.toFixed(2)}</td>
                  <td className="px-3 py-2">{row.projectWorkScore.toFixed(2)}</td>
                  <td className="px-3 py-2">{row.total60.toFixed(2)}</td>
                  <td className="px-3 py-2">{row.subtotalA.toFixed(2)}</td>
                  <td className="px-3 py-2">{row.examScore.toFixed(2)}</td>
                  <td className="px-3 py-2">{row.subtotalB.toFixed(2)}</td>
                  <td className="px-3 py-2">{row.totalAplusB.toFixed(2)}</td>
                  <td className="px-3 py-2">{row.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>


    </div>
  );
}


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
  const availableClasses = SCHOOL_CLASSES.filter(c => c.id === "creche" || c.id === "nursery-1" || c.id === "nursery-2");
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
        standardizeTerm(report.term) === standardizeTerm(termFilter)
      ) {
        addStudent(report.studentName);
      }
    });

    nurseryChecklists.forEach((record) => {
      if (
        (record.classId === classFilter || normalizeDisplayValue(record.classId) === normalizeDisplayValue(classFilter)) &&
        normalizeDisplayValue(record.academicYear) === normalizeDisplayValue(yearFilter) &&
        standardizeTerm(record.term) === standardizeTerm(termFilter)
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
        standardizeTerm(s.term) === standardizeTerm(termFilter)
    ) || { reopeningDate: "", vacationDate: "" };

    const reopeningDate = config.reopeningDate || "";
    const vacationDate = config.vacationDate || "";

    // Count distinct students in attendance or reports for roll
    const activeStudents = Array.from(new Set([
      ...reports.filter(r => (r.classId === classFilter || normalizeDisplayValue(r.classId) === normalizeDisplayValue(classFilter)) && normalizeDisplayValue(r.academicYear) === normalizeDisplayValue(yearFilter) && standardizeTerm(r.term) === standardizeTerm(termFilter)).map(r => r.studentName),
      ...termAttendanceRecords.filter(t => (t.classId === classFilter || normalizeDisplayValue(t.classId) === normalizeDisplayValue(classFilter)) && normalizeDisplayValue(t.academicYear) === normalizeDisplayValue(yearFilter) && standardizeTerm(t.term) === standardizeTerm(termFilter)).map(t => t.studentName),
      ...nurseryChecklists.filter(c => (c.classId === classFilter || normalizeDisplayValue(c.classId) === normalizeDisplayValue(classFilter)) && normalizeDisplayValue(c.academicYear) === normalizeDisplayValue(yearFilter) && standardizeTerm(c.term) === standardizeTerm(termFilter)).map(c => c.studentName)
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
    }).join("\n");

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<base href="${typeof window !== 'undefined' ? window.location.origin : ''}/" />
<title>Bulk Report Cards</title>
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
${sectionsHtml}
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

type AdminMidtermReportProps = {
  midterms: Midterm[];
  teacherAccounts: TeacherAccount[];
  classLookup: Record<string, ClassRoom>;
};

function AdminMidtermReport({ midterms, teacherAccounts: _tas, classLookup }: AdminMidtermReportProps) {
  const [yearFilter, setYearFilter] = useState("2024/2025");
  const [termFilter, setTermFilter] = useState("Term 3");
  const [classFilter, setClassFilter] = useState(SCHOOL_CLASSES[0]?.id ?? "basic-1");

  const filtered = useMemo(() => midterms.filter(m => {
    return m.academicYear === yearFilter && m.term === termFilter && m.classId === classFilter;
  }), [midterms, yearFilter, termFilter, classFilter]);

  const subjects = useMemo(() => Array.from(new Set(filtered.map(m => m.subject))).sort(), [filtered]);
  const students = useMemo(() => Array.from(new Set(filtered.map(m => m.studentName))).sort((a, b) => a.localeCompare(b)), [filtered]);

  const scoreMap = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    filtered.forEach(m => {
      const studentMap = map.get(m.studentName) ?? new Map<string, number>();
      studentMap.set(m.subject, m.score);
      map.set(m.studentName, studentMap);
    });
    return map;
  }, [filtered]);

  const studentRows = useMemo(() => {
    const rows = students.map((studentName) => {
      const scores = subjects.map(subject => scoreMap.get(studentName)?.get(subject) ?? 0);
      const total = scores.reduce((sum, score) => sum + score, 0);
      return { studentName, scores, total };
    });

    const sortedRows = [...rows].sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.studentName.localeCompare(b.studentName);
    });

    let lastTotal: number | null = null;
    let lastPosition = 0;
    return sortedRows.map((row, index) => {
      const position = row.total === lastTotal ? lastPosition : index + 1;
      lastTotal = row.total;
      lastPosition = position;
      return { ...row, position };
    });
  }, [students, subjects, scoreMap]);

  const subjectAverages = useMemo(() => {
    const studentCount = students.length || 1;
    return subjects.map(subject => {
      const total = students.reduce((sum, studentName) => sum + (scoreMap.get(studentName)?.get(subject) ?? 0), 0);
      return Number((total / studentCount).toFixed(1));
    });
  }, [subjects, students, scoreMap]);

  const className = classLookup[classFilter]?.name ?? classFilter;

  const handleExport = () => {
    if (studentRows.length === 0) { alert("No data to export."); return; }
    const headerRow = ["Name", ...subjects, "Total", "Position"];
    const averageRow = ["Class Average", ...subjectAverages.map(avg => avg.toFixed(1)), "", ""];
    const sheetRows = [headerRow, averageRow, ...studentRows.map(row => [row.studentName, ...row.scores.map(score => score.toFixed(1)), row.total.toFixed(1), row.position.toString()])];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Class Midterm Report");
    XLSX.writeFile(workbook, `Midterm_Class_Report_${className.replace(/\s+/g, "_")}_${termFilter.replace(" ","")}_${yearFilter.replace("/","-")}.xlsx`);
  };

  const handlePrint = (mode: "print" | "pdf") => {
    if (studentRows.length === 0) { alert("No records to print."); return; }
    const studentRowsHtml = studentRows.map(row => `
      <tr>
        <td class="name">${row.studentName}</td>
        ${row.scores.map(score => `<td class="score">${score.toFixed(1)}</td>`).join("")}
        <td class="total">${row.total.toFixed(1)}</td>
        <td class="position">${row.position}</td>
      </tr>`
    ).join("");

    const headerHtml = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:16px;">
        <img src="/ybs.png" alt="YB School logo" style="max-height:100px; width:auto; object-fit:contain;" />
        <div style="flex:1; text-align:center;">
          <div style="font-size:24px; font-weight:700;">YERIEL BRACHA SCHOOL</div>
          <div style="font-size:12px;">P. O. BOX DT 2962, Adenta - Accra</div>
          <div style="font-size:12px;">Motto : Head Heart Hand</div>
          <div style="font-size:14px; font-weight:600; margin-top:8px;">3RD TERM SAT RESULTS</div>
          <div style="font-size:13px; margin-top:10px;">Class: ${className} | Academic Year: ${yearFilter} | Term: ${termFilter}</div>
        </div>
      </div>`;

    const averageRowHtml = `
      <tr>
        <td style=\"font-weight:700;\">Class Average</td>
        ${subjectAverages.map(avg => `<td style=\"text-align:right; font-weight:700;\">${avg.toFixed(1)}</td>`).join("")}
        <td style=\"text-align:right; font-weight:700;\">-</td>
        <td style=\"text-align:right; font-weight:700;\">-</td>
      </tr>`;

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${className} Midterm Report</title><style>
      body { font-family: Segoe UI, Arial, sans-serif; margin: 8mm; color: #000; font-size: 14px; }
      @page { size: landscape; margin: 8mm; }
      h1, h2, h3 { margin: 0; }
      .report-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
      .report-table th, .report-table td { border: 1px solid #444; padding: 4px 6px; color: #000; font-weight: 400; }
      .report-table th { background: none; white-space: nowrap; }
      .report-table td.name { font-weight: 700; }
      .report-table td.total { font-weight: 700; text-align: center; }
      .report-table td.position { text-align: center; }
      .report-table td.score, .report-table th.score { text-align: center; }
      .report-table th.subject, .report-table td.subject { max-width: 60px; }
      @media print {
        body { margin: 6mm; color: #000 !important; }
        .report-table td.name, .report-table th.name { font-weight: 700 !important; }
        .report-table td.total, .report-table th.total { font-weight: 700 !important; text-align: center !important; }
        .report-table td.score, .report-table th.score, .report-table td.position, .report-table th.position { text-align: center !important; }
        .no-print { display: none; }
      }
    </style></head><body>
      ${headerHtml}
      <table class="report-table">
        <thead>
          <tr>
            <th class="name">Name</th>
            ${subjects.map(subject => `<th class="subject score" title="${subject}">${SUBJECT_PRINT_LABELS[subject] ?? subject}</th>`).join("")}
            <th class="total">Total</th>
            <th class="position">Position</th>
          </tr>
        </thead>
        <tbody>
          ${averageRowHtml}
          ${studentRowsHtml}
        </tbody>
      </table>
      <script>window.onload = () => { window.print(); };</script>
    </body></html>`;

    const win = window.open("", "_blank", "width=1000,height=800");
    if (!win) { alert("Pop-up blocked. Please allow pop-ups for this site."); return; }
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-3 mb-3">
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="rounded-xl p-2 bg-slate-950/60">
          <option>2024/2025</option>
          <option>2025/2026</option>
          <option>2026/2027</option>
        </select>
        <select value={termFilter} onChange={e => setTermFilter(e.target.value)} className="rounded-xl p-2 bg-slate-950/60">
          <option>Term 1</option>
          <option>Term 2</option>
          <option>Term 3</option>
        </select>
        <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="rounded-xl p-2 bg-slate-950/60">
          {SCHOOL_CLASSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={handleExport} className="rounded-xl bg-amber-500 px-4 py-2">Export Excel</button>
        <button onClick={() => handlePrint("print")} className="rounded-xl bg-emerald-500 px-4 py-2">Print</button>
        <button onClick={() => handlePrint("pdf")} className="rounded-xl bg-sky-500 px-4 py-2">Save as PDF</button>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 p-3 overflow-x-auto">
        {studentRows.length === 0 ? (
          <div className="text-center py-10 text-slate-500">No midterm records found for this class, term, and year.</div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs text-slate-400 uppercase">
              <tr>
                <th className="pb-2">Name</th>
                {subjects.map(subject => <th key={subject} className="pb-2">{subject}</th>)}
                <th className="pb-2">Total</th>
                <th className="pb-2">Position</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/10">
                <td className="font-semibold">Class Average</td>
                {subjectAverages.map((avg, idx) => <td key={idx} className="font-semibold text-right">{avg.toFixed(1)}</td>)}
                <td className="font-semibold text-right">-</td>
                <td className="font-semibold text-right">-</td>
              </tr>
              {studentRows.map(row => (
                <tr key={row.studentName} className="border-b border-white/10">
                  <td>{row.studentName}</td>
                  {row.scores.map((score, idx) => <td key={idx} className="text-right">{score.toFixed(1)}</td>)}
                  <td className="text-right font-medium">{row.total.toFixed(1)}</td>
                  <td className="text-right">{row.position}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AttendancePanel({
  schoolClassId,
  activeTeacher,
  termAttendanceRecords,
  reports,
  weeklyTests,
  midterms,
  sbaRecords,
  submitTermAttendance,
}: any) {
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
  const [totalPossible, setTotalPossible] = useState<number | "">("");
  const [attendanceMap, setAttendanceMap] = useState<Record<string, number | "">>({});

  const students = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r: any) => { if (r.classId === schoolClassId && r.studentName) set.add(r.studentName); });
    weeklyTests.forEach((t: any) => { if (t.classId === schoolClassId && t.studentName) set.add(t.studentName); });
    midterms.forEach((m: any) => { if (m.classId === schoolClassId && m.studentName) set.add(m.studentName); });
    sbaRecords.forEach((s: any) => { if (s.classId === schoolClassId && s.studentName) set.add(s.studentName); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [reports, weeklyTests, midterms, sbaRecords, schoolClassId]);

  useEffect(() => {
    const map: Record<string, number | ""> = {};
    let tp: number | "" = "";
    students.forEach((s) => { map[s] = ""; });
    
    termAttendanceRecords.forEach((record: any) => {
      if (
        record.classId === schoolClassId &&
        record.academicYear === academicYear &&
        record.term === term
      ) {
        map[record.studentName] = record.totalAttendance;
        if (record.totalPossible) tp = record.totalPossible;
      }
    });
    setAttendanceMap(map);
    if (tp !== "") setTotalPossible(tp);
  }, [termAttendanceRecords, schoolClassId, academicYear, term, students]);

  const handleAttendanceChange = (studentName: string, value: string) => {
    const parsed = value === "" ? "" : parseInt(value, 10);
    setAttendanceMap((prev) => ({ ...prev, [studentName]: parsed }));
  };

  const handleSave = async () => {
    if (!activeTeacher) return;
    if (totalPossible === "" || totalPossible <= 0) {
      alert("Please enter a valid Total Possible Attendance for the term.");
      return;
    }

    const promises = students.map((studentName) => {
      const att = attendanceMap[studentName];
      if (att === "" || att < 0) return null;
      
      const id = normalizeDisplayValue(studentName) + "-" + normalizeDisplayValue(term) + "-" + normalizeDisplayValue(academicYear) + "-" + schoolClassId;
      return submitTermAttendance({
        id,
        teacherId: activeTeacher.id,
        classId: schoolClassId,
        academicYear,
        term,
        studentName,
        totalAttendance: Number(att),
        totalPossible: Number(totalPossible),
      });
    }).filter(Boolean);

    await Promise.all(promises);
    alert("Term Attendance saved.");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="flex flex-col">
          <span className="mb-1 text-sm text-slate-400">Academic Year</span>
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">
            <option value="2023/2024">2023/2024</option>
            <option value="2024/2025">2024/2025</option>
            <option value="2025/2026">2025/2026</option>
          </select>
        </label>
        <label className="flex flex-col">
          <span className="mb-1 text-sm text-slate-400">Term</span>
          <select value={term} onChange={(e) => setTerm(e.target.value)} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
        </label>
        <label className="flex flex-col">
          <span className="mb-1 text-sm text-slate-400">Total Possible Attendance</span>
          <input type="number" min="1" value={totalPossible} onChange={(e) => setTotalPossible(e.target.value === "" ? "" : parseInt(e.target.value, 10))} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white" placeholder="e.g. 60" />
        </label>
      </div>

      {students.length === 0 ? (
        <div className="text-sm text-slate-400">No students found for this class.</div>
      ) : (
        <div className="space-y-2">
          {students.map((student) => (
            <div key={student} className="flex flex-col gap-2 rounded-xl border border-white/5 bg-slate-950/40 p-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-medium text-slate-200">{student}</span>
              <input type="number" min="0" max={totalPossible || 100} value={attendanceMap[student] ?? ""} onChange={(e) => handleAttendanceChange(student, e.target.value)} className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3.5 py-2.5 text-sm font-semibold text-white sm:w-40 outline-none focus:ring-2 focus:ring-amber-500 transition" placeholder="Days Attended" />
            </div>
          ))}
        </div>
      )}

      <div>
        <button onClick={handleSave} className="rounded-xl bg-amber-500 px-4 py-2 font-semibold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400">Save Attendance</button>
      </div>
    </div>
  );
}

function saveSession(role: "admin" | "teacher" | "principal", userData: any = null) {
  const session = {
    role,
    userData,
    lastActive: Date.now(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function updateLastActive() {
  const stored = localStorage.getItem(SESSION_KEY);
  if (stored) {
    try {
      const session = JSON.parse(stored);
      session.lastActive = Date.now();
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {}
  }
}

function getValidSession() {
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return null;

  try {
    const session = JSON.parse(stored);
    if (!session || !session.role || !session.lastActive) return null;
    const isExpired = Date.now() - session.lastActive > SESSION_TIMEOUT_MS;
    if (isExpired) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function readStorage<T>(key: string, defaultValue: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return defaultValue;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}


function getNurseryReportCardHtml(
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
  let record = nurseryChecklists.find((c: NurseryChecklistRecord) =>
    isStudentNameMatch(c.studentName, studentName) &&
    (c.classId === schoolClassId || normalizeDisplayValue(c.classId) === normalizeDisplayValue(schoolClassId)) &&
    normalizeDisplayValue(c.academicYear) === normalizeDisplayValue(academicYear) &&
    standardizeTerm(c.term) === standardizeTerm(term)
  );
  if (!record) {
    record = nurseryChecklists.find((c: NurseryChecklistRecord) =>
      isStudentNameMatch(c.studentName, studentName) &&
      normalizeDisplayValue(c.academicYear) === normalizeDisplayValue(academicYear) &&
      standardizeTerm(c.term) === standardizeTerm(term)
    );
  }
  if (!record) {
    record = nurseryChecklists.find((c: NurseryChecklistRecord) =>
      isStudentNameMatch(c.studentName, studentName) &&
      normalizeDisplayValue(c.academicYear) === normalizeDisplayValue(academicYear)
    );
  }
  if (!record) {
    record = nurseryChecklists.find((c: NurseryChecklistRecord) =>
      isStudentNameMatch(c.studentName, studentName)
    );
  }

  let report = reports.find((r: CommentReport) =>
    isStudentNameMatch(r.studentName, studentName) &&
    (r.classId === schoolClassId || normalizeDisplayValue(r.classId) === normalizeDisplayValue(schoolClassId)) &&
    normalizeDisplayValue(r.academicYear) === normalizeDisplayValue(academicYear) &&
    standardizeTerm(r.term) === standardizeTerm(term)
  );
  if (!report) {
    report = reports.find((r: CommentReport) =>
      isStudentNameMatch(r.studentName, studentName) &&
      normalizeDisplayValue(r.academicYear) === normalizeDisplayValue(academicYear) &&
      standardizeTerm(r.term) === standardizeTerm(term)
    );
  }
  if (!report) {
    report = reports.find((r: CommentReport) =>
      isStudentNameMatch(r.studentName, studentName) &&
      normalizeDisplayValue(r.academicYear) === normalizeDisplayValue(academicYear)
    );
  }
  if (!report) {
    report = reports.find((r: CommentReport) =>
      isStudentNameMatch(r.studentName, studentName)
    );
  }

  const matchedStudentReports = reports.filter((r) => isStudentNameMatch(r.studentName, studentName));
  const conductVal = report?.conduct || matchedStudentReports.find((r) => r.conduct?.trim())?.conduct || "";
  const attitudeVal = report?.attitude || matchedStudentReports.find((r) => r.attitude?.trim())?.attitude || "";
  const interestVal = report?.interest || matchedStudentReports.find((r) => r.interest?.trim())?.interest || "";
  const sex = report?.sex || matchedStudentReports.find((r) => r.sex?.trim())?.sex || "";
  const commentText = report?.comment || matchedStudentReports.find((r) => r.comment?.trim())?.comment || "";

  let attRecord = termAttendanceRecords.find(
    a => isStudentNameMatch(a.studentName, studentName) &&
         (a.classId === schoolClassId || normalizeDisplayValue(a.classId) === normalizeDisplayValue(schoolClassId)) &&
         normalizeDisplayValue(a.academicYear) === normalizeDisplayValue(academicYear) &&
         standardizeTerm(a.term) === standardizeTerm(term)
  );
  if (!attRecord) {
    attRecord = termAttendanceRecords.find(
      a => isStudentNameMatch(a.studentName, studentName) &&
           normalizeDisplayValue(a.academicYear) === normalizeDisplayValue(academicYear) &&
           standardizeTerm(a.term) === standardizeTerm(term)
    );
  }
  if (!attRecord) {
    attRecord = termAttendanceRecords.find(
      a => isStudentNameMatch(a.studentName, studentName)
    );
  }

  const attendanceVal = attRecord
    ? (attRecord.totalPossible ? `${attRecord.totalAttendance} / ${attRecord.totalPossible}` : `${attRecord.totalAttendance}`)
    : "";

  const className = SCHOOL_CLASSES.find(c => c.id === schoolClassId)?.name || schoolClassId;

  const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/ybs.png` : '/ybs.png';

  const renderChecklistRows = (startIdx: number, endIdx: number) => {
    let lastCategory = "";
    return NURSERY_QUESTIONS.slice(startIdx, endIdx + 1).map((q) => {
      let categoryHeader = "";
      if (q.category !== lastCategory) {
        lastCategory = q.category;
        categoryHeader = `
          <tr style="background: #cbd5e1; page-break-after: avoid;">
            <td colspan="2" style="border: 1.5px solid #000; padding: 3px 6px; text-transform: uppercase; font-weight: 500; font-size: 15.5px; background: #cbd5e1; color: #0f172a;">${q.category}</td>
          </tr>
        `;
      }
      return `${categoryHeader}
        <tr style="page-break-inside: avoid;">
          <td style="border: 1.5px solid #000; padding: 3px 6px; font-size: 15.5px; font-weight: 400;">${q.text}</td>
          <td style="border: 1.5px solid #000; padding: 3px; text-align: center; font-weight: 400; font-size: 15.5px;">${record?.ratings?.[q.id] || ""}</td>
        </tr>
      `;
    }).join("");
  };

  return `
    <div class="report-card-container" style="box-sizing: border-box;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 6px;">
        <div style="width: 95px; display: flex; align-items: center; justify-content: center;">
          <img src="${logoUrl}" alt="YBS Logo" style="width: 85px; height: 85px; object-fit: contain;" />
        </div>
        <div style="flex: 1; text-align: center;">
          <div style="font-size:24px; font-weight:800; font-family:'Outfit', 'Segoe UI', Arial, sans-serif; letter-spacing: 0.5px; line-height: 1.1;">YERIEL BRACHA SCHOOL</div>
          <div style="font-size:13px; font-weight:600; margin-top:2px;">P. O. BOX DT 2962, Adenta- Accra</div>
          <div style="font-size:13px; font-weight:600;">Tel: 026668550</div>
          <div style="font-size:13px; font-style:italic; font-weight:600; margin-top:2px;">Motto : Head Heart Hand</div>
          <div style="font-size:18px; font-weight:800; margin-top:4px; letter-spacing: 1px; text-decoration: underline;">STUDENT TERMINAL REPORT</div>
        </div>
        <div style="width: 95px; display: flex; align-items: center; justify-content: center;">
          <div style="width: 80px; height: 95px; border: 1.5px solid #000; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 400; color: #475569; background: #fff;">Photo</div>
        </div>
      </div>

      <!-- Info Table (Personal Details) -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px; border: 1.5px solid #000; font-size: 16px;">
        <tr>
          <td colspan="2" style="border: 1.5px solid #000; padding: 4px 6px; font-weight: 500;">NAME: <span style="font-weight: 400;">${studentName.toUpperCase()}</span></td>
          <td colspan="2" style="border: 1.5px solid #000; padding: 4px 6px; font-weight: 500;">CLASS: <span style="font-weight: 400;">${className.toUpperCase()}</span></td>
        </tr>
        <tr>
          <td style="border: 1.5px solid #000; padding: 4px 6px; font-weight: 500; width: 25%;">TERM: <span style="font-weight: 400;">${term.toUpperCase()}</span></td>
          <td style="border: 1.5px solid #000; padding: 4px 6px; font-weight: 500; width: 25%;">SEX: <span style="font-weight: 400;">${sex.toUpperCase()}</span></td>
          <td style="border: 1.5px solid #000; padding: 4px 6px; font-weight: 500; width: 25%;">CLASS ROLL: <span style="font-weight: 400;">${classRoll}</span></td>
        </tr>
        <tr>
          <td style="border: 1.5px solid #000; padding: 4px 6px; font-weight: 500;">ACADEMIC YEAR: <span style="font-weight: 400;">${academicYear}</span></td>
          <td style="border: 1.5px solid #000; padding: 4px 6px; font-weight: 500;">ATTENDANCE: <span style="font-weight: 400;">${attendanceVal || ""}</span></td>
          <td colspan="2" style="border: 1.5px solid #000; padding: 4px 6px; font-weight: 500;">DATE: <span style="font-weight: 400;">${vacationDate || ""}</span></td>
        </tr>
      </table>

      <!-- Legend Box -->
      <div class="legend-box" style="width: 100%; border: 1.5px solid #000; background: #f8fafc; padding: 3px; font-size: 15px; font-weight: 500; text-align: center; margin-bottom: 6px; box-sizing: border-box;">
        RATING SCALE: &nbsp; &nbsp; Y = YES &nbsp; | &nbsp; P/S = PARTIAL/SOMETIMES &nbsp; | &nbsp; NES = NEEDS EFFORT AND SPECIAL ATTENTION
      </div>

      <!-- Checklist Table -->
      <table class="checklist-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 15.5px; box-sizing: border-box;">
        <thead>
          <tr style="background: #f1f5f9; border-bottom: 1.5px solid #000; page-break-after: avoid;">
            <th style="border: 1.5px solid #000; padding: 4px 6px; text-align: left; width: 85%; font-size: 16px; font-weight: 500;">DEVELOPMENTAL MILESTONES / INDICATORS</th>
            <th style="border: 1.5px solid #000; padding: 4px; text-align: center; width: 15%; font-size: 16px; font-weight: 500;">RATING</th>
          </tr>
        </thead>
        <tbody>
          ${renderChecklistRows(0, 51)}
        </tbody>
      </table>

      <!-- Phonics and Numbers Table -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 8px; border: 1.5px solid #000; font-size: 15.5px; page-break-inside: avoid;">
        <tr style="background: #f1f5f9;">
          <td style="border: 1.5px solid #000; padding: 4px 6px; font-weight: 500; width: 40%; text-transform: uppercase; font-size: 16px;">Literacy & Numeral Recognition Details</td>
          <td style="border: 1.5px solid #000; padding: 4px 6px; font-weight: 500; text-align: center; width: 60%; font-size: 16px;">DETAILS</td>
        </tr>
        <tr>
          <td style="border: 1.5px solid #000; padding: 4px 6px; font-weight: 500; font-size: 15.5px;">Which phonic sounds can he or she recognize and sound correctly?</td>
          <td style="border: 1.5px solid #000; padding: 4px 6px; text-align: center; font-size: 15.5px; font-weight: 400; word-wrap: break-word;">${record?.phonicsText || ""}</td>
        </tr>
        <tr>
          <td style="border: 1.5px solid #000; padding: 4px 6px; font-weight: 500; font-size: 15.5px;">Which number can he or she recognize?</td>
          <td style="border: 1.5px solid #000; padding: 4px 6px; text-align: center; font-size: 15.5px; font-weight: 400; word-wrap: break-word;">${record?.numbersText || ""}</td>
        </tr>
      </table>

      <!-- Remarks Table -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 12px; border: 1.5px solid #000; font-size: 16px; page-break-inside: avoid;">
        <tr style="background: #f1f5f9;">
          <td style="border: 1.5px solid #000; padding: 4px 6px; font-weight: 500; text-transform: uppercase; font-size: 16px;">TEACHER'S GENERAL REMARK</td>
        </tr>
        <tr>
          <td style="border: 1.5px solid #000; padding: 6px; line-height: 1.35; font-size: 16px; font-weight: 400; background: #fff; min-height: 40px;">
            ${commentText ? `<div>${commentText}</div>` : `<div style="color: #64748b;">No comment report submitted yet.</div>`}
          </td>
        </tr>
      </table>

      <!-- Conduct, Attitude & Interest Table -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 8px; border: 1.5px solid #000; font-size: 16px; background: #fff; page-break-inside: avoid;">
        <tr style="background: #f1f5f9;">
          <td style="border: 1.5px solid #000; padding: 4px 6px; font-weight: 500; text-align: center; width: 33.33%; font-size: 16px;">Conduct</td>
          <td style="border: 1.5px solid #000; padding: 4px 6px; font-weight: 500; text-align: center; width: 33.33%; font-size: 16px;">Attitude</td>
          <td style="border: 1.5px solid #000; padding: 4px 6px; font-weight: 500; text-align: center; width: 33.34%; font-size: 16px;">Interest</td>
        </tr>
        <tr>
          <td style="border: 1.5px solid #000; padding: 5px 6px; font-weight: 400; text-align: center; font-size: 16px;">${conductVal ? conductVal.toUpperCase() : "—"}</td>
          <td style="border: 1.5px solid #000; padding: 5px 6px; font-weight: 400; text-align: center; font-size: 16px;">${attitudeVal ? attitudeVal.toUpperCase() : "—"}</td>
          <td style="border: 1.5px solid #000; padding: 5px 6px; font-weight: 400; text-align: center; font-size: 16px;">${interestVal ? interestVal.toUpperCase() : "—"}</td>
        </tr>
      </table>

      <!-- Footer/Signatures Table -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 8px; border: 1.5px solid #000; font-size: 16px; background: #fff; page-break-inside: avoid;">
        <tr>
          <td style="border: 1.5px solid #000; padding: 8px; width: 60%; height: 40px; vertical-align: bottom;">
            <div style="display: flex; align-items: flex-end; justify-content: space-between;">
              <span style="font-weight: 500; font-size: 16px;">Supervisor's Signature:</span>
              <div style="border-bottom: 1.5px dashed #000; width: 180px; height: 1px; margin-bottom: 2px;"></div>
            </div>
          </td>
          <td style="border: 1.5px solid #000; padding: 5px 8px; width: 40%; text-align: center; background: #f8fafc; font-weight: 500; vertical-align: middle;">
            <div style="font-size: 13px; color: #475569; font-weight: 500;">NEXT TERM BEGINS:</div>
            <div style="font-weight: 400; font-size: 16px; margin-top: 2px; border: 1.5px solid #000; padding: 3px; background: #fff;">${reopeningDate || ""}</div>
          </td>
        </tr>
      </table>
    </div>`;
};

type PromoteStudentsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  reports: CommentReport[];
  weeklyTests: WeeklyTest[];
  midterms: Midterm[];
  sbaRecords: SBARecord[];
  nurseryChecklists: NurseryChecklistRecord[];
  termAttendanceRecords: TermAttendanceRecord[];
};

function PromoteStudentsModal({
  isOpen, onClose, reports, weeklyTests, midterms, sbaRecords, nurseryChecklists, termAttendanceRecords
}: PromoteStudentsModalProps) {
  const [sourceYear, setSourceYear] = useState("2024/2025");
  const [sourceTerm, setSourceTerm] = useState("Term 3");
  const [sourceClass, setSourceClass] = useState("basic-1");

  const [destYear, setDestYear] = useState("2025/2026");
  const [destTerm, setDestTerm] = useState("Term 1");
  const [destClass, setDestClass] = useState("basic-2");

  const [students, setStudents] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isPromoting, setIsPromoting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const active = getActiveClassStudents(sourceClass, sourceYear, sourceTerm, reports, weeklyTests, midterms, sbaRecords, nurseryChecklists, termAttendanceRecords);
      setStudents(active);
      setSelectedStudents(new Set(active));
    }
  }, [sourceClass, sourceYear, sourceTerm, isOpen, reports, weeklyTests, midterms, sbaRecords, nurseryChecklists, termAttendanceRecords]);

  const toggleStudent = (name: string) => {
    const next = new Set(selectedStudents);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedStudents(next);
  };

  const handlePromote = async () => {
    if (selectedStudents.size === 0) {
      alert("No students selected.");
      return;
    }
    const destClassName = SCHOOL_CLASSES.find(c => c.id === destClass)?.name || destClass;
    if (!confirm(`Promote ${selectedStudents.size} students to ${destClassName} (${destYear} ${destTerm})?`)) return;

    setIsPromoting(true);
    try {
      const batch = writeBatch(db);
      selectedStudents.forEach((studentName) => {
        const id = `${destClass}_${destYear.replace(/\//g, "-")}_${destTerm.replace(/\s+/g, "-")}_${normalizeDisplayValue(studentName)}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const docRef = doc(collection(db, "term_attendance_v1"), id);
        batch.set(docRef, {
          id,
          teacherId: "admin",
          classId: destClass,
          academicYear: destYear,
          term: destTerm,
          studentName,
          totalAttendance: 0,
          totalPossible: 0,
          submittedAt: new Date().toISOString(),
        });
      });
      await batch.commit();
      alert("Students promoted successfully!");
      onClose();
    } catch (e: any) {
      console.error(e);
      alert("Error promoting students: " + e.message);
    } finally {
      setIsPromoting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl rounded-3xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3 text-emerald-400">
            <Users className="h-6 w-6" />
            <h2 className="text-xl font-bold text-white">Promote Students</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Source</h3>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Academic Year</label>
                <select value={sourceYear} onChange={e => setSourceYear(e.target.value)} className="w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-2.5 text-white outline-none focus:border-emerald-500">
                  {["2023/2024", "2024/2025", "2025/2026", "2026/2027", "2027/2028"].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Term</label>
                <select value={sourceTerm} onChange={e => setSourceTerm(e.target.value)} className="w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-2.5 text-white outline-none focus:border-emerald-500">
                  {["Term 1", "Term 2", "Term 3", "1st Term", "2nd Term", "3rd Term"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Class</label>
                <select value={sourceClass} onChange={e => setSourceClass(e.target.value)} className="w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-2.5 text-white outline-none focus:border-emerald-500">
                  {SCHOOL_CLASSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Destination</h3>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Academic Year</label>
                <select value={destYear} onChange={e => setDestYear(e.target.value)} className="w-full rounded-xl bg-slate-800 border border-emerald-500/30 px-4 py-2.5 text-white outline-none focus:border-emerald-500">
                  {["2024/2025", "2025/2026", "2026/2027", "2027/2028"].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Term</label>
                <select value={destTerm} onChange={e => setDestTerm(e.target.value)} className="w-full rounded-xl bg-slate-800 border border-emerald-500/30 px-4 py-2.5 text-white outline-none focus:border-emerald-500">
                  {["Term 1", "Term 2", "Term 3", "1st Term", "2nd Term", "3rd Term"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Class</label>
                <select value={destClass} onChange={e => setDestClass(e.target.value)} className="w-full rounded-xl bg-slate-800 border border-emerald-500/30 px-4 py-2.5 text-white outline-none focus:border-emerald-500">
                  {SCHOOL_CLASSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-300">Students to Promote ({selectedStudents.size}/{students.length})</h3>
              <div className="space-x-4 text-xs">
                <button onClick={() => setSelectedStudents(new Set(students))} className="text-emerald-400 hover:text-emerald-300">Select All</button>
                <button onClick={() => setSelectedStudents(new Set())} className="text-slate-400 hover:text-slate-300">Deselect All</button>
              </div>
            </div>
            
            {students.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-800/50 rounded-2xl border border-white/5">
                No students found in the source class for the selected year and term.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {students.map(student => (
                  <label key={student} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/80 border border-white/5 hover:border-white/20 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={selectedStudents.has(student)} 
                      onChange={() => toggleStudent(student)}
                      className="w-5 h-5 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 bg-slate-900"
                    />
                    <span className="text-sm text-slate-200 truncate">{student}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-white/10 bg-slate-900/50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">Cancel</button>
          <button 
            onClick={handlePromote} 
            disabled={isPromoting || selectedStudents.size === 0}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-500/20"
          >
            {isPromoting ? "Promoting..." : `Promote ${selectedStudents.size} Students`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [teacherAccounts, setTeacherAccounts] = useState<TeacherAccount[]>([]);
  const [reports, setReports] = useState<CommentReport[]>([]);
  const [weeklyTests, setWeeklyTests] = useState<WeeklyTest[]>([]);
  const [nurseryChecklists, setNurseryChecklists] = useState<NurseryChecklistRecord[]>([]);
  const [isMigrating, setIsMigrating] = useState(false);

  const initialSession = getValidSession();
  const [role, setRole] = useState<"admin" | "teacher" | "principal" | null>(initialSession ? initialSession.role : null);
  const [activeTeacher, setActiveTeacher] = useState<TeacherAccount | null>(
    initialSession && initialSession.role === "teacher" && initialSession.userData 
      ? initialSession.userData 
      : null
  );
  const [authError, setAuthError] = useState("");

  const [adminForm, setAdminForm] = useState({ username: "", password: "", showPassword: false });
  const [principalForm, setPrincipalForm] = useState({ username: "", password: "", showPassword: false });
  const [teacherForm, setTeacherForm] = useState({ username: "", password: "", showPassword: false });
  const [teacherPasswordForm, setTeacherPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    showPasswords: false,
  });
  const [passwordChangeError, setPasswordChangeError] = useState("");
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);

  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherClasses, setNewTeacherClasses] = useState<string[]>([]);
  const [newTeacherPermissions, setNewTeacherPermissions] = useState<Record<string, string[]>>({});
  const [createdAccount, setCreatedAccount] = useState<TeacherAccount | null>(null);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editClassIds, setEditClassIds] = useState<string[]>([]);
  const [editPermissions, setEditPermissions] = useState<Record<string, string[]>>({});
  const [isEditingSaving, setIsEditingSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const [expandedClass, setExpandedClass] = useState<string | null>(SCHOOL_CLASSES[0].id);
  const [expandedYear, setExpandedYear] = useState<string | null>(null);
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [teacherActiveTab, setTeacherActiveTab] = useState<string>("comments");
  const [teacherViewMode, setTeacherViewMode] = useState<"cards" | "workspace">("cards");
  const [teacherClassFilter, setTeacherClassFilter] = useState<string>(() => {
    if (initialSession?.role === "teacher" && initialSession.userData) {
      return initialSession.userData.classIds[0] ?? "all";
    }
    return "all";
  });

  const isNurseryClass = activeTeacher ? (
    teacherClassFilter === "all"
      ? (activeTeacher.classIds[0] === "creche" || activeTeacher.classIds[0] === "nursery-1" || activeTeacher.classIds[0] === "nursery-2")
      : (teacherClassFilter === "creche" || teacherClassFilter === "nursery-1" || teacherClassFilter === "nursery-2")
  ) : false;

  const teacherTabs = isNurseryClass
    ? [
        { id: "checklist", label: "Checklist", icon: "📋" },
        { id: "comments", label: "Comments", icon: "💬" },
        { id: "attendance", label: "Attendance", icon: "📅" },
        { id: "weekly-report", label: "Report", icon: "📋" },
      ]
    : [
        { id: "comments", label: "Comments", icon: "💬" },
        { id: "weekly-tests", label: "Weekly Tests", icon: "📊" },
        { id: "midterms", label: "Midterm Exam", icon: "🧾" },
        { id: "project-work", label: "Project", icon: "🧱" },
        { id: "group-work", label: "Group", icon: "👥" },
        { id: "exam", label: "Exam", icon: "📝" },
        { id: "sba", label: "SBA", icon: "🧩" },
        { id: "attendance", label: "Attendance", icon: "📅" },
        { id: "weekly-report", label: "Report", icon: "📋" },
        { id: "analytics", label: "Analytics", icon: "📈" },
      ];

  useEffect(() => {
    const validTabIds = isNurseryClass
      ? ["checklist", "comments", "attendance", "weekly-report"]
      : ["comments", "weekly-tests", "midterms", "project-work", "group-work", "exam", "sba", "attendance", "weekly-report", "analytics"];
    if (!validTabIds.includes(teacherActiveTab)) {
      setTeacherActiveTab(isNurseryClass ? "checklist" : "comments");
    }
  }, [teacherClassFilter, isNurseryClass]);
  const [analyticsSelectedStudent, setAnalyticsSelectedStudent] = useState<string>("");
  const [adminActiveTab, setAdminActiveTab] = useState<"accounts" | "weekly-report" | "midterm-report" | "sba-report" | "sba-nc-report" | "data-editor" | "report-settings">("accounts");
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [adminViewMode, setAdminViewMode] = useState<"cards" | "workspace">("cards");
  const [showPasswordChangeForm, setShowPasswordChangeForm] = useState(false);
  const [principalEditingId, setPrincipalEditingId] = useState<string | null>(null);
  const [principalEditStudentName, setPrincipalEditStudentName] = useState("");
  const [principalEditCommentText, setPrincipalEditCommentText] = useState("");
  const [isAdminActionLoading, setIsAdminActionLoading] = useState(false);
  const [adminActionError, setAdminActionError] = useState("");
  const [portalRestriction, setPortalRestriction] = useState<"teacher" | "principal" | null>(() => 
    initialSession ? (localStorage.getItem("school-portal-restriction") as any) : "teacher"
  );
  const [dbStatus, setDbStatus] = useState<"connecting" | "connected" | "error" | "unauthenticated">("connecting");
  const [dbErrorMessage, setDbErrorMessage] = useState("");
  const [isTeachersLoaded, setIsTeachersLoaded] = useState(false);
  const [midterms, setMidterms] = useState<Midterm[]>([]);
  const [sbaRecords, setSbaRecords] = useState<SBARecord[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [termAttendanceRecords, setTermAttendanceRecords] = useState<TermAttendanceRecord[]>([]);
  const [reportSettings, setReportSettings] = useState<ReportSettingsRecord[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Authenticate with Firebase Anonymously to satisfy security rules
  useEffect(() => {
    signInAnonymously(auth).then(() => {
      setDbStatus("connected");
    }).catch((error) => {
      console.error("Firebase Anonymous Auth Error:", error);
      setDbStatus("unauthenticated");
      setDbErrorMessage("Failed to authenticate with Cloud. Check if Anonymous Auth is enabled.");
    });
  }, []);

  // Firestore Sync
  useEffect(() => {
    if (dbStatus !== "connected") return;

    const qTeachers = query(collection(db, "teachers"));
    const unsubTeachers = onSnapshot(qTeachers, 
      (snapshot) => {
        const teachers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherAccount));
        setTeacherAccounts(teachers);
        setIsTeachersLoaded(true);
      },
      (error) => {
        console.error("Teachers listener error:", error);
        setDbStatus("error");
        setDbErrorMessage(error.message);
      }
    );

    const qReports = query(collection(db, "reports"));
    const unsubReports = onSnapshot(qReports, 
      (snapshot) => {
        const allReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommentReport));
        setReports(allReports);
      },
      (error) => {
        console.error("Reports listener error:", error);
        setDbStatus("error");
        setDbErrorMessage(error.message);
      }
    );

    const qWeeklyTests = query(collection(db, "weekly_reports_v1"));
    const unsubWeeklyTests = onSnapshot(qWeeklyTests,
      (snapshot) => {
        setWeeklyTests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WeeklyTest)));
      },
      (error) => { 
        console.error("WeeklyTests listener error:", error); 
        alert(`Failed to load weekly tests: ${error.message}`);
      }
    );

    const qMidterms = query(collection(db, "midterms_v1"));
    const unsubMidterms = onSnapshot(qMidterms,
      (snapshot) => {
        setMidterms(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Midterm)));
      },
      (error) => {
        console.error("Midterms listener error:", error);
      }
    );

    const qSbaRecords = query(collection(db, "sba_records_v1"));
    const unsubSbaRecords = onSnapshot(qSbaRecords,
      (snapshot) => {
        setSbaRecords(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SBARecord)));
      },
      (error) => {
        console.error("SBA records listener error:", error);
      }
    );

    const qAttendance = query(collection(db, "attendance_v1"));
    const unsubAttendance = onSnapshot(qAttendance,
      (snapshot) => {
        setAttendanceRecords(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
      },
      (error) => {
        console.error("Attendance listener error:", error);
      }
    );

    const qTermAttendance = query(collection(db, "term_attendance_v1"));
    const unsubTermAttendance = onSnapshot(qTermAttendance,
      (snapshot) => {
        setTermAttendanceRecords(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TermAttendanceRecord)));
      },
      (error) => {
        console.error("Term Attendance listener error:", error);
      }
    );

    const qReportSettings = query(collection(db, "report_settings_v1"));
    const unsubReportSettings = onSnapshot(qReportSettings,
      (snapshot) => {
        setReportSettings(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ReportSettingsRecord)));
      },
      (error) => {
        console.error("Report Settings listener error:", error);
      }
    );

    const qNursery = query(collection(db, "nursery_checklist_v1"));
    const unsubNursery = onSnapshot(qNursery,
      (snapshot) => {
        setNurseryChecklists(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as NurseryChecklistRecord)));
      },
      (error) => {
        console.error("Nursery checklist listener error:", error);
      }
    );

    return () => {
      unsubTeachers();
      unsubReports();
      unsubWeeklyTests();
      unsubMidterms();
      unsubSbaRecords();
      unsubAttendance();
      unsubTermAttendance();
      unsubReportSettings();
      unsubNursery();
    };
  }, [dbStatus]);

  // Listen for cross-tab localStorage signals to refresh reports immediately
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "reports-last-updated") {
        const raw = localStorage.getItem(REPORTS_STORAGE_KEY);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as CommentReport[];
            setReports(parsed);
          } catch {}
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // One-time Migration from LocalStorage to Firestore
  useEffect(() => {
    async function migrate() {
      const localTeachers = readStorage<TeacherAccount[]>(TEACHERS_STORAGE_KEY, []);
      const localReports = readStorage<CommentReport[]>(REPORTS_STORAGE_KEY, []);

      if ((localTeachers.length > 0 || localReports.length > 0) && !isMigrating) {
        setIsMigrating(true);
        const batch = writeBatch(db);

        // Check if data already exists in Firestore before migrating
        const teacherSnapshot = await getDocs(collection(db, "teachers"));
        const reportSnapshot = await getDocs(collection(db, "reports"));

        if (teacherSnapshot.empty && localTeachers.length > 0) {
          localTeachers.forEach(teacher => {
            const tRef = doc(db, "teachers", teacher.id);
            batch.set(tRef, teacher);
          });
        }

        if (reportSnapshot.empty && localReports.length > 0) {
          localReports.forEach(report => {
            const rRef = doc(db, "reports", report.id);
            batch.set(rRef, report);
          });
        }

        try {
          await batch.commit();
          // Clear local storage after successful migration to prevent double migration
          localStorage.removeItem(TEACHERS_STORAGE_KEY);
          localStorage.removeItem(REPORTS_STORAGE_KEY);
        } catch (error) {
          console.error("Migration failed:", error);
        } finally {
          setIsMigrating(false);
        }
      }
    }
    migrate();
  }, []);

  // Update session lastActive on any activity to enforce 8hr inactivity timeout
  useEffect(() => {
    if (role) {
      updateLastActive();
    }
  }, [role, reports, teacherAccounts]);

  const classLookup = useMemo(() => {
    return Object.fromEntries(SCHOOL_CLASSES.map((item) => [item.id, item]));
  }, []);

  const groupedForPrincipal = useMemo(() => {
    return SCHOOL_CLASSES.map((schoolClass) => {
      const classReports = reports.filter((entry) => entry.classId === schoolClass.id);
      
      // Group by Year -> Term -> Student
      const yearBuckets = new Map<string, Map<string, Map<string, CommentReport[]>>>();
      
      classReports.forEach((report) => {
        const year = report.academicYear || "Unknown Year";
        const term = report.term || "Unknown Term";
        const student = report.studentName;

        if (!yearBuckets.has(year)) yearBuckets.set(year, new Map());
        const termMap = yearBuckets.get(year)!;
        
        if (!termMap.has(term)) termMap.set(term, new Map());
        const studentMap = termMap.get(term)!;
        
        if (!studentMap.has(student)) studentMap.set(student, []);
        studentMap.get(student)!.push(report);
      });

      const yearsWithContent = Array.from(yearBuckets.entries()).map(([yearName, terms]) => ({
        yearName,
        terms: Array.from(terms.entries()).map(([termName, students]) => ({
          termName,
          students: Array.from(students.entries()).map(([student, stReports]) => ({
            student,
            comments: stReports
          })).sort((a,b) => a.student.localeCompare(b.student))
        })).sort((a,b) => a.termName.localeCompare(b.termName))
      })).sort((a,b) => b.yearName.localeCompare(a.yearName)); // Most recent year first

      return {
        ...schoolClass,
        years: yearsWithContent,
        studentCount: new Set(classReports.map(r => r.studentName)).size
      };
    });
  }, [reports]);

  const resetSession = () => {
    setRole(null);
    setActiveTeacher(null);
    setAuthError("");
    setTeacherForm({ username: "", password: "", showPassword: false });
    setAdminForm({ username: "", password: "", showPassword: false });
    setPrincipalForm({ username: "", password: "", showPassword: false });
    setPasswordChangeError("");
    setPasswordChangeSuccess(false);
    setTeacherPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      showPasswords: false,
    });
    localStorage.removeItem(SESSION_KEY);
    clearPortalRestriction();
  };

  const handleRoleLogin = (nextRole: "admin" | "teacher" | "principal") => {
    setAuthError("");

    if (nextRole === "admin") {
      if (adminForm.username === ADMIN_USERNAME && adminForm.password === ADMIN_PASSWORD) {
        setRole("admin");
        saveSession("admin");
        clearPortalRestriction();
        return;
      }
      setAuthError("Invalid admin credentials.");
      return;
    }

    if (nextRole === "principal") {
      if (
        principalForm.username === PRINCIPAL_USERNAME &&
        principalForm.password === PRINCIPAL_PASSWORD
      ) {
        setRole("principal");
        saveSession("principal");
        setPortalRestriction("principal");
        localStorage.setItem("school-portal-restriction", "principal");
        return;
      }
      setAuthError("Invalid principal credentials.");
      return;
    }

    const foundTeacher = teacherAccounts.find(
      (teacher) =>
        teacher.username === teacherForm.username.trim() && teacher.password === teacherForm.password
    );

    if (!foundTeacher) {
      setAuthError("Teacher credentials not found. Ask admin to generate your account.");
      return;
    }

    setActiveTeacher(foundTeacher);
    setRole("teacher");
    saveSession("teacher", foundTeacher);
    setPortalRestriction("teacher");
    localStorage.setItem("school-portal-restriction", "teacher");
  };

  const clearPortalRestriction = () => {
    setPortalRestriction(null);
    localStorage.removeItem("school-portal-restriction");
  };

  const downloadClassExcel = (schoolClass: any) => {
    const allComments = (schoolClass.years || []).flatMap((year: any) => 
      (year.terms || []).flatMap((term: any) => 
        (term.students || []).flatMap((stBucket: any) => 
          (stBucket.comments || []).map((item: any) => ({
            "Student Name": stBucket.student,
            "Teacher": item.teacherName,
            "Academic Year": item.academicYear || "N/A",
            "Term": item.term || "N/A",
            "Comment": item.comment,
            "Submitted At": new Date(item.submittedAt).toLocaleString(),
            "Last Edited By": item.lastEditedBy || "N/A",
            "Last Edited At": item.lastEditedAt ? new Date(item.lastEditedAt).toLocaleString() : "N/A"
          }))
        )
      )
    );
 
    if (allComments.length === 0) {
      alert("No comments to export for this class.");
      return;
    }
 
    const worksheet = XLSX.utils.json_to_sheet(allComments);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reports");
    
    // Set column widths for better readability
    const wscols = [
      { wch: 20 }, // Student Name
      { wch: 20 }, // Teacher
      { wch: 15 }, // Academic Year
      { wch: 10 }, // Term
      { wch: 50 }, // Comment
      { wch: 20 }, // Submitted At
      { wch: 15 }, // Last Edited By
      { wch: 20 }  // Last Edited At
    ];
    worksheet["!cols"] = wscols;
 
    XLSX.writeFile(workbook, `${schoolClass.name.replace(/\s+/g, "_")}_Reports.xlsx`);
  };

  const toggleClassSelection = (classId: string) => {
    setNewTeacherClasses((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
    // If removing class, clear any pending subject selections for it
    setNewTeacherPermissions((prev) => {
      if (!prev[classId]) return prev;
      const copy = { ...prev };
      delete copy[classId];
      return copy;
    });
  };

  const toggleSubjectSelection = (classId: string, subjectId: string) => {
    setNewTeacherPermissions((prev) => {
      const current = prev[classId] ?? [];
      const next = current.includes(subjectId) ? current.filter(s => s !== subjectId) : [...current, subjectId];
      return { ...prev, [classId]: next };
    });
  };

  const createTeacherAccount = async () => {
    if (!newTeacherName.trim() || newTeacherClasses.length === 0) {
      return;
    }

    const firstClass = classLookup[newTeacherClasses[0]];
    const teacherId = crypto.randomUUID();
    const account: TeacherAccount = {
      id: teacherId,
      fullName: newTeacherName.trim(),
      username: firstClass.name,
      password: "000000",
      classIds: newTeacherClasses,
      permissions: Object.entries(newTeacherPermissions).map(([classId, subjectIds]) => ({ classId, subjectIds })),
    };

    setIsAdminActionLoading(true);
    setAdminActionError("");
    try {
      await setDoc(doc(db, "teachers", teacherId), account);
      setCreatedAccount(account);
      setNewTeacherName("");
      setNewTeacherClasses([]);
      setNewTeacherPermissions({});
    } catch (error: any) {
      console.error("Error creating teacher:", error);
      setAdminActionError(error.message || "Failed to create teacher account in Cloud.");
    } finally {
      setIsAdminActionLoading(false);
    }
  };

  const startEditTeacher = (teacher: TeacherAccount) => {
    setEditingTeacherId(teacher.id);
    setEditFullName(teacher.fullName);
    setEditUsername(teacher.username);
    setEditClassIds(teacher.classIds ?? []);
    const perms: Record<string, string[]> = {};
    (teacher.permissions ?? []).forEach(p => { perms[p.classId] = p.subjectIds.slice(); });
    setEditPermissions(perms);
    setEditError("");
  };

  const cancelEdit = () => {
    setEditingTeacherId(null);
    setEditFullName("");
    setEditUsername("");
    setEditClassIds([]);
    setEditPermissions({});
    setEditError("");
  };

  const toggleEditClass = (classId: string) => {
    setEditClassIds(prev => prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]);
    setEditPermissions(prev => {
      if (prev[classId]) {
        const copy = { ...prev };
        delete copy[classId];
        return copy;
      }
      return prev;
    });
  };

  const toggleEditSubject = (classId: string, subjectId: string) => {
    setEditPermissions(prev => {
      const current = prev[classId] ?? [];
      const next = current.includes(subjectId) ? current.filter(s => s !== subjectId) : [...current, subjectId];
      return { ...prev, [classId]: next };
    });
  };

  const saveEditTeacher = async () => {
    if (!editingTeacherId) return;
    if (!editFullName.trim() || !editUsername.trim() || editClassIds.length === 0) {
      setEditError('Enter full name, username and at least one class.');
      return;
    }
    setIsEditingSaving(true);
    setEditError("");
    try {
      const payload: Partial<TeacherAccount> = {
        fullName: editFullName.trim(),
        username: editUsername.trim(),
        classIds: editClassIds,
        permissions: Object.entries(editPermissions).map(([classId, subjectIds]) => ({ classId, subjectIds })),
      };
      await setDoc(doc(db, 'teachers', editingTeacherId), payload, { merge: true });
      setTeacherAccounts(prev => prev.map(t => t.id === editingTeacherId ? { ...t, ...payload } as TeacherAccount : t));
      cancelEdit();
    } catch (err: any) {
      console.error('Error updating teacher:', err);
      setEditError(err.message || 'Failed to update teacher');
    } finally {
      setIsEditingSaving(false);
    }
  };

  const submitComment = async (schoolClassId: string, studentName: string, academicYear: string, term: string, draftKey: string) => {
    if (!activeTeacher) {
      return;
    }

    const trimmedName = studentName.trim();
    const text = commentDrafts[draftKey]?.trim();
    const year = academicYear.trim();
    const selectedTerm = term.trim();
    if (!trimmedName || !text || !year || !selectedTerm) {
      return;
    }

    const reportId = crypto.randomUUID();
    const report: CommentReport = {
      id: reportId,
      teacherId: activeTeacher.id,
      teacherName: activeTeacher.fullName,
      classId: schoolClassId,
      studentName: trimmedName,
      comment: text,
      academicYear: year,
      term: selectedTerm,
      submittedAt: new Date().toISOString(),
      sex: (commentDrafts[`${draftKey}-sex`] as any) || "",
      conduct: commentDrafts[`${draftKey}-conduct`] || "",
      attitude: commentDrafts[`${draftKey}-attitude`] || "",
      interest: commentDrafts[`${draftKey}-interest`] || "",
    };

    try {
      await setDoc(doc(db, "reports", reportId), report);
      setCommentDrafts((prev) => ({ 
        ...prev, 
        [draftKey]: "", 
        [`${draftKey}-student`]: "",
        [`${draftKey}-year`]: "",
        [`${draftKey}-term`]: "",
        [`${draftKey}-sex`]: "",
        [`${draftKey}-conduct`]: "",
        [`${draftKey}-attitude`]: "",
        [`${draftKey}-interest`]: ""
      }));
    } catch (error) {
      console.error("Error submitting report:", error);
    }
  };

  const saveStudentTraits = async (
    studentName: string,
    classId: string,
    academicYear: string,
    term: string,
    traits: { conduct: string; attitude: string; interest: string }
  ) => {
    const existingReport = reports.find(
      (r) => r.studentName === studentName && r.classId === classId && r.academicYear === academicYear && r.term === term
    );
    if (existingReport) {
      await updateDoc(doc(db, "reports", existingReport.id), traits);
    } else {
      const newId = crypto.randomUUID();
      await setDoc(doc(db, "reports", newId), {
        id: newId,
        studentName,
        classId,
        academicYear,
        term,
        teacherId: "admin",
        teacherName: "Administrator",
        comment: "",
        submittedAt: new Date().toISOString(),
        ...traits
      });
    }
  };

  const cascadeStudentRename = async (classId: string, oldName: string, newName: string, excludeCommentId: string) => {
    if (oldName === newName) return;
    try {
      const batch = writeBatch(db);

      reports.filter(r => r.classId === classId && r.studentName === oldName && r.id !== excludeCommentId).forEach(r => {
        batch.update(doc(db, "reports", r.id), { studentName: newName });
      });

      weeklyTests.filter(t => t.classId === classId && t.studentName === oldName).forEach(t => {
        batch.update(doc(db, "weekly_reports_v1", t.id), { studentName: newName });
      });

      midterms.filter(m => m.classId === classId && m.studentName === oldName).forEach(m => {
        batch.update(doc(db, "midterm_records_v1", m.id), { studentName: newName });
      });

      sbaRecords.filter(s => s.classId === classId && s.studentName === oldName).forEach(s => {
        batch.update(doc(db, "sba_records_v1", s.id), { studentName: newName });
      });

      termAttendanceRecords.filter(a => a.classId === classId && a.studentName === oldName).forEach(a => {
        const newId = normalizeDisplayValue(newName) + "-" + normalizeDisplayValue(a.term) + "-" + normalizeDisplayValue(a.academicYear) + "-" + a.classId;
        batch.delete(doc(db, "term_attendance_v1", a.id));
        batch.set(doc(db, "term_attendance_v1", newId), { ...a, id: newId, studentName: newName });
      });

      attendanceRecords.filter(a => a.classId === classId && a.present?.includes(oldName)).forEach(a => {
        const newPresent = a.present.map((name: string) => name === oldName ? newName : name);
        batch.update(doc(db, "attendance_v1", a.id), { present: newPresent });
      });

      await batch.commit();
    } catch (err) {
      console.error("Cascade rename error:", err);
    }
  };

  const updateComment = async (
    commentId: string, 
    studentName: string, 
    commentText: string,
    sex?: string,
    conduct?: string,
    attitude?: string,
    interest?: string
  ) => {
    const report = reports.find(r => r.id === commentId);
    if (!report) return;

    const editRecord: EditRecord = {
      editedBy: "teacher",
      editorName: activeTeacher?.fullName ?? "Teacher",
      editedAt: new Date().toISOString(),
      previousStudentName: report.studentName,
      previousComment: report.comment,
    };

    const updatedData = {
      studentName: studentName.trim(),
      comment: commentText.trim(),
      sex: (sex || "") as "MALE" | "FEMALE" | "",
      conduct: conduct || "",
      attitude: attitude || "",
      interest: interest || "",
      lastEditedBy: "teacher" as const,
      lastEditedAt: new Date().toISOString(),
      editHistory: [...(report.editHistory ?? []), editRecord],
    };

    try {
      await setDoc(doc(db, "reports", commentId), updatedData, { merge: true });
      if (report.studentName !== updatedData.studentName) {
        await cascadeStudentRename(report.classId, report.studentName, updatedData.studentName, commentId);
      }
      setReports((prev) => {
        const next = prev.map((r) => r.id === commentId ? { ...r, ...updatedData } : r);
        try {
          localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(next));
          localStorage.setItem("reports-last-updated", Date.now().toString());
        } catch {}
        return next;
      });
    } catch (error) {
      console.error("Error updating report:", error);
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, "reports", commentId));
      setReports((prev) => prev.filter((r) => r.id !== commentId));
    } catch (error) {
      console.error("Error deleting report:", error);
    }
  };

  const deleteStudentCompletely = async (classId: string, studentName: string) => {
    const trimmedName = studentName.trim();
    if (!trimmedName) return;

    const confirmMessage = `WARNING: Are you sure you want to PERMANENTLY delete student "${trimmedName}" and ALL associated records?\n\nThis will purge:\n- Main report card comments\n- Weekly test history\n- Midterm exam records\n- SBA records\n- Attendance records\n- Nursery checklists\n\nThis action CANNOT be undone!`;
    if (!window.confirm(confirmMessage)) return;

    try {
      const batch = writeBatch(db);

      // 1. Reports
      reports.filter(r => r.classId === classId && r.studentName.trim() === trimmedName).forEach(r => {
        batch.delete(doc(db, "reports", r.id));
      });

      // 2. Weekly tests
      weeklyTests.filter(t => t.classId === classId && t.studentName.trim() === trimmedName).forEach(t => {
        batch.delete(doc(db, "weekly_reports_v1", t.id));
      });

      // 3. Midterm records
      midterms.filter(m => m.classId === classId && m.studentName.trim() === trimmedName).forEach(m => {
        batch.delete(doc(db, "midterms_v1", m.id));
      });

      // 4. SBA records
      sbaRecords.filter(s => s.classId === classId && s.studentName.trim() === trimmedName).forEach(s => {
        batch.delete(doc(db, "sba_records_v1", s.id));
      });

      // 5. Term attendance
      termAttendanceRecords.filter(a => a.classId === classId && a.studentName.trim() === trimmedName).forEach(a => {
        batch.delete(doc(db, "term_attendance_v1", a.id));
      });

      // 6. Attendance records (remove student from present array)
      attendanceRecords.filter(a => a.classId === classId && a.present?.includes(trimmedName)).forEach(a => {
        const newPresent = a.present.filter((name: string) => name !== trimmedName);
        batch.update(doc(db, "attendance_v1", a.id), { present: newPresent });
      });

      // 7. Nursery checklists
      nurseryChecklists.filter(c => c.studentName.trim() === trimmedName).forEach(c => {
        batch.delete(doc(db, "nursery_checklist_v1", c.id));
      });

      await batch.commit();

      // Update local states
      setReports((prev) => prev.filter((r) => !(r.classId === classId && r.studentName.trim() === trimmedName)));
      setWeeklyTests((prev) => prev.filter((t) => !(t.classId === classId && t.studentName.trim() === trimmedName)));
      setMidterms((prev) => prev.filter((m) => !(m.classId === classId && m.studentName.trim() === trimmedName)));
      setSbaRecords((prev) => prev.filter((s) => !(s.classId === classId && s.studentName.trim() === trimmedName)));
      setTermAttendanceRecords((prev) => prev.filter((a) => !(a.classId === classId && a.studentName.trim() === trimmedName)));
      setNurseryChecklists((prev) => prev.filter((c) => c.studentName.trim() !== trimmedName));

      alert(`Student "${trimmedName}" and all associated data have been permanently deleted.`);
    } catch (error: any) {
      console.error("Error deleting student completely:", error);
      alert("Failed to delete student: " + (error.message || "Unknown error"));
    }
  };

  const deleteWeeklyTest = async (id: string) => {
    try {
      await deleteDoc(doc(db, "weekly_reports_v1", id));
      setWeeklyTests((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error("Error deleting weekly test:", error);
    }
  };

  const updateWeeklyTest = async (id: string, score: number, maxScore: number) => {
    if (isNaN(score) || isNaN(maxScore) || maxScore <= 0) {
      alert("Please enter valid positive numbers for score and max score.");
      return;
    }
    const calculatedScore = Number(((score / maxScore) * 20).toFixed(2));
    try {
      await updateDoc(doc(db, "weekly_reports_v1", id), {
        score,
        maxScore,
        calculatedScore,
      });
      setWeeklyTests((prev) =>
        prev.map((t) => (t.id === id ? { ...t, score, maxScore, calculatedScore } : t))
      );
    } catch (error: any) {
      console.error("Error updating weekly test:", error);
      alert("Failed to update weekly test score: " + (error.message || "Unknown error"));
    }
  };

  const submitWeeklyTest = async (data: Omit<WeeklyTest, "id" | "submittedAt" | "calculatedScore">) => {
    const existing = weeklyTests.find(
      (t) =>
        t.classId === data.classId &&
        normalizeDisplayValue(t.studentName) === normalizeDisplayValue(data.studentName) &&
        normalizeDisplayValue(t.academicYear) === normalizeDisplayValue(data.academicYear) &&
        normalizeDisplayValue(t.term) === normalizeDisplayValue(data.term) &&
        normalizeDisplayValue(t.weekLabel) === normalizeDisplayValue(data.weekLabel) &&
        subjectNamesMatch(t.subject, data.subject)
    );
    const id = existing?.id ?? crypto.randomUUID();
    const normalizedData = {
      ...data,
      ...getTerm3WeeklyTestFields(data.weekLabel, data.subject, data.classId),
    };
    const calculatedScore = (normalizedData.score / normalizedData.maxScore) * 20;
    try {
      const submittedAt = existing?.submittedAt ?? new Date().toISOString();
      const payload = { 
        ...normalizedData, 
        id, 
        calculatedScore: Number(calculatedScore.toFixed(2)),
        submittedAt 
      };
      await setDoc(doc(db, "weekly_reports_v1", id), payload);
      setWeeklyTests((prev) => {
        return existing ? prev.map((t) => (t.id === id ? payload : t)) : [...prev, payload];
      });
    } catch (error: any) {
      console.error("Error submitting weekly test:", error);
      alert(`Submission failed: ${error.message || "Unknown error"}`);
    }
  };

  const submitMidterm = async (data: Omit<Midterm, "id" | "submittedAt" | "calculatedScore">) => {
    const existing = midterms.find(
      (m) =>
        m.classId === data.classId &&
        normalizeDisplayValue(m.studentName) === normalizeDisplayValue(data.studentName) &&
        normalizeDisplayValue(m.academicYear) === normalizeDisplayValue(data.academicYear) &&
        normalizeDisplayValue(m.term) === normalizeDisplayValue(data.term) &&
        subjectNamesMatch(m.subject, data.subject)
    );
    const id = existing?.id ?? crypto.randomUUID();
    try {
      const submittedAt = existing?.submittedAt ?? new Date().toISOString();
      const payload = {
        ...data,
        id,
        calculatedScore: Number(data.score.toFixed(2)),
        submittedAt,
      };
      await setDoc(doc(db, "midterms_v1", id), payload);
      setMidterms((prev) => {
        return existing ? prev.map((m) => (m.id === id ? payload : m)) : [...prev, payload];
      });
    } catch (error: any) {
      console.error("Error submitting midterm:", error);
      alert(`Midterm submission failed: ${error.message || "Unknown error"}`);
    }
  };

  const deleteMidterm = async (id: string) => {
    try {
      await deleteDoc(doc(db, "midterms_v1", id));
      setMidterms((prev) => prev.filter((m) => m.id !== id));
    } catch (error) {
      console.error("Error deleting midterm:", error);
    }
  };

  const submitSbaRecord = async (data: SBARecordInput) => {
    const id = data.id ?? crypto.randomUUID();
    try {
      await setDoc(doc(db, "sba_records_v1", id), {
        ...data,
        id,
        submittedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Error submitting SBA record:", error);
      alert(`SBA submission failed: ${error.message || "Unknown error"}`);
    }
  };

  const deleteSbaRecord = async (id: string) => {
    try {
      await deleteDoc(doc(db, "sba_records_v1", id));
    } catch (error) {
      console.error("Error deleting SBA record:", error);
    }
  };

  const submitTermAttendance = async (data: Omit<TermAttendanceRecord, "submittedAt">) => {
    try {
      await setDoc(doc(db, "term_attendance_v1", data.id), {
        ...data,
        submittedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error submitting term attendance:", error);
      alert("Failed to save term attendance.");
    }
  };

  const _submitAttendance = async (data: Omit<AttendanceRecord, "id" | "submittedAt">) => {
    const id = crypto.randomUUID();
    try {
      await setDoc(doc(db, "attendance_v1", id), {
        ...data,
        id,
        submittedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Error submitting attendance:", error);
      alert(`Attendance submission failed: ${error.message || "Unknown error"}`);
    }
  };

  const changeTeacherPassword = async (currentPassword: string, newPassword: string) => {
    if (!activeTeacher) {
      return false;
    }
    if (activeTeacher.password !== currentPassword) {
      setPasswordChangeError("Current password is incorrect.");
      return false;
    }
    if (newPassword.length < 4) {
      setPasswordChangeError("New password must be at least 4 characters.");
      return false;
    }

    try {
      await setDoc(doc(db, "teachers", activeTeacher.id), { password: newPassword }, { merge: true });
      setActiveTeacher((prev) => (prev ? { ...prev, password: newPassword } : null));
      setPasswordChangeError("");
      setPasswordChangeSuccess(true);
      setTimeout(() => {
        setTeacherPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
          showPasswords: false,
        });
      }, 0);
      return true;
    } catch (error) {
      console.error("Error changing password:", error);
      setPasswordChangeError("Failed to update password in cloud.");
      return false;
    }
  };

  const principalUpdateComment = async (
    commentId: string, 
    studentName: string, 
    commentText: string,
    sex?: string,
    conduct?: string,
    attitude?: string,
    interest?: string
  ) => {
    const report = reports.find(r => r.id === commentId);
    if (!report) return;

    const editRecord: EditRecord = {
      editedBy: "principal",
      editorName: "Principal",
      editedAt: new Date().toISOString(),
      previousStudentName: report.studentName,
      previousComment: report.comment,
    };

    const updatedData = {
      studentName: studentName.trim(),
      comment: commentText.trim(),
      sex: (sex || "") as "MALE" | "FEMALE" | "",
      conduct: conduct || "",
      attitude: attitude || "",
      interest: interest || "",
      lastEditedBy: "principal" as const,
      lastEditedAt: new Date().toISOString(),
      editHistory: [...(report.editHistory ?? []), editRecord],
    };

    try {
      await setDoc(doc(db, "reports", commentId), updatedData, { merge: true });
      if (report.studentName !== updatedData.studentName) {
        await cascadeStudentRename(report.classId, report.studentName, updatedData.studentName, commentId);
      }
      setReports((prev) => {
        const next = prev.map((r) => r.id === commentId ? { ...r, ...updatedData } : r);
        try {
          localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(next));
          localStorage.setItem("reports-last-updated", Date.now().toString());
        } catch {}
        return next;
      });
    } catch (error) {
      console.error("Error updating report (principal):", error);
    }
  };

  const handlePrincipalStartEdit = (report: CommentReport) => {
    setPrincipalEditingId(report.id);
    setPrincipalEditStudentName(report.studentName);
    setPrincipalEditCommentText(report.comment);
  };

  const handlePrincipalCancelEdit = () => {
    setPrincipalEditingId(null);
    setPrincipalEditStudentName("");
    setPrincipalEditCommentText("");
  };

  const handlePrincipalSaveEdit = () => {
    if (!principalEditingId || !principalEditStudentName.trim() || !principalEditCommentText.trim()) {
      return;
    }
    principalUpdateComment(principalEditingId, principalEditStudentName, principalEditCommentText);
    handlePrincipalCancelEdit();
  };

  const randomValue = (length: number) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const copyShareLink = async (targetRole: "teacher" | "principal", identifier: string, name: string) => {
    const token = randomValue(8);
    const url = new URL(window.location.href);
    url.searchParams.set("role", targetRole);
    url.searchParams.set("id", identifier);
    url.searchParams.set("token", token);

    const shareUrl = url.toString();
    const successMessage = `✅ Shareable link for ${name} copied to clipboard! Open it in a new browser to auto-login as that role.`;

    const fallbackCopy = () => {
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "0";
      textarea.style.width = "1px";
      textarea.style.height = "1px";
      textarea.style.padding = "0";
      textarea.style.border = "none";
      textarea.style.outline = "none";
      textarea.style.boxShadow = "none";
      textarea.style.background = "transparent";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      let copied = false;
      try {
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      }
      document.body.removeChild(textarea);
      if (copied) {
        alert(successMessage);
      } else {
        alert("Clipboard copy failed. Please copy the link manually:\n" + shareUrl);
      }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert(successMessage);
        return;
      } catch (error) {
        console.warn("Clipboard writeText failed, using fallback", error);
      }
    }

    fallbackCopy();
  };

  // Auto-login from shared link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareRole = params.get("role") as "teacher" | "principal" | null;
    const shareId = params.get("id");
    const shareToken = params.get("token");

    if (shareRole && shareId && shareToken) {
      if (shareRole === "principal") {
        setRole("principal");
        saveSession("principal");
        setPortalRestriction("principal");
        localStorage.setItem("school-portal-restriction", "principal");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (shareRole === "teacher") {
        // Must wait for teachers to be loaded from Firestore
        if (!isTeachersLoaded) return;

        const foundTeacher = teacherAccounts.find(t => t.username === shareId || t.id === shareId);
        if (foundTeacher) {
          setActiveTeacher(foundTeacher);
          setRole("teacher");
          saveSession("teacher", foundTeacher);
          setPortalRestriction("teacher");
          localStorage.setItem("school-portal-restriction", "teacher");
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          // Clean URL and show error only if we are CERTAIN it's not there
          window.history.replaceState({}, document.title, window.location.pathname);
          setAuthError("Teacher account not found for this link.");
        }
      }
    }
  }, [teacherAccounts, dbStatus, isTeachersLoaded]);


  return (
      <div className={`relative min-h-screen overflow-hidden text-slate-100 app-shell ${!role ? "login-hero" : "bg-slate-950"}`}>
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 animate-pulse rounded-full bg-amber-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-24 h-80 w-80 animate-pulse rounded-full bg-sky-400/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 animate-pulse rounded-full bg-violet-500/10 blur-3xl" />

      <main className={`relative z-10 mx-auto w-full max-w-6xl px-5 py-8 md:px-8 ${!role ? "min-h-screen flex flex-col justify-center items-center gap-8" : ""}`}>
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={bgTransition}
          className={`mb-8 flex flex-col gap-4 md:flex-row md:items-center relative z-50 ${!role ? "items-center text-center md:justify-center" : "items-start md:justify-between"}`}
        >
          <div className={`flex w-full flex-col gap-4 ${!role ? "items-center" : "sm:flex-row sm:items-center sm:gap-4"}`}>
            <img src="/ybs.png" alt="YBS Logo" className="h-24 max-w-full w-auto rounded-2xl border border-white/10 p-1 object-contain" />
            <div className="min-w-0">
              <div className={`flex items-center gap-3 ${!role ? "justify-center text-center" : ""}`}>
                {role === "admin" && (
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-amber-500 md:hidden"
                  >
                    {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                  </button>
                )}
                <div className={`${!role ? "flex-1" : ""}`}>
                  <p className="text-xs uppercase tracking-[0.3em] text-amber-300">YERIEL BRACHA SCHOOL</p>
                  <h1 className={`max-w-full truncate text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl ${!role ? "text-amber-200 dark:text-amber-100 drop-shadow-[0_12px_18px_rgba(245,158,11,0.25)]" : "text-amber-100"}`}>
                    Academic<br />
                    Reporting<br />
                    System.
                  </h1>
                </div>
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
                <div className={`h-2 w-2 rounded-full ${
                  dbStatus === "connected" ? "bg-emerald-400" : 
                  dbStatus === "connecting" ? "bg-amber-400 animate-pulse" : 
                  "bg-rose-500"
                }`} />
                <span className="text-[10px] uppercase tracking-widest text-slate-400">
                  Cloud: {dbStatus} {dbErrorMessage && `(${dbErrorMessage})`}
                </span>
              </div>
            </div>
          </div>
          {role && (
            <div className="flex items-center gap-2">
              {role === "teacher" && (
                <button
                  onClick={() => {
                    setTeacherActiveTab("change-password");
                    setTeacherViewMode("workspace");
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 active:scale-95 shadow-sm"
                  title="Change Password"
                >
                  <KeyRound className="h-3.5 w-3.5 text-rose-400" />
                  <span>Change Password</span>
                </button>
              )}
              <button
                onClick={resetSession}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
              >
                Logout
              </button>
            </div>
          )}
        </motion.header>

        {!role && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={bgTransition}
            className={`grid gap-4 rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur-lg md:p-6 ${
              portalRestriction ? "max-w-md mx-auto grid-cols-1" : "md:grid-cols-3"
            }`}
          >
            {(!portalRestriction || portalRestriction === "teacher") && (
              <PortalLogin
                title="Teacher Portal"
                subtitle="Write comments for assigned classes"
                colorClass="from-amber-500 to-amber-700"
                username={teacherForm.username}
                password={teacherForm.password}
                showPassword={teacherForm.showPassword}
                onUsernameChange={(value) => setTeacherForm((prev) => ({ ...prev, username: value }))}
                onPasswordChange={(value) => setTeacherForm((prev) => ({ ...prev, password: value }))}
                onTogglePassword={() =>
                  setTeacherForm((prev) => ({ ...prev, showPassword: !prev.showPassword }))
                }
                onLogin={() => handleRoleLogin("teacher")}
              />
            )}
            
            {(!portalRestriction || portalRestriction === "principal") && (
              <PortalLogin
                title="Principal Portal"
                subtitle="Monitor all submitted comments"
                colorClass="from-yellow-500 to-amber-600"
                username={principalForm.username}
                password={principalForm.password}
                showPassword={principalForm.showPassword}
                onUsernameChange={(value) =>
                  setPrincipalForm((prev) => ({
                    ...prev,
                    username: value,
                  }))
                }
                onPasswordChange={(value) =>
                  setPrincipalForm((prev) => ({
                    ...prev,
                    password: value,
                  }))
                }
                onTogglePassword={() =>
                  setPrincipalForm((prev) => ({ ...prev, showPassword: !prev.showPassword }))
                }
                onLogin={() => handleRoleLogin("principal")}
              />
            )}

            {!portalRestriction && (
              <PortalLogin
                title="Admin Portal"
                subtitle="Generate teacher credentials"
                colorClass="from-amber-600 to-yellow-600"
                username={adminForm.username}
                password={adminForm.password}
                showPassword={adminForm.showPassword}
                onUsernameChange={(value) => setAdminForm((prev) => ({ ...prev, username: value }))}
                onPasswordChange={(value) => setAdminForm((prev) => ({ ...prev, password: value }))}
                onTogglePassword={() =>
                  setAdminForm((prev) => ({ ...prev, showPassword: !prev.showPassword }))
                }
                onLogin={() => handleRoleLogin("admin")}
              />
            )}

            {portalRestriction && (
              <div className={`${portalRestriction ? "w-full" : "md:col-span-3"} flex justify-center mt-2`}>
                <button
                  onClick={clearPortalRestriction}
                  className="text-[10px] uppercase tracking-widest text-slate-500/40 hover:text-amber-300/60 transition"
                >
                  {portalRestriction === "teacher" ? "Management Login" : "Show all login portals"}
                </button>
              </div>
            )}

            <div className={`${portalRestriction ? "w-full" : "md:col-span-3"} space-y-3`}>
              {authError && (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
                  {authError}
                </div>
              )}
            </div>
          </motion.section>
        )}

        {!role && (
          <div className="mt-8 flex flex-col items-center justify-center gap-2 opacity-50 transition-opacity hover:opacity-100">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">System Version: v{APP_VERSION}</p>
            <button
              onClick={() => {
                if (window.confirm("This will clear your local settings and force the app to download the latest updates. Continue?")) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium text-slate-400 transition hover:bg-white/10 hover:text-emerald-400"
            >
              Clear Cache & Force Update
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {role === "admin" && (
            <motion.div
              key="admin-panel"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={bgTransition}
              className="space-y-5 rounded-3xl border border-white/15 bg-white/5 p-5 backdrop-blur-lg"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    Admin Management Console
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 font-medium">
                    Select an admin module card below to manage teacher accounts, assessment reports, broadsheets, and system settings.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white/5 px-3.5 py-1.5 border border-white/10 shrink-0">
                  <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  <p className="text-xs font-semibold text-slate-200">Logged in: Administrator</p>
                </div>
              </div>

              {adminViewMode === "cards" ? (
                <AdminDashboardCards
                  activeTab={adminActiveTab}
                  setActiveTab={setAdminActiveTab}
                  teacherAccounts={teacherAccounts}
                  weeklyTests={weeklyTests}
                  midterms={midterms}
                  sbaRecords={sbaRecords}
                  nurseryChecklists={nurseryChecklists}
                  viewMode={adminViewMode}
                  setViewMode={setAdminViewMode}
                />
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-xl backdrop-blur-md">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setAdminViewMode("cards")}
                        className="flex items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-extrabold text-amber-300 transition hover:bg-amber-500/20 active:scale-95 shadow-md"
                      >
                        <span>←</span>
                        <span>Back to Admin Cards</span>
                      </button>
                    </div>
                  </div>

                  {/* Main Content Area - Full Width Workspace */}
                  <div className="w-full pb-20">
                    <AnimatePresence mode="wait">
                      {adminActiveTab === "accounts" && (
                      <motion.div 
                        key="accounts-tab"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                      >
                        <div className="grid gap-6 lg:grid-cols-3">
                          {/* Generate Account Form */}
                          <div className="glass-card lg:col-span-2 p-8">
                          <div className="flex items-center gap-4 mb-8">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                              <Plus className="h-6 w-6" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-white">Generate Teacher Account</h3>
                              <p className="text-xs text-slate-500">Fill in details to create new credentials</p>
                            </div>
                          </div>

                          <div className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                              <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Full Name</label>
                                <input
                                  value={newTeacherName}
                                  onChange={(event) => setNewTeacherName(event.target.value)}
                                  placeholder="e.g. Sarah Khan"
                                  className="w-full rounded-2xl border border-white/5 bg-slate-900/50 px-5 py-4 text-sm outline-none ring-amber-500/30 transition-all focus:ring-2 focus:bg-slate-900"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Assign Classes</label>
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {SCHOOL_CLASSES.map((schoolClass) => {
                                    const selected = newTeacherClasses.includes(schoolClass.id);
                                    return (
                                      <button
                                        key={schoolClass.id}
                                        onClick={() => toggleClassSelection(schoolClass.id)}
                                        className={`rounded-xl px-3.5 py-2 text-xs font-medium transition-all duration-200 ${
                                          selected
                                            ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                                            : "border border-white/5 bg-white/5 text-slate-400 hover:bg-white/10"
                                        }`}
                                      >
                                        {schoolClass.name}
                                      </button>
                                    );
                                  })}
                                </div>
                                {/* Subject assignment per selected class */}
                                {newTeacherClasses.length > 0 && (
                                  <div className="mt-4 space-y-3">
                                    <p className="text-xs text-slate-400">Assign Subjects (per selected class)</p>
                                    {newTeacherClasses.map(classId => {
                                      const cls = classLookup[classId];
                                      const selectedSubjects = newTeacherPermissions[classId] ?? [];
                                      return (
                                        <div key={classId} className="space-y-2">
                                          <p className="text-[12px] font-medium">{cls?.name}</p>
                                          <div className="flex flex-wrap gap-2">
                                            {SUBJECTS.map(sub => (
                                              <button
                                                key={sub.id}
                                                onClick={() => toggleSubjectSelection(classId, sub.id)}
                                                className={`rounded-xl px-2.5 py-1.5 text-[11px] transition-all ${
                                                  selectedSubjects.includes(sub.id)
                                                    ? 'bg-emerald-400 text-slate-950 shadow'
                                                    : 'border border-white/5 bg-white/5 text-slate-400 hover:bg-white/10'
                                                }`}
                                              >
                                                {sub.name}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <button
                              onClick={createTeacherAccount}
                              disabled={isAdminActionLoading}
                              className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 py-4 font-bold text-slate-950 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xl shadow-amber-500/10 disabled:opacity-50"
                            >
                              {isAdminActionLoading ? "Generating Records..." : "Generate Teacher Credentials"}
                            </button>
                            {adminActionError && <p className="text-center text-xs text-rose-400 font-medium">{adminActionError}</p>}
                          </div>
                        </div>

                        {/* Recent & Links Hub */}
                        <div className="space-y-6">
                          {/* Latest Result */}
                          <div className="glass-card p-6 border-amber-500/20 bg-amber-500/5 relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl transition-all group-hover:bg-amber-500/20" />
                            <h3 className="relative text-xs font-bold uppercase tracking-[0.2em] text-amber-500 mb-6">Latest Result</h3>
                            {createdAccount ? (
                              <div className="relative space-y-4">
                                <div className="space-y-1">
                                  <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Teacher</p>
                                  <p className="font-bold text-amber-100">{createdAccount.fullName}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">User</p>
                                    <p className="font-mono text-xs text-amber-400">{createdAccount.username}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Pass</p>
                                    <p className="font-mono text-xs text-amber-400">{createdAccount.password}</p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="py-8 text-center">
                                <p className="text-xs text-slate-500 italic">No account generated in this session</p>
                              </div>
                            )}
                          </div>

                          {/* Quick Access */}
                          <div className="glass-card p-6">
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-6">Portal Access</h3>
                            <button
                              onClick={() => copyShareLink("principal", "principal001", "Principal")}
                              className="group flex w-full items-center justify-between rounded-2xl bg-white/5 p-4 transition-all hover:bg-white/10"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                                  <Settings className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-bold">Principal Link</p>
                                  <p className="text-[10px] text-slate-500">Audit all comments</p>
                                </div>
                              </div>
                              <Link className="h-4 w-4 text-slate-600 transition-all group-hover:text-amber-500" />
                            </button>
                            <p className="mt-4 px-2 text-[10px] text-slate-500 leading-relaxed italic">
                              Shared links bypass login for 8 hours. Use with caution.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Teacher Directory */}
                      <div className="glass-card p-4 md:p-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
                              <Users className="h-6 w-6" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-white">Teacher Directory</h3>
                              <p className="text-xs text-slate-500">Manage {teacherAccounts.length} existing accounts</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3">
                          {teacherAccounts.length === 0 ? (
                            <div className="py-20 text-center glass-card border-dashed bg-transparent">
                              <p className="text-sm text-slate-500 italic">No teacher accounts found in the system</p>
                            </div>
                          ) : (
                            teacherAccounts.map((teacher) => (
                              <motion.div
                                layout
                                key={teacher.id}
                                onClick={() => startEditTeacher(teacher)}
                                className="group flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/5 bg-slate-900/30 p-5 transition-all hover:border-white/10 hover:bg-slate-900/50 cursor-pointer"
                              >
                                  <div className="flex items-center gap-5">
                                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-amber-500 font-black text-xl shadow-inner group-hover:scale-110 transition-transform">
                                    {teacher.fullName.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-100">{teacher.fullName}</p>
                                    <p className="text-xs font-mono text-slate-500">@{teacher.username}</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4 w-full md:w-auto md:gap-6 justify-between md:justify-end">
                                  <div className="hidden lg:flex flex-wrap gap-1.5 max-w-[300px] justify-end">
                                    {teacher.classIds.map((id) => (
                                      <span key={id} className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-500">
                                        {classLookup[id]?.name ?? id}
                                      </span>
                                    ))}
                                  </div>
                                  {editingTeacherId === teacher.id ? (
                                    <div className="flex gap-2 items-center">
                                      <button onClick={(e) => { e.stopPropagation(); saveEditTeacher(); }} disabled={isEditingSaving} className="rounded-xl bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-300">{isEditingSaving ? 'Saving...' : 'Save'}</button>
                                      <button onClick={(e) => { e.stopPropagation(); cancelEdit(); }} disabled={isEditingSaving} className="rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300">Cancel</button>
                                    </div>
                                  ) : (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); startEditTeacher(teacher); }}
                                        className="hidden md:inline-flex items-center gap-2 rounded-2xl bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-500 hover:bg-amber-500 hover:text-slate-950"
                                      >Edit</button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); copyShareLink("teacher", teacher.username, teacher.fullName); }}
                                        className="flex flex-1 md:flex-none items-center justify-center gap-2 rounded-2xl bg-amber-500/10 px-4 md:px-5 py-3 md:py-2.5 text-xs font-bold text-amber-500 transition-all hover:bg-amber-500 hover:text-slate-950"
                                      >
                                        <Link className="h-3 w-3" />
                                        <span>Copy Link</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {editingTeacherId === teacher.id && (
                                  <div className="w-full mt-4 p-4 rounded-xl bg-slate-950/40 border border-white/5">
                                    <div className="grid gap-3 md:grid-cols-3">
                                      <div>
                                        <label className="text-xs uppercase text-slate-400">Full Name</label>
                                        <input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} className="w-full rounded-xl px-3 py-2 bg-slate-900/40 text-sm" />
                                      </div>
                                      <div>
                                        <label className="text-xs uppercase text-slate-400">Username</label>
                                        <input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="w-full rounded-xl px-3 py-2 bg-slate-900/40 text-sm" />
                                      </div>
                                      <div>
                                        <label className="text-xs uppercase text-slate-400">Classes</label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                          {SCHOOL_CLASSES.map(cls => (
                                            <button key={cls.id} onClick={(e) => { e.stopPropagation(); toggleEditClass(cls.id); }} className={`px-2 py-1 text-[10px] rounded-lg ${editClassIds.includes(cls.id) ? 'bg-amber-500 text-slate-950' : 'bg-white/5 text-slate-400'}`}>
                                              {cls.name}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="mt-3">
                                      <p className="text-xs text-slate-400 mb-2">Permissions (select subjects per class)</p>
                                      {editClassIds.map(cid => (
                                        <div key={cid} className="mb-2">
                                          <p className="text-[11px] font-semibold">{classLookup[cid]?.name ?? cid}</p>
                                          <div className="flex flex-wrap gap-2 mt-1">
                                            {SUBJECTS.map(sub => (
                                              <button key={sub.id} onClick={(e) => { e.stopPropagation(); toggleEditSubject(cid, sub.id); }} className={`px-2 py-1 text-[10px] rounded ${editPermissions[cid]?.includes(sub.id) ? 'bg-amber-500 text-slate-950' : 'bg-white/5 text-slate-400'}`}>
                                                {sub.name}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    {editError && <p className="text-xs text-rose-400 mt-2">{editError}</p>}
                                  </div>
                                )}
                              </motion.div>
                            ))
                          )}
                        </div>
                      </div>
                    </motion.div>
                )}

                {adminActiveTab === "weekly-report" && (
                    <motion.div 
                      key="reports-tab"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="glass-card p-4 md:p-8 min-h-[600px]"
                    >
                      <div className="flex items-center gap-4 mb-8">
                        <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                          <BarChart3 className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <div>
                          <h3 className="text-lg md:text-xl font-bold text-white">Weekly Performance Report</h3>
                          <p className="text-[10px] md:text-xs text-slate-500">Aggregated academic data across all classes</p>
                        </div>
                      </div>
                      <AdminWeeklyReport weeklyTests={weeklyTests} teacherAccounts={teacherAccounts} classLookup={classLookup} />
                    </motion.div>
                )}

                {adminActiveTab === "sba-report" && (
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
                          <h3 className="text-lg md:text-xl font-bold text-white">SBA Reports</h3>
                          <p className="text-[10px] md:text-xs text-slate-500">Filter SBA data by class, student, subject, and term</p>
                        </div>
                      </div>
                      <AdminSBAReport
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
                          <h3 className="text-lg md:text-xl font-bold text-white">SBA N/C Reports</h3>
                          <p className="text-[10px] md:text-xs text-slate-500">Nursery & Creche Reports</p>
                        </div>
                      </div>
                      <AdminNurseryReport
                        reports={reports}
                        nurseryChecklists={nurseryChecklists}
                        termAttendanceRecords={termAttendanceRecords}
                        reportSettings={reportSettings}
                        getNurseryReportCardHtml={getNurseryReportCardHtml}
                      />
                    </motion.div>
                )}

                {adminActiveTab === "midterm-report" && (
                    <motion.div 
                      key="midterm-report"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="glass-card p-4 md:p-8 min-h-[600px]"
                    >
                      <div className="flex items-center gap-4 mb-8">
                        <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                          <Printer className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <div>
                          <h3 className="text-lg md:text-xl font-bold text-white">Midterm Performance Report</h3>
                          <p className="text-[10px] md:text-xs text-slate-500">Midterm exam records (class-filtered)</p>
                        </div>
                      </div>
                      <AdminMidtermReport midterms={midterms} teacherAccounts={teacherAccounts} classLookup={classLookup} />
                    </motion.div>
                )}

                {adminActiveTab === "data-editor" && (
                    <motion.div 
                      key="data-editor"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className="space-y-6 rounded-3xl bg-slate-900/40 p-6 md:p-8 border border-white/5 shadow-2xl backdrop-blur-md"
                    >
                      <div className="mb-6 flex items-center gap-3 border-b border-white/5 pb-4">
                        <div className="rounded-xl bg-amber-500/20 p-2.5 text-amber-400">
                          <Edit2 className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-lg md:text-xl font-bold text-white">Admin Data Editor</h3>
                          <p className="text-[10px] md:text-xs text-slate-500">Edit any teacher inputs in real time</p>
                        </div>
                      </div>
                      <AdminDataEditor 
                        schoolClasses={SCHOOL_CLASSES}
                        teachers={teacherAccounts}
                        reports={reports}
                        weeklyTests={weeklyTests}
                        midterms={midterms}
                        sbaRecords={sbaRecords}
                        termAttendanceRecords={termAttendanceRecords}
                        updateComment={updateComment}
                        deleteComment={deleteComment}
                        submitWeeklyTest={submitWeeklyTest}
                        deleteWeeklyTest={deleteWeeklyTest}
                        submitMidterm={submitMidterm}
                        deleteMidterm={deleteMidterm}
                        submitSbaRecord={submitSbaRecord}
                        deleteSbaRecord={deleteSbaRecord}
                        submitTermAttendance={submitTermAttendance}
                        deleteStudentCompletely={deleteStudentCompletely}
                      />
                    </motion.div>
                )}

                {adminActiveTab === "report-settings" && (
                    <motion.div 
                      key="report-settings"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className="space-y-6 rounded-3xl bg-slate-900/40 p-6 md:p-8 border border-white/5 shadow-2xl backdrop-blur-md"
                    >
                      <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-amber-500/20 p-2.5 text-amber-400">
                            <Calendar className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="text-lg md:text-xl font-bold text-white">Report Card Settings</h3>
                            <p className="text-[10px] md:text-xs text-slate-500">Configure vacation and reopening dates for each term</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsPromoteModalOpen(true)}
                          className="flex items-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-2.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30 border border-emerald-500/20"
                        >
                          <Users className="h-4 w-4" />
                          Promote Students
                        </button>
                      </div>
                      <AdminReportSettings 
                        reportSettings={reportSettings}
                      />
                    </motion.div>
                )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </motion.div>
      )}

           {role === "teacher" && activeTeacher && (
            <motion.section
              key="teacher-panel"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={bgTransition}
              className="space-y-5 rounded-3xl border border-white/15 bg-white/5 p-5 backdrop-blur-lg"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    Select a card below to manage your class assessments & reports
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 font-medium">
                    Click any tool card to enter weekly tests, midterms, SBA scores, conduct remarks, or attendance.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white/5 px-3.5 py-1.5 border border-white/10 shrink-0">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-xs font-semibold text-slate-200">Logged in: {activeTeacher.fullName}</p>
                </div>
              </div>

              {/* Card Hub Grid - Only visible when teacherViewMode is 'cards' */}
              {teacherViewMode === "cards" ? (
                <DashboardCards
                  activeTab={teacherActiveTab}
                  setActiveTab={setTeacherActiveTab}
                  reports={reports}
                  weeklyTests={weeklyTests}
                  midterms={midterms}
                  sbaRecords={sbaRecords}
                  termAttendanceRecords={termAttendanceRecords}
                  nurseryChecklists={nurseryChecklists}
                  selectedClassId={teacherClassFilter !== "all" ? teacherClassFilter : activeTeacher.classIds[0]}
                  allStudentsInClass={getActiveClassStudents(
                    teacherClassFilter !== "all" ? teacherClassFilter : activeTeacher.classIds[0],
                    "2025/2026",
                    "Term 3",
                    reports,
                    weeklyTests,
                    midterms,
                    sbaRecords,
                    nurseryChecklists,
                    termAttendanceRecords
                  )}
                  viewMode={teacherViewMode}
                  setViewMode={setTeacherViewMode}
                  isNurseryClass={isNurseryClass}
                />
              ) : (
                /* Dedicated Tab Page Workspace View */
                <div className="space-y-5">
                  {/* Dedicated Page Header with Back Button */}
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-xl backdrop-blur-md">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setTeacherViewMode("cards")}
                        className="flex items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-extrabold text-amber-300 transition hover:bg-amber-500/20 active:scale-95 shadow-md"
                      >
                        <span>←</span>
                        <span>Back to Cards Hub</span>
                      </button>
                      
                      <div className="h-6 w-px bg-white/10" />

                      <div>
                        <span className="text-[10px] uppercase font-extrabold text-amber-400 tracking-wider">Active Page</span>
                        <h3 className="text-base font-extrabold text-white uppercase tracking-wide">
                          {teacherTabs.find(t => t.id === teacherActiveTab)?.label || (teacherActiveTab === "change-password" ? "Change Account Password" : teacherActiveTab.replace("-", " "))}
                        </h3>
                        <p className="text-xs text-slate-300 mt-0.5">
                          {teacherActiveTab === "comments" && "You can only see and submit your own comments. Other teachers' comments are hidden from this workspace."}
                          {teacherActiveTab === "weekly-tests" && "Input weekly continuous assessment scores for planned subjects across Weeks 1 to 11."}
                          {teacherActiveTab === "midterms" && "Record midterm examination evaluation scores per subject out of 100."}
                          {teacherActiveTab === "project-work" && "Record individual project work scores contributing 10% towards SBA."}
                          {teacherActiveTab === "group-work" && "Record group project and collaborative activity scores contributing 10% towards SBA."}
                          {teacherActiveTab === "exam" && "Record end of term examination scores weighted at 50% for final report cards."}
                          {teacherActiveTab === "sba" && "View automated SBA broadsheet summary combining Class Scores (50%) and Exam Scores (50%)."}
                          {teacherActiveTab === "attendance" && "Log student attendance records and total possible school days for the term."}
                          {teacherActiveTab === "checklist" && "Assess developmental milestone ratings, motor coordination, and literacy skills."}
                          {teacherActiveTab === "change-password" && "Update your account security password safely for future log-ins."}
                          {teacherActiveTab === "students" && "Manage student roster, delete student profiles, or clean stale records."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {teacherActiveTab === "change-password" && (
                    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 space-y-4 shadow-xl backdrop-blur-md">
                      <div className="flex items-center gap-2 border-b border-rose-500/20 pb-3">
                        <KeyRound className="h-5 w-5 text-rose-400" />
                        <h3 className="font-bold text-white text-base">Account Security Settings</h3>
                      </div>
                      {passwordChangeSuccess ? (
                        <div className="flex items-center gap-2 py-4 justify-center bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                          <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300 font-bold">
                            ✓
                          </div>
                          <p className="text-emerald-300 font-medium">Password updated successfully! Return to dashboard cards when ready.</p>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-slate-300">Enter your current password and set a new password for your account.</p>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <input
                              value={teacherPasswordForm.currentPassword}
                              onChange={(event) => setTeacherPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                              type={teacherPasswordForm.showPasswords ? "text" : "password"}
                              placeholder="Current password"
                              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3.5 py-2.5 text-sm outline-none ring-rose-400 transition focus:ring text-white"
                            />
                            <input
                              value={teacherPasswordForm.newPassword}
                              onChange={(event) => setTeacherPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                              type={teacherPasswordForm.showPasswords ? "text" : "password"}
                              placeholder="New password"
                              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3.5 py-2.5 text-sm outline-none ring-rose-400 transition focus:ring text-white"
                            />
                            <input
                              value={teacherPasswordForm.confirmPassword}
                              onChange={(event) => setTeacherPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                              type={teacherPasswordForm.showPasswords ? "text" : "password"}
                              placeholder="Confirm password"
                              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3.5 py-2.5 text-sm outline-none ring-rose-400 transition focus:ring text-white"
                            />
                          </div>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <button
                              onClick={() => setTeacherPasswordForm((prev) => ({ ...prev, showPasswords: !prev.showPasswords }))}
                              className="flex items-center gap-1.5 text-xs text-rose-300 hover:text-rose-200"
                            >
                              {teacherPasswordForm.showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              {teacherPasswordForm.showPasswords ? "Hide" : "Show"} passwords
                            </button>
                            <button
                              onClick={() => {
                                if (teacherPasswordForm.newPassword !== teacherPasswordForm.confirmPassword) {
                                  setPasswordChangeError("Passwords do not match.");
                                  return;
                                }
                                changeTeacherPassword(teacherPasswordForm.currentPassword, teacherPasswordForm.newPassword);
                              }}
                              className="rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 shadow-lg shadow-rose-500/20 active:scale-95"
                            >
                              Update Password
                            </button>
                          </div>
                        </>
                      )}
                      {passwordChangeError && <p className="mt-2 text-xs text-rose-400 font-semibold">{passwordChangeError}</p>}
                    </div>
                  )}

                  {activeTeacher.classIds.length > 1 && teacherActiveTab !== "change-password" && (
                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                      <label className="mb-2 block text-xs uppercase tracking-wide text-slate-400">Filter by class</label>
                      <select
                        value={teacherClassFilter}
                        onChange={(e) => setTeacherClassFilter(e.target.value)}
                        className="w-full max-w-xs rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring"
                      >
                        <option value="all">All classes</option>
                        {activeTeacher.classIds.map((schoolClassId) => (
                          <option key={schoolClassId} value={schoolClassId}>
                            {classLookup[schoolClassId]?.name ?? schoolClassId}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {teacherActiveTab !== "change-password" && (
                    <div className="space-y-4">
                      {(teacherClassFilter === "all" ? activeTeacher.classIds : [teacherClassFilter]).map((schoolClassId) => {
                      const schoolClass = classLookup[schoolClassId];
                      return (
                        <motion.div
                          layout
                          key={schoolClass.id}
                          className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                        >
                          <h3 className="mb-3 text-xl font-semibold">{schoolClass.name}</h3>
                      {teacherActiveTab === "checklist" && (
                        <NurseryChecklistForm
                          schoolClassId={schoolClass.id}
                          academicYear="2025/2026"
                          term="1st Term"
                          nurseryChecklists={nurseryChecklists}
                          activeTeacherId={activeTeacher.id}
                          students={getActiveClassStudents(schoolClass.id, "2025/2026", "Term 3", reports, weeklyTests, midterms, sbaRecords, nurseryChecklists, termAttendanceRecords)}
                        />
                      )}
                      {teacherActiveTab === "comments" && (
                        <TeacherCommentForm
                          schoolClassId={schoolClass.id}
                          activeTeacherId={activeTeacher.id}
                          reports={reports}
                          weeklyTests={weeklyTests}
                          midterms={midterms}
                          sbaRecords={sbaRecords}
                          termAttendanceRecords={termAttendanceRecords}
                          nurseryChecklists={nurseryChecklists}
                          commentDrafts={commentDrafts}
                          setCommentDrafts={setCommentDrafts}
                          submitComment={submitComment}
                          updateComment={updateComment}
                          deleteComment={deleteComment}
                          deleteStudentCompletely={deleteStudentCompletely}
                        />
                      )}
                      {teacherActiveTab === "weekly-tests" && (
                        <WeeklyTestForm
                          schoolClassId={schoolClass.id}
                          activeTeacher={activeTeacher}
                          weeklyTests={weeklyTests}
                          reports={reports}
                          midterms={midterms}
                          sbaRecords={sbaRecords}
                          termAttendanceRecords={termAttendanceRecords}
                          submitWeeklyTest={submitWeeklyTest}
                          deleteWeeklyTest={deleteWeeklyTest}
                          updateWeeklyTest={updateWeeklyTest}
                        />
                      )}
                      {teacherActiveTab === "midterms" && (
                        <MidtermForm
                          schoolClassId={schoolClass.id}
                          activeTeacher={activeTeacher}
                          midterms={midterms}
                          reports={reports}
                          weeklyTests={weeklyTests}
                          sbaRecords={sbaRecords}
                          termAttendanceRecords={termAttendanceRecords}
                          submitMidterm={submitMidterm}
                          deleteMidterm={deleteMidterm}
                        />
                      )}
                      {teacherActiveTab === "project-work" && (
                        <SBAFieldForm
                          schoolClassId={schoolClass.id}
                          activeTeacher={activeTeacher}
                          sbaRecords={sbaRecords}
                          reports={reports}
                          weeklyTests={weeklyTests}
                          midterms={midterms}
                          termAttendanceRecords={termAttendanceRecords}
                          submitSbaRecord={submitSbaRecord}
                          mode="project"
                          title="Project Work Input"
                          label="Project Work"
                          maxScore={10}
                        />
                      )}
                      {teacherActiveTab === "group-work" && (
                        <SBAFieldForm
                          schoolClassId={schoolClass.id}
                          activeTeacher={activeTeacher}
                          sbaRecords={sbaRecords}
                          reports={reports}
                          weeklyTests={weeklyTests}
                          midterms={midterms}
                          termAttendanceRecords={termAttendanceRecords}
                          submitSbaRecord={submitSbaRecord}
                          mode="group"
                          title="Group Work Input"
                          label="Group Work"
                          maxScore={10}
                        />
                      )}
                      {teacherActiveTab === "exam" && (
                        <SBAFieldForm
                          schoolClassId={schoolClass.id}
                          activeTeacher={activeTeacher}
                          sbaRecords={sbaRecords}
                          reports={reports}
                          weeklyTests={weeklyTests}
                          midterms={midterms}
                          termAttendanceRecords={termAttendanceRecords}
                          submitSbaRecord={submitSbaRecord}
                          mode="exam"
                          title="Exam Input"
                          label="Exam"
                          maxScore={100}
                        />
                      )}
                      {teacherActiveTab === "sba" && (
                        <SBAReportPanel
                          schoolClassId={schoolClass.id}
                          activeTeacher={activeTeacher}
                          weeklyTests={weeklyTests}
                          midterms={midterms}
                          sbaRecords={sbaRecords}
                          reports={reports}
                          termAttendanceRecords={termAttendanceRecords}
                          reportSettings={reportSettings}
                          nurseryChecklists={nurseryChecklists}
                        />
                      )}
                      {teacherActiveTab === "attendance" && (
                        <AttendancePanel
                          schoolClassId={schoolClass.id}
                          activeTeacher={activeTeacher}
                          termAttendanceRecords={termAttendanceRecords}
                          reports={reports}
                          weeklyTests={weeklyTests}
                          midterms={midterms}
                          sbaRecords={sbaRecords}
                          submitTermAttendance={submitTermAttendance}
                        />
                      )}
                      {teacherActiveTab === "weekly-report" && (
                        <AdminWeeklyReport 
                          weeklyTests={weeklyTests.filter(t => t.teacherId === activeTeacher.id)} 
                          teacherAccounts={teacherAccounts} 
                          classLookup={classLookup} 
                          readOnly={true}
                        />
                      )}
                      {teacherActiveTab === "analytics" && (
                        <div className="space-y-4">
                          <p className="text-sm text-slate-400">Select a student to view their progress over time across all subjects.</p>
                          <select
                            value={analyticsSelectedStudent}
                            onChange={(e) => setAnalyticsSelectedStudent(e.target.value)}
                            className="w-full md:w-1/2 rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring"
                          >
                            <option value="">-- Choose a student --</option>
                            {Array.from(new Set(
                              weeklyTests.filter(t => t.classId === schoolClass.id).map(t => t.studentName)
                            )).sort().map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                          
                          {analyticsSelectedStudent && (
                            <StudentProgressChart 
                              tests={weeklyTests.filter(t => t.classId === schoolClass.id && t.studentName === analyticsSelectedStudent)} 
                              studentName={analyticsSelectedStudent} 
                            />
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </motion.section>
          )}

          {role === "principal" && (
            <motion.section
              key="principal-panel"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={bgTransition}
              className="space-y-5 rounded-3xl border border-white/15 bg-white/5 p-5 backdrop-blur-lg"
            >
              <h2 className="text-2xl font-semibold">Principal Dashboard</h2>
              <p className="text-sm text-slate-300">
                Explore by class, then expand a student name to read all comments sent by teachers.
              </p>

              <div className="space-y-3">
                {groupedForPrincipal.map((schoolClass) => {
                  const isClassOpen = expandedClass === schoolClass.id;
                  return (
                    <div key={schoolClass.id} className="rounded-2xl border border-white/10 bg-slate-900/60 p-3">
                      <div className="flex w-full items-center justify-between">
                        <button
                          onClick={() =>
                            setExpandedClass((prev) => (prev === schoolClass.id ? null : schoolClass.id))
                          }
                          className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left transition hover:bg-white/5"
                        >
                          <span className="font-semibold text-white">{schoolClass.name}</span>
                          <span className="text-sm text-slate-300">
                            {schoolClass.studentCount} students with comments
                          </span>
                        </button>
                        
                        {isClassOpen && schoolClass.years.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadClassExcel(schoolClass);
                            }}
                            className="ml-2 flex h-full items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
                            title="Download Excel"
                          >
                            <Download className="h-4 w-4" />
                            <span>Export Excel</span>
                          </button>
                        )}
                      </div>
 
                      <AnimatePresence>
                        {isClassOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            {schoolClass.years.length === 0 ? (
                              <p className="px-2 py-3 text-sm text-slate-300">No comments submitted yet.</p>
                            ) : (
                              <div className="space-y-4 px-1 pt-2">
                                {schoolClass.years.map((year) => {
                                  const yearKey = `${schoolClass.id}-${year.yearName}`;
                                  const isYearOpen = expandedYear === yearKey;

                                  return (
                                    <div key={yearKey} className="rounded-xl border border-white/5 bg-slate-900/40 p-2">
                                      <button
                                        onClick={() => setExpandedYear(prev => prev === yearKey ? null : yearKey)}
                                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-white/5 transition"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="text-amber-400">📅</span>
                                          <span className="font-semibold text-slate-200">{year.yearName}</span>
                                        </div>
                                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isYearOpen ? "rotate-180" : ""}`} />
                                      </button>

                                      <AnimatePresence>
                                        {isYearOpen && (
                                          <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mt-2 space-y-3 overflow-hidden ml-4 border-l border-white/10 pl-3"
                                          >
                                            {year.terms.map((term) => {
                                              const termKey = `${yearKey}-${term.termName}`;
                                              const isTermOpen = expandedTerm === termKey;

                                              return (
                                                <div key={termKey} className="space-y-2">
                                                  <button
                                                    onClick={() => setExpandedTerm(prev => prev === termKey ? null : termKey)}
                                                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-white/5 transition"
                                                  >
                                                    <div className="flex items-center gap-2 text-sm">
                                                      <span className="text-emerald-400">📝</span>
                                                      <span className="font-medium text-slate-300">{term.termName}</span>
                                                      <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded-full bg-slate-800">
                                                        {term.students.length} students
                                                      </span>
                                                    </div>
                                                    <ChevronDown className={`h-3 w-3 text-slate-500 transition-transform ${isTermOpen ? "rotate-180" : ""}`} />
                                                  </button>

                                                  <AnimatePresence>
                                                    {isTermOpen && (
                                                      <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="mt-1 space-y-2 overflow-hidden ml-2"
                                                      >
                                                        {term.students.map((bucket) => {
                                                          const studentKey = `${termKey}-${bucket.student}`;
                                                          const isStudentOpen = expandedStudent === studentKey;

                                                          return (
                                                            <div key={studentKey} className="rounded-xl border border-white/5 bg-slate-950/40 p-2">
                                                              <button
                                                                onClick={() => setExpandedStudent(prev => prev === studentKey ? null : studentKey)}
                                                                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-white/5"
                                                              >
                                                                <span className="font-medium text-sm text-slate-200">{bucket.student}</span>
                                                                <span className="text-[10px] text-slate-500">
                                                                  {bucket.comments.length} comment(s)
                                                                </span>
                                                              </button>

                                                              <AnimatePresence>
                                                                {isStudentOpen && (
                                                                  <motion.div
                                                                    initial={{ opacity: 0, y: -6 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    exit={{ opacity: 0, y: -6 }}
                                                                    className="space-y-2 px-2 pb-2"
                                                                  >
                                                                    {bucket.comments.map((item: any) => (
                                                                      <div key={item.id} className="rounded-lg border border-amber-300/30 bg-amber-500/10 p-2">
                                                                        {principalEditingId === item.id ? (
                                                                          <div className="space-y-2">
                                                                            <input
                                                                              value={principalEditStudentName}
                                                                              onChange={(event) => setPrincipalEditStudentName(event.target.value)}
                                                                              placeholder="Student name"
                                                                              className="w-full rounded-lg border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring"
                                                                            />
                                                                            <textarea
                                                                              value={principalEditCommentText}
                                                                              onChange={(event) => setPrincipalEditCommentText(event.target.value)}
                                                                              placeholder="Comment"
                                                                              className="min-h-20 w-full rounded-lg border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring"
                                                                            />
                                                                            <div className="flex items-center gap-2">
                                                                              <button onClick={handlePrincipalSaveEdit} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-600">Save</button>
                                                                              <button onClick={handlePrincipalCancelEdit} className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10">Cancel</button>
                                                                            </div>
                                                                          </div>
                                                                        ) : (
                                                                          <>
                                                                            <div className="mb-1">
                                                                              <p className="text-[10px] text-amber-200">
                                                                                {item.teacherName} • {new Date(item.submittedAt).toLocaleString()}
                                                                              </p>
                                                                            </div>
                                                                            <p className="mb-2 text-sm text-slate-100">{item.comment}</p>
                                                                            <button
                                                                              onClick={() => handlePrincipalStartEdit(item)}
                                                                              className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-500/30"
                                                                            >
                                                                              Edit
                                                                            </button>
                                                                          </>
                                                                        )}
                                                                      </div>
                                                                    ))}
                                                                  </motion.div>
                                                                )}
                                                              </AnimatePresence>
                                                            </div>
                                                          );
                                                        })}
                                                      </motion.div>
                                                    )}
                                                  </AnimatePresence>
                                                </div>
                                              );
                                            })}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

type TeacherCommentFormProps = {
  schoolClassId: string;
  activeTeacherId?: string;
  activeTeacher?: any;
  reports: CommentReport[];
  weeklyTests?: WeeklyTest[];
  midterms?: Midterm[];
  sbaRecords?: SBARecord[];
  termAttendanceRecords?: TermAttendanceRecord[];
  nurseryChecklists?: NurseryChecklistRecord[];
  commentDrafts?: Record<string, string>;
  setCommentDrafts?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  submitComment?: (schoolClassId: string, studentName: string, academicYear: string, term: string, draftKey: string) => void;
  updateComment: (commentId: string, studentName: string, commentText: string, sex?: string, conduct?: string, attitude?: string, interest?: string) => void;
  deleteComment: (commentId: string) => void;
  deleteStudentCompletely?: (classId: string, studentName: string) => void;
};

function TeacherCommentForm({
  schoolClassId,
  activeTeacherId,
  activeTeacher,
  reports,
  weeklyTests = [],
  midterms = [],
  sbaRecords = [],
  termAttendanceRecords = [],
  nurseryChecklists = [],
  commentDrafts,
  setCommentDrafts,
  submitComment,
  updateComment,
  deleteComment,
  deleteStudentCompletely,
}: TeacherCommentFormProps) {
  const draftKey = schoolClassId;

  // Local fallback states if props are not passed (e.g., in Admin impersonation)
  const [localCommentDrafts, setLocalCommentDrafts] = useState<Record<string, string>>({});
  const drafts = commentDrafts || localCommentDrafts;
  const setDrafts = setCommentDrafts || setLocalCommentDrafts;

  const studentName = drafts[`${draftKey}-student`] ?? "";
  const commentText = drafts[draftKey] ?? "";
  const academicYear = drafts[`${draftKey}-year`] ?? "";
  const term = drafts[`${draftKey}-term`] ?? "";
  const sex = drafts[`${draftKey}-sex`] ?? "";
  const conduct = drafts[`${draftKey}-conduct`] ?? "";
  const attitude = drafts[`${draftKey}-attitude`] ?? "";
  const interest = drafts[`${draftKey}-interest`] ?? "";

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStudentName, setEditStudentName] = useState("");
  const [editCommentText, setEditCommentText] = useState("");
  const [editSex, setEditSex] = useState("");
  const [editConduct, setEditConduct] = useState("");
  const [editAttitude, setEditAttitude] = useState("");
  const [editInterest, setEditInterest] = useState("");

  const resolvedTeacherId = activeTeacherId || activeTeacher?.id || "admin";

  const teacherReportsForClass = useMemo(
    () =>
      reports
        .filter((item) => item.teacherId === resolvedTeacherId && item.classId === schoolClassId)
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
    [reports, resolvedTeacherId, schoolClassId]
  );
 
  const teacherGroupedReports = useMemo(() => {
    const yearMap = new Map<string, Map<string, CommentReport[]>>();
    teacherReportsForClass.forEach(report => {
      const year = report.academicYear || "Unknown Year";
      const term = report.term || "Unknown Term";
      if (!yearMap.has(year)) yearMap.set(year, new Map());
      const termMap = yearMap.get(year)!;
      if (!termMap.has(term)) termMap.set(term, []);
      termMap.get(term)!.push(report);
    });
    return Array.from(yearMap.entries()).map(([yearName, terms]) => ({
      yearName,
      terms: Array.from(terms.entries()).map(([termName, stReports]) => ({
        termName,
        reports: stReports
      })).sort((a,b) => a.termName.localeCompare(b.termName))
    })).sort((a,b) => b.yearName.localeCompare(a.yearName));
  }, [teacherReportsForClass]);
 
  const [expandedTeacherYear, setExpandedTeacherYear] = useState<string | null>(null);
  const [expandedTeacherTerm, setExpandedTeacherTerm] = useState<string | null>(null);

  const knownStudents = useMemo(() => {
    const studentMap = new Map<string, string>();
    const addName = (name?: string) => {
      const trimmed = name?.trim();
      if (!trimmed) return;
      const key = normalizeDisplayValue(trimmed);
      if (!studentMap.has(key)) studentMap.set(key, trimmed);
    };
    (reports || []).forEach(r => { if (r.classId === schoolClassId || normalizeDisplayValue(r.classId) === normalizeDisplayValue(schoolClassId)) addName(r.studentName); });
    (weeklyTests || []).forEach(t => { if (t.classId === schoolClassId || normalizeDisplayValue(t.classId) === normalizeDisplayValue(schoolClassId)) addName(t.studentName); });
    (midterms || []).forEach(m => { if (m.classId === schoolClassId || normalizeDisplayValue(m.classId) === normalizeDisplayValue(schoolClassId)) addName(m.studentName); });
    (sbaRecords || []).forEach(s => { if (s.classId === schoolClassId || normalizeDisplayValue(s.classId) === normalizeDisplayValue(schoolClassId)) addName(s.studentName); });
    (termAttendanceRecords || []).forEach(a => { if (a.classId === schoolClassId || normalizeDisplayValue(a.classId) === normalizeDisplayValue(schoolClassId)) addName(a.studentName); });
    (nurseryChecklists || []).forEach(c => { if (c.classId === schoolClassId || normalizeDisplayValue(c.classId) === normalizeDisplayValue(schoolClassId)) addName(c.studentName); });
    return Array.from(studentMap.values()).sort((a, b) => a.localeCompare(b));
  }, [reports, weeklyTests, midterms, sbaRecords, termAttendanceRecords, nurseryChecklists, schoolClassId]);

  const handleStartEdit = (report: CommentReport) => {
    setEditingId(report.id);
    setEditStudentName(report.studentName);
    setEditCommentText(report.comment);
    setEditSex(report.sex || "");
    setEditConduct(report.conduct || "");
    setEditAttitude(report.attitude || "");
    setEditInterest(report.interest || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditStudentName("");
    setEditCommentText("");
    setEditSex("");
    setEditConduct("");
    setEditAttitude("");
    setEditInterest("");
  };

  const handleSaveEdit = () => {
    if (!editingId || !editStudentName.trim() || !editCommentText.trim()) {
      return;
    }
    updateComment(editingId, editStudentName, editCommentText, editSex, editConduct, editAttitude, editInterest);
    handleCancelEdit();
  };

  const handleSendComment = async () => {
    if (submitComment) {
      submitComment(schoolClassId, studentName, academicYear, term, draftKey);
      return;
    }

    // Direct Firestore write fallback
    if (!studentName.trim() || !commentText.trim() || !academicYear || !term) {
      alert("Please fill in Student Name, Year, Term, and Comment.");
      return;
    }
    const reportId = crypto.randomUUID();
    const reportObj: CommentReport = {
      id: reportId,
      teacherId: resolvedTeacherId,
      teacherName: activeTeacher?.fullName || "Administrator",
      classId: schoolClassId,
      studentName: studentName.trim(),
      comment: commentText.trim(),
      academicYear: academicYear,
      term: term,
      submittedAt: new Date().toISOString(),
      sex: sex as any || "",
      conduct: conduct || "",
      attitude: attitude || "",
      interest: interest || "",
    };
    try {
      await setDoc(doc(db, "reports", reportId), reportObj);
      setDrafts((prev) => ({
        ...prev,
        [draftKey]: "",
        [`${draftKey}-student`]: "",
        [`${draftKey}-year`]: "",
        [`${draftKey}-term`]: "",
        [`${draftKey}-sex`]: "",
        [`${draftKey}-conduct`]: "",
        [`${draftKey}-attitude`]: "",
        [`${draftKey}-interest`]: ""
      }));
      alert("Comment submitted successfully!");
    } catch (e: any) {
      console.error(e);
      alert("Failed to submit comment: " + e.message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Student name</label>
        <input
          value={studentName}
          onChange={(event) =>
            setDrafts((prev) => ({ ...prev, [`${draftKey}-student`]: event.target.value }))
          }
          placeholder="Enter student name"
          className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-indigo-400 transition focus:ring"
        />
      </div>

      {knownStudents.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
          <label className="mb-2 block text-xs uppercase tracking-wide text-slate-400">Previously entered students (click to select)</label>
          <div className="flex flex-wrap gap-2">
            {knownStudents.map((stud) => (
              <button
                key={stud}
                onClick={() =>
                  setDrafts((prev) => ({ ...prev, [`${draftKey}-student`]: stud }))
                }
                className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200 transition hover:bg-indigo-600 hover:text-white"
              >
                {stud}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Academic Year</label>
        <select
          value={academicYear}
          onChange={(event) =>
            setDrafts((prev) => ({ ...prev, [`${draftKey}-year`]: event.target.value }))
          }
          className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-indigo-400 transition focus:ring"
        >
          <option value="">Select Year</option>
          <option value="2024/2025">2024/2025</option>
          <option value="2025/2026">2025/2026</option>
          <option value="2026/2027">2026/2027</option>
        </select>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Term</label>
        <select
          value={term}
          onChange={(event) =>
            setDrafts((prev) => ({ ...prev, [`${draftKey}-term`]: event.target.value }))
          }
          className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-indigo-400 transition focus:ring"
        >
          <option value="">Select term</option>
          <option value="Term 1">Term 1</option>
          <option value="Term 2">Term 2</option>
          <option value="Term 3">Term 3</option>
        </select>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Sex</label>
        <select
          value={sex}
          onChange={(event) =>
            setDrafts((prev) => ({ ...prev, [`${draftKey}-sex`]: event.target.value }))
          }
          className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-indigo-400 transition focus:ring"
        >
          <option value="">Select Sex</option>
          <option value="MALE">MALE</option>
          <option value="FEMALE">FEMALE</option>
        </select>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Conduct</label>
        <select
          value={conduct}
          onChange={(event) =>
            setDrafts((prev) => ({ ...prev, [`${draftKey}-conduct`]: event.target.value }))
          }
          className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-indigo-400 transition focus:ring"
        >
          <option value="">Select Conduct</option>
          {["Exemplary", "Excellent", "Cooperative", "Respectful", "Courteous", "Commendable", "Satisfactory", "Good", "Fair", "Acceptable"].map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Attitude</label>
        <select
          value={attitude}
          onChange={(event) =>
            setDrafts((prev) => ({ ...prev, [`${draftKey}-attitude`]: event.target.value }))
          }
          className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-indigo-400 transition focus:ring"
        >
          <option value="">Select Attitude</option>
          {["Positive", "Motivated", "Diligent", "Proactive", "Cheerful", "Outstanding", "Satisfactory", "Improving", "Fair", "Compliant", "Inconsistent", "Indifferent"].map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Interest</label>
        <select
          value={interest}
          onChange={(event) =>
            setDrafts((prev) => ({ ...prev, [`${draftKey}-interest`]: event.target.value }))
          }
          className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-indigo-400 transition focus:ring"
        >
          <option value="">Select Interest</option>
          {["Computing", "Robotics", "Coding", "Science", "Mathematics", "Engineering", "Electronics", "Reading", "Writing", "Literature", "Art", "Music", "Drama", "Languages", "History", "Sports", "Athletics", "Football", "Dance", "Dancing", "Colouring", "Copying", "Identification", "Debate", "Chess", "Leadership", "Volunteering"].map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Comment</label>
        <textarea
          value={commentText}
          onChange={(event) => setDrafts((prev) => ({ ...prev, [draftKey]: event.target.value }))}
          placeholder="Write your comment report..."
          className="min-h-24 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-indigo-400 transition focus:ring"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-slate-400">Your comments for this class: {teacherReportsForClass.length}</p>
          <button
            onClick={handleSendComment}
            className="rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 px-3 py-2 text-sm font-medium transition hover:brightness-110"
          >
            Send Comment
          </button>
        </div>
      </div>

      {teacherReportsForClass.length > 0 && (
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 font-semibold text-amber-200">
            <span>📤</span> Your submitted comments ({teacherReportsForClass.length})
          </h4>
          
          <div className="space-y-4">
            {teacherGroupedReports.map((year) => {
              const yearKey = `teacher-${schoolClassId}-${year.yearName}`;
              const isYearOpen = expandedTeacherYear === yearKey;

              return (
                <div key={yearKey} className="rounded-xl border border-white/10 bg-slate-950/40 p-2">
                  <button
                    onClick={() => setExpandedTeacherYear(prev => prev === yearKey ? null : yearKey)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-white/5 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400">📅</span>
                      <span className="font-semibold text-slate-200">{year.yearName}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isYearOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isYearOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 space-y-3 overflow-hidden ml-4 border-l border-white/10 pl-3"
                      >
                        {year.terms.map((term) => {
                          const termKey = `${yearKey}-${term.termName}`;
                          const isTermOpen = expandedTeacherTerm === termKey;

                          return (
                            <div key={termKey} className="space-y-2">
                              <button
                                onClick={() => setExpandedTeacherTerm(prev => prev === termKey ? null : termKey)}
                                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-white/5 transition"
                              >
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-emerald-400">📝</span>
                                  <span className="font-medium text-slate-300">{term.termName}</span>
                                  <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded-full bg-slate-800">
                                    {term.reports.length} comments
                                  </span>
                                </div>
                                <ChevronDown className={`h-3 w-3 text-slate-500 transition-transform ${isTermOpen ? "rotate-180" : ""}`} />
                              </button>

                              <AnimatePresence>
                                {isTermOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-1 space-y-2 overflow-hidden ml-2"
                                  >
                                    {term.reports.map((report) => (
                                      <div
                                        key={report.id}
                                        className="group relative rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-3"
                                      >
                                        {editingId === report.id ? (
                                          <div className="space-y-2">
                                            <input
                                              value={editStudentName}
                                              onChange={(event) => setEditStudentName(event.target.value)}
                                              placeholder="Student name"
                                              className="w-full rounded-lg border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-indigo-400 transition focus:ring"
                                            />
                                            <select
                                              value={editSex}
                                              onChange={(e) => setEditSex(e.target.value)}
                                              className="w-full rounded-lg border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-400"
                                            >
                                              <option value="">Select Sex</option>
                                              <option value="MALE">MALE</option>
                                              <option value="FEMALE">FEMALE</option>
                                            </select>
                                            <select
                                              value={editConduct}
                                              onChange={(e) => setEditConduct(e.target.value)}
                                              className="w-full rounded-lg border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-400"
                                            >
                                              <option value="">Select Conduct</option>
                                              {["Exemplary", "Excellent", "Cooperative", "Respectful", "Courteous", "Commendable", "Satisfactory", "Good", "Fair", "Acceptable"].map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                              ))}
                                            </select>
                                            <select
                                              value={editAttitude}
                                              onChange={(e) => setEditAttitude(e.target.value)}
                                              className="w-full rounded-lg border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-400"
                                            >
                                              <option value="">Select Attitude</option>
                                              {["Positive", "Motivated", "Diligent", "Proactive", "Cheerful", "Outstanding", "Satisfactory", "Improving", "Fair", "Compliant", "Inconsistent", "Indifferent"].map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                              ))}
                                            </select>
                                            <select
                                              value={editInterest}
                                              onChange={(e) => setEditInterest(e.target.value)}
                                              className="w-full rounded-lg border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-400"
                                            >
                                              <option value="">Select Interest</option>
                                              {["Computing", "Robotics", "Coding", "Science", "Mathematics", "Engineering", "Electronics", "Reading", "Writing", "Literature", "Art", "Music", "Drama", "Languages", "History", "Sports", "Athletics", "Football", "Dance", "Dancing", "Colouring", "Copying", "Identification", "Debate", "Chess", "Leadership", "Volunteering"].map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                              ))}
                                            </select>
                                            <textarea
                                              value={editCommentText}
                                              onChange={(event) => setEditCommentText(event.target.value)}
                                              placeholder="Comment"
                                              className="min-h-20 w-full rounded-lg border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-indigo-400 transition focus:ring"
                                            />
                                            <div className="flex items-center gap-2">
                                              <button onClick={handleSaveEdit} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-600">Save</button>
                                              <button onClick={handleCancelEdit} className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10">Cancel</button>
                                            </div>
                                          </div>
                                        ) : (
                                          <>
                                            <div className="mb-2">
                                              <p className="text-sm font-medium text-indigo-200">{report.studentName}</p>
                                              <p className="text-[10px] text-slate-400">{new Date(report.submittedAt).toLocaleString()}</p>
                                              {report.lastEditedBy === "principal" && report.lastEditedAt && (
                                                <p className="text-[10px] text-amber-300 italic">
                                                  Edited by Principal • {new Date(report.lastEditedAt).toLocaleString()}
                                                </p>
                                              )}
                                              {report.lastEditedBy === "teacher" && report.lastEditedAt && (
                                                <p className="text-[10px] text-blue-300 italic">
                                                  Edited by You • {new Date(report.lastEditedAt).toLocaleString()}
                                                </p>
                                              )}
                                            </div>
                                            <p className="mb-2 text-sm text-slate-100">{report.comment}</p>
                                            
                                            <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
                                              {report.sex && <span className="rounded-full bg-slate-800 text-[10px] text-slate-300 px-2.5 py-0.5 font-semibold uppercase">{report.sex}</span>}
                                              {report.conduct && <span className="rounded-full bg-indigo-500/20 text-[10px] text-indigo-300 px-2.5 py-0.5">Conduct: {report.conduct}</span>}
                                              {report.attitude && <span className="rounded-full bg-emerald-500/20 text-[10px] text-emerald-300 px-2.5 py-0.5">Attitude: {report.attitude}</span>}
                                              {report.interest && <span className="rounded-full bg-amber-500/20 text-[10px] text-amber-300 px-2.5 py-0.5">Interest: {report.interest}</span>}
                                            </div>

                                            <div className="flex items-center gap-2 opacity-100 sm:opacity-0 transition group-hover:opacity-100">
                                              <button
                                                onClick={() => handleStartEdit(report)}
                                                className="flex items-center gap-1 rounded bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-500/30 transition"
                                              >
                                                <Edit2 className="h-3 w-3" />
                                                Edit
                                              </button>
                                              <button
                                                onClick={() => {
                                                  if (confirm("Delete this comment permanently?")) {
                                                    deleteComment(report.id);
                                                  }
                                                }}
                                                className="flex items-center gap-1 rounded bg-rose-500/20 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/30 transition"
                                                title="Delete only this comment"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                                Delete Comment
                                              </button>
                                              {deleteStudentCompletely && (
                                                <button
                                                  onClick={() => deleteStudentCompletely(report.classId, report.studentName)}
                                                  className="flex items-center gap-1 rounded bg-red-600/30 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-600/50 border border-red-500/40 transition"
                                                  title="Permanently delete student and ALL associated test/exam/attendance data"
                                                >
                                                  <UserX className="h-3 w-3" />
                                                  Delete Student (All Data)
                                                </button>
                                              )}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

type WeeklyTestFormProps = {
  schoolClassId: string;
  activeTeacher: TeacherAccount;
  weeklyTests: WeeklyTest[];
  reports: CommentReport[];
  submitWeeklyTest: (data: Omit<WeeklyTest, "id" | "submittedAt" | "calculatedScore">) => Promise<void>;
  deleteWeeklyTest: (id: string) => Promise<void>;
  updateWeeklyTest?: (id: string, score: number, maxScore: number) => Promise<void>;
};

type NurseryChecklistFormProps = {
  schoolClassId: string;
  academicYear: string;
  term: string;
  nurseryChecklists: NurseryChecklistRecord[];
  activeTeacherId: string;
  students: string[];
};

function NurseryChecklistForm({
  schoolClassId,
  academicYear: propAcademicYear,
  term: propTerm,
  nurseryChecklists,
  activeTeacherId,
  students,
}: NurseryChecklistFormProps) {
  const [academicYear, setAcademicYear] = useState(propAcademicYear || "2025/2026");
  const [term, setTerm] = useState(propTerm || "Term 1");
  const [selectedStudent, setSelectedStudent] = useState(students[0] ?? "");
  const [activeSubTab, setActiveSubTab] = useState(0);

  const subTabs = [
    { label: "Motor Co-ordination", range: [0, 5] },
    { label: "Social & Emotional", range: [5, 13] },
    { label: "Personal Independence", range: [13, 17] },
    { label: "Perception (Visual/Auditory)", range: [17, 23] },
    { label: "Environmental I", range: [23, 30] },
    { label: "Environmental II", range: [30, 36] },
    { label: "Mathematics Concepts", range: [36, 41] },
    { label: "Language & Creativity", range: [41, 52] }
  ];

  const [ratings, setRatings] = useState<Record<string, string>>({});
  const [phonicsText, setPhonicsText] = useState("");
  const [numbersText, setNumbersText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedStudent) return;
    let record = nurseryChecklists.find(
      (c) =>
        normalizeDisplayValue(c.studentName) === normalizeDisplayValue(selectedStudent) &&
        (c.classId === schoolClassId || normalizeDisplayValue(c.classId) === normalizeDisplayValue(schoolClassId)) &&
        normalizeDisplayValue(c.academicYear) === normalizeDisplayValue(academicYear) &&
        standardizeTerm(c.term) === standardizeTerm(term)
    );
    if (!record) {
      record = nurseryChecklists.find(
        (c) =>
          normalizeDisplayValue(c.studentName) === normalizeDisplayValue(selectedStudent) &&
          normalizeDisplayValue(c.academicYear) === normalizeDisplayValue(academicYear) &&
          standardizeTerm(c.term) === standardizeTerm(term)
      );
    }
    if (!record) {
      record = nurseryChecklists.find(
        (c) =>
          normalizeDisplayValue(c.studentName) === normalizeDisplayValue(selectedStudent) &&
          normalizeDisplayValue(c.academicYear) === normalizeDisplayValue(academicYear)
      );
    }
    if (!record) {
      record = nurseryChecklists.find(
        (c) =>
          normalizeDisplayValue(c.studentName) === normalizeDisplayValue(selectedStudent)
      );
    }
    if (record) {
      setRatings(record.ratings || {});
      setPhonicsText(record.phonicsText || "");
      setNumbersText(record.numbersText || "");
    } else {
      setRatings({});
      setPhonicsText("");
      setNumbersText("");
    }
  }, [selectedStudent, schoolClassId, academicYear, term, nurseryChecklists]);

  useEffect(() => {
    if (students.length > 0 && (!selectedStudent || !students.includes(selectedStudent))) {
      setSelectedStudent(students[0]);
    }
  }, [students]);

  const handleRatingChange = (qId: string, val: string) => {
    setRatings((prev) => ({ ...prev, [qId]: val }));
  };

  const handlePhonicsChange = (val: string) => {
    setPhonicsText(val.replace(/[0-9]/g, ""));
  };

  const handleNumbersChange = (val: string) => {
    setNumbersText(val.replace(/[^0-9,\-\s]/g, ""));
  };

  const handleSave = async () => {
    if (!selectedStudent) {
      alert("Please select a student.");
      return;
    }
    setIsSaving(true);
    const docId = `${selectedStudent}-${schoolClassId}-${academicYear}-${term}`.toLowerCase().replace(/\s+/g, "_").replace(/\//g, "-");
    try {
      await setDoc(doc(db, "nursery_checklist_v1", docId), {
        id: docId,
        studentName: selectedStudent,
        classId: schoolClassId,
        academicYear,
        term,
        ratings,
        phonicsText,
        numbersText,
        teacherId: activeTeacherId,
        submittedAt: new Date().toISOString()
      });
      alert("Checklist saved successfully.");
    } catch (error: any) {
      console.error("Error saving nursery checklist:", error);
      alert(`Save failed: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (students.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 text-sm">
        No students registered in this class. Please add students first.
      </div>
    );
  }

  const activeTabConfig = subTabs[activeSubTab];
  const activeQuestions = NURSERY_QUESTIONS.slice(activeTabConfig.range[0], activeTabConfig.range[1]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 rounded-xl border border-white/10 bg-slate-950/40 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 font-semibold">Select Student</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none text-white ring-amber-400 focus:ring"
            >
              {students.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 font-semibold">Academic Year</label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none text-white ring-amber-400 focus:ring"
            >
              <option value="2024/2025">2024/2025</option>
              <option value="2025/2026">2025/2026</option>
              <option value="2026/2027">2026/2027</option>
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 font-semibold">Term</label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none text-white ring-amber-400 focus:ring"
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full md:w-auto whitespace-nowrap rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-600 active:scale-[0.98] disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Checklist"}
        </button>
      </div>

      <div className="flex overflow-x-auto gap-2 rounded-xl border border-white/10 bg-slate-900/40 p-1 no-scrollbar">
        {subTabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveSubTab(idx)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeSubTab === idx ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10" : "text-slate-300 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950/20 p-4 space-y-4">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400">{activeTabConfig.label}</h4>
        
        <div className="space-y-3">
          {activeQuestions.map((q) => (
            <div key={q.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-lg bg-slate-900/40 border border-white/5">
              <span className="text-sm text-slate-200">{q.text}</span>
              <select
                value={ratings[q.id] || ""}
                onChange={(e) => handleRatingChange(q.id, e.target.value)}
                className="w-full md:w-56 rounded-lg border border-white/15 bg-slate-950/60 px-3 py-1.5 text-xs outline-none text-white ring-amber-400 focus:ring"
              >
                <option value="">Select Rating</option>
                <option value="Y">Y - YES</option>
                <option value="P/S">P/S - PARTIAL/SOMETIMES</option>
                <option value="NES">NES - NEEDS EFFORT & ATTENTION</option>
              </select>
            </div>
          ))}
        </div>

        {activeSubTab === 7 && (
          <div className="mt-6 border-t border-white/10 pt-4 space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wide text-slate-400 font-semibold">Which phonic sounds can he or she recognize and sound correctly?</label>
              <input
                type="text"
                value={phonicsText}
                onChange={(e) => handlePhonicsChange(e.target.value)}
                placeholder="e.g. s, a, t, p, i, n"
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none text-white ring-amber-400 focus:ring"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-slate-400 font-semibold">Which number can he or she recognize?</label>
              <select
                value={numbersText}
                onChange={(e) => handleNumbersChange(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none text-white ring-amber-400 focus:ring"
              >
                <option value="">-- Select Number Range --</option>
                {NUMBER_RECOGNITION_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-white/10 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Saved Checklists for {term} ({academicYear})</h4>
          <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
            nurseryChecklists.filter(c => c.classId === schoolClassId && normalizeDisplayValue(c.academicYear) === normalizeDisplayValue(academicYear) && standardizeTerm(c.term) === standardizeTerm(term)).length === students.length && students.length > 0
            ? "bg-emerald-500/20 text-emerald-400"
            : "bg-slate-800 text-slate-300"
          }`}>
            {nurseryChecklists.filter(c => c.classId === schoolClassId && normalizeDisplayValue(c.academicYear) === normalizeDisplayValue(academicYear) && standardizeTerm(c.term) === standardizeTerm(term)).length} / {students.length}
          </div>
        </div>
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
}

function WeeklyTestForm({
  schoolClassId,
  activeTeacher,
  weeklyTests,
  reports,
  submitWeeklyTest,
  deleteWeeklyTest,
  updateWeeklyTest,
}: WeeklyTestFormProps) {
  const [academicYear, setAcademicYear] = useState("");
  const [term, setTerm] = useState("Term 3");
  const [week, setWeek] = useState("Week 1");
  const [subject, setSubject] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [bulkScores, setBulkScores] = useState<Record<string, { score: string }>>({});

  // History edit state
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editScoreValue, setEditScoreValue] = useState("");
  const [editMaxScoreValue, setEditMaxScoreValue] = useState("");

  const handleStartEditTest = (test: WeeklyTest) => {
    setEditingHistoryId(test.id);
    setEditScoreValue(test.score.toString());
    setEditMaxScoreValue(test.maxScore.toString());
  };

  const handleCancelEditTest = () => {
    setEditingHistoryId(null);
    setEditScoreValue("");
    setEditMaxScoreValue("");
  };

  const handleSaveEditTest = async (testId: string) => {
    const scoreNum = parseFloat(editScoreValue);
    const maxScoreNum = parseFloat(editMaxScoreValue);
    if (isNaN(scoreNum) || isNaN(maxScoreNum) || maxScoreNum <= 0) {
      alert("Please enter valid positive numbers for Score and Max Score.");
      return;
    }
    if (updateWeeklyTest) {
      await updateWeeklyTest(testId, scoreNum, maxScoreNum);
    }
    handleCancelEditTest();
  };

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
    return Array.from(studentMap.values()).sort((a, b) => a.localeCompare(b));
  }, [reports, weeklyTests, schoolClassId]);

  const teacherTests = useMemo(() => 
    weeklyTests.filter(t => t.teacherId === activeTeacher.id && t.classId === schoolClassId),
    [weeklyTests, activeTeacher.id, schoolClassId]
  );

  const allowedSubjectIds = activeTeacher.permissions?.find(p => p.classId === schoolClassId)?.subjectIds ?? [];
  const allowedSubjects = SUBJECTS.filter(s => allowedSubjectIds.includes(s.id));
  const isTerm3WeeklyTest = normalizeDisplayValue(term) === "term 3";
  const plannedSubject = isTerm3WeeklyTest ? getTerm3WeeklySubject(week) : "";
  const subjectOptions = plannedSubject ? [{ id: "term-3-planned-subject", name: plannedSubject }] : allowedSubjects;
  const hasSubjectOption = subjectOptions.length > 0;

  useEffect(() => {
    if (plannedSubject && subject !== plannedSubject) {
      setSubject(plannedSubject);
    }
  }, [plannedSubject, subject]);

  useEffect(() => {
    if (!academicYear || !term || !week) return;
    const finalSubject = plannedSubject || getCanonicalSubjectName(subject);
    if (!finalSubject) return;

    const existingMap: Record<string, { score: string }> = {};
    allStudentsInClass.forEach((sName) => {
      const existingTest = weeklyTests.find(
        (t) =>
          t.classId === schoolClassId &&
          normalizeDisplayValue(t.studentName) === normalizeDisplayValue(sName) &&
          normalizeDisplayValue(t.academicYear) === normalizeDisplayValue(academicYear) &&
          normalizeDisplayValue(t.term) === normalizeDisplayValue(term) &&
          normalizeDisplayValue(t.weekLabel) === normalizeDisplayValue(week) &&
          subjectNamesMatch(t.subject, finalSubject)
      );
      if (existingTest) {
        existingMap[sName] = { score: String(existingTest.score) };
      }
    });
    setBulkScores(existingMap);
  }, [schoolClassId, academicYear, term, week, subject, plannedSubject, allStudentsInClass, weeklyTests]);

  const handleBulkSubmit = async () => {
    const entries = Object.entries(bulkScores ?? {}).filter(([_, data]) => data.score.trim() !== "");
    if (entries.length === 0) return;
    const finalSubject = plannedSubject || getCanonicalSubjectName(subject);

    if (!academicYear) {
      alert("Please select an Academic Year before submitting.");
      return;
    }
    if (!term) {
      alert("Please select a Term before submitting.");
      return;
    }
    if (!finalSubject.trim()) {
      alert("Please enter a Subject (e.g. Mathematics) before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      for (const [sName, data] of entries) {
        const parsedScore = parseFloat(data.score);
        const parsedMax = parseFloat(maxScore);
        
        if (isNaN(parsedScore) || isNaN(parsedMax)) continue;

        await submitWeeklyTest({
          teacherId: activeTeacher.id,
          teacherName: activeTeacher.fullName,
          classId: schoolClassId,
          studentName: sName,
          academicYear,
          term: "Term 3",
          weekLabel: week,
          subject: finalSubject,
          score: parsedScore,
          maxScore: parsedMax,
          remark: "",
        });
      }
      setBulkScores({});
      alert(`Successfully submitted ${entries.length} test scores!`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [expandedYear, setExpandedYear] = useState<string | null>(null);

  const groupedByYear = useMemo(() => {
    const groups: Record<string, Record<string, Record<string, WeeklyTest[]>>> = {};
    
    // Sort to ensure consistent grouping order
    const sortedTests = [...teacherTests].sort((a, b) => {
      const yearA = a.academicYear || "";
      const yearB = b.academicYear || "";
      if (yearA !== yearB) return yearB.localeCompare(yearA);

      const termA = a.term || "";
      const termB = b.term || "";
      if (termA !== termB) return termA.localeCompare(termB);

      const weekA = parseInt((a.weekLabel || "").replace(/\D/g, "")) || 0;
      const weekB = parseInt((b.weekLabel || "").replace(/\D/g, "")) || 0;
      if (weekA !== weekB) return weekA - weekB;

      const subA = a.subject || "";
      const subB = b.subject || "";
      if (subA !== subB) return subA.localeCompare(subB);

      const nameA = a.studentName || "";
      const nameB = b.studentName || "";
      return nameA.localeCompare(nameB);
    });

    sortedTests.forEach(t => {
      if (!groups[t.academicYear]) groups[t.academicYear] = {};
      if (!groups[t.academicYear][t.term]) groups[t.academicYear][t.term] = {};
      if (!groups[t.academicYear][t.term][t.weekLabel]) groups[t.academicYear][t.term][t.weekLabel] = [];
      groups[t.academicYear][t.term][t.weekLabel].push(t);
    });
    return groups;
  }, [teacherTests]);

  const handleBulkSubmitCount = Object.keys(bulkScores ?? {}).filter(k => (bulkScores ?? {})[k]?.score?.trim() !== "").length;


  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Bulk Input ({allStudentsInClass.length} Students)</h3>
        </div>
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
              Academic Year <span className="text-rose-500">*</span>
            </label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className={`w-full rounded-xl border bg-slate-950/60 px-3 py-2 text-sm outline-none transition focus:ring ${
                !academicYear ? "border-rose-500/60 ring-rose-500/40 focus:ring" : "border-white/15 ring-amber-400"
              }`}
            >
              <option value="">-- Select Year --</option>
              <option value="2024/2025">2024/2025</option>
              <option value="2025/2026">2025/2026</option>
              <option value="2026/2027">2026/2027</option>
            </select>
            {!academicYear && <p className="mt-1 text-[10px] text-rose-400">Required before submitting</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
              Term <span className="text-rose-500">*</span>
            </label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className={`w-full rounded-xl border bg-slate-950/60 px-3 py-2 text-sm outline-none transition focus:ring ${
                !term ? "border-rose-500/60 ring-rose-500/40 focus:ring" : "border-white/15 ring-amber-400"
              }`}
            >
              <option value="">-- Select Term --</option>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
            {!term && <p className="mt-1 text-[10px] text-rose-400">Required before submitting</p>}
          </div>
        </div>
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Week</label>
            <select
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring"
            >
              {Array.from({ length: 13 }, (_, i) => `Week ${i + 1}`).map(w => (
                <option key={w}>{w}</option>
              ))}
            </select>
            {isTerm3WeeklyTest && (
              <p className="mt-1 text-[10px] text-amber-400">
                Term 3 plan: {getTerm3WeeklySubject(week) || "No weekly subject mapped yet"}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
              Subject <span className="text-rose-500">*</span>
            </label>
            {hasSubjectOption ? (
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={Boolean(plannedSubject)}
                className={`w-full rounded-xl border bg-slate-950/60 px-3 py-2 text-sm outline-none transition focus:ring disabled:cursor-not-allowed disabled:opacity-80 ${!subject ? "border-rose-500/60 ring-rose-500/40 focus:ring" : "border-white/15 ring-amber-400"}`}
              >
                <option value="">-- Select Subject --</option>
                {subjectOptions.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            ) : (
              <p className="text-xs text-rose-400">No subjects assigned for this class. Ask admin to assign subjects.</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Max Score (Raw)</label>
            <input
              type="number"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              placeholder="100"
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3.5 py-2.5 text-base font-medium outline-none ring-amber-400 transition focus:ring"
            />
          </div>
        </div>

        <div className="max-h-[500px] overflow-y-auto rounded-xl border border-white/5 mobile-table-container">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-slate-950 text-[10px] md:text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 md:px-4 py-3 font-semibold">Student Name</th>
                <th className="px-3 md:px-4 py-3 font-semibold w-32 md:w-44">Raw</th>
                <th className="px-3 md:px-4 py-3 font-semibold text-center">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {allStudentsInClass.map(sName => (
                <tr key={sName} className="hover:bg-white/5 tap-highlight">
                  <td className="px-3 md:px-4 py-3 text-slate-200 text-xs md:text-sm">{sName}</td>
                  <td className="px-3 md:px-4 py-3">
                    <input
                      type="number"
                      value={bulkScores[sName]?.score || ""}
                      onChange={(e) => setBulkScores(prev => ({
                        ...prev,
                        [sName]: { ...prev[sName], score: e.target.value }
                      }))}
                      placeholder="0"
                      className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3.5 py-2.5 text-sm md:text-base font-semibold outline-none focus:ring-2 focus:ring-amber-500 text-white transition"
                    />
                  </td>
                  <td className="px-3 md:px-4 py-3 text-center text-amber-400 font-bold text-xs md:text-sm">
                    {bulkScores[sName]?.score && maxScore ? ((parseFloat(bulkScores[sName].score) / parseFloat(maxScore)) * 20).toFixed(2) : "0.00"}
                  </td>
                </tr>
              ))}
              {allStudentsInClass.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-500 italic">
                    No students found. Add them in the Comments tab.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        
        <button
          onClick={handleBulkSubmit}
          disabled={isSubmitting || handleBulkSubmitCount === 0 || !academicYear || !term || !hasSubjectOption}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 py-3 font-bold text-slate-950 transition hover:brightness-110 disabled:opacity-50"
        >
          {!academicYear || !term
            ? "Select Year & Term to submit"
            : isSubmitting
            ? "Submitting Bulk Scores..."
            : `Submit Scores for ${handleBulkSubmitCount} Students`}
        </button>
      </div>

      <div className="space-y-3">
        <h4 className="flex items-center gap-2 font-semibold text-amber-200">
          <span>📅</span> Test History
        </h4>
        {Object.entries(groupedByYear).map(([year, terms]) => (
          <div key={year} className="space-y-2">
            <button
              onClick={() => setExpandedYear(expandedYear === year ? null : year)}
              className="flex w-full items-center justify-between rounded-lg bg-white/5 p-2 text-left"
            >
              <span className="text-sm font-medium">{year}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${expandedYear === year ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {expandedYear === year && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3 overflow-hidden pl-4"
                >
                  {Object.entries(terms).map(([termName, weeks]) => (
                    <div key={termName} className="space-y-2">
                      <p className="text-xs font-semibold text-amber-400/70 uppercase tracking-widest">{termName}</p>
                      {Object.entries(weeks).map(([weekName, tests]) => (
                        <div key={weekName} className="rounded-xl border border-white/5 bg-slate-900/40 p-3">
                          <p className="mb-2 text-xs font-medium text-slate-400 underline decoration-amber-500/30">{weekName}</p>
                          <div className="space-y-2">
                            {tests.map(test => (
                              <div key={test.id} className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                {editingHistoryId === test.id ? (
                                  <div className="flex flex-wrap items-center justify-between gap-2 w-full bg-slate-950/80 p-2 rounded-lg border border-amber-500/30">
                                    <div>
                                      <p className="text-xs font-semibold text-amber-300">{test.studentName} — <span className="text-slate-300">{test.subject}</span></p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px] text-slate-400">Score:</span>
                                          <input
                                            type="number"
                                            value={editScoreValue}
                                            onChange={(e) => setEditScoreValue(e.target.value)}
                                            className="w-24 rounded-lg border border-white/20 bg-slate-900 px-2.5 py-1 text-xs md:text-sm font-semibold outline-none text-white focus:ring-1 focus:ring-amber-400"
                                          />
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px] text-slate-400">/ Max:</span>
                                          <input
                                            type="number"
                                            value={editMaxScoreValue}
                                            onChange={(e) => setEditMaxScoreValue(e.target.value)}
                                            className="w-24 rounded-lg border border-white/20 bg-slate-900 px-2.5 py-1 text-xs md:text-sm font-semibold outline-none text-white focus:ring-1 focus:ring-amber-400"
                                          />
                                        </div>
                                        <span className="text-[10px] font-bold text-amber-400">
                                          ({(parseFloat(editScoreValue) && parseFloat(editMaxScoreValue) ? (parseFloat(editScoreValue) / parseFloat(editMaxScoreValue) * 20).toFixed(2) : "0.00")}/20)
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => handleSaveEditTest(test.id)}
                                        className="rounded bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-600 transition"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={handleCancelEditTest}
                                        className="rounded border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-white/10 transition"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div>
                                      <p className="text-sm font-medium">{test.studentName}</p>
                                      <p className="text-[10px] text-slate-400">
                                        Subject: {test.subject} • Score: {test.score}/{test.maxScore} <span className="font-bold text-amber-400">({test.calculatedScore}/20)</span>
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleStartEditTest(test)}
                                        className="text-blue-400 hover:text-blue-300 transition"
                                        title="Edit score and max score"
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => confirm("Delete this entry?") && deleteWeeklyTest(test.id)}
                                        className="text-rose-400 hover:text-rose-300 transition"
                                        title="Delete entry"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
        {teacherTests.length === 0 && <p className="text-center text-xs text-slate-500 py-4">No tests recorded yet.</p>}
      </div>
    </div>
  );
}

type MidtermFormProps = {
  schoolClassId: string;
  activeTeacher: TeacherAccount;
  midterms: Midterm[];
  reports: CommentReport[];
  submitMidterm: (data: Omit<Midterm, "id" | "submittedAt" | "calculatedScore">) => Promise<void>;
  deleteMidterm: (id: string) => Promise<void>;
};

function MidtermForm({
  schoolClassId,
  activeTeacher,
  midterms,
  reports,
  submitMidterm,
  deleteMidterm,
}: MidtermFormProps) {
  const [academicYear, setAcademicYear] = useState("");
  const [term, setTerm] = useState("");
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
    (reports || []).forEach(r => { if (r.classId === schoolClassId || normalizeDisplayValue(r.classId) === normalizeDisplayValue(schoolClassId)) addName(r.studentName); });
    (midterms || []).forEach(m => { if (m.classId === schoolClassId || normalizeDisplayValue(m.classId) === normalizeDisplayValue(schoolClassId)) addName(m.studentName); });
    return Array.from(studentMap.values()).sort((a, b) => a.localeCompare(b));
  }, [reports, midterms, schoolClassId]);

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
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring"
            >
              <option value="">-- Select Year --</option>
              <option value="2024/2025">2024/2025</option>
              <option value="2025/2026">2025/2026</option>
              <option value="2026/2027">2026/2027</option>
            </select>
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
                        className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-4 py-3.5 text-base font-semibold outline-none transition focus:ring-2 focus:ring-amber-500 text-white"
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
};

function SBAFieldForm({
  schoolClassId,
  activeTeacher,
  sbaRecords,
  reports,
  submitSbaRecord,
  mode,
  title,
  label,
  maxScore,
}: SBAFieldFormProps) {
  const [academicYear, setAcademicYear] = useState("");
  const [term, setTerm] = useState("");
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
    (reports || []).forEach(r => { if (r.classId === schoolClassId || normalizeDisplayValue(r.classId) === normalizeDisplayValue(schoolClassId)) addName(r.studentName); });
    (sbaRecords || []).forEach(s => { if (s.classId === schoolClassId || normalizeDisplayValue(s.classId) === normalizeDisplayValue(schoolClassId)) addName(s.studentName); });
    return Array.from(studentMap.values()).sort((a, b) => a.localeCompare(b));
  }, [reports, sbaRecords, schoolClassId]);

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
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring"
            >
              <option value="">-- Select Year --</option>
              <option value="2024/2025">2024/2025</option>
              <option value="2025/2026">2025/2026</option>
              <option value="2026/2027">2026/2027</option>
            </select>
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
                      className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-4 py-3 text-base font-semibold outline-none focus:ring-2 focus:ring-amber-500 text-white transition"
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

function SBAReportPanel({
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
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring"
            >
              <option value="">-- Select Year --</option>
              <option value="2024/2025">2024/2025</option>
              <option value="2025/2026">2025/2026</option>
              <option value="2026/2027">2026/2027</option>
            </select>
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

function AdminWeeklyReport({
  weeklyTests,
  teacherAccounts: _teacherAccounts,
  classLookup,
  readOnly = false,
}: AdminWeeklyReportProps) {
  const [yearFilter, setYearFilter] = useState("2024/2025");
  const [termFilter, setTermFilter] = useState("Term 3");
  const [classFilter, setClassFilter] = useState("all");
  const [weekFilter, setWeekFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");

  // expanded state: week -> class -> subject
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"table" | "analytics">("table");
  const [analyticsClass, setAnalyticsClass] = useState<string>("");
  const [analyticsStudent, setAnalyticsStudent] = useState<string>("");
  const [isNormalizingTerm3, setIsNormalizingTerm3] = useState(false);

  const term3WeeklyUpdates = useMemo(() => {
    return weeklyTests
      .filter((test) => test.id && weeklyTestNeedsTerm3Update(test))
      .map((test) => ({
        test,
        fields: getTerm3WeeklyTestFields(test.weekLabel, test.subject, test.classId),
      }));
  }, [weeklyTests]);

  const handleNormalizeTerm3WeeklyTests = async () => {
    if (term3WeeklyUpdates.length === 0) {
      alert("All weekly test records are already under Term 3 with the planned subjects.");
      return;
    }

    const shouldContinue = window.confirm(
      `This will update ${term3WeeklyUpdates.length} weekly test record(s), move them to Term 3, and apply the Week 1-11 subject plan. Continue?`
    );
    if (!shouldContinue) return;

    setIsNormalizingTerm3(true);
    try {
      for (let index = 0; index < term3WeeklyUpdates.length; index += 450) {
        const batch = writeBatch(db);
        term3WeeklyUpdates.slice(index, index + 450).forEach(({ test, fields }) => {
          batch.set(doc(db, "weekly_reports_v1", test.id), fields, { merge: true });
        });
        await batch.commit();
      }

      setTermFilter("Term 3");
      setWeekFilter("");
      setSubjectFilter("");
      setExpandedWeek(null);
      setExpandedClass(null);
      setExpandedSubject(null);
      alert(`Updated ${term3WeeklyUpdates.length} weekly test record(s) for Term 3.`);
    } catch (error: any) {
      console.error("Failed to normalize weekly tests:", error);
      alert(`Failed to update weekly tests: ${error.message || "Unknown error"}`);
    } finally {
      setIsNormalizingTerm3(false);
    }
  };

  const handleRemoveUnknownSubject = async () => {
    const testsToDelete = weeklyTests.filter(t => t.subject === "Unknown Subject");
    
    if (testsToDelete.length === 0) {
      alert("No 'Unknown Subject' tests found.");
      return;
    }
    const shouldContinue = window.confirm(`Found ${testsToDelete.length} tests marked as 'Unknown Subject'. These will be permanently deleted. Continue?`);
    if (!shouldContinue) return;
    
    setIsNormalizingTerm3(true);
    try {
      const batch = writeBatch(db);
      let count = 0;
      testsToDelete.forEach(test => {
        batch.delete(doc(db, "weekly_reports_v1", test.id));
        count++;
      });
      await batch.commit();
      alert(`Deleted ${count} tests.`);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsNormalizingTerm3(false);
    }
  };

  const uniqueWeeks = useMemo(() => {
    const weeks = new Set<string>();
    weeklyTests.forEach(t => {
      const matchYear = !yearFilter || t.academicYear === yearFilter;
      const matchTerm = !termFilter || t.term === termFilter;
      const matchClass = classFilter === "all" || t.classId === classFilter;
      if (matchYear && matchTerm && matchClass && t.weekLabel) {
        weeks.add(t.weekLabel.trim());
      }
    });
    return Array.from(weeks).sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ""), 10);
      const nb = parseInt(b.replace(/\D/g, ""), 10);
      return na - nb;
    });
  }, [weeklyTests, yearFilter, termFilter, classFilter]);

  const uniqueSubjects = useMemo(() => {
    const subjects = new Set<string>();
    weeklyTests.forEach(t => {
      const matchYear = !yearFilter || t.academicYear === yearFilter;
      const matchTerm = !termFilter || t.term === termFilter;
      const matchClass = classFilter === "all" || t.classId === classFilter;
      const matchWeek = !weekFilter || t.weekLabel === weekFilter;
      if (matchYear && matchTerm && matchClass && matchWeek && t.subject) {
        subjects.add(getCanonicalSubjectName(t.subject));
      }
    });
    return Array.from(subjects).sort();
  }, [weeklyTests, yearFilter, termFilter, classFilter, weekFilter]);

  const filteredTests = useMemo(() => {
    return weeklyTests.filter(t => {
      const matchYear = !yearFilter || t.academicYear === yearFilter;
      const matchTerm = !termFilter || t.term === termFilter;
      const matchClass = classFilter === "all" || t.classId === classFilter;
      const matchWeek = !weekFilter || t.weekLabel === weekFilter;
      const matchSubject = !subjectFilter || subjectNamesMatch(t.subject, subjectFilter);
      return matchYear && matchTerm && matchClass && matchWeek && matchSubject;
    });
  }, [weeklyTests, yearFilter, termFilter, classFilter, weekFilter, subjectFilter]);

  // Group: week -> classId -> subject -> tests[]
  const groupedByWeek = useMemo(() => {
    const weekMap = new Map<string, Map<string, Map<string, WeeklyTest[]>>>();
    filteredTests.forEach(t => {
      if (!weekMap.has(t.weekLabel)) weekMap.set(t.weekLabel, new Map());
      const classMap = weekMap.get(t.weekLabel)!;
      if (!classMap.has(t.classId)) classMap.set(t.classId, new Map());
      const subjectMap = classMap.get(t.classId)!;
      const subjectKey = getCanonicalSubjectName(t.subject);
      if (!subjectMap.has(subjectKey)) subjectMap.set(subjectKey, []);
      subjectMap.get(subjectKey)!.push(t);
    });

    // Sort weeks numerically (Week 1, Week 2, ...)
    const sortedWeeks = Array.from(weekMap.keys()).sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ""), 10);
      const nb = parseInt(b.replace(/\D/g, ""), 10);
      return na - nb;
    });

    return sortedWeeks.map(weekLabel => {
      const classMap = weekMap.get(weekLabel)!;
      const classes = SCHOOL_CLASSES
        .filter(sc => classMap.has(sc.id))
        .map(sc => {
          const subjectMap = classMap.get(sc.id)!;
          const subjects = Array.from(subjectMap.entries())
            .map(([subject, tests]) => ({ subject, tests: tests.sort((a, b) => a.studentName.localeCompare(b.studentName)) }))
            .sort((a, b) => a.subject.localeCompare(b.subject));
          const totalSubmissions = subjects.reduce((acc, s) => acc + s.tests.length, 0);
          return { classId: sc.id, className: sc.name, subjects, totalSubmissions };
        });
      const totalSubmissions = classes.reduce((acc, c) => acc + c.totalSubmissions, 0);
      return { weekLabel, classes, totalSubmissions };
    });
  }, [filteredTests]);

  const handleExport = () => {
    if (filteredTests.length === 0) {
      alert("No data to export.");
      return;
    }
    const exportData = filteredTests
      .slice()
      .sort((a, b) => {
        const wa = parseInt(a.weekLabel.replace(/\D/g, ""), 10);
        const wb = parseInt(b.weekLabel.replace(/\D/g, ""), 10);
        if (wa !== wb) return wa - wb;
        const ca = classLookup[a.classId]?.name ?? a.classId;
        const cb = classLookup[b.classId]?.name ?? b.classId;
        if (ca !== cb) return ca.localeCompare(cb);
        if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
        return a.studentName.localeCompare(b.studentName);
      })
      .map(t => ({
        "Week": t.weekLabel,
        "Class": classLookup[t.classId]?.name ?? t.classId,
        "Subject": getCanonicalSubjectName(t.subject),
        "Student Name": t.studentName,
        "Teacher": t.teacherName,
        "Academic Year": t.academicYear,
        "Term": t.term,
        "Score (/20)": t.calculatedScore,
        "Submitted At": new Date(t.submittedAt).toLocaleString(),
      }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Weekly Report");
    const weekSuffix = weekFilter ? `_${weekFilter.replace(/\s+/g, "")}` : "";
    XLSX.writeFile(workbook, `Weekly_Report${weekSuffix}_${termFilter.replace(" ", "")}_${yearFilter.replace("/", "-")}.xlsx`);
  };

  const handlePrintOutstanding = () => {
    const perfect = filteredTests.filter(t => t.calculatedScore >= 20);
    if (perfect.length === 0) {
      alert("No perfect-score students found in the current filters.");
      return;
    }

    // Group: week -> class -> subject -> names[]
    type PrintGroup = Record<string, Record<string, Record<string, string[]>>>;
    const grouped: PrintGroup = {};
    perfect
      .slice()
      .sort((a, b) => {
        const wa = parseInt(a.weekLabel.replace(/\D/g, ""), 10);
        const wb = parseInt(b.weekLabel.replace(/\D/g, ""), 10);
        if (wa !== wb) return wa - wb;
        const ca = classLookup[a.classId]?.name ?? a.classId;
        const cb = classLookup[b.classId]?.name ?? b.classId;
        if (ca !== cb) return ca.localeCompare(cb);
        if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
        return a.studentName.localeCompare(b.studentName);
      })
      .forEach(t => {
        const cls = classLookup[t.classId]?.name ?? t.classId;
        const subjectName = getCanonicalSubjectName(t.subject);
        if (!grouped[t.weekLabel]) grouped[t.weekLabel] = {};
        if (!grouped[t.weekLabel][cls]) grouped[t.weekLabel][cls] = {};
        if (!grouped[t.weekLabel][cls][subjectName]) grouped[t.weekLabel][cls][subjectName] = [];
        grouped[t.weekLabel][cls][subjectName].push(t.studentName);
      });

    const filterSummary = [
      yearFilter ? `Year: ${yearFilter}` : "",
      termFilter ? `Term: ${termFilter}` : "",
      weekFilter ? `Week: ${weekFilter}` : "",
      classFilter !== "all" ? `Class: ${classLookup[classFilter]?.name ?? classFilter}` : "",
      subjectFilter ? `Subject: ${subjectFilter}` : "",
    ].filter(Boolean).join(" &bull; ");

    const rowsHtml = Object.entries(grouped).map(([week, classes]) =>
      Object.entries(classes).map(([cls, subjects]) =>
        Object.entries(subjects).map(([subject, names]) =>
          names.map(name => `
            <tr>
              <td>${week}</td>
              <td>${cls}</td>
              <td>${subject}</td>
              <td>${name}</td>
            </tr>`
          ).join("")
        ).join("")
      ).join("")
    ).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Outstanding Students</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #000; padding: 40px 50px; font-size: 14px; }
    .header { text-align: center; margin-bottom: 30px; }
    .stars { font-size: 26px; letter-spacing: 10px; margin-bottom: 12px; }
    .title { font-size: 40px; font-weight: 900; letter-spacing: 5px; text-transform: uppercase; color: #000; margin-bottom: 6px; }
    .subtitle { font-size: 14px; color: #000; margin-top: 6px; }
    .filter-info { font-size: 14px; color: #000; margin-top: 3px; }
    .divider { border: none; border-top: 3px solid #f59e0b; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: none; color: #000; }
    thead th { padding: 11px 16px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; text-align: left; color: #000; font-weight: 700; }
    tbody tr { border-bottom: 1px solid #000; }
    tbody tr:nth-child(even) { background: none; }
    tbody td { padding: 10px 16px; font-size: 14px; color: #000; font-weight: 700; }
    tbody td:last-child { font-weight: 800; color: #000; font-size: 15px; }
    .count { display: inline-block; margin-top: 10px; background: #fef3c7; color: #92400e; font-weight: 700; font-size: 14px; padding: 4px 12px; border-radius: 20px; }
    .footer { text-align: center; margin-top: 40px; font-size: 14px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 14px; }
    @media print {
      body { padding: 20px 30px; color: #000 !important; font-size: 14px !important; }
      * { color: #000 !important; font-weight: 700 !important; }
      table, th, td { background: none !important; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="stars">&#11088; &#127775; &#11088; &#127775; &#11088;</div>
    <div class="title">Outstanding Students</div>
    <div class="subtitle">Students who achieved a perfect score of 20/20</div>
    <div class="filter-info">${filterSummary || "All records"}</div>
    <div class="count">&#127942; ${perfect.length} student record(s)</div>
  </div>
  <hr class="divider" />
  <table>
    <thead>
      <tr>
        <th>Week</th>
        <th>Class</th>
        <th>Subject</th>
        <th>&#127942; Student Name</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="footer">
    Yeriel Bracha School &bull; YBS Academic Reporting System &bull; Printed ${new Date().toLocaleString()}
  </div>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) { alert("Pop-up blocked. Please allow pop-ups for this site."); return; }
    win.document.write(html);
    win.document.close();
  };

  const handlePrintScores = () => {
    if (filteredTests.length === 0) {
      alert("No data to print.");
      return;
    }

    // Group by Class
    const groupedByClass: Record<string, WeeklyTest[]> = {};
    filteredTests.forEach(t => {
      const className = classLookup[t.classId]?.name ?? t.classId;
      if (!groupedByClass[className]) groupedByClass[className] = [];
      groupedByClass[className].push(t);
    });

    const sortedClassNames = Object.keys(groupedByClass).sort();

    const filterSummary = [
      yearFilter ? `Year: ${yearFilter}` : "",
      termFilter ? `Term: ${termFilter}` : "",
      weekFilter ? `Week: ${weekFilter}` : "",
      classFilter !== "all" ? `Class: ${classLookup[classFilter]?.name ?? classFilter}` : "",
      subjectFilter ? `Subject: ${subjectFilter}` : "",
    ].filter(Boolean).join(" &bull; ");

    let contentHtml = "";
    sortedClassNames.forEach(className => {
      const tests = groupedByClass[className];
      // Sort by score descending (high score to lowest score), then name, then week
      tests.sort((a, b) => {
        if (b.calculatedScore !== a.calculatedScore) {
          return b.calculatedScore - a.calculatedScore;
        }
        if (a.studentName !== b.studentName) return a.studentName.localeCompare(b.studentName);
        const wa = parseInt(a.weekLabel.replace(/\D/g, ""), 10);
        const wb = parseInt(b.weekLabel.replace(/\D/g, ""), 10);
        if (wa !== wb) return wa - wb;
        return a.subject.localeCompare(b.subject);
      });

      const rowsHtml = tests.map(t => `
          <tr>
            <td class="name">${t.studentName}</td>
            <td class="subject">${getCanonicalSubjectName(t.subject)}</td>
            <td class="week">${t.weekLabel}</td>
            <td class="score">${t.calculatedScore}/20</td>
          </tr>
        `).join("");

      contentHtml += `
        <div style="margin-bottom: 40px; page-break-inside: avoid;">
          <h2 style="font-size: 20px; border-bottom: 2px solid #fbbf24; padding-bottom: 8px; margin-bottom: 15px; color: #92400e;">${className}</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
                  <tr style="background: #fffbeb; border-bottom: 2px solid #fde68a;">
                    <th class="name" style="text-align: left; padding: 10px; font-size: 14px; text-transform: uppercase; color: #92400e;">Student Name</th>
                    <th class="subject" style="text-align: left; padding: 10px; font-size: 14px; text-transform: uppercase; color: #92400e;">Subject</th>
                    <th class="week" style="text-align: left; padding: 10px; font-size: 14px; text-transform: uppercase; color: #92400e;">Week</th>
                    <th class="score" style="text-align: center; padding: 10px; font-size: 14px; text-transform: uppercase; color: #92400e;">Score</th>
                  </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Student Scores - ${filterSummary}</title>
        <style>
          @page { margin: 20mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #334155; line-height: 1.5; background: white; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; }
          .school-name { font-size: 12px; color: #fbbf24; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; }
          .report-title { font-size: 28px; font-weight: 800; color: #1e293b; margin: 5px 0; }
          .filters { font-size: 12px; color: #64748b; }
          table tr { border-bottom: 1px solid #f1f5f9; }
          table td { padding: 8px 10px; font-size: 14px; }
          table td.name { font-weight: 700; }
          table td.score { text-align: center; }
          table th.score { text-align: center; }
          .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-name">YERIEL BRACHA SCHOOL</div>
          <h1 class="report-title">Student Scores Report</h1>
          <div class="filters">${filterSummary}</div>
        </div>
        ${contentHtml}
        <div class="footer">
          Generated on ${new Date().toLocaleString()} • YBS Academic Reporting System
        </div>
        <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>
    `;

    const printWin = window.open("", "_blank", "width=900,height=700");
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
    } else {
      alert("Pop-up blocked. Please allow pop-ups for this site.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="grid gap-4 glass-card p-4 md:p-6 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Year</label>
          <select
            value={yearFilter}
            onChange={(e) => { setYearFilter(e.target.value); setSubjectFilter(""); setExpandedWeek(null); setExpandedClass(null); setExpandedSubject(null); }}
            className="w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">All Years</option>
            <option>2024/2025</option>
            <option>2025/2026</option>
            <option>2026/2027</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Term</label>
          <select
            value={termFilter}
            onChange={(e) => { setTermFilter(e.target.value); setSubjectFilter(""); setExpandedWeek(null); setExpandedClass(null); setExpandedSubject(null); }}
            className="w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">All Terms</option>
            <option>Term 1</option>
            <option>Term 2</option>
            <option>Term 3</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Class</label>
          <select
            value={classFilter}
            onChange={(e) => { setClassFilter(e.target.value); setWeekFilter(""); setSubjectFilter(""); setExpandedWeek(null); setExpandedClass(null); setExpandedSubject(null); }}
            className="w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="all">All Classes</option>
            {SCHOOL_CLASSES.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Week</label>
          <select
            value={weekFilter}
            onChange={(e) => { setWeekFilter(e.target.value); setSubjectFilter(""); setExpandedWeek(null); setExpandedClass(null); setExpandedSubject(null); }}
            className="w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">All Weeks</option>
            {uniqueWeeks.map(week => (
              <option key={week} value={week}>{week}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Subject</label>
          <select
            value={subjectFilter}
            onChange={(e) => { setSubjectFilter(e.target.value); setExpandedWeek(null); setExpandedClass(null); setExpandedSubject(null); }}
            className="w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">All Subjects</option>
            {uniqueSubjects.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h3 className="font-semibold text-white">
            {filteredTests.length} submission(s) across {groupedByWeek.length} week(s)
          </h3>
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-slate-500">Total records in database: {weeklyTests.length}</p>
            <button onClick={() => window.location.reload()} className="text-[10px] text-emerald-400 hover:underline">
              Force Refresh
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (
            <button
              onClick={handleNormalizeTerm3WeeklyTests}
              disabled={isNormalizingTerm3 || term3WeeklyUpdates.length === 0}
              className="flex flex-1 md:flex-none items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 md:px-4 py-2.5 md:py-2 text-sm font-medium text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Settings className="h-4 w-4" />
              <span>
                {isNormalizingTerm3
                  ? "Updating..."
                  : term3WeeklyUpdates.length > 0
                  ? `Fix Term 3 (${term3WeeklyUpdates.length})`
                  : "Term 3 Ready"}
              </span>
            </button>
          )}
          {!readOnly && (
            <button
              onClick={handleRemoveUnknownSubject}
              disabled={isNormalizingTerm3}
              className="flex flex-1 md:flex-none items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 md:px-4 py-2.5 md:py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Settings className="h-4 w-4" />
              <span>Remove Unknown Subjects</span>
            </button>
          )}
          {!readOnly && (
            <button
              onClick={handlePrintScores}
              className="flex flex-1 md:flex-none items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 md:px-4 py-2.5 md:py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20"
            >
              <Printer className="h-4 w-4" />
              <span>Print Scores</span>
            </button>
          )}
          <button
            onClick={handlePrintOutstanding}
            className="flex flex-1 md:flex-none items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 md:px-4 py-2.5 md:py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20"
          >
            <span>🏆</span>
            <span>Print Outstanding</span>
          </button>
          <button
            onClick={handleExport}
            className="flex flex-1 md:flex-none items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 md:px-4 py-2.5 md:py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
          >
            <Download className="h-4 w-4" />
            <span className="hidden md:inline">Export to Excel</span>
            <span className="md:hidden">Export</span>
          </button>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 rounded-xl border border-white/10 bg-slate-900/40 p-1 no-scrollbar w-fit">
        <button
          onClick={() => setViewMode("table")}
          className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
            viewMode === "table" ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20" : "text-slate-300 hover:text-white"
          }`}
        >📋 Data Table</button>
        <button
          onClick={() => setViewMode("analytics")}
          className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
            viewMode === "analytics" ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20" : "text-slate-300 hover:text-white"
          }`}
        >📈 Analytics</button>
      </div>

      {viewMode === "analytics" ? (
        <div className="space-y-4 glass-card p-6">
          <p className="text-sm text-slate-400">Select a class and student to view their overall progress across all subjects.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Select Class</label>
              <select
                value={analyticsClass}
                onChange={(e) => { setAnalyticsClass(e.target.value); setAnalyticsStudent(""); }}
                className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring"
              >
                <option value="">-- Choose a class --</option>
                {SCHOOL_CLASSES.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {analyticsClass && (
              <div>
                <label className="mb-1 block text-xs text-slate-400">Select Student</label>
                <select
                  value={analyticsStudent}
                  onChange={(e) => setAnalyticsStudent(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-amber-400 transition focus:ring"
                >
                  <option value="">-- Choose a student --</option>
                  {Array.from(new Set(
                    weeklyTests.filter(t => t.classId === analyticsClass).map(t => t.studentName)
                  )).sort().map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          {analyticsClass && analyticsStudent && (
            <StudentProgressChart 
              tests={weeklyTests.filter(t => t.classId === analyticsClass && t.studentName === analyticsStudent)} 
              studentName={analyticsStudent} 
            />
          )}
        </div>
      ) : (
        <>
          {/* Week → Class → Subject accordion */}
          {groupedByWeek.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-slate-900/40 px-4 py-10 text-center text-slate-500 italic">
              No records found for the selected filters.
            </div>
          ) : (
            <div className="space-y-3">
              {groupedByWeek.map(weekBucket => {
            const isWeekOpen = expandedWeek === weekBucket.weekLabel;
            return (
              <div key={weekBucket.weekLabel} className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden">
                {/* Week header */}
                <button
                  onClick={() => {
                    setExpandedWeek(prev => prev === weekBucket.weekLabel ? null : weekBucket.weekLabel);
                    setExpandedClass(null);
                    setExpandedSubject(null);
                  }}
                  className="flex w-full items-center justify-between px-3 md:px-4 py-3 text-left transition hover:bg-white/5"
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className="text-sm md:text-base">📅</span>
                    <span className="font-bold text-amber-300 text-sm md:text-base">{weekBucket.weekLabel}</span>
                    <span className="rounded-full bg-amber-500/20 px-1.5 md:px-2 py-0.5 text-[9px] md:text-[10px] font-medium text-amber-300">
                      {weekBucket.classes.length} class(es)
                    </span>
                    <span className="hidden md:inline rounded-full bg-slate-700/60 px-2 py-0.5 text-[10px] text-slate-400">
                      {weekBucket.totalSubmissions} submission(s)
                    </span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isWeekOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {isWeekOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-t border-white/5"
                    >
                      <div className="space-y-2 p-3">
                        {weekBucket.classes.map(cls => {
                          const classKey = `${weekBucket.weekLabel}::${cls.classId}`;
                          const isClassOpen = expandedClass === classKey;
                          return (
                            <div key={classKey} className="rounded-xl border border-white/5 bg-slate-950/40 overflow-hidden">
                              {/* Class header */}
                              <button
                                onClick={() => {
                                  setExpandedClass(prev => prev === classKey ? null : classKey);
                                  setExpandedSubject(null);
                                }}
                                className="flex w-full items-center justify-between px-4 py-2.5 text-left transition hover:bg-white/5"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-sm">🏫</span>
                                  <span className="font-semibold text-white">{cls.className}</span>
                                  <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                                    {cls.subjects.length} subject(s)
                                  </span>
                                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-400">
                                    {cls.totalSubmissions} submission(s)
                                  </span>
                                </div>
                                <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${isClassOpen ? "rotate-180" : ""}`} />
                              </button>

                              <AnimatePresence>
                                {isClassOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden border-t border-white/5"
                                  >
                                    <div className="space-y-2 p-3">
                                      {cls.subjects.map(subjectBucket => {
                                        const subjectKey = `${classKey}::${subjectBucket.subject}`;
                                        const isSubjectOpen = expandedSubject === subjectKey;
                                        const avg = (
                                          subjectBucket.tests.reduce((s, t) => s + t.calculatedScore, 0) /
                                          subjectBucket.tests.length
                                        ).toFixed(2);
                                        return (
                                          <div key={subjectKey} className="rounded-xl border border-white/5 bg-slate-900/60 overflow-hidden">
                                            {/* Subject header */}
                                            <button
                                              onClick={() => setExpandedSubject(prev => prev === subjectKey ? null : subjectKey)}
                                              className="flex w-full items-center justify-between px-3 md:px-4 py-2 text-left transition hover:bg-white/5"
                                            >
                                              <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                                                <span className="text-xs shrink-0">📚</span>
                                                <span className="font-medium text-slate-200 text-xs md:text-sm truncate">{subjectBucket.subject}</span>
                                                <span className="shrink-0 text-[9px] md:text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-full">
                                                  {subjectBucket.tests.length}
                                                </span>
                                                <span className="shrink-0 text-[9px] md:text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                                                  {avg}/20
                                                </span>
                                              </div>
                                              <ChevronDown className={`h-3 w-3 text-slate-500 shrink-0 transition-transform ${isSubjectOpen ? "rotate-180" : ""}`} />
                                            </button>

                                            <AnimatePresence>
                                              {isSubjectOpen && (
                                                <motion.div
                                                  initial={{ opacity: 0, height: 0 }}
                                                  animate={{ opacity: 1, height: "auto" }}
                                                  exit={{ opacity: 0, height: 0 }}
                                                  className="overflow-hidden border-t border-white/5"
                                                >
                                                  <div className="mobile-table-container">
                                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                                      <thead className="bg-white/5 text-[10px] md:text-xs uppercase tracking-wider text-slate-400">
                                                        <tr>
                                                          <th className="px-3 py-2 font-semibold w-10 text-center">#</th>
                                                          <th className="px-3 md:px-4 py-2 font-semibold">Student</th>
                                                          <th className="px-3 md:px-4 py-2 font-semibold">Teacher</th>
                                                          <th className="px-3 md:px-4 py-2 font-semibold text-center">Score</th>
                                                        </tr>
                                                      </thead>
                                                      <tbody className="divide-y divide-white/5">
                                                        {subjectBucket.tests
                                                          .slice()
                                                          .sort((a, b) => b.calculatedScore - a.calculatedScore)
                                                          .map((test, idx) => {
                                                            const isPerfect = test.calculatedScore >= 20;
                                                            const rankEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`;
                                                            return (
                                                              <tr
                                                                key={test.id}
                                                                className={`transition tap-highlight ${
                                                                  isPerfect
                                                                    ? 'bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10'
                                                                    : idx === 0
                                                                    ? 'bg-amber-500/5'
                                                                    : 'hover:bg-white/5'
                                                                }`}
                                                              >
                                                                <td className="px-3 py-2.5 text-center text-xs md:text-sm font-bold">
                                                                  {rankEmoji}
                                                                </td>
                                                                <td className="px-3 md:px-4 py-2.5">
                                                                  {isPerfect ? (
                                                                    <span
                                                                      className="font-bold text-xs md:text-sm"
                                                                      style={{
                                                                        background: 'linear-gradient(90deg, #f59e0b, #ef4444, #8b5cf6, #3b82f6, #10b981, #f59e0b)',
                                                                        backgroundSize: '200% auto',
                                                                        WebkitBackgroundClip: 'text',
                                                                        WebkitTextFillColor: 'transparent',
                                                                        animation: 'rainbowShift 2s linear infinite',
                                                                      }}
                                                                    >
                                                                      {test.studentName} 🎉
                                                                    </span>
                                                                  ) : (
                                                                    <span className={`font-medium text-xs md:text-sm ${
                                                                      idx === 0 ? 'text-amber-200' :
                                                                      idx === 1 ? 'text-slate-300' :
                                                                      idx === 2 ? 'text-orange-300' :
                                                                      'text-slate-400'
                                                                    }`}>{test.studentName}</span>
                                                                  )}
                                                                </td>
                                                                <td className="px-3 md:px-4 py-2.5 text-slate-400 text-xs">{test.teacherName}</td>
                                                                <td className="px-3 md:px-4 py-2.5 text-center">
                                                                  <span className={`font-bold text-xs md:text-sm ${
                                                                    isPerfect ? 'text-yellow-400 text-base' :
                                                                    idx === 0 ? 'text-amber-400' :
                                                                    'text-slate-300'
                                                                  }`}>
                                                                    {test.calculatedScore}/20
                                                                    {isPerfect && <span className="ml-1 text-[10px]">✨</span>}
                                                                  </span>
                                                                </td>
                                                              </tr>
                                                            );
                                                          })}
                                                      </tbody>
                                                    </table>
                                                  </div>
                                                </motion.div>
                                              )}
                                            </AnimatePresence>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
      </>
      )}
    </div>
  );
}

type AdminReportSettingsProps = {
  reportSettings: ReportSettingsRecord[];
};

function AdminReportSettings({ reportSettings }: AdminReportSettingsProps) {
  const [selectedYear, setSelectedYear] = useState("2025/2026");
  const [selectedTerm, setSelectedTerm] = useState("Term 1");
  const [vacationDate, setVacationDate] = useState("");
  const [reopeningDate, setReopeningDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const config = reportSettings.find(
      (s) => s.academicYear === selectedYear && s.term === selectedTerm
    );
    if (config) {
      setVacationDate(config.vacationDate);
      setReopeningDate(config.reopeningDate);
    } else {
      setVacationDate("");
      setReopeningDate("");
    }
  }, [selectedYear, selectedTerm, reportSettings]);

  const handleSave = async () => {
    if (!selectedYear || !selectedTerm) {
      alert("Please select year and term.");
      return;
    }
    setIsSaving(true);
    try {
      const docId = `${selectedYear.replace("/", "_")}_${selectedTerm.replace(" ", "_")}`;
      await setDoc(doc(db, "report_settings_v1", docId), {
        id: docId,
        academicYear: selectedYear,
        term: selectedTerm,
        vacationDate: vacationDate.trim(),
        reopeningDate: reopeningDate.trim(),
      });
      alert("Settings saved successfully!");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      alert("Error saving settings: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Academic Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none text-white focus:ring-2 focus:ring-amber-500"
          >
            <option value="2024/2025">2024/2025</option>
            <option value="2025/2026">2025/2026</option>
            <option value="2026/2027">2026/2027</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Term</label>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none text-white focus:ring-2 focus:ring-amber-500"
          >
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
        </div>
      </div>

      <div className="space-y-3 pt-3 border-t border-white/5">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Vacation Date / Report Date (e.g. THURSDAY, 18TH DEC., 2025)</label>
          <input
            type="text"
            value={vacationDate}
            onChange={(e) => setVacationDate(e.target.value)}
            placeholder="e.g. THURSDAY, 18TH DEC., 2025"
            className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none text-white focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">School Reopens Date (e.g. MONDAY, 5TH JANUARY, 2026)</label>
          <input
            type="text"
            value={reopeningDate}
            onChange={(e) => setReopeningDate(e.target.value)}
            placeholder="e.g. MONDAY, 5TH JANUARY, 2026"
            className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none text-white focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="mt-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-50"
      >
        {isSaving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}

type PortalLoginProps = {
  title: string;
  subtitle: string;
  colorClass: string;
  username: string;
  password: string;
  showPassword: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onLogin: () => void;
};

function PortalLogin({
  title,
  subtitle,
  colorClass,
  username,
  password,
  showPassword,
  onUsernameChange,
  onPasswordChange,
  onTogglePassword,
  onLogin,
}: PortalLoginProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-2xl border border-white/10 bg-slate-900/65 p-4"
    >
      <div className={`mb-3 h-1.5 w-16 rounded-full bg-gradient-to-r ${colorClass}`} />
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mb-4 text-sm text-slate-300">{subtitle}</p>
      <div className="space-y-2">
        <input
          value={username}
          onChange={(event) => onUsernameChange(event.target.value)}
          placeholder="Username"
          className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm outline-none ring-cyan-400 transition focus:ring"
        />
        <div className="relative">
          <input
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 pr-10 text-sm outline-none ring-cyan-400 transition focus:ring"
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <button
          onClick={onLogin}
          className={`w-full rounded-xl bg-gradient-to-r px-3 py-2 font-semibold text-white transition hover:brightness-110 ${colorClass}`}
        >
          Login
        </button>
      </div>
    </motion.div>
  );
}


export function StudentProgressChart({ tests, studentName }: { tests: WeeklyTest[], studentName?: string }) {
  const allWeeks = useMemo(() => {
    return Array.from(new Set(tests.map(t => t.weekLabel))).sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ""), 10);
      const nb = parseInt(b.replace(/\D/g, ""), 10);
      return na - nb;
    });
  }, [tests]);

  const series = useMemo(() => {
    // Calculate average score across all subjects for each week
    const data = allWeeks.map(w => {
      const testsInWeek = tests.filter(t => t.weekLabel === w);
      if (testsInWeek.length === 0) return null;
      const sum = testsInWeek.reduce((acc, t) => acc + t.calculatedScore, 0);
      return Number((sum / testsInWeek.length).toFixed(2));
    });
    
    return [
      { 
        type: 'bar' as const,
        data, 
        label: "Score (Bar)", 
        color: '#f59e0b', // amber-500
      },
      {
        type: 'line' as const,
        data,
        label: "Trend (Line)",
        color: '#fcd34d', // amber-300
        curve: "monotoneX" as const,
      }
    ];
  }, [allWeeks, tests]);

  if (tests.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-white/5 bg-slate-900/40">
        <p className="text-sm text-slate-500 italic">No test data available to visualize.</p>
      </div>
    );
  }

  // 2px per week slot + 44px for margins → very thin touching bars
  const minChartWidth = allWeeks.length * 2 + 44;

  return (
    <ThemeProvider theme={darkTheme}>
      <div className="w-full rounded-2xl border border-white/10 bg-slate-900/60 p-3">
        {studentName && (
          <h4 className="mb-2 text-center text-sm font-bold text-amber-400">
            {studentName}'s Overall Progress
          </h4>
        )}
        {/* Horizontal scroll on mobile so bars don't get squashed */}
        <div className="w-full overflow-x-auto">
          <div style={{ minWidth: `${minChartWidth}px`, height: '507px' }}>
            <ChartsContainer
              xAxis={[{
                scaleType: 'band',
                data: allWeeks,
                categoryGapRatio: 0,    // No space between bars
                barGapRatio: 0,          // No margin between bars
                colorMap: {
                  type: 'ordinal',
                  colors: [
                    '#f59e0b', '#10b981', '#3b82f6', '#ec4899',
                    '#8b5cf6', '#f97316', '#06b6d4', '#84cc16',
                    '#e11d48', '#a855f7', '#14b8a6', '#facc15',
                  ]
                },
                tickLabelStyle: { fill: '#94a3b8', fontSize: 10 }
              }]}
              yAxis={[{
                min: 0,
                max: 20,
                tickNumber: 5,
                tickLabelStyle: { fill: '#94a3b8', fontSize: 10 }
              }]}
              series={series}
              margin={{ top: 10, right: 10, bottom: 35, left: 32 }}
              sx={{
                '.MuiBarElement-root': { rx: 1 },
                '.MuiLineElement-root': {
                  strokeWidth: 1.5,
                  stroke: '#ffffff',
                },
                '.MuiMarkElement-root': {
                  r: 2,
                  fill: '#ffffff',
                  stroke: '#ffffff',
                },
              }}
            >
              <BarPlot />
              <LinePlot />
              <MarkPlot />
              <ChartsXAxis />
              <ChartsYAxis />
              <ChartsTooltip />
            </ChartsContainer>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

function AdminDataEditor({
  schoolClasses,
  teachers,
  reports,
  weeklyTests,
  midterms,
  sbaRecords,
  termAttendanceRecords,
  updateComment,
  deleteComment,
  submitWeeklyTest,
  deleteWeeklyTest,
  submitMidterm,
  deleteMidterm,
  submitSbaRecord,
  deleteSbaRecord,
  submitTermAttendance,
  deleteStudentCompletely,
}: any) {
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [activeTab, setActiveTab] = useState<"comments" | "weekly-tests" | "midterms" | "project-work" | "group-work" | "exams" | "attendance" | "students">("weekly-tests");
  const [viewMode, setViewMode] = useState<"cards" | "workspace">("cards");

  const [isCleaning, setIsCleaning] = useState(false);

  const selectedClass = schoolClasses.find((c: any) => c.id === selectedClassId);
  
  const allStudentsInClass = useMemo(() => {
    if (!selectedClassId) return [];
    const set = new Set<string>();
    reports.filter((r: any) => r.classId === selectedClassId).forEach((r: any) => set.add(r.studentName.trim()));
    (weeklyTests || []).filter((t: any) => t.classId === selectedClassId).forEach((t: any) => set.add(t.studentName.trim()));
    (midterms || []).filter((m: any) => m.classId === selectedClassId).forEach((m: any) => set.add(m.studentName.trim()));
    (sbaRecords || []).filter((s: any) => s.classId === selectedClassId).forEach((s: any) => set.add(s.studentName.trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [selectedClassId, reports, weeklyTests, midterms, sbaRecords]);
  
  const classTeachers = useMemo(() => {
    if (!selectedClassId) return [];
    return teachers.filter((t: any) => t.classIds.includes(selectedClassId));
  }, [selectedClassId, teachers]);

  const activeTeacher = useMemo(() => {
    return classTeachers.find((t: any) => t.id === selectedTeacherId) || null;
  }, [classTeachers, selectedTeacherId]);

  const staleOrphanCount = useMemo(() => {
    if (!selectedClassId) return 0;
    const validStudentKeys = new Set(
      reports.filter((r: any) => r.classId === selectedClassId).map((r: any) => normalizeDisplayValue(r.studentName))
    );
    if (validStudentKeys.size === 0) return 0;

    let count = 0;
    (weeklyTests || []).forEach((t: any) => {
      if (t.classId === selectedClassId && !validStudentKeys.has(normalizeDisplayValue(t.studentName))) count++;
    });
    (midterms || []).forEach((m: any) => {
      if (m.classId === selectedClassId && !validStudentKeys.has(normalizeDisplayValue(m.studentName))) count++;
    });
    (sbaRecords || []).forEach((s: any) => {
      if (s.classId === selectedClassId && !validStudentKeys.has(normalizeDisplayValue(s.studentName))) count++;
    });
    return count;
  }, [selectedClassId, reports, weeklyTests, midterms, sbaRecords]);

  const handleCleanStaleRecords = async () => {
    if (!selectedClassId) {
      alert("Please select a class first.");
      return;
    }
    const className = schoolClasses.find((c: any) => c.id === selectedClassId)?.name || selectedClassId;
    const validStudentKeys = new Set(
      reports.filter((r: any) => r.classId === selectedClassId).map((r: any) => normalizeDisplayValue(r.studentName))
    );

    if (validStudentKeys.size === 0) {
      alert(`No registered students found in comments for ${className}. Create student comments first before cleaning orphaned test records.`);
      return;
    }

    if (!confirm(`Are you sure you want to clean up ${staleOrphanCount} orphaned test & SBA record(s) for ${className}? This will purge test entries for students who are no longer registered in comments.`)) {
      return;
    }

    setIsCleaning(true);
    try {
      const batch = writeBatch(db);
      let opCount = 0;

      (weeklyTests || []).forEach((t: any) => {
        if (t.classId === selectedClassId && !validStudentKeys.has(normalizeDisplayValue(t.studentName))) {
          batch.delete(doc(db, "weekly_reports_v1", t.id));
          opCount++;
        }
      });
      (midterms || []).forEach((m: any) => {
        if (m.classId === selectedClassId && !validStudentKeys.has(normalizeDisplayValue(m.studentName))) {
          batch.delete(doc(db, "midterm_records_v1", m.id));
          opCount++;
        }
      });
      (sbaRecords || []).forEach((s: any) => {
        if (s.classId === selectedClassId && !validStudentKeys.has(normalizeDisplayValue(s.studentName))) {
          batch.delete(doc(db, "sba_records_v1", s.id));
          opCount++;
        }
      });

      if (opCount > 0) {
        await batch.commit();
        alert(`Successfully cleaned up ${opCount} orphaned test & SBA record(s) for ${className}!`);
      } else {
        alert(`No orphaned records found for ${className}.`);
      }
    } catch (err: any) {
      console.error("Error cleaning stale records:", err);
      alert("Error cleaning stale records: " + err.message);
    } finally {
      setIsCleaning(false);
    }
  };

  useEffect(() => {
    setSelectedTeacherId("");
  }, [selectedClassId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row items-end">
        <label className="flex flex-col flex-1 w-full">
          <span className="mb-1 text-sm text-slate-400">Select Class</span>
          <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500">
            <option value="">-- Select Class --</option>
            {schoolClasses.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col flex-1 w-full">
          <span className="mb-1 text-sm text-slate-400">Select Teacher to impersonate</span>
          <select value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500" disabled={!selectedClassId}>
            <option value="">-- Select Teacher --</option>
            {classTeachers.map((t: any) => (
              <option key={t.id} value={t.id}>{t.fullName}</option>
            ))}
          </select>
        </label>

        {selectedClassId && staleOrphanCount > 0 && (
          <button
            onClick={handleCleanStaleRecords}
            disabled={isCleaning}
            className="flex items-center gap-2 rounded-xl bg-rose-500/20 border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/30 disabled:opacity-50 whitespace-nowrap"
            title="Clean test entries for deleted students"
          >
            <UserX className="h-4 w-4" />
            {isCleaning ? "Cleaning..." : `Purge ${staleOrphanCount} Stale Test Records`}
          </button>
        )}
      </div>

      {activeTeacher && selectedClass && (
        <div className="space-y-6">
          {/* Card Hub Presentation */}
          <DashboardCards
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            reports={reports}
            weeklyTests={weeklyTests}
            midterms={midterms}
            sbaRecords={sbaRecords}
            termAttendanceRecords={termAttendanceRecords}
            selectedClassId={selectedClassId}
            className={selectedClass?.name}
            allStudentsInClass={allStudentsInClass}
            staleOrphanCount={staleOrphanCount}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />

          {viewMode === "workspace" && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-sm">
              <div className="mb-6 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setViewMode("cards")}
                    className="flex items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-extrabold text-amber-300 transition hover:bg-amber-500/20 active:scale-95 shadow-md"
                  >
                    <span>←</span>
                    <span>Back to Cards Hub</span>
                  </button>

                  <div className="h-6 w-px bg-white/10" />

                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-amber-400 tracking-wider">Active Workspace</span>
                    <h3 className="text-base font-extrabold text-white uppercase tracking-wide">
                      {activeTab.replace("-", " ")}
                    </h3>
                  </div>
                </div>
              </div>

          <div className="mt-4">
            {activeTab === "comments" && (
              <TeacherCommentForm
                schoolClassId={selectedClassId}
                activeTeacher={activeTeacher}
                reports={reports}
                updateComment={updateComment}
                deleteComment={deleteComment}
                deleteStudentCompletely={deleteStudentCompletely}
              />
            )}
            {activeTab === "weekly-tests" && (
              <WeeklyTestForm
                schoolClassId={selectedClassId}
                activeTeacher={activeTeacher}
                weeklyTests={weeklyTests}
                reports={reports}
                submitWeeklyTest={submitWeeklyTest}
                deleteWeeklyTest={deleteWeeklyTest}
              />
            )}
            {activeTab === "midterms" && (
              <MidtermForm
                schoolClassId={selectedClassId}
                activeTeacher={activeTeacher}
                midterms={midterms}
                reports={reports}
                submitMidterm={submitMidterm}
                deleteMidterm={deleteMidterm}
              />
            )}
            {activeTab === "project-work" && (
              <SBAFieldForm
                mode="project"
                schoolClassId={selectedClassId}
                activeTeacher={activeTeacher}
                sbaRecords={sbaRecords}
                reports={reports}
                submitSbaRecord={submitSbaRecord}
                title="Project Work Input"
                label="Project Work"
                maxScore={10}
              />
            )}
            {activeTab === "group-work" && (
              <SBAFieldForm
                mode="group"
                schoolClassId={selectedClassId}
                activeTeacher={activeTeacher}
                sbaRecords={sbaRecords}
                reports={reports}
                submitSbaRecord={submitSbaRecord}
                title="Group Work Input"
                label="Group Work"
                maxScore={10}
              />
            )}
            {activeTab === "exams" && (
              <SBAFieldForm
                mode="exam"
                schoolClassId={selectedClassId}
                activeTeacher={activeTeacher}
                sbaRecords={sbaRecords}
                reports={reports}
                submitSbaRecord={submitSbaRecord}
                title="Exam Score Input"
                label="Exam Score"
                maxScore={100}
              />
            )}
            {activeTab === "attendance" && (
              <AttendancePanel
                schoolClassId={selectedClassId}
                activeTeacher={activeTeacher}
                termAttendanceRecords={termAttendanceRecords}
                reports={reports}
                weeklyTests={weeklyTests}
                midterms={midterms}
                sbaRecords={sbaRecords}
                submitTermAttendance={submitTermAttendance}
              />
            )}
            {activeTab === "students" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h4 className="text-lg font-semibold text-white">Student Management ({allStudentsInClass.length})</h4>
                    <p className="text-xs text-slate-400">Permanently delete students and all their associated academic records from the system.</p>
                  </div>
                </div>
                {allStudentsInClass.length === 0 ? (
                  <p className="py-6 text-center text-sm italic text-slate-500">No students registered in this class.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {allStudentsInClass.map((studentName) => {
                      const commentCount = reports.filter((r: any) => r.classId === selectedClassId && r.studentName.trim() === studentName.trim()).length;
                      const testCount = (weeklyTests || []).filter((t: any) => t.classId === selectedClassId && t.studentName.trim() === studentName.trim()).length;
                      const midtermCount = (midterms || []).filter((m: any) => m.classId === selectedClassId && m.studentName.trim() === studentName.trim()).length;
                      const sbaCount = (sbaRecords || []).filter((s: any) => s.classId === selectedClassId && s.studentName.trim() === studentName.trim()).length;
                      const totalCount = commentCount + testCount + midtermCount + sbaCount;

                      return (
                        <div key={studentName} className="flex flex-col justify-between rounded-xl border border-white/10 bg-slate-950/40 p-4 transition hover:border-white/20">
                          <div>
                            <h5 className="font-semibold text-slate-100">{studentName}</h5>
                            <p className="mt-1 text-xs text-slate-400">
                              {totalCount} total records ({commentCount} comments, {testCount} tests, {midtermCount} midterms, {sbaCount} SBA)
                            </p>
                          </div>
                          <button
                            onClick={() => deleteStudentCompletely && deleteStudentCompletely(selectedClassId, studentName)}
                            className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-red-500/40 bg-red-600/20 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-600/40"
                            title="Permanently delete this student and all associated records"
                          >
                            <UserX className="h-4 w-4" />
                            Delete Student Permanently
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )}

  <AnimatePresence>
    {isPromoteModalOpen && (
      <PromoteStudentsModal
        isOpen={isPromoteModalOpen}
        onClose={() => setIsPromoteModalOpen(false)}
        reports={reports}
        weeklyTests={weeklyTests}
        midterms={midterms}
        sbaRecords={sbaRecords}
        nurseryChecklists={nurseryChecklists}
        termAttendanceRecords={termAttendanceRecords}
      />
    )}
  </AnimatePresence>
</div>
  );
}
