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
  collection, addDoc, doc, getDoc, getDocs, setDoc, query, where, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../api/config";
import { REFERRAL_PG_FEE_RATE, referralPgSettle } from "../config/referralReceive";

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

/** 오더의 작업 날짜를 실제 날짜로 — '오늘·긴급·내일'은 접수일 기준으로 바꾸고, 날짜가 없는 선택지(협의 등)는 그 말 그대로 */
export function workDateOf(order) {
  const f = (d) => `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  if (order?.workDatePicker) return order.workDatePicker.replace(/-/g, ".").replace(/\.0/g, ".");
  const wd = order?.workDate || order?.schedule;
  if (!wd) return null;
  const base = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
  if (wd === "오늘" || wd === "긴급") return f(base);
  if (wd === "내일") { const d = new Date(base); d.setDate(d.getDate() + 1); return f(d); }
  return wd;
}

/** 결제 한 건 최대 금액 — PG 심사 요청 (형 지시 2026-10-15). 서버 functions/payLink.js 도 같은 값으로 막는다 */
export const PG_MAX_AMOUNT = 3000000;
export const PG_MAX_MSG = "결제 금액은 최대 3,000,000원까지 가능합니다";

export const pgLinkUrl = (id) => `${window.location.origin}/pg/${id}`;

export async function createPgRequest(uid, { kind, amount, customerName, customerPhone, memo, orderId, orderTitle, sellerName, account = null }) {
  if (Number(amount) > PG_MAX_AMOUNT) throw new Error(PG_MAX_MSG);
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

/* ───────── 오더 소개수수료 카드 결제 (대표 리뷰 2026-11-27 '소개수수료 수령 수단') ─────────
 * 접수자가 'PG안전결제 받기'(pg) 또는 '상관없음'(any)으로 접수한 오더에서, 배정된 홈프로(수락자)가 소개수수료를 카드로 낸다.
 *   오더 상세 [카드로 결제하기] → 여기서 결제 요청 문서를 만들고 → 결제 화면(/pg/:id)에서 토스 카드 결제창.
 *   결제가 승인되면 서버(functions/payLink.js payLinkConfirm)가 요청을 paid 로 바꾸고, 오더의 referralPay 를
 *   { status:"confirmed", method:"pg" } 로 바꾼다 — 접수자가 따로 [입금 확인]을 누르지 않는다.
 * 돈의 길: PG → 홈프로(플랫폼) 정산계좌 → 결제수수료 3.5%(VAT 포함)를 뺀 금액을 접수자 정산계좌로 정산.
 *   정산 API 는 아직 없다. 문서에 settleRoute:"platform" · feeAmount · settleAmount · distribution { status:"pending", toUid, account } 를 남겨
 *   정산할 대상 · 금액 · 계좌를 이 값으로 찾는다.
 * 문서에서 uid 는 '받는 사람'(접수자), payerUid 는 '내는 사람'(수락자). referralOrder:true 가 서버의 자동 입금 확인 표시다.
 * 오더 문서에는 referralPg { requestId, amount } 를 남겨, 아직 안 낸 요청이 있으면 새로 만들지 않고 그것으로 다시 연다.
 *
 * (오더 시공대금 결제 링크 — createOrderPayLink 등 — 는 대표 리뷰 11/27 "시공대금 PG기능 삭제"로 걷어냈다.
 *  예전 오더 문서의 payLink 필드와 그때 만든 결제 요청 문서는 그대로 남아 있다.) */
export async function createReferralPayRequest(order, { payerUid, payerName, amount, receiverAccount = null }) {
  const amt = Math.round(Number(amount));
  if (!order?.id) throw new Error("오더를 찾을 수 없습니다");
  if (!payerUid) throw new Error("로그인 정보를 확인해 주세요");
  if (!(amt > 0)) throw new Error("소개수수료 금액이 아직 정해지지 않았습니다");
  if (amt > PG_MAX_AMOUNT) throw new Error(PG_MAX_MSG);

  // 화면이 열려 있는 사이 입금 확인 · 결제가 끝났을 수 있어 오더를 다시 읽는다
  const orderRef = doc(db, "homepro_orders", order.id);
  const snap = await getDoc(orderRef);
  const cur = snap.exists() ? snap.data() : order;
  if (cur.orderStatus === "취소" || cur.orderStatus === "거부") throw new Error("취소된 오더입니다");
  if (cur.matchedProUid && cur.matchedProUid !== payerUid) throw new Error("배정된 홈프로만 결제할 수 있습니다");
  if (cur.referralPay?.status === "confirmed") throw new Error("이미 입금 확인이 끝난 소개수수료입니다");
  if (cur.referralPay?.status === "sent") throw new Error("이미 입금 완료로 표시한 소개수수료입니다. 접수자 확인을 기다려 주세요");

  // 아직 안 낸 요청이 있으면 그것으로 다시 연다. 금액이 달라졌으면 옛 요청은 취소하고 새로 만든다
  const prevId = cur.referralPg?.requestId;
  if (prevId) {
    const prev = await getPgRequest(prevId).catch(() => null);
    if (prev) {
      if (prev.status === "paid") throw new Error("이미 결제가 끝난 소개수수료입니다");
      const open = prev.status === "link_issued" || prev.status === "paying";
      if (open && Number(prev.amount) === amt && prev.payerUid === payerUid) return prevId;
      if (open) await cancelPgRequest(prevId).catch(() => {});
    }
  }

  const { fee, settle } = referralPgSettle(amt);
  const ref = doc(collection(db, PG_COL));
  await setDoc(ref, {
    uid: cur.createdBy || order.createdBy || null,          // 받는 사람 = 접수자
    sellerName: cur.writer || order.writer || "접수자",
    kind: "referral",
    amount: amt,
    customerName: String(payerName || "홈프로").trim(),      // 내는 사람 = 수락자
    customerPhone: "",
    memo: `소개수수료 · ${cur.title || order.title || ""}`.trim(),
    orderId: order.id,
    orderTitle: cur.title || order.title || null,
    payerUid,
    referralOrder: true,
    settleRoute: "platform",
    feeRate: REFERRAL_PG_FEE_RATE,
    feeAmount: fee,
    settleAmount: settle,
    distribution: {
      status: "pending",
      toUid: cur.createdBy || order.createdBy || null,
      account: receiverAccount?.number
        ? { bank: receiverAccount.bank || "", number: receiverAccount.number || "", holder: receiverAccount.holder || "" }
        : null,
    },
    workDate: workDateOf({ ...order, ...cur }),
    status: "link_issued",
    linkUrl: pgLinkUrl(ref.id),
    linkIssuedAt: serverTimestamp(),
    settleStatus: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await updateDoc(orderRef, {
    referralPg: { requestId: ref.id, amount: amt, createdAt: serverTimestamp() },
    updatedAt: serverTimestamp(),
  });
  return ref.id;
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
