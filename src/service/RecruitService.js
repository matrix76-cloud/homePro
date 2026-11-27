/* eslint-disable */
/**
 * 구인(팀원.기술자 구인) 모집 묶음 (대표 리뷰 2026-11-21 · 11/24)
 *
 *  접수자가 "작업 총 인원 4명 중 모집 인원 2명"을 적으면 같은 내용의 오더가 모집 인원만큼(2건) 올라간다.
 *  오더 한 건 = 모집 자리 하나. 배정 · 채팅 · 체크인 · 정산 · 리뷰는 지금처럼 '오더 한 건에 한 분' 그대로 돈다.
 *
 *  오더 문서: recruit { groupId, total, need, slot, skill }
 *    groupId  같은 접수에서 나온 오더들을 잇는 값
 *    total    작업 총 인원 (N)
 *    need     모집 인원 (M) = 숙련도별 인원 합계. 숙련도별 인원을 안 적었으면 직접 적은 숫자
 *    slot     이 오더가 몇 번째 자리인지 (1..M)
 *    skill    이 자리의 숙련도 (조공 · 준기공 · 기공 · 팀장). 숙련도별 인원 없이 접수했으면 null
 *
 *  표기
 *    recruitLabel     "[4명중 2명 모집]"
 *    recruitProgress  "채워진 인원/총 인원" — 4명 중 2명 모집이면 2/4 에서 시작해 한 자리 배정될 때마다 3/4 → 4/4(마감)
 */
