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

const targetYear = "2026/2027";
const targetSubject = "English Language";
const targetWeek = "Week 3";
const applyChanges = process.argv.includes("--apply");
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const normalize = (value) => (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function run() {
  await signInAnonymously(auth);
  const snapshot = await getDocs(collection(db, "weekly_reports_v1"));
  const yearRecords = snapshot.docs.filter((entry) => normalize(entry.data().academicYear) === normalize(targetYear));
  const changes = yearRecords.filter((entry) => {
    const data = entry.data();
    return data.subject !== targetSubject || data.weekLabel !== targetWeek;
  });

  const byClass = new Map();
  const targetGroups = new Map();
  yearRecords.forEach((entry) => {
    const data = entry.data();
    const classId = data.classId ?? "(missing class)";
    byClass.set(classId, (byClass.get(classId) ?? 0) + 1);
    const key = [normalize(classId), normalize(data.studentName), normalize(data.term)].join("|");
    targetGroups.set(key, (targetGroups.get(key) ?? 0) + 1);
  });

  const duplicateTargetGroups = Array.from(targetGroups.values()).filter((count) => count > 1).length;
  console.log(`Academic year: ${targetYear}`);
  console.log(`Weekly-test records found: ${yearRecords.length}`);
  console.log(`Records requiring subject/week updates: ${changes.length}`);
  console.log(`Existing class/student/term groups with multiple records after the move: ${duplicateTargetGroups}`);
  console.table(Array.from(byClass, ([classId, count]) => ({ classId, count })));
  console.log(applyChanges ? "Mode: APPLY" : "Mode: PREVIEW ONLY");

  if (!applyChanges) return;

  for (let index = 0; index < changes.length; index += 450) {
    const batch = writeBatch(db);
    changes.slice(index, index + 450).forEach((entry) => {
      batch.update(doc(db, "weekly_reports_v1", entry.id), {
        subject: targetSubject,
        weekLabel: targetWeek,
      });
    });
    await batch.commit();
  }

  console.log(`Updated ${changes.length} records. Scores, classes, terms, and other fields were preserved.`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});