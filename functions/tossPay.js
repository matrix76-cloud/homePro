/**
 * 토스페이먼츠 결제 — 보험(1년·건당·월 구독형 빌링) + 앱 월 구독. 사양: docs/insurance-dev-spec.md 3절
 * 스카이링크 functions/tossPay.js(tossPrepare/tossConfirm) 를 홈프로 스키마(purpose 별 후처리)로 옮긴 것.
 *
 *  ① tossPrepare({ purpose, refId })
 *       서버가 금액을 계산한다(앞단 금액 불신) → payments/{tossOrderId} ready → { tossOrderId, amount, orderName }
 *  ② tossConfirm({ paymentKey, orderId, amount })
 *       적어둔 금액과 대조 → 토스 승인 → payments done → purpose 별 후처리(policy 생성 / users.insurance / orders.insurance / users.subscription).
 *       이미 done 이면 다시 승인하지 않고, 후처리만 빠져 있으면(이전 호출이 중간에 죽은 경우) 후처리만 마저 한다.
 *  ③ tossBillingIssue({ authKey, customerKey, purpose })
 *       /v1/billing/authorizations/issue → billingKey → 첫 달 즉시 승인
 *       purpose 'insurance_monthly'(기본) → monthly policy(active, billing{...}) + users.insurance
 *       purpose 'subscription'           → users.accessTier=tier1 + users.subscription{autoRenew:true, billing{...}}
 *  ④ tossBillingCancel({ policyId } | { target:'subscription' })
 *       자동결제 해지 — endAt 까지는 active 유지, autoRenew:false, billing.nextChargeAt:null
 *
 *  payments/{tossOrderId}
 *   { purpose, uid, authUid, amount, status:'ready'|'done'|'fail', tossOrderId, orderName, method:'card'|'billing',
 *     paymentKey, tossMethod, approvedAt, receiptUrl, raw, meta:{ policyId, orderId, planType }, failCode, failMessage, createdAt, updatedAt }
 *
 *  시크릿 키: functions/.env.<프로젝트ID> 의 TOSS_SECRET_KEY. 없으면 토스 문서 테스트 키 폴백(계약 전 — insurance.js secretKey).
 *  admin.initializeApp() 은 index.js 에서만. 여기서는 admin.firestore() 를 함수 안에서 lazy 로 부른다.
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const ins = require("./insurance");

const {
    REGION, POLICIES, PAYMENTS, USERS, DEFAULT_PLANS,
    db, tsNow, toDate, addMonths, addYears,
    loadInsuranceSettings, perOrderPremium, resolveCaller, userDisplayName, userPhone,
    tossRequest, chargeBillingKey, maskCardNumber, makeTossOrderId, refreshUserInsurance,
} = ins;

const ORDERS = "homepro_orders";
const PURPOSES = ["insurance_yearly", "insurance_monthly", "insurance_order", "subscription"];
const SUBSCRIPTION_DEFAULT_PRICE = 16500;
const RENEW_WINDOW_DAYS = 30; // 유효한 1년/월 보험이 이보다 많이 남아 있으면 1년 보험을 또 팔지 않는다
const Timestamp = () => admin.firestore.Timestamp;
const fromDate = (d) => Timestamp().fromDate(d);

// ─────────────────────────── 공통 ───────────────────────────
/** 이 회원의 유효한 일반 보험(yearly·monthly, active) 중 endAt 이 가장 늦은 것 */
async function findActiveGeneralPolicy(uid) {
    const snap = await db().collection(POLICIES).where("uid", "==", uid).where("status", "==", "active").get();
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.type === "yearly" || p.type === "monthly");
    list.sort((a, b) => (toDate(b.endAt) || 0) - (toDate(a.endAt) || 0));
    return list[0] || null;
}

/**
 * 빌링키 발급 — /v1/billing/authorizations/issue.
 * 보험 월납과 앱 월 구독이 같은 절차라 여기서 한 번만 구현한다(토스 V2 빌링 가이드).
 * 돌려주는 값: { billingKey, cardCompany, cardNumberMasked }
 */
async function issueBillingKey({ authKey, customerKey }) {
    let issued;
    try {
        const r = await tossRequest("/v1/billing/authorizations/issue", { authKey: String(authKey), customerKey: String(customerKey) });
        issued = r.json || {};
        if (!r.ok) {
            console.error("[toss] 빌링키 발급 실패", r.status, issued);
            throw new HttpsError("aborted", issued.message || "카드 등록에 실패했습니다.");
        }
    } catch (e) {
        if (e instanceof HttpsError) throw e;
        console.error("[toss] 빌링키 발급 중 오류", e);
        throw new HttpsError("internal", "결제사와 연결하지 못했습니다.");
    }
    const billingKey = issued.billingKey;
    if (!billingKey) throw new HttpsError("internal", "빌링키를 받지 못했습니다.");
    const card = issued.card || {};
    return {
        billingKey,
        cardCompany: issued.cardCompany || card.company || null,
        cardNumberMasked: maskCardNumber(card.number || issued.cardNumber),
    };
}

