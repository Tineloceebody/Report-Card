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
  await signInAnonymously(auth);
  const snapshot = await getDocs(collection(db, "weekly_reports_v1"));
  
  console.log("WEEK 2 & 3 RECORDS FOR BASIC-2 AND KINDERGARTEN-1:");
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if ((data.classId === "basic-2" || data.classId === "kindergarten-1") && (data.weekLabel === "Week 2" || data.weekLabel === "Week 3")) {
      console.log(`- ID: ${docSnap.id}`);
      console.log(`  Student: "${data.studentName}"`);
      console.log(`  Class: "${data.classId}"`);
      console.log(`  Subject: "${data.subject}"`);
      console.log(`  Week: "${data.weekLabel}"`);
      console.log(`  Term: "${data.term}"`);
      console.log(`  Year: "${data.academicYear}"`);
    }
  });

  console.log("\nALL OTHER WEEKLY RECORDS WITH 'English' or 'RME' in Basic 2 / KG 1:");
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if ((data.classId === "basic-2" || data.classId === "kindergarten-1") && 
        (String(data.subject).toLowerCase().includes("english") || String(data.subject).toLowerCase().includes("rme") || String(data.subject).toLowerCase().includes("religious"))) {
      if (data.weekLabel !== "Week 2" && data.weekLabel !== "Week 3") {
        console.log(`- ID: ${docSnap.id}`);
        console.log(`  Student: "${data.studentName}"`);
        console.log(`  Class: "${data.classId}"`);
        console.log(`  Subject: "${data.subject}"`);
        console.log(`  Week: "${data.weekLabel}"`);
        console.log(`  Term: "${data.term}"`);
        console.log(`  Year: "${data.academicYear}"`);
      }
    }
  });

  process.exit(0);
}

diagnose().catch(err => {
  console.error(err);
  process.exit(1);
});
