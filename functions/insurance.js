/**
 * 보험(도급배상책임보험) 서버 — 스케줄 갱신·만료·사고접수 알림 + 토스/보험 공통 헬퍼
 * 사양: docs/insurance-dev-spec.md (2026-09-13 형 확정)
 *
 *  공통 헬퍼(tossPay.js 도 같이 쓴다 — 순환 require 를 피하려고 여기에만 둔다)
 *   · loadInsuranceSettings   settings/insurance 를 읽고 없는 값은 사양의 기본값으로 채운다
 *   · resolveCaller           request.auth.uid → users 문서 ID (linkedSocialUids / linkedSocialUid 연동까지)
 *   · tossRequest             토스 API 호출 (시크릿 키 Basic 인증, 없으면 문서 테스트 키 폴백)
 *   · chargeBillingKey        /v1/billing/{billingKey} 자동결제 승인
 *   · refreshUserInsurance    users/{uid}.insurance 요약 갱신 (yearly·monthly 만 — perOrder 는 오더에만 기록)
 *   · createNotification      notifications 문서 생성 (index.js createNotification 과 같은 스키마 + read:false)
 *   · addMonths / addYears    월말 넘김 안전한 날짜 계산
 *
 *  스케줄·트리거
 *   · insuranceMonthlyCharge  매일 03:00 KST — nextChargeAt 이 지난 월 구독형을 빌링 승인. 실패 3회면 expired
 *   · insuranceExpireSweep    매일 03:30 KST — endAt 이 지난 yearly/monthly active 를 expired 로 (갱신이 먼저 돌도록 30분 뒤)
 *   · onInsuranceClaimCreated insurance_claims 생성 → 보험대리점 관리자(users.insuranceAdmin) 에게 알림
 *
 *  admin.initializeApp() 은 index.js 에서만 한다. 여기서는 admin.firestore() 를 함수 안에서 lazy 로 부른다.
 */
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const REGION = "asia-northeast3";
const TOSS_API = "https://api.tosspayments.com";
// 계약 전(9/14 예정)이라 토스 문서 공개 테스트 키 폴백을 허용한다. 앞단 test_gck_docs_… 와 한 쌍. 돈은 빠지지 않는다.
const TOSS_SECRET_KEY_FALLBACK = "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";
const secretKey = () => process.env.TOSS_SECRET_KEY || TOSS_SECRET_KEY_FALLBACK;

const POLICIES = "insurance_policies";
const PAYMENTS = "payments";
const USERS = "users";
const MAX_BILLING_FAILS = 3;

const db = () => admin.firestore();
const Timestamp = () => admin.firestore.Timestamp;
const tsNow = () => admin.firestore.Timestamp.now();
const toDate = (v) => (v && typeof v.toDate === "function" ? v.toDate() : v instanceof Date ? v : v ? new Date(v) : null);

// ─────────────────────────── 날짜 ───────────────────────────
/** 월 더하기 — 1/31 +1개월 = 2/28(29) 처럼 월말을 넘기지 않는다 */
function addMonths(date, n) {
    const d = new Date(toDate(date));
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return d;
}
const addYears = (date, n) => addMonths(date, 12 * n);

// ─────────────────────────── 설정 ───────────────────────────
const DEFAULT_PLANS = {
    yearly: { label: "1년 단체보험", price: 110000, active: true },
    monthly: { label: "월 구독형 보험", price: 11000, active: true },
    perOrder: { label: "건당 단기보험", rate: 1, minPrice: 3000, active: true },
};

/** 건당 보험료 위험도 4그룹 (대표 9/12 회신 — 임시값. 카테고리→그룹 배정표는 대표가 줄 때까지 모두 g1) */
const DEFAULT_PER_ORDER = {
    minPrice: 3000,
    groups: {
        g1: { label: "1그룹(저위험)", rate: 1 },
        g2: { label: "2그룹", rate: 1.3 },
        g3: { label: "3그룹", rate: 1.6 },
        g4: { label: "4그룹(고위험)", rate: 2 },
    },
    categoryGroup: {},      // { [categoryId]: "g1"|"g2"|"g3"|"g4" } — 없으면 defaultGroup
    defaultGroup: "g1",
};
const DEFAULT_COVERAGE = {
    maxText: "",
    deductibleText: "30만원 (공통)",   // 자기부담금 공통 30만원 (대표 9/12)
    maxByGroup: {},                     // { g1:"", g2:"", g3:"", g4:"" } — 빈칸이면 "보험사 확정 후 안내"
    items: ["작업 중 고객 재물 파손 배상", "작업 중 대인 피해 배상"],
};

