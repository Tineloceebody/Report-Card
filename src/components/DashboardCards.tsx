import React, { useMemo } from "react";
import { 
  FileText, 
  Target, 
  Users, 
  Award, 
  Calendar, 
  MessageSquare, 
  UserX, 
  Plus,
  ClipboardList,
  CheckSquare,
  BookOpen,
  PieChart,
  KeyRound,
  ChevronRight
} from "lucide-react";

export type TabId = 
  | "comments"
  | "weekly-tests" 
  | "midterms" 
  | "project-work" 
  | "group-work" 
  | "exam"
  | "exams"
  | "sba"
  | "attendance" 
  | "weekly-report"
  | "checklist"
  | "students"
  | "change-password";

interface DashboardCardsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  reports?: any[];
  weeklyTests?: any[];
  midterms?: any[];
  sbaRecords?: any[];
  termAttendanceRecords?: any[];
  nurseryChecklists?: any[];
  selectedClassId?: string;
  className?: string;
  allStudentsInClass?: string[];
  staleOrphanCount?: number;
  viewMode?: "cards" | "workspace";
  setViewMode?: (mode: "cards" | "workspace") => void;
  isNurseryClass?: boolean;
}

interface CardDefinition {
  id: TabId;
  title: string;
  icon: React.ElementType;
  gradient: string;
  borderGlow: string;
  accentText: string;
  bgLight: string;
  categoryTag: string;
  nurseryOnly?: boolean;
  primaryOnly?: boolean;
  getStat: (ctx: {
    reports: any[];
    weeklyTests: any[];
    midterms: any[];
    sbaRecords: any[];
    termAttendanceRecords: any[];
    nurseryChecklists: any[];
    selectedClassId?: string;
    studentCount: number;
  }) => { primary: string; secondary: string };
  badgeText: string;
  buttonLabel: string;
}

