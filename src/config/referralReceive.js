/**
 * 소개수수료 수령 수단 (대표 리뷰 2026-11-27)
 *
 *  접수자가 소개수수료(정률 · 정액)를 걸면 받는 방법을 꼭 고른다 — 오더 문서 referralReceiveMethod.
 *    any      상관없음           수락자가 계좌이체 · 카드결제 중 편한 쪽으로
 *    transfer 일반계좌이체 받기   수락자가 접수자 계좌로 직접 이체 → [입금 완료] → 접수자 [입금 확인]. 카드 결제창은 만들지 않는다
 *    pg       PG안전결제 받기     수락자가 카드로 결제 → 결제수수료 3.5%(VAT 포함)를 뺀 금액을 접수자 정산계좌로 정산
 *  이 값이 없는 예전 오더는 계좌이체로 본다. H-포인트로 주는 소개수수료에는 쓰지 않는다.
 */
export const REFERRAL_RECEIVE_OPTIONS = [
  { value: "any", label: "상관없음", desc: "수락자가 편한 방식으로 입금 또는 결제합니다." },
  { value: "transfer", label: "일반계좌이체 받기", desc: "등록된 내 계좌로 수락자가 직접 이체합니다. (입금 확인 수동 처리)" },
  { value: "pg", label: "PG안전결제 받기", desc: "PG 결제수수료 3.5%(VAT 포함) 공제 후 정산 입금됩니다." },
];

/** PG 결제수수료율(%) — VAT 포함 */
export const REFERRAL_PG_FEE_RATE = 3.5;

export const referralReceiveOf = (order) => order?.referralReceiveMethod || "transfer";
export const referralReceiveLabel = (v) => (REFERRAL_RECEIVE_OPTIONS.find((o) => o.value === v) || REFERRAL_RECEIVE_OPTIONS[1]).label;
export const referralAllowsPg = (order) => ["any", "pg"].includes(referralReceiveOf(order));
export const referralAllowsTransfer = (order) => ["any", "transfer"].includes(referralReceiveOf(order));

/** 카드로 결제된 소개수수료에서 접수자가 실제로 받는 금액 */
export const referralPgSettle = (amount) => {
  const a = Math.round(Number(amount) || 0);
  const fee = Math.round(a * REFERRAL_PG_FEE_RATE / 100);
  return { amount: a, fee, settle: a - fee };
};