/** settings/insurance 를 읽고, 빠진 값은 사양 기본값으로 채운다 (plans · perOrder 그룹 요율 · coverage · agencyContacts) */
async function loadInsuranceSettings() {
    const snap = await db().doc("settings/insurance").get();
    const data = snap.exists ? snap.data() : {};
    const plans = {};
    for (const key of Object.keys(DEFAULT_PLANS)) {
        plans[key] = { ...DEFAULT_PLANS[key], ...((data.plans && data.plans[key]) || {}) };
    }
    const po = (data.perOrder && typeof data.perOrder === "object") ? data.perOrder : {};
    const groups = {};
    for (const g of Object.keys(DEFAULT_PER_ORDER.groups)) {
        groups[g] = { ...DEFAULT_PER_ORDER.groups[g], ...((po.groups && po.groups[g]) || {}) };
    }
    for (const g of Object.keys(po.groups || {})) if (!groups[g]) groups[g] = po.groups[g]; // 관리자가 그룹을 더 만든 경우
    const perOrder = {
        minPrice: Number(po.minPrice) > 0 ? Number(po.minPrice) : (Number(plans.perOrder.minPrice) > 0 ? Number(plans.perOrder.minPrice) : DEFAULT_PER_ORDER.minPrice),
        groups,
        categoryGroup: (po.categoryGroup && typeof po.categoryGroup === "object") ? po.categoryGroup : {},
        defaultGroup: po.defaultGroup && groups[po.defaultGroup] ? po.defaultGroup : DEFAULT_PER_ORDER.defaultGroup,
    };
    const coverage = { ...DEFAULT_COVERAGE, ...((data.coverage && typeof data.coverage === "object") ? data.coverage : {}) };
    if (!coverage.maxByGroup || typeof coverage.maxByGroup !== "object") coverage.maxByGroup = {};
    return { ...data, plans, perOrder, coverage, agencyContacts: Array.isArray(data.agencyContacts) ? data.agencyContacts : [] };
}

/**
 * 건당 보험료 — order.categoryId → 그룹 → 그룹 요율(%) × 기준 금액, 최소 minPrice.
 * 그룹 요율이 없으면 plans.perOrder.rate(단일 요율) 폴백.
 * 돌려주는 값: { amount, group, rate, base, minPrice }  (base <= 0 이면 amount 0)
 */
function perOrderPremium(baseAmount, settings, categoryId) {
    const po = settings.perOrder || DEFAULT_PER_ORDER;
    const base = Number(baseAmount) || 0;
    const min = Number(po.minPrice) || DEFAULT_PER_ORDER.minPrice;
    const cat = categoryId ? String(categoryId) : "";
    let group = (cat && po.categoryGroup && po.categoryGroup[cat]) || po.defaultGroup || DEFAULT_PER_ORDER.defaultGroup;
    if (!po.groups || !po.groups[group]) group = po.defaultGroup || DEFAULT_PER_ORDER.defaultGroup;
    const groupRate = po.groups && po.groups[group] ? Number(po.groups[group].rate) : NaN;
    const fallbackRate = Number(settings.plans && settings.plans.perOrder && settings.plans.perOrder.rate) || DEFAULT_PLANS.perOrder.rate;
    const rate = Number.isFinite(groupRate) && groupRate > 0 ? groupRate : fallbackRate;
    if (base <= 0) return { amount: 0, group, rate, base, minPrice: min };
    return { amount: Math.max(min, Math.round((base * rate) / 100)), group, rate, base, minPrice: min };
}

// ─────────────────────────── 호출자 ───────────────────────────
/**
 * request.auth.uid 로 users 문서를 찾는다.
 * 소셜 연동 계정은 Auth uid ≠ users 문서 ID 라서 linkedSocialUids(배열, 신형) → linkedSocialUid(단수, 구형) 순으로 본다.
 * 돌려주는 값: { uid(users 문서 ID), authUid, user(문서 데이터) }
 */
