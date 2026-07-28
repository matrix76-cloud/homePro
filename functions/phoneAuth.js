/**
 * 전화번호 인증 — 서버 발급/검증 (형 지시 7/28)
 *
 * 이전 구조의 문제:
 *  - 인증번호를 브라우저가 Math.random() 으로 만들고 브라우저 state 와 비교했다.
 *    → 개발자도구로 정답이 보여서 문자를 받지 않고도 통과 가능.
 *  - /AuthCodeSend 가 인증·횟수제한 없이 열려 있어 누구나 임의 번호로 문자 발송 가능(과금).
 *  - 전화번호 인증 없이 남의 번호만 입력하면 그 계정에 연결되는 경로가 있었다(계정 탈취).
 *
 * 지금 구조:
 *  requestPhoneCode  → 서버가 코드 생성·해시 저장·발송 (번호별 발송 제한)
 *  verifyPhoneCode   → 서버가 대조. 성공 시 짧은 수명의 verificationToken 발급
 *  linkPhoneToAccount→ 토큰이 유효할 때만 전화번호 연결/계정 통합을 서버 권한으로 수행
 *
 * 코드 원문은 어디에도 저장하지 않는다(해시만). 토큰도 해시로만 보관한다.
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const crypto = require("crypto");

const REGION = "asia-northeast3";
const COL = "phone_verifications";

// 정책값
const CODE_TTL_SEC = 180;        // 인증번호 유효 3분
const TOKEN_TTL_SEC = 600;       // 인증 완료 토큰 10분
const RESEND_COOLDOWN_SEC = 30;  // 재발송 최소 간격
const MAX_SENDS_PER_WINDOW = 5;  // 시간당 발송 횟수
const SEND_WINDOW_SEC = 3600;
const MAX_ATTEMPTS = 5;          // 코드 오입력 허용 횟수

// SMS 게이트웨이 (환경변수 우선, 없으면 기존 값)
const SMS_URL = process.env.SMS_GATEWAY_URL || "http://34.64.211.220:8080/sendSms";
const SMS_KEY = process.env.SMS_GATEWAY_KEY || "sms-gateway-shared-key-2025";

const db = () => admin.firestore();
const nowSec = () => Math.floor(Date.now() / 1000);
const sha256 = (v) => crypto.createHash("sha256").update(String(v)).digest("hex");

/** 010-1234-5678 / 01012345678 / +821012345678 → +821012345678 */
function toE164(raw) {
    const digits = String(raw || "").replace(/[^0-9]/g, "");
    if (!digits) return "";
    if (digits.startsWith("82")) return "+" + digits;
    if (digits.startsWith("0")) return "+82" + digits.slice(1);
    return "+82" + digits;
}

function assertKoreanMobile(e164) {
    // +82 10 XXXXXXXX
    if (!/^\+8210\d{7,8}$/.test(e164)) {
        throw new HttpsError("invalid-argument", "휴대폰 번호 형식이 올바르지 않습니다.");
    }
}

/** 타이밍 공격 방지 비교 */
function safeEqual(a, b) {
    const ba = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
}

