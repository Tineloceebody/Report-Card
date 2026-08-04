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
  
  // Get all active profiles for kindergarten-2
  const reportsSnapshot = await getDocs(collection(db, "reports"));
  
  console.log("KINDERGARTEN 2 (KINDERGARTEN-2) AND BASIC 2 (BASIC-2) ACTIVE PROFILES:");
  reportsSnapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.classId === "kindergarten-2" || data.classId === "basic-2") {
      console.log(`- Student: "${data.studentName}", Class ID in database: "${data.classId}", Term: "${data.term}", Year: "${data.academicYear}"`);
    }
  });

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