async function resolveCaller(request) {
    const authUid = request.auth && request.auth.uid;
    if (!authUid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    const users = db().collection(USERS);
    const direct = await users.doc(authUid).get();
    if (direct.exists) return { uid: authUid, authUid, user: direct.data() };
    let q = await users.where("linkedSocialUids", "array-contains", authUid).limit(1).get();
    if (q.empty) q = await users.where("linkedSocialUid", "==", authUid).limit(1).get();
    if (q.empty) throw new HttpsError("failed-precondition", "회원 정보를 찾을 수 없습니다. 가입을 먼저 마쳐주세요.");
    return { uid: q.docs[0].id, authUid, user: q.docs[0].data() };
}

const userDisplayName = (u) => (u && (u.companyName || u.name || u.nickname || u.displayName)) || "";
const userPhone = (u) => (u && (u.phone || u.phoneNumber)) || "";

// ─────────────────────────── 토스 ───────────────────────────
/** 토스 API POST — { ok, status, json } 로 돌려준다. 네트워크 오류는 throw */
async function tossRequest(path, body, extraHeaders = {}) {
    const res = await fetch(TOSS_API + path, {
        method: "POST",
        headers: {
            // 시크릿 키 뒤에 콜론을 붙여 base64 (토스 규격)
            Authorization: `Basic ${Buffer.from(`${secretKey()}:`).toString("base64")}`,
            "Content-Type": "application/json",
            ...extraHeaders,
        },
        body: JSON.stringify(body || {}),
    });
    let json = null;
    try { json = await res.json(); } catch (_) { json = null; }
    return { ok: res.ok, status: res.status, json };
}

/** 빌링키 자동결제 승인 — /v1/billing/{billingKey}. orderId 를 Idempotency-Key 로 써서 같은 주문 이중 승인 방지 */
async function chargeBillingKey({ billingKey, customerKey, amount, orderId, orderName, customerName }) {
    const body = { customerKey, amount: Number(amount), orderId, orderName };
    if (customerName) body.customerName = String(customerName).slice(0, 100);
    return tossRequest(`/v1/billing/${encodeURIComponent(billingKey)}`, body, { "Idempotency-Key": orderId });
}

/** 카드번호 마스킹 — 앞 4·뒤 4 만 남긴다 (토스가 이미 가린 값이 와도 같은 모양으로 정리) */
function maskCardNumber(num) {
    const s = String(num || "").replace(/[^0-9*]/g, "");
    if (!s) return null;
    if (s.length <= 8) return s.replace(/[0-9](?=[0-9*]{4})/g, "*");
    return s.slice(0, 4) + "*".repeat(s.length - 8) + s.slice(-4);
}

/** 토스 주문번호 — 사양 규칙 hp_<purpose짧게>_<참조id>_<base36 시각>. 토스 허용 문자 [A-Za-z0-9_=-] 6~64자 */
function makeTossOrderId(purpose, refId) {
    const short = { insurance_yearly: "ins_y", insurance_monthly: "ins_m", insurance_order: "ins_o", subscription: "sub" }[purpose] || "etc";
    const ref = String(refId || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 28) || "x";
    return `hp_${short}_${ref}_${Date.now().toString(36)}`.slice(0, 64);
}

// ─────────────────────────── users.insurance 요약 ───────────────────────────
/**
 * users/{uid}.insurance = { type, status, endAt, policyId, autoRenew, updatedAt }
 * yearly·monthly 만 본다(perOrder 는 오더 한 건짜리라 프로필 배지 대상이 아님 — 오더 문서 insurance 에 기록).
 * active 중 endAt 이 가장 늦은 것 → 없으면 가장 최근 것(만료 표시용) → 아무것도 없으면 null.
 */
async function refreshUserInsurance(uid) {
    if (!uid) return null;
    const snap = await db().collection(POLICIES).where("uid", "==", uid).get();
    const general = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p) => p.type === "yearly" || p.type === "monthly");
    const ms = (v) => { const d = toDate(v); return d ? d.getTime() : 0; };
    const active = general.filter((p) => p.status === "active").sort((a, b) => ms(b.endAt) - ms(a.endAt));
    const pick = active[0] || general.sort((a, b) => ms(b.updatedAt || b.createdAt) - ms(a.updatedAt || a.createdAt))[0] || null;
    const summary = pick
        ? { type: pick.type, status: pick.status, endAt: pick.endAt || null, policyId: pick.id, autoRenew: pick.type === "monthly" ? pick.autoRenew !== false : null, updatedAt: tsNow() }
        : null;
    await db().collection(USERS).doc(uid).set({ insurance: summary }, { merge: true });
    return summary;
}

