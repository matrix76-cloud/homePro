/**
 * Firestore 전량 복사 — 소스 → 타깃 (문서 ID·서브컬렉션 유지)
 *
 *   node scripts/migrate/firestore-copy.mjs --dry-run
 *   node scripts/migrate/firestore-copy.mjs --only=users,homepro_orders
 *   node scripts/migrate/firestore-copy.mjs --yes
 *
 * 주의할 점 두 가지:
 *  1) DocumentReference 필드는 프로젝트 경로를 품고 있어서 그대로 쓰면 소스 프로젝트를 가리킨다.
 *     → 타깃 db 기준으로 다시 만들어 넣는다(remapValue).
 *  2) 이미 타깃에 같은 문서가 있으면 기본은 건너뛴다. 덮어쓰려면 --overwrite.
 */
import { connect, parseArgs, confirm, log, pad } from "./_lib.mjs";
import { DocumentReference, Timestamp, GeoPoint } from "firebase-admin/firestore";

const BATCH = 400; // Firestore 배치 상한 500 — 여유를 둔다

const args = parseArgs();
const ctx = connect();
const { srcDb, tgtDb } = ctx;

/** 소스에서 읽은 값을 타깃에 그대로 쓸 수 있는 형태로 변환. */
function remapValue(v) {
    if (v === null || v === undefined) return v;

    // DocumentReference → 같은 경로를 타깃 db 기준으로 재생성
    if (v instanceof DocumentReference) return tgtDb.doc(v.path);

    // Timestamp·GeoPoint·Buffer 는 그대로 쓸 수 있다
    if (v instanceof Timestamp) return v;
    if (v instanceof GeoPoint) return v;
    if (Buffer.isBuffer(v)) return v;

    if (Array.isArray(v)) return v.map(remapValue);

    if (typeof v === "object") {
        const out = {};
        for (const [k, val] of Object.entries(v)) out[k] = remapValue(val);
        return out;
    }
    return v;
}

const stats = { collections: 0, docs: 0, skipped: 0, subcollections: 0 };

/** 컬렉션 하나(그리고 그 안의 서브컬렉션들)를 재귀 복사. */
async function copyCollection(srcCol, depth = 0) {
    const indent = "  ".repeat(depth + 1);
    const snap = await srcCol.get();
    if (snap.empty) {
        log(`${indent}${pad(srcCol.path, 40)} 0건 (빈 컬렉션)`);
        return;
    }

    stats.collections += 1;

    // 타깃에 이미 있는 문서는 기본적으로 건너뛴다(중단 후 재실행해도 안전하게).
    let existing = new Set();
    if (!args.overwrite) {
        const tgtSnap = await tgtDb.collection(srcCol.path).select().get();
        existing = new Set(tgtSnap.docs.map((d) => d.id));
    }

    const targets = snap.docs.filter((d) => !existing.has(d.id));
    stats.skipped += snap.docs.length - targets.length;

    if (!args.dryRun && targets.length) {
        for (let i = 0; i < targets.length; i += BATCH) {
            const chunk = targets.slice(i, i + BATCH);
            const batch = tgtDb.batch();
            for (const d of chunk) {
                batch.set(tgtDb.collection(srcCol.path).doc(d.id), remapValue(d.data()));
            }
            await batch.commit();
        }
    }
    stats.docs += targets.length;

    const skippedNote = snap.docs.length - targets.length ? ` (기존 ${snap.docs.length - targets.length}건 건너뜀)` : "";
    log(`${indent}${pad(srcCol.path, 40)} ${targets.length}건${skippedNote}`);

    // 서브컬렉션 — 문서마다 확인해야 해서 문서 수만큼 조회가 발생한다.
    for (const d of snap.docs) {
        const subs = await d.ref.listCollections();
        for (const sub of subs) {
            stats.subcollections += 1;
            await copyCollection(sub, depth + 1);
        }
    }
}

const ok = await confirm(ctx, args, "Firestore 복사");
if (!ok) process.exit(1);

const rootCols = await srcDb.listCollections();
let list = rootCols.map((c) => c.id);
if (args.only) list = list.filter((id) => args.only.includes(id));
if (args.skip) list = list.filter((id) => !args.skip.includes(id));

log(`대상 최상위 컬렉션 ${list.length}개\n`);

for (const id of list) {
    await copyCollection(srcDb.collection(id));
}

log("");
log(`완료: 컬렉션 ${stats.collections}개(서브 ${stats.subcollections}) / 복사 ${stats.docs}건 / 건너뜀 ${stats.skipped}건`);
if (args.dryRun) log("※ DRY-RUN 이라 실제로 쓰지 않았습니다.");
process.exit(0);
