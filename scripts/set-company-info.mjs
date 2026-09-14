/**
 * 푸터 사업자 정보(settings/companyInfo) 갱신 — 형 지시 9/14 "[홈프로] 푸터 정보 이걸로 바꾸자"
 * 실행: node scripts/set-company-info.mjs   (타깃 = _migration/keys/target-*.json)
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(ROOT, "_migration/keys");
const keyPath = fs.readdirSync(dir).filter((f) => f.startsWith("target-") && f.endsWith(".json"))[0];
const key = JSON.parse(fs.readFileSync(path.join(dir, keyPath), "utf8"));
initializeApp({ credential: cert(key), projectId: key.project_id });
const db = getFirestore();
await db.doc("settings/companyInfo").set({
  companyName: "(주)윈플래닛",
  ceo: "박신영",
  bizNumber: "696-87-02440",
  phone: "1555-3364",
  email: "homepro3364@gmail.com",
  mailOrderNo: "2021-서울종로-1936",
  jobInfoNo: "",            // 직업정보제공사업 신고번호 — 신고 전
  privacyOfficer: "박성우",
  address: "",              // 주소는 안 주셔서 비움
  updatedAt: FieldValue.serverTimestamp(),
}, { merge: true });
console.log("settings/companyInfo 갱신 완료 (", key.project_id, ")");
