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

export async function requestNativeSocialSignIn({ provider }) {
    const p = safeTrim(provider).toLowerCase();

    const ok = postToRN("START_SIGNIN", { provider: p });
    if (!ok) {
        return {
            success: false,
            provider: p,
            error_code: "not_in_app",
            error_message: "window.ReactNativeWebView not available",
        };
    }

    const res = await waitForRnMessage("SIGNIN_RESULT", 60000);
    return res;
}

export function requestNativeSignOut() {
    return postToRN("START_SIGNOUT", { at: Date.now() });
}
