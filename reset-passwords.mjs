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

async function resetAllPasswords() {
  console.log("Authenticating...");
  await signInAnonymously(auth);
  console.log("Authenticated ✓\n");

  const snapshot = await getDocs(collection(db, "teachers"));

  if (snapshot.empty) {
    console.log("No teachers found in Firestore.");
    process.exit(0);
  }

  const batch = writeBatch(db);
  let count = 0;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const ref = doc(db, "teachers", docSnap.id);
    batch.update(ref, { password: "000000" });
    count++;
    console.log(`  Queued: ${data.fullName} (${data.username})`);
  });

  await batch.commit();
  console.log(`\n✅ Reset ${count} teacher password(s) to 000000.`);
  process.exit(0);
}

resetAllPasswords().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