// ─────────────────────────── 알림 ───────────────────────────
/** notifications 문서 — index.js createNotification 과 같은 스키마(+ read:false). onNotificationSend 가 FCM 으로 보낸다 */
async function createNotification(type, title, body, targetUids, data = {}) {
    const uids = (targetUids || []).filter(Boolean);
    if (uids.length === 0) return null;
    const ref = await db().collection("notifications").add({
        targetUids: uids,
        title,
        body,
        type,
        data,
        read: false,
        sent: false,
        createdAt: tsNow(),
    });
    return ref.id;
}

// ─────────────────────────── 월 구독형 갱신 ───────────────────────────
/**
 * 월 구독형 1건 갱신 — 빌링키 승인 → payments done → endAt·nextChargeAt +1개월. 실패면 failCount+1, 3회면 expired.
 * 돌려주는 값: { ok, expired?, paymentId?, code? }
 */
async function renewMonthlyPolicy(policyDoc, settings) {
    const policy = policyDoc.data();
    const policyId = policyDoc.id;
    const billing = policy.billing || {};
    const uid = policy.uid;
    const plan = settings.plans.monthly;
    const amount = Number(plan.price) || DEFAULT_PLANS.monthly.price;

    if (!billing.billingKey || !billing.customerKey) {
        console.warn("[insurance] 빌링 정보 없음 — 건너뜀", policyId);
        return { ok: false, code: "NO_BILLING" };
    }

    const tossOrderId = makeTossOrderId("insurance_monthly", uid.slice(0, 8));
    const payRef = db().collection(PAYMENTS).doc(tossOrderId);
    const orderName = `${plan.label || "월 구독형 보험"} 갱신`;
    await payRef.set({
        purpose: "insurance_monthly",
        uid,
        authUid: null,
        amount,
        status: "ready",
        tossOrderId,
        orderName,
        method: "billing",
        renewal: true,
        meta: { policyId, orderId: null, planType: "monthly" },
        createdAt: tsNow(),
        updatedAt: tsNow(),
    });

    let r;
    try {
        r = await chargeBillingKey({
            billingKey: billing.billingKey, customerKey: billing.customerKey, amount, orderId: tossOrderId, orderName, customerName: policy.userName,
        });
    } catch (e) {
        r = { ok: false, status: 0, json: { code: "NETWORK", message: e.message } };
    }

    if (!r.ok) {
        const failCount = (Number(billing.failCount) || 0) + 1;
        const code = (r.json && r.json.code) || String(r.status);
        const message = (r.json && r.json.message) || "자동결제 승인에 실패했습니다.";
        console.error("[insurance] 월 구독형 갱신 실패", policyId, code, message);
        await payRef.set({ status: "fail", failCode: code, failMessage: message, raw: r.json || null, updatedAt: tsNow() }, { merge: true });

        const expired = failCount >= MAX_BILLING_FAILS;
        const patch = {
            "billing.failCount": failCount,
            "billing.lastFailAt": tsNow(),
            "billing.lastFailCode": code,
            "billing.lastFailMessage": message,
            updatedAt: tsNow(),
        };
        if (expired) {
            patch.status = "expired";
            patch.autoRenew = false;
            patch["billing.nextChargeAt"] = null;
            patch.expiredAt = tsNow();
            patch.expiredReason = "billing_failed";
        }
        await policyDoc.ref.update(patch);
        await refreshUserInsurance(uid);

        if (expired) {
            await createNotification(
                "insurance_expired",
                "보험 자동결제 실패로 보험이 만료되었습니다",
                `월 구독형 보험 자동결제가 ${MAX_BILLING_FAILS}회 실패해 보험이 만료되었습니다. 안심케어에서 다시 가입해 주세요.`,
                [uid],
                { policyId, reason: "billing_failed", failCode: code },
            );
        } else {
            await createNotification(
                "insurance_charge_failed",
                "보험 자동결제에 실패했습니다",
                `월 구독형 보험 자동결제가 실패했습니다(${failCount}/${MAX_BILLING_FAILS}회). 내일 다시 시도합니다. 카드 상태를 확인해 주세요.`,
                [uid],
                { policyId, failCount, failCode: code },
            );
        }
        return { ok: false, expired, code };
    }

    const result = r.json || {};
    await payRef.set({
        status: "done",
        paymentKey: result.paymentKey || null,
        tossMethod: result.method || null,
        approvedAt: result.approvedAt || null,
        receiptUrl: (result.receipt && result.receipt.url) || null,
        raw: result,
        updatedAt: tsNow(),
    }, { merge: true });

    const base = toDate(policy.endAt) || new Date();
    const newEnd = addMonths(base, 1);
    const nextBase = toDate(billing.nextChargeAt) || base;
    const newNext = addMonths(nextBase, 1);
    await policyDoc.ref.update({
        endAt: Timestamp().fromDate(newEnd),
        price: amount,
        paymentId: tossOrderId,
        "billing.nextChargeAt": Timestamp().fromDate(newNext),
        "billing.failCount": 0,
        "billing.lastChargedAt": tsNow(),
        updatedAt: tsNow(),
    });
    await refreshUserInsurance(uid);
    await createNotification(
        "insurance_renewed",
        "월 구독형 보험이 갱신되었습니다",
        `${amount.toLocaleString()}원이 결제되어 보험이 ${newEnd.getFullYear()}.${String(newEnd.getMonth() + 1).padStart(2, "0")}.${String(newEnd.getDate()).padStart(2, "0")} 까지 연장되었습니다.`,
        [uid],
        { policyId, paymentId: tossOrderId, amount },
    );
    return { ok: true, paymentId: tossOrderId };
}

