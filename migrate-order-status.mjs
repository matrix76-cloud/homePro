// 일회성: 기존 오더의 레거시 orderStatus 값을 표준 6값으로 마이그레이션
//   표준: 접수 / 대기 / 선정대기 / 배정 / 완료 / 취소  (거부는 블랙리스트라 유지)
// 사용:
//   node migrate-order-status.mjs           ← dry-run (바꿀 목록만 출력, DB 변경 없음)
//   node migrate-order-status.mjs --apply    ← 실제 반영
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

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
const APPLY = process.argv.includes("--apply");

// 레거시값 → 표준값 매핑 (거부는 의도적으로 제외 = 유지)
const MAP = {
  "요청": "접수",
  "진행": "배정",
  "결제": "배정",        // 결제는 paymentStatus로 분리됨 → orderStatus는 배정
  "업체선택대기": "선정대기",
  "업체선택": "선정대기",
  "리뷰": "완료",
  "정산": "완료",
};

const snap = await getDocs(collection(db, "homepro_orders"));
let changed = 0, kept = 0;
const plan = [];

for (const d of snap.docs) {
  const cur = d.data().orderStatus;
  const next = MAP[cur];
  if (next && next !== cur) {
    plan.push({ id: d.id, from: cur, to: next, reviewed: cur === "리뷰" || cur === "정산" });
    changed++;
  } else {
    kept++;
  }
}

console.log(`\n총 ${snap.size}건 / 변경대상 ${changed}건 / 유지 ${kept}건`);
plan.forEach((p) => console.log(`  ${p.id}: "${p.from}" → "${p.to}"${p.reviewed ? " (+reviewed)" : ""}`));

if (!APPLY) {
  console.log("\n[dry-run] 실제 반영하려면: node migrate-order-status.mjs --apply\n");
  process.exit(0);
}

for (const p of plan) {
  const patch = { orderStatus: p.to };
  if (p.reviewed) patch.reviewed = true;
  await updateDoc(doc(db, "homepro_orders", p.id), patch);
}
console.log(`\n✅ ${changed}건 마이그레이션 완료\n`);
process.exit(0);
