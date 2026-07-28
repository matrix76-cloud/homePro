// 개발용: 특정 리뷰글의 첨부 이미지(dataURL) → png 파일로 저장
//   node dump-review-imgs.mjs <출력폴더> <pid...>
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";

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

const outDir = process.argv[2];
const pids = process.argv.slice(3);
fs.mkdirSync(outDir, { recursive: true });

for (const pid of pids) {
  const snap = await getDoc(doc(db, "reviewThreads", pid));
  if (!snap.exists()) { console.log("missing", pid); continue; }
  const d = snap.data();
  (d.imgs || []).forEach((durl, i) => {
    const m = /^data:image\/(\w+);base64,(.*)$/s.exec(durl);
    if (!m) { console.log("skip non-dataurl", pid, i); return; }
    const file = path.join(outDir, `${pid}_${i}.${m[1]}`);
    fs.writeFileSync(file, Buffer.from(m[2], "base64"));
    console.log("wrote", file);
  });
  if (d.pins) console.log("PINS", pid, JSON.stringify(d.pins));
}
process.exit(0);
