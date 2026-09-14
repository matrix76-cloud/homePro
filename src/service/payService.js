/**
 * 결제 서비스 — 토스페이먼츠 (보험 결제 · 에이전트 B 소유)
 *
 * 흐름 (일반결제: yearly · perOrder)
 *   ① preparePayment({ purpose, refId })  : 서버(tossPrepare)가 금액을 계산해 payments/{tossOrderId} 를 ready 로 적는다
 *                                            (앞단 금액은 믿지 않는다) → { tossOrderId, amount, orderName }
 *   ② initTossWidgets → requestTossPayment : 토스 결제창 → 끝나면 /pay/success 로 돌아온다
 *   ③ confirmPayment                       : 서버(tossConfirm)가 승인(이때 돈이 빠진다) → payments done → purpose 별 후처리는 서버가 한다
 *
 * 흐름 (자동결제: monthly)
 *   ① requestBillingAuth({ customerKey })  : 토스 카드 등록창 → /pay/billing-success 로 authKey·customerKey 가 돌아온다
 *   ② issueBilling({ authKey, customerKey }): 서버(tossBillingIssue)가 빌링키 발급 + 첫 달 즉시 승인 + policy 생성
 *   해지: cancelBilling({ policyId })      : 서버(tossBillingCancel) — 다음 결제일까지 유지하고 자동 연장만 끊는다
 *
 * Cloud Functions 는 asia-northeast3 (functions 리전과 반드시 같아야 한다 — AuthService 와 같은 방식)
 */
import { getFunctions, httpsCallable } from "firebase/functions";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { firebaseApp, FUNCTIONS_REGION } from "../api/config";
import {
  TOSS_CLIENT_KEY, TOSS_SUCCESS_PATH, TOSS_FAIL_PATH, TOSS_BILLING_SUCCESS_PATH,
  PAY_SESSION_KEY, makeCustomerKey,
} from "../utility/tossConfig";

const call = (name) => httpsCallable(getFunctions(firebaseApp, FUNCTIONS_REGION), name);

/** onCall 오류를 사람이 읽을 문장으로 (functions/https 의 message 가 이미 한글이면 그대로) */
const humanError = (e, fallback) => {
  const msg = e?.message || "";
  if (!msg || /^internal$/i.test(msg) || /INTERNAL/.test(msg)) return new Error(fallback);
  return new Error(msg.replace(/^FirebaseError:\s*/, ""));
};

/* ───────────── 세션 (결제 직전 기록 → 성공/실패 화면에서 되돌아갈 곳) ───────────── */

export function savePaySession({ purpose, refId, tossOrderId }) {
  try { sessionStorage.setItem(PAY_SESSION_KEY, JSON.stringify({ purpose, refId: refId || null, tossOrderId: tossOrderId || null })); } catch (_) { /* 무시 */ }
}
export function readPaySession() {
  try { const raw = sessionStorage.getItem(PAY_SESSION_KEY); return raw ? JSON.parse(raw) : null; } catch (_) { return null; }
}
export function clearPaySession() {
  try { sessionStorage.removeItem(PAY_SESSION_KEY); } catch (_) { /* 무시 */ }
}

/* ───────────── 일반결제 (결제위젯) ───────────── */

/**
 * ① 서버에 결제 준비. purpose: insurance_yearly | insurance_order | subscription (insurance_monthly 는 서버가 거절 — 빌링 흐름)
 *    refId: perOrder 는 오더 id, 그 외는 null(서버가 uid 로 잡는다)
 * 서버 반환(확정): { paymentId, tossOrderId, amount, orderName, purpose, meta }
 *  · 유효한 월·1년 가입자가 건당 결제를 부르면 서버가 한국어 메시지로 거절한다 → 화면은 e.message 를 그대로 보여 준다.
 */
