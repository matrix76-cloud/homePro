// 개발용: reviewThreads 전량 덤프 → JSON (미답변 글 집계)
//   node dump-reviews.mjs [출력경로]
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy } from "firebase/firestore";
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

const snap = await getDocs(query(collection(db, "reviewThreads"), orderBy("ts", "asc")));
const rows = [];
snap.forEach((d) => {
  const x = d.data();
  rows.push({
    pid: d.id,
    screenId: x.screenId,
    by: x.by,
    at: x.at,
    text: x.text || "",
    replyTo: x.replyTo || null,
    imgs: (x.imgs || []).length,
    pins: (x.pins || []).length,
  });
});
fs.writeFileSync(process.argv[2] || "reviews.json", JSON.stringify(rows, null, 2));
console.log("total docs:", rows.length);
const roots = rows.filter((r) => !r.replyTo);
const replies = rows.filter((r) => r.replyTo);
console.log("roots:", roots.length, "replies:", replies.length);
const repliedTo = new Set(replies.map((r) => r.replyTo));
const unanswered = roots.filter((r) => !repliedTo.has(r.pid));
console.log("unanswered roots:", unanswered.length);
for (const u of unanswered) {
  console.log(`- [${u.screenId}] (${u.by} ${u.at}) ${u.text.replace(/\n/g, " / ").slice(0, 100)}`);
}
process.exit(0);