/** 오더의 기준 금액 — b2bPriceAmount → onsiteQuotedPrice → applicantQuotes[matchedProUid]. 없으면 0 */
function orderBaseAmount(order) {
    const a = Number(order.b2bPriceAmount) || 0;
    if (a > 0) return a;
    const b = Number(order.onsiteQuotedPrice) || 0;
    if (b > 0) return b;
    const quotes = order.applicantQuotes || {};
    const c = order.matchedProUid ? Number(quotes[order.matchedProUid]) || 0 : 0;
    return c > 0 ? c : 0;
}

/** 구독료 — settings/subscription.monthlyPrice → settings/point_rules.monthlySubscriptionPoint(앱이 쓰는 값) → 16500 */
async function subscriptionPrice() {
    const s = await db().doc("settings/subscription").get();
    if (s.exists && Number(s.data().monthlyPrice) > 0) return Number(s.data().monthlyPrice);
    const pr = await db().doc("settings/point_rules").get();
    if (pr.exists && Number(pr.data().monthlySubscriptionPoint) > 0) return Number(pr.data().monthlySubscriptionPoint);
    return SUBSCRIPTION_DEFAULT_PRICE;
}

/** 새 policy 문서의 공통 뼈대(사양 2절) */
function basePolicy({ uid, user, type, price, startAt, endAt, paymentId, orderId = null, billing = null }) {
    const phone = userPhone(user);
    return {
        uid,
        userName: userDisplayName(user),
        userPhone: phone,
        type,
        status: "active",
        price: Number(price) || 0,
        startAt: fromDate(startAt),
        endAt: endAt ? fromDate(endAt) : null,
        paymentId: paymentId || null,
        orderId,
        billing,
        autoRenew: type === "monthly" ? true : null,
        identity: { verified: !!phone, method: phone ? "phone" : "none", verifiedAt: phone ? tsNow() : null }, // CP사 본인인증 연동 전엔 이름·전화 확인으로 대체
        createdAt: tsNow(),
        updatedAt: tsNow(),
        canceledAt: null,
    };
}

// ─────────────────────────── ① 결제 준비 ───────────────────────────
/**
 * data: { purpose: 'insurance_yearly'|'insurance_order'|'subscription', refId?: string(오더 ID — insurance_order 만 필수) }
 * 돌려주는 값: { paymentId, tossOrderId, amount, orderName, purpose, meta }
 * insurance_monthly 는 결제위젯이 아니라 빌링 인증(tossBillingIssue) 으로 가야 하므로 여기서는 거절한다.
 */
