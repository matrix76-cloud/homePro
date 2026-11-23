/* eslint-disable */
/**
 * 운영자 강제 숨김 · 삭제 (대표 리뷰 11/22 — 허위 오더 · 도배 · 타 플랫폼 유도 · 사기성 글 대응)
 *
 *  - 숨김이 기본값. 문서를 지우지 않고 adminHidden 표시만 남긴다.
 *      대상 문서: adminHidden(true/false) · adminHiddenAt · adminHiddenBy · adminHiddenById · adminHiddenReason
 *      남에게는 목록 · 검색 · 상세에서 안 보이고, 작성자 본인에게는 "운영자에 의해 숨김 처리되었습니다"로 보인다.
 *  - 삭제도 증빙을 남긴다. 지우기 전에 원본 전체를 처리 기록에 담고, 담는 데 실패하면 지우지 않는다.
 *  - 처리 기록: admin_moderation_logs
 *      { targetType, targetId, action(hide|unhide|delete), reason, memo, byAdmin{id,loginId,name}, at, snapshot(원본 전체) ... }
 *  - 작성자에게는 푸시(notifications 문서 → 서버 onNotificationSend)로 사실과 사유를 알린다.
 *
 * 커뮤니티 글은 신고 처리(AdminReportsPage)가 쓰던 hidden 표시가 이미 있다 — 두 표시를 같이 맞춰 둔다(mirrorHidden).
 */
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, where, serverTimestamp,
} from "firebase/firestore";
import { db } from "../api/config";
import { COLLECTIONS } from "../config/homeproConfig";

export const MOD_LOG_COL = "admin_moderation_logs";
export const ADMIN_HIDDEN_NOTICE = "운영자에 의해 숨김 처리되었습니다";

const regionShort = (addr) => String(addr || "").trim().split(/\s+/).slice(0, 2).join(" ");
const cut = (s, n = 140) => { const t = String(s || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n) : t; };

/** 숨김 · 삭제 대상 — 이 앱에 실제 있는 글 종류 */
export const MODERATION_TARGETS = [
  {
    key: "order", label: "오더", col: COLLECTIONS.ORDERS, authorField: "createdBy",
    title: (d) => d.title || [d.categoryName, d.subcategory].filter(Boolean).join(" ") || "(제목 없음)",
    kind: (d) => d.categoryName || "",
    body: (d) => d.description || "",
    extra: (d) => [regionShort(d.address || d.location), d.orderStatus, d.price].filter(Boolean).join(" · "),
    authorName: (d) => d.writer || "",
    appPath: (id) => `/order/detail/${id}`,
  },
  {
    key: "community", label: "커뮤니티 글", col: "community_posts", authorField: "authorUid", mirrorHidden: true,
    title: (d) => d.title || "(제목 없음)",
    kind: (d) => ({ free: "자유게시판", notice: "공지" }[d.type] || d.type || ""),
    body: (d) => d.content || "",
    extra: (d) => `댓글 ${d.commentCount || 0} · 조회 ${d.viewCount || 0}`,
    authorName: (d) => d.authorName || "",
    appPath: (id) => `/community/${id}`,
  },
  {
    key: "supplies", label: "거래장터", col: "homepro_supplies", authorField: "createdBy",
    title: (d) => d.title || d.name || "(제목 없음)",
    kind: (d) => ({ sale: "판매", buy: "구매요청", free: "무료나눔" }[d.tradeType] || (d.tradeType ? d.tradeType : "업체 소개")),
    body: (d) => d.description || "",
    extra: (d) => [d.location, d.price ? `${Number(d.price).toLocaleString()}원` : ""].filter(Boolean).join(" · "),
    authorName: (d) => d.writer || d.companyName || "",
    appPath: (id) => `/supplies/${id}`,
  },
  {
    key: "marketplace", label: "양도매매", col: "homepro_marketplace", authorField: "createdBy",
    title: (d) => d.title || "(제목 없음)",
    kind: (d) => d.tradeType || "",
    body: (d) => d.description || "",
    extra: (d) => [typeof d.region === "string" ? d.region : [d.region?.sido, d.region?.gu].filter(Boolean).join(" "), d.amount ? `${Number(d.amount).toLocaleString()}원` : ""].filter(Boolean).join(" · "),
    authorName: (d) => d.writer || d.companyName || "",
    appPath: (id) => `/marketplace/${id}`,
  },
  {
    key: "training", label: "기술전수", col: "homepro_trainings", authorField: "createdBy",
    title: (d) => d.title || "(제목 없음)",
    kind: (d) => d.category || d.field || "",
    body: (d) => d.description || "",
    extra: (d) => [d.location, d.period].filter(Boolean).join(" · "),
    authorName: (d) => d.instructor || d.writer || "",
    appPath: (id) => `/training/${id}`,
  },
  {
    key: "brokerage", label: "공동중개", col: "brokerage_posts", authorField: "authorUid",
    title: (d) => d.oneLine || d.title || "(제목 없음)",
    kind: (d) => (d.type === "demand" ? "손님찾기" : d.type === "listing" ? "매물등록" : d.type || ""),
    body: (d) => d.detail || "",
    extra: (d) => [d.region, d.dealType, d.price].filter(Boolean).join(" · "),
    authorName: (d) => d.authorCompany || d.authorRep || "",
    appPath: (id) => `/brokerage/${id}`,
  },
];

