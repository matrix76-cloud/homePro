const { onRequest } = require("firebase-functions/v2/https");
const { onCall } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

// ─── 헬스체크 ───
exports.healthCheck = onRequest({ region: "asia-northeast3" }, (req, res) => {
    res.json({ status: "ok", project: "homepro", timestamp: new Date().toISOString() });
});

// ─── 카카오 로그인 - accessToken → customToken 발급 ───
exports.kakaoAuth = onCall({ region: "asia-northeast3" }, async (request) => {
    const { accessToken, idToken } = request.data || {};

    if (!accessToken) {
        throw new Error("accessToken is required");
    }

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

    const uid = `kakao:${kakaoId}`;

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

    const customToken = await admin.auth().createCustomToken(uid);

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

// ─── SMS 인증코드 발송 ───
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.post("/AuthCodeSend", async (req, res) => {
    const body = req.body || {};
    const phone = String(body.phone || "").replace(/\D/g, "");
    const code = String(body.authcode || "");
    const label = String(body.label || "홈프로");

    if (!phone || !code) {
        return res.status(400).json({ ok: false, error: "phone, authcode 필수" });
    }

    try {
        const resp = await fetch("http://34.64.211.220:8080/sendSms", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer sms-gateway-shared-key-2025",
            },
            body: JSON.stringify({
                to: phone,
                templateId: "VERIFY_CODE",
                label,
                variables: { code },
            }),
        });

        let result = null;
        try { result = await resp.json(); } catch { result = null; }

        return res.status(200).json({ ok: true, result });
    } catch (error) {
        console.error("SMS 발송 실패:", error.message);
        return res.status(500).json({ ok: false, error: error.message });
    }
});

exports.api = require("firebase-functions").region("asia-northeast3").https.onRequest(app);

// ─── 비밀번호 변경 (Firebase Auth + Firestore) ───
exports.resetPassword = onRequest({ region: "asia-northeast3", cors: true }, async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }

    const { uid, newPassword } = req.body || {};

    if (!uid || !newPassword) {
        res.status(400).json({ ok: false, error: "uid, newPassword 필수" });
        return;
    }

    if (String(newPassword).length < 6) {
        res.status(400).json({ ok: false, error: "비밀번호는 6자 이상이어야 합니다." });
        return;
    }

    try {
        // Firebase Auth 비밀번호 업데이트
        await admin.auth().updateUser(uid, { password: newPassword });

        // Firestore 문서도 업데이트
        const userRef = db.doc(`users/${uid}`);
        const snap = await userRef.get();
        if (snap.exists) {
            await userRef.set({ updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        }

        res.status(200).json({ ok: true });
    } catch (err) {
        console.error("resetPassword error:", err.message);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ─── 푸시 알림 발송 (notifications 문서 생성 트리거) ───
exports.onNotificationSend = onDocumentCreated(
    { document: "notifications/{notifId}", region: "asia-northeast3" },
    async (event) => {
        const snap = event.data;
        if (!snap) return;

        const data = snap.data();
        if (data.sent) return;

        const targetUids = data.targetUids || [];
        if (targetUids.length === 0) return;

        // FCM 토큰 조회
        const tokens = [];
        for (const uid of targetUids) {
            const q = db.collection("fcmTokens").where("uid", "==", uid);
            const tokenSnap = await q.get();
            tokenSnap.forEach((doc) => {
                const t = doc.data().token;
                if (t) tokens.push({ token: t, docRef: doc.ref });
            });
        }

        if (tokens.length === 0) {
            await snap.ref.set({ sent: true, sentAt: admin.firestore.FieldValue.serverTimestamp(), tokenCount: 0 }, { merge: true });
            return;
        }

        const message = {
            notification: {
                title: data.title || "홈프로",
                body: data.body || "",
            },
            data: {
                type: data.type || "general",
                notifId: event.params.notifId || "",
                ...(data.data || {}),
            },
        };

        const result = await admin.messaging().sendEachForMulticast({
            tokens: tokens.map((t) => t.token),
            ...message,
        });

        // 실패 토큰 삭제
        const failedTokens = [];
        result.responses.forEach((resp, idx) => {
            if (!resp.success) {
                const code = resp.error?.code || "";
                if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
                    failedTokens.push(tokens[idx].docRef);
                }
            }
        });

        for (const ref of failedTokens) {
            try { await ref.delete(); } catch {}
        }

        await snap.ref.set({
            sent: true,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            tokenCount: tokens.length,
            successCount: result.successCount,
            failureCount: result.failureCount,
        }, { merge: true });
    }
);

// ─── 관리자 계정 초기 생성 ───
exports.seedAdmin = onRequest({ region: "asia-northeast3", cors: true }, async (req, res) => {
    const ref = db.collection("admin").doc("superadmin");
    const snap = await ref.get();
    if (snap.exists) {
        res.status(200).json({ ok: true, message: "이미 존재합니다" });
        return;
    }
    await ref.set({
        loginId: "admin",
        password: "admin1234",
        name: "관리자",
        rank: "superadmin",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(200).json({ ok: true, message: "관리자 계정 생성 완료" });
});

// ─── 즉시 푸시 발송 테스트용 ───
exports.sendTestPush = onRequest({ region: "asia-northeast3", cors: true }, async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }

    const { uid, title, body } = req.body || {};

    if (!uid) {
        res.status(400).json({ ok: false, error: "uid 필수" });
        return;
    }

    try {
        const q = db.collection("fcmTokens").where("uid", "==", uid);
        const tokenSnap = await q.get();
        const tokens = [];
        tokenSnap.forEach((doc) => {
            const t = doc.data().token;
            if (t) tokens.push(t);
        });

        if (tokens.length === 0) {
            res.status(404).json({ ok: false, error: "FCM 토큰 없음" });
            return;
        }

        const result = await admin.messaging().sendEachForMulticast({
            tokens,
            notification: {
                title: title || "테스트 푸시",
                body: body || "테스트 메시지입니다.",
            },
            data: { type: "test" },
        });

        res.status(200).json({
            ok: true,
            tokenCount: tokens.length,
            successCount: result.successCount,
            failureCount: result.failureCount,
        });
    } catch (err) {
        console.error("sendTestPush error:", err.message);
        res.status(500).json({ ok: false, error: err.message });
    }
});