exports.tossPrepare = onCall({ region: REGION }, async (request) => {
    const { purpose, refId, pointsUsed: pointsUsedRaw } = request.data || {};
    if (!PURPOSES.includes(purpose)) throw new HttpsError("invalid-argument", "결제 목적(purpose)이 올바르지 않습니다.");
    if (purpose === "insurance_monthly") throw new HttpsError("failed-precondition", "월 구독형 보험은 카드 자동결제 등록(tossBillingIssue)으로 가입합니다.");

    const { uid, authUid, user } = await resolveCaller(request);
    const settings = await loadInsuranceSettings();
    let amount = 0;
    let orderName = "";
    let ref = uid.slice(0, 8);
    const meta = { policyId: null, orderId: null, planType: null };

    if (purpose === "insurance_yearly") {
        const plan = settings.plans.yearly;
        if (plan.active === false) throw new HttpsError("failed-precondition", "1년 단체보험은 지금 가입할 수 없습니다.");
        const cur = await findActiveGeneralPolicy(uid);
        if (cur && toDate(cur.endAt) && toDate(cur.endAt).getTime() - Date.now() > RENEW_WINDOW_DAYS * 86400000) {
            throw new HttpsError("failed-precondition", `이미 유효한 ${cur.type === "yearly" ? "1년 단체보험" : "월 구독형 보험"}이 있습니다. 만료 ${RENEW_WINDOW_DAYS}일 전부터 다시 가입할 수 있습니다.`);
        }
        amount = Number(plan.price) || DEFAULT_PLANS.yearly.price;
        orderName = plan.label || DEFAULT_PLANS.yearly.label;
        meta.planType = "yearly";
    } else if (purpose === "insurance_order") {
        if (!refId) throw new HttpsError("invalid-argument", "오더 정보(refId)가 없습니다.");
        const oSnap = await db().collection(ORDERS).doc(String(refId)).get();
        if (!oSnap.exists) throw new HttpsError("not-found", "오더를 찾을 수 없습니다.");
        const order = oSnap.data();
        const isAdmin = user && user.role === "admin";
        const mine = [order.matchedProUid, order.createdBy].filter(Boolean).some((v) => v === uid || v === authUid);
        // 9/14 형 확정: 보험 없으면 수락 자체가 안 된다 → 아직 배정 전인 오더는 어느 홈프로든 "수락 전 건당 선결제" 가능(결제한 홈프로만 수락할 수 있다)
        const unassigned = !order.matchedProUid;
        if (!mine && !unassigned && !isAdmin) throw new HttpsError("permission-denied", "이 오더를 수행하는 홈프로 본인만 결제할 수 있습니다.");
        if (order.insurance && order.insurance.applied === true) {
            const by = order.insurance.prepaidBy || order.insurance.byUid || null;
            if (!by || by === uid || by === authUid) throw new HttpsError("failed-precondition", "이미 보험이 적용된 오더입니다.");
            throw new HttpsError("failed-precondition", "다른 홈프로가 이미 이 오더의 보험을 결제했습니다.");
        }
        if (["completed", "canceled", "cancelled"].includes(order.orderStatus)) throw new HttpsError("failed-precondition", "끝났거나 취소된 오더에는 보험을 적용할 수 없습니다.");
        const cur = await findActiveGeneralPolicy(uid);
        if (cur) throw new HttpsError("failed-precondition", `이미 ${cur.type === "yearly" ? "1년 단체보험" : "월 구독형 보험"}에 가입되어 있어 추가 결제 없이 적용됩니다.`);
        const plan = settings.plans.perOrder;
        if (plan.active === false) throw new HttpsError("failed-precondition", "건당 단기보험은 지금 가입할 수 없습니다.");
        const base = orderBaseAmount(order);
        if (base <= 0) throw new HttpsError("failed-precondition", "금액 미확정 — 시공·단가 금액이 정해진 뒤에 보험료를 계산할 수 있습니다.");
        // 카테고리 → 위험도 그룹(g1~g4) → 그룹 요율 × 기준 금액, 최소 minPrice (대표 9/12)
        const prem = perOrderPremium(base, settings, order.categoryId);
        amount = prem.amount;
        orderName = `${plan.label || DEFAULT_PLANS.perOrder.label} (${order.title ? String(order.title).slice(0, 30) : String(refId)})`;
        ref = String(refId);
        meta.orderId = String(refId);
        meta.planType = "perOrder";
        meta.group = prem.group;
        meta.rate = prem.rate;
        meta.base = prem.base;
        meta.categoryId = order.categoryId || null;
    } else if (purpose === "subscription") {
        const fee = await subscriptionPrice();
        orderName = "홈프로 월 구독";
        meta.planType = "subscription";
        // H-포인트 사용분 — 100P 단위, 잔액·구독료 이내. 전액이면 PG 없이 여기서 바로 처리한다
        let pointsUsed = Math.max(0, Math.floor(Number(pointsUsedRaw) || 0));
        pointsUsed = Math.floor(pointsUsed / 100) * 100;
        const balance = Number(user.referralPoints || 0);
        if (pointsUsed > balance) throw new HttpsError("failed-precondition", `H-포인트가 부족합니다. 보유 ${balance.toLocaleString()}P`);
        if (pointsUsed > fee) pointsUsed = fee;
        meta.fee = fee;
        meta.pointsUsed = pointsUsed;
        amount = fee - pointsUsed;
        if (amount === 0) {
            // 전액 H-포인트 — 결제 기록(payments, method points)만 남기고 구독 적용
            const tossOrderIdP = makeTossOrderId(purpose, ref);
            const payRef = db().collection(PAYMENTS).doc(tossOrderIdP);
            await payRef.set({
                purpose, uid, authUid, amount: 0, status: "done", method: "points", tossOrderId: tossOrderIdP, orderName,
                meta, approvedAt: tsNow(), createdAt: tsNow(), updatedAt: tsNow(),
            });
            const done = await postProcess(payRef, { purpose, uid, authUid, amount: 0, tossOrderId: tossOrderIdP, meta });
            return { pointsOnly: true, paymentId: tossOrderIdP, tossOrderId: tossOrderIdP, amount: 0, orderName, purpose, meta: done };
        }
        if (amount < 100) throw new HttpsError("failed-precondition", "카드 결제 금액은 100원 이상이어야 합니다. H-포인트 사용액을 100P 단위로 조정해 주세요.");
    }

    if (!(amount > 0)) throw new HttpsError("failed-precondition", "결제 금액이 올바르지 않습니다.");
    const tossOrderId = makeTossOrderId(purpose, ref);
    orderName = String(orderName).slice(0, 100);

    await db().collection(PAYMENTS).doc(tossOrderId).set({
        purpose,
        uid,
        authUid,
        amount,
        status: "ready",
        tossOrderId,
        orderName,
        method: "card",
        meta,
        createdAt: tsNow(),
        updatedAt: tsNow(),
    });

    return { paymentId: tossOrderId, tossOrderId, amount, orderName, purpose, meta };
});

