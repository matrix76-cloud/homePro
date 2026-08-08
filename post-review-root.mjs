// 개발용: 리뷰 허브에 루트글(지시/질문) 등록
//   node post-review-root.mjs <본문.txt> [screenId] [작성자]
//   기본 screenId=main, 작성자=형
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = {
  apiKey: "AIzaSyDUVo__03JeXFktCckJc46YF7BLGjIwmWc",
  authDomain: "homepro-43f7f.firebaseapp.com",
  projectId: "homepro-43f7f",
  storageBucket: "homepro-43f7f.firebasestorage.app",
  messagingSenderId: "717297769007",
  appId: "1:717297769007:web:839b080defa7c763e284da",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const kstNow = () => new Date().toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).slice(0, 16);

const text = fs.readFileSync(process.argv[2], "utf8").trimEnd();
const screenId = process.argv[3] || "main";
const by = process.argv[4] || "형";
const ref = await addDoc(collection(db, "reviewThreads"), {
  screenId,
  by,
  text,
  replyTo: null,
  at: kstNow(),
  ts: serverTimestamp(),
});
console.log("posted root", ref.id, `screen=${screenId}`, `by=${by}`, kstNow());
process.exit(0);