/**
 * 매일 03:00 KST — 월 구독형 자동결제.
 * 쿼리는 type==monthly && status==active 만(등호 두 개는 복합 인덱스 없이 됨) 하고 nextChargeAt 비교는 메모리에서 한다.
 */
exports.insuranceMonthlyCharge = onSchedule(
    { schedule: "every day 03:00", timeZone: "Asia/Seoul", region: REGION, timeoutSeconds: 540 },
    async () => {
        const settings = await loadInsuranceSettings();
        const nowMs = Date.now();
        const snap = await db().collection(POLICIES).where("type", "==", "monthly").where("status", "==", "active").get();
        const due = snap.docs.filter((d) => {
            const p = d.data();
            if (p.autoRenew === false) return false;
            const next = toDate(p.billing && p.billing.nextChargeAt);
            return next && next.getTime() <= nowMs;
        });
        console.log(`[insurance] 월 구독형 갱신 대상 ${due.length}건 / active ${snap.size}건`);
        let ok = 0, fail = 0, expired = 0;
        for (const d of due) {
            try {
                const r = await renewMonthlyPolicy(d, settings);
                if (r.ok) ok += 1; else { fail += 1; if (r.expired) expired += 1; }
            } catch (e) {
                fail += 1;
                console.error("[insurance] 갱신 처리 중 예외", d.id, e);
            }
        }
        console.log(`[insurance] 월 구독형 갱신 결과 성공 ${ok} · 실패 ${fail} (만료 ${expired})`);
    },
);

// ─────────────────────────── 만료 정리 ───────────────────────────
/**
 * 매일 03:30 KST — endAt 이 지난 yearly/monthly active 를 expired 로.
 * 갱신(03:00)이 먼저 돌아야 정상 갱신된 월 구독형이 여기서 잘리지 않으니 30분 뒤에 돈다.
 * 자동결제가 켜져 있고 실패 3회 전인 월 구독형은 유예(내일 재시도)라 건드리지 않는다.
 * perOrder 는 endAt 이 체크아웃 시점이라 여기서 다루지 않는다(오더 흐름 쪽에서 처리).
 */