async function sendSms(phoneDigits, code, label) {
    const resp = await fetch(SMS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SMS_KEY}` },
        body: JSON.stringify({
            to: phoneDigits,
            templateId: "VERIFY_CODE",
            label: label || "홈프로",
            variables: { code },
        }),
    });
    if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`SMS 게이트웨이 응답 ${resp.status} ${text.slice(0, 200)}`);
    }
    return resp.json().catch(() => null);
}

/* ─────────────────────────────────────────────────────────────
   1) 인증번호 요청
   ───────────────────────────────────────────────────────────── */
exports.requestPhoneCode = onCall({ region: REGION }, async (request) => {
    const e164 = toE164(request.data?.phone);
    assertKoreanMobile(e164);

    const ref = db().collection(COL).doc(e164);
    const snap = await ref.get();
    const prev = snap.exists ? snap.data() : null;
    const t = nowSec();

    // 재발송 쿨다운
    if (prev?.lastSentAt && t - prev.lastSentAt < RESEND_COOLDOWN_SEC) {
        throw new HttpsError(
            "resource-exhausted",
            `${RESEND_COOLDOWN_SEC - (t - prev.lastSentAt)}초 후에 다시 시도해 주세요.`,
        );
    }

    // 시간당 발송 제한
    let sendCount = prev?.sendCount || 0;
    let windowStartedAt = prev?.windowStartedAt || t;
    if (t - windowStartedAt >= SEND_WINDOW_SEC) {
        sendCount = 0;
        windowStartedAt = t;
    }
    if (sendCount >= MAX_SENDS_PER_WINDOW) {
        throw new HttpsError("resource-exhausted", "발송 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.");
    }

    // 코드 생성 — 암호학적 난수
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    const salt = crypto.randomBytes(16).toString("hex");

    await ref.set({
        phoneE164: e164,
        codeHash: sha256(salt + code),
        salt,
        expiresAt: t + CODE_TTL_SEC,
        attempts: 0,
        sendCount: sendCount + 1,
        windowStartedAt,
        lastSentAt: t,
        // 이전 인증 결과는 무효화
        tokenHash: admin.firestore.FieldValue.delete(),
        tokenExpiresAt: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    try {
        // label 은 서버 상수로 고정 — 클라이언트 값을 통과시키면 발신 문구 일부를
        // 임의 문자열로 바꿔 보낼 수 있다(스미싱 악용 소지, 검수 7/28)
        await sendSms(e164.replace(/^\+82/, "0"), code, "홈프로");
    } catch (e) {
        console.error("SMS 발송 실패:", e.message);
        throw new HttpsError("unavailable", "문자 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }

    return { ok: true, expiresInSec: CODE_TTL_SEC, resendAfterSec: RESEND_COOLDOWN_SEC };
});

/* ─────────────────────────────────────────────────────────────
   2) 인증번호 검증 → verificationToken 발급
   ───────────────────────────────────────────────────────────── */
exports.verifyPhoneCode = onCall({ region: REGION }, async (request) => {
    const e164 = toE164(request.data?.phone);
    assertKoreanMobile(e164);
    const code = String(request.data?.code || "").replace(/[^0-9]/g, "");
    if (code.length !== 6) throw new HttpsError("invalid-argument", "인증번호 6자리를 입력해 주세요.");

    const ref = db().collection(COL).doc(e164);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "인증번호를 먼저 요청해 주세요.");

    const data = snap.data();
    const t = nowSec();

    if (!data.codeHash || !data.expiresAt || t > data.expiresAt) {
        throw new HttpsError("deadline-exceeded", "인증번호가 만료되었습니다. 다시 요청해 주세요.");
    }
    if ((data.attempts || 0) >= MAX_ATTEMPTS) {
        throw new HttpsError("resource-exhausted", "입력 횟수를 초과했습니다. 인증번호를 다시 요청해 주세요.");
    }

    if (!safeEqual(sha256(data.salt + code), data.codeHash)) {
        await ref.update({ attempts: admin.firestore.FieldValue.increment(1) });
        const left = MAX_ATTEMPTS - ((data.attempts || 0) + 1);
        throw new HttpsError("invalid-argument", `인증번호가 올바르지 않습니다. (남은 시도 ${Math.max(left, 0)}회)`);
    }

    // 성공 — 코드 폐기하고 짧은 수명 토큰 발급
    const token = crypto.randomBytes(32).toString("hex");
    await ref.set({
        codeHash: admin.firestore.FieldValue.delete(),
        salt: admin.firestore.FieldValue.delete(),
        expiresAt: admin.firestore.FieldValue.delete(),
        attempts: 0,
        tokenHash: sha256(token),
        tokenExpiresAt: t + TOKEN_TTL_SEC,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { ok: true, verificationToken: token, expiresInSec: TOKEN_TTL_SEC };
});

/** 토큰 유효성 확인 (소비하지 않음) */
async function assertToken(e164, token) {
    if (!token) throw new HttpsError("permission-denied", "전화번호 인증이 필요합니다.");
    const ref = db().collection(COL).doc(e164);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("permission-denied", "전화번호 인증이 필요합니다.");
    const d = snap.data();
    if (!d.tokenHash || !d.tokenExpiresAt || nowSec() > d.tokenExpiresAt) {
        throw new HttpsError("permission-denied", "인증이 만료되었습니다. 다시 인증해 주세요.");
    }
    if (!safeEqual(sha256(token), d.tokenHash)) {
        throw new HttpsError("permission-denied", "인증 정보가 올바르지 않습니다.");
    }
    return ref;
}

/* ─────────────────────────────────────────────────────────────
   3) 전화번호 연결 + 계정 통합 (인증 토큰 필수)
   ───────────────────────────────────────────────────────────── */
exports.linkPhoneToAccount = onCall({ region: REGION }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const e164 = toE164(request.data?.phone);
    assertKoreanMobile(e164);
    const verifRef = await assertToken(e164, request.data?.verificationToken);

    const provider = String(request.data?.provider || "").toLowerCase();
    const local = e164.replace(/^\+82/, "0");
    const phoneText = local.length === 11
        ? `${local.slice(0, 3)}-${local.slice(3, 7)}-${local.slice(7)}`
        : local;

    const firestore = db();
    const phoneRef = firestore.collection("phones").doc(e164);
    const meRef = firestore.collection("users").doc(uid);

    const result = await firestore.runTransaction(async (tx) => {
        const [phoneSnap, meSnap] = await Promise.all([tx.get(phoneRef), tx.get(meRef)]);
        const phoneData = phoneSnap.exists ? phoneSnap.data() : null;
        // 구 시드/레거시 phones 문서는 primaryUid 없이 uid 필드만 갖는다 —
        // 폴백이 없으면 기존 계정과 병합 없이 번호를 조용히 가로채게 됨 (검수 7/28)
        const primaryUid = phoneData?.primaryUid || phoneData?.uid || uid;
        const merged = primaryUid !== uid;

        if (merged) {
            // 이 번호를 이미 쓰는 계정이 있다 → 그 계정에 현재 로그인 UID 를 연결
            const primaryRef = firestore.collection("users").doc(primaryUid);
            const primarySnap = await tx.get(primaryRef);
            if (!primarySnap.exists) {
                // 대표 계정 문서가 사라진 경우 → 내 계정을 대표로 승격
                tx.set(phoneRef, { primaryUid: uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            } else {
                const linkField = provider === "email" || provider === "password"
                    ? "linkedEmailUids"
                    : "linkedSocialUids";
                tx.set(primaryRef, {
                    [linkField]: admin.firestore.FieldValue.arrayUnion(uid),
                    providers: admin.firestore.FieldValue.arrayUnion(provider || "unknown"),
                    // 대표 문서에 번호가 비어 있으면(데이터 드리프트) 인증할 때마다
                    // RequirePhone 에 걸려 영구 바운스 — 방어적으로 함께 기록 (검수 7/28)
                    phoneE164: e164,
                    phone: phoneText,
                    phoneVerified: true,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });

                // 내 문서는 "내용이 없을 때만" 삭제 (이력이 있으면 남겨둔다)
                const me = meSnap.exists ? meSnap.data() : null;
                const isEmpty = !me || (!me.name && !me.role && !me.nickname);
                if (meSnap.exists && isEmpty) {
                    tx.delete(meRef);
                } else if (meSnap.exists) {
                    tx.set(meRef, {
                        mergedInto: primaryUid,
                        phoneE164: e164,
                        phone: phoneText,
                        phoneVerified: true,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });
                }
            }
        } else {
            tx.set(meRef, {
                phoneE164: e164,
                phone: phoneText,
                phoneVerified: true,
                authUid: uid, // 4단계 조회 1단계가 실제로 동작하도록 기록
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        }

        // phones 인덱스
        if (!phoneSnap.exists) {
            tx.set(phoneRef, {
                phoneE164: e164,
                primaryUid: uid,
                linkedUids: [uid],
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } else {
            tx.set(phoneRef, {
                // 구 문서에 primaryUid 가 없으면 이번에 확정한 값으로 백필 —
                // 안 하면 이 번호는 영영 병합 판정이 안 된다 (검수 7/28)
                primaryUid,
                linkedUids: admin.firestore.FieldValue.arrayUnion(uid),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        }

        return { primaryUid: merged ? primaryUid : uid, merged };
    });

    // 보조 인덱스는 항상 대표 UID 를 가리키게 (예전엔 호출 UID 를 써서 어긋났음)
    await firestore.collection("users_by_phone").doc(e164).set({
        uid: result.primaryUid,
        phoneE164: e164,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // 토큰 1회용 — 사용 후 폐기
    await verifRef.set({
        tokenHash: admin.firestore.FieldValue.delete(),
        tokenExpiresAt: admin.firestore.FieldValue.delete(),
        consumedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { ok: true, ...result };
});

/* ─────────────────────────────────────────────────────────────
   4) 비밀번호 재설정 — 전화 인증 토큰 검증 후 서버가 직접 변경
   (기존 /resetPassword 는 인증 없이 uid+newPassword 만으로 남의
    비밀번호를 바꿀 수 있는 열린 엔드포인트였음 → 폐쇄하고 대체.
    가입 아이디는 가상 도메인(@homepro.app) 이메일이라 재설정 "메일"은
    도달할 수 없다 — 그래서 메일 발송이 아니라 직접 변경 방식이어야 한다)
   ───────────────────────────────────────────────────────────── */
exports.resetPasswordWithPhone = onCall({ region: REGION }, async (request) => {
    const e164 = toE164(request.data?.phone);
    assertKoreanMobile(e164);
    const verifRef = await assertToken(e164, request.data?.verificationToken);

    const loginId = String(request.data?.loginId || "").trim().toLowerCase();
    const newPassword = String(request.data?.newPassword || "");
    if (!loginId) throw new HttpsError("invalid-argument", "아이디를 입력해 주세요.");
    if (newPassword.length < 6) throw new HttpsError("invalid-argument", "비밀번호는 6자 이상이어야 합니다.");

    // 인증된 번호의 계정 조회
    const firestore = db();
    let uid = null;
    const idx = await firestore.collection("users_by_phone").doc(e164).get();
    if (idx.exists) uid = idx.data()?.uid || null;
    if (!uid) {
        const ph = await firestore.collection("phones").doc(e164).get();
        if (ph.exists) uid = ph.data()?.primaryUid || ph.data()?.uid || null;
    }
    if (!uid) throw new HttpsError("not-found", "이 전화번호로 가입된 계정이 없습니다.");

    const userSnap = await firestore.collection("users").doc(uid).get();
    if (!userSnap.exists) throw new HttpsError("not-found", "계정 정보를 찾을 수 없습니다.");
    const u = userSnap.data();

    // 입력한 아이디가 이 계정 것인지 확인 (이메일/이메일 로컬부/loginId/닉네임/이름)
    const candidates = [];
    if (u.email) { candidates.push(String(u.email).toLowerCase()); candidates.push(String(u.email).split("@")[0].toLowerCase()); }
    if (u.loginId) candidates.push(String(u.loginId).toLowerCase());
    if (u.nickname) candidates.push(String(u.nickname).toLowerCase());
    if (u.name) candidates.push(String(u.name).toLowerCase());
    if (!candidates.includes(loginId)) {
        throw new HttpsError("permission-denied", "입력한 아이디와 전화번호가 일치하는 계정이 없습니다.");
    }

    // 소셜 계정은 비밀번호가 없다
    const prov = String(u.provider || "").toLowerCase();
    if (["google", "kakao", "apple"].some((p) => prov.includes(p))) {
        throw new HttpsError("failed-precondition", "소셜 로그인 계정입니다. 해당 소셜 로그인을 이용해 주세요.");
    }
    if (!u.email) throw new HttpsError("failed-precondition", "이메일(아이디) 정보가 없는 계정입니다. 관리자에게 문의해 주세요.");

    // Auth 계정은 이메일로 찾는다 — 계정 통합으로 문서 ID 와 Auth uid 가 다를 수 있음
    let authUser;
    try {
        authUser = await admin.auth().getUserByEmail(u.email);
    } catch (e) {
        throw new HttpsError("not-found", "로그인 계정을 찾을 수 없습니다. 관리자에게 문의해 주세요.");
    }
    await admin.auth().updateUser(authUser.uid, { password: newPassword });
    await firestore.collection("users").doc(uid).set(
        { updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true },
    );

    // 토큰 1회용 소비
    await verifRef.set({
        tokenHash: admin.firestore.FieldValue.delete(),
        tokenExpiresAt: admin.firestore.FieldValue.delete(),
        consumedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { ok: true };
});

/* ─────────────────────────────────────────────────────────────
   5) 아이디 찾기 — 인증된 번호로 가입 아이디 조회
   ───────────────────────────────────────────────────────────── */
exports.findAccountByPhone = onCall({ region: REGION }, async (request) => {
    const e164 = toE164(request.data?.phone);
    assertKoreanMobile(e164);
    await assertToken(e164, request.data?.verificationToken);

    const firestore = db();
    let uid = null;
    const idx = await firestore.collection("users_by_phone").doc(e164).get();
    if (idx.exists) uid = idx.data()?.uid || null;
    if (!uid) {
        const ph = await firestore.collection("phones").doc(e164).get();
        if (ph.exists) uid = ph.data()?.primaryUid || null;
    }
    if (!uid) return { ok: true, found: false };

    const userSnap = await firestore.collection("users").doc(uid).get();
    if (!userSnap.exists) return { ok: true, found: false };

    const u = userSnap.data();
    const email = u.email || "";
    // 내부 아이디 도메인은 떼고 보여준다
    const loginId = email.endsWith("@homepro.app") ? email.replace("@homepro.app", "") : email;
    return {
        ok: true,
        found: true,
        loginId,
        provider: u.provider || (Array.isArray(u.providers) ? u.providers[0] : "") || "",
        createdAt: u.createdAt ? u.createdAt.toDate?.()?.toISOString?.() || null : null,
    };
});
