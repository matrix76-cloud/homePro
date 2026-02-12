const { onRequest } = require("firebase-functions/v2/https");
const { onCall } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

/**
 * 카카오 로그인 - accessToken → customToken 발급
 */
exports.kakaoAuth = onCall(async (request) => {
    const { accessToken, idToken } = request.data || {};

    if (!accessToken) {
        throw new Error("accessToken is required");
    }

    // 카카오 사용자 정보 조회
    const response = await fetch("https://kapi.kakao.com/v2/user/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        throw new Error("Failed to fetch Kakao user info");
    }

    const kakaoUser = await response.json();
    const kakaoId = String(kakaoUser.id);
    const email = kakaoUser.kakao_account?.email || "";
    const nickname = kakaoUser.kakao_account?.profile?.nickname || "";

    // Firebase UID: kakao:{kakaoId}
    const uid = `kakao:${kakaoId}`;

    // Firebase Auth에 유저 생성 또는 업데이트
    try {
        await admin.auth().getUser(uid);
    } catch (e) {
        if (e.code === "auth/user-not-found") {
            await admin.auth().createUser({
                uid,
                email: email || undefined,
                displayName: nickname || undefined,
            });
        } else {
            throw e;
        }
    }

    // Custom Token 발급
    const customToken = await admin.auth().createCustomToken(uid);

    // Firestore 유저 문서 업데이트
    await db.doc(`users/${uid}`).set(
        {
            uid,
            email,
            nickname,
            kakaoId,
            provider: "kakao",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
    );

    return { customToken, email, kakaoId, uid };
});

/**
 * 헬스체크
 */
exports.healthCheck = onRequest((req, res) => {
    res.json({ status: "ok", project: "homepro", timestamp: new Date().toISOString() });
});
