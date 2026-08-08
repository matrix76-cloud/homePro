/**
 * Storage 파일 복사 — 소스 버킷 → 타깃 버킷 (경로·contentType 유지)
 *
 *   node scripts/migrate/storage-copy.mjs --dry-run
 *   node scripts/migrate/storage-copy.mjs --prefix=orders/ --yes
 *
 * 파일 경로가 그대로 유지되므로 Firestore 에 저장된 이미지 경로도 그대로 쓸 수 있다.
 * 다만 downloadURL(토큰 포함 절대 URL)을 DB 에 저장해 둔 곳이 있으면 그 URL 은 옛 버킷을 가리킨다.
 * → 이관 후 verify.mjs 가 그런 필드를 찾아서 알려준다.
 */
import { connect, parseArgs, confirm, log } from "./_lib.mjs";
import { getStorage } from "firebase-admin/storage";

const args = parseArgs();
const ctx = connect();
const srcBucket = getStorage(ctx.source).bucket();
const tgtBucket = getStorage(ctx.target).bucket();

log(`소스 버킷: ${srcBucket.name}`);
log(`타깃 버킷: ${tgtBucket.name}`);

const ok = await confirm(ctx, args, "Storage 파일 복사");
if (!ok) process.exit(1);

const [files] = await srcBucket.getFiles(args.prefix ? { prefix: args.prefix } : {});
log(`소스 파일 ${files.length}개`);

let copied = 0;
let skipped = 0;
let failed = 0;
let bytes = 0;

for (const file of files) {
    const dest = tgtBucket.file(file.name);

    // 이미 있으면 건너뛴다(중단 후 재실행 대비)
    if (!args.overwrite) {
        const [exists] = await dest.exists();
        if (exists) {
            skipped += 1;
            continue;
        }
    }

    if (args.dryRun) {
        copied += 1;
        bytes += Number(file.metadata?.size || 0);
        continue;
    }

    try {
        await new Promise((resolve, reject) => {
            file
                .createReadStream()
                .on("error", reject)
                .pipe(
                    dest.createWriteStream({
                        metadata: {
                            contentType: file.metadata?.contentType,
                            cacheControl: file.metadata?.cacheControl,
                            metadata: file.metadata?.metadata,
                        },
                        resumable: false,
                    })
                )
                .on("error", reject)
                .on("finish", resolve);
        });
        copied += 1;
        bytes += Number(file.metadata?.size || 0);
        if (copied % 50 === 0) log(`  ${copied}개 복사...`);
    } catch (e) {
        failed += 1;
        log(`  실패 ${file.name}: ${e.message}`);
    }
}

const mb = (bytes / 1024 / 1024).toFixed(1);
log("");
log(`완료: 복사 ${copied}개(${mb}MB) / 이미있음 ${skipped}개 / 실패 ${failed}개`);
if (args.dryRun) log("※ DRY-RUN 이라 실제로 쓰지 않았습니다.");
process.exit(failed ? 1 : 0);
