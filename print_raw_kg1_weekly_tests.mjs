import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
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
  
  const id1 = "e66a5728-c9c3-4b3e-8be4-33d03cd60cfe"; // Week 2 English
  const id2 = "0f17b7fd-db67-4228-b072-567034817962"; // Week 3 RME
  
  const doc1 = await getDoc(doc(db, "weekly_reports_v1", id1));
  const doc2 = await getDoc(doc(db, "weekly_reports_v1", id2));
  
  console.log("WEEK 2 ENGLISH DOCUMENT:");
  console.log(JSON.stringify(doc1.data(), null, 2));
  
  console.log("\nWEEK 3 RME DOCUMENT:");
  console.log(JSON.stringify(doc2.data(), null, 2));

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
