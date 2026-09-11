// 타깃 프로젝트에 Firestore·Storage 규칙 + 복합 인덱스 배포 (서비스 계정 키, CLI 로그인 불필요)
//   node scripts/migrate/deploy-rules.mjs
import { initializeApp, cert } from "firebase-admin/app";
import { getSecurityRules } from "firebase-admin/security-rules";
import { GoogleAuth } from "google-auth-library";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const KEY_DIR = path.join(ROOT, "_migration/keys");
const keyFile = fs.readdirSync(KEY_DIR).find((f) => f.startsWith("target-") && f.endsWith(".json"));
const key = JSON.parse(fs.readFileSync(path.join(KEY_DIR, keyFile), "utf8"));
initializeApp({ credential: cert(key), projectId: key.project_id, storageBucket: `${key.project_id}.firebasestorage.app` });
const rules = getSecurityRules();
const fsRules = fs.readFileSync(path.join(ROOT, "firestore.rules"), "utf8");
const r1 = await rules.releaseFirestoreRulesetFromSource(fsRules);
console.log(`Firestore 규칙 [${key.project_id}]`, r1.name);
if (fs.existsSync(path.join(ROOT, "storage.rules"))) {
  const stRules = fs.readFileSync(path.join(ROOT, "storage.rules"), "utf8");
  const r2 = await rules.releaseStorageRulesetFromSource(stRules, `${key.project_id}.firebasestorage.app`);
  console.log(`Storage 규칙 [${key.project_id}]`, r2.name);
}
const idxPath = path.join(ROOT, "firestore.indexes.json");
if (fs.existsSync(idxPath)) {
  const auth = new GoogleAuth({ credentials: key, scopes: ["https://www.googleapis.com/auth/datastore"] });
  const client = await auth.getClient();
  const base = `https://firestore.googleapis.com/v1/projects/${key.project_id}/databases/(default)/collectionGroups`;
  const { indexes = [] } = JSON.parse(fs.readFileSync(idxPath, "utf8"));
  for (const ix of indexes) {
    const r = await client.request({ url: `${base}/${ix.collectionGroup}/indexes`, method: "POST", data: { queryScope: ix.queryScope, fields: ix.fields } }).catch((e) => e.response);
    const label = `${ix.collectionGroup}(${ix.fields.map((f) => f.fieldPath + (f.arrayConfig ? "[]" : f.order === "DESCENDING" ? " desc" : "")).join(", ")})`;
    console.log(r.status === 200 ? `인덱스 생성 요청: ${label}` : r.status === 409 ? `인덱스 이미 있음: ${label}` : `인덱스 실패 ${r.status}: ${label} ${JSON.stringify(r.data).slice(0, 160)}`);
  }
}
