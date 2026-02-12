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

export function formatPhone(phone) {
    const cleaned = String(phone || "").replace(/\D/g, "");
    if (cleaned.length === 11) {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
}

export function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
