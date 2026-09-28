import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDdM4AEmL4JWndMhLWajXbtJXMsahQDhD0",
  authDomain: "tracha-582ef.firebaseapp.com",
  projectId: "tracha-582ef",
  storageBucket: "tracha-582ef.firebasestorage.app",
  messagingSenderId: "451915114079",
  appId: "1:451915114079:web:1447d4cb641b2ff8091dea",
};

const targetStudents = [
  "Maxwell Partey",
  "Cheryl Kpabitey",
  "Christabel Odamtten",
  "Efya Aboagyewaa Ntiakoh",
  "Gilbert Agbenu",
  "Christabel Dzatse",
  "Fadilah Husseini",
  "Justina Nyameye Adebi Boampong",
  "Shallom Etornam Nartey",
  "Jared Adade",
  "Elinam Yingor Agbleke",
  "Jayden Wepare Maaweh",
  "Sery Emmanuella",
  "Samuel Adu Darko",
];

const applyChanges = process.argv.includes("--apply");
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

function normalize(value) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function run() {
  await signInAnonymously(auth);
  const snapshot = await getDocs(collection(db, "weekly_reports_v1"));
  const records = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
  const expected = targetStudents.map((studentName) => {
    const matches = records.filter((record) =>
      normalize(record.studentName) === normalize(studentName) &&
      normalize(record.academicYear) === "2026 2027" &&
      normalize(record.term) === "term 3" &&
      normalize(record.weekLabel) === "week 3" &&
      normalize(record.subject) === "english language"
    );
    const basic8 = matches.filter((record) =>
      normalize(record.classId) === "basic 8" &&
      normalize(record.teacherName) === "thomas kuji womvana"
    );
    const basic9 = matches.filter((record) =>
      normalize(record.classId) === "basic 9" &&
      normalize(record.teacherName) === "gifty owusu"
    );
    return { studentName, basic8, basic9 };
  });

  const invalid = expected.filter(({ basic8, basic9 }) => basic8.length > 1 || basic9.length !== 1);
  if (invalid.length > 0) {
    console.error("Safety check failed. No records were changed:");
    console.table(invalid.map(({ studentName, basic8, basic9 }) => ({
      studentName,
      ThomasBasic8Matches: basic8.length,
      GiftyBasic9Matches: basic9.length,
    })));
    process.exitCode = 1;
    return;
  }

  const deletions = expected.flatMap(({ basic8 }) => basic8);
  const retainedBasic9 = expected.filter(({ basic9 }) => basic9.length === 1).length;
  console.log(`Confirmed Basic 8 copies to remove: ${deletions.length}`);
  console.table(deletions.map((record) => ({
    studentName: record.studentName,
    teacherName: record.teacherName,
    classId: record.classId,
    score: record.score,
    maxScore: record.maxScore,
    id: record.id,
  })));
  console.log(`Confirmed Basic 9 records to retain: ${retainedBasic9}`);
  if (deletions.length === 0) {
    console.log("Verification passed: cleanup is already complete.");
    return;
  }
  console.log(applyChanges ? "Mode: APPLY" : "Mode: PREVIEW ONLY");
  if (!applyChanges) return;

  for (let index = 0; index < deletions.length; index += 450) {
    const batch = writeBatch(db);
    deletions.slice(index, index + 450).forEach((record) => {
      batch.delete(doc(db, "weekly_reports_v1", record.id));
    });
    await batch.commit();
  }

  console.log(`Removed ${deletions.length} Basic 8 copies. Gifty Owusu's Basic 9 scores remain.`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});