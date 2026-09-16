/* eslint-disable */
// 기술전수 교육생 모집 — 목록·등록·상세가 같이 쓰는 분류·상태·표시 규칙 (대표 9/15 기획 요약)
import { createChatRoom } from "../../service/ChatService";
import { KR_AREAS } from "../../utility/constants";

export const TRAINING_COL = "homepro_trainings";
export const TRAINING_POST_COST = 20000; // 교육 공고 등록 시 차감되는 H-포인트

// 분야 분류 (Core Category) + 세부분야
export const CATEGORIES = [
  { key: "청소", label: "청소 전문", short: "청소", subs: ["입주/이사청소", "에어컨/세탁기 분해청소", "특수청소(쓰레기방/화재 등)", "기타 청소"] },
  { key: "설비", label: "설비/보수 전문", short: "설비", subs: ["누수탐지", "하수구/고압세척", "집수리", "기타 설비"] },
  { key: "시공", label: "시공/인테리어", short: "시공", subs: ["타일", "도배/장판", "필름", "줄눈/코킹", "기타 시공"] },
  { key: "창업", label: "기타 창업 노하우", short: "창업", subs: ["마케팅/영업 노하우", "기타 노하우"] },
];

export const METHODS = ["오프라인 실습", "이론+실습 병행", "온라인 VOD"];
export const SIDO_LIST = KR_AREAS.map((a) => a.sido);

export const STATUS_COLOR = {
  모집중: "#15803d",
  마감임박: "#b45309",
  모집마감: "#2b2f36",
  교육완료: "#2b2f36",
};

const pad = (n) => String(n).padStart(2, "0");
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const dayDiff = (from, to) => {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  return Math.round((b - a) / 86400000);
};

export const formatTs = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
};
export const dotDate = (s) => (s ? String(s).replace(/-/g, ".") : "");

// 예전 문서의 자유입력 field("타일", "누수" 등)를 새 분류로 추정
const guessCategory = (text = "") => {
  const t = String(text);
  if (/청소|에어컨|세탁기|입주|이사/.test(t)) return "청소";
  if (/누수|하수구|배관|설비|수리|보수|고압/.test(t)) return "설비";
  if (/타일|도배|장판|필름|줄눈|코킹|인테리어|시공/.test(t)) return "시공";
  if (/마케팅|영업|창업|노하우/.test(t)) return "창업";
  return "";
};

const onlyDigits = (s) => String(s || "").replace(/[^0-9]/g, "");

