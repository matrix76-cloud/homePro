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
 *     ★2026-11-25 실계약에서 자동결제가 별도 상점(MID)으로 나와 자리를 나눴다 — 결제 링크는
 *       앞단 REACT_APP_TOSS_LINK_CLIENT_KEY ↔ 서버 TOSS_LINK_SECRET_KEY (일반결제 상점의 API 개별 연동 키).
 *       두 값을 비워두면 예전처럼 자동결제 키 쌍을 같이 쓴다(insurance.js linkSecretKey).
 * 분배(홈프로 정산계좌 → 사업자)는 여기서 하지 않는다. 요청 문서의 distribution 이 pending 으로 남는다.
 *
 * ★오더 소개수수료 카드 결제 (대표 리뷰 2026-11-27 '소개수수료 수령 수단')
 *   요청 문서에 referralOrder:true · orderId 가 있으면 수락자가 접수자에게 주는 소개수수료다(앞단 PgPaymentService.createReferralPayRequest).
 *   결제가 승인되면 homepro_orders/{orderId}.referralPay 를 { status:"confirmed", method:"pg" } 로 바꾼다 — 접수자가 [입금 확인]을 누르지 않는다.
 *   접수자에게는 결제수수료 3.5%(VAT 포함)를 뺀 정산 금액을, 수락자에게는 결제 확인을 알린다. 정산(플랫폼 → 접수자 계좌)은 여기서 하지 않는다.
 *   (오더 시공대금 결제 링크는 같은 날 화면에서 걷어냈다. 사업자도구에서 만든 결제 요청은 예전 그대로 돈다.)
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { REGION, PAYMENTS, db, tsNow, linkSecretKey } = require("./insurance");

const PG_COL = "pg_payment_requests";
const TOSS_API = "https://api.tosspayments.com";
const PAYABLE = ["link_issued", "paying"];
/* 결제 한 건 최대 금액 — PG 심사 요청 (2026-10-15). 화면 쪽 PgPaymentService.PG_MAX_AMOUNT 와 같은 값 */
const MAX_AMOUNT = 3000000;
const ORDERS = "homepro_orders";
/* 소개수수료 카드 결제의 결제수수료율(%) · VAT 포함 — 화면 쪽 config/referralReceive.js REFERRAL_PG_FEE_RATE 와 같은 값 */
const REFERRAL_FEE_RATE = 3.5;
const won = (n) => Number(n || 0).toLocaleString("ko-KR");

/**
 * 소개수수료 카드 결제가 승인된 뒤 — 오더의 소개수수료를 입금 확인 완료로 바꾸고 양쪽에 알린다.
 * 오더가 이미 confirmed 면 아무것도 하지 않는다(새로고침 · 재시도로 두 번 불려도 알림이 한 번만 나간다).
 */
async function settleReferralOrder(r, requestId, amount) {
    const oRef = db().collection(ORDERS).doc(String(r.orderId));
    const os = await oRef.get();
    if (!os.exists) { console.error("[paylink] 소개수수료 결제 — 오더 없음", r.orderId, requestId); return; }
    const o = os.data();
    if (o.referralPay && o.referralPay.status === "confirmed") return;
    const rate = Number(r.feeRate) > 0 ? Number(r.feeRate) : REFERRAL_FEE_RATE;
    const feeAmount = Math.round(Number(amount) * rate / 100);
    const settleAmount = Number(amount) - feeAmount;
    // update 로 referralPay 를 통째로 바꾼다(merge 로 쓰면 계좌이체 때의 옛 값이 섞인다)
    await oRef.update({
        referralPay: {
            status: "confirmed", amount: Number(amount), method: "pg", requestId: String(requestId),
            feeRate: rate, feeAmount, settleAmount,
            paidBy: r.payerUid || o.matchedProUid || null,
            paidAt: tsNow(), confirmedAt: tsNow(),
        },
        updatedAt: tsNow(),
    });
    const title = o.title || r.orderTitle || "";
    await oRef.collection("logs").add({
        type: "status",
        message: `소개수수료 ${won(amount)}원 카드 결제 완료 · 입금 확인 완료`,
        byUid: r.payerUid || "", byName: r.customerName || "", byRole: "홈프로",
        createdAt: tsNow(),
    }).catch(() => {});
    const note = (targetUid, ttl, body, type) => (targetUid
        ? db().collection("notifications").add({
            targetUids: [targetUid], title: ttl, body, type,
            data: { orderId: String(r.orderId), requestId: String(requestId) },
            read: false, sent: false, createdAt: tsNow(),
        }).catch(() => {})
        : Promise.resolve());
    await note(o.createdBy || r.uid, "소개수수료 결제 완료",
        `${r.customerName || "홈프로"}님이 소개수수료 ${won(amount)}원을 카드로 결제했습니다. 결제수수료 ${rate}%를 뺀 ${won(settleAmount)}원이 정산계좌로 입금됩니다.${title ? ` (${title})` : ""}`,
        "referral_confirmed"); // 알림 종류는 있는 이름을 쓴다 — index.js 의 오더 알림 분류(끄기 설정)에 들어 있다
    await note(r.payerUid || o.matchedProUid, "소개수수료 결제 확인",
        `소개수수료 ${won(amount)}원 결제가 확인되었습니다.${title ? ` (${title})` : ""}`,
        "referral_confirmed");
}