// ─────────────────────────── ② 결제 승인 + 후처리 ───────────────────────────
/** purpose 별 후처리 — payments 문서(done)를 받아 policy/users/orders 를 쓰고 meta 패치를 돌려준다. 재실행 안전 */
async function postProcess(payRef, p) {
    const meta = { ...(p.meta || {}) };
    const uid = p.uid;
    const uSnap = await db().collection(USERS).doc(uid).get();
    const user = uSnap.exists ? uSnap.data() : {};
    const now = new Date();

    if (p.purpose === "insurance_yearly") {
        if (meta.policyId) return meta;
        // 남은 보험이 있으면 그 끝나는 날부터 이어 붙인다
        const cur = await findActiveGeneralPolicy(uid);
        const curEnd = cur && toDate(cur.endAt);
        const startAt = curEnd && curEnd > now ? curEnd : now;
        const endAt = addYears(startAt, 1);
        const pRef = db().collection(POLICIES).doc();
        await pRef.set(basePolicy({ uid, user, type: "yearly", price: p.amount, startAt, endAt, paymentId: p.tossOrderId }));
        meta.policyId = pRef.id;
        await payRef.set({ meta, updatedAt: tsNow() }, { merge: true });
        await refreshUserInsurance(uid);
        return meta;
    }

    if (p.purpose === "insurance_order") {
        const orderId = meta.orderId;
        if (!orderId) throw new HttpsError("internal", "결제 기록에 오더 정보가 없습니다.");
        let policyId = meta.policyId;
        if (!policyId) {
            const pRef = db().collection(POLICIES).doc();
            // 건당 보험은 그 오더의 체크인~체크아웃이 보장 기간 — endAt 은 체크아웃 때 오더 흐름이 채운다
            await pRef.set(basePolicy({ uid, user, type: "perOrder", price: p.amount, startAt: now, endAt: null, paymentId: p.tossOrderId, orderId }));
            policyId = pRef.id;
            meta.policyId = policyId;
            await payRef.set({ meta, updatedAt: tsNow() }, { merge: true });
        }
        // 결제한 홈프로를 기록 — 배정 전 선결제면 그 홈프로만 수락할 수 있다(OrderService.acceptOrder 가 확인)
        await db().collection(ORDERS).doc(orderId).set({
            insurance: { applied: true, type: "perOrder", policyId, paymentId: p.tossOrderId, appliedAt: tsNow(), prepaidBy: uid, byUid: uid },
            updatedAt: tsNow(),
        }, { merge: true });
        return meta;
    }

    if (p.purpose === "subscription") {
        if (meta.applied) return meta;
        // H-포인트 사용분 차감 + 원장 (승인 뒤에 차감해야 결제 실패 때 포인트가 안 빠진다)
        const pointsUsed = Number(meta.pointsUsed || 0);
        if (pointsUsed > 0 && !meta.pointsDeducted) {
            const uRef = db().collection(USERS).doc(uid);
            await db().runTransaction(async (tx) => {
                const snap = await tx.get(uRef);
                const bal = Number((snap.data() || {}).referralPoints || 0);
                const take = Math.min(bal, pointsUsed);
                tx.set(uRef, { referralPoints: bal - take, updatedAt: tsNow() }, { merge: true });
                tx.set(db().collection("homepro_cash").doc(), {
                    uid, type: "spend", amount: -take, reason: "월 구독료 (H-포인트)", category: "subscription",
                    relatedDocId: p.tossOrderId, createdAt: tsNow(),
                });
            });
            meta.pointsDeducted = true;
        }
        const curEnd = toDate(user.subscription && user.subscription.endAt);
        const startAt = curEnd && curEnd > now ? curEnd : now;
        const endAt = addMonths(startAt, 1);
        await db().collection(USERS).doc(uid).set({
            accessTier: "tier1",
            subscription: { status: "active", startAt: fromDate(startAt), endAt: fromDate(endAt), paymentId: p.tossOrderId, amount: p.amount, pointsUsed: Number(meta.pointsUsed || 0), updatedAt: tsNow() },
            updatedAt: tsNow(),
        }, { merge: true });
        meta.applied = true;
        meta.subscriptionEndAt = endAt.toISOString();
        await payRef.set({ meta, updatedAt: tsNow() }, { merge: true });
        return meta;
    }

    return meta;
}

