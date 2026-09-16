/* eslint-disable */
// 자재·장비 거래장터 — 공통 상수·표시 헬퍼 (대표 스펙 9/15)
// 컬렉션: homepro_supplies
//  - 신규 거래글: tradeType 필드가 있음
//  - 예전 업체 소개글(name/phone/hours 등): tradeType 없음 → isLegacy() 로 구분해 업체 카드로 표시

export const SUPPLIES_COL = "homepro_supplies";

export const TRADE_TYPES = [
  { key: "sale", label: "판매" },
  { key: "buy", label: "구매요청" },
  { key: "free", label: "무료나눔" },
];

export const CATEGORIES = [
  { key: "material", label: "자재", short: "자재", hint: "타일·마루·장판, 벽지·필름·줄눈, 배관 부속·방수액·실리콘 등" },
  { key: "tool", label: "전동공구/장비", short: "공구·장비", hint: "산업용 청소기·고압 세척기, 레이저 레벨기·타일 커터기·전동드릴 등" },
  { key: "special", label: "특수장비", short: "특수장비", hint: "누수탐지기·내시경 카메라·고압 배관 청소 장비, 사다리차·리프트·구루마 등" },
  { key: "vehicle", label: "차량", short: "차량", hint: "적재함·랙이 설치된 포터·다마스·레이 등 영업용 화물차·탑차" },
];

export const CONDITIONS = [
  { key: "new", label: "미개봉 새상품" },
  { key: "S", label: "S급", desc: "사용감 거의 없음" },
  { key: "A", label: "A급", desc: "정상 작동" },
  { key: "B", label: "B급", desc: "연식 있음/수리 필요" },
];

export const DEAL_METHODS = [
  { key: "direct", label: "직거래" },
  { key: "delivery", label: "택배/화물 배송 가능" },
];

/** 금전이 오가는 글(판매·구매요청)은 월 구독 회원만 등록 */
export const needsSubscription = (tradeType) => tradeType === "sale" || tradeType === "buy";

const findLabel = (list, key) => list.find((x) => x.key === key)?.label || "";

export const tradeLabel = (k) => findLabel(TRADE_TYPES, k);
export const categoryLabel = (k) => findLabel(CATEGORIES, k);
export const categoryShort = (k) => CATEGORIES.find((x) => x.key === k)?.short || "";
export const conditionLabel = (k) => {
  const c = CONDITIONS.find((x) => x.key === k);
  if (!c) return "";
  return c.desc ? `${c.label}(${c.desc})` : c.label;
};

export const isLegacy = (item) => !item?.tradeType;

export const formatPrice = (item) => {
  if (!item) return "";
  if (item.tradeType === "free") return "무료나눔";
  const n = Number(item.price);
  if (item.tradeType === "buy") return n > 0 ? `희망 ${n.toLocaleString()}원` : "가격 협의";
  return n > 0 ? `${n.toLocaleString()}원` : "가격 문의";
};

export const dealMethodText = (item) => {
  const m = Array.isArray(item?.dealMethods) ? item.dealMethods : [];
  return m.map((k) => (k === "direct" ? "직거래" : k === "delivery" ? "택배/화물" : "")).filter(Boolean).join(" · ");
};

export const toDate = (ts) => {
  if (!ts) return null;
  try {
    if (typeof ts.toDate === "function") return ts.toDate();
    if (typeof ts.seconds === "number") return new Date(ts.seconds * 1000);
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  } catch (e) {
    return null;
  }
};

export const formatDate = (ts) => {
  const d = toDate(ts);
  if (!d) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

export const timeAgo = (ts) => {
  const d = toDate(ts);
  if (!d) return "방금";
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "방금";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  if (diff < 86400000 * 7) return `${Math.floor(diff / 86400000)}일 전`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

/** +821012345678 → 010-1234-5678 */
export const toLocalPhone = (raw) => {
  if (!raw) return "";
  let s = String(raw).replace(/[^0-9+]/g, "");
  if (s.startsWith("+82")) s = "0" + s.slice(3);
  s = s.replace(/[^0-9]/g, "");
  if (s.length === 11) return `${s.slice(0, 3)}-${s.slice(3, 7)}-${s.slice(7)}`;
  if (s.length === 10) return `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6)}`;
  return s;
};

/** 공통 톤 — THEME.border 가 너무 연해서 입력칸·외곽선은 조금 진하게 */
export const LINE = "#dfe3e8";
export const ACTIVE_FACE = "#e9ecf1";
export const INK_BUTTON = "#1b1f27";
export const DONE_COLOR = "#6b7280";
