/* eslint-disable */
/**
 * 돈·H-포인트가 오가는 세 흐름 (대표 확정 2026-09-13)
 *
 *  원칙: 플랫폼은 돈을 만지지 않는다. 선결제·돈 에스크로·분할정산·가상계좌 없음.
 *  앱은 "누가 누구에게 얼마를 보낼 차례인지"를 보여 주고 [입금 완료] → [입금 확인] 상태만 넘긴다.
 *
 *  ① 캐시백 — 홈프로 → 접수자. 매칭되면 홈프로 화면에 접수자 계좌·금액이 뜨고
 *     홈프로가 토스 딥링크/계좌복사로 직접 송금 → [입금 완료(송금증)] → 접수자 푸시 → [입금 확인].
 *     확인 전에는 체크인을 못 한다. 현장견적은 금액이 확정되는 순간(onsiteQuotedPrice) 캐시백이 계산된다.
 *     오더 문서: referralPay { status: "sent"|"confirmed", amount, sentAt, sentBy, receiptUrl, confirmedAt }
 *
 *  ② 후불 작업 대금 — 완료 후 접수자(원청) → 홈프로. 접수자 [지급 완료] → 홈프로 [입금 확인]. 기록만.
 *     오더 문서: workPay { status: "sent"|"confirmed", sentAt, confirmedAt }
 *
 *  ③ H-포인트 오더 에스크로 — 단가유형 hpoint. 접수 때 접수자 잔액 < 대금이면 접수 불가.
 *     배정 순간 접수자 H-포인트에서 대금만큼 차감해 보관 → 완료 때 홈프로에게 (대금 - 캐시백), 접수자에게 캐시백 환급
 *     → 배정 뒤 취소면 접수자에게 전액 되돌림. 돈이 아니라 앱 안의 포인트라 가능하다.
 *     오더 문서: hpointEscrow { amount, referral, status: "held"|"released"|"refunded", heldAt, releasedAt, refundedAt }
 *     원장(homepro_cash): category escrow_hold / escrow_release / escrow_refund
 */
import {
  doc, getDoc, updateDoc, addDoc, collection, increment, serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../api/config";
import { COLLECTIONS } from "../config/homeproConfig";
import { deductPoints } from "./PointService";
import { compressEvidencePhoto } from "./WorkLogService";
import { isInRnWebView, postToRN } from "../bridge/webviewBridge";

const CASH_COL = "homepro_cash";
const USERS_COL = "users";

/* ───────────────────────── 공통 ───────────────────────── */

async function notify(targetUid, title, body, type, data = {}) {
  if (!targetUid) return;
  await addDoc(collection(db, "notifications"), {
    targetUids: [targetUid],
    title, body, type,
    data,
    read: false, sent: false,
    createdAt: serverTimestamp(),
  });
}

/** 접수자(또는 아무 회원)의 정산계좌 — users.account { bank, number, holder } */
export async function getUserAccount(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, USERS_COL, uid));
  const acc = snap.exists() ? snap.data().account : null;
  return acc && acc.number ? acc : null;
}

/** 회원 H-포인트 잔액 (users.referralPoints) */
export async function getPointBalance(uid) {
  if (!uid) return 0;
  const snap = await getDoc(doc(db, USERS_COL, uid));
  return snap.exists() ? Number(snap.data().referralPoints || 0) : 0;
}

/* ───────────────────────── ① 캐시백 (돈) ───────────────────────── */

/** 이 오더의 "돈으로 주는 대금"(캐시백 계산 기준) — 아직 정해지지 않았으면 null */
export function getMoneyPriceAmount(order) {
  if (!order) return null;
  const t = order.b2bPriceType;
  if (t === "fixed" || t === "balance") return Number(order.b2bPriceAmount) || null;
  if (t === "onsite" || t === "estimate" || t === "quote") {
    if (order.onsiteQuotedPrice) return Number(order.onsiteQuotedPrice) || null;
    const q = order.applicantQuotes && order.matchedProUid ? order.applicantQuotes[order.matchedProUid] : null;
    return q ? Number(q) || null : null;
  }
  return null; // hpoint / info 는 돈이 아니다
}

/**
 * 돈으로 주는 캐시백 금액. 반환 { amount, pending }
 *  - amount: 원 (0이면 캐시백 없음)
 *  - pending: 정률인데 대금이 아직 확정되지 않아 계산할 수 없음(현장견적 통보 전)
 */
export function getReferralFeeAmount(order) {
  const fee = order?.referralFee;
  if (!fee || fee.type === "none" || fee.type === "hpoint") return { amount: 0, pending: false };
  if (order.b2bPriceType === "balance" || order.b2bPriceType === "info" || order.b2bPriceType === "hpoint") return { amount: 0, pending: false };
  if (fee.type === "fixed") return { amount: Number(fee.amount) || 0, pending: false };
  if (fee.type === "rate") {
    const base = getMoneyPriceAmount(order);
    if (!base) return { amount: 0, pending: true };
    return { amount: Math.round(base * Number(fee.rate) / 100), pending: false };
  }
  return { amount: 0, pending: false };
}

