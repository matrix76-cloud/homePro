/**
 * 구독 상품 — 1개월 하나만 (대표 지시 2026-10-28: PG 심사 보증보험료가 너무 커서 3·6·12개월 폐지, 홈프로·장비야 공통).
 *  10/13 에 넣었던 1·3·6·12개월 + 장기 할인(0·5·10·15%)은 뺐다. 다시 늘릴 땐 여기와 서버에 같이 넣는다(할인은 천 원 아래 버림).
 *  ★서버(functions/insurance.js 의 SUBSCRIPTION_PLANS · subscriptionPlan)와 같은 식이어야 한다. 한쪽을 고치면 다른 쪽도 같이.
 *  실제 청구 금액은 서버가 다시 계산한다(앞단 금액은 표시용).
 */
export const SUBSCRIPTION_PLANS = [
  { id: "m1", months: 1, discount: 0 },
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
