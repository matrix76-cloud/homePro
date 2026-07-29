/* eslint-disable */
/**
 * 회원 차수(등급) 유틸 — 오더 수락 접근 권한 차등
 *
 * 스펙 출처: 대표 확정 지시 (2026-07-29 리뷰)
 *  - 1차수(tier1): 오더 접수 즉시 0초 실시간 수락 가능 (구독 유료회원 또는 포인트 결제)
 *  - 2차수(tier2): 오더 등록 시점부터 300초(5분)가 지나야 수락 가능
 *                 (오더등록 이후 흐르고 있는 시간 기준 카운트다운)
 *  - 최초 가입 사업자 회원은 2차수로 배정 (accessTier 미설정 기존 유저도 2차수로 간주)
 *  - 유료 결제/구독 연동은 8/7 빌링 준비 후 — 현 범위는 필드·게이트·표시·관리자 수동 전환까지
 *  - 향후(런칭 3~6개월 후) 2만P 락업 규칙은 이번 범위 제외
 *
 * users 문서 필드: accessTier = "tier1" | "tier2"
 */

/** 2차수 회원의 수락 대기 시간 (초) */
export const ACCEPT_DELAY_SEC = 300;

/** 차수 표시 라벨 */
export const TIER_LABEL = { tier1: "1차수", tier2: "2차수" };

/**
 * 사용자 문서에서 차수 판정
 * accessTier === "tier1" 인 경우만 1차수. 그 외(미설정·오타·null 포함) 전부 2차수.
 * @param {object} userData users 문서 (AuthContext userData)
 * @returns {"tier1"|"tier2"}
 */
export function getAccessTier(userData) {
    return userData?.accessTier === "tier1" ? "tier1" : "tier2";
}

/**
 * 차수 라벨 문자열 (메인 상단 표시 등)
 * @param {object} userData
 * @returns {string} "1차수" | "2차수"
 */
export function getAccessTierLabel(userData) {
    return TIER_LABEL[getAccessTier(userData)];
}

/**
 * 다양한 형태의 시각값을 ms 로 변환
 * Firestore Timestamp / {seconds} / Date / number / ISO 문자열 모두 방어
 * @returns {number|null} ms (판정 불가면 null)
 */
export function toMillis(v) {
    if (v == null) return null;
    try {
        if (typeof v === "number") return v > 1e12 ? v : v * 1000; // 초 단위로 들어온 경우 보정
        if (typeof v === "string") {
            const t = new Date(v).getTime();
            return isNaN(t) ? null : t;
        }
        if (typeof v.toMillis === "function") return v.toMillis();
        if (typeof v.toDate === "function") {
            const d = v.toDate();
            return d instanceof Date && !isNaN(d.getTime()) ? d.getTime() : null;
        }
        if (v instanceof Date) return isNaN(v.getTime()) ? null : v.getTime();
        if (typeof v.seconds === "number") return v.seconds * 1000;
        if (typeof v._seconds === "number") return v._seconds * 1000;
    } catch (e) { }
    return null;
}

/**
 * 오더 등록 후 남은 수락 대기 초 (2차수 게이트용)
 * 오더 생성시각 필드: homepro_orders.createdAt (OrderService.createOrder — serverTimestamp)
 *  - createdAt 이 아직 서버 반영 전(null)이면 방금 등록된 것으로 보고 전체 대기시간 반환
 *  - 파싱 불가한 값이면 게이트를 걸지 않음(0) — 정상 이용을 막지 않기 위해
 * @param {object} order 오더 문서
 * @param {number} [nowMs] 기준 시각 (기본 Date.now())
 * @returns {number} 남은 초 (0 이하면 0)
 */
export function getAcceptRemainSec(order, nowMs) {
    if (!order) return 0;
    const now = typeof nowMs === "number" ? nowMs : Date.now();
    const raw = order.createdAt ?? order.registeredAt ?? order.created_at;
    if (raw == null) {
        // serverTimestamp 반영 대기 중 = 등록 직후 → 전체 대기
        return ACCEPT_DELAY_SEC;
    }
    const createdMs = toMillis(raw);
    if (createdMs == null) return 0; // 판정 불가 → 게이트 미적용
    const remain = Math.ceil((createdMs + ACCEPT_DELAY_SEC * 1000 - now) / 1000);
    return remain > 0 ? remain : 0;
}

/**
 * 남은 초를 "M:SS" 로 포맷
 * @param {number} sec
 * @returns {string}
 */
export function formatAcceptRemain(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * 해당 사용자가 지금 이 오더를 수락할 수 있는지
 * @returns {{allowed: boolean, remainSec: number, tier: "tier1"|"tier2"}}
 */
export function canAcceptNow(userData, order, nowMs) {
    const tier = getAccessTier(userData);
    if (tier === "tier1") return { allowed: true, remainSec: 0, tier };
    const remainSec = getAcceptRemainSec(order, nowMs);
    return { allowed: remainSec <= 0, remainSec, tier };
}
