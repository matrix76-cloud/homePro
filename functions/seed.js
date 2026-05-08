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
   ────────────────────────────────────────── */
exports.getSeedLoginToken = onRequest({ region: REGION, cors: true }, async (req, res) => {
  const secret = req.headers["x-seed-secret"] || req.query.secret;
  if (secret !== SECRET) {
    return res.status(403).json({ error: "forbidden" });
  }
  const uid = req.query.uid || (req.body && req.body.uid);
  if (!uid) return res.status(400).json({ error: "uid required" });
  try {
    const token = await auth.createCustomToken(uid);
    return res.json({ token, uid });
  } catch (e) {
    return res.status(500).json({ error: e.message });
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

    // 4) Auth 사용자 전체 삭제
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

    /* ── 6. 채팅방 (배정 오더 4개) ── */
    const CHATS = [
      { orderId: "O10", a: "seed_A1", aName: "성실한청소부", b: "seed_B1", bName: "용감한강아지", lastMessage: "내일 오전 10시에 도착하겠습니다" },
      { orderId: "O11", a: "seed_A2", aName: "부지런한사장", b: "seed_B2", bName: "든든한기술자", lastMessage: "견적 수락했습니다 감사합니다" },
      { orderId: "O12", a: "seed_A4", aName: "친절한매니저", b: "seed_B4", bName: "정직한작업자", lastMessage: "지정 감사합니다 진행하겠습니다" },
      { orderId: "O13", a: "seed_A5", aName: "빠른오너",     b: "seed_B3", bName: "노련한장인",   lastMessage: "현재 작업 중입니다" },
    ];
    for (const c of CHATS) {
      await db.collection("chatRooms").add({
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

    return res.json({ ok: true, created, accounts: ACCOUNTS.map(a => ({ id: a.id, uid: a.uid, phone: a.phone, password })) });
  } catch (e) {
    console.error("seedTestData error:", e);
    return res.status(500).json({ error: e.message, stack: e.stack });
  }
});
