/**
 * 타깃 DB 안에 남은 "옛 프로젝트 절대 URL" 치환
 *
 *   node scripts/migrate/rewrite-urls.mjs --dry-run
 *   node scripts/migrate/rewrite-urls.mjs --yes
 *
 * 문서 안에 이미지 downloadURL·함수 주소가 문자열로 저장돼 있으면 이관해도 옛 프로젝트를 계속 가리킨다.
 * 이 스크립트가 그런 문자열의 프로젝트ID·버킷명만 타깃 것으로 바꿔준다.
 *
 * 다운로드 토큰(?token=…)은 그대로 둔다 — storage-copy.mjs 가 파일의 커스텀 메타데이터
 * (firebaseStorageDownloadTokens)까지 복사하므로 타깃에서도 같은 토큰이 유효하다.
 *
 * 반드시 firestore-copy.mjs / storage-copy.mjs 를 끝낸 뒤에 실행할 것.
 */
import { connect, parseArgs, confirm, log } from "./_lib.mjs";

const args = parseArgs();
const ctx = connect();
const { tgtDb, sourceId, targetId } = ctx;

// 긴 문자열부터 바꿔야 한다(버킷명이 프로젝트ID 를 포함하므로 순서가 중요).
const RULES = [
    [`${sourceId}.firebasestorage.app`, `${targetId}.firebasestorage.app`],
    [`${sourceId}.appspot.com`, `${targetId}.appspot.com`],
    [`${sourceId}.firebaseapp.com`, `${targetId}.firebaseapp.com`],
    [`${sourceId}.web.app`, `${targetId}.web.app`],
    [sourceId, targetId],
];

function rewrite(value) {
    if (typeof value === "string") {
        let out = value;
        for (const [from, to] of RULES) out = out.split(from).join(to);
        return out;
    }
    if (Array.isArray(value)) return value.map(rewrite);
    if (value && typeof value === "object" && value.constructor === Object) {
        const out = {};
        for (const [k, v] of Object.entries(value)) out[k] = rewrite(v);
        return out;
    }
    // Timestamp·GeoPoint·DocumentReference 등은 건드리지 않는다
    return value;
}

const ok = await confirm(ctx, args, `타깃 DB 문자열 치환 (${sourceId} → ${targetId})`);
if (!ok) process.exit(1);

let changed = 0;
let scanned = 0;

// 채팅 메시지처럼 서브컬렉션에도 이미지 URL 이 들어가므로 끝까지 내려간다.
async function walk(col) {
    const snap = await col.get();
    for (const d of snap.docs) {
        scanned += 1;
        const before = d.data();
        if (JSON.stringify(before).includes(sourceId)) {
            log(`  ${d.ref.path}`);
            if (!args.dryRun) await d.ref.set(rewrite(before));
            changed += 1;
        }
        for (const sub of await d.ref.listCollections()) await walk(sub);
    }
}

for (const col of await tgtDb.listCollections()) await walk(col);

log("");
log(`완료: 문서 ${scanned}건 확인 / ${changed}건 치환`);
if (args.dryRun) log("※ DRY-RUN 이라 실제로 쓰지 않았습니다.");
process.exit(0);