exports.insuranceExpireSweep = onSchedule(
    { schedule: "every day 03:30", timeZone: "Asia/Seoul", region: REGION, timeoutSeconds: 540 },
    async () => {
        const nowMs = Date.now();
        const snap = await db().collection(POLICIES).where("status", "==", "active").get();
        const targets = snap.docs.filter((d) => {
            const p = d.data();
            if (p.type !== "yearly" && p.type !== "monthly") return false;
            const end = toDate(p.endAt);
            if (!end || end.getTime() >= nowMs) return false;
            if (p.type === "monthly" && p.autoRenew !== false && (Number(p.billing && p.billing.failCount) || 0) < MAX_BILLING_FAILS && p.billing && p.billing.billingKey) return false; // 갱신 유예
            return true;
        });
        console.log(`[insurance] 만료 대상 ${targets.length}건 / active ${snap.size}건`);
        const touched = new Set();
        for (const d of targets) {
            const p = d.data();
            try {
                const patch = { status: "expired", expiredAt: tsNow(), expiredReason: "term_end", updatedAt: tsNow() };
                if (p.billing && typeof p.billing === "object") patch["billing.nextChargeAt"] = null;
                await d.ref.update(patch);
                touched.add(p.uid);
                await createNotification(
                    "insurance_expired",
                    "보험 기간이 끝났습니다",
                    `${p.type === "yearly" ? "1년 단체보험" : "월 구독형 보험"} 보장 기간이 끝났습니다. 계속 보장받으려면 안심케어에서 다시 가입해 주세요.`,
                    [p.uid],
                    { policyId: d.id, reason: "term_end" },
                );
            } catch (e) {
                console.error("[insurance] 만료 처리 실패", d.id, e);
            }
        }
        for (const uid of touched) {
            try { await refreshUserInsurance(uid); } catch (e) { console.error("[insurance] 요약 갱신 실패", uid, e); }
        }
    },
);

// ─────────────────────────── 앱 월 구독 자동결제 ───────────────────────────
/**
 * 매일 03:20 KST — users.subscription 자동결제 갱신 (대표 지시 9/16: 구독은 자동결제).
 * 만료 정리(subscriptionExpireSweep, 03:40)보다 먼저 돌아야 정상 갱신된 구독이 잘리지 않는다.
 * 보험 월납(renewMonthlyPolicy)과 같은 규칙: 실패하면 failCount+1, MAX_BILLING_FAILS 회면 자동연장을 끊는다.
 * 만료 처리 자체는 03:40 sweep 이 endAt 기준으로 한다.
 *
 * 쿼리는 accessTier=='tier1' 등호 하나만(복합 인덱스 불필요) 하고 나머지 조건은 메모리에서 거른다.
 */
async function chargeSubscription(userDoc, price) {
    const u = userDoc.data();
    const uid = userDoc.id;
    const sub = u.subscription || {};
    const billing = sub.billing || {};
    const amount = Number(price) || 16500;
    const orderName = "홈프로 월 구독 갱신";

    const tossOrderId = makeTossOrderId("subscription", uid.slice(0, 8));
    const payRef = db().collection(PAYMENTS).doc(tossOrderId);
    await payRef.set({
        purpose: "subscription", uid, authUid: null, amount, status: "ready",
        tossOrderId, orderName, method: "billing", renewal: true,
        meta: { policyId: null, orderId: null, planType: "subscription", pointsUsed: 0 },
        createdAt: tsNow(), updatedAt: tsNow(),
    });

    let r;
    try {
        r = await chargeBillingKey({
            billingKey: billing.billingKey, customerKey: billing.customerKey,
            amount, orderId: tossOrderId, orderName, customerName: userDisplayName(u),
        });
    } catch (e) {
        r = { ok: false, status: 0, json: { code: "NETWORK", message: e.message } };
    }

    if (!r.ok) {
        const failCount = (Number(billing.failCount) || 0) + 1;
        const code = (r.json && r.json.code) || String(r.status);
        const message = (r.json && r.json.message) || "자동결제 승인에 실패했습니다.";
        console.error("[subscription] 자동결제 실패", uid, code, message);
        await payRef.set({ status: "fail", failCode: code, failMessage: message, raw: r.json || null, updatedAt: tsNow() }, { merge: true });

        const giveUp = failCount >= MAX_BILLING_FAILS;
        const nextBilling = {
            ...billing, failCount, lastFailAt: tsNow(), lastFailCode: code, lastFailMessage: message,
        };
        if (giveUp) nextBilling.nextChargeAt = null;
        await userDoc.ref.set({
            subscription: { ...sub, autoRenew: giveUp ? false : sub.autoRenew, billing: nextBilling, updatedAt: tsNow() },
            updatedAt: tsNow(),
        }, { merge: true });

        await createNotification(
            giveUp ? "subscription_charge_gaveup" : "subscription_charge_failed",
            giveUp ? "구독 자동결제가 중단되었습니다" : "구독 자동결제에 실패했습니다",
            giveUp
                ? `구독 자동결제가 ${MAX_BILLING_FAILS}회 실패해 자동 연장을 멈췄습니다. 만료일이 지나면 2차수로 바뀝니다. 마이페이지 > 구독 관리에서 카드를 다시 등록해 주세요.`
                : `구독 자동결제가 실패했습니다(${failCount}/${MAX_BILLING_FAILS}회). 내일 다시 시도합니다. 카드 상태를 확인해 주세요.`,
            [uid],
            { failCount, failCode: code },
        );
        return { ok: false, giveUp, code };
    }

    const result = r.json || {};
    await payRef.set({
        status: "done",
        paymentKey: result.paymentKey || null,
        tossMethod: result.method || null,
        approvedAt: result.approvedAt || null,
        receiptUrl: (result.receipt && result.receipt.url) || null,
        raw: result, updatedAt: tsNow(),
    }, { merge: true });

    const base = toDate(sub.endAt) || new Date();
    const newEnd = addMonths(base, 1);
    const newNext = addMonths(toDate(billing.nextChargeAt) || base, 1);
    await userDoc.ref.set({
        accessTier: "tier1",
        subscription: {
            ...sub, status: "active", endAt: Timestamp().fromDate(newEnd),
            amount, paymentId: tossOrderId, pointsUsed: 0,
            billing: { ...billing, nextChargeAt: Timestamp().fromDate(newNext), failCount: 0, lastChargedAt: tsNow() },
            updatedAt: tsNow(),
        },
        updatedAt: tsNow(),
    }, { merge: true });

    await createNotification(
        "subscription_renewed",
        "월 구독이 갱신되었습니다",
        `${amount.toLocaleString()}원이 결제되어 구독이 ${newEnd.getFullYear()}.${String(newEnd.getMonth() + 1).padStart(2, "0")}.${String(newEnd.getDate()).padStart(2, "0")} 까지 연장되었습니다.`,
        [uid],
        { paymentId: tossOrderId, amount },
    );
    return { ok: true, paymentId: tossOrderId };
}

