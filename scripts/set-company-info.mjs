// settings/companyInfo 에 사업자 정보 반영 (사업자등록증 2026-08-14 수령: 넥스랩스 주식회사)
// 실행: node scripts/set-company-info.mjs
// phone/email/통신판매업 신고번호가 오면 아래 객체에 추가하고 재실행 (merge라 부분 갱신 안전)
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const key = JSON.parse(fs.readFileSync(path.join(ROOT, "_migration/keys/source-homepro-43f7f.json"), "utf8"));
const app = initializeApp({ credential: cert(key), projectId: key.project_id });
const db = getFirestore(app);

const ref = db.doc("settings/companyInfo");
const before = await ref.get();
console.log("before:", before.exists ? JSON.stringify(before.data()) : "(없음)");

await ref.set({
  companyName: "넥스랩스 주식회사",
  ceo: "임옥진",
  bizNumber: "708-87-04038",
  address: "충청남도 논산시 은진면 탑정로 342-1",
  email: "homenex74@gmail.com", // 고객센터 이메일 (대표님 확정 8/14 카톡)
  // phone: "",              // 고객센터 대표번호 — 대표님 회신 대기
  // mailOrderRegNo: "",     // 통신판매업 신고번호 — 신고 후
}, { merge: true });

const after = await ref.get();
console.log("after:", JSON.stringify(after.data()));
process.exit(0);
