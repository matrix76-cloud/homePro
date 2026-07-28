// 개발용: 리뷰글에 처리완료 답글 일괄 등록
//   node post-review-replies.mjs <replies.json>
//   replies.json = [{ replyTo, screenId, text }]
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
const replies = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

for (const r of replies) {
  const ref = await addDoc(collection(db, "reviewThreads"), {
    screenId: r.screenId,
    by: "카스",
    text: r.text,
    replyTo: r.replyTo,
    at: kstNow(),
    ts: serverTimestamp(),
  });
  console.log("posted", ref.id, "->", r.replyTo);
}
console.log("done:", replies.length);
process.exit(0);