/**
 * data: { paymentKey, orderId(= tossOrderId = payments 문서 ID), amount }
 * 돌려주는 값: { ok, already, status, amount, method, approvedAt, receiptUrl, purpose, meta, tossOrderId, paymentId }
 */
exports.tossConfirm = onCall({ region: REGION }, async (request) => {
    const { paymentKey, orderId: tossOrderId, amount } = request.data || {};
    if (!paymentKey || !tossOrderId || !amount) throw new HttpsError("invalid-argument", "결제 정보가 모자랍니다.");
    const caller = await resolveCaller(request);

    const ref = db().collection(PAYMENTS).doc(String(tossOrderId));
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "결제 준비 기록이 없습니다. 결제 화면에서 다시 시도해주세요.");
    const p = snap.data();
    if (p.uid !== caller.uid && p.authUid !== caller.authUid) throw new HttpsError("permission-denied", "본인 결제만 승인할 수 있습니다.");

    // 우리가 적어둔 금액과 다르면 여기서 끊는다
    if (Number(p.amount) !== Number(amount)) {
        console.error("[toss] 금액 불일치", tossOrderId, p.amount, amount);
        await ref.set({ status: "fail", failCode: "AMOUNT_MISMATCH", failMessage: "결제 금액이 맞지 않습니다.", updatedAt: tsNow() }, { merge: true });
        throw new HttpsError("failed-precondition", "결제 금액이 맞지 않습니다.");
    }

    const summary = (data, already, meta) => ({
        ok: true,
        already: !!already,
        status: "done",
        tossOrderId: String(tossOrderId),
        paymentId: String(tossOrderId),
        purpose: data.purpose,
        amount: Number(data.amount),
        method: data.tossMethod || null,
        approvedAt: data.approvedAt || null,
        receiptUrl: data.receiptUrl || null,
        meta: meta || data.meta || {},
    });

    // 이미 끝난 주문을 또 승인하지 않는다(새로고침). 후처리가 빠져 있으면 그것만 마저 한다.
    if (p.status === "done") {
        const meta = await postProcess(ref, p);
        return summary(p, true, meta);
    }

    let result;
    try {
        const r = await tossRequest("/v1/payments/confirm", { paymentKey, orderId: String(tossOrderId), amount: Number(amount) });
        result = r.json || {};
        if (!r.ok) {
            console.error("[toss] 승인 실패", r.status, result);
            await ref.set({ status: "fail", failCode: result.code || String(r.status), failMessage: result.message || "승인에 실패했습니다.", raw: result, updatedAt: tsNow() }, { merge: true });
            throw new HttpsError("aborted", result.message || "결제 승인에 실패했습니다.");
        }
    } catch (e) {
        if (e instanceof HttpsError) throw e;
        console.error("[toss] 승인 중 오류", e);
        throw new HttpsError("internal", "결제사와 연결하지 못했습니다.");
    }

    const done = {
        status: "done",
        paymentKey,
        tossMethod: result.method || null,           // 카드 · 간편결제 · 가상계좌 …
        approvedAt: result.approvedAt || null,
        receiptUrl: (result.receipt && result.receipt.url) || null,
        raw: result,
        updatedAt: tsNow(),
    };
    await ref.set(done, { merge: true });            // 돈이 빠진 사실을 먼저 남긴다

    let meta;
    try {
        meta = await postProcess(ref, { ...p, ...done });
    } catch (e) {
        // 승인은 됐는데 가입 처리가 실패 — 기록을 남기고 알린다. 다시 tossConfirm 을 부르면 후처리만 재시도된다.
        console.error("[toss] 후처리 실패", tossOrderId, e);
        await ref.set({ postProcessError: String(e && e.message || e), updatedAt: tsNow() }, { merge: true });
        throw new HttpsError("internal", "결제는 완료되었지만 가입 처리 중 문제가 생겼습니다. 잠시 후 다시 확인해 주세요.");
    }
    if (p.postProcessError) await ref.set({ postProcessError: admin.firestore.FieldValue.delete() }, { merge: true });
    return summary({ ...p, ...done }, false, meta);
});

