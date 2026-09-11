// Firebase Hosting 배포 (REST · 타깃 서비스 계정) — CLI 로그인 계정에 타깃 권한이 없을 때 build/ 를 올린다.
//   npm run build   (먼저 .env.production 이 타깃 값이어야 한다)
//   node scripts/migrate/deploy-hosting.mjs
import { GoogleAuth } from "google-auth-library";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { gzipSync } from "zlib";
import { createHash } from "crypto";
import path from "path";
import { fileURLToPath } from "url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const KEY_DIR = path.join(ROOT, "_migration/keys");
const keyFile = readdirSync(KEY_DIR).find((f) => f.startsWith("target-") && f.endsWith(".json"));
const key = JSON.parse(readFileSync(path.join(KEY_DIR, keyFile), "utf8"));
const auth = new GoogleAuth({ credentials: key, scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
const c = await auth.getClient();
const site = process.env.HOSTING_SITE || key.project_id;
const B = "https://firebasehosting.googleapis.com/v1beta1";
const hosting = JSON.parse(readFileSync(join(ROOT, "firebase.json"), "utf8")).hosting;
const dist = join(ROOT, hosting.public || "build");
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(dist);
const config = {
  rewrites: (hosting.rewrites || [{ source: "**", destination: "/index.html" }]).map((r) => ({ glob: r.source, path: r.destination })),
  headers: (hosting.headers || []).map((h) => ({ glob: h.source, headers: Object.fromEntries(h.headers.map((x) => [x.key, x.value])) })),
};
const version = (await c.request({ url: `${B}/sites/${site}/versions`, method: "POST", data: { config } })).data;
console.log("version:", version.name);
const entries = {}, gz = {};
for (const f of files) {
  const p = "/" + relative(dist, f);
  const z = gzipSync(readFileSync(f), { level: 9 });
  const hash = createHash("sha256").update(z).digest("hex");
  entries[p] = hash; gz[hash] = z;
}
const pop = (await c.request({ url: `${B}/${version.name}:populateFiles`, method: "POST", data: { files: entries } })).data;
const need = pop.uploadRequiredHashes || [];
console.log(`파일 ${Object.keys(entries).length}개 중 업로드 필요 ${need.length}개`);
for (const h of need) {
  await c.request({ url: `${pop.uploadUrl}/${h}`, method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: gz[h], data: gz[h] });
}
await c.request({ url: `${B}/${version.name}?update_mask=status`, method: "PATCH", data: { status: "FINALIZED" } });
const rel = (await c.request({ url: `${B}/sites/${site}/releases?versionName=${version.name}`, method: "POST", data: {} })).data;
console.log("배포 완료:", rel.name);
console.log(`URL: https://${site}.web.app`);
