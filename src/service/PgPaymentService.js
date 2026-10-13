/**
 * 사업자용 PG결제 — 결제링크로 고객에게 직접 결제받기 (대표 리뷰 9/17)
 *
 * 상태머신 (pg_payment_requests.status)
 *   requested   결제 요청 생성      사업자가 금액·고객을 입력해 만든 직후
 *   link_issued 링크 발급          고객에게 보낼 결제링크가 만들어짐
 *   paying      고객 결제          고객이 링크에서 결제를 진행함 (PG 승인 대기)
 *   paid        결제완료           PG Webhook 으로 승인이 확인됨 — 서버만 바꾼다
 *   canceled    취소               결제 전 사업자가 요청을 취소
 * 정산상태 (settleStatus) — paid 이후에만 의미가 있다. 정산은 PG사가 사업자 계좌로 직접 한다.
 *   pending → settled
 *
 * paying 이후 전이(paid·정산)는 PG Webhook 을 받는 서버 함수가 맡는다. 제휴 PG 계약 전이라 아직 없음.
 */
import {
  collection, addDoc, doc, getDoc, getDocs, query, where, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../api/config";

export const PG_COL = "pg_payment_requests";

export const PG_STEPS = [
  { key: "requested", label: "결제 요청 생성" },
  { key: "link_issued", label: "링크 발급" },
  { key: "paying", label: "고객 결제" },
  { key: "webhook", label: "PG 승인 확인" },
  { key: "paid", label: "결제완료" },
  { key: "settle", label: "정산" },
];

export const PG_STATUS_LABEL = {
  requested: "요청 생성",
  link_issued: "링크 발급됨",
  paying: "고객 결제 중",
  paid: "결제완료",
  canceled: "취소",
};

export const PG_SETTLE_LABEL = { pending: "정산 대기", settled: "정산 완료" };

export const PG_KIND = {
  work: { label: "작업대금", desc: "홈프로 오더 또는 외부 일반 고객의 작업대금" },
  referral: { label: "소개수수료 청구", desc: "홈프로에서 오더를 공유해 생긴 소개수수료" },
};

/** 진행 단계 인덱스 (PG_STEPS 기준, 이 인덱스까지 끝난 것) */
export function stepIndex(r) {
  if (!r) return -1;
  if (r.status === "paid") return r.settleStatus === "settled" ? 5 : 4;
  if (r.status === "paying") return 2;
  if (r.status === "link_issued") return 1;
  return 0;
}

export const pgLinkUrl = (id) => `${window.location.origin}/pg/${id}`;

export async function createPgRequest(uid, { kind, amount, customerName, customerPhone, memo, orderId, orderTitle, sellerName, account = null }) {
  const ref = await addDoc(collection(db, PG_COL), {
    uid,
    sellerName: sellerName || "",
    kind,
    amount: Number(amount),
    customerName: customerName.trim(),
    customerPhone: customerPhone.replace(/[^0-9]/g, ""),
    memo: (memo || "").trim(),
    orderId: orderId || null,
    // 돈의 길은 오더 시공대금 링크와 같다 — PG → 홈프로 정산계좌 → 분배 (형 확정 2026-10-13)
    settleRoute: "platform",
    distribution: { status: "pending", toUid: uid, account: account || null },
    orderTitle: orderTitle || null,
    status: "requested",
    settleStatus: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function issuePgLink(id) {
  await updateDoc(doc(db, PG_COL, id), {
    status: "link_issued",
    linkUrl: pgLinkUrl(id),
    linkIssuedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function cancelPgRequest(id) {
  await updateDoc(doc(db, PG_COL, id), { status: "canceled", canceledAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function listMyPgRequests(uid) {
  const snap = await getDocs(query(collection(db, PG_COL), where("uid", "==", uid)));
  const ms = (v) => (v?.toMillis ? v.toMillis() : 0);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
}

export async function getPgRequest(id) {
  const s = await getDoc(doc(db, PG_COL, id));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

/* ───────── 오더 시공대금 결제 링크 (형 확정 2026-10-07) ─────────
 * 홈프로가 작업을 끝낸 뒤 그 오더의 결제 링크를 만들어 [공유하기]로 접수자(또는 고객)에게 보낸다.
 * 예전의 접수자 [대금 지급 완료] → 홈프로 [입금 확인] 두 버튼을 대체한다.
 * 돈의 길 (형 2026-10-07): PG → 홈프로(플랫폼) 정산계좌 → 나중에 API 로 시공 홈프로에게 분배.
 *   분배 API 는 아직 없다. 문서에 settleRoute:"platform" 과 distribution { status:"pending", toUid, account } 를 남겨
 *   분배 기능이 붙을 때 이 값으로 대상을 찾는다. 분배받을 계좌가 필요해 정산계좌(users.account)가 있어야 만들 수 있다.
 *   (사업자도구 PG결제에서 직접 만든 요청도 같은 길 — 형 확정 2026-10-13. 그 전에 만든 요청에는 settleRoute 가 없다)
 * 오더 문서에는 payLink { requestId, amount, url } 만 남기고, 결제 상태는 pg_payment_requests 문서가 진실이다. */
export async function createOrderPayLink(order, { uid, sellerName, amount, account }) {
  const amt = Number(amount);
  if (!order?.id) throw new Error("오더를 찾을 수 없습니다");
  if (!(amt > 0)) throw new Error("결제 금액을 입력해 주세요");
  if (!account?.number) throw new Error("정산계좌를 먼저 등록해 주세요");
  if (order.payLink?.requestId) throw new Error("이미 만든 결제 링크가 있습니다");
  const id = await createPgRequest(uid, {
    kind: "work",
    amount: amt,
    customerName: order.writer || "접수자",
    customerPhone: String(order.customerPhone || order.contactPhone || ""),
    memo: order.title || "",
    orderId: order.id,
    orderTitle: order.title || null,
    sellerName,
  });
  // 플랫폼 정산 → 분배 대기. 분배받을 계좌는 만든 시점의 정산계좌를 적어 둔다
  await updateDoc(doc(db, PG_COL, id), {
    settleRoute: "platform",
    distribution: {
      status: "pending",
      toUid: uid,
      account: { bank: account.bank || "", number: account.number || "", holder: account.holder || "" },
    },
    payerUid: order.createdBy || null,
  });
  await issuePgLink(id);
  await updateDoc(doc(db, "homepro_orders", order.id), {
    payLink: { requestId: id, amount: amt, url: pgLinkUrl(id), createdBy: uid, createdAt: serverTimestamp() },
    updatedAt: serverTimestamp(),
  });
  if (order.createdBy) {
    await addDoc(collection(db, "notifications"), {
      targetUids: [order.createdBy],
      title: "시공대금 결제 요청",
      body: `${sellerName || "홈프로"}님이 ${amt.toLocaleString()}원 결제를 요청했습니다.`,
      type: "paylink_issued",
      data: { orderId: order.id },
      read: false, sent: false,
      createdAt: serverTimestamp(),
    }).catch(() => {});
  }
  return id;
}

/** 결제 전 링크 취소 — 금액을 잘못 넣었을 때 다시 만들 수 있게 오더의 payLink 도 비운다 */
export async function cancelOrderPayLink(order) {
  const id = order?.payLink?.requestId;
  if (!id) return;
  const r = await getPgRequest(id);
  if (r && (r.status === "paid" || r.status === "paying")) throw new Error("결제가 진행된 링크는 취소할 수 없습니다");
  await cancelPgRequest(id);
  await updateDoc(doc(db, "homepro_orders", order.id), { payLink: null, updatedAt: serverTimestamp() });
}

/** 링크 공유 — 폰의 공유 창(카카오톡·문자 등). 공유 창이 없는 환경이면 주소를 복사한다. 반환 "shared" | "copied" | "canceled" */
/** 보낼 글(주소 제외) */
const payLinkText = ({ amount, title, sellerName }) => `[홈프로] ${sellerName || "홈프로"}님의 시공대금 결제 요청\n${title ? `${title}\n` : ""}결제 금액 ${Number(amount).toLocaleString()}원`;
/** 보낼 글 전체(안내 + 주소) — 화면의 글 상자에 그대로 보여 주고, 복사·공유도 이 글로 한다 (형 지시 2026-10-13) */
export const payLinkMessage = (p) => `${payLinkText(p)}\n${p.url}`;

export async function sharePayLink({ url, amount, title, sellerName, copyOnly = false }) {
  const text = payLinkText({ amount, title, sellerName });
  // PC 에서는 맥·윈도우 공유 창(AirDrop·Mail…)이 떠서 쓸모가 없다 → 복사만 (형 지적 10/13)
  if (!copyOnly && navigator.share) {
    try { await navigator.share({ title: "홈프로 결제 요청", text, url }); return "shared"; }
    catch (e) { if (e?.name === "AbortError") return "canceled"; }
  }
  try { await navigator.clipboard.writeText(`${text}\n${url}`); }
  catch (e) {
    const ta = document.createElement("textarea");
    ta.value = `${text}\n${url}`; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } finally { document.body.removeChild(ta); }
  }
  return "copied";
}

/** 소개수수료 청구에 연결할 내 오더 — 내가 접수했거나 배정받은 오더 */
export async function listMyOrdersForPg(uid) {
  const col = collection(db, "homepro_orders");
  const [a, b] = await Promise.all([
    getDocs(query(col, where("createdBy", "==", uid))),
    getDocs(query(col, where("matchedProUid", "==", uid))),
  ]);
  const map = new Map();
  [...a.docs, ...b.docs].forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
  const ms = (v) => (v?.toMillis ? v.toMillis() : 0);
  return [...map.values()].sort((x, y) => ms(y.createdAt) - ms(x.createdAt)).slice(0, 50);
}
