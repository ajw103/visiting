import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// TODO: paste your firebase config here
const firebaseConfig = {
  apiKey: "AIzaSyDRRORZeAxarCsaziQzbfiUtbxNlM8OIgY",
  authDomain: "nm-dev-gb-vertexai-ga.firebaseapp.com",
  projectId: "nm-dev-gb-vertexai-ga",
  storageBucket: "nm-dev-gb-vertexai-ga.firebasestorage.app",
  messagingSenderId: "875291608176",
  appId: "1:875291608176:web:82d79794fd900abccee0b5",
  measurementId: "G-E27BW46NV1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Example data to upload
const employees = [
  { id: "emp001", name: "홍길동", dept: "넷마블 총무팀", email: "hong@netmarble.com", position: "팀장", phone: "010-1111-1111" },
  { id: "emp002", name: "김철수", dept: "넷마블 인사팀", email: "kim@netmarble.com", position: "수석", phone: "010-2222-2222" },
  { id: "emp003", name: "이영희", dept: "넷마블 개발본부", email: "lee@netmarble.com", position: "팀원", phone: "010-3333-3333" },
  { id: "emp004", name: "박민준", dept: "넷마블 마케팅실", email: "park@netmarble.com", position: "팀장", phone: "010-4444-4444" },
  { id: "emp005", name: "최서연", dept: "넷마블 재무팀", email: "choi@netmarble.com", position: "팀원", phone: "010-5555-5555" }
];

async function uploadData() {
  console.log("Starting upload...");
  for (const emp of employees) {
    try {
      const { id, ...data } = emp;
      await setDoc(doc(db, "employees", id), data);
      console.log(`Uploaded: ${emp.name}`);
    } catch (e) {
      console.error(`Error uploading ${emp.name}:`, e);
    }
  }
  console.log("Upload complete!");
}

uploadData();
