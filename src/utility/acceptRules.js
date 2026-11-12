/**
 * 오더 수락 · 지원 자격 (대표 리뷰 11/12)
 *  - 9번: 프리랜서회원(사업자 아님)은 팀원.기술자 구인 오더만 수락 · 지원할 수 있다
 *  - 8번: 외벽.고소청소(보험 D그룹)는 비즈프로필에서 그 서비스를 고른 홈프로만 수락 · 지원할 수 있다.
 *         같은 사업장청소 안의 다른 서비스(A그룹)는 지금처럼 카테고리 단위로 둔다.
 */
import { getMemberTypes } from "../config/homeproConfig";

export const WORKER_CALL_CAT = "worker_call";

/** 사업자 없이 프리랜서로만 가입한 회원인지 */
export function isFreelancerOnly(profile) {
  const t = getMemberTypes(profile);
  return t.includes("freelancer") && !t.includes("business");
}

/** 프리랜서회원이 비즈프로필에 등록할 수 있는 분야 — 구인 + (부동산중개사회원이면) 공동중개 */
export function freelancerCanRegister(profile, catId) {
  if (catId === WORKER_CALL_CAT) return true;
  if (catId === "brokerage") return getMemberTypes(profile).includes("broker");
  return false;
}

/** 카테고리별로 따로 등록해야 수락할 수 있는 고위험 서비스 */
export const RESTRICTED_SERVICES = {
  business_cleaning: ["외벽.고소청소"],
};

function orderSubs(order) {
  if (Array.isArray(order?.subcategories) && order.subcategories.length) return order.subcategories;
  return String(order?.subcategory || "").split(", ").filter(Boolean);
}

/** 오더가 고른 고위험 서비스 이름 (없으면 null) — 저장 꼴은 "서비스 종목" */
export function restrictedServiceOf(order) {
  const list = RESTRICTED_SERVICES[order?.categoryId];
  if (!list) return null;
  const subs = orderSubs(order);
  return list.find((svc) => subs.some((s) => s === svc || s.startsWith(svc + " "))) || null;
}

/**
 * 수락 · 지원을 막아야 하면 그 이유 문장, 아니면 null
 * @param {object} order
 * @param {object} userData 내 users 문서
 * @param {object[]} proDocs 내 pros 문서들 (getMyProDocs)
 */
export function acceptBlockReason(order, userData, proDocs) {
  if (!order) return null;
  if (isFreelancerOnly(userData) && order.categoryId !== WORKER_CALL_CAT) {
    return "프리랜서회원은 팀원.기술자 구인 오더만 수락할 수 있습니다";
  }
  const svc = restrictedServiceOf(order);
  if (svc) {
    const mine = (proDocs || []).find((d) => d.categoryId === order.categoryId);
    const subs = mine?.detail?.subcategories || mine?.subcategories || [];
    if (!subs.includes(svc)) {
      return `${svc} 오더는 비즈프로필에서 ${svc}를 등록한 홈프로만 수락할 수 있습니다`;
    }
  }
  return null;
}
