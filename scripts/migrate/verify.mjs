/**
 * 이관 검증 — 소스와 타깃을 나란히 비교한다.
 *
 *   node scripts/migrate/verify.mjs
 *
 * 확인하는 것:
 *  1) 컬렉션별 문서 수 (최상위)
 *  2) Auth 사용자 수 / 비밀번호 보유 수 / UID 일치 여부
 *  3) Storage 파일 수
 *  4) DB 안에 옛 프로젝트를 가리키는 절대 URL 이 남아 있는지 (이관해도 안 따라오는 값)
 */
import { connect, log, pad } from "./_lib.mjs";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

const ctx = connect();
const { srcDb, tgtDb, source, target, sourceId, targetId } = ctx;

let problems = 0;

// ── 1) Firestore 문서 수 ──
log("");
log(`[Firestore]  ${pad("컬렉션", 32)} ${pad("소스", 8)} ${pad("타깃", 8)}`);
const srcCols = await srcDb.listCollections();
for (const col of srcCols) {
    const [s, t] = await Promise.all([
        col.count().get(),
        tgtDb.collection(col.id).count().get(),
    ]);
    const sn = s.data().count;
    const tn = t.data().count;
    const mark = sn === tn ? "일치" : "불일치";
    if (sn !== tn) problems += 1;
    log(`             ${pad(col.id, 32)} ${pad(sn, 8)} ${pad(tn, 8)} ${mark}`);
}

// ── 2) Auth ──
async function allUsers(app) {
    const out = [];
    let pageToken;
    do {
        const page = await getAuth(app).listUsers(1000, pageToken);
        out.push(...page.users);
        pageToken = page.pageToken;
    } while (pageToken);
    return out;
}
const [su, tu] = await Promise.all([allUsers(source), allUsers(target)]);
const srcUids = new Set(su.map((u) => u.uid));
const missing = su.filter((u) => !tu.some((x) => x.uid === u.uid));
const extra = tu.filter((u) => !srcUids.has(u.uid));

log("");
log(`[Auth]       소스 ${su.length}명 / 타깃 ${tu.length}명`);
log(`             비밀번호 보유  소스 ${su.filter((u) => u.passwordHash).length}명 / 타깃 ${tu.filter((u) => u.passwordHash).length}명`);
if (missing.length) {
    problems += 1;
    log(`             타깃에 없는 UID ${missing.length}개: ${missing.slice(0, 5).map((u) => u.uid).join(", ")}${missing.length > 5 ? " …" : ""}`);
}
if (extra.length) log(`             타깃에만 있는 UID ${extra.length}개(타깃에서 새로 가입한 계정일 수 있음)`);

// ── 3) Storage ──
const [sf] = await getStorage(source).bucket().getFiles();
const [tf] = await getStorage(target).bucket().getFiles();
log("");
log(`[Storage]    소스 ${sf.length}개 / 타깃 ${tf.length}개`);
if (sf.length !== tf.length) problems += 1;

// ── 4) 옛 프로젝트를 가리키는 절대 URL 잔재 ──
// 이미지 downloadURL, cloudfunctions 주소 등을 DB 에 문자열로 저장해 둔 경우 이관해도 옛 프로젝트를 계속 본다.
// 채팅 메시지 등 서브컬렉션까지 훑는다.
const hits = [];
async function scan(col) {
    const snap = await col.get();
    for (const d of snap.docs) {
        if (JSON.stringify(d.data()).includes(sourceId)) hits.push(d.ref.path);
        for (const sub of await d.ref.listCollections()) await scan(sub);
    }
}
for (const col of await tgtDb.listCollections()) await scan(col);
log("");
if (hits.length) {
    problems += 1;
    log(`[잔재]       타깃 DB 안에 "${sourceId}" 문자열이 남은 문서 ${hits.length}건`);
    log(`             ${hits.slice(0, 10).join(", ")}${hits.length > 10 ? " …" : ""}`);
    log(`             → 저장된 절대 URL 이라 그대로 두면 옛 프로젝트를 계속 바라봅니다. 치환이 필요합니다.`);
} else {
    log(`[잔재]       타깃 DB 에 옛 프로젝트(${sourceId})를 가리키는 문자열 없음`);
}

log("");
log(problems ? `검증 결과: 확인이 필요한 항목 ${problems}건` : "검증 결과: 이상 없음");
process.exit(problems ? 1 : 0);
