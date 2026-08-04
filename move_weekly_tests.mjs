import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";
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

const normalizeDisplayValue = (value) =>
  (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

async function moveWeeklyTests() {
  console.log("Authenticating...");
  await signInAnonymously(auth);
  console.log("Authenticated ✓\n");

  console.log("Fetching weekly tests collection...");
  const snapshot = await getDocs(collection(db, "weekly_reports_v1"));

  if (snapshot.empty) {
    console.log("No weekly tests found in Firestore.");
    process.exit(0);
  }

  const batch = writeBatch(db);
  let count = 0;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const classMatch = normalizeDisplayValue(data.classId) === "basic 6";
    const weekMatch = normalizeDisplayValue(data.weekLabel) === "week 1";
    const yearMatch = normalizeDisplayValue(data.academicYear) === "2025 2026";
    const termMatch = normalizeDisplayValue(data.term) === "term 3";

    if (classMatch && weekMatch && yearMatch && termMatch) {
      const ref = doc(db, "weekly_reports_v1", docSnap.id);
      batch.update(ref, { 
        weekLabel: "Week 2",
        subject: "English Language"
      });
      count++;
      console.log(`  Queued: Student ${data.studentName} (Doc ID: ${docSnap.id}) - original subject was: ${data.subject}`);
    }
  });

  if (count === 0) {
    console.log("No matching weekly tests found for Basic 6 Week 1 in Term 3, 2025/2026.");
    process.exit(0);
  }

  console.log(`\nFound ${count} matching records. Committing database updates...`);
  await batch.commit();
  console.log(`✅ Successfully moved ${count} weekly test record(s) to Week 2 (English Language).`);
  process.exit(0);
}

moveWeeklyTests().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
