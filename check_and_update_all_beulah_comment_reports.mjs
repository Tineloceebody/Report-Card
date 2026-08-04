import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
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

const normalize = (val) => (val ? String(val).toLowerCase().replace(/[^a-z0-9]/g, "") : "");

async function checkAndUpdate() {
  await signInAnonymously(auth);

  const colSnap = await getDocs(collection(db, "comment_reports_v1"));
  console.log(`comment_reports_v1 total docs: ${colSnap.size}`);

  let updated = 0;

  for (const docSnap of colSnap.docs) {
    const d = docSnap.data();
    const norm = normalize(d.studentName);

    if (norm.includes("beulah") || norm.includes("beaulah") || norm.includes("akur")) {
      const oldDocId = docSnap.id;
      const newName = "Beulah Akure";

      const newDocId = `${newName}-${d.classId}-${d.academicYear}-${d.term}`
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/\//g, "-");

      const updatedData = {
        ...d,
        studentName: newName,
        id: newDocId
      };

      await setDoc(doc(db, "comment_reports_v1", newDocId), updatedData);
      console.log(`[comment_reports_v1] Updated "${d.studentName}" -> "${newName}"`);

      if (oldDocId !== newDocId) {
        await deleteDoc(doc(db, "comment_reports_v1", oldDocId));
      }
      updated++;
    }
  }

  console.log(`Total comment_reports_v1 records updated: ${updated}`);
  process.exit(0);
}

checkAndUpdate().catch((err) => {
  console.error(err);
  process.exit(1);
});