/**
 * 앱 월 구독 — 빌링키 등록 + 첫 달 즉시 승인 (대표 지시 9/16: 구독은 단건이 아니라 자동결제).
 * 자동결제는 전액 카드만 받는다(형 확정 9/16). H-포인트 혼합은 기존 단건 경로(tossPrepare purpose=subscription)로 남는다.
 *
 * 이미 유효한 구독이 남아 있으면(단건으로 결제해 둔 달 포함) 지금은 청구하지 않고 카드만 붙여서
 * 만료일에 첫 자동결제가 되게 한다 — 낸 돈이 겹쳐 사라지지 않게. (resumed:true)
 */
async function issueSubscriptionBilling({ authKey, ck, uid, authUid, user }) {
    const sub = (user && user.subscription) || {};
    const now = new Date();
    const curEnd = toDate(sub.endAt);
    const stillValid = sub.status === "active" && curEnd && curEnd.getTime() > now.getTime();
    if (stillValid && sub.autoRenew === true) {
        throw new HttpsError("failed-precondition", "이미 자동결제로 구독 중입니다.");
    }

    const amount = await subscriptionPrice();
    const orderName = "홈프로 월 구독";
    const { billingKey, cardCompany, cardNumberMasked } = await issueBillingKey({ authKey, customerKey: ck });
    const billing = (nextAt) => ({
        billingKey, customerKey: ck, cardCompany, cardNumberMasked,
        nextChargeAt: fromDate(nextAt), failCount: 0, issuedAt: tsNow(),
    });

    // 남은 구독이 있으면 카드만 연결 — 청구는 만료일에
    if (stillValid) {
        await db().collection(USERS).doc(uid).set({
            accessTier: "tier1",
            subscription: {
                ...sub, autoRenew: true, autoRenewCanceledAt: null,
                billing: billing(curEnd), updatedAt: tsNow(),
            },
            updatedAt: tsNow(),
        }, { merge: true });
        return {
            ok: true, resumed: true, amount: 0,
            endAt: curEnd.toISOString(), nextChargeAt: curEnd.toISOString(),
            cardCompany, cardNumberMasked,
        };
    }

    // 첫 달 즉시 승인
    const tossOrderId = makeTossOrderId("subscription", uid.slice(0, 8));
    const payRef = db().collection(PAYMENTS).doc(tossOrderId);
    await payRef.set({
        purpose: "subscription", uid, authUid, amount, status: "ready",
        tossOrderId, orderName, method: "billing",
        meta: { policyId: null, orderId: null, planType: "subscription", pointsUsed: 0 },
        createdAt: tsNow(), updatedAt: tsNow(),
    });

    let r;
    try {
        r = await chargeBillingKey({ billingKey, customerKey: ck, amount, orderId: tossOrderId, orderName, customerName: userDisplayName(user) });
    } catch (e) {
        console.error("[toss] 구독 첫 달 승인 중 오류", e);
        await payRef.set({ status: "fail", failCode: "NETWORK", failMessage: e.message, updatedAt: tsNow() }, { merge: true });
        throw new HttpsError("internal", "결제사와 연결하지 못했습니다.");
    }
    const result = r.json || {};
    if (!r.ok) {
        console.error("[toss] 구독 첫 달 승인 실패", r.status, result);
        await payRef.set({ status: "fail", failCode: result.code || String(r.status), failMessage: result.message || "승인에 실패했습니다.", raw: result, updatedAt: tsNow() }, { merge: true });
        throw new HttpsError("aborted", result.message || "첫 달 결제 승인에 실패했습니다. 카드를 다시 등록해 주세요.");
    }
    await payRef.set({
        status: "done",
        paymentKey: result.paymentKey || null,
        tossMethod: result.method || null,
        approvedAt: result.approvedAt || null,
        receiptUrl: (result.receipt && result.receipt.url) || null,
        raw: result, updatedAt: tsNow(),
    }, { merge: true });

    const endAt = addMonths(now, 1);
    await db().collection(USERS).doc(uid).set({
        accessTier: "tier1",
        subscription: {
            status: "active", autoRenew: true, autoRenewCanceledAt: null,
            startAt: fromDate(now), endAt: fromDate(endAt),
            paymentId: tossOrderId, amount, pointsUsed: 0,
            billing: billing(endAt), updatedAt: tsNow(),
        },
        updatedAt: tsNow(),
    }, { merge: true });

    return {
        ok: true, resumed: false, paymentId: tossOrderId, amount,
        endAt: endAt.toISOString(), nextChargeAt: endAt.toISOString(),
        cardCompany, cardNumberMasked,
    };
}

