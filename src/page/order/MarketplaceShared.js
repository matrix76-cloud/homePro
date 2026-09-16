/* eslint-disable */
// 양도·매매 공용 상수·헬퍼 (대표 리뷰 2026-09 — 3대 카테고리 체계로 재구성)
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";

export const MARKET_COLLECTION = "homepro_marketplace";

/** 3대 핵심 카테고리 — category 필드에 key 저장 */
export const CATEGORIES = [
  {
    key: "space",
    formLabel: "사업장/공간 양도",
    chipLabel: "사업장·공간",
    tag: "사업장·공간 양도",
    desc: "장비·자재 창고, 소형 사무실, 쇼룸 겸용 매장 등 오프라인 거점. 시설물·보증금/월세 조건이 포함된 실물 공간 인수",
  },
  {
    key: "team",
    formLabel: "팀/크루 양도",
    chipLabel: "팀·인력(지점)",
    tag: "팀·크루 양도",
    desc: "전문 시공 크루(타일 팀, 도배 팀 등), 프랜차이즈 지역 독점 지점. 인원 구성·기술력·기존 계약 라인을 통째로 인수",
  },
  {
    key: "sales",
    formLabel: "고정 거래처·DB 양도",
    chipLabel: "영업권·DB",
    tag: "영업권/DB 양도",
    desc: "고정 거래처(인테리어 업체, 관리사무소 등) 고객 DB, 상위 노출 블로그·계정. 무점포 창업이나 즉시 매출 파이프라인 확보용",
  },
];
export const ETC_CATEGORY = { key: "etc", formLabel: "기타", chipLabel: "기타", tag: "기타", desc: "" };

/** 예전 tradeType(시트7) → 새 카테고리. 대응이 애매한 것은 기타 */
const LEGACY_TYPE_MAP = {
  "업체인수양도": "space",
  "사업권양도": "sales",
};

export const getCategoryKey = (post) => {
  if (post?.category && CATEGORIES.some((c) => c.key === post.category)) return post.category;
  return LEGACY_TYPE_MAP[post?.tradeType] || "etc";
};
export const getCategory = (post) => CATEGORIES.find((c) => c.key === getCategoryKey(post)) || ETC_CATEGORY;

/** 거래 상태 — status 필드. 예전 글의 "active" 는 진행중으로 읽는다 */
export const STATUSES = [
  { key: "open", label: "양도 진행중", color: THEME.primaryDark },
  { key: "pending", label: "계약 대기중", color: "#B45309" },
  { key: "done", label: "거래 완료", color: THEME.muted },
];
export const getStatus = (post) => {
  const s = post?.status === "active" || !post?.status ? "open" : post.status;
  return STATUSES.find((x) => x.key === s) || STATUSES[0];
};

/** 포함 내역 체크박스 — includes 배열에 key 저장 */
export const INCLUDE_OPTIONS = [
  { key: "equipment", label: "집기·장비 일체 포함", short: "집기·장비 포함" },
  { key: "vehicle", label: "영업용 차량 포함", short: "차량 포함" },
  { key: "clientDb", label: "거래처 DB 인계", short: "DB 인계" },
  { key: "training", label: "노하우 전수 기간 제공", short: "노하우 전수" },
];

/** 월 평균 매출 구간 — monthlySales 필드에 라벨 그대로 저장 */
export const SALES_RANGES = [
  "비공개(상담 시 안내)",
  "월 500만원 미만",
  "월 500만~1,000만원",
  "월 1,000만~3,000만원",
  "월 3,000만~5,000만원",
  "월 5,000만원 이상",
];

export const formatWon = (n) => `${Number(n || 0).toLocaleString()}원`;

/** 권리금 한 줄 — 예전 글은 amount 를 거래금액으로 표시 */
export const premiumText = (post) => {
  if (post?.premium != null && post.premium !== "") {
    return Number(post.premium) === 0 ? "권리금 없음" : `권리금 ${formatWon(post.premium)}`;
  }
  if (Number(post?.amount) > 0) return `거래금액 ${formatWon(post.amount)}`;
  return "금액 협의";
};

/** (보증금 1,000 / 월 70) — 만원 단위, 사업장/공간 양도에만 */
export const rentText = (post) => {
  if (getCategoryKey(post) !== "space") return "";
  const hasDep = post?.depositMan != null && post.depositMan !== "";
  const hasRent = post?.monthlyRentMan != null && post.monthlyRentMan !== "";
  if (!hasDep && !hasRent) return "";
  const parts = [];
  if (hasDep) parts.push(`보증금 ${Number(post.depositMan).toLocaleString()}`);
  if (hasRent) parts.push(`월 ${Number(post.monthlyRentMan).toLocaleString()}`);
  return `${parts.join(" / ")} (만원)`;
};

export const includesSummary = (post) => {
  const inc = Array.isArray(post?.includes) ? post.includes : [];
  return INCLUDE_OPTIONS.filter((o) => inc.includes(o.key)).map((o) => o.short);
};

export const regionText = (post) =>
  post?.regionSido ? `${post.regionSido} ${post.regionGu || ""}`.trim() : post?.region || "지역 미정";

export const timeAgo = (ts) => {
  if (!ts) return "방금 등록";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "방금 등록";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전 등록`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전 등록`;
  const days = Math.floor(diff / 86400000);
  if (days < 30) return `${days}일 전 등록`;
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} 등록`;
};

/* ─── 탭바 (전역 기준 스타일: 한 박스 + 세로 구분선 + 활성 연회색 면/굵게) ─── */
export const TabBox = styled.div`
  display: flex;
  border: 1px solid #d5d9e0;
  background: #fff;
  overflow: hidden;
`;
export const TabItem = styled.button`
  flex: 1 1 0;
  min-width: 0;
  min-height: 44px;
  padding: 6px 4px;
  border: none;
  border-left: 1px solid #d5d9e0;
  &:first-child { border-left: none; }
  background: ${({ $active }) => ($active ? "#e9ecf1" : "#fff")};
  color: ${THEME.text};
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 700 : 400)};
  font-family: inherit;
  line-height: 1.3;
  word-break: keep-all;
  cursor: pointer;
`;