/** 새 문서·예전 문서를 같은 모양으로 맞춘다 (예전 문서도 깨지지 않게) */
export function normalizeTraining(raw) {
  const t = raw || {};
  const category = t.category || guessCategory(`${t.field || ""} ${t.title || ""}`);
  const cat = CATEGORIES.find((c) => c.key === category);
  const sub = t.subCategory || t.field || "";
  const subShort = sub ? String(sub).split(/[/(]/)[0].trim() : "";
  const tag = cat ? (subShort ? `${cat.short}/${subShort}` : cat.short) : subShort;

  const eduStart = t.eduDate || t.startDate || "";
  const eduEnd = t.eduEndDate || t.endDate || eduStart;
  const recruitEnd = t.recruitType === "기간" ? t.recruitEnd || "" : "";

  const nationwide = t.regionScope === "전국";
  const sido = nationwide ? "전국" : t.region?.sido || (t.location ? String(t.location).split(" ")[0] : "");
  const gu = !nationwide && t.region?.gu && t.region.gu !== "전체" ? t.region.gu : "";
  const regionLabel = nationwide ? "전국" : t.region ? [t.region.sido, gu].filter(Boolean).join(" ") : t.location || "";

  const phoneCandidate = t.contactPhone || (onlyDigits(t.contact).length >= 8 ? t.contact : "") || t.authorPhone || "";
  const phone = onlyDigits(phoneCandidate).length >= 8 ? String(phoneCandidate).replace(/[^0-9+]/g, "") : "";

  const priceRegular = t.priceRegular != null ? Number(t.priceRegular) : t.priceType === "유료" && t.price ? Number(t.price) : null;
  const priceEarly = t.priceEarly != null && t.priceEarly !== "" ? Number(t.priceEarly) : null;

  const method = t.method || (Array.isArray(t.methods) ? t.methods.join(" · ") : "");

  return {
    ...t,
    category,
    categoryLabel: cat?.label || "",
    subCategory: sub,
    tag,
    method,
    eduStart,
    eduEnd,
    eduTime: t.eduTime || t.startTime || "",
    recruitEnd,
    recruitType: t.recruitType || (recruitEnd ? "기간" : "상시"),
    sido,
    regionLabel,
    address: t.address || "",
    phone,
    priceRegular,
    priceEarly,
    curriculum: t.curriculum || t.description || "",
    benefits: t.benefits || "",
    photo: (Array.isArray(t.photos) && t.photos[0]) || t.thumbnail || "",
    photos: Array.isArray(t.photos) ? t.photos : t.thumbnail ? [t.thumbnail] : [],
    instructor: t.instructor || t.authorName || "",
    authorUid: t.createdBy || t.authorUid || "",
  };
}

/** 상태 자동 계산: 교육완료 > 모집마감(수동·기간 경과) > 마감임박(마감 3일 이내) > 모집중 */
export function computeStatus(n) {
  const today = todayStr();
  if (n.eduEnd && dayDiff(n.eduEnd, today) > 0) return "교육완료";
  if (n.status === "모집마감" || n.status === "마감") return "모집마감";
  if (n.recruitEnd) {
    const left = dayDiff(today, n.recruitEnd);
    if (left < 0) return "모집마감";
    if (left <= 3) return "마감임박";
  }
  return "모집중";
}

/** 모집 기간 표시: "상시 모집" / "D-3 (09.18 마감)" / "오늘 마감" */
export function recruitText(n) {
  if (!n.recruitEnd) return "상시 모집";
  const left = dayDiff(todayStr(), n.recruitEnd);
  const md = n.recruitEnd.slice(5).replace("-", ".");
  if (left < 0) return `${md} 모집 마감`;
  if (left === 0) return "오늘 마감";
  return `D-${left} (${md} 마감)`;
}

export function eduDateText(n) {
  if (!n.eduStart) return "일정 미정";
  const s = dotDate(n.eduStart);
  if (n.eduEnd && n.eduEnd !== n.eduStart) return `${s} ~ ${dotDate(n.eduEnd).slice(5)}`;
  return s;
}

export const won = (v) => `${Number(v || 0).toLocaleString()}원`;

/** 수강료: { main, regular } — regular 는 얼리버드가 있을 때 취소선으로 보여줄 정가 */
export function priceInfo(n) {
  if (n.priceType === "무료") return { main: "무료", regular: "" };
  if (n.priceType === "협의") return { main: "수강료 협의", regular: "" };
  if (n.priceRegular == null || isNaN(n.priceRegular)) return { main: n.price === 0 ? "무료" : "수강료 문의", regular: "" };
  if (n.priceRegular === 0) return { main: "무료", regular: "" };
  if (n.priceEarly != null && !isNaN(n.priceEarly) && n.priceEarly < n.priceRegular) {
    return { main: `얼리버드 ${won(n.priceEarly)}`, regular: won(n.priceRegular) };
  }
  return { main: won(n.priceRegular), regular: "" };
}

export function timeAgo(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "방금";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 전화 연결 — 수강생은 무료 */
export function callTrainer(n) {
  if (!n.phone) {
    window.alert("등록자가 전화번호를 남기지 않았습니다. 채팅으로 문의해 주세요.");
    return;
  }
  window.location.href = `tel:${n.phone}`;
}

/** 채팅 문의 — 수강생은 무료 */
export async function chatTrainer(n, userData, navigate) {
  const myUid = userData?.uid;
  if (!myUid) { window.alert("로그인이 필요합니다."); return; }
  if (!n.authorUid) { window.alert("등록자 정보가 없어 채팅할 수 없습니다. 전화로 문의해 주세요."); return; }
  if (n.authorUid === myUid) { window.alert("본인이 등록한 교육입니다."); return; }
  try {
    const roomId = await createChatRoom(
      myUid,
      userData?.nickname || userData?.name || "",
      userData?.profileImage || userData?.photoURL || "",
      n.authorUid,
      n.instructor || n.title || "교육 담당자",
      "",
      { trainingId: n.id, trainingTitle: n.title || "" }
    );
    navigate(`/chat/${roomId}`);
  } catch (e) {
    console.error("채팅 시작 실패:", e);
    window.alert("채팅방을 열지 못했습니다.");
  }
}