// ─────────────────────────── ③ 빌링키 발급 + 첫 달 승인 ───────────────────────────
/**
 * data: { authKey, customerKey }  — requestBillingAuth successUrl 이 받은 값 그대로.
 * customerKey 는 앞단이 uid 기반으로 만든다(예 hp_<uid>). 서버에서 uid 와 맞는지 검사한다.
 * 돌려주는 값: { ok, policyId, paymentId, amount, endAt, nextChargeAt, cardCompany, cardNumberMasked, resumed }
 *  · 유효한 월 구독형이 있고 자동결제도 켜져 있으면 거절.
 *  · 자동결제만 해지된(autoRenew:false) 월 구독형이 아직 유효하면 → 카드만 다시 붙이고 다음 결제일을 endAt 으로(지금 청구 안 함, resumed:true).
 */
exports.tossBillingIssue = onCall({ region: REGION }, async (request) => {
    const { authKey, customerKey, purpose } = request.data || {};
    if (!authKey || !customerKey) throw new HttpsError("invalid-argument", "카드 등록 정보(authKey/customerKey)가 없습니다.");
    const { uid, authUid, user } = await resolveCaller(request);
    const ck = String(customerKey);
    if (!(ck.includes(uid) || ck.includes(authUid))) throw new HttpsError("permission-denied", "customerKey 가 로그인한 회원과 맞지 않습니다.");

    // 앱 월 구독 — purpose 를 안 주면 예전처럼 월 구독형 보험으로 본다(기존 호출 호환)
    if (String(purpose || "") === "subscription") {
        return await issueSubscriptionBilling({ authKey, ck, uid, authUid, user });
    }

    const settings = await loadInsuranceSettings();
    const plan = settings.plans.monthly;
    if (plan.active === false) throw new HttpsError("failed-precondition", "월 구독형 보험은 지금 가입할 수 없습니다.");
    const amount = Number(plan.price) || DEFAULT_PLANS.monthly.price;
    const orderName = plan.label || DEFAULT_PLANS.monthly.label;

    const cur = await findActiveGeneralPolicy(uid);
    if (cur && cur.type === "monthly" && cur.autoRenew !== false) throw new HttpsError("failed-precondition", "이미 월 구독형 보험에 가입되어 있습니다.");
    if (cur && cur.type === "yearly" && toDate(cur.endAt) && toDate(cur.endAt).getTime() - Date.now() > RENEW_WINDOW_DAYS * 86400000) {
        throw new HttpsError("failed-precondition", `이미 유효한 1년 단체보험이 있습니다. 만료 ${RENEW_WINDOW_DAYS}일 전부터 월 구독형으로 바꿀 수 있습니다.`);
    }

    // 빌링키 발급
    const { billingKey, cardCompany, cardNumberMasked } = await issueBillingKey({ authKey, customerKey: ck });

    // 해지만 해둔 월 구독형이 아직 유효하면 — 카드만 다시 붙이고, 다음 결제는 지금 endAt 에 한다(지금은 청구 없음)
    if (cur && cur.type === "monthly" && cur.autoRenew === false) {
        const nextChargeAt = toDate(cur.endAt) || addMonths(new Date(), 1);
        await db().collection(POLICIES).doc(cur.id).update({
            autoRenew: true,
            autoRenewCanceledAt: null,
            billing: { billingKey, customerKey: ck, cardCompany, cardNumberMasked, nextChargeAt: fromDate(nextChargeAt), failCount: 0, issuedAt: tsNow() },
            updatedAt: tsNow(),
        });
        await refreshUserInsurance(uid);
        return { ok: true, resumed: true, policyId: cur.id, paymentId: cur.paymentId || null, amount: 0, endAt: toDate(cur.endAt) ? toDate(cur.endAt).toISOString() : null, nextChargeAt: nextChargeAt.toISOString(), cardCompany, cardNumberMasked };
    }

    // 첫 달 즉시 승인
    const tossOrderId = makeTossOrderId("insurance_monthly", uid.slice(0, 8));
    const payRef = db().collection(PAYMENTS).doc(tossOrderId);
    await payRef.set({
        purpose: "insurance_monthly",
        uid,
        authUid,
        amount,
        status: "ready",
        tossOrderId,
        orderName,
        method: "billing",
        meta: { policyId: null, orderId: null, planType: "monthly" },
        createdAt: tsNow(),
        updatedAt: tsNow(),
    });

    let r;
    try {
        r = await chargeBillingKey({ billingKey, customerKey: ck, amount, orderId: tossOrderId, orderName, customerName: userDisplayName(user) });
    } catch (e) {
        console.error("[toss] 첫 달 승인 중 오류", e);
        await payRef.set({ status: "fail", failCode: "NETWORK", failMessage: e.message, updatedAt: tsNow() }, { merge: true });
        throw new HttpsError("internal", "결제사와 연결하지 못했습니다.");
    }
    const result = r.json || {};
    if (!r.ok) {
        console.error("[toss] 첫 달 승인 실패", r.status, result);
        await payRef.set({ status: "fail", failCode: result.code || String(r.status), failMessage: result.message || "승인에 실패했습니다.", raw: result, updatedAt: tsNow() }, { merge: true });
        throw new HttpsError("aborted", result.message || "첫 달 결제 승인에 실패했습니다. 카드를 다시 등록해 주세요.");
    }

    await payRef.set({
        status: "done",
        paymentKey: result.paymentKey || null,
        tossMethod: result.method || null,
        approvedAt: result.approvedAt || null,
        receiptUrl: (result.receipt && result.receipt.url) || null,
        raw: result,
        updatedAt: tsNow(),
    }, { merge: true });

    // 남은 1년 보험이 있으면 그 끝나는 날부터 이어 붙인다
    const now = new Date();
    const curEnd = cur && toDate(cur.endAt);
    const startAt = curEnd && curEnd > now ? curEnd : now;
    const endAt = addMonths(startAt, 1);
    const pRef = db().collection(POLICIES).doc();
    await pRef.set(basePolicy({
        uid, user, type: "monthly", price: amount, startAt, endAt, paymentId: tossOrderId,
        billing: { billingKey, customerKey: ck, cardCompany, cardNumberMasked, nextChargeAt: fromDate(endAt), failCount: 0, issuedAt: tsNow() },
    }));
    await payRef.set({ meta: { policyId: pRef.id, orderId: null, planType: "monthly" }, updatedAt: tsNow() }, { merge: true });
    await refreshUserInsurance(uid);

    return { ok: true, resumed: false, policyId: pRef.id, paymentId: tossOrderId, amount, endAt: endAt.toISOString(), nextChargeAt: endAt.toISOString(), cardCompany, cardNumberMasked };
});