/** 캐시백 송금이 아직 끝나지 않았나 (홈프로가 보내고 접수자가 확인해야 끝) */
export function isReferralPayOpen(order) {
  if (!order || !order.matchedProUid) return false;
  if (order.orderStatus === "취소" || order.orderStatus === "거부") return false;
  const { amount, pending } = getReferralFeeAmount(order);
  if (pending) return true; // 금액 확정 전 — 버튼은 아직 없지만 "열려 있는" 상태
  if (amount <= 0) return false;
  return order.referralPay?.status !== "confirmed";
}

/** 체크인을 막아야 하나 — 캐시백이 있는데 접수자 확인이 아직 안 됐으면 */
export function isCheckInBlockedByReferral(order) {
  const { amount, pending } = getReferralFeeAmount(order);
  if (pending) return true;
  if (amount <= 0) return false;
  return order.referralPay?.status !== "confirmed";
}

/** 토스 송금 딥링크 — 토스가 QR 송금에 쓰는 공개 형식. 계약·심사 불필요. */
export function buildTossSendUrl({ bank, number, amount }) {
  const p = new URLSearchParams();
  if (bank) p.set("bank", String(bank).replace(/은행$/, "").trim());
  if (number) p.set("accountNo", String(number).replace(/[^0-9]/g, ""));
  if (amount) p.set("amount", String(Math.round(Number(amount))));
  p.set("origin", "homepro");
  return `supertoss://send?${p.toString()}`;
}

/** 외부 앱 열기 — RN 웹뷰면 네이티브에 맡기고(커스텀 스킴은 웹뷰가 막는다), 아니면 바로 이동 */
export function openExternal(url) {
  if (isInRnWebView()) {
    postToRN("OPEN_URL", { url });
    return;
  }
  window.location.href = url;
}

/** 홈프로 [입금 완료] — 송금증 사진 업로드 + 상태 sent + 접수자 푸시 */
export async function markReferralSent(order, { byUid, byName, receiptFile }) {
  const { amount } = getReferralFeeAmount(order);
  let receiptUrl = null;
  if (receiptFile) {
    const blob = await compressEvidencePhoto(receiptFile, 1400, 0.85);
    const path = `homepro/receipts/${order.id}/referral_${Date.now()}.jpg`;
    const r = ref(storage, path);
    await uploadBytes(r, blob, { contentType: "image/jpeg" });
    receiptUrl = await getDownloadURL(r);
  }
  await updateDoc(doc(db, COLLECTIONS.ORDERS, order.id), {
    referralPay: { status: "sent", amount, sentAt: serverTimestamp(), sentBy: byUid, receiptUrl },
    updatedAt: serverTimestamp(),
  });
  await notify(order.createdBy, "캐시백 입금 확인 요청",
    `${byName || "홈프로"}님이 캐시백 ${amount.toLocaleString()}원을 송금했습니다. 입금을 확인해 주세요.`,
    "referral_sent", { orderId: order.id });
}

/** 접수자 [입금 확인] — 상태 confirmed + 홈프로 푸시 */
export async function confirmReferralReceived(order, { byUid }) {
  await updateDoc(doc(db, COLLECTIONS.ORDERS, order.id), {
    "referralPay.status": "confirmed",
    "referralPay.confirmedAt": serverTimestamp(),
    "referralPay.confirmedBy": byUid,
    updatedAt: serverTimestamp(),
  });
  await notify(order.matchedProUid, "캐시백 입금 확인 완료",
    "접수자가 캐시백 입금을 확인했습니다. 현장 체크인을 진행할 수 있습니다.",
    "referral_confirmed", { orderId: order.id });
}

/* ───────────────────────── ② 후불 작업 대금 ───────────────────────── */

/** 후불 대금 버튼을 둘 오더인가 — 돈 오더이고 완료된 뒤 */
export function isWorkPayApplicable(order) {
  if (!order) return false;
  if (order.orderStatus !== "완료" && order.orderStatus !== "리뷰" && order.orderStatus !== "정산") return false;
  const t = order.b2bPriceType;
  return t !== "hpoint" && t !== "info";
}

/** 접수자 [대금 지급 완료] */
export async function markWorkPaySent(order, { byUid }) {
  await updateDoc(doc(db, COLLECTIONS.ORDERS, order.id), {
    workPay: { status: "sent", sentAt: serverTimestamp(), sentBy: byUid },
    updatedAt: serverTimestamp(),
  });
  await notify(order.matchedProUid, "작업 대금 입금 확인 요청",
    "접수자가 작업 대금을 지급했다고 표시했습니다. 입금을 확인해 주세요.",
    "workpay_sent", { orderId: order.id });
}

