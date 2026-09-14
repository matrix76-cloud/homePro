/* eslint-disable */
/**
 * 오더 ↔ 보험 연결 (대표 8/20 기획 · 형 확정 9/13)
 *
 *  - 보험은 "일하는 사람(홈프로)"이 드는 것. 매칭 오더는 배정된 홈프로가, 셀프 등록 오더는 등록자 본인이 대상.
 *  - 월·1년 가입자: 추가 결제 없이 오더에 "보험 적용" 기록만 남긴다(자동).
 *  - 미가입자: 건당 보험료(시공·단가 금액의 1%, 최소 3,000원)를 토스로 결제하면 서버(tossConfirm)가 orders.insurance 를 applied 로 바꾼다.
 *  - "보험 없이 진행"도 허용 — insurance.skipped=true 로 남기고 카드·상세에 "보험 적용 제외"로 표시.
 *  - 체크인 잠금: applied 도 skipped 도 아니면 체크인 불가.
 *
 *  orders.insurance = { applied: bool, skipped?: bool, type, policyId, paymentId, appliedAt, skippedAt }
 *  결제·가입·설정 조회의 본체는 InsuranceService.js(사용자 화면 에이전트 담당)에 있고, 여기는 오더 쪽 최소 로직만 둔다.
 */
import {
  doc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp,
} from "firebase/firestore";
import { db } from "../api/config";
import { COLLECTIONS } from "../config/homeproConfig";
import { getMoneyPriceAmount } from "./PayFlowService";

export const INSURANCE_TYPE_LABEL = { yearly: "1년 단체보험", monthly: "월 구독형 보험", perOrder: "건당 단기보험" };

const DEFAULT_PER_ORDER = { rate: 1, minPrice: 3000 };

const DEFAULT_GROUPS = { g1: { label: "1그룹(저위험)", rate: 1 }, g2: { label: "2그룹", rate: 1.3 }, g3: { label: "3그룹", rate: 1.6 }, g4: { label: "4그룹(고위험)", rate: 2 } };

/**
 * 건당 요율 — 대표 9/12: 카테고리를 위험도 4그룹으로 나눠 그룹별 1~2%. 배정표 확정 전엔 전부 g1.
 * settings/insurance.perOrder = { minPrice, groups{g1..g4:{label,rate}}, categoryGroup{categoryId:gN}, defaultGroup }
 */
export async function getPerOrderPlan(categoryId) {
  let data = null;
  try { const snap = await getDoc(doc(db, "settings", "insurance")); data = snap.exists() ? snap.data() : null; } catch {}
  const po = data?.perOrder || {};
  const groups = po.groups || DEFAULT_GROUPS;
  const gKey = (categoryId && po.categoryGroup?.[categoryId]) || po.defaultGroup || "g1";
  const g = groups[gKey] || groups.g1 || DEFAULT_GROUPS.g1;
  const fallbackRate = Number(data?.plans?.perOrder?.rate ?? DEFAULT_PER_ORDER.rate);
  return {
    rate: Number(g?.rate ?? fallbackRate),
    minPrice: Number(po.minPrice ?? data?.plans?.perOrder?.minPrice ?? DEFAULT_PER_ORDER.minPrice),
    group: gKey, groupLabel: g?.label || gKey,
    active: data?.plans?.perOrder?.active !== false,
  };
}

/** 오더의 보험 상태: applied | skipped | pending */
export function getOrderInsuranceState(order) {
  const ins = order?.insurance;
  if (ins?.applied) return "applied";
  if (ins?.skipped) return "skipped";
  return "pending";
}

/** 보험 결정이 필요한 오더인가 — 배정된 홈프로 있고, 정보공유 아니고, 아직 체크인 전 */
export function needsInsuranceDecision(order) {
  if (!order || !order.matchedProUid) return false;
  if (order.b2bPriceType === "info") return false;
  if (order.checkInAt) return false;
  if (["취소", "거부", "완료", "리뷰", "정산", "마감"].includes(order.orderStatus)) return false;
  return getOrderInsuranceState(order) === "pending";
}

/** 건당 보험료 계산 — 금액 미확정이면 { amount: 0, pending: true } */
export async function computeOrderPremium(order) {
  const plan = await getPerOrderPlan(order.categoryId);
  const base = order.b2bPriceType === "hpoint" ? (Number(order.b2bPriceAmount) || 0) : (getMoneyPriceAmount(order) || 0);
  if (!base) return { amount: 0, pending: true, plan };
  const amount = Math.max(Math.round(base * plan.rate / 100), plan.minPrice);
  return { amount, pending: false, plan, base };
}

/** 홈프로의 유효한 월·1년 가입 — 없으면 null */
export async function findActivePolicy(uid) {
  if (!uid) return null;
  const now = new Date();
  const q = query(collection(db, "insurance_policies"), where("uid", "==", uid), where("status", "==", "active"));
  const snap = await getDocs(q);
  let best = null;
  snap.forEach((d) => {
    const p = { id: d.id, ...d.data() };
    if (p.type !== "yearly" && p.type !== "monthly") return;
    const end = p.endAt?.toDate ? p.endAt.toDate() : (p.endAt ? new Date(p.endAt) : null);
    if (end && end < now) return;
    if (!best || (end && best.endAt?.toDate && end > best.endAt.toDate())) best = p;
  });
  return best;
}

/** 월·1년 가입자면 오더에 자동 적용. 적용됐으면 true */
export async function autoApplyPolicy(order, uid) {
  if (!order?.id || getOrderInsuranceState(order) !== "pending") return false;
  const policy = await findActivePolicy(uid);
  if (!policy) return false;
  await updateDoc(doc(db, COLLECTIONS.ORDERS, order.id), {
    insurance: { applied: true, type: policy.type, policyId: policy.id, paymentId: policy.paymentId || null, appliedAt: serverTimestamp() },
    updatedAt: serverTimestamp(),
  });
  return true;
}

/** 보험 없이 진행 */
export async function skipOrderInsurance(orderId) {
  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
    insurance: { applied: false, skipped: true, type: null, policyId: null, skippedAt: serverTimestamp() },
    updatedAt: serverTimestamp(),
  });
}

/** "보험 없이 진행"을 되돌려 다시 정하게 */
export async function resetOrderInsurance(orderId) {
  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
    insurance: { applied: false, skipped: false, type: null, policyId: null },
    updatedAt: serverTimestamp(),
  });
}

/** 카드·상세 표시용 한 줄 */
export function insuranceLine(order) {
  const st = getOrderInsuranceState(order);
  if (st === "applied") return `보험 적용 · ${INSURANCE_TYPE_LABEL[order.insurance?.type] || "가입"}`;
  if (st === "skipped") return "보험 적용 제외";
  return "";
}
