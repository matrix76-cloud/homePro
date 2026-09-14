/**
 * 토스페이먼츠 설정 (보험 결제 · 에이전트 B 소유)
 *
 * 키 받는 곳: https://developers.tosspayments.com
 *   · 클라이언트 키(test_ck_… / test_gck_…) — 앞단에서 결제창을 띄울 때. 공개돼도 된다.
 *   · 시크릿 키(test_sk_… / test_gsk_…) — 서버 승인용. functions/tossPay.js 에만 둔다 (앞단 금지).
 *
 * 계약(9/14 예정) 뒤 실키를 받으면 .env(.env.production) 의 REACT_APP_TOSS_CLIENT_KEY 와
 * functions 쪽 TOSS_SECRET_KEY 두 군데만 바꾸면 된다.
 */

/* 토스가 문서에 공개해둔 테스트 클라이언트 키 — 계약 없이 결제창이 열리고 돈은 빠지지 않는다.
   짝이 되는 시크릿 키(test_gsk_docs_…)는 서버(functions) 쪽에 있다. */
const DOCS_TEST_CLIENT_KEY = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";
export const TOSS_CLIENT_KEY = process.env.REACT_APP_TOSS_CLIENT_KEY || DOCS_TEST_CLIENT_KEY;

/** 테스트 키로 돌고 있는지 — 화면에 "실제로 돈이 빠지지 않습니다" 안내를 띄울 때 본다 */
export const isTossTestKey = () => String(TOSS_CLIENT_KEY).startsWith("test_");

/** 결제가 끝나고 돌아올 주소 (App.js 라우트와 맞춘다) */
export const TOSS_SUCCESS_PATH = "/pay/success";
export const TOSS_FAIL_PATH = "/pay/fail";
export const TOSS_BILLING_SUCCESS_PATH = "/pay/billing-success";

/**
 * 토스 customerKey — 서버 규격(에이전트 A 확정): 반드시 "hp_" + uid(users 문서 ID). 서버가 uid 포함 여부를 검사한다.
 * 토스 규칙: 영문 대소문자·숫자·- _ 만, 2~50자. Firebase uid(28자 영숫자) + "hp_" = 31자.
 * uid 가 없으면 "" (호출 쪽에서 로그인 요구).
 */
export const CUSTOMER_KEY_PREFIX = "hp_";
export const makeCustomerKey = (uid) => {
  const cleaned = String(uid || "").replace(/[^A-Za-z0-9\-_]/g, "");
  if (cleaned.length < 2) return "";
  return `${CUSTOMER_KEY_PREFIX}${cleaned}`.slice(0, 50);
};
/** customerKey 에서 uid 를 되돌린다 */
export const uidFromCustomerKey = (key) => {
  const s = String(key || "");
  return s.startsWith(CUSTOMER_KEY_PREFIX) ? s.slice(CUSTOMER_KEY_PREFIX.length) : "";
};

/** 결제 직전에 { purpose, refId, tossOrderId } 를 적어두는 세션 키 — 성공/실패 화면에서 되돌아갈 곳을 찾는다 */
export const PAY_SESSION_KEY = "homepro.pay";

/** 결제 목적(purpose) → 화면 표기 */
export const PAY_PURPOSE_LABEL = {
  insurance_yearly: "1년 단체보험",
  insurance_monthly: "월 구독형 보험",
  insurance_order: "건당 단기보험",
  subscription: "구독",
};

/** 토스 결제수단 코드 → 한국어 */
export const TOSS_METHOD_LABEL = {
  카드: "카드", 가상계좌: "가상계좌", 간편결제: "간편결제", 휴대폰: "휴대폰", 계좌이체: "계좌이체",
  CARD: "카드", VIRTUAL_ACCOUNT: "가상계좌", EASY_PAY: "간편결제", MOBILE_PHONE: "휴대폰", TRANSFER: "계좌이체",
};

/** 토스 실패 코드 → 한국어 사유 */
export const TOSS_FAIL_REASON = {
  PAY_PROCESS_CANCELED: "결제를 취소했습니다.",
  PAY_PROCESS_ABORTED: "결제 진행 중 중단됐습니다.",
  USER_CANCEL: "결제를 취소했습니다.",
  REJECT_CARD_COMPANY: "카드사에서 결제를 거절했습니다. 다른 카드로 시도해 주세요.",
  INVALID_CARD_EXPIRATION: "카드 유효기간이 올바르지 않습니다.",
  INVALID_STOPPED_CARD: "정지된 카드입니다.",
  EXCEED_MAX_DAILY_PAYMENT_COUNT: "하루 결제 가능 횟수를 넘었습니다.",
  EXCEED_MAX_AMOUNT: "결제 한도를 넘었습니다.",
  NOT_SUPPORTED_INSTALLMENT_PLAN_CARD_OR_MERCHANT: "할부가 지원되지 않는 카드입니다.",
  INVALID_CARD_NUMBER: "카드 번호가 올바르지 않습니다.",
  NOT_AVAILABLE_PAYMENT: "지금은 이용할 수 없는 결제수단입니다.",
  FAILED_PAYMENT_INTERNAL_SYSTEM_PROCESSING: "결제 시스템 처리 중 오류가 났습니다. 잠시 후 다시 시도해 주세요.",
  INVALID_REQUEST: "결제 요청 정보가 올바르지 않습니다.",
};
