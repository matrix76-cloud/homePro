/**
 * Auth 사용자 복사 — 소스 → 타깃 (UID·비밀번호 유지)
 *
 *   node scripts/migrate/auth-copy.mjs --dry-run
 *   node scripts/migrate/auth-copy.mjs --yes
 *
 * 왜 비밀번호가 살아남는가:
 *   Firebase 는 비밀번호를 SCRYPT 로 해시해 보관하고, 프로젝트마다 다른 서명키(signerKey)를 쓴다.
 *   해시와 함께 "소스 프로젝트의 해시 파라미터"를 넘겨 import 하면 타깃에서도 같은 비밀번호로 로그인된다.
 *   그래서 기존 회원들은 아무것도 다시 하지 않아도 된다.
 *
 * UID 도 그대로 유지되므로 Firestore 문서(users/{uid} 등)와의 연결이 깨지지 않는다.
 */
import { connect, accessToken, parseArgs, confirm, log } from "./_lib.mjs";
import { getAuth } from "firebase-admin/auth";

const args = parseArgs();
const ctx = connect();
const { source, target, sourceId, targetId } = ctx;

/** 소스 프로젝트의 비밀번호 해시 파라미터를 가져온다(콘솔의 "비밀번호 해시 매개변수"와 같은 값). */
async function fetchHashConfig() {
    const token = await accessToken(source);
    const res = await fetch(`https://identitytoolkit.googleapis.com/admin/v2/projects/${sourceId}/config`, {
        headers: { Authorization: `Bearer ${token}`, "X-Goog-User-Project": sourceId },
    });
    if (!res.ok) {
        throw new Error(`해시 파라미터 조회 실패 ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const cfg = await res.json();
    const h = cfg?.signIn?.hashConfig;
    if (!h?.signerKey) throw new Error("해시 파라미터(signerKey)를 찾지 못했습니다.");
    return h;
}

/** Admin SDK 가 주는 해시 문자열은 base64url 인 경우가 있어 둘 다 받아준다. */
function toBuffer(s) {
    if (!s) return undefined;
    return Buffer.from(s, /[-_]/.test(s) ? "base64url" : "base64");
}

const hashConfig = await fetchHashConfig();
log(`소스 해시: ${hashConfig.algorithm} (rounds ${hashConfig.rounds}, memoryCost ${hashConfig.memoryCost})`);

const ok = await confirm(ctx, args, "Auth 사용자 복사 (UID·비밀번호 유지)");
if (!ok) process.exit(1);

// ── 소스 사용자 전량 조회 ──
const users = [];
let pageToken;
do {
    const page = await getAuth(source).listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
} while (pageToken);

log(`소스 사용자 ${users.length}명`);

const records = users.map((u) => {
    const rec = {
        uid: u.uid,
        email: u.email || undefined,
        emailVerified: Boolean(u.emailVerified),
        displayName: u.displayName || undefined,
        photoURL: u.photoURL || undefined,
        phoneNumber: u.phoneNumber || undefined,
        disabled: Boolean(u.disabled),
        metadata: {
            creationTime: u.metadata?.creationTime || undefined,
            lastSignInTime: u.metadata?.lastSignInTime || undefined,
        },
        customClaims: u.customClaims && Object.keys(u.customClaims).length ? u.customClaims : undefined,
        // 소셜/전화 등 연결된 로그인 수단
        providerData: (u.providerData || []).map((p) => ({
            uid: p.uid,
            providerId: p.providerId,
            displayName: p.displayName || undefined,
            email: p.email || undefined,
            photoURL: p.photoURL || undefined,
            phoneNumber: p.phoneNumber || undefined,
        })),
    };
    if (u.passwordHash) {
        rec.passwordHash = toBuffer(u.passwordHash);
        rec.passwordSalt = toBuffer(u.passwordSalt);
    }
    return rec;
});

const withPw = records.filter((r) => r.passwordHash).length;
log(`  비밀번호 보유 ${withPw}명 / 소셜·전화만 ${records.length - withPw}명`);

if (args.dryRun) {
    log("※ DRY-RUN 이라 실제로 import 하지 않았습니다.");
    process.exit(0);
}

// ── 타깃으로 import (1회 1000명 제한) ──
let success = 0;
const failures = [];
for (let i = 0; i < records.length; i += 1000) {
    const chunk = records.slice(i, i + 1000);
    const result = await getAuth(target).importUsers(chunk, {
        hash: {
            algorithm: hashConfig.algorithm,
            key: toBuffer(hashConfig.signerKey),
            saltSeparator: toBuffer(hashConfig.saltSeparator),
            rounds: Number(hashConfig.rounds),
            memoryCost: Number(hashConfig.memoryCost),
        },
    });
    success += result.successCount;
    for (const e of result.errors) {
        failures.push({ uid: chunk[e.index]?.uid, reason: e.error?.message });
    }
}

log("");
log(`완료: ${targetId} 에 ${success}명 반영, 실패 ${failures.length}명`);
for (const f of failures) log(`  실패 ${f.uid}: ${f.reason}`);
process.exit(failures.length ? 1 : 0);