export const getModerationTarget = (key) => MODERATION_TARGETS.find((t) => t.key === key) || null;

/** 사유 보기 — 오더는 "허위 오더", 게시판 글은 "허위 글" */
export const moderationReasons = (targetKey) => [
  targetKey === "order" ? "허위 오더" : "허위 글",
  "도배",
  "타 플랫폼 유도",
  "사기 의심",
  "기타",
];

export const ACTION_LABEL = { hide: "숨김", unhide: "숨김 해제", delete: "삭제" };

/* ─── 앱 화면에서 쓰는 판정 ─── */

/** 운영자가 숨긴 글인가 (커뮤니티 글은 신고 가림 hidden 도 같은 취급 — 호출하는 쪽에서 함께 본다) */
export const isAdminHidden = (d) => !!d && d.adminHidden === true;

/** 남에게는 숨기고 작성자 본인 글만 남긴다 */
export const filterAdminHidden = (list, viewerUid, authorField = "createdBy") =>
  (list || []).filter((d) => !isAdminHidden(d) || (!!viewerUid && d?.[authorField] === viewerUid));

/** 이 사람이 이 글을 볼 수 있는가 — 숨긴 글은 작성자만 */
export const canViewAdminHidden = (d, viewerUid, authorField = "createdBy") =>
  !isAdminHidden(d) || (!!viewerUid && d?.[authorField] === viewerUid);

/* ─── 관리자 ─── */

/** 지금 로그인한 운영자 (AdminLoginPage 가 넣는 localStorage adminSession) */
export function getAdminIdentity() {
  try {
    const s = JSON.parse(localStorage.getItem("adminSession") || "null");
    if (s?.id) return { id: s.id, loginId: s.loginId || "", name: s.name || "관리자" };
  } catch (e) { /* ignore */ }
  return { id: "unknown", loginId: "", name: "관리자" };
}

