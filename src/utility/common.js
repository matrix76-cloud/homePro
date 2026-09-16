/* eslint-disable */

export function postLog(...args) {
    if (process.env.NODE_ENV === "development") {
        console.log("[HomePro]", ...args);
    }
}

export function formatPrice(price) {
    if (!price && price !== 0) return "0";
    return Number(price).toLocaleString("ko-KR");
}

/**
 * 전화번호를 010-0000-0000 모양으로.
 * 회원 문서는 phoneE164("+821012345678")로 저장돼 있어 +82 를 0 으로 바꾸지 않으면
 * 화면에 "+8210..." 이 그대로 나온다. (양도·매매 상세·교육 등록 기본값에서 실제로 노출됐음 2026-09-16)
 */
export function formatPhone(phone) {
    let raw = String(phone || "").trim();
    if (raw.startsWith("+82")) raw = "0" + raw.slice(3).replace(/^0+/, "");
    const cleaned = raw.replace(/\D/g, "");
    if (cleaned.length === 11) {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return cleaned || phone;
}

export function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