exports.subscriptionAutoCharge = onSchedule(
    { schedule: "every day 03:20", timeZone: "Asia/Seoul", region: REGION, timeoutSeconds: 540 },
    async () => {
        const settings = await db().doc("settings/subscription").get();
        const price = Number((settings.exists && settings.data().monthlyPrice) || 0) || 16500;
        const nowMs = Date.now();
        const snap = await db().collection("users").where("accessTier", "==", "tier1").get();
        const due = snap.docs.filter((d) => {
            const sub = d.data().subscription;
            if (!sub || sub.status !== "active" || sub.autoRenew !== true) return false;
            const b = sub.billing;
            if (!b || !b.billingKey || !b.customerKey) return false;
            if ((Number(b.failCount) || 0) >= MAX_BILLING_FAILS) return false;
            const next = toDate(b.nextChargeAt);
            return next && next.getTime() <= nowMs;
        });
        console.log(`[subscription] 자동결제 대상 ${due.length}건 / 0차수 ${snap.size}명`);
        let ok = 0, fail = 0, gaveUp = 0;
        for (const d of due) {
            try {
                const r = await chargeSubscription(d, price);
                if (r.ok) ok += 1; else { fail += 1; if (r.giveUp) gaveUp += 1; }
            } catch (e) {
                fail += 1;
                console.error("[subscription] 자동결제 처리 중 예외", d.id, e);
            }
        }
        console.log(`[subscription] 자동결제 결과 성공 ${ok} · 실패 ${fail} (중단 ${gaveUp})`);
    },
);

// ─────────────────────────── 월 구독(1차수) 만료 ───────────────────────────
/**
 * users.subscription.endAt 이 지난 1차수 회원을 2차수로 내린다 (매일 03:40 KST).
 * 구독 결제(tossPrepare/tossConfirm purpose=subscription)가 accessTier=tier1 로 올리는 것의 짝.
 * 관리자가 수동으로 올린 tier1(subscription 없음)은 건드리지 않는다.
 */
