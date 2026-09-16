// (웹) src/bridge/webviewBridge.js
/* eslint-disable */

export const WEBVIEW_EVENTS = {
    // RN -> Web
    FCM_TOKEN: "FCM_TOKEN",

    // Web -> RN
    WEB_READY: "WEB_READY",
};

const safeTrim = (v) => String(v || "").trim();

function safeJsonParse(str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
}

/**
 * RN(WebView) -> Web 메시지 수신
 * - Android는 document, iOS는 window로 오는 케이스가 있어서 둘 다 리스닝
 */
export function listenWebviewMessages(onEvent) {
    function handler(evt) {
        const raw = evt?.data;
        const parsed = typeof raw === "string" ? safeJsonParse(raw) : raw;
        if (!parsed || typeof parsed !== "object") return;

        const type = safeTrim(parsed.type);
        if (!type) return;

        onEvent?.(parsed);
    }

    window.addEventListener("message", handler);
    document.addEventListener("message", handler);

    return () => {
        window.removeEventListener("message", handler);
        document.removeEventListener("message", handler);
    };
}

/**
 * Web -> RN 메시지 전송
 */
export function postToRN(type, payload = {}) {
    try {
        if (typeof window === "undefined") return false;

        const wv = window?.ReactNativeWebView;
        if (!wv || typeof wv.postMessage !== "function") return false;

        wv.postMessage(JSON.stringify({ type, payload }));
        return true;
    } catch (e) {
        return false;
    }
}

export function isInRnWebView() {
    try {
        return typeof window !== "undefined" && !!window?.ReactNativeWebView?.postMessage;
    } catch {
        return false;
    }
}

/**
 * RN -> Web: 라우터/스플래시 등에서 쓰기 좋게 "구독형"으로 한 번 더 래핑
 */
const _incomingListeners = new Set();

export function attachMessageListener() {
    const detach = listenWebviewMessages((msg) => {
        try {
            const type = safeTrim(msg?.type);
            const payload = msg?.payload ?? msg?.data ?? {};
            if (!type) return;

            _incomingListeners.forEach((fn) => {
                try {
                    fn({ type, payload });
                } catch { }
            });
        } catch { }
    });

    return detach;
}

export function onIncoming(fn) {
    if (typeof fn !== "function") return () => { };
    _incomingListeners.add(fn);

    return () => {
        try {
            _incomingListeners.delete(fn);
        } catch { }
    };
}

export function waitForRnMessage(typeToWait, timeoutMs = 60000) {
    const t = safeTrim(typeToWait);
    const tm = Number(timeoutMs || 0) || 60000;

    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            cleanup();
            resolve({
                success: false,
                error_code: "timeout",
                error_message: `waitForRnMessage timeout (${tm}ms)`,
            });
        }, tm);

        const off = onIncoming((msg) => {
            if (!msg) return;
            if (safeTrim(msg.type) !== t) return;

            cleanup();
            resolve(msg?.payload ?? msg);
        });

        function cleanup() {
            clearTimeout(timer);
            try {
                off?.();
            } catch { }
        }
    });
}

let _webReadySent = false;

export function sendWebReadyOnce(meta = {}) {
    if (_webReadySent) return false;
    _webReadySent = true;

    return postToRN("WEB_READY", { ...(meta || {}), at: Date.now() });
}

export function sendWebReady(meta = {}) {
    return postToRN("WEB_READY", { ...(meta || {}), at: Date.now() });
}

export function sendNavState(navState = {}) {
    return postToRN("NAV_STATE", { ...(navState || {}), at: Date.now() });
}

// ── 네이티브 소셜 로그인 결과 — 전역 리스너 + 버퍼 + 진행 표시 ─────────────
// 안드로이드는 계정 선택창(별도 Activity)에 다녀오는 사이 메모리 상황에 따라 WebView를
// 리로드한다. 그러면 결과를 기다리던 코드와 리스너가 통째로 사라져, RN이 SIGNIN_RESULT를
// 제대로 보내도 받을 사람이 없다. 그래서 ①리스너는 모듈 로드 시 등록하고 ②기다리는 사람이
// 없으면 버퍼에 담아 두고 ③"진행 중" 표시를 localStorage에 남겨 리로드 뒤 화면이 이어받는다.
let _signinBuffer = null;
let _signinWaiter = null;
let _signinLastTs = null;

function _onSigninMessage(evt) {
    const raw = evt?.data;
    const msg = typeof raw === "string" ? safeJsonParse(raw) : raw;
    if (!msg || safeTrim(msg.type) !== "SIGNIN_RESULT") return;
    const payload = msg.payload || {};
    // 같은 결과가 두 번 올 수 있다(RN 강제 주입 + 리로드 후 큐 flush) → ts로 한 번만 처리
    if (payload.ts && payload.ts === _signinLastTs) return;
    if (payload.ts) _signinLastTs = payload.ts;
    if (_signinWaiter) {
        const w = _signinWaiter;
        _signinWaiter = null;
        w(payload);
        return;
    }
    _signinBuffer = payload;
}
if (typeof window !== "undefined") {
    window.addEventListener("message", _onSigninMessage);
    document.addEventListener("message", _onSigninMessage);
}