import { collection, doc, getDocs, query, where, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "../api/config";
import { COLLECTIONS, ORDER_STATUS } from "../config/homeproConfig";
import { addOrderLog } from "./OrderService";

/** 한 번 접수에 올릴 수 있는 모집 인원 상한 — 숫자를 잘못 넣어 오더가 수십 건 올라가는 일을 막는다 */
export const RECRUIT_MAX_NEED = 20;

const toInt = (v) => Math.max(0, Math.floor(Number(v) || 0));

const newGroupId = () => `rg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * 숙련도별 인원 → 자리 목록.
 *  crewCounts: [["기공", 1], ["조공", 2]] → ["기공", "조공", "조공"]
 *  숙련도별 인원이 없으면 need 만큼 숙련도 없는 자리(null)를 만든다.
 */
export function buildRecruitSlots(crewCounts = [], need = 0) {
  const slots = [];
  (crewCounts || []).forEach(([skill, n]) => { for (let i = 0; i < toInt(n); i += 1) slots.push(skill); });
  if (slots.length) return slots;
  return Array.from({ length: toInt(need) }, () => null);
}

/**
 * 모집 인원만큼 오더를 한꺼번에 만든다 — 전부 올라가거나 하나도 안 올라간다(writeBatch).
 *  base: 접수 폼이 만든 오더 내용(OrderService.createOrder 에 넘기던 것과 같은 꼴)
 *  total: 작업 총 인원, slots: buildRecruitSlots 결과
 *  crewSection · skillAttr: 숙련도별 인원 입력 묶음 키("crew") · 숙련도 속성 키("skillLevel") — 자리마다 그 자리 숙련도 한 명 몫으로 맞춘다
 * 반환: 만든 오더 id 배열
 * ※ 문서에 넣는 기본값(orderStatus · applicantCount · createdAt)과 '오더 접수' 이력은 OrderService.createOrder 와 같게 둔다.
 */
export async function createRecruitOrders(base, { total, slots, crewSection = "crew", skillAttr = "skillLevel" } = {}) {
  const list = Array.isArray(slots) && slots.length ? slots : [null];
  const need = list.length;
  if (need > RECRUIT_MAX_NEED) throw new Error(`모집 인원은 한 번에 ${RECRUIT_MAX_NEED}명까지 접수할 수 있습니다`);
  const groupId = newGroupId();
  const totalNum = Math.max(toInt(total), need);
  const col = collection(db, COLLECTIONS.ORDERS);
  const batch = writeBatch(db);
  const refs = list.map((skill, i) => {
    const ref = doc(col);
    const data = {
      ...base,
      recruit: { groupId, total: totalNum, need, slot: i + 1, skill: skill || null },
      orderStatus: base.orderStatus || ORDER_STATUS.REGISTERED,
      applicantCount: 0,
      createdAt: serverTimestamp(),
    };
    if (skill) {
      // 이 자리의 숙련도 한 명 몫 — 상세의 '숙련도' · '숙련도별 인원' 줄이 그 자리 것만 보이게
      data.attrs = { ...(base.attrs || {}), [skillAttr]: [skill] };
      data.inputs = { ...(base.inputs || {}), [crewSection]: { [skill]: "1" } };
    }
    batch.set(ref, data);
    return ref;
  });
  await batch.commit();
  await Promise.all(refs.map((ref) => addOrderLog(ref.id, {
    type: "create",
    message: need > 1 ? `오더 접수 (모집 ${need}명 중 한 자리)` : "오더 접수",
    byUid: base.createdBy || "",
    byName: base.writer || base.customerName || base.nickname || "접수자",
    byRole: "접수자",
  })));
  return refs.map((r) => r.id);
}

/** "[4명중 2명 모집]" — 모집 묶음이 아니면 "" */
export function recruitLabel(order) {
  const r = order?.recruit;
  if (!r || !(toInt(r.total) > 0) || !(toInt(r.need) > 0)) return "";
  return `[${toInt(r.total)}명중 ${toInt(r.need)}명 모집]`;
}

const CLOSED_SLOT = [ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED]; // 취소 · 거부된 자리
const NOT_YET = [ORDER_STATUS.REGISTERED, ORDER_STATUS.WAITING, ORDER_STATUS.SELECTING]; // 아직 사람을 구하는 자리

/** 이 자리(오더)에 사람이 정해졌나 — 배정 뒤 완료 · 리뷰 · 정산까지 포함 */
export const isRecruitSlotFilled = (o) =>
  !!o && !!o.matchedProUid && !CLOSED_SLOT.includes(o.orderStatus) && !NOT_YET.includes(o.orderStatus);

/**
 * 모집 진행 — 채워진 인원/총 인원.
 *  siblings: 같은 묶음의 오더들(이 오더가 들어 있어도 되고 없어도 된다). 못 구했으면 비워 두면 이 오더 하나만 보고 센다.
 * 반환: null(모집 묶음 아님) 또는
 *  { total, need, filled, text: "3/4", open: 아직 구하는 자리 수, cancelled: 취소 · 거부된 자리 수,
 *    closed: 구하는 자리가 없음(다 찼거나 남은 자리가 취소됨), full: 총 인원이 다 참(4/4), known: 묶음 전체를 다 봤나 }
 */
export function recruitProgress(order, siblings = []) {
  const r = order?.recruit;
  if (!r || !(toInt(r.total) > 0) || !(toInt(r.need) > 0)) return null;
  const total = toInt(r.total);
  const need = Math.min(toInt(r.need), total);
  const byId = new Map();
  [order, ...(Array.isArray(siblings) ? siblings : [])].forEach((o) => {
    if (o && o.recruit && o.recruit.groupId === r.groupId) byId.set(o.id || `slot_${o.recruit.slot}`, o);
  });
  const group = [...byId.values()];
  const matched = group.filter(isRecruitSlotFilled).length;
  const cancelled = group.filter((o) => CLOSED_SLOT.includes(o.orderStatus)).length;
  const known = group.length >= need;
  const filled = Math.min(total, total - need + matched);
  // 묶음을 다 못 봤으면(목록에 일부만 있을 때) 못 본 자리는 아직 구하는 중으로 본다
  const open = Math.max(0, need - matched - cancelled);
  return { total, need, filled, text: `${filled}/${total}`, open, cancelled, closed: open === 0, full: filled >= total, known };
}

/** 목록처럼 이미 오더 배열을 들고 있는 화면용 — 그 배열에서 같은 묶음을 찾아 센다 */
export function recruitProgressFromList(order, orders = []) {
  const gid = order?.recruit?.groupId;
  if (!gid) return null;
  return recruitProgress(order, (orders || []).filter((o) => o?.recruit?.groupId === gid));
}

/** 같은 묶음의 오더 전부 (상세 화면용) */
export async function fetchRecruitSiblings(groupId) {
  if (!groupId) return [];
  const snap = await getDocs(query(collection(db, COLLECTIONS.ORDERS), where("recruit.groupId", "==", groupId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.recruit?.slot || 0) - (b.recruit?.slot || 0));
}

/** "[4명중 2명 모집] 3/4" — 표기 한 줄. 다 차면 뒤에 "마감" */
export function recruitLine(order, siblings = []) {
  const p = recruitProgress(order, siblings);
  if (!p) return "";
  return `${recruitLabel(order)} ${p.text}${p.full ? " 마감" : ""}`;
}
