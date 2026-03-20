/* eslint-disable */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { watchAuthState, signOutUser } from "../service/AuthService";
import { getUserProfileByUid } from "../service/UserProfileService";
import { auth } from "../api/config";
import { postToRN, isInRnWebView, requestPushToken, onPushToken, listenWebviewMessages, appendRnLog } from "../bridge/webviewBridge";
import { saveFcmToken, removeFcmToken } from "../service/fcmTokenService";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [debugMode, setDebugMode] = useState(false);
    const [debugInfo, setDebugInfo] = useState({});
    const pendingFcmToken = useRef(null);

    useEffect(() => {
        const unsubscribe = watchAuthState(async (firebaseUser) => {
            if (firebaseUser) {
                setCurrentUser(firebaseUser);
                try {
                    const profile = await getUserProfileByUid(firebaseUser.uid);
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
            const profile = await getUserProfileByUid(currentUser.uid);
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
        if (firestoreUid) {
            removeFcmToken(firestoreUid).catch(() => {});
        }
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
