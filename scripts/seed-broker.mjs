/**
 * 리뷰 폰용: seed_B3 를 인증 공인중개사로 만든다 (homepro_pros/seed_B3_brokerage = approved)
 * 실행: node scripts/seed-broker.mjs   (타깃 = _migration/keys/target-*.json)
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const keyPath = fs.readdirSync(path.join(ROOT, "_migration/keys")).filter((f) => f.startsWith("target-") && f.endsWith(".json"))[0];
const key = JSON.parse(fs.readFileSync(path.join(ROOT, "_migration/keys", keyPath), "utf8"));
initializeApp({ credential: cert(key), projectId: key.project_id });
const db = getFirestore();
const uid = process.argv[2] || "seed_B3";
const user = await db.doc(`users/${uid}`).get();
if (!user.exists) { console.error("users 문서 없음:", uid); process.exit(1); }
await db.doc(`homepro_pros/${uid}_brokerage`).set({
  uid, categoryId: "brokerage", licenseUrl: "", photoUrls: [],
  detail: { officeName: "용감한부동산공인중개사사무소", registrationNumber: "11680-2024-00123", mainProperties: ["아파트", "오피스텔"] },
  status: "approved", appliedAt: FieldValue.serverTimestamp(), approvedAt: FieldValue.serverTimestamp(), seed: true,
}, { merge: true });
const cats = new Set([...(user.data().proCategories || []), "brokerage"]);
await db.doc(`users/${uid}`).set({ proCategories: [...cats], companyName: user.data().companyName || "용감한부동산", userType: "business" }, { merge: true });
console.log("인증 공인중개사 시드 완료:", uid, "(", key.project_id, ")");
