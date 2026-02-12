// src/service/AuthService.js
/* eslint-disable */
import {
    getAuth,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    GoogleAuthProvider,
    signInWithCredential,
    signInWithCustomToken,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    onAuthStateChanged,
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
} from "firebase/auth";

import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { firebaseApp, db } from "../api/config";

import {
    isInRnWebView,
    requestNativeSocialSignIn,
    requestNativeSignOut,
} from "../bridge/webviewBridge";
import { STORAGE_KEYS } from "../config/homeproConfig";

const SESSION_KEY = STORAGE_KEYS.SESSION;
const safeTrim = (v) => String(v || "").trim();

function getAuthInstance() {
    return getAuth(firebaseApp);
}

function getFns() {
    return getFunctions(firebaseApp);
}

async function ensureUserDoc({ uid, email }) {
    const uidText = safeTrim(uid);
    if (!uidText) throw new Error("UID_REQUIRED");

    const emailText = safeTrim(email);

    await setDoc(
        doc(db, "users", uidText),
        {
            uid: uidText,
            email: emailText,
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );

    return true;
}

async function applyPersistence(auth, keepLogin) {
    await setPersistence(
        auth,
        keepLogin ? browserLocalPersistence : browserSessionPersistence
    );
}

function saveSession({ uid, email, keepLogin }) {
    if (typeof window === "undefined") return;

    const payload = { uid: safeTrim(uid), email: safeTrim(email), ts: Date.now() };

    try {
        const target = keepLogin ? window.localStorage : window.sessionStorage;
        const other = keepLogin ? window.sessionStorage : window.localStorage;

        other?.removeItem?.(SESSION_KEY);
        target?.setItem?.(SESSION_KEY, JSON.stringify(payload));
    } catch { }
}

export function clearSession() {
    if (typeof window === "undefined") return;
    try {
        window.localStorage?.removeItem?.(SESSION_KEY);
        window.sessionStorage?.removeItem?.(SESSION_KEY);
    } catch { }
}

function decodeJwtPayload(idToken) {
    try {
        const parts = String(idToken || "").split(".");
        if (parts.length < 2) return null;
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
        const json = atob(padded);
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function isPopupBlockedError(e) {
    const code = String(e?.code || "").toLowerCase();
    const msg = String(e?.message || "").toLowerCase();
    return (
        code.includes("auth/popup-blocked") ||
        code.includes("auth/popup-closed-by-user") ||
        code.includes("auth/cancelled-popup-request") ||
        msg.includes("popup") ||
        msg.includes("blocked")
    );
}

async function webSignInWithGoogle({ keepLogin }) {
    const auth = getAuthInstance();
    await applyPersistence(auth, keepLogin);

    const provider = new GoogleAuthProvider();

    try {
        const userCred = await signInWithPopup(auth, provider);

        const uid = safeTrim(userCred?.user?.uid);
        const email = safeTrim(userCred?.user?.email || "");

        if (!uid) {
            return {
                success: false,
                provider: "google",
                error_code: "no_uid",
                error_message: "Firebase signInWithPopup 이후 uid가 없습니다.",
            };
        }

        await ensureUserDoc({ uid, email });
        saveSession({ uid, email, keepLogin });

        return {
            success: true,
            provider: "google",
            uid,
            user: userCred.user,
            strategy: "web_popup",
        };
    } catch (e) {
        if (isPopupBlockedError(e)) {
            await signInWithRedirect(auth, provider);
            return {
                success: true,
                provider: "google",
                uid: "",
                user: null,
                strategy: "web_redirect_started",
            };
        }

        return {
            success: false,
            provider: "google",
            error_code: e?.code || "web_google_signin_error",
            error_message: e?.message || String(e),
        };
    }
}

export async function consumeRedirectResultIfAny() {
    if (isInRnWebView()) {
        return { success: true, consumed: false, strategy: "rn_ssot" };
    }

    const auth = getAuthInstance();

    try {
        const res = await getRedirectResult(auth);

        if (!res || !res.user) {
            return { success: true, consumed: false, strategy: "web_no_redirect_result" };
        }

        const uid = safeTrim(res?.user?.uid);
        const email = safeTrim(res?.user?.email || "");

        if (!uid) {
            return {
                success: false,
                consumed: true,
                strategy: "web_redirect",
                error_code: "no_uid",
                error_message: "Firebase getRedirectResult 이후 uid가 없습니다.",
            };
        }

        await ensureUserDoc({ uid, email });
        saveSession({ uid, email, keepLogin: true });

        return { success: true, consumed: true, strategy: "web_redirect", uid };
    } catch (e) {
        return {
            success: false,
            consumed: false,
            strategy: "web_redirect_error",
            error_code: e?.code || "redirect_result_error",
            error_message: e?.message || String(e),
        };
    }
}

export async function signInWithSocial({ provider, keepLogin = true }) {
    const p = safeTrim(provider).toLowerCase();
    if (p !== "google" && p !== "kakao") {
        return { success: false, provider: p, error_code: "invalid_provider" };
    }

    if (!isInRnWebView()) {
        if (p !== "google") {
            return {
                success: false,
                provider: p,
                error_code: "web_google_only",
                error_message: "웹에서는 현재 구글 로그인만 가능합니다.",
            };
        }
        return await webSignInWithGoogle({ keepLogin });
    }

    const auth = getAuthInstance();

    try {
        await applyPersistence(auth, keepLogin);

        const res = await requestNativeSocialSignIn({ provider: p });

        if (!res || res.success !== true) {
            return {
                success: false,
                provider: p,
                error_code: res?.error_code || "native_signin_failed",
                error_message: res?.error_message || res?.message || "unknown",
                raw: res,
            };
        }

        if (p === "google") {
            const idToken = safeTrim(
                res?.idToken || res?.tokens?.idToken || res?.tokens?.id_token || ""
            );
            if (!idToken) {
                return {
                    success: false,
                    provider: "google",
                    error_code: "no_idToken",
                    error_message: "RN 로그인 성공했는데 idToken이 없습니다.",
                    raw: res,
                };
            }

            const payload = decodeJwtPayload(idToken);

            const cred = GoogleAuthProvider.credential(idToken);
            if (!cred) {
                return {
                    success: false,
                    provider: "google",
                    error_code: "cred_undefined",
                    error_message: "GoogleAuthProvider.credential(idToken) returned undefined",
                };
            }

            const userCred = await signInWithCredential(auth, cred);

            const uid = safeTrim(userCred?.user?.uid);
            const email = safeTrim(userCred?.user?.email || payload?.email || "");

            if (!uid) {
                return {
                    success: false,
                    provider: "google",
                    error_code: "no_uid",
                    error_message: "Firebase signInWithCredential 이후 uid가 없습니다.",
                };
            }

            await ensureUserDoc({ uid, email });
            saveSession({ uid, email, keepLogin });

            return { success: true, provider: "google", uid, user: userCred.user };
        }

        if (p === "kakao") {
            const accessToken = safeTrim(res?.tokens?.accessToken || res?.accessToken || "");
            const idToken = safeTrim(res?.tokens?.idToken || res?.idToken || "");

            if (!accessToken) {
                return {
                    success: false,
                    provider: "kakao",
                    error_code: "no_accessToken",
                    error_message: "RN 카카오 로그인 성공했는데 accessToken이 없습니다.",
                    raw: res,
                };
            }

            const call = httpsCallable(getFns(), "kakaoAuth");
            const out = await call({ accessToken, idToken });

            const customToken = safeTrim(out?.data?.customToken || "");
            const email = safeTrim(out?.data?.email || "");
            const kakaoId = safeTrim(out?.data?.kakaoId || "");

            if (!customToken) {
                return {
                    success: false,
                    provider: "kakao",
                    error_code: "no_customToken",
                    error_message: "Functions에서 customToken이 오지 않았습니다.",
                    raw: out?.data,
                };
            }

            const userCred = await signInWithCustomToken(auth, customToken);

            const uid = safeTrim(userCred?.user?.uid);
            const emailFinal = safeTrim(userCred?.user?.email || email || "");

            if (!uid) {
                return {
                    success: false,
                    provider: "kakao",
                    error_code: "no_uid",
                    error_message: "signInWithCustomToken 이후 uid가 없습니다.",
                };
            }

            await ensureUserDoc({ uid, email: emailFinal });
            saveSession({ uid, email: emailFinal, keepLogin });

            return { success: true, provider: "kakao", uid, kakaoId, user: userCred.user };
        }

        return { success: false, provider: p, error_code: "unreachable" };
    } catch (e) {
        return {
            success: false,
            provider: p,
            error_code: e?.code || "social_signin_error",
            error_message: e?.message || String(e),
        };
    }
}

export async function signOutUser() {
    const auth = getAuthInstance();
    try {
        try {
            requestNativeSignOut();
        } catch { }
        await signOut(auth);
    } finally {
        clearSession();
    }
    return true;
}

export function watchAuthState(onChange) {
    const auth = getAuthInstance();

    return onAuthStateChanged(auth, async (user) => {
        try {
            if (user?.uid) {
                await ensureUserDoc({ uid: user.uid, email: user.email || "" });
                saveSession({ uid: user.uid, email: user.email || "", keepLogin: true });
            } else {
                clearSession();
            }
        } catch { }

        try {
            onChange?.(user || null);
        } catch { }
    });
}

export async function signInWithEmailPassword({ email, password, keepLogin = true }) {
    const auth = getAuthInstance();

    const e = safeTrim(email);
    const p = String(password || "");

    if (!e || !p) {
        return {
            success: false,
            provider: "email",
            error_code: "missing_fields",
            error_message: "이메일/비밀번호를 입력해주세요.",
        };
    }

    try {
        await applyPersistence(auth, keepLogin);

        const userCred = await signInWithEmailAndPassword(auth, e, p);

        const uid = safeTrim(userCred?.user?.uid);
        const emailFinal = safeTrim(userCred?.user?.email || e);

        if (!uid) {
            return {
                success: false,
                provider: "email",
                error_code: "no_uid",
                error_message: "signInWithEmailAndPassword 이후 uid가 없습니다.",
            };
        }

        await ensureUserDoc({ uid, email: emailFinal });
        saveSession({ uid, email: emailFinal, keepLogin });

        return { success: true, provider: "email", uid, user: userCred.user, strategy: "web_email" };
    } catch (err) {
        const code = String(err?.code || "");
        let msg = err?.message || String(err);

        if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password")) {
            msg = "이메일 또는 비밀번호가 올바르지 않습니다.";
        } else if (code.includes("auth/user-not-found")) {
            msg = "가입되지 않은 이메일입니다.";
        } else if (code.includes("auth/invalid-email")) {
            msg = "이메일 형식이 올바르지 않습니다.";
        } else if (code.includes("auth/too-many-requests")) {
            msg = "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
        }

        return {
            success: false,
            provider: "email",
            error_code: code || "email_signin_error",
            error_message: msg,
        };
    }
}

export async function signUpWithEmailPassword({ email, password, keepLogin = true }) {
    const e = safeTrim(email);
    const p = String(password ?? "");

    if (!e || !p) {
        return { success: false, error_code: "missing_fields", error_message: "이메일/비밀번호를 입력해주세요." };
    }

    if (p.length < 6) {
        return { success: false, error_code: "weak_password", error_message: "비밀번호는 6자 이상으로 설정해주세요." };
    }

    try {
        const auth = getAuthInstance();
        await applyPersistence(auth, keepLogin);

        const cred = await createUserWithEmailAndPassword(auth, e, p);
        const uid = safeTrim(cred?.user?.uid);

        if (!uid) {
            return { success: false, error_code: "no_uid", error_message: "회원가입 결과 uid가 없습니다." };
        }

        await ensureUserDoc({ uid, email: safeTrim(cred?.user?.email || e), isNew: true });
        saveSession({ uid, email: safeTrim(cred?.user?.email || e), keepLogin });

        return { success: true, provider: "email", uid, user: cred.user };
    } catch (err) {
        const code = String(err?.code || "");
        let msg = String(err?.message || "회원가입에 실패했습니다.");

        if (code.includes("auth/email-already-in-use")) msg = "이미 가입된 이메일입니다.";
        else if (code.includes("auth/invalid-email")) msg = "이메일 형식이 올바르지 않습니다.";
        else if (code.includes("auth/weak-password")) msg = "비밀번호가 너무 약합니다. 6자 이상으로 설정해주세요.";

        return { success: false, provider: "email", error_code: code || "email_signup_error", error_message: msg };
    }
}