exports.subscriptionExpireSweep = onSchedule(
    { schedule: "every day 03:40", timeZone: "Asia/Seoul", region: REGION, timeoutSeconds: 540 },
    async () => {
        const nowMs = Date.now();
        const snap = await db().collection("users").where("accessTier", "==", "tier1").get();
        let n = 0;
        for (const d of snap.docs) {
            const u = d.data();
            const sub = u.subscription;
            if (!sub || sub.status !== "active") continue;
            const end = toDate(sub.endAt);
            if (!end || end.getTime() >= nowMs) continue;
            // 자동결제가 켜져 있고 실패 한도 전이면 유예 — 03:20 자동결제가 내일 다시 시도한다
            const b = sub.billing;
            if (sub.autoRenew === true && b && b.billingKey && (Number(b.failCount) || 0) < MAX_BILLING_FAILS) continue;
            try {
                await d.ref.set({ accessTier: "tier2", subscription: { ...sub, status: "expired", expiredAt: tsNow() }, updatedAt: tsNow() }, { merge: true });
                n += 1;
                await createNotification(
                    "subscription_expired",
                    "월 구독이 끝났습니다",
                    "구독 기간이 끝나 2차수로 바뀌었습니다. 마이페이지 > 구독 관리에서 다시 구독하면 접수 즉시 수락할 수 있어요.",
                    [d.id],
                    { reason: "term_end" },
                );
            } catch (e) {
                console.error("[subscription] 만료 처리 실패", d.id, e);
            }
        }
        console.log(`[subscription] 1차수 ${snap.size}명 중 만료 ${n}명 → 2차수`);
    },
);

// ─────────────────────────── 사고 접수 알림 ───────────────────────────
/**
 * insurance_claims/{id} 생성 → users.insuranceAdmin == true 전원에게 notifications.
 * settings/insurance.agencyContacts 가 있으면 알림톡 자리(지금은 로그만 — 실제 연동 전).
 */
exports.onInsuranceClaimCreated = onDocumentCreated(
    { document: "insurance_claims/{claimId}", region: REGION },
    async (event) => {
        const snap = event.data;
        if (!snap) return;
        const claim = snap.data() || {};
        const claimId = event.params.claimId;

        const admins = await db().collection(USERS).where("insuranceAdmin", "==", true).get();
        const adminUids = admins.docs.map((d) => d.id);
        const who = claim.userName || "회원";
        const levelLabel = { minor: "경미", major: "중대", injury: "인명" }[claim.damageLevel] || "";
        const body = [who, claim.place, levelLabel && `피해 ${levelLabel}`].filter(Boolean).join(" · ") || "새 사고 접수가 들어왔습니다.";

        if (adminUids.length > 0) {
            await createNotification(
                "insurance_claim",
                "보험 사고 접수",
                body,
                adminUids,
                { claimId, orderId: claim.orderId || null, policyId: claim.policyId || null, uid: claim.uid || null },
            );
        } else {
            console.warn("[insurance] 사고 접수 알림 — insuranceAdmin 회원이 없습니다", claimId);
        }

        // 알림톡 자리 — 대리점 담당자 연락처가 있으면 여기서 보낸다(현재 미연동, 로그만)
        try {
            const settings = await loadInsuranceSettings();
            const contacts = settings.agencyContacts.filter((c) => c && c.phone);
            if (contacts.length > 0) {
                console.log("[insurance] 알림톡 자리(미연동) — 사고 접수", claimId, contacts.map((c) => `${c.name || ""}(${c.phone})`).join(", "), body);
            }
        } catch (e) {
            console.warn("[insurance] agencyContacts 읽기 실패(무시)", e.message);
        }

        try {
            await snap.ref.set({ notifiedAdminUids: adminUids, notifiedAt: tsNow() }, { merge: true });
        } catch (e) {
            console.warn("[insurance] 알림 기록 실패(무시)", e.message);
        }
    },
);

module.exports = {
    ...exports,
    REGION,
    POLICIES,
    PAYMENTS,
    USERS,
    DEFAULT_PLANS,
    DEFAULT_PER_ORDER,
    DEFAULT_COVERAGE,
    MAX_BILLING_FAILS,
    secretKey,
    db,
    tsNow,
    toDate,
    addMonths,
    addYears,
    loadInsuranceSettings,
    perOrderPremium,
    resolveCaller,
    userDisplayName,
    userPhone,
    tossRequest,
    chargeBillingKey,
    maskCardNumber,
    makeTossOrderId,
    refreshUserInsurance,
    createNotification,
    renewMonthlyPolicy,
};
