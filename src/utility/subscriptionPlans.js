/**
 * 구독 상품 — 스카이링크처럼 1·3·6·12개월, 길게 끊을수록 할인 (형 확정 2026-10-13).
 *  할인율은 스카이링크와 같은 0 · 5 · 10 · 15% (임시 — 대표 확정 필요), 천 원 아래는 버린다.
 *  ★서버(functions/insurance.js 의 SUBSCRIPTION_PLANS · subscriptionPlan)와 같은 식이어야 한다. 한쪽을 고치면 다른 쪽도 같이.
 *  실제 청구 금액은 서버가 다시 계산한다(앞단 금액은 표시용).
 */
export const SUBSCRIPTION_PLANS = [
  { id: "m1", months: 1, discount: 0 },
  { id: "m3", months: 3, discount: 0.05 },
  { id: "m6", months: 6, discount: 0.1 },
  { id: "m12", months: 12, discount: 0.15 },
];

/** 월 구독료(monthly)를 받아 상품별 금액을 붙여 돌려준다 */
export function buildSubscriptionPlans(monthly) {
  const m = Number(monthly) || 16500;
  return SUBSCRIPTION_PLANS.map((p) => {
    const full = m * p.months;
    const price = p.months === 1 ? m : Math.floor((full * (1 - p.discount)) / 1000) * 1000;
    return {
      ...p,
      name: `${p.months}개월`,
      full,
      price,
      saved: full - price,
      perMonth: Math.floor(price / p.months / 100) * 100,
      percent: Math.round(p.discount * 100),
    };
  });
}

export const findSubscriptionPlan = (plans, id) => plans.find((p) => p.id === id) || plans[0];
