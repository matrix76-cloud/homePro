const { onRequest } = require("firebase-functions/v2/https");
const { onCall } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
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

        // 알림 설정 체크 — 관리자가 off한 카테고리면 스킵
        try {
            const notiSettingsSnap = await db.doc("settings/notifications").get();
            if (notiSettingsSnap.exists) {
                const settings = notiSettingsSnap.data();
                const type = data.type || "general";
                // type → 카테고리 매핑
                const ORDER_TYPES = ["order", "quote", "quote_accepted", "quote_rejected", "payment", "work_complete", "review", "order_cancelled"];
                const CHAT_TYPES = ["chat"];
                const NOTICE_TYPES = ["point", "grade_up", "pro_approval", "pro_rejection", "notice"];

                let category = null;
                if (ORDER_TYPES.includes(type)) category = "order";
                else if (CHAT_TYPES.includes(type)) category = "chat";
                else if (NOTICE_TYPES.includes(type)) category = "notice";

                if (category && settings[category] === false) {
                    await snap.ref.set({ sent: true, skipped: true, skipReason: `${category} disabled` }, { merge: true });
                    return;
                }
            }
        } catch (e) {
            console.warn("알림 설정 확인 실패 (발송 진행):", e.message);
        }

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

// ─── 역지오코딩 프록시 (카카오 CORS 우회) ───
exports.reverseGeocode = onRequest({ region: "asia-northeast3", cors: true }, async (req, res) => {
    const { x, y } = req.query;
    if (!x || !y) return res.status(400).json({ error: "x, y 필수" });

    const KAKAO_KEY = process.env.KAKAO_REST_KEY || "ae8b70dff25588465673b02b1b0cf162";
    try {
        const response = await fetch(
            `https://dapi.kakao.com/v2/local/geo/coord2regioninfo.json?x=${x}&y=${y}`,
            { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } }
        );
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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

// ============================================
// 알림 트리거 시스템
// ============================================

/**
 * 공통 알림 문서 생성
 */
async function createNotification(type, title, body, targetUids, data = {}) {
    if (!targetUids || targetUids.length === 0) return;
    await db.collection("notifications").add({
        type,
        title,
        body,
        targetUids,
        data,
        sent: false,
        createdAt: admin.firestore.Timestamp.now(),
    });
}

// ─── 1. 주문 생성 알림 (해당 카테고리 Pro에게) ───
exports.onOrderCreated = onDocumentCreated(
    { document: "homepro_orders/{orderId}", region: "asia-northeast3" },
    async (event) => {
        const snap = event.data;
        if (!snap) return;

        const order = snap.data();
        const categoryId = order.categoryId;
        if (!categoryId) return;

        // 해당 카테고리의 승인된 Pro 조회
        const prosSnap = await db.collection("homepro_pros")
            .where("categoryId", "==", categoryId)
            .where("status", "==", "approved")
            .get();

        const targetUids = [];
        prosSnap.forEach((doc) => {
            const uid = doc.data().uid;
            // 주문 작성자 본인은 제외
            if (uid && uid !== order.createdBy) {
                targetUids.push(uid);
            }
        });

        const categoryName = order.categoryName || "";
        const address = order.address || "";

        await createNotification(
            "order",
            "새 요청이 들어왔습니다",
            `${categoryName}${address ? " · " + address : ""}`,
            targetUids,
            { orderId: event.params.orderId, categoryId }
        );
    }
);

// ─── 2. 주문 상태 변경 알림 ───
exports.onOrderUpdated = onDocumentUpdated(
    { document: "homepro_orders/{orderId}", region: "asia-northeast3" },
    async (event) => {
        const before = event.data.before.data();
        const after = event.data.after.data();

        // 상태가 변경된 경우만
        if (before.orderStatus === after.orderStatus) return;

        const targetUids = [];
        const updatedBy = after.updatedBy || null;

        // 주문자에게 알림 (본인이 변경한 게 아니면)
        if (after.createdBy && after.createdBy !== updatedBy) {
            targetUids.push(after.createdBy);
        }

        // 배정된 Pro에게 알림 (본인이 변경한 게 아니면)
        if (after.assignedPro && after.assignedPro !== updatedBy && after.assignedPro !== after.createdBy) {
            targetUids.push(after.assignedPro);
        }

        const categoryName = after.categoryName || "";

        await createNotification(
            "order",
            "주문 상태가 변경되었습니다",
            `${categoryName} ${before.orderStatus} → ${after.orderStatus}`,
            targetUids,
            { orderId: event.params.orderId, orderStatus: after.orderStatus }
        );
    }
);

// ─── 채팅 응답 속도 측정 (프로 첫 응답만) ───
exports.onChatMessageResponseTime = onDocumentCreated(
    { document: "chatRooms/{roomId}/messages/{messageId}", region: "asia-northeast3" },
    async (event) => {
        const snap = event.data;
        if (!snap) return;

        const msg = snap.data();
        const roomId = event.params.roomId;
        const senderId = msg.senderId;
        if (!senderId || !msg.createdAt) return;

        // 채팅방 참여자 조회
        const roomDoc = await db.collection("chatRooms").doc(roomId).get();
        if (!roomDoc.exists) return;
        const room = roomDoc.data();
        const participants = room.participants || [];
        if (participants.length < 2) return;

        // senderId가 프로인지 확인
        const userDoc = await db.collection("users").doc(senderId).get();
        if (!userDoc.exists) return;
        const userData = userDoc.data();
        const isPro = userData.role === "pro" || userData.isPro === true;
        if (!isPro) return;

        // 상대방(고객) uid
        const customerUid = participants.find((uid) => uid !== senderId);
        if (!customerUid) return;

        // 해당 방의 메시지를 최신순으로 조회 (현재 메시지 이전)
        const messagesRef = db.collection("chatRooms").doc(roomId).collection("messages");
        const recentMsgs = await messagesRef
            .orderBy("createdAt", "desc")
            .limit(20)
            .get();

        const msgs = [];
        recentMsgs.forEach((d) => {
            if (d.id !== event.params.messageId) {
                msgs.push({ id: d.id, ...d.data() });
            }
        });

        // 직전 메시지가 프로 메시지면 연속 메시지 → 무시
        if (msgs.length > 0 && msgs[0].senderId === senderId) return;

        // 직전 고객 메시지 찾기 (프로가 아닌 첫 메시지)
        let lastCustomerMsg = null;
        for (const m of msgs) {
            if (m.senderId === customerUid && m.createdAt) {
                lastCustomerMsg = m;
                break;
            }
        }
        if (!lastCustomerMsg) return;

        // 응답 시간 계산 (초)
        const proTime = msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt);
        const custTime = lastCustomerMsg.createdAt.toDate
            ? lastCustomerMsg.createdAt.toDate()
            : new Date(lastCustomerMsg.createdAt);
        const responseTimeSec = Math.floor((proTime - custTime) / 1000);
        if (responseTimeSec < 0) return;

        // users/{proUid} 업데이트
        const proRef = db.collection("users").doc(senderId);
        await db.runTransaction(async (tx) => {
            const proSnap = await tx.get(proRef);
            const proData = proSnap.data() || {};
            const newSum = (proData.responseTimeSum || 0) + responseTimeSec;
            const newCount = (proData.responseCount || 0) + 1;
            const newAvg = Math.round(newSum / newCount);
            tx.update(proRef, {
                responseTimeSum: admin.firestore.FieldValue.increment(responseTimeSec),
                responseCount: admin.firestore.FieldValue.increment(1),
                avgResponseTime: newAvg,
            });
        });
    }
);

// ─── 3. 채팅 메시지 알림 ───
exports.onChatMessageCreated = onDocumentCreated(
    { document: "chatRooms/{roomId}/messages/{messageId}", region: "asia-northeast3" },
    async (event) => {
        const snap = event.data;
        if (!snap) return;

        const msg = snap.data();
        const roomId = event.params.roomId;
        const senderId = msg.senderId;
        const senderName = msg.senderName || "알 수 없음";

        // 채팅방 참여자 조회
        const roomDoc = await db.collection("chatRooms").doc(roomId).get();
        if (!roomDoc.exists) return;

        const room = roomDoc.data();
        const targetUids = (room.participants || []).filter((uid) => uid !== senderId);
        if (targetUids.length === 0) return;

        // 메시지 본문 결정
        let body;
        if (msg.type === "image") {
            body = "사진을 보냈습니다";
        } else if (msg.type === "file") {
            body = `파일: ${msg.fileName || "파일"}`;
        } else if (msg.type === "schedule") {
            body = `일정: ${msg.schedule?.title || "일정 공유"}`;
        } else {
            body = (msg.text || "").substring(0, 100) || "새 메시지";
        }

        await createNotification(
            "chat",
            senderName,
            body,
            targetUids,
            { roomId, senderId }
        );
    }
);

// ─── 앱 업데이트 알림 (모든 사용자에게 푸시) ───
exports.onAppUpdate = onDocumentCreated(
    { document: "app_updates/{updateId}", region: "asia-northeast3" },
    async (event) => {
        const snap = event.data;
        if (!snap) return;

        const data = snap.data();
        const version = data.version || "";
        const content = data.content || "";

        // 모든 fcmTokens에서 고유 uid 수집
        const tokenSnap = await db.collection("fcmTokens").get();
        const uidSet = new Set();
        tokenSnap.forEach((doc) => {
            const uid = doc.data().uid;
            if (uid) uidSet.add(uid);
        });

        const targetUids = [...uidSet];
        if (targetUids.length === 0) return;

        await createNotification(
            "update",
            `홈프로 v${version} 업데이트`,
            content || "새로운 버전이 출시되었습니다",
            targetUids,
            { version, updateId: event.params.updateId }
        );
    }
);

/* ─── 테스트 시드/정리 함수 (functions/seed.js) ─── */
const seedFns = require("./seed");
exports.cleanAllTestData = seedFns.cleanAllTestData;
exports.seedTestData = seedFns.seedTestData;
exports.getSeedLoginToken = seedFns.getSeedLoginToken;
