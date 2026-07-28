// 검수용: users 문서들의 phoneE164 보유 현황 (RequirePhone 락아웃 위험 점검)
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyDUVo__03JeXFktCckJc46YF7BLGjIwmWc",
  authDomain: "homepro-43f7f.firebaseapp.com",
  projectId: "homepro-43f7f",
});
const db = getFirestore(app);

const snap = await getDocs(collection(db, "users"));
let with_ = 0, without = 0;
const missing = [];
snap.forEach((d) => {
  const x = d.data();
  if (x.phoneE164) with_++;
  else { without++; missing.push(`${x.nickname || x.name || "(무명)"} [${d.id.slice(0, 8)}] role=${x.role || "-"}`); }
});
console.log(`총 ${snap.size}명 | phoneE164 있음 ${with_} | 없음 ${without}`);
if (missing.length) console.log("없음 목록:\n" + missing.slice(0, 30).join("\n"));
process.exit(0);
