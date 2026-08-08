/**
 * 서버 이관 공용 유틸 — 소스/타깃 Firebase 프로젝트 연결과 로그.
 *
 * 서비스 계정 키는 레포에 커밋되지 않는 _migration/keys/ 에 둔다.
 *   _migration/keys/source-<프로젝트ID>.json   (옮겨올 쪽)
 *   _migration/keys/target-<프로젝트ID>.json   (옮겨갈 쪽)
 *
 * 키 경로는 환경변수로도 덮어쓸 수 있다: MIGRATE_SOURCE_KEY / MIGRATE_TARGET_KEY
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, "../..");
export const KEY_DIR = path.join(ROOT, "_migration/keys");

/** _migration/keys/ 에서 source-*.json / target-*.json 을 찾는다. */
function findKey(role) {
    const override = process.env[role === "source" ? "MIGRATE_SOURCE_KEY" : "MIGRATE_TARGET_KEY"];
    if (override) return override;
    if (!fs.existsSync(KEY_DIR)) {
        throw new Error(`키 폴더가 없습니다: ${KEY_DIR}\n  → README.md 의 "준비" 항목을 먼저 진행하세요.`);
    }
    const hit = fs.readdirSync(KEY_DIR).filter((f) => f.startsWith(`${role}-`) && f.endsWith(".json"));
    if (hit.length === 0) {
        throw new Error(`${role} 키를 찾을 수 없습니다. ${KEY_DIR}/${role}-<프로젝트ID>.json 을 두세요.`);
    }
    if (hit.length > 1) {
        throw new Error(`${role} 키가 여러 개입니다(${hit.join(", ")}). 하나만 남기세요.`);
    }
    return path.join(KEY_DIR, hit[0]);
}

/** 소스/타깃 admin 앱을 각각 초기화해서 돌려준다. */
export function connect() {
    const srcKeyPath = findKey("source");
    const tgtKeyPath = findKey("target");
    const srcKey = JSON.parse(fs.readFileSync(srcKeyPath, "utf8"));
    const tgtKey = JSON.parse(fs.readFileSync(tgtKeyPath, "utf8"));

    if (srcKey.project_id === tgtKey.project_id) {
        throw new Error(`소스와 타깃이 같은 프로젝트입니다(${srcKey.project_id}). 키를 확인하세요.`);
    }

    const source = initializeApp(
        {
            credential: cert(srcKey),
            projectId: srcKey.project_id,
            storageBucket: process.env.MIGRATE_SOURCE_BUCKET || `${srcKey.project_id}.firebasestorage.app`,
        },
        "source"
    );
    const target = initializeApp(
        {
            credential: cert(tgtKey),
            projectId: tgtKey.project_id,
            storageBucket: process.env.MIGRATE_TARGET_BUCKET || `${tgtKey.project_id}.firebasestorage.app`,
        },
        "target"
    );

    return {
        source,
        target,
        sourceId: srcKey.project_id,
        targetId: tgtKey.project_id,
        srcDb: getFirestore(source),
        tgtDb: getFirestore(target),
    };
}

/** 서비스 계정으로 OAuth 액세스 토큰을 받는다(REST API 호출용). */
export async function accessToken(app) {
    const t = await app.options.credential.getAccessToken();
    return t.access_token;
}

/** `--only=a,b --dry-run` 같은 인자를 파싱. */
export function parseArgs(argv = process.argv.slice(2)) {
    const out = { _: [], dryRun: false, yes: false };
    for (const a of argv) {
        if (a === "--dry-run") out.dryRun = true;
        else if (a === "--yes" || a === "-y") out.yes = true;
        else if (a.startsWith("--only=")) out.only = a.slice(7).split(",").map((s) => s.trim()).filter(Boolean);
        else if (a.startsWith("--skip=")) out.skip = a.slice(7).split(",").map((s) => s.trim()).filter(Boolean);
        else if (a.startsWith("--")) {
            const [k, v] = a.slice(2).split("=");
            out[k] = v === undefined ? true : v;
        } else out._.push(a);
    }
    return out;
}

/** 소스/타깃을 눈으로 확인하고 진행 여부를 묻는다(--yes 면 건너뜀). */
export async function confirm({ sourceId, targetId }, args, what) {
    console.log("");
    console.log(`  ${what}`);
    console.log(`  소스  : ${sourceId}`);
    console.log(`  타깃  : ${targetId}`);
    console.log(`  모드  : ${args.dryRun ? "DRY-RUN (쓰기 없음)" : "실제 쓰기"}`);
    console.log("");
    if (args.dryRun || args.yes) return true;

    process.stdout.write("  진행할까요? 타깃 프로젝트ID를 그대로 입력하세요: ");
    const answer = await new Promise((resolve) => {
        process.stdin.resume();
        process.stdin.once("data", (d) => {
            process.stdin.pause();
            resolve(String(d).trim());
        });
    });
    if (answer !== targetId) {
        console.log("  입력이 달라 중단합니다.");
        return false;
    }
    return true;
}

export const log = (...a) => console.log(...a);
export const pad = (s, n) => String(s).padEnd(n);
