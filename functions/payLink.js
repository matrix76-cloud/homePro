/**
 * 결제 링크(/pg/:id) 카드 결제 — 토스페이먼츠 결제창 (형 지시 2026-10-14, PG 심사에서 결제창이 열려야 해서)
 *
 * 결제 링크는 로그인 없이 여는 화면이라 tossPrepare/tossConfirm(로그인 필수)을 쓰지 못한다. 그래서 따로 둔다.
 *  ① payLinkPrepare({ requestId })
 *       pg_payment_requests/{requestId} 의 금액으로 payments/{tossOrderId} 를 ready 로 적는다(앞단 금액은 믿지 않는다).
 *  ② payLinkConfirm({ paymentKey, orderId, amount })
 *       적어둔 금액과 대조 → 토스 승인 → payments done → 결제 요청을 paid(settleStatus pending)로 바꾸고 사업자에게 알린다.
 *
 * 키: 결제위젯이 아니라 결제창(payment().requestPayment)으로 열기 때문에 'API 개별 연동 키' 쌍을 쓴다
 *     — 앞단 REACT_APP_TOSS_BILLING_CLIENT_KEY(test_ck_…) ↔ 서버 TOSS_BILLING_SECRET_KEY(test_sk_…). 구독 자동결제와 같은 쌍.
 * 분배(홈프로 정산계좌 → 사업자)는 여기서 하지 않는다. 요청 문서의 distribution 이 pending 으로 남는다.
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { REGION, PAYMENTS, db, tsNow, billingSecretKey } = require("./insurance");

const PG_COL = "pg_payment_requests";
const TOSS_API = "https://api.tosspayments.com";
const PAYABLE = ["link_issued", "paying"];
/* 결제 한 건 최대 금액 — PG 심사 요청 (2026-10-15). 화면 쪽 PgPaymentService.PG_MAX_AMOUNT 와 같은 값 */
const MAX_AMOUNT = 3000000;

