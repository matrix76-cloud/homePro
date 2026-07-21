/* eslint-disable */
/**
 * HomePro 테스트 시드/정리 함수
 * - cleanAllTestData : 화이트리스트 컬렉션 전체 삭제 + Auth users 삭제
 * - seedTestData     : seed-spec.md 기반 데이터 일괄 생성
 *
 * 호출 시 헤더 X-Seed-Secret 필수 (아래 SECRET 상수와 일치해야 통과)
 */
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const db = admin.firestore();
const auth = admin.auth();

// 호출 보안 토큰 (배포 후 외부 호출용)
const SECRET = "homepro-seed-2026-x9k3p";

const REGION = "asia-northeast3";

/* ──────────────────────────────────────────
   3) 시드 계정 로그인용 customToken 발급
   - uid 또는 email 받음 (email은 admin.auth().getUserByEmail로 uid 조회)
   ────────────────────────────────────────── */
exports.getSeedLoginToken = onRequest({ region: REGION, cors: true }, async (req, res) => {
  const secret = req.headers["x-seed-secret"] || req.query.secret;
  if (secret !== SECRET) {
    return res.status(403).json({ error: "forbidden" });
  }
  const uidParam = req.query.uid || (req.body && req.body.uid);
  const emailParam = req.query.email || (req.body && req.body.email);
  if (!uidParam && !emailParam) {
    return res.status(400).json({ error: "uid or email required" });
  }
  try {
    let targetUid = uidParam;
    if (!targetUid && emailParam) {
      const userRecord = await auth.getUserByEmail(emailParam);
      targetUid = userRecord.uid;
    }
    const token = await auth.createCustomToken(targetUid);
    return res.json({ token, uid: targetUid });
  } catch (e) {
    return res.status(500).json({ error: e.message, code: e.code });
  }
});

/* ──────────────────────────────────────────
   화이트리스트: 정리 대상 컬렉션
   ────────────────────────────────────────── */
const COLLECTIONS_TO_WIPE = [
  "homepro_orders",
  "homepro_worker_requests",
  "homepro_marketplace",
  "homepro_trainings",
  "homepro_cash",
  "chatRooms",
  "users",
  "phones",
  "homepro_subscriptions",
  "homepro_blacklist",
  "homepro_pros",
  "community_posts",
  "homepro_contracts",
];

const ORDER_SUBCOLLECTIONS = ["applicants", "quotes", "reviews", "messages"];
const CHAT_SUBCOLLECTIONS = ["messages"];

async function deleteCollection(collectionPath, batchSize = 100) {
  const ref = db.collection(collectionPath);
  let totalDeleted = 0;
  while (true) {
    const snap = await ref.limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    totalDeleted += snap.size;
    if (snap.size < batchSize) break;
  }
  return totalDeleted;
}

