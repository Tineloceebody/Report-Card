const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const old_studentsInClass = `    sbaRecords.forEach((record) => {
      if (
        record.classId === classFilter &&
        normalizeDisplayValue(record.academicYear) === normalizeDisplayValue(yearFilter) &&
        normalizeDisplayValue(record.term) === normalizeDisplayValue(termFilter)
      ) {
        addStudent(record.studentName);
      }
    });

    return Array.from(studentSet).sort((a, b) => a.localeCompare(b));
  }, [reports, weeklyTests, sbaRecords, classFilter, yearFilter, termFilter]);`;

const new_studentsInClass = `    sbaRecords.forEach((record) => {
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
        record.classId === classFilter &&
        normalizeDisplayValue(record.academicYear) === normalizeDisplayValue(yearFilter) &&
        normalizeDisplayValue(record.term) === normalizeDisplayValue(termFilter)
      ) {
        addStudent(record.studentName);
      }
    });

    return Array.from(studentSet).sort((a, b) => a.localeCompare(b));
  }, [reports, weeklyTests, sbaRecords, midterms, termAttendanceRecords, nurseryChecklists, classFilter, yearFilter, termFilter]);`;

content = content.replace(old_studentsInClass, new_studentsInClass);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log("Successfully updated studentsInClass!");