async function tossConfirmRequest(body) {
    const res = await fetch(`${TOSS_API}/v1/payments/confirm`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${Buffer.from(`${billingSecretKey()}:`).toString("base64")}`,
            "Content-Type": "application/json",
            "Idempotency-Key": String(body.orderId),
        },
        body: JSON.stringify(body),
    });
    let json = null;
    try { json = await res.json(); } catch (_) { json = null; }
    return { ok: res.ok, status: res.status, json: json || {} };
}

const makeOrderId = (requestId) =>
    `hp_link_${String(requestId).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 28)}_${Date.now().toString(36)}`.slice(0, 64);

exports.payLinkPrepare = onCall({ region: REGION }, async (request) => {
    const requestId = String((request.data || {}).requestId || "");
    if (!requestId) throw new HttpsError("invalid-argument", "결제 요청 번호가 없습니다.");
    const snap = await db().collection(PG_COL).doc(requestId).get();
    if (!snap.exists) throw new HttpsError("not-found", "결제 요청을 찾을 수 없습니다.");
    const r = snap.data();
    if (r.status === "paid") throw new HttpsError("failed-precondition", "이미 결제가 끝난 요청입니다.");
    if (!PAYABLE.includes(r.status)) throw new HttpsError("failed-precondition", "지금은 결제할 수 없는 요청입니다.");
    const amount = Number(r.amount) || 0;
    if (!(amount > 0)) throw new HttpsError("failed-precondition", "결제 금액이 올바르지 않습니다.");
    if (amount > MAX_AMOUNT) throw new HttpsError("invalid-argument", "결제 금액은 최대 3,000,000원까지 가능합니다.");

    const tossOrderId = makeOrderId(requestId);
    const orderName = String(r.memo || r.orderTitle || "홈프로 시공대금").slice(0, 100);
    await db().collection(PAYMENTS).doc(tossOrderId).set({
        purpose: "paylink",
        requestId,
        // uid 는 '낸 사람' 기준(결제 내역 화면이 uid 로 읽는다). 링크는 로그인 없이 결제하므로 요청에 적힌 payerUid 가 있을 때만.
        uid: r.payerUid || null,
        sellerUid: r.uid || null,
        orderId: r.orderId || null,
        amount,
        status: "ready",
        tossOrderId,
        orderName,
        method: "card",
        createdAt: tsNow(),
        updatedAt: tsNow(),
    });
    return { tossOrderId, amount, orderName, customerName: r.customerName || "" };
});

exports.payLinkConfirm = onCall({ region: REGION }, async (request) => {
    const { paymentKey, orderId: tossOrderId, amount } = request.data || {};
    if (!paymentKey || !tossOrderId || !amount) throw new HttpsError("invalid-argument", "결제 정보가 모자랍니다.");
    const ref = db().collection(PAYMENTS).doc(String(tossOrderId));
    const snap = await ref.get();
    if (!snap.exists || snap.data().purpose !== "paylink") throw new HttpsError("not-found", "결제 준비 기록이 없습니다. 결제 화면에서 다시 시도해 주세요.");
    const p = snap.data();
    if (Number(p.amount) !== Number(amount)) {
        console.error("[paylink] 금액 불일치", tossOrderId, p.amount, amount);
        await ref.set({ status: "fail", failCode: "AMOUNT_MISMATCH", failMessage: "결제 금액이 맞지 않습니다.", updatedAt: tsNow() }, { merge: true });
        throw new HttpsError("failed-precondition", "결제 금액이 맞지 않습니다.");
    }
    const reqRef = db().collection(PG_COL).doc(String(p.requestId));

    /** 결제 요청을 paid 로 — 이미 paid 면 건드리지 않는다(새로고침으로 두 번 불려도 같은 결과) */
    const markPaid = async (pay) => {
        const rs = await reqRef.get();
        if (!rs.exists) return;
        const r = rs.data();
        if (r.status === "paid") return;
        await reqRef.set({
            status: "paid",
            settleStatus: "pending",
            paidAt: tsNow(),
            paymentId: String(tossOrderId),
            payMethod: pay.tossMethod || null,
            receiptUrl: pay.receiptUrl || null,
            updatedAt: tsNow(),
        }, { merge: true });
        if (r.uid) {
            await db().collection("notifications").add({
                targetUids: [r.uid],
                title: "시공대금 결제 완료",
                body: `${r.customerName || "고객"}님이 ${Number(p.amount).toLocaleString()}원을 결제했습니다.`,
                type: "paylink_paid",
                data: { orderId: r.orderId || null, requestId: String(p.requestId) },
                read: false, sent: false,
                createdAt: tsNow(),
            }).catch(() => {});
        }
    };

    const summary = (d, already) => ({
        ok: true, already: !!already, status: "done", tossOrderId: String(tossOrderId), amount: Number(d.amount),
        method: d.tossMethod || null, approvedAt: d.approvedAt || null, receiptUrl: d.receiptUrl || null,
    });

    if (p.status === "done") { await markPaid(p); return summary(p, true); }

    let result;
    try {
        const r = await tossConfirmRequest({ paymentKey, orderId: String(tossOrderId), amount: Number(amount) });
        result = r.json;
        if (!r.ok) {
            console.error("[paylink] 승인 실패", r.status, result);
            await ref.set({ status: "fail", failCode: result.code || String(r.status), failMessage: result.message || "승인에 실패했습니다.", raw: result, updatedAt: tsNow() }, { merge: true });
            throw new HttpsError("aborted", result.message || "결제 승인에 실패했습니다.");
        }
    } catch (e) {
        if (e instanceof HttpsError) throw e;
        console.error("[paylink] 승인 중 오류", e);
        throw new HttpsError("internal", "결제사와 연결하지 못했습니다.");
    }

    const done = {
        status: "done",
        paymentKey,
        tossMethod: result.method || null,
        approvedAt: result.approvedAt || null,
        receiptUrl: (result.receipt && result.receipt.url) || null,
        raw: result,
        updatedAt: tsNow(),
    };
    await ref.set(done, { merge: true });   // 돈이 빠진 사실을 먼저 남긴다
    await markPaid(done);
    return summary({ ...p, ...done }, false);
});
