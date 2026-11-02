/**
 * 오더 상세 30초 독점 수락권 (대표 리뷰 10/31)
 *
 *  - 빠른배정 · 지정배정 · 방식 없음: 상세에 먼저 들어온 홈프로 한 명이 30초 동안 수락권을 갖는다.
 *      orders.viewLock = { uid, name, at: serverTimestamp() }
 *  - 비교선정: 동시에 상세를 볼 수 있는 홈프로는 최대 3명.
 *      orders.viewLocks = { [uid]: { name, at } }
 *  - 유효 = Date.now() - at.toMillis() < 30초. 남은 초는 클라이언트 시각 기준(1초 단위라 충분).
 *  - 오더목록의 "배정중" 표시도 이 두 필드를 읽는다 — 스키마를 바꾸지 말 것.
 */
import { doc, runTransaction, updateDoc, onSnapshot, serverTimestamp, deleteField } from "firebase/firestore";
import { db } from "../api/config";
import { COLLECTIONS } from "../config/homeproConfig";

export const LOCK_MS = 30000;
export const COMPARE_MAX = 3;

const OPEN_STATUSES = new Set(["접수", "요청", "", undefined, null]);

const atMs = (at) => {
  if (!at) return 0;
  if (typeof at.toMillis === "function") return at.toMillis();
  if (at instanceof Date) return at.getTime();
  if (typeof at === "number") return at;
  if (typeof at.seconds === "number") return at.seconds * 1000;
  return 0;
};

/** at 이 아직 서버에서 안 채워진 순간(쓰기 직후 로컬 스냅샷)엔 null → 지금 막 잡은 것으로 본다 */
const lockStartMs = (lock, now) => (lock && lock.at === null ? now : atMs(lock?.at));

/** 잠금이 살아 있나 */
export function isLockValid(lock, now = Date.now()) {
  if (!lock) return false;
  const start = lockStartMs(lock, now);
  if (!start) return false;
  return now - start < LOCK_MS;
}

/** 남은 초 (0~30) */
export function lockRemainSec(lock, now = Date.now()) {
  if (!lock) return 0;
  const start = lockStartMs(lock, now);
  if (!start) return 0;
  return Math.max(0, Math.ceil((LOCK_MS - (now - start)) / 1000));
}

/** 비교선정 — 유효한 항목만 { uid: {name, at} } */
export function validCompareLocks(locks, now = Date.now()) {
  const out = {};
  Object.entries(locks || {}).forEach(([uid, v]) => { if (v && isLockValid({ uid, ...v }, now)) out[uid] = v; });
  return out;
}

const isOpenOrder = (d) => !d.matchedProUid && OPEN_STATUSES.has(d.orderStatus);

/**
 * 수락권 잡기.
 *  일반: { ok:true } | { ok:false, holderName, remainSec } | { ok:false, closed:true }
 *  비교: { ok:true, count } | { ok:false, count:3, remainSec(가장 먼저 풀리는 자리) }
 */
export async function acquireLock(orderId, uid, name, { compare = false } = {}) {
  if (!orderId || !uid) return { ok: false, closed: true };
  const ref = doc(db, COLLECTIONS.ORDERS, orderId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return { ok: false, closed: true };
    const d = snap.data() || {};
    if (!isOpenOrder(d)) return { ok: false, closed: true };
    const now = Date.now();
    if (compare) {
      const valid = validCompareLocks(d.viewLocks, now);
      if (valid[uid]) return { ok: true, count: Object.keys(valid).length }; // 이미 내 자리가 있다 — 갱신하지 않는다
      if (Object.keys(valid).length >= COMPARE_MAX) {
        const remain = Math.min(...Object.values(valid).map((v) => lockRemainSec(v, now)));
        return { ok: false, count: Object.keys(valid).length, remainSec: remain };
      }
      // 만료 항목은 이때 정리하고 내 자리를 넣는다
      const next = {};
      Object.entries(valid).forEach(([k, v]) => { next[k] = v; });
      next[uid] = { name: name || "", at: serverTimestamp() };
      tx.update(ref, { viewLocks: next });
      return { ok: true, count: Object.keys(next).length };
    }
    const cur = d.viewLock;
    if (cur && cur.uid && cur.uid !== uid && isLockValid(cur, now)) {
      return { ok: false, holderName: cur.name || "", remainSec: lockRemainSec(cur, now) };
    }
    if (cur && cur.uid === uid && isLockValid(cur, now)) {
      // 같은 사람이 다시 들어온 경우(새로고침 등) — 시간은 이어서 흐른다
      return { ok: true, remainSec: lockRemainSec(cur, now), resumed: true };
    }
    tx.update(ref, { viewLock: { uid, name: name || "", at: serverTimestamp() } });
    return { ok: true, remainSec: LOCK_MS / 1000 };
  });
}

/** 내 것일 때만 지운다 */
export async function releaseLock(orderId, uid, { compare = false } = {}) {
  if (!orderId || !uid) return;
  const ref = doc(db, COLLECTIONS.ORDERS, orderId);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const d = snap.data() || {};
      if (compare) {
        if (d.viewLocks && d.viewLocks[uid]) tx.update(ref, { [`viewLocks.${uid}`]: deleteField() });
        return;
      }
      if (d.viewLock && d.viewLock.uid === uid) tx.update(ref, { viewLock: deleteField() });
    });
  } catch (e) {
    // 화면을 떠나는 순간이라 트랜잭션이 끊길 수 있다 — 한 번 더 단순 쓰기 시도(남의 것을 지울 위험이 있어 compare 만)
    if (compare) { try { await updateDoc(ref, { [`viewLocks.${uid}`]: deleteField() }); } catch (_) {} }
  }
}

/** viewLock · viewLocks 만 뽑아 cb({ viewLock, viewLocks, open }) */
export function subscribeLock(orderId, cb) {
  if (!orderId) return () => {};
  return onSnapshot(doc(db, COLLECTIONS.ORDERS, orderId), (snap) => {
    const d = snap.exists() ? snap.data() || {} : {};
    cb({ viewLock: d.viewLock || null, viewLocks: d.viewLocks || {}, open: snap.exists() && isOpenOrder(d), matchedProUid: d.matchedProUid || null, orderStatus: d.orderStatus });
  }, () => {});
}
