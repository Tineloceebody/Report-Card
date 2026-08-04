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

async function convertKg1WeeklyTests() {
  console.log("Authenticating with Firebase...");
  await signInAnonymously(auth);
  console.log("Authenticated successfully ✓\n");

  const snapshot = await getDocs(collection(db, "weekly_reports_v1"));
  const batch = writeBatch(db);
  let convertedCount = 0;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.classId === "kindergarten-1" || data.classId === "kg-1" || data.classId === "kg1") {
      const currentScore = Number(data.score) || 0;
      const currentMaxScore = Number(data.maxScore) || 100;
      
      // Calculate scaled score over 20
      const scaledScore = Math.round((currentScore / currentMaxScore) * 20 * 100) / 100;
      const newMaxScore = 20;

      console.log(
        `Converting [${docSnap.id}] - Student: "${data.studentName}", Subject: "${data.subject}", Week: "${data.weekLabel}": ` +
        `score: ${currentScore}/${currentMaxScore} -> ${scaledScore}/${newMaxScore}`
      );

      const ref = doc(db, "weekly_reports_v1", docSnap.id);
      batch.update(ref, {
        score: scaledScore,
        maxScore: newMaxScore,
        calculatedScore: scaledScore
      });
      convertedCount++;
    }
  });

  if (convertedCount === 0) {
    console.log("No matching Kindergarten 1 weekly test records found.");
    process.exit(0);
  }

  console.log(`\nCommitting updates for ${convertedCount} Kindergarten 1 weekly test records to Firestore...`);
  await batch.commit();
  console.log(`✅ Successfully converted ${convertedCount} Kindergarten 1 weekly test record(s) from /100 to /20 scale!`);
  process.exit(0);
}

convertKg1WeeklyTests().catch((err) => {
  console.error("❌ Error during conversion:", err);
  process.exit(1);
});
