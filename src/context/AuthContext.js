/* eslint-disable */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { watchAuthState, signOutUser, reactivateWithdrawnUser } from "../service/AuthService";
import { getUserProfileByUid } from "../service/UserProfileService";
import { auth } from "../api/config";
import { postToRN, isInRnWebView, requestPushToken, onPushToken, listenWebviewMessages, appendRnLog } from "../bridge/webviewBridge";
import { saveFcmToken, removeFcmToken } from "../service/fcmTokenService";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// 로그아웃 전에 FCM 토큰을 지운다 — 로그아웃 뒤에는 규칙에 막혀 못 지울 수 있다.
// 네트워크가 느려도 로그아웃이 멈추지 않게 3초까지만 기다린다.
const removeFcmTokenBeforeSignOut = async (uid) => {
    if (!uid) return;
    try {
        await Promise.race([
            removeFcmToken(uid),
            new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
    } catch (e) { /* 토큰 삭제 실패해도 로그아웃은 진행 */ }
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [debugMode, setDebugMode] = useState(false);
    const [debugInfo, setDebugInfo] = useState({});
    const pendingFcmToken = useRef(null);
    const navigate = useNavigate();

    // 탈퇴했던 계정으로 다시 들어온 경우 — 탈퇴 표시를 거두고 그대로 들여보낸다.
    //  10/25 에는 로그아웃 + "고객센터 문의" 로 막았는데, 대표 10/26: "탈퇴회원이 재로그인 · 재가입이 안 된다".
    //  다시 로그인한 것 자체가 돌아오겠다는 뜻이므로 되살린다. 탈퇴 이력은 lastWithdrawnAt 에 남는다.
    const reviveWithdrawn = async (profile, firebaseUid) => {
        const id = profile?.uid || firebaseUid;
        try { await reactivateWithdrawnUser(id, profile); } catch (e) { console.warn("탈퇴 계정 되살리기 실패:", e?.message); }
        const next = { ...profile, withdrawn: false, lastWithdrawnAt: profile?.withdrawnAt || null };
        delete next.withdrawnAt;
        delete next.withdrawReason;
        return next;
    };

    useEffect(() => {
        const unsubscribe = watchAuthState(async (firebaseUser) => {
            if (firebaseUser) {
                setCurrentUser(firebaseUser);
                try {
                    let profile = await getUserProfileByUid(firebaseUser.uid);
                    if (profile?.withdrawn === true) {
                        profile = await reviveWithdrawn(profile, firebaseUser.uid);
                        window.alert("탈퇴했던 계정입니다. 다시 이용하실 수 있게 되돌렸습니다.");
                    }
                    setUserData(profile || {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        name: firebaseUser.displayName || "",
                        phoneE164: "",
                        phoneVerified: false,
                        provider: "",
                        status: "",
                    });
                } catch (err) {
                    console.error("프로필 로드 실패:", err);
                    setUserData({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        name: firebaseUser.displayName || "",
                        phoneE164: "",
                        phoneVerified: false,
                        provider: "",
                        status: "",
                    });
                }

                if (isInRnWebView()) {
                    requestPushToken();
                }
            } else {
                // 토큰 갱신 중 잠깐 null이 올 수 있으므로 딜레이 후 확인
                setTimeout(() => {
                    const latest = auth.currentUser;
                    if (!latest) {
                        setCurrentUser(null);
                        setUserData(null);
                    }
                }, 500);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // FCM 토큰 수신 → Firestore 저장 (반드시 userData.uid = Firestore 문서 ID 사용)
    useEffect(() => {
        if (!isInRnWebView()) return;
        const off = onPushToken((token, platform) => {
            pendingFcmToken.current = { token, platform };
            // userData.uid가 있을 때만 즉시 저장 (Auth UID 사용 금지)
            if (userData?.uid) {
                console.log("[FCM] 토큰 즉시 저장:", userData.uid, token?.slice(0, 20));
                saveFcmToken(userData.uid, token, platform).catch(() => {});
            } else {
                console.log("[FCM] userData 미로드 — 토큰 보류:", token?.slice(0, 20));
            }
            setDebugInfo((prev) => ({ ...prev, fcmToken: token, platform }));
        });
        return off;
    }, [userData]);

    // userData 로드 완료 시 보류중인 FCM 토큰 저장 + 재요청
    useEffect(() => {
        if (!isInRnWebView() || !userData?.uid) return;
        if (pendingFcmToken.current) {
            const { token, platform } = pendingFcmToken.current;
            console.log("[FCM] 보류 토큰 저장:", userData.uid, token?.slice(0, 20));
            saveFcmToken(userData.uid, token, platform).catch(() => {});
        } else {
            console.log("[FCM] userData 로드됨 — 토큰 재요청");
            requestPushToken();
        }
    }, [userData?.uid]);

    // RN 브릿지 메시지 로깅 (디버그용)
    useEffect(() => {
        if (!isInRnWebView()) return;
        const off = listenWebviewMessages((msg) => {
            const type = msg.type || "";
            const pp = { ...msg };
            delete pp.type;
            const tokenHint = pp.token ? `tk:${String(pp.token).slice(0, 15)}…` : "";
            appendRnLog(type, Object.keys(pp), tokenHint);

            if (type === "DEBUG_MODE") {
                setDebugMode(!!msg.enabled);
            }
            if (type === "PUSH_TOKEN" || type === "FCM_TOKEN") {
                setDebugInfo((prev) => ({ ...prev, fcmToken: msg.token, platform: msg.platform }));
            }
        });
        return off;
    }, []);

    const refreshUser = useCallback(async () => {
        if (!currentUser) return;
        try {
            let profile = await getUserProfileByUid(currentUser.uid);
            // 갱신 때 탈퇴 표시가 보이면(서버 통합이 못 거둔 경우 등) 여기서도 되살린다
            if (profile?.withdrawn === true) profile = await reviveWithdrawn(profile, currentUser.uid);
            if (profile) setUserData(profile);
        } catch (err) {
            console.error("refreshUser 실패:", err);
        }
    }, [currentUser]);

    const login = (data) => {
        setUserData(data);
    };

    const logout = async () => {
        const firestoreUid = userData?.uid || currentUser?.uid;
        // 기다리지 않고 바로 signOut 하면 삭제 요청이 로그아웃 뒤에 도착해 막힐 수 있다 (B11)
        await removeFcmTokenBeforeSignOut(firestoreUid);
        // 계정 통합 대표 UID — 남겨두면 다음 사용자의 온보딩이 이전 사용자
        // 계정에 프로필을 덮어쓴다 (검수 7/28)
        try { localStorage.removeItem("__primaryUid"); } catch (e) {}
        if (isInRnWebView()) postToRN("START_SIGNOUT");
        await signOutUser();
        setCurrentUser(null);
        setUserData(null);
    };

    const isLoggedIn = !!(currentUser && userData);

    const value = {
        currentUser,
        userData,
        loading,
        isLoggedIn,
        login,
        logout,
        refreshUser,
        debugMode,
        debugInfo,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