function waitForSigninResult(timeoutMs = 90000) {
    if (_signinBuffer) {
        const r = _signinBuffer;
        _signinBuffer = null;
        return Promise.resolve(r);
    }
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            if (_signinWaiter === deliver) _signinWaiter = null;
            resolve({ success: false, error_code: "timeout", error_message: `SIGNIN_RESULT timeout (${timeoutMs}ms)` });
        }, timeoutMs);
        const deliver = (payload) => {
            clearTimeout(timer);
            resolve(payload);
        };
        _signinWaiter = deliver;
    });
}

// 진행 중 표시 — sessionStorage는 WebView가 새로 만들어지면 비는 경우가 있어 localStorage
const PENDING_SIGNIN_KEY = "homepro.pendingSignin";
const PENDING_SIGNIN_TTL_MS = 5 * 60 * 1000;

export function markPendingSignin(provider) {
    try { localStorage.setItem(PENDING_SIGNIN_KEY, JSON.stringify({ provider, at: Date.now() })); } catch { }
}
export function clearPendingSignin() {
    try { localStorage.removeItem(PENDING_SIGNIN_KEY); } catch { }
}
export function readPendingSignin() {
    try {
        const raw = localStorage.getItem(PENDING_SIGNIN_KEY);
        if (!raw) return null;
        const saved = JSON.parse(raw);
        if (!saved?.provider || !saved?.at) return null;
        if (Date.now() - saved.at > PENDING_SIGNIN_TTL_MS) {
            clearPendingSignin();
            return null;
        }
        return saved;
    } catch {
        return null;
    }
}

export async function requestNativeSocialSignIn({ provider }) {
    const p = safeTrim(provider).toLowerCase();

    _signinBuffer = null; // 새 로그인 — 지난 시도의 잔여 결과는 버린다
    const wait = waitForSigninResult(90000);
    markPendingSignin(p);

    const ok = postToRN("START_SIGNIN", { provider: p });
    if (!ok) {
        _signinWaiter = null;
        clearPendingSignin();
        return {
            success: false,
            provider: p,
            error_code: "not_in_app",
            error_message: "window.ReactNativeWebView not available",
        };
    }

    const res = await wait;
    clearPendingSignin();
    return res;
}

/** 리로드로 새로 뜬 화면이 진행 중이던 로그인 결과를 이어받는다. 없으면 null (매 진입마다 불러도 안전) */
export async function resumeNativeSigninResult(timeoutMs = 20000) {
    if (!isInRnWebView()) return null;
    const pending = readPendingSignin();
    if (!pending) return null;
    const res = await waitForSigninResult(timeoutMs);
    clearPendingSignin();
    if (!res || res.error_code === "timeout") return null;
    return { provider: pending.provider, res };
}

export function requestNativeSignOut() {
    return postToRN("START_SIGNOUT", { at: Date.now() });
}

export function requestPushToken() {
    return postToRN("REQUEST_PUSH_TOKEN", { at: Date.now() });
}

const _pushTokenListeners = new Set();

export function onPushToken(fn) {
    if (typeof fn !== "function") return () => {};
    _pushTokenListeners.add(fn);

    const off = onIncoming((msg) => {
        const t = safeTrim(msg?.type);
        if (t !== "PUSH_TOKEN" && t !== "FCM_TOKEN") return;
        const token = msg?.payload?.token || msg?.payload?.fcmToken || "";
        const platform = msg?.payload?.platform || "android";
        if (token) fn(token, platform);
    });

    return () => {
        _pushTokenListeners.delete(fn);
        off?.();
    };
}

// ─── 위치 요청 (RN GPS) ───

export function requestLocation() {
    return postToRN("REQUEST_LOCATION", { at: Date.now() });
}

export async function requestLocationAsync(timeoutMs = 10000) {
    const ok = postToRN("REQUEST_LOCATION", { at: Date.now() });
    if (!ok) {
        return { success: false, error_code: "not_in_app", error_message: "RN WebView 아님" };
    }
    const res = await waitForRnMessage("LOCATION_RESULT", timeoutMs);
    return res;
}

const _rnLogs = [];
export function appendRnLog(type, keys, hint) {
    _rnLogs.push({ type, keys, hint, ts: Date.now() });
    if (_rnLogs.length > 100) _rnLogs.shift();
}
export function getRnLogs() { return [..._rnLogs]; }