const CARDS: CardDefinition[] = [
  {
    id: "comments",
    title: "Comment & Remarks",
    icon: MessageSquare,
    gradient: "from-emerald-500/25 via-green-500/15 to-emerald-950/40",
    borderGlow: "hover:border-emerald-500/70 hover:shadow-emerald-500/20",
    accentText: "text-emerald-400",
    bgLight: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
    categoryTag: "REMARKS • COMMENT",
    getStat: ({ reports, selectedClassId, studentCount }) => {
      const count = (reports || []).filter((r: any) => !selectedClassId || r.classId === selectedClassId).length;
      return {
        primary: `${count} / ${studentCount || 0}`,
        secondary: "Remarks Recorded"
      };
    },
    badgeText: "COMMENT",
    buttonLabel: "Open Remarks Form"
  },
  {
    id: "weekly-tests",
    title: "Weekly Test",
    icon: FileText,
    gradient: "from-amber-500/25 via-orange-500/15 to-amber-950/40",
    borderGlow: "hover:border-amber-500/70 hover:shadow-amber-500/20",
    accentText: "text-amber-400",
    bgLight: "bg-amber-500/15 border-amber-500/30 text-amber-300",
    categoryTag: "ASSESSMENT • WEEKLY",
    primaryOnly: true,
    getStat: ({ weeklyTests, selectedClassId }) => {
      const count = (weeklyTests || []).filter((t: any) => !selectedClassId || t.classId === selectedClassId).length;
      return {
        primary: `${count} Records`,
        secondary: "Tests Logged"
      };
    },
    badgeText: "WEEKLY",
    buttonLabel: "Enter Test Scores"
  },
  {
    id: "midterms",
    title: "Midterm Exam",
    icon: Target,
    gradient: "from-sky-500/25 via-blue-500/15 to-sky-950/40",
    borderGlow: "hover:border-sky-500/70 hover:shadow-sky-500/20",
    accentText: "text-sky-400",
    bgLight: "bg-sky-500/15 border-sky-500/30 text-sky-300",
    categoryTag: "EXAMINATION • MIDTERM",
    primaryOnly: true,
    getStat: ({ midterms, selectedClassId }) => {
      const count = (midterms || []).filter((m: any) => !selectedClassId || m.classId === selectedClassId).length;
      return {
        primary: `${count} Scores`,
        secondary: "Midterms Recorded"
      };
    },
    badgeText: "MIDTERM",
    buttonLabel: "Enter Midterm Scores"
  },
  {
    id: "project-work",
    title: "Project Work",
    icon: ClipboardList,
    gradient: "from-teal-500/25 via-emerald-500/15 to-teal-950/40",
    borderGlow: "hover:border-teal-500/70 hover:shadow-teal-500/20",
    accentText: "text-teal-400",
    bgLight: "bg-teal-500/15 border-teal-500/30 text-teal-300",
    categoryTag: "SBA • PROJECT (10%)",
    primaryOnly: true,
    getStat: ({ sbaRecords, selectedClassId }) => {
      const count = (sbaRecords || []).filter((s: any) => (!selectedClassId || s.classId === selectedClassId) && s.projectWorkScore > 0).length;
      return {
        primary: `${count} Graded`,
        secondary: "Projects (10%)"
      };
    },
    badgeText: "PROJECT",
    buttonLabel: "Enter Project Scores"
  },
  {
    id: "group-work",
    title: "Group Work",
    icon: Users,
    gradient: "from-indigo-500/25 via-purple-500/15 to-indigo-950/40",
    borderGlow: "hover:border-indigo-500/70 hover:shadow-indigo-500/20",
    accentText: "text-indigo-400",
    bgLight: "bg-indigo-500/15 border-indigo-500/30 text-indigo-300",
    categoryTag: "SBA • GROUP (10%)",
    primaryOnly: true,
    getStat: ({ sbaRecords, selectedClassId }) => {
      const count = (sbaRecords || []).filter((s: any) => (!selectedClassId || s.classId === selectedClassId) && s.groupWorkScore > 0).length;
      return {
        primary: `${count} Graded`,
        secondary: "Group Tasks (10%)"
      };
    },
    badgeText: "GROUP",
    buttonLabel: "Enter Group Scores"
  },
  {
    id: "exam",
    title: "End of Term Exam (50%)",
    icon: Award,
    gradient: "from-violet-500/25 via-fuchsia-500/15 to-violet-950/40",
    borderGlow: "hover:border-violet-500/70 hover:shadow-violet-500/20",
    accentText: "text-violet-400",
    bgLight: "bg-violet-500/15 border-violet-500/30 text-violet-300",
    categoryTag: "FINAL EXAM • 50%",
    primaryOnly: true,
    getStat: ({ sbaRecords, selectedClassId }) => {
      const count = (sbaRecords || []).filter((s: any) => (!selectedClassId || s.classId === selectedClassId) && s.examScore > 0).length;
      return {
        primary: `${count} Entered`,
        secondary: "Exams (50% Weight)"
      };
    },
    badgeText: "FINAL EXAM",
    buttonLabel: "Enter Exam Scores"
  },
  {
    id: "sba",
    title: "SBA Broadsheet",
    icon: PieChart,
    gradient: "from-purple-500/25 via-pink-500/15 to-purple-950/40",
    borderGlow: "hover:border-purple-500/70 hover:shadow-purple-500/20",
    accentText: "text-purple-400",
    bgLight: "bg-purple-500/15 border-purple-500/30 text-purple-300",
    categoryTag: "SBA • SUMMARY",
    primaryOnly: true,
    getStat: () => ({
      primary: "Automated",
      secondary: "Broadsheet Active"
    }),
    badgeText: "SBA",
    buttonLabel: "View SBA Sheet"
  },
  {
    id: "checklist",
    title: "Nursery & KG Checklist",
    icon: CheckSquare,
    gradient: "from-amber-500/25 via-yellow-500/15 to-amber-950/40",
    borderGlow: "hover:border-amber-500/70 hover:shadow-amber-500/20",
    accentText: "text-amber-400",
    bgLight: "bg-amber-500/15 border-amber-500/30 text-amber-300",
    categoryTag: "CHECKLIST • MILESTONES",
    nurseryOnly: true,
    getStat: ({ nurseryChecklists, selectedClassId }) => {
      const count = (nurseryChecklists || []).filter((c: any) => !selectedClassId || c.classId === selectedClassId).length;
      return {
        primary: `${count} Saved`,
        secondary: "Developmental Records"
      };
    },
    badgeText: "MILESTONES",
    buttonLabel: "Fill Checklist Form"
  },
  {
    id: "attendance",
    title: "Class Attendance Register",
    icon: Calendar,
    gradient: "from-cyan-500/25 via-teal-500/15 to-cyan-950/40",
    borderGlow: "hover:border-cyan-500/70 hover:shadow-cyan-500/20",
    accentText: "text-cyan-400",
    bgLight: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
    categoryTag: "REGISTER • ATTENDANCE",
    getStat: ({ termAttendanceRecords, selectedClassId }) => {
      const count = (termAttendanceRecords || []).filter((a: any) => !selectedClassId || a.classId === selectedClassId).length;
      return {
        primary: `${count} Logs`,
        secondary: "Term Attendance"
      };
    },
    badgeText: "ATTENDANCE",
    buttonLabel: "Update Attendance"
  },
  {
    id: "students",
    title: "Class Student Management",
    icon: UserX,
    gradient: "from-rose-500/25 via-pink-500/15 to-rose-950/40",
    borderGlow: "hover:border-rose-500/70 hover:shadow-rose-500/20",
    accentText: "text-rose-400",
    bgLight: "bg-rose-500/15 border-rose-500/30 text-rose-300",
    categoryTag: "ROSTER • ADMINISTRATION",
    getStat: ({ studentCount }) => {
      return {
        primary: `${studentCount || 0} Pupils`,
        secondary: "Enrolled Roster"
      };
    },
    badgeText: "ROSTER",
    buttonLabel: "Manage Class Roster"
  }
];

