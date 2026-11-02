/* eslint-disable */
/**
 * 인증 공인중개사 판정 (대표 9/10 권한 구조 · 형 확정 9/13 "개업 중개사무소 등록번호 하나로 단순하게")
 *  - 조회는 누구나 / 글쓰기·손님공유 연결은 인증 공인중개사만 / 매물공유 연결은 회원이면 가능
 *
 * 선(先)활동 · 후(後)관리 (대표 리뷰 11/02)
 *  - 인증서(자격증 사본 또는 개설등록증) 사진을 올리면 즉시 "provisional"(우선활동) — 승인 대기 없이 활동
 *  - 관리자가 사후에 대조해 approved(공식 인증) / rejected(서류 보완, 활동 제한) / banned(허위 제재, 이용 정지)
 *  - 옛 문서의 "pending" 은 provisional 과 같은 취급 (마이그레이션 없음)
 */
import { IoShieldCheckmarkOutline, IoTimeOutline, IoAlertCircleOutline, IoBanOutline } from "react-icons/io5";
import { THEME } from "../config/homeproConfig";
import { getMyProDocs } from "./ProService";

/** pros 문서 status → 공인중개사 상태 ("approved" | "provisional" | "rejected" | "banned") */
export function normalizeBrokerStatus(status) {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "banned") return "banned";
  // provisional · 옛 pending · 값 없음 → 우선활동
  return "provisional";
}

/** 활동 가능한 상태인지 (공식 인증 + 우선활동) */
export function isActiveBrokerStatus(status) {
  return status === "approved" || status === "provisional";
}

export const BROKER_STATUS_TEXT = {
  provisional: "인증 심사 대기중 (우선활동 가능)",
  approved: "공인중개사 공식 인증",
  rejected: "서류 보완 필요",
  banned: "이용 정지",
};

/** 상태 표시는 뱃지 없이 글씨 색 + 작은 아이콘으로 (형 규칙) */
export function brokerStatusStyle(status) {
  switch (status) {
    case "approved": return { color: THEME.primary, Icon: IoShieldCheckmarkOutline };
    case "provisional": return { color: THEME.text, Icon: IoTimeOutline };
    case "rejected": return { color: THEME.danger, Icon: IoAlertCircleOutline };
    case "banned": return { color: THEME.danger, Icon: IoBanOutline };
    default: return { color: THEME.text, Icon: IoTimeOutline };
  }
}

/**
 * 공동중개 우선 등록 폼 (대표 리뷰 11/02)
 *  필수: 사무소 명칭 · 등록번호 · 대표자 성명 · 연락처 (+ 인증서 사진 1장은 화면에서)
 *  PRO_DETAIL_FIELDS(homeproConfig) 에 없는 대표자 칸을 여기서 덧붙이고 등록번호 예시를 바꾼다
 */
export const BROKER_REQUIRED_KEYS = ["officeName", "registrationNumber", "repName", "repPhone"];
export const BROKER_EXTRA_FIELDS = [
  { key: "repName", type: "text", label: "대표자 성명", placeholder: "예: 홍길동" },
  { key: "repPhone", type: "tel", label: "대표자 연락처", placeholder: "예: 010-1234-5678" },
];
export function withBrokerFields(catId, baseFields = []) {
  if (catId !== "brokerage") return baseFields;
  const out = [];
  baseFields.forEach((f) => {
    out.push(f.key === "registrationNumber" ? { ...f, placeholder: "예: 서울 강남구 제1234호" } : f);
    if (f.key === "registrationNumber") out.push(...BROKER_EXTRA_FIELDS);
  });
  // 설정에 등록번호 칸이 없어지더라도 대표자 칸은 빠지지 않게
  BROKER_EXTRA_FIELDS.forEach((f) => { if (!out.some((o) => o.key === f.key)) out.push(f); });
  return out;
}

async function getBrokerDoc(uid) {
  if (!uid) return null;
  const docs = await getMyProDocs(uid);
  return (docs || []).find((x) => x.categoryId === "brokerage") || null;
}

/** 활동 가능한 공인중개사인지 — 공식 인증 또는 우선활동(심사 대기)이면 true */
export async function isCertifiedBroker(uid) {
  try {
    const d = await getBrokerDoc(uid);
    return !!d && isActiveBrokerStatus(normalizeBrokerStatus(d.status));
  } catch {
    return false;
  }
}

/** "approved" | "provisional" | "rejected" | "banned" | "none" */
export async function getBrokerStatus(uid) {
  try {
    const d = await getBrokerDoc(uid);
    return d ? normalizeBrokerStatus(d.status) : "none";
  } catch {
    return "none";
  }
}

/** 상태 + 반려 사유까지 (글쓰기 막을 때 사유 안내용) */
export async function getBrokerInfo(uid) {
  try {
    const d = await getBrokerDoc(uid);
    if (!d) return { status: "none", rejectReason: "" };
    return { status: normalizeBrokerStatus(d.status), rejectReason: d.rejectReason || "" };
  } catch {
    return { status: "none", rejectReason: "" };
  }
}
