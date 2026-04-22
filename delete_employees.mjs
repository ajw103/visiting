import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDRRORZeAxarCsaziQzbfiUtbxNlM8OIgY",
  authDomain: "nm-dev-gb-vertexai-ga.firebaseapp.com",
  projectId: "nm-dev-gb-vertexai-ga",
  storageBucket: "nm-dev-gb-vertexai-ga.firebasestorage.app",
  messagingSenderId: "875291608176",
  appId: "1:875291608176:web:82d79794fd900abccee0b5",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const snap = await getDocs(collection(db, 'employees'));
await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'employees', d.id))));
console.log(`✅ 임직원 ${snap.size}명 전체 삭제 완료`);
process.exit(0);
