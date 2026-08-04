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

async function check() {
  await signInAnonymously(auth);
  const snapshot = await getDocs(collection(db, "weekly_reports_v1"));
  console.log("ALL BASIC 2 WEEKLY TESTS IN DB:");
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.classId === "basic-2") {
      console.log(`- Student: "${data.studentName}", Subject: "${data.subject}", Week: "${data.weekLabel}", Term: "${data.term}", Year: "${data.academicYear}"`);
    }
  });
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
