/**
 * 보험(도급배상책임보험) 서비스 — 사용자 화면용 (에이전트 B 소유)
 *
 *  · settings/insurance         : 요금·보장 문구 (관리자 편집). 없으면 사양 기본값
 *  · insurance_policies/{id}    : 가입 1건 (생성·연장·해지는 서버 함수가 한다 — 여기선 읽기만)
 *  · insurance_claims/{id}      : 사고 접수 (여기서 생성)
 *  · payments/{tossOrderId}     : 결제 기록 (purpose insurance_*) — 읽기만
 *
 * 쿼리는 where 만 쓰고 정렬은 화면에서 한다 (복합 인덱스 의존을 없애기 위함).
 */
import {
  collection, doc, getDoc, getDocs, addDoc, query, where, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../api/config";
import { COLLECTIONS, STORAGE_PATH_PREFIX } from "../config/homeproConfig";
import { compressEvidencePhoto } from "./WorkLogService";
import { getOrdersByMatchedPro, getOrdersByUser } from "./OrderService";
import { getMoneyPriceAmount } from "./PayFlowService";

export const POLICIES_COL = "insurance_policies";
export const CLAIMS_COL = "insurance_claims";
export const PAYMENTS_COL = "payments";
const SETTINGS_DOC = ["settings", "insurance"];

/** 건당 보험료 위험도 그룹 순서 (사양 4-1) */
export const PER_ORDER_GROUP_KEYS = ["g1", "g2", "g3", "g4"];

/**
 * 사양 1절·4-1절 임시 보험료 — 대표가 확정값을 주면 관리자 설정(settings/insurance)에서 바꾼다.
 *  · 건당은 카테고리를 위험도 4그룹으로 나눠 그룹별 1~2% (시공단가 기준). 카테고리→그룹 배정표는 대표가 줄 때까지 모두 g1.
 *  · plans.perOrder.rate(단일 요율)는 폴백으로만 남긴다.
 */
export const DEFAULT_INSURANCE_SETTINGS = {
  plans: {
    yearly: { label: "1년 단체보험", price: 110000, active: true },
    monthly: { label: "월 구독형 보험", price: 11000, active: true },
    perOrder: { label: "건당 단기보험", rate: 1, minPrice: 3000, active: true },
  },
  perOrder: {
    minPrice: 3000,
    groups: {
      g1: { label: "1그룹(저위험)", rate: 1 },
      g2: { label: "2그룹", rate: 1.3 },
      g3: { label: "3그룹", rate: 1.6 },
      g4: { label: "4그룹(고위험)", rate: 2 },
    },
    categoryGroup: {},
    defaultGroup: "g1",
  },
  coverage: {
    maxText: "",
    maxByGroup: { g1: "", g2: "", g3: "", g4: "" },
    deductibleText: "30만원 (공통)",
    items: ["작업 중 고객 재물 파손 배상", "작업 중 대인 피해 배상"],
  },
  agencyContacts: [],
};

/** 가입 유형 설명 (사양 1절 문구) */
export const PLAN_DESC = {
  yearly: { period: "결제일부터 1년", pay: "1회 결제", desc: "한 번 결제하면 1년 동안 모든 오더에 보험이 적용됩니다. 연 보험료는 월 구독형보다 할인된 금액입니다." },
  monthly: { period: "결제일부터 1개월, 매월 자동 연장", pay: "카드 자동결제", desc: "매월 자동으로 결제되며 언제든 해지할 수 있습니다. 해지해도 다음 결제일까지 보장됩니다." },
  perOrder: { period: "그 오더의 체크인부터 체크아웃까지", pay: "오더별 결제", desc: "가입하지 않은 회원이 오더를 진행할 때 그 오더만 보장합니다. 건당 보험료는 작업 위험도 그룹(4단계)에 따라 시공단가의 1~2%입니다." },
};

export const PLAN_KEYS = ["yearly", "monthly", "perOrder"];

export const POLICY_STATUS_LABEL = { active: "보장 중", expired: "만료", canceled: "해지", pending: "결제 전" };
export const CLAIM_STATUS_LABEL = { received: "접수됨", in_progress: "처리 중", done: "처리 완료" };
export const DAMAGE_LEVEL_LABEL = { minor: "경미한 재물 피해", major: "큰 재물 피해", injury: "사람이 다침" };
export const CLAIM_MAX_PHOTOS = 6;
export const CLAIM_DESC_MAX = 4000;

/* ───────────── 공통 ───────────── */

const toDate = (v) => {
  if (!v) return null;
  if (v.toDate) return v.toDate();
  if (v.seconds) return new Date(v.seconds * 1000);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
export const tsToDate = toDate;
const ms = (v) => (toDate(v)?.getTime() || 0);
const byNewest = (a, b) => ms(b.createdAt) - ms(a.createdAt);

const pad = (n) => String(n).padStart(2, "0");
export const formatDate = (v) => {
  const d = toDate(v);
  return d ? `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}` : "";
};
export const formatDateTime = (v) => {
  const d = toDate(v);
  return d ? `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}` : "";
};
/** "2026.09.13 ~ 2027.09.12" */
export const formatPeriod = (startAt, endAt) => {
  const s = formatDate(startAt); const e = formatDate(endAt);
  if (!s && !e) return "";
  return `${s || "?"} ~ ${e || "?"}`;
};
export const won = (n) => `${Math.round(Number(n) || 0).toLocaleString("ko-KR")}원`;

/* ───────────── 설정 ───────────── */

/** settings/insurance — 없거나 필드가 비면 기본값으로 메운다 */
export async function getInsuranceSettings() {
  try {
    const snap = await getDoc(doc(db, ...SETTINGS_DOC));
    if (!snap.exists()) return { ...DEFAULT_INSURANCE_SETTINGS, _default: true };
    const d = snap.data() || {};
    const plans = { ...DEFAULT_INSURANCE_SETTINGS.plans };
    PLAN_KEYS.forEach((k) => { plans[k] = { ...plans[k], ...(d.plans?.[k] || {}) }; });
    const groups = { ...DEFAULT_INSURANCE_SETTINGS.perOrder.groups };
    PER_ORDER_GROUP_KEYS.forEach((g) => { groups[g] = { ...groups[g], ...(d.perOrder?.groups?.[g] || {}) }; });
    return {
      ...DEFAULT_INSURANCE_SETTINGS,
      ...d,
      plans,
      perOrder: {
        ...DEFAULT_INSURANCE_SETTINGS.perOrder,
        ...(d.perOrder || {}),
        groups,
        categoryGroup: d.perOrder?.categoryGroup && typeof d.perOrder.categoryGroup === "object" ? d.perOrder.categoryGroup : {},
        defaultGroup: PER_ORDER_GROUP_KEYS.includes(d.perOrder?.defaultGroup) ? d.perOrder.defaultGroup : "g1",
      },
      coverage: {
        ...DEFAULT_INSURANCE_SETTINGS.coverage,
        ...(d.coverage || {}),
        maxByGroup: { ...DEFAULT_INSURANCE_SETTINGS.coverage.maxByGroup, ...(d.coverage?.maxByGroup || {}) },
        // 자기부담금은 공통 30만원이 기본 — 관리자가 비워 두면 기본 문구를 쓴다
        deductibleText: d.coverage?.deductibleText || DEFAULT_INSURANCE_SETTINGS.coverage.deductibleText,
      },
      agencyContacts: Array.isArray(d.agencyContacts) ? d.agencyContacts : [],
    };
  } catch (e) {
    console.warn("보험 설정 조회 실패:", e.message);
    return { ...DEFAULT_INSURANCE_SETTINGS, _default: true };
  }
}

/** 카테고리의 위험도 그룹·요율 — { group, label, rate }. 배정표에 없으면 defaultGroup(g1) */
export function getPerOrderRate(categoryId, settings) {
  const po = settings?.perOrder || DEFAULT_INSURANCE_SETTINGS.perOrder;
  const groups = po.groups || DEFAULT_INSURANCE_SETTINGS.perOrder.groups;
  const key = (categoryId && po.categoryGroup?.[categoryId]) || po.defaultGroup || "g1";
  const g = groups[key] || groups.g1 || DEFAULT_INSURANCE_SETTINGS.perOrder.groups.g1;
  const fallbackRate = Number(settings?.plans?.perOrder?.rate) || 1;   // 단일 요율은 폴백으로만
  return { group: key, label: g.label || key, rate: Number(g.rate) || fallbackRate };
}

/** 건당 보험료 요율 범위 문구 — "1~2%" */
export function perOrderRateRangeText(settings) {
  const groups = settings?.perOrder?.groups || DEFAULT_INSURANCE_SETTINGS.perOrder.groups;
  const rates = PER_ORDER_GROUP_KEYS.map((g) => Number(groups[g]?.rate)).filter((r) => r > 0);
  if (!rates.length) return "1%";
  const min = Math.min(...rates); const max = Math.max(...rates);
  return min === max ? `${min}%` : `${min}~${max}%`;
}

/** 오더의 보험료 산정 기준 금액(시공단가) — 없으면 null. 숫자를 주면 그대로 */
export function perOrderBaseAmount(order) {
  if (order == null) return null;
  if (typeof order === "number" || typeof order === "string") return Number(order) > 0 ? Number(order) : null;
  if (Number(order.amount) > 0) return Number(order.amount);
  return getMoneyPriceAmount(order);
}

/**
 * 건당 보험료 = 시공단가 × (카테고리 위험도 그룹 요율)% (최소 minPrice).
 *  order: 오더 문서({ categoryId, b2bPriceAmount|onsiteQuotedPrice|... }) 또는 { amount, categoryId } 또는 숫자(금액만 — g1 요율)
 *  금액이 아직 없으면 null (현장견적·견적요청은 금액 확정 후 계산)
 */
export function computePerOrderPremium(order, settings) {
  const amount = perOrderBaseAmount(order);
  if (!(amount > 0)) return null;
  const categoryId = typeof order === "object" ? order.categoryId : null;
  const { rate } = getPerOrderRate(categoryId, settings);
  const min = Number(settings?.perOrder?.minPrice ?? settings?.plans?.perOrder?.minPrice) || 0;
  return Math.max(Math.round((amount * rate) / 100), min);
}

/* ───────────── 가입(policy) ───────────── */

export async function getMyPolicies(uid) {
  if (!uid) return [];
  const snap = await getDocs(query(collection(db, POLICIES_COL), where("uid", "==", uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byNewest);
}

/** 지금 유효한 yearly/monthly 가입 1건 (active 이고 endAt > now). 없으면 null. canceled 라도 endAt 전이면 보장은 유지 */
export async function getActivePolicy(uid) {
  const list = await getMyPolicies(uid);
  return pickActivePolicy(list);
}
export function pickActivePolicy(list = []) {
  const now = Date.now();
  const valid = list.filter((p) =>
    (p.type === "yearly" || p.type === "monthly") &&
    (p.status === "active" || p.status === "canceled") &&
    ms(p.endAt) > now
  );
  valid.sort((a, b) => ms(b.endAt) - ms(a.endAt));
  return valid[0] || null;
}

/** 오더의 보험 적용 정보 { applied, type, policyId, paymentId, appliedAt, skipped } — 없으면 미적용 */
export function getOrderInsurance(order) {
  const ins = order?.insurance;
  if (!ins || typeof ins !== "object") return { applied: false, type: null, policyId: null, paymentId: null, appliedAt: null, skipped: false };
  return {
    applied: ins.applied === true,
    type: ins.type || null,
    policyId: ins.policyId || null,
    paymentId: ins.paymentId || null,
    appliedAt: ins.appliedAt || null,
    skipped: ins.skipped === true,
  };
}

/* ───────────── 결제 이력 ───────────── */

/** 내 보험 결제 기록 (purpose insurance_*) — 최신순 */
export async function getMyInsurancePayments(uid) {
  if (!uid) return [];
  const snap = await getDocs(query(
    collection(db, PAYMENTS_COL),
    where("uid", "==", uid),
    where("purpose", "in", ["insurance_yearly", "insurance_monthly", "insurance_order"]),
  ));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byNewest);
}

/* ───────────── 사고 접수(claim) ───────────── */

/** 사고 접수가 가능한 내 오더 — 내가 수주한 오더(배정·완료) + 내가 셀프 등록한 오더. 최신순 */
export async function getClaimableOrders(uid) {
  if (!uid) return [];
  const [mine, self] = await Promise.all([
    getOrdersByMatchedPro(uid).catch(() => []),
    getOrdersByUser(uid).catch(() => []),
  ]);
  const seen = new Set();
  const out = [];
  [...mine, ...self.filter((o) => o.selfOrder === true)].forEach((o) => {
    if (seen.has(o.id)) return;
    if (!["배정", "완료"].includes(o.orderStatus)) return;
    seen.add(o.id); out.push(o);
  });
  return out.sort(byNewest);
}

/**
 * 사고 접수 생성. photos: File[] (최대 6장) → Storage homepro/insurance/claims/{uid}/ 에 압축 업로드
 * 돌려주는 값: { id }
 */
export async function createClaim({
  uid, userName = "", userPhone = "", orderId, policyId = null,
  occurredAt, place, description, damageLevel, photos = [],
}) {
  if (!uid) throw new Error("로그인 정보가 없습니다.");
  if (!orderId) throw new Error("사고가 난 오더를 선택해 주세요.");
  const when = occurredAt instanceof Date ? occurredAt : toDate(occurredAt);
  if (!when) throw new Error("발생 일시를 입력해 주세요.");
  if (!String(place || "").trim()) throw new Error("발생 장소를 입력해 주세요.");
  const desc = String(description || "").trim();
  if (!desc) throw new Error("사고 경위를 입력해 주세요.");
  if (desc.length > CLAIM_DESC_MAX) throw new Error(`사고 경위는 ${CLAIM_DESC_MAX.toLocaleString()}자까지 입력할 수 있습니다.`);
  if (!Object.keys(DAMAGE_LEVEL_LABEL).includes(damageLevel)) throw new Error("피해 정도를 선택해 주세요.");
  if (photos.length > CLAIM_MAX_PHOTOS) throw new Error(`사진은 ${CLAIM_MAX_PHOTOS}장까지 첨부할 수 있습니다.`);

  const urls = [];
  for (let i = 0; i < photos.length; i++) {
    const blob = await compressEvidencePhoto(photos[i]);
    const path = `${STORAGE_PATH_PREFIX}/insurance/claims/${uid}/${Date.now()}_${i}.jpg`;
    const snap = await uploadBytes(ref(storage, path), blob, { contentType: "image/jpeg" });
    urls.push(await getDownloadURL(snap.ref));
  }

  const docRef = await addDoc(collection(db, CLAIMS_COL), {
    uid,
    userName: userName || "",
    userPhone: userPhone || "",
    orderId,
    policyId: policyId || null,
    occurredAt: Timestamp.fromDate(when),
    place: String(place).trim(),
    description: desc,
    damageLevel,
    photos: urls,
    status: "received",
    agencyMemo: "",
    handledBy: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id };
}

export async function getMyClaims(uid) {
  if (!uid) return [];
  const snap = await getDocs(query(collection(db, CLAIMS_COL), where("uid", "==", uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byNewest);
}

/** 오더 1건 (사고 접수 화면에서 :orderId 로 들어왔을 때) */
export async function getOrderForClaim(orderId) {
  if (!orderId) return null;
  const snap = await getDoc(doc(db, COLLECTIONS.ORDERS, orderId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
