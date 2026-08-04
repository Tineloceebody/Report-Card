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

async function diagnose() {
  console.log("Authenticating...");
  await signInAnonymously(auth);
  console.log("Authenticated ✓\n");

  const classes = ["basic-2", "kindergarten-1"];
  const snapshot = await getDocs(collection(db, "weekly_reports_v1"));

  console.log("Found weekly tests records:");
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (classes.includes(data.classId)) {
      console.log(`- ID: ${docSnap.id}`);
      console.log(`  Student: ${data.studentName}`);
      console.log(`  Class: ${data.classId}`);
      console.log(`  Subject: ${data.subject}`);
      console.log(`  Week: ${data.weekLabel}`);
      console.log(`  Term: ${data.term}`);
      console.log(`  Year: ${data.academicYear}`);
      console.log(`  Score: ${data.score}`);
      console.log(`  Calculated: ${data.calculatedScore}`);
    }
  });

  process.exit(0);
}

diagnose().catch(err => {
  console.error(err);
  process.exit(1);
});
