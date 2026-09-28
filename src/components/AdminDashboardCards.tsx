import React, { useMemo } from "react";
import { 
  Users, 
  BarChart3, 
  PieChart, 
  CheckSquare, 
  Target, 
  Edit2, 
  Calendar,
  Plus,
  ChevronRight
} from "lucide-react";

export type AdminTabId = 
  | "accounts"
  | "weekly-report"
  | "sba-report"
  | "sba-nc-report"
  | "midterm-report"
  | "data-editor"
  | "report-settings"
  | "promotion";

interface AdminDashboardCardsProps {
  activeTab: string;
  setActiveTab: (tab: AdminTabId) => void;
  teacherAccounts?: any[];
  weeklyTests?: any[];
  midterms?: any[];
  sbaRecords?: any[];
  nurseryChecklists?: any[];
  viewMode?: "cards" | "workspace";
  setViewMode?: (mode: "cards" | "workspace") => void;
  onOpenPromoteModal?: () => void;
}

interface AdminCardDefinition {
  id: AdminTabId;
  title: string;
  icon: React.ElementType;
  gradient: string;
  accentText: string;
  categoryTag: string;
  badgeText: string;
  buttonLabel: string;
  getStat: (ctx: {
    teacherAccounts: any[];
    weeklyTests: any[];
    midterms: any[];
    sbaRecords: any[];
    nurseryChecklists: any[];
  }) => { primary: string; secondary: string };
}

const ADMIN_CARDS: AdminCardDefinition[] = [
  {
    id: "accounts",
    title: "Teacher Accounts",
    icon: Users,
    gradient: "from-emerald-500/25 via-green-500/15 to-emerald-950/40",
    accentText: "text-emerald-400",
    categoryTag: "ADMIN • ACCOUNTS",
    badgeText: "TEACHERS",
    buttonLabel: "Manage Accounts",
    getStat: ({ teacherAccounts }) => ({
      primary: `${(teacherAccounts || []).length} Accounts`,
      secondary: "Teacher Credentials"
    })
  },
  {
    id: "weekly-report",
    title: "Weekly Reports",
    icon: BarChart3,
    gradient: "from-amber-500/25 via-orange-500/15 to-amber-950/40",
    accentText: "text-amber-400",
    categoryTag: "REPORTS • WEEKLY",
    badgeText: "WEEKLY",
    buttonLabel: "View Weekly Reports",
    getStat: ({ weeklyTests }) => ({
      primary: `${(weeklyTests || []).length} Records`,
      secondary: "Assessment Records"
    })
  },
  {
    id: "sba-report",
    title: "SBA Broadsheet",
    icon: PieChart,
    gradient: "from-purple-500/25 via-pink-500/15 to-purple-950/40",
    accentText: "text-purple-400",
    categoryTag: "BROADSHEET • SBA",
    badgeText: "SBA",
    buttonLabel: "View SBA Sheet",
    getStat: () => ({
      primary: "Automated",
      secondary: "Class (50%) & Exam (50%)"
    })
  },
  {
    id: "sba-nc-report",
    title: "Nursery & KG SBA",
    icon: CheckSquare,
    gradient: "from-teal-500/25 via-emerald-500/15 to-teal-950/40",
    accentText: "text-teal-400",
    categoryTag: "CHECKLIST • NURSERY",
    badgeText: "NURSERY",
    buttonLabel: "View Nursery SBA",
    getStat: ({ nurseryChecklists }) => ({
      primary: `${(nurseryChecklists || []).length} Saved`,
      secondary: "Milestone Assessments"
    })
  },
  {
    id: "midterm-report",
    title: "Midterm Reports",
    icon: Target,
    gradient: "from-sky-500/25 via-blue-500/15 to-sky-950/40",
    accentText: "text-sky-400",
    categoryTag: "EXAMINATION • MIDTERM",
    badgeText: "MIDTERM",
    buttonLabel: "View Midterms",
    getStat: ({ midterms }) => ({
      primary: `${(midterms || []).length} Scores`,
      secondary: "Midterm Records"
    })
  },
  {
    id: "data-editor",
    title: "Data Editor",
    icon: Edit2,
    gradient: "from-violet-500/25 via-fuchsia-500/15 to-violet-950/40",
    accentText: "text-violet-400",
    categoryTag: "ADMIN • SYSTEM",
    badgeText: "CLEANUP",
    buttonLabel: "Open Data Editor",
    getStat: () => ({
      primary: "Maintenance",
      secondary: "Fix Roster & Orphan Logs"
    })
  },
  {
    id: "report-settings",
    title: "Report Settings",
    icon: Calendar,
    gradient: "from-cyan-500/25 via-teal-500/15 to-cyan-950/40",
    accentText: "text-cyan-400",
    categoryTag: "SYSTEM • DATES",
    badgeText: "SETTINGS",
    buttonLabel: "Manage Settings",
    getStat: () => ({
      primary: "Calendar",
      secondary: "Term & Reopening Dates"
    })
  },
  {
    id: "promotion",
    title: "Student Promotion",
    icon: Users,
    gradient: "from-emerald-500/25 via-teal-500/15 to-emerald-950/40",
    accentText: "text-emerald-400",
    categoryTag: "STUDENTS • PROMOTION",
    badgeText: "PROMOTION",
    buttonLabel: "Promote Students",
    getStat: () => ({
      primary: "Advancement",
      secondary: "Batch Promote Roster"
    })
  }
];

export const AdminDashboardCards: React.FC<AdminDashboardCardsProps> = ({
  activeTab,
  setActiveTab,
  teacherAccounts = [],
  weeklyTests = [],
  midterms = [],
  sbaRecords = [],
  nurseryChecklists = [],
  setViewMode,
  onOpenPromoteModal
}) => {
  return (
    <div className="space-y-6">
      {/* Sleek Grid of Admin Cards matching modern school management UI */}
      <div className="grid gap-3 sm:gap-4.5 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
        {ADMIN_CARDS.map((card) => {
          const Icon = card.icon;
          const isCurrentActive = activeTab === card.id;
          const stat = card.getStat({
            teacherAccounts,
            weeklyTests,
            midterms,
            sbaRecords,
            nurseryChecklists
          });

          return (
            <div
              key={card.id}
              onClick={() => {
                if (card.id === "promotion") {
                  if (onOpenPromoteModal) {
                    onOpenPromoteModal();
                  }
                  return;
                }
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