/** 대상 글 전체 (최신순) — 관리자 목록용. 숨긴 글도 그대로 온다 */
export async function listModerationItems(targetKey) {
  const target = getModerationTarget(targetKey);
  if (!target) return [];
  let snap;
  try {
    snap = await getDocs(query(collection(db, target.col), orderBy("createdAt", "desc")));
  } catch (e) {
    snap = await getDocs(collection(db, target.col)); // createdAt 없는 문서가 섞여 정렬이 안 될 때
  }
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** 관리자 화면에서 '숨김'으로 볼 글 — 커뮤니티는 신고 가림(hidden)도 포함 */
export const isHiddenForAdmin = (targetKey, d) => {
  const target = getModerationTarget(targetKey);
  return isAdminHidden(d) || (!!target?.mirrorHidden && d?.hidden === true);
};

async function writeLog({ target, item, action, reason, memo, snapshot, extra = {} }) {
  const admin = getAdminIdentity();
  return addDoc(collection(db, MOD_LOG_COL), {
    targetType: target.key,
    targetLabel: target.label,
    targetCol: target.col,
    targetId: item.id,
    targetTitle: cut(target.title(item), 200),
    authorUid: item[target.authorField] || null,
    authorName: target.authorName(item) || "",
    action,
    reason: reason || "",
    memo: memo || "",
    byAdmin: admin,
    at: serverTimestamp(),
    snapshot: snapshot || null,
    ...extra,
  });
}

/** 다른 화면(신고 처리 등)에서 한 숨김도 같은 기록에 남길 때 */
export async function logModeration(targetKey, item, { action, reason = "", memo = "", snapshot = null, extra = {} }) {
  const target = getModerationTarget(targetKey);
  if (!target || !item?.id) return;
  try { await writeLog({ target, item, action, reason, memo, snapshot, extra }); } catch (e) { console.warn("처리 기록 저장 실패:", e.message); }
}

async function notifyAuthor(target, item, action, reason) {
  const uid = item[target.authorField];
  if (!uid) return;
  const name = cut(target.title(item), 40);
  const title = action === "hide" ? "운영자에 의해 글이 숨김 처리되었습니다"
    : action === "delete" ? "운영자에 의해 글이 삭제되었습니다"
    : "숨김 처리가 해제되었습니다";
  const body = action === "unhide"
    ? `[${target.label}] ${name} — 다시 다른 회원에게 보입니다.`
    : `[${target.label}] ${name}${reason ? ` — 사유: ${reason}` : ""}`;
  try {
    await addDoc(collection(db, "notifications"), {
      targetUids: [uid], title, body, type: "moderation",
      data: { targetType: target.key, targetId: item.id, action },
      read: false, sent: false, createdAt: serverTimestamp(),
    });
  } catch (e) { console.warn("작성자 알림 실패:", e.message); }
}

const loadOriginal = async (target, id) => {
  const snap = await getDoc(doc(db, target.col, id));
  return snap.exists() ? snap.data() : null;
};

/** 숨김 — 문서는 그대로 두고 표시만. 그때의 원본을 기록에 같이 담는다(숨긴 뒤 작성자가 내용을 고쳐도 증빙이 남게) */
export async function moderateHide(targetKey, item, { reason, memo = "" } = {}) {
  const target = getModerationTarget(targetKey);
  if (!target) throw new Error("알 수 없는 대상입니다");
  const original = await loadOriginal(target, item.id);
  if (!original) throw new Error("이미 삭제된 글입니다");
  const admin = getAdminIdentity();
  const patch = {
    adminHidden: true,
    adminHiddenAt: serverTimestamp(),
    adminHiddenBy: admin.name,
    adminHiddenById: `admin:${admin.id}`,
    adminHiddenReason: reason || "",
  };
  if (target.mirrorHidden) patch.hidden = true;
  await updateDoc(doc(db, target.col, item.id), patch);
  const full = { id: item.id, ...original };
  await writeLog({ target, item: full, action: "hide", reason, memo, snapshot: original });
  await notifyAuthor(target, full, "hide", reason);
  return { ...full, adminHidden: true, adminHiddenBy: admin.name, adminHiddenReason: reason || "", adminHiddenAt: new Date(), ...(target.mirrorHidden ? { hidden: true } : {}) };
}

/** 숨김 해제 */
export async function moderateUnhide(targetKey, item, { reason = "", memo = "" } = {}) {
  const target = getModerationTarget(targetKey);
  if (!target) throw new Error("알 수 없는 대상입니다");
  const original = await loadOriginal(target, item.id);
  if (!original) throw new Error("이미 삭제된 글입니다");
  const patch = { adminHidden: false, adminHiddenAt: null, adminHiddenBy: null, adminHiddenById: null, adminHiddenReason: null };
  if (target.mirrorHidden) patch.hidden = false;
  await updateDoc(doc(db, target.col, item.id), patch);
  const full = { id: item.id, ...original };
  await writeLog({ target, item: full, action: "unhide", reason, memo, snapshot: null });
  await notifyAuthor(target, full, "unhide", reason);
  return { ...full, ...patch };
}

/** 지워도 되는 오더인가 — 배정되어 진행 중이거나 H-포인트를 보관 중이면 막는다(돈 · 상대 홈프로가 걸려 있다) */
export function deleteBlockReason(targetKey, d) {
  if (targetKey !== "order" || !d) return "";
  if (d.hpointEscrow?.status === "held") return "H-포인트를 보관 중인 오더는 삭제할 수 없습니다. 숨김 처리하거나 먼저 취소해 주세요.";
  if (d.matchedProUid && d.orderStatus === "배정") return "배정되어 진행 중인 오더는 삭제할 수 없습니다. 숨김 처리하거나 먼저 취소해 주세요.";
  return "";
}

/** 삭제 — 원본 전체를 기록에 먼저 담고, 담기면 지운다. 댓글 · 지원자 같은 하위 기록은 지우지 않고 남는다 */
export async function moderateDelete(targetKey, item, { reason, memo = "" } = {}) {
  const target = getModerationTarget(targetKey);
  if (!target) throw new Error("알 수 없는 대상입니다");
  const original = await loadOriginal(target, item.id);
  if (!original) throw new Error("이미 삭제된 글입니다");
  const blocked = deleteBlockReason(targetKey, original);
  if (blocked) throw new Error(blocked);
  const full = { id: item.id, ...original };
  let logRef;
  try {
    logRef = await writeLog({ target, item: full, action: "delete", reason, memo, snapshot: original });
  } catch (e) {
    throw new Error("증빙(원본) 저장에 실패해 삭제하지 않았습니다. 다시 시도해 주세요.");
  }
  try {
    await deleteDoc(doc(db, target.col, item.id));
  } catch (e) {
    await updateDoc(logRef, { failed: true, failReason: e.message || "" }).catch(() => {});
    throw new Error("삭제에 실패했습니다. 다시 시도해 주세요.");
  }
  await notifyAuthor(target, full, "delete", reason);
  return true;
}

const toMs = (ts) => (ts?.toMillis ? ts.toMillis() : ts?.seconds ? ts.seconds * 1000 : ts ? new Date(ts).getTime() || 0 : 0);

/** 처리 기록 — 전체(최신순) 또는 글 하나의 기록 */
export async function getModerationLogs({ targetType, targetId } = {}) {
  let snap;
  if (targetId) {
    // 색인 없이 돌도록 targetId 하나로만 거르고 나머지는 여기서 맞춘다
    snap = await getDocs(query(collection(db, MOD_LOG_COL), where("targetId", "==", targetId)));
  } else {
    snap = await getDocs(query(collection(db, MOD_LOG_COL), orderBy("at", "desc")));
  }
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((l) => !targetType || l.targetType === targetType)
    .sort((a, b) => toMs(b.at) - toMs(a.at));
}