/** 홈프로 [입금 확인] */
export async function confirmWorkPayReceived(order, { byUid }) {
  await updateDoc(doc(db, COLLECTIONS.ORDERS, order.id), {
    "workPay.status": "confirmed",
    "workPay.confirmedAt": serverTimestamp(),
    "workPay.confirmedBy": byUid,
    updatedAt: serverTimestamp(),
  });
  await notify(order.createdBy, "작업 대금 입금 확인 완료",
    "홈프로가 작업 대금 입금을 확인했습니다.",
    "workpay_confirmed", { orderId: order.id });
}

/* ───────────────────────── ③ H-포인트 에스크로 ───────────────────────── */

/** 원장 입금 — 보상(earn)과 구분해 등급 계산(totalEarnedPoints)에는 넣지 않는다 */
async function creditPoints(uid, amount, reason, category, relatedDocId) {
  if (!uid || amount <= 0) return null;
  const cashDoc = await addDoc(collection(db, CASH_COL), {
    uid, type: "transfer_in", amount, reason, category, relatedDocId, createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, USERS_COL, uid), { referralPoints: increment(amount) });
  return cashDoc.id;
}

export function isHpointOrder(order) {
  return order?.b2bPriceType === "hpoint";
}

/** 접수 때 — 접수자 잔액이 대금보다 적으면 접수 불가 */
export async function assertHpointBalanceForCreate(uid, amount) {
  const bal = await getPointBalance(uid);
  if (bal < amount) {
    const err = new Error(`H-포인트가 부족합니다. 보유 ${bal.toLocaleString()}P · 필요 ${Number(amount).toLocaleString()}P`);
    err.code = "hpoint/insufficient";
    throw err;
  }
  return bal;
}

/** 배정 순간 — 접수자 H-포인트에서 대금만큼 차감해 보관. 부족하면 throw (배정 자체를 막는다) */
export async function holdHpointEscrow(orderId, orderData) {
  if (orderData.hpointEscrow?.status === "held") return; // 이미 보관 중
  const amount = Number(orderData.b2bPriceAmount) || 0;
  const referral = orderData.referralFee?.type === "hpoint" ? Number(orderData.referralFee.point) || 0 : 0;
  if (amount <= 0) return;
  await deductPoints(orderData.createdBy, orderData.writer || "", amount, `H-포인트 오더 보관 (${orderData.title || orderId})`, {
    relatedDocId: orderId, txType: "escrow_hold",
  });
  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
    hpointEscrow: { amount, referral, status: "held", heldAt: serverTimestamp() },
  });
}

/** 완료 때 — 홈프로에게 (대금 - 캐시백), 접수자에게 캐시백 환급 */
export async function releaseHpointEscrow(orderId) {
  const snap = await getDoc(doc(db, COLLECTIONS.ORDERS, orderId));
  if (!snap.exists()) return;
  const o = snap.data();
  const e = o.hpointEscrow;
  if (!e || e.status !== "held") return;
  const referral = Math.min(Number(e.referral) || 0, Number(e.amount) || 0);
  const toPro = (Number(e.amount) || 0) - referral;
  await creditPoints(o.matchedProUid, toPro, `H-포인트 오더 대금 (${o.title || orderId})`, "escrow_release", orderId);
  if (referral > 0) await creditPoints(o.createdBy, referral, `H-포인트 오더 캐시백 (${o.title || orderId})`, "escrow_release", orderId);
  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
    "hpointEscrow.status": "released",
    "hpointEscrow.releasedAt": serverTimestamp(),
    "hpointEscrow.toPro": toPro,
  });
  await notify(o.matchedProUid, "H-포인트 대금 지급", `작업 대금 ${toPro.toLocaleString()}P가 H-포인트로 들어왔습니다.`, "escrow_release", { orderId });
  if (referral > 0) await notify(o.createdBy, "H-포인트 캐시백 지급", `캐시백 ${referral.toLocaleString()}P가 H-포인트로 들어왔습니다.`, "escrow_release", { orderId });
}

/** 배정 뒤 취소 — 보관분을 접수자에게 전액 되돌림 */
export async function refundHpointEscrow(orderId) {
  const snap = await getDoc(doc(db, COLLECTIONS.ORDERS, orderId));
  if (!snap.exists()) return;
  const o = snap.data();
  const e = o.hpointEscrow;
  if (!e || e.status !== "held") return;
  await creditPoints(o.createdBy, Number(e.amount) || 0, `H-포인트 오더 취소 환급 (${o.title || orderId})`, "escrow_refund", orderId);
  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
    "hpointEscrow.status": "refunded",
    "hpointEscrow.refundedAt": serverTimestamp(),
  });
  await notify(o.createdBy, "H-포인트 환급", `취소된 오더의 보관 H-포인트 ${Number(e.amount).toLocaleString()}P를 돌려드렸습니다.`, "escrow_refund", { orderId });
}