export const DashboardCards: React.FC<DashboardCardsProps> = ({
  activeTab,
  setActiveTab,
  reports = [],
  weeklyTests = [],
  midterms = [],
  sbaRecords = [],
  termAttendanceRecords = [],
  nurseryChecklists = [],
  selectedClassId,
  allStudentsInClass = [],
  setViewMode,
  isNurseryClass = false
}) => {
  const studentCount = allStudentsInClass.length;

  const activeCards = useMemo(() => {
    return CARDS.filter((card) => {
      if (isNurseryClass && card.primaryOnly) return false;
      if (!isNurseryClass && card.nurseryOnly) return false;
      return true;
    });
  }, [isNurseryClass]);

  return (
    <div className="space-y-6">
      {/* Sleek Grid of Cards matching modern school management UI */}
      <div className="grid gap-3 sm:gap-4.5 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
        {activeCards.map((card) => {
          const Icon = card.icon;
          const isCurrentActive = activeTab === card.id || (activeTab === "exams" && card.id === "exam");
          const stat = card.getStat({
            reports,
            weeklyTests,
            midterms,
            sbaRecords,
            termAttendanceRecords,
            nurseryChecklists,
            selectedClassId,
            studentCount
          });

          return (
            <div
              key={card.id}
              onClick={() => {
                setActiveTab(card.id);
                if (setViewMode) setViewMode("workspace");
              }}
              className={`group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border bg-slate-900/90 p-3 sm:p-4.5 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl ${
                isCurrentActive
                  ? "border-amber-400 ring-2 ring-amber-400/40"
                  : "border-white/10 hover:border-amber-400/60"
              }`}
            >
              <div>
                {/* Top Rounded Image/Icon Container with Badge */}
                <div className={`relative h-24 sm:h-32 w-full rounded-xl sm:rounded-2xl border border-white/10 bg-gradient-to-br p-2.5 sm:p-4 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-[1.02] transition-transform duration-300 ${card.gradient}`}>
                  <span className="absolute top-2 left-2 sm:top-3 sm:left-3 rounded-full bg-slate-950/85 text-amber-300 border border-amber-400/40 px-2 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-[10px] font-extrabold tracking-wider uppercase backdrop-blur-md shadow-md truncate max-w-[85%]">
                    {card.badgeText}
                  </span>

                  <Icon className={`h-8 w-8 sm:h-11 sm:w-11 transition-transform duration-300 group-hover:scale-110 ${card.accentText}`} />
                </div>

                {/* Middle Content Details */}
                <div className="mt-2.5 sm:mt-3.5 px-0.5 sm:px-1">
                  <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-wider gap-1">
                    <span className="truncate">{card.categoryTag}</span>
                    <span className="shrink-0 text-slate-200 font-bold bg-white/5 px-1.5 py-0.5 rounded-full border border-white/10">{stat.primary}</span>
                  </div>

                  <h3 className="mt-1 sm:mt-2 text-xs sm:text-base font-extrabold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                    {card.title}
                  </h3>
                  
                  <p className="mt-0.5 text-[10px] sm:text-xs text-slate-400 font-medium truncate">
                    {stat.secondary}
                  </p>
                </div>
              </div>

              {/* Bottom Solid Pill Action Button */}
              <div className="mt-2.5 sm:mt-4">
                <button
                  type="button"
                  className="w-full rounded-xl sm:rounded-2xl bg-white/10 group-hover:bg-gradient-to-r group-hover:from-amber-400 group-hover:to-yellow-400 group-hover:text-slate-950 text-white font-extrabold text-[10px] sm:text-xs py-2 sm:py-3 px-2 sm:px-4 transition-all duration-300 flex items-center justify-center gap-1 border border-white/10 group-hover:shadow-lg group-hover:shadow-amber-500/25 active:scale-95"
                >
                  <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform group-hover:rotate-90 duration-300" />
                  <span className="truncate">{card.buttonLabel}</span>
                  <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