// ─────────────────────────── ④ 자동결제 해지 ───────────────────────────
/**
 * data: { policyId }
 * 돌려주는 값: { ok, policyId, endAt }  — status 는 endAt 까지 active 그대로, autoRenew:false, billing.nextChargeAt:null
 */
exports.tossBillingCancel = onCall({ region: REGION }, async (request) => {
    const { policyId, target } = request.data || {};
    const { uid, user } = await resolveCaller(request);

    // 앱 월 구독 해지 — 만료일까지는 0차수 그대로 두고 자동 연장만 끊는다
    if (String(target || "") === "subscription") {
        const sub = (user && user.subscription) || {};
        const endAtIso = toDate(sub.endAt) ? toDate(sub.endAt).toISOString() : null;
        if (sub.status !== "active") throw new HttpsError("failed-precondition", "진행 중인 구독이 없습니다.");
        if (sub.autoRenew !== true) return { ok: true, already: true, target: "subscription", endAt: endAtIso };
        await db().collection(USERS).doc(uid).set({
            subscription: {
                ...sub, autoRenew: false, autoRenewCanceledAt: tsNow(),
                billing: { ...(sub.billing || {}), nextChargeAt: null },
                updatedAt: tsNow(),
            },
            updatedAt: tsNow(),
        }, { merge: true });
        return { ok: true, already: false, target: "subscription", endAt: endAtIso };
    }

    if (!policyId) throw new HttpsError("invalid-argument", "보험 정보(policyId)가 없습니다.");

    const ref = db().collection(POLICIES).doc(String(policyId));
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "보험 가입 기록을 찾을 수 없습니다.");
    const policy = snap.data();
    if (policy.uid !== uid && !(user && user.role === "admin")) throw new HttpsError("permission-denied", "본인 보험만 해지할 수 있습니다.");
    if (policy.type !== "monthly") throw new HttpsError("failed-precondition", "월 구독형 보험만 자동결제 해지 대상입니다.");
    if (policy.status !== "active") throw new HttpsError("failed-precondition", "유효한 보험이 아닙니다.");
    const endAtIso = toDate(policy.endAt) ? toDate(policy.endAt).toISOString() : null;
    if (policy.autoRenew === false) return { ok: true, already: true, policyId: snap.id, endAt: endAtIso };

    const patch = { autoRenew: false, autoRenewCanceledAt: tsNow(), updatedAt: tsNow() };
    if (policy.billing && typeof policy.billing === "object") patch["billing.nextChargeAt"] = null;
    await ref.update(patch);
    await refreshUserInsurance(uid);
    return { ok: true, already: false, policyId: snap.id, endAt: endAtIso };
});
