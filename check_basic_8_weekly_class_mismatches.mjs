import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDdM4AEmL4JWndMhLWajXbtJXMsahQDhD0",
  authDomain: "tracha-582ef.firebaseapp.com",
  projectId: "tracha-582ef",
  storageBucket: "tracha-582ef.firebasestorage.app",
  messagingSenderId: "451915114079",
  appId: "1:451915114079:web:1447d4cb641b2ff8091dea"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const normalize = (value) => (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function check() {
  await signInAnonymously(auth);
  const [weeklySnapshot, reportsSnapshot, midtermsSnapshot, sbaSnapshot, attendanceSnapshot, teachersSnapshot] = await Promise.all([
    getDocs(collection(db, "weekly_reports_v1")),
    getDocs(collection(db, "reports")),
    getDocs(collection(db, "midterms_v1")),
    getDocs(collection(db, "sba_records_v1")),
    getDocs(collection(db, "term_attendance_v1")),
    getDocs(collection(db, "teachers")),
  ]);

  const teacherClasses = new Map();
  teachersSnapshot.forEach((docSnap) => {
    const teacher = docSnap.data();
    teacherClasses.set(teacher.fullName, teacher.classIds ?? []);
  });

  const basic9Students = new Set();
  for (const snapshot of [reportsSnapshot, midtermsSnapshot, sbaSnapshot, attendanceSnapshot]) {
    snapshot.forEach((docSnap) => {
      const record = docSnap.data();
      if (normalize(record.classId) !== "basic 9") return;
      basic9Students.add([
        normalize(record.studentName),
        normalize(record.academicYear),
        normalize(record.term),
      ].join("|"));
    });
  }

  const basic8Weekly = [];
  const basic9WeeklyRecords = new Map();
  weeklySnapshot.forEach((docSnap) => {
    const test = docSnap.data();
    const key = [
      normalize(test.studentName),
      normalize(test.academicYear),
      normalize(test.term),
    ].join("|");
    if (normalize(test.classId) === "basic 8") {
      basic8Weekly.push({ id: docSnap.id, key, test });
    } else if (normalize(test.classId) === "basic 9") {
      const weeklyKey = [
        key,
        normalize(test.weekLabel),
        normalize(test.subject),
      ].join("|");
      const matches = basic9WeeklyRecords.get(weeklyKey) ?? [];
      matches.push({ id: docSnap.id, test });
      basic9WeeklyRecords.set(weeklyKey, matches);
    }
  });

  const basic9Evidence = basic8Weekly
    .filter(({ key }) => basic9Students.has(key))
    .map(({ id, test }) => ({
      id,
      studentName: test.studentName,
      academicYear: test.academicYear,
      term: test.term,
      weekLabel: test.weekLabel,
      subject: test.subject,
      classId: test.classId,
      evidence: "Student also has a Basic 9 report record",
    }));

  const duplicateClassEntries = basic8Weekly.flatMap(({ id, key, test }) => {
    const weeklyKey = [key, normalize(test.weekLabel), normalize(test.subject)].join("|");
    return (basic9WeeklyRecords.get(weeklyKey) ?? []).map(({ id: basic9Id, test: basic9Test }) => ({
      studentName: test.studentName,
      academicYear: test.academicYear,
      term: test.term,
      weekLabel: test.weekLabel,
      subject: test.subject,
      basic8Id: id,
      basic8Teacher: test.teacherName,
      basic8Score: test.score,
      basic8MaxScore: test.maxScore,
      basic9Id,
      basic9Teacher: basic9Test.teacherName,
      basic9Score: basic9Test.score,
      basic9MaxScore: basic9Test.maxScore,
    }));
  });

  console.log(`Basic 8 weekly-test records: ${basic8Weekly.length}`);
  console.log("Teachers assigned to Basic 8/9:");
  console.table(Array.from(teacherClasses, ([teacherName, classIds]) => ({ teacherName, classIds: classIds.join(", ") }))
    .filter(({ classIds }) => classIds.includes("basic-8") || classIds.includes("basic-9")));
  console.log(`Basic 8 weekly records with Basic 9 student evidence: ${basic9Evidence.length}`);
  console.table(basic9Evidence);
  console.log(`Same-student/week/subject entries split across Basic 8 and Basic 9: ${duplicateClassEntries.length}`);
  console.table(duplicateClassEntries);
  process.exit(0);
}

check().catch((error) => {
  console.error(error);
  process.exit(1);
});