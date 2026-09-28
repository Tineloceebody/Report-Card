import { ChevronLeft, ChevronRight } from "lucide-react";

type AcademicYearPickerProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  allowEmpty?: boolean;
  placeholder?: string;
};

const formatAcademicYear = (startYear: number) => `${startYear}/${startYear + 1}`;

const parseStartYear = (value: string): number | null => {
  if (!value) return null;
  const year = parseInt(value.split("/")[0], 10);
  return isNaN(year) ? null : year;
};

export function AcademicYearPicker({
  value,
  onChange,
  className = "",
  allowEmpty = false,
  placeholder = "Select Year",
}: AcademicYearPickerProps) {
  const startYear = parseStartYear(value);

  const step = (delta: number) => {
    const base = startYear ?? new Date().getFullYear();
    onChange(formatAcademicYear(base + delta));
  };

  const handleClear = () => {
    if (allowEmpty) onChange("");
  };

  return (
    <div className={`flex items-stretch rounded-xl border border-white/15 bg-slate-950/60 overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => step(-1)}
        className="px-2 text-slate-400 hover:text-white hover:bg-white/5 transition-colors flex items-center border-r border-white/10 cursor-pointer"
        aria-label="Previous year"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={allowEmpty && value ? handleClear : undefined}
        className={`flex-1 text-center text-sm py-2 px-3 select-none min-w-[7rem] ${
          value ? "text-white" : "text-slate-500"
        } ${allowEmpty && value ? "cursor-pointer hover:text-slate-300" : "cursor-default"}`}
        title={allowEmpty && value ? "Click to clear" : undefined}
      >
        {value || placeholder}
      </button>
      <button
        type="button"
        onClick={() => step(1)}
        className="px-2 text-slate-400 hover:text-white hover:bg-white/5 transition-colors flex items-center border-l border-white/10 cursor-pointer"
        aria-label="Next year"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