async function tossConfirmRequest(body) {
    const res = await fetch(`${TOSS_API}/v1/payments/confirm`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${Buffer.from(`${linkSecretKey()}:`).toString("base64")}`,
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

    const isReferralOrder = r.referralOrder === true && !!r.orderId;
    // 소개수수료 결제 — 그 사이 계좌이체로 입금 확인이 끝났거나 오더가 취소됐으면 결제창을 열지 않는다(이중 지급 방지)
    if (isReferralOrder) {
        const os = await db().collection(ORDERS).doc(String(r.orderId)).get();
        if (!os.exists) throw new HttpsError("not-found", "오더를 찾을 수 없습니다.");
        const o = os.data();
        if (o.orderStatus === "취소" || o.orderStatus === "거부") throw new HttpsError("failed-precondition", "취소된 오더입니다.");
        // 배정이 바뀌었으면(대기 전환 뒤 다른 홈프로가 수락) 예전 홈프로가 만든 결제 요청으로는 내지 못한다
        if (r.payerUid && o.matchedProUid !== r.payerUid) throw new HttpsError("failed-precondition", "배정이 바뀐 오더입니다. 오더 화면에서 다시 확인해 주세요.");
        if (o.referralPay && o.referralPay.status === "confirmed") throw new HttpsError("failed-precondition", "이미 입금 확인이 끝난 소개수수료입니다.");
        if (o.referralPay && o.referralPay.status === "sent") throw new HttpsError("failed-precondition", "이미 계좌로 입금 완료 표시한 소개수수료입니다.");
    }

    const tossOrderId = makeOrderId(requestId);
    const orderName = String(r.memo || r.orderTitle || (isReferralOrder ? "홈프로 소개수수료" : "홈프로 결제")).slice(0, 100);
    await db().collection(PAYMENTS).doc(tossOrderId).set({
        purpose: "paylink",
        requestId,
        // uid 는 '낸 사람' 기준(결제 내역 화면이 uid 로 읽는다). 링크는 로그인 없이 결제하므로 요청에 적힌 payerUid 가 있을 때만.
        uid: r.payerUid || null,
        sellerUid: r.uid || null,
        orderId: r.orderId || null,
        // 무슨 결제인지 — 결제 내역 · 관리자 화면이 '소개수수료'와 그 밖의 결제 링크를 가를 수 있게
        kind: r.kind || null,
        referralOrder: isReferralOrder,
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
        const first = r.status !== "paid";
        if (first) {
            await reqRef.set({
                status: "paid",
                settleStatus: "pending",
                paidAt: tsNow(),
                paymentId: String(tossOrderId),
                payMethod: pay.tossMethod || null,
                receiptUrl: pay.receiptUrl || null,
                updatedAt: tsNow(),
            }, { merge: true });
        }
        // 오더 소개수수료 결제 — 오더의 소개수수료를 입금 확인 완료로. 요청이 이미 paid 여도 오더가 아직이면 다시 맞춘다
        // (요청만 paid 로 바뀌고 오더 반영 전에 끊긴 경우를 다음 호출이 메운다. 알림은 오더를 실제로 바꿀 때만 나간다)
        if (r.referralOrder === true && r.orderId) {
            try { await settleReferralOrder(r, p.requestId, p.amount); }
            catch (e) { console.error("[paylink] 소개수수료 오더 반영 실패", r.orderId, p.requestId, e); }
            return;
        }
        if (first && r.uid) {
            await db().collection("notifications").add({
                targetUids: [r.uid],
                title: "결제 완료",
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