export async function preparePayment({ purpose, refId = null, pointsUsed = 0 }) {
  if (!purpose) throw new Error("결제 목적이 없습니다.");
  if (purpose === "insurance_monthly") throw new Error("월 구독형은 카드 등록으로 가입합니다.");
  try {
    const res = await call("tossPrepare")({ purpose, refId: refId || null, pointsUsed: Number(pointsUsed) || 0 });
    const data = res?.data || {};
    if (data.pointsOnly) return { ...data, amount: 0, pointsOnly: true };
    if (!data.tossOrderId || !(Number(data.amount) > 0)) throw new Error("결제 정보를 준비하지 못했습니다.");
    return { ...data, amount: Number(data.amount), orderName: data.orderName || "" };
  } catch (e) {
    throw humanError(e, "결제 준비에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

/**
 * 토스 결제위젯 준비. 결제수단·약관을 주어진 selector 에 그린다.
 * customerKey 는 로그인 uid 를 makeCustomerKey 로 다듬은 값.
 */
export async function initTossWidgets({ amount, customerKey, methodSelector = "#toss-methods", agreementSelector = "#toss-agreement" }) {
  const key = makeCustomerKey(customerKey);
  if (!key) throw new Error("로그인 정보가 없습니다.");
  const toss = await loadTossPayments(TOSS_CLIENT_KEY);
  const widgets = toss.widgets({ customerKey: key });
  await widgets.setAmount({ currency: "KRW", value: Number(amount) });
  await Promise.all([
    widgets.renderPaymentMethods({ selector: methodSelector, variantKey: "DEFAULT" }),
    widgets.renderAgreement({ selector: agreementSelector, variantKey: "AGREEMENT" }),
  ]);
  return widgets;
}

/**
 * ② 토스 결제창 열기. widgets 는 initTossWidgets 로 만든 것.
 * 결제창으로 넘어가므로 성공하면 이 함수는 돌아오지 않는다(페이지 이동). 직전에 세션에 { purpose, refId, tossOrderId } 를 남긴다.
 */
export async function requestTossPayment({ widgets, tossOrderId, orderName, customerName, customerEmail, purpose, refId }) {
  if (!widgets) throw new Error("결제창이 아직 준비되지 않았습니다.");
  if (!tossOrderId) throw new Error("주문번호가 없습니다.");
  savePaySession({ purpose, refId, tossOrderId });
  const origin = window.location.origin;
  await widgets.requestPayment({
    orderId: tossOrderId,
    orderName: String(orderName || "홈프로 보험").slice(0, 100),
    successUrl: `${origin}${TOSS_SUCCESS_PATH}`,
    failUrl: `${origin}${TOSS_FAIL_PATH}`,
    customerName: customerName || undefined,
    customerEmail: customerEmail || undefined,
  });
}

/**
 * ③ 서버 승인. orderId 는 토스 주문번호(= payments 문서 ID). 새로고침으로 두 번 불려도 서버가 이미 끝난 건 다시 승인하지 않는다.
 * 서버 반환(확정): { ok, already, status, tossOrderId, paymentId, purpose, amount, method, approvedAt, receiptUrl, meta:{ policyId, orderId, planType } }
 */
export async function confirmPayment({ paymentKey, orderId, amount }) {
  try {
    const res = await call("tossConfirm")({ paymentKey, orderId, amount: Number(amount) });
    const info = res?.data || {};
    clearPaySession();
    return info;
  } catch (e) {
    throw humanError(e, "결제 승인에 실패했습니다. 카드에서 돈이 빠졌다면 고객센터에 주문번호를 알려 주세요.");
  }
}

/* ───────────── 자동결제 (빌링키) ───────────── */

/**
 * 월 구독형 — 토스 카드 등록창. 결제위젯이 아니라 payment().requestBillingAuth.
 * 성공하면 /pay/billing-success?authKey=…&customerKey=… 로 돌아온다(페이지 이동).
 */
export async function requestBillingAuth({ customerKey, customerName, customerEmail }) {
  const key = makeCustomerKey(customerKey);
  if (!key) throw new Error("로그인 정보가 없습니다.");
  savePaySession({ purpose: "insurance_monthly", refId: null, tossOrderId: null });
  const toss = await loadTossPayments(TOSS_CLIENT_KEY);
  const payment = toss.payment({ customerKey: key });
  const origin = window.location.origin;
  await payment.requestBillingAuth({
    method: "CARD",
    successUrl: `${origin}${TOSS_BILLING_SUCCESS_PATH}`,
    failUrl: `${origin}${TOSS_FAIL_PATH}`,
    customerEmail: customerEmail || undefined,
    customerName: customerName || undefined,
  });
}

/**
 * 빌링키 발급 + 첫 달 승인 + policy 생성 (서버 tossBillingIssue).
 * 서버 반환(확정): { ok, resumed, policyId, paymentId, amount, endAt(ISO), nextChargeAt(ISO), cardCompany, cardNumberMasked }
 */
export async function issueBilling({ authKey, customerKey }) {
  if (!authKey || !customerKey) throw new Error("카드 등록 정보를 받지 못했습니다.");
  try {
    const res = await call("tossBillingIssue")({ authKey, customerKey });
    clearPaySession();
    return res?.data || {};
  } catch (e) {
    throw humanError(e, "자동결제 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

/** 자동결제 해지 (서버 tossBillingCancel) — endAt 까지 보장은 유지, 자동 연장만 끊는다. 서버 반환(확정): { ok, already, policyId, endAt(ISO) } */
export async function cancelBilling({ policyId }) {
  if (!policyId) throw new Error("가입 정보가 없습니다.");
  try {
    const res = await call("tossBillingCancel")({ policyId });
    return res?.data || {};
  } catch (e) {
    throw humanError(e, "자동결제 해지에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }
}