async function deleteSubcollection(parentRef, subPath) {
  const subRef = parentRef.collection(subPath);
  const snap = await subRef.get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

async function deleteAllAuthUsers() {
  let total = 0;
  let nextPageToken = undefined;
  while (true) {
    const result = await auth.listUsers(1000, nextPageToken);
    if (result.users.length === 0) break;
    const uids = result.users.map((u) => u.uid);
    // 1000개씩 일괄 삭제
    await auth.deleteUsers(uids);
    total += uids.length;
    if (!result.pageToken) break;
    nextPageToken = result.pageToken;
  }
  return total;
}

/* ──────────────────────────────────────────
   1) 정리 함수 — cleanAllTestData
   ────────────────────────────────────────── */
exports.cleanAllTestData = onRequest({ region: REGION, cors: true, timeoutSeconds: 300 }, async (req, res) => {
  if (req.headers["x-seed-secret"] !== SECRET) {
    return res.status(403).json({ error: "forbidden" });
  }
  try {
    const result = { collections: {}, authUsers: 0 };

    // 1) 오더 서브컬렉션 먼저 비우기
    const ordersSnap = await db.collection("homepro_orders").get();
    let subDeleted = 0;
    for (const doc of ordersSnap.docs) {
      for (const sub of ORDER_SUBCOLLECTIONS) {
        subDeleted += await deleteSubcollection(doc.ref, sub);
      }
    }
    result.orderSubcollections = subDeleted;

    // 2) 채팅 서브컬렉션
    const chatSnap = await db.collection("chatRooms").get();
    let chatSubDeleted = 0;
    for (const doc of chatSnap.docs) {
      for (const sub of CHAT_SUBCOLLECTIONS) {
        chatSubDeleted += await deleteSubcollection(doc.ref, sub);
      }
    }
    result.chatSubcollections = chatSubDeleted;

    // 3) 화이트리스트 컬렉션 wipe
    for (const col of COLLECTIONS_TO_WIPE) {
      result.collections[col] = await deleteCollection(col);
    }

    // 4) _isSeed 한정 정리 (notifications — 운영 데이터 보존)
    const notifSnap = await db.collection("notifications").where("_isSeed", "==", true).get();
    let notifDeleted = 0;
    if (!notifSnap.empty) {
      const batch = db.batch();
      notifSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      notifDeleted = notifSnap.size;
    }
    result.notifications = notifDeleted;

    // 5) Auth 사용자 전체 삭제
    result.authUsers = await deleteAllAuthUsers();

    return res.json({ ok: true, result });
  } catch (e) {
    console.error("cleanAllTestData error:", e);
    return res.status(500).json({ error: e.message, stack: e.stack });
  }
});

/* ──────────────────────────────────────────
   시드 데이터 정의 (seed-spec.md 와 일치)
   ────────────────────────────────────────── */

const ACCOUNTS = [
  // 의뢰자
  { id: "A1", uid: "seed_A1", nickname: "성실한청소부",   phone: "+821000000001", region: { sido: "서울", gu: "강남구" }, role: "client", referredBy: null },
  { id: "A2", uid: "seed_A2", nickname: "부지런한사장",   phone: "+821090010001", region: { sido: "부산", gu: "해운대구" }, role: "client", referredBy: "seed_A1" },
  { id: "A3", uid: "seed_A3", nickname: "똑똑한대표",     phone: "+821090010002", region: { sido: "대전", gu: "서구" }, role: "client", referredBy: null },
  { id: "A4", uid: "seed_A4", nickname: "친절한매니저",   phone: "+821090010003", region: { sido: "충남", gu: "논산시" }, role: "client", referredBy: "seed_A1" },
  { id: "A5", uid: "seed_A5", nickname: "빠른오너",       phone: "+821090010004", region: { sido: "충북", gu: "청주시 상당구" }, role: "client", referredBy: null },
  // 홈프로 (메인)
  { id: "B1", uid: "seed_B1", nickname: "용감한강아지",   phone: "+821000000003", region: { sido: "서울", gu: "마포구" }, role: "pro", referredBy: "seed_A1", proCategories: ["special_cleaning", "leak_detection"] },
  { id: "B2", uid: "seed_B2", nickname: "든든한기술자",   phone: "+821090020001", region: { sido: "서울", gu: "강서구" }, role: "pro", referredBy: null, proCategories: ["move_cleaning", "partial_interior"] },
  { id: "B3", uid: "seed_B3", nickname: "노련한장인",     phone: "+821090020002", region: { sido: "광주", gu: "광산구" }, role: "pro", referredBy: null, proCategories: ["leak_detection", "partial_interior"] },
  { id: "B4", uid: "seed_B4", nickname: "정직한작업자",   phone: "+821090020003", region: { sido: "경기", gu: "수원시 영통구" }, role: "pro", referredBy: null, proCategories: ["appliance_cleaning"] },
  // 홈프로 (단순 지원자 풀)
  { id: "B5", uid: "seed_B5", nickname: "성실프로A", phone: "+821090020005", region: { sido: "서울", gu: "송파구" }, role: "pro", referredBy: null, proCategories: ["leak_detection"] },
  { id: "B6", uid: "seed_B6", nickname: "성실프로B", phone: "+821090020006", region: { sido: "부산", gu: "부산진구" }, role: "pro", referredBy: null, proCategories: ["leak_detection"] },
  { id: "B7", uid: "seed_B7", nickname: "성실프로C", phone: "+821090020007", region: { sido: "대구", gu: "수성구" }, role: "pro", referredBy: null, proCategories: ["partial_interior"] },
  { id: "B8", uid: "seed_B8", nickname: "성실프로D", phone: "+821090020008", region: { sido: "인천", gu: "남동구" }, role: "pro", referredBy: null, proCategories: ["partial_interior"] },
  { id: "B9", uid: "seed_B9", nickname: "성실프로E", phone: "+821090020009", region: { sido: "울산", gu: "남구" }, role: "pro", referredBy: null, proCategories: ["partial_interior"] },
];

// 카테고리 ID 매핑 (homeproConfig.js의 CATEGORIES와 일치)
// 도배·타일은 별도 카테고리가 아니라 partial_interior(부분 인테리어)의 subcategory.
const CAT = {
  special_cleaning: "special_cleaning",   // 특수청소
  move_cleaning: "move_cleaning",         // 이사청소
  leak_detection: "leak_detection",       // 누수탐지
  appliance_cleaning: "appliance_cleaning", // 가전분해청소
  partial_interior: "partial_interior",   // 부분 인테리어 (도배/타일시공 포함)
};

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function ts(date) {
  return admin.firestore.Timestamp.fromDate(date);
}

/* ──────────────────────────────────────────
   2) 시드 함수 — seedTestData
   ────────────────────────────────────────── */
exports.seedTestData = onRequest({ region: REGION, cors: true, timeoutSeconds: 540 }, async (req, res) => {
  if (req.headers["x-seed-secret"] !== SECRET) {
    return res.status(403).json({ error: "forbidden" });
  }
  try {
    const password = "Test1234!";
    const created = { users: 0, orders: 0, applicants: 0, quotes: 0, reviews: 0, chatRooms: 0, posts: 0, cash: 0 };

    /* ── 1. 계정 생성 ── */
    for (const acc of ACCOUNTS) {
      // Auth 사용자 생성
      try {
        await auth.createUser({
          uid: acc.uid,
          phoneNumber: acc.phone,
          displayName: acc.nickname,
          password,
        });
      } catch (e) {
        if (e.code !== "auth/uid-already-exists") {
          throw new Error(`auth.createUser ${acc.uid}: ${e.message}`);
        }
      }
      // Firestore users 문서
      await db.collection("users").doc(acc.uid).set({
        uid: acc.uid,
        nickname: acc.nickname,
        name: acc.nickname,
        phoneNumber: acc.phone,
        phoneE164: acc.phone,
        region: acc.region,
        userType: acc.role === "client" ? "member" : "pro",
        roles: acc.role === "client" ? ["member"] : ["member", "pro"],
        proCategories: acc.proCategories || [],
        referralPoints: 100,        // 가입 보상 100P
        totalEarnedPoints: 100,
        grade: "rookie",
        referredBy: acc.referredBy,
        walletAddress: null,
        _isSeed: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      // phones 인덱스
      await db.collection("phones").doc(acc.phone).set({
        uid: acc.uid,
        phoneE164: acc.phone,
        _isSeed: true,
      });
      // 가입 보상 ledger
      await db.collection("homepro_cash").add({
        uid: acc.uid,
        userName: acc.nickname,
        type: "earn",
        amount: 100,
        reason: "친구 초대 보상",
        category: "referral_invite",
        _isSeed: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      created.users += 1;
      created.cash += 1;
    }

    /* ── 2. 오더 22개 ── */
    const baseOrder = (overrides) => ({
      orderStatus: "요청",
      applicantCount: 0,
      hiddenBy: [],
      photos: [],
      _isSeed: true,
      createdAt: ts(daysAgo(0)),
      ...overrides,
    });

    const ORDERS = [
      // 접수 6개
      { id: "O1", data: baseOrder({ createdBy: "seed_A1", writer: "성실한청소부", categoryId: CAT.special_cleaning, categoryName: "특수청소", title: "특수청소 견적요청", location: "서울특별시 강남구 역삼동", b2bPriceType: "fixed", b2bPriceAmount: 320000, price: "320,000원", priceType: "direct", directPrice: "320000", matchType: "priority" })},
      { id: "O2", data: baseOrder({ createdBy: "seed_A2", writer: "부지런한사장", categoryId: CAT.leak_detection, categoryName: "누수탐지", title: "누수탐지 잔금 90K", location: "부산광역시 해운대구 우동", b2bPriceType: "balance", b2bPriceAmount: 90000, price: "90,000원", priceType: "direct", directPrice: "90000", matchType: "priority" })},
      { id: "O3", data: baseOrder({ createdBy: "seed_A3", writer: "똑똑한대표", categoryId: CAT.partial_interior, categoryName: "부분 인테리어", subcategory: "도배", title: "도배 견적요청", location: "대전광역시 서구 둔산동", b2bPriceType: "estimate", price: "견적요청", priceType: "negotiate", matchType: "compare", applicantCount: 0 })},
      { id: "O4", data: baseOrder({ createdBy: "seed_A4", writer: "친절한매니저", categoryId: CAT.appliance_cleaning, categoryName: "가전분해청소", title: "가전청소 H-포인트 결제", location: "충남 논산시 시민로", b2bPriceType: "hpoint", b2bPriceAmount: 50000, price: "50,000P", priceType: "direct", directPrice: "50000", matchType: "direct", directPhone: "+821090020003" })},
      { id: "O5", data: baseOrder({ createdBy: "seed_A5", writer: "빠른오너", categoryId: CAT.partial_interior, categoryName: "부분 인테리어", subcategory: "타일시공", title: "타일 시공 현장견적", location: "충북 청주시 상당구", b2bPriceType: "onsite", price: "현장견적", priceType: "negotiate", matchType: "priority" })},
      { id: "O6", data: baseOrder({ createdBy: "seed_A1", writer: "성실한청소부", categoryId: CAT.move_cleaning, categoryName: "이사청소", title: "이사청소 800K", location: "서울특별시 강남구 삼성동", b2bPriceType: "fixed", b2bPriceAmount: 800000, price: "800,000원", priceType: "direct", directPrice: "800000", matchType: "priority" })},

      // 대기 1개
      { id: "O7", data: baseOrder({ createdBy: "seed_A2", writer: "부지런한사장", categoryId: CAT.appliance_cleaning, categoryName: "가전분해청소", title: "가전청소 잔금", location: "부산광역시 해운대구 좌동", b2bPriceType: "balance", b2bPriceAmount: 120000, price: "120,000원", priceType: "direct", directPrice: "120000", matchType: "priority", orderStatus: "대기" })},

      // 비교선택 2개 (지원자 3명씩 별도 적재)
      { id: "O8", data: baseOrder({ createdBy: "seed_A1", writer: "성실한청소부", categoryId: CAT.leak_detection, categoryName: "누수탐지", title: "누수탐지 견적요청 (비교선택)", location: "서울특별시 강남구 역삼동", b2bPriceType: "estimate", price: "견적요청", priceType: "negotiate", matchType: "compare", orderStatus: "업체선택대기", applicantCount: 3 })},
      { id: "O9", data: baseOrder({ createdBy: "seed_A3", writer: "똑똑한대표", categoryId: CAT.partial_interior, categoryName: "부분 인테리어", subcategory: "타일시공", title: "타일 시공 현장견적 (비교선택)", location: "대전광역시 서구 둔산동", b2bPriceType: "onsite", price: "현장견적", priceType: "negotiate", matchType: "compare", orderStatus: "업체선택대기", applicantCount: 3 })},

      // 배정 4개
      { id: "O10", data: baseOrder({ createdBy: "seed_A1", writer: "성실한청소부", categoryId: CAT.special_cleaning, categoryName: "특수청소", title: "특수청소 진행중", location: "서울특별시 강남구 신사동", b2bPriceType: "fixed", b2bPriceAmount: 200000, price: "200,000원", priceType: "direct", directPrice: "200000", matchType: "priority", orderStatus: "배정", matchedProUid: "seed_B1" })},
      { id: "O11", data: baseOrder({ createdBy: "seed_A2", writer: "부지런한사장", categoryId: CAT.partial_interior, categoryName: "부분 인테리어", subcategory: "도배", title: "도배 견적후 배정", location: "부산광역시 해운대구 우동", b2bPriceType: "estimate", price: "견적요청", priceType: "negotiate", matchType: "compare", orderStatus: "배정", matchedProUid: "seed_B2" })},
      { id: "O12", data: baseOrder({ createdBy: "seed_A4", writer: "친절한매니저", categoryId: CAT.appliance_cleaning, categoryName: "가전분해청소", title: "가전청소 지정배정", location: "충남 논산시 강경읍", b2bPriceType: "hpoint", b2bPriceAmount: 80000, price: "80,000P", priceType: "direct", directPrice: "80000", matchType: "direct", directPhone: "+821090020003", orderStatus: "배정", matchedProUid: "seed_B4" })},
      { id: "O13", data: baseOrder({ createdBy: "seed_A5", writer: "빠른오너", categoryId: CAT.partial_interior, categoryName: "부분 인테리어", subcategory: "타일시공", title: "타일 잔금 배정", location: "충북 청주시 상당구", b2bPriceType: "balance", b2bPriceAmount: 350000, price: "350,000원", priceType: "direct", directPrice: "350000", matchType: "priority", orderStatus: "배정", matchedProUid: "seed_B3" })},

      // 완료 3개
      { id: "O14", data: baseOrder({ createdBy: "seed_A1", writer: "성실한청소부", categoryId: CAT.leak_detection, categoryName: "누수탐지", title: "누수탐지 완료", location: "서울특별시 강남구 청담동", b2bPriceType: "fixed", b2bPriceAmount: 150000, price: "150,000원", priceType: "direct", directPrice: "150000", matchType: "priority", orderStatus: "완료", matchedProUid: "seed_B1" })},
      { id: "O15", data: baseOrder({ createdBy: "seed_A3", writer: "똑똑한대표", categoryId: CAT.partial_interior, categoryName: "부분 인테리어", subcategory: "도배", title: "도배 완료", location: "대전광역시 서구 갈마동", b2bPriceType: "balance", b2bPriceAmount: 400000, price: "400,000원", priceType: "direct", directPrice: "400000", matchType: "priority", orderStatus: "완료", matchedProUid: "seed_B2" })},
      { id: "O16", data: baseOrder({ createdBy: "seed_A5", writer: "빠른오너", categoryId: CAT.partial_interior, categoryName: "부분 인테리어", subcategory: "타일시공", title: "타일 현장견적 완료", location: "충북 청주시 상당구", b2bPriceType: "onsite", price: "견적 280,000원", priceType: "negotiate", matchType: "priority", orderStatus: "완료", matchedProUid: "seed_B3" })},

      // 취소 2개
      { id: "O17", data: baseOrder({ createdBy: "seed_A2", writer: "부지런한사장", categoryId: CAT.leak_detection, categoryName: "누수탐지", title: "누수탐지 취소건", location: "부산광역시 해운대구 중동", b2bPriceType: "fixed", b2bPriceAmount: 100000, price: "100,000원", priceType: "direct", directPrice: "100000", matchType: "priority", orderStatus: "취소", cancelReason: "잘못접수" })},
      { id: "O18", data: baseOrder({ createdBy: "seed_A4", writer: "친절한매니저", categoryId: CAT.partial_interior, categoryName: "부분 인테리어", subcategory: "도배", title: "도배 취소건", location: "충남 논산시 시민로", b2bPriceType: "estimate", price: "견적요청", priceType: "negotiate", matchType: "compare", orderStatus: "취소", cancelReason: "일정변경" })},

      // 지난 오더 4개 (createdAt 과거)
      { id: "O19", data: baseOrder({ createdBy: "seed_A1", writer: "성실한청소부", categoryId: CAT.special_cleaning, categoryName: "특수청소", title: "어제 완료 건", location: "서울특별시 강남구 도곡동", b2bPriceType: "fixed", b2bPriceAmount: 180000, price: "180,000원", priceType: "direct", directPrice: "180000", matchType: "priority", orderStatus: "완료", matchedProUid: "seed_B1", createdAt: ts(daysAgo(1)) })},
      { id: "O20", data: baseOrder({ createdBy: "seed_A3", writer: "똑똑한대표", categoryId: CAT.partial_interior, categoryName: "부분 인테리어", subcategory: "타일시공", title: "3일전 완료 건", location: "대전광역시 서구 둔산동", b2bPriceType: "balance", b2bPriceAmount: 250000, price: "250,000원", priceType: "direct", directPrice: "250000", matchType: "priority", orderStatus: "완료", matchedProUid: "seed_B3", createdAt: ts(daysAgo(3)) })},
      { id: "O21", data: baseOrder({ createdBy: "seed_A2", writer: "부지런한사장", categoryId: CAT.leak_detection, categoryName: "누수탐지", title: "1주전 취소", location: "부산광역시 해운대구 좌동", b2bPriceType: "fixed", b2bPriceAmount: 80000, price: "80,000원", priceType: "direct", directPrice: "80000", matchType: "priority", orderStatus: "취소", cancelReason: "기타", createdAt: ts(daysAgo(7)) })},
      { id: "O22", data: baseOrder({ createdBy: "seed_A1", writer: "성실한청소부", categoryId: CAT.move_cleaning, categoryName: "이사청소", title: "1개월전 완료", location: "서울특별시 강남구 역삼동", b2bPriceType: "fixed", b2bPriceAmount: 600000, price: "600,000원", priceType: "direct", directPrice: "600000", matchType: "priority", orderStatus: "완료", matchedProUid: "seed_B1", createdAt: ts(daysAgo(30)) })},
    ];

    for (const o of ORDERS) {
      await db.collection("homepro_orders").doc(o.id).set(o.data);
      created.orders += 1;
    }

    /* ── 3. 비교선택 오더 지원자 (O8, O9 각 3명) ── */
    const APPLICANTS = [
      { orderId: "O8", proUid: "seed_B1", proName: "용감한강아지", proProfile: "" },
      { orderId: "O8", proUid: "seed_B5", proName: "성실프로A", proProfile: "" },
      { orderId: "O8", proUid: "seed_B6", proName: "성실프로B", proProfile: "" },
      { orderId: "O9", proUid: "seed_B3", proName: "노련한장인", proProfile: "" },
      { orderId: "O9", proUid: "seed_B7", proName: "성실프로C", proProfile: "" },
      { orderId: "O9", proUid: "seed_B8", proName: "성실프로D", proProfile: "" },
    ];
    for (const a of APPLICANTS) {
      await db.collection("homepro_orders").doc(a.orderId).collection("applicants").add({
        ...a,
        appliedAt: admin.firestore.FieldValue.serverTimestamp(),
        rejected: false,
        _isSeed: true,
      });
      created.applicants += 1;
    }

    /* ── 4. 견적 (비교선택 오더의 지원자 견적) ── */
    const QUOTES = [
      { orderId: "O8", proUid: "seed_B1", proName: "용감한강아지", price: 80000, message: "당일 출장 가능합니다", proGrade: "rookie" },
      { orderId: "O8", proUid: "seed_B5", proName: "성실프로A",   price: 100000, message: "기본 출장료 포함", proGrade: "rookie" },
      { orderId: "O8", proUid: "seed_B6", proName: "성실프로B",   price: 70000,  message: "친절히 봐드립니다", proGrade: "rookie" },
      { orderId: "O9", proUid: "seed_B3", proName: "노련한장인",   price: 250000, message: "고급 자재 사용", proGrade: "rookie" },
      { orderId: "O9", proUid: "seed_B7", proName: "성실프로C",   price: 220000, message: "표준 시공", proGrade: "rookie" },
      { orderId: "O9", proUid: "seed_B8", proName: "성실프로D",   price: 280000, message: "고품질 마감", proGrade: "rookie" },
    ];
    for (const q of QUOTES) {
      await db.collection("homepro_orders").doc(q.orderId).collection("quotes").add({
        ...q,
        proPhoto: "",
        status: "submitted",
        _isSeed: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      created.quotes += 1;
    }

    /* ── 5. 리뷰 (완료 오더 3건) ── */
    const REVIEWS = [
      { orderId: "O14", reviewerUid: "seed_A1", reviewerName: "성실한청소부", targetUid: "seed_B1", rating: 5, content: "친절했음", _isSeed: true },
      { orderId: "O15", reviewerUid: "seed_A3", reviewerName: "똑똑한대표",   targetUid: "seed_B2", rating: 4, content: "깔끔하게 마무리해주셨어요", _isSeed: true },
      { orderId: "O16", reviewerUid: "seed_A5", reviewerName: "빠른오너",     targetUid: "seed_B3", rating: 5, content: "현장 견적 합리적이었어요", _isSeed: true },
    ];
    for (const r of REVIEWS) {
      await db.collection("homepro_orders").doc(r.orderId).collection("reviews").add({
        ...r,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      // 리뷰 작성 보상
      await db.collection("homepro_cash").add({
        uid: r.reviewerUid,
        userName: r.reviewerName,
        type: "earn",
        amount: 30,
        reason: "리뷰 작성 보상",
        category: "review",
        relatedDocId: r.orderId,
        _isSeed: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      // 사용자 잔액 +30
      await db.collection("users").doc(r.reviewerUid).update({
        referralPoints: admin.firestore.FieldValue.increment(30),
        totalEarnedPoints: admin.firestore.FieldValue.increment(30),
      });
      created.reviews += 1;
      created.cash += 1;
    }

    /* ── 6. 채팅방 (배정 오더 4개) + 메시지 서브컬렉션 ── */
    const CHATS = [
      {
        orderId: "O10", a: "seed_A1", aName: "성실한청소부", b: "seed_B1", bName: "용감한강아지",
        lastMessage: "내일 오전 10시에 도착하겠습니다",
        messages: [
          { senderUid: "seed_A1", senderName: "성실한청소부", text: "안녕하세요, 수락 감사합니다", offsetMin: -180 },
          { senderUid: "seed_B1", senderName: "용감한강아지", text: "네 일정 확인했습니다", offsetMin: -160 },
          { senderUid: "seed_A1", senderName: "성실한청소부", text: "현장 주소는 강남구 신사동입니다", offsetMin: -140 },
          { senderUid: "seed_B1", senderName: "용감한강아지", text: "내일 오전 10시에 도착하겠습니다", offsetMin: -120 },
        ],
      },
      {
        orderId: "O11", a: "seed_A2", aName: "부지런한사장", b: "seed_B2", bName: "든든한기술자",
        lastMessage: "견적 수락했습니다 감사합니다",
        messages: [
          { senderUid: "seed_B2", senderName: "든든한기술자", text: "견적 80,000원으로 제안드립니다", offsetMin: -240 },
          { senderUid: "seed_A2", senderName: "부지런한사장", text: "조금 더 협의 가능할까요?", offsetMin: -220 },
          { senderUid: "seed_B2", senderName: "든든한기술자", text: "75,000원까지 가능합니다", offsetMin: -200 },
          { senderUid: "seed_A2", senderName: "부지런한사장", text: "견적 수락했습니다 감사합니다", offsetMin: -60 },
        ],
      },
      {
        orderId: "O12", a: "seed_A4", aName: "친절한매니저", b: "seed_B4", bName: "정직한작업자",
        lastMessage: "지정 감사합니다 진행하겠습니다",
        messages: [
          { senderUid: "seed_A4", senderName: "친절한매니저", text: "가전청소 지정으로 요청드립니다", offsetMin: -300 },
          { senderUid: "seed_B4", senderName: "정직한작업자", text: "확인했습니다, H-포인트 80,000P 결제 처리하시면 진행합니다", offsetMin: -280 },
          { senderUid: "seed_A4", senderName: "친절한매니저", text: "결제 완료했습니다", offsetMin: -260 },
          { senderUid: "seed_B4", senderName: "정직한작업자", text: "지정 감사합니다 진행하겠습니다", offsetMin: -240 },
        ],
      },
      {
        orderId: "O13", a: "seed_A5", aName: "빠른오너", b: "seed_B3", bName: "노련한장인",
        lastMessage: "현재 작업 중입니다",
        messages: [
          { senderUid: "seed_B3", senderName: "노련한장인", text: "타일 시공 들어갑니다", offsetMin: -480 },
          { senderUid: "seed_A5", senderName: "빠른오너",   text: "잘 부탁드립니다", offsetMin: -460 },
          { senderUid: "seed_B3", senderName: "노련한장인", text: "현재 작업 중입니다", offsetMin: -30 },
        ],
      },
    ];
    for (const c of CHATS) {
      const chatRef = await db.collection("chatRooms").add({
        orderId: c.orderId,
        roomType: "quote",
        participants: [c.a, c.b],
        participantNames: { [c.a]: c.aName, [c.b]: c.bName },
        lastMessage: c.lastMessage,
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        unreadCount: { [c.a]: 0, [c.b]: 0 },
        _isSeed: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      for (const m of c.messages) {
        const sentAt = new Date(Date.now() + (m.offsetMin || 0) * 60 * 1000);
        await chatRef.collection("messages").add({
          senderUid: m.senderUid,
          senderName: m.senderName,
          text: m.text,
          readBy: [m.senderUid],
          source: m.source || "user",
          _isSeed: true,
          createdAt: ts(sentAt),
        });
      }
      created.chatRooms += 1;
    }

    /* ── 7. 작업자요청 4개 ── */
    const WORKER_REQUESTS = [
      { category: "입주청소",   detail: "30평 아파트 입주청소", siteAddr: "서울 강남구 역삼동", workDate: "내일", workTime: "하루 08:00~17:00", wage: 200000, headcount: 2, createdBy: "seed_A1", writer: "성실한청소부" },
      { category: "도배공",     detail: "사무실 30평 도배",     siteAddr: "대전 서구 둔산동",   workDate: "오늘", workTime: "오전 08:00~12:00", wage: 350000, headcount: 1, createdBy: "seed_A3", writer: "똑똑한대표" },
      { category: "보통인부",   detail: "공사 보조 인력",       siteAddr: "충북 청주시 상당구", workDate: "긴급", workTime: "하루 08:00~17:00", wage: 150000, headcount: 3, createdBy: "seed_A5", writer: "빠른오너" },
      { category: "스카이차",   detail: "고소작업 1일 임대",    siteAddr: "부산 해운대구 우동", workDate: "내일", workTime: "오전 08:00~12:00", wage: 500000, headcount: 1, createdBy: "seed_A2", writer: "부지런한사장" },
    ];
    for (const w of WORKER_REQUESTS) {
      await db.collection("homepro_worker_requests").add({
        ...w,
        status: "접수",
        _isSeed: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      created.posts += 1;
    }

    /* ── 8. 도급·양도·매매 5개 ── */
    const MARKETPLACE = [
      { tradeType: "시공도급",     memberType: "사업자", title: "강남 카페 인테리어 시공도급",  amount: 50000000,  contractType: "도급",     description: "30평 카페 신규 인테리어. 자재 별도.", region: "서울 강남구",   createdBy: "seed_A1", writer: "성실한청소부" },
      { tradeType: "사업권양도",   memberType: "법인",   title: "부산 청소업체 사업권 양도",     amount: 30000000,  contractType: "부분양도", description: "운영 5년차 청소업체 사업권 양도",      region: "부산 해운대구", createdBy: "seed_A2", writer: "부지런한사장" },
      { tradeType: "장비매매",     memberType: "개인",   title: "스카이차 23M 매매",            amount: 80000000,  contractType: "일괄매매", description: "23M 스카이차 1년 사용",                region: "대전 서구",     createdBy: "seed_A3", writer: "똑똑한대표" },
      { tradeType: "물품매매",     memberType: "사업자", title: "청소장비 일체 매매",            amount: 5000000,   contractType: "일괄매매", description: "업소용 청소장비 풀세트",               region: "충남 논산시",   createdBy: "seed_A4", writer: "친절한매니저" },
      { tradeType: "업체인수양도", memberType: "법인",   title: "청주 청소업체 인수양도",        amount: 100000000, contractType: "협의",     description: "10년차 청소업체 전체 인수",            region: "충북 청주시",   createdBy: "seed_A5", writer: "빠른오너" },
    ];
    for (const m of MARKETPLACE) {
      await db.collection("homepro_marketplace").add({
        ...m,
        memberType: m.memberType,
        companyName: m.writer,
        managerName: m.writer,
        contact: "+821000000000",
        status: "active",
        _isSeed: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      created.posts += 1;
    }

    /* ── 9. 기술전수교육 3개 ── */
    const TRAININGS = [
      { title: "특수청소 노하우 전수",  field: "특수청소", description: "화재·곰팡이·고독사 현장 정리 노하우",      instructor: "용감한강아지", methods: ["현장교육","실습교육"], priceType: "유료", price: 500000, region: { sido: "서울", gu: "마포구" }, location: "서울 마포구",   contact: "010-9002-3001", createdBy: "seed_B1" },
      { title: "도배 입문 과정",        field: "도배",     description: "도배 기초부터 실전까지",                  instructor: "든든한기술자", methods: ["이론교육","실습교육"], priceType: "무료", price: 0,      region: { sido: "서울", gu: "강서구" }, location: "서울 강서구",   contact: "010-9002-0001", createdBy: "seed_B2" },
      { title: "타일 시공 마스터 클래스", field: "타일",     description: "타일 시공 고급 기법",                    instructor: "노련한장인",   methods: ["현장교육"],            priceType: "협의", price: 0,      region: { sido: "광주", gu: "광산구" }, location: "광주 광산구",   contact: "010-9002-0002", createdBy: "seed_B3" },
    ];
    for (const t of TRAININGS) {
      await db.collection("homepro_trainings").add({
        ...t,
        startDate: null,
        endDate: null,
        startTime: "협의",
        capacity: null,
        status: "모집중",
        _isSeed: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      created.posts += 1;
    }

    /* ── 10. 등급 차등 적용 (B 그룹) ── */
    // 등급 임계값: rookie 0 / bronze 500 / silver 2000 / gold 5000 / diamond 15000 / master 50000
    const GRADE_OVERRIDES = [
      { uid: "seed_B1", totalEarnedPoints: 5500,  referralPoints: 5500,  grade: "gold" },
      { uid: "seed_B2", totalEarnedPoints: 2300,  referralPoints: 2300,  grade: "silver" },
      { uid: "seed_B3", totalEarnedPoints: 16000, referralPoints: 16000, grade: "diamond" },
      { uid: "seed_B4", totalEarnedPoints: 850,   referralPoints: 850,   grade: "bronze" },
      { uid: "seed_B5", totalEarnedPoints: 700,   referralPoints: 700,   grade: "bronze" },
      { uid: "seed_B7", totalEarnedPoints: 3200,  referralPoints: 3200,  grade: "silver" },
    ];
    for (const g of GRADE_OVERRIDES) {
      await db.collection("users").doc(g.uid).update({
        totalEarnedPoints: g.totalEarnedPoints,
        referralPoints: g.referralPoints,
        grade: g.grade,
      });
    }
    created.gradeOverrides = GRADE_OVERRIDES.length;

    /* ── 11. 지갑 주소 등록 (A1, B1) ── */
    const WALLETS = [
      { uid: "seed_A1", walletAddress: "0xAbC1234567890DefAbC1234567890DefAbC12345" },
      { uid: "seed_B1", walletAddress: "0xDe0987654321FeDcBa0987654321FeDcBa098765" },
    ];
    for (const w of WALLETS) {
      await db.collection("users").doc(w.uid).update({
        walletAddress: w.walletAddress,
        walletUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    created.wallets = WALLETS.length;

    /* ── 12. 월 구독 (B1 active) + 결제 ledger + A1 추천인 보상(3%) ── */
    await db.collection("homepro_subscriptions").add({
      uid: "seed_B1",
      userName: "용감한강아지",
      status: "active",
      paymentMethod: "point",
      monthlyPoint: 16500,
      startDate: admin.firestore.FieldValue.serverTimestamp(),
      nextBillingDate: ts(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      _isSeed: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection("homepro_cash").add({
      uid: "seed_B1",
      userName: "용감한강아지",
      type: "spend",
      amount: -16500,
      reason: "월 구독료",
      category: "subscription",
      _isSeed: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // 추천인 보상 3% (B1의 referredBy = A1) — 16500 * 0.03 = 495
    await db.collection("homepro_cash").add({
      uid: "seed_A1",
      userName: "(추천인 보상)",
      type: "earn",
      amount: 495,
      reason: "월 구독료 — 추천인 보상",
      category: "referral_reward",
      relatedUid: "seed_B1",
      _isSeed: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection("users").doc("seed_A1").update({
      referralPoints: admin.firestore.FieldValue.increment(495),
      totalEarnedPoints: admin.firestore.FieldValue.increment(495),
    });
    created.subscriptions = 1;
    created.cash += 2;

    /* ── 13. 블랙리스트 1건 (B4 → A2 차단) ── */
    await db.collection("homepro_blacklist").add({
      reporterUid: "seed_B4",
      targetUid: "seed_A2",
      reason: "이전 거래에서 연락 두절",
      _isSeed: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    created.blacklist = 1;

    /* ── 14. 지정배정 거절 기록 (O4 applicants에 B 측 거절) ── */
    // O4는 A4 → B4 지정배정 + 접수 상태. B4가 일정조율불가로 거절한 흔적.
    await db.collection("homepro_orders").doc("O4").collection("applicants").add({
      proUid: "seed_B4",
      proName: "정직한작업자",
      proProfile: "",
      rejected: true,
      rejectReason: "시간조율불가",
      rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
      _isSeed: true,
      appliedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    created.applicants += 1;

    /* ── 15. 마켓플레이스 사진 URL (placeholder 4장씩) ── */
    const marketSnap = await db.collection("homepro_marketplace").where("_isSeed", "==", true).get();
    let marketIdx = 0;
    for (const doc of marketSnap.docs) {
      marketIdx += 1;
      const images = [
        `https://picsum.photos/seed/market${marketIdx}a/600/600`,
        `https://picsum.photos/seed/market${marketIdx}b/600/600`,
        `https://picsum.photos/seed/market${marketIdx}c/600/600`,
        `https://picsum.photos/seed/market${marketIdx}d/600/600`,
      ];
      await doc.ref.update({ images, writerPhoto: "" });
    }
    created.marketImages = marketSnap.size;

    /* ── 16. 작업자요청 응답 (B 측에서 지원 — applicants 배열) ── */
    const workerSnap = await db.collection("homepro_worker_requests").where("_isSeed", "==", true).get();
    if (!workerSnap.empty) {
      const firstWorker = workerSnap.docs[0]; // 입주청소
      await firstWorker.ref.update({
        applicants: admin.firestore.FieldValue.arrayUnion(
          {
            uid: "seed_B5",
            name: "성실프로A",
            photo: "",
            message: "당일 가능합니다, 도구 지참",
            createdAt: admin.firestore.Timestamp.now(),
          },
          {
            uid: "seed_B6",
            name: "성실프로B",
            photo: "",
            message: "2명 한 팀으로 갈 수 있습니다",
            createdAt: admin.firestore.Timestamp.now(),
          }
        ),
        applicantCount: 2,
        lastApplicantAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      created.workerApplicants = 2;
    }

    /* ── 17. settings/point_rules ._policy + settings/grade_rules ── */
    await db.collection("settings").doc("point_rules").set({
      _policy: {
        networkFeeRate: 0.05,
        referralRewardRate: 0.03,
        swapRate: 1,
        monthlySubscriptionPoint: 16500,
      },
      referral_invite:    { amount: 100, label: "친구 초대 보상", active: true },
      referral_signup:    { amount: 100, label: "추천코드 사용 보상", active: true },
      order_create:       { amount: 50,  label: "오더 작성 보상", active: true },
      community_post:     { amount: 30,  label: "게시글 작성 보상", active: true },
      community_like_10:  { amount: 50,  label: "게시물 하트 10개 달성", active: true },
      community_like_50:  { amount: 100, label: "게시물 하트 50개 달성", active: true },
      community_like_100: { amount: 200, label: "게시물 하트 100개 달성", active: true },
      review:             { amount: 30,  label: "리뷰 작성 보상", active: true },
    }, { merge: true });
    await db.collection("settings").doc("grade_rules").set({
      rookie:  { label: "루키",   minPoints: 0,     color: "#9CA3AF" },
      bronze:  { label: "브론즈", minPoints: 500,   color: "#A1887F" },
      silver:  { label: "실버",   minPoints: 2000,  color: "#90A4AE" },
      gold:    { label: "골드",   minPoints: 5000,  color: "#F59E0B" },
      diamond: { label: "다이아", minPoints: 15000, color: "#7C5CFC" },
      master:  { label: "마스터", minPoints: 50000, color: "#EF4444" },
    }, { merge: true });
    created.settings = 2;

    /* ── 18. 알림 (등급 상승 + 포인트 적립 예시) ── */
    await db.collection("notifications").add({
      targetUids: ["seed_B1"],
      title: "등급 상승",
      body: "등급이 골드(으)로 올랐습니다!",
      type: "grade_up",
      data: { grade: "gold" },
      read: false,
      sent: false,
      _isSeed: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection("notifications").add({
      targetUids: ["seed_A1"],
      title: "포인트 적립",
      body: "+495P 월 구독료 — 추천인 보상이 적립되었습니다",
      type: "point",
      data: { category: "referral_reward", amount: 495 },
      read: false,
      sent: false,
      _isSeed: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    created.notifications = 2;

    /* ── 19. 홈프로 업무분야 등록 (homepro_pros) ──
       - 화면: CategoryProListPage(카테고리별 프로 목록), ProCategoryDetailPage(분야 상세),
               ProCategoryListPage(업무분야 관리 — proCategoriesAtom = getProCategoryIds() 로 이 컬렉션 조회)
       - 문서ID = `${uid}_${categoryId}` (ProService.registerProCategory 규칙과 동일)
       - status "approved" 여야 목록/상세에 노출됨
    */
    const PRO_DOCS = [
      { uid: "seed_B1", cat: CAT.special_cleaning, exp: 10, intro: "특수청소 10년, 화재·고독사 현장 복구 전문",
        subs: ["화재복구", "곰팡이제거", "고독사현장"],
        detail: { certifications: "특수청소업 등록", equipment: ["방역장비", "오존발생기", "고압세척기"] } },
      { uid: "seed_B1", cat: CAT.leak_detection, exp: 10, intro: "누수탐지 정확하게, 비파괴 탐지 전문",
        subs: ["아파트누수", "옥상누수"],
        detail: { equipment: ["열화상카메라", "음향탐지기", "배관카메라"], certifications: "누수탐지 자격 보유" } },
      { uid: "seed_B2", cat: CAT.move_cleaning, exp: 7, intro: "이사·입주청소 꼼꼼하게 마무리합니다",
        subs: ["입주청소", "이사청소"],
        detail: { equipment: ["스팀청소기", "고압세척기", "바닥광택기"], crewSize: 3 } },
      { uid: "seed_B2", cat: CAT.partial_interior, exp: 7, intro: "도배·장판 부분 시공 전문",
        subs: ["도배", "장판"],
        detail: { scope: ["도배", "장판/마루"], materials: ["실크벽지", "합지벽지", "장판"] } },
      { uid: "seed_B3", cat: CAT.leak_detection, exp: 20, intro: "20년 경력 누수·방수 장인",
        subs: ["누수탐지", "방수시공"],
        detail: { equipment: ["열화상카메라", "가압테스트기"], certifications: "방수기능사" } },
      { uid: "seed_B3", cat: CAT.partial_interior, exp: 20, intro: "타일·욕실 시공 전문, 하자 없는 마감",
        subs: ["타일", "욕실"],
        detail: { scope: ["타일", "욕실"], materials: ["장판", "마루"] } },
      { uid: "seed_B4", cat: CAT.appliance_cleaning, exp: 5, intro: "가전분해청소 전문 — 에어컨·세탁기·냉장고",
        subs: ["에어컨", "세탁기", "냉장고"],
        detail: { equipment: ["분해공구 세트", "스팀청소기", "전용 세정제"], certifications: "가전청소 교육 수료" } },
      { uid: "seed_B5", cat: CAT.leak_detection, exp: 3, intro: "성실한 누수탐지, 당일 출장 가능",
        subs: ["누수탐지"],
        detail: { equipment: ["음향탐지기", "배관카메라"] } },
      { uid: "seed_B6", cat: CAT.leak_detection, exp: 4, intro: "친절한 누수 상담·탐지",
        subs: ["누수탐지"],
        detail: { equipment: ["열화상카메라"] } },
      { uid: "seed_B7", cat: CAT.partial_interior, exp: 6, intro: "부분 인테리어 시공 — 도배·타일",
        subs: ["도배", "타일"],
        detail: { scope: ["도배", "타일"], materials: ["실크벽지", "합지벽지"] } },
      { uid: "seed_B8", cat: CAT.partial_interior, exp: 5, intro: "합리적 가격의 부분 시공",
        subs: ["장판", "창호"],
        detail: { scope: ["장판/마루", "창호"], materials: ["장판", "마루"] } },
      { uid: "seed_B9", cat: CAT.partial_interior, exp: 4, intro: "깔끔한 마감, 부분 인테리어",
        subs: ["도배", "주방"],
        detail: { scope: ["도배", "주방"], materials: ["친환경벽지"] } },
    ];
    // uid → region 매핑 (ACCOUNTS 에서)
    const uidRegion = {};
    ACCOUNTS.forEach((a) => { uidRegion[a.uid] = a.region; });
    for (const p of PRO_DOCS) {
      const docId = `${p.uid}_${p.cat}`;
      const region = uidRegion[p.uid] || null;
      await db.collection("homepro_pros").doc(docId).set({
        uid: p.uid,
        categoryId: p.cat,
        licenseUrl: `https://picsum.photos/seed/${docId}_lic/600/800`,
        photoUrls: [
          `https://picsum.photos/seed/${docId}_1/800/600`,
          `https://picsum.photos/seed/${docId}_2/800/600`,
          `https://picsum.photos/seed/${docId}_3/800/600`,
        ],
        detail: {
          intro: p.intro,
          experience: p.exp,
          subcategories: p.subs,
          ...p.detail,
        },
        region: region ? { sido: region.sido, gu: region.gu || "전체" } : null,
        status: "approved",
        appliedAt: ts(daysAgo(30)),
        approvedAt: ts(daysAgo(28)),
        _isSeed: true,
      });
    }
    created.proDocs = PRO_DOCS.length;

    /* ── 20. 커뮤니티 게시글 (community_posts) ──
       - 화면: CommunityPage — getPosts(type) → community_posts where type==(free|notice) orderBy createdAt desc
       - 자유게시판(type "free")이 비어있던 문제 해결. 공지(type "notice")도 몇 건 적재.
    */
    const COMMUNITY_POSTS = [
      // 자유게시판 (type: free)
      { type: "free", uid: "seed_B1", name: "용감한강아지", title: "특수청소 현장 팁 공유합니다",
        content: "화재 현장 그을음 제거는 알칼리 세정제부터 시작하는 게 정석이에요. 다들 어떻게 하시나요?", like: 12, comment: 4, days: 1 },
      { type: "free", uid: "seed_B3", name: "노련한장인", title: "타일 줄눈 백시멘트 추천 부탁",
        content: "요즘 쓰는 백시멘트 브랜드 중에 변색 적은 거 추천 좀 해주세요.", like: 8, comment: 6, days: 2 },
      { type: "free", uid: "seed_A1", name: "성실한청소부", title: "누수탐지 비용 보통 얼마 정도 하나요?",
        content: "아파트 화장실 누수 같은데 탐지 비용 감이 안 잡히네요. 경험담 공유 부탁드립니다.", like: 5, comment: 9, days: 2 },
      { type: "free", uid: "seed_B2", name: "든든한기술자", title: "이사청소 성수기 인력 구하기 힘드네요",
        content: "3~4월 이사철엔 진짜 팀 꾸리기가 어렵습니다. 다들 어떻게 인력 관리하세요?", like: 15, comment: 7, days: 3 },
      { type: "free", uid: "seed_B4", name: "정직한작업자", title: "가전분해청소 후기 (에어컨)",
        content: "벽걸이 에어컨 분해청소 마치고 나면 냄새 확 줄어드는 게 보람이네요.", like: 20, comment: 3, days: 4 },
      { type: "free", uid: "seed_B7", name: "성실프로C", title: "도배 초배지 꼭 발라야 할까요?",
        content: "합지 시공할 때 초배 생략하는 경우도 있던데 하자 안 나는지 궁금합니다.", like: 6, comment: 5, days: 5 },
      { type: "free", uid: "seed_A3", name: "똑똑한대표", title: "부분 인테리어 견적 여러 곳 비교해보니",
        content: "같은 도배인데도 업체마다 견적 차이가 크더라구요. 비교 견적 꼭 받아보세요.", like: 9, comment: 2, days: 6 },
      { type: "free", uid: "seed_B5", name: "성실프로A", title: "신입 프로 인사드립니다",
        content: "누수탐지로 홈프로 시작했습니다. 선배님들 많이 도와주세요!", like: 18, comment: 11, days: 7 },
      // 이벤트/공지 (type: notice)
      { type: "notice", uid: "seed_B1", name: "홈프로 운영팀", title: "홈프로 정식 오픈 안내",
        content: "홈프로 B2B 매칭 서비스가 정식 오픈했습니다. 많은 이용 바랍니다.", like: 0, comment: 0, days: 3 },
      { type: "notice", uid: "seed_B1", name: "홈프로 운영팀", title: "추천인 보상 프로그램 개편",
        content: "월 구독료의 3%를 추천인에게 캐시로 지급합니다.", like: 0, comment: 0, days: 5 },
      { type: "notice", uid: "seed_B1", name: "홈프로 운영팀", title: "프로 등급제 안내",
        content: "누적 포인트에 따라 루키~마스터 6단계 등급이 부여됩니다.", like: 0, comment: 0, days: 8 },
    ];
    for (const c of COMMUNITY_POSTS) {
      await db.collection("community_posts").add({
        title: c.title,
        content: c.content,
        images: [],
        type: c.type,
        authorUid: c.uid,
        authorName: c.name,
        likeCount: c.like,
        commentCount: c.comment,
        _isSeed: true,
        createdAt: ts(daysAgo(c.days)),
      });
    }
    created.communityPosts = COMMUNITY_POSTS.length;

    /* ── 21. 계약 (homepro_contracts) ──
       - 화면: MobileContractpage — homepro_contracts 를 clientUid/proUid 로 조회해 병합·최신순
       - 오더/견적이 수락되면 생기는 "계약" 개념. status(진행중|완료) 탭으로 필터.
       - 의뢰인(seed_A*) ↔ 홈프로(seed_B*) 조합. clientName/proName 은 시드 닉네임 사용.
    */
    const CONTRACTS = [
      { orderId: "O1", categoryId: CAT.special_cleaning, categoryName: "특수청소",
        title: "역삼동 화재현장 특수청소", clientUid: "seed_A1", clientName: "성실한청소부",
        proUid: "seed_B1", proName: "용감한강아지", amount: 320000,
        status: "진행중", location: "서울특별시 강남구 역삼동", days: 2 },
      { orderId: "O5", categoryId: CAT.leak_detection, categoryName: "누수탐지",
        title: "해운대 아파트 욕실 누수탐지", clientUid: "seed_A2", clientName: "부지런한사장",
        proUid: "seed_B3", proName: "노련한장인", amount: 180000,
        status: "진행중", location: "부산광역시 해운대구 우동", days: 3 },
      { orderId: "O8", categoryId: CAT.partial_interior, categoryName: "부분 인테리어",
        title: "서구 오피스텔 도배·장판 시공", clientUid: "seed_A3", clientName: "똑똑한대표",
        proUid: "seed_B2", proName: "든든한기술자", amount: 950000,
        status: "진행중", location: "대전광역시 서구 둔산동", days: 5 },
      { orderId: "O11", categoryId: CAT.appliance_cleaning, categoryName: "가전분해청소",
        title: "논산 단독주택 에어컨·세탁기 청소", clientUid: "seed_A4", clientName: "친절한매니저",
        proUid: "seed_B4", proName: "정직한작업자", amount: 140000,
        status: "진행중", location: "충청남도 논산시 취암동", days: 1 },
      { orderId: "O14", categoryId: CAT.leak_detection, categoryName: "누수탐지",
        title: "강남 상가 옥상 누수 방수시공", clientUid: "seed_A1", clientName: "성실한청소부",
        proUid: "seed_B1", proName: "용감한강아지", amount: 460000,
        status: "완료", location: "서울특별시 강남구 삼성동", days: 12 },
      { orderId: "O15", categoryId: CAT.partial_interior, categoryName: "부분 인테리어",
        title: "청주 원룸 타일·욕실 부분시공", clientUid: "seed_A5", clientName: "빠른오너",
        proUid: "seed_B3", proName: "노련한장인", amount: 720000,
        status: "완료", location: "충청북도 청주시 상당구", days: 18 },
      { orderId: "O16", categoryId: CAT.move_cleaning, categoryName: "이사청소",
        title: "대전 아파트 입주청소", clientUid: "seed_A3", clientName: "똑똑한대표",
        proUid: "seed_B2", proName: "든든한기술자", amount: 280000,
        status: "완료", location: "대전광역시 서구 만년동", days: 22 },
      { orderId: "O18", categoryId: CAT.special_cleaning, categoryName: "특수청소",
        title: "해운대 상가 방역·특수청소", clientUid: "seed_A2", clientName: "부지런한사장",
        proUid: "seed_B1", proName: "용감한강아지", amount: 540000,
        status: "완료", location: "부산광역시 해운대구 중동", days: 30 },
    ];
    for (const c of CONTRACTS) {
      await db.collection("homepro_contracts").add({
        orderId: c.orderId,
        categoryId: c.categoryId,
        categoryName: c.categoryName,
        title: c.title,
        clientUid: c.clientUid,
        clientName: c.clientName,
        proUid: c.proUid,
        proName: c.proName,
        amount: c.amount,
        priceText: `${c.amount.toLocaleString()}원`,
        status: c.status,
        location: c.location,
        _isSeed: true,
        createdAt: ts(daysAgo(c.days)),
      });
    }
    created.contracts = CONTRACTS.length;

    return res.json({ ok: true, created, accounts: ACCOUNTS.map(a => ({ id: a.id, uid: a.uid, phone: a.phone, password })) });
  } catch (e) {
    console.error("seedTestData error:", e);
    return res.status(500).json({ error: e.message, stack: e.stack });
  }
});
