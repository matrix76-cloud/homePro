// 포인트 지급 규칙 일괄 갱신 (대표 확정 지급 조건표 2026-07-30)
//   실행:  node scripts/update-point-rules.mjs           ← 실제 반영
//          node scripts/update-point-rules.mjs --dry-run  ← 반영 없이 현재값/변경분만 출력
//
// 대상 문서: settings/point_rules
//   스키마: { [category]: { amount, label, active }, _policy: {...} }
//
// [실행 가능 여부] 가능 — 웹 SDK(비로그인)로 쓰기 가능.
//   firestore.rules 는 phone_verifications / phones / users_by_phone 세 컬렉션만 쓰기를 막고
//   그 외 컬렉션(settings 포함)은 개방 상태다. serviceAccountKey / admin SDK 불필요.
//   (functions/ 에 serviceAccountKey.json 도 없음 — 웹 SDK 가 유일한 경로)
//
// setDoc(..., { merge: true }) 이므로 아래 목록에 없는 기존 키(community_* 등)와
// _policy(토큰 정책)는 그대로 보존된다.
//
// ※ src/service/PointService.js 의 DEFAULT_RULES 와 동일하게 유지할 것 (앱 폴백값).
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDUVo__03JeXFktCckJc46YF7BLGjIwmWc",
  authDomain: "homepro-43f7f.firebaseapp.com",
  projectId: "homepro-43f7f",
  storageBucket: "homepro-43f7f.firebasestorage.app",
  messagingSenderId: "717297769007",
  appId: "1:717297769007:web:839b080defa7c763e284da",
};

/** 대표 확정 지급 조건표 */
const RULES = {
  signup:                    { amount: 1000, label: "가입 환영 보상", active: true },
  referral_invite:           { amount: 3000, label: "친구 초대 보상 (추천인)", active: true },
  referral_signup:           { amount: 3000, label: "추천코드 사용 보상 (피추천인)", active: true },
  profile_complete:          { amount: 2000, label: "비즈프로필 작성 완료 보상", active: true },
  // 접수 즉시 지급 폐지 — 완료처리 시 order_complete 로 지급
  order_create:              { amount: 0,    label: "오더 접수 보상 (폐지 — 완료 시 지급으로 대체)", active: false },
  order_complete:            { amount: 300,  label: "오더 등록 완료 보상 (접수자)", active: true },
  order_perform:             { amount: 300,  label: "오더 수행 완료 보상 (홈프로)", active: true },
  review:                    { amount: 300,  label: "리뷰 작성 보상", active: true },
  referral_order_complete:   { amount: 100,  label: "피추천인 오더 완료 보상 (접수)", active: true },
  referral_perform_complete: { amount: 100,  label: "피추천인 오더 완료 보상 (수행)", active: true },
};

/**
 * 운영 정책 변수 (_policy) — 구독료·수수료율 등 "결제에 쓰는 값"도 전부 변수 관리
 *   런칭 후 가입자 수·기간에 따라 여기 숫자만 바꿔 재실행하면 앱에 즉시 반영된다.
 *   ※ src/service/PointService.js 의 DEFAULT_POLICY 와 동일하게 유지할 것 (앱 폴백값).
 */
const POLICY = {
  networkFeeRate: 0.05,            // 포인트 결제 네트워크 수수료 5%
  referralRewardRate: 0.03,        // 결제액 대비 추천인 보상 3%
  swapRate: 1,                     // 1포인트 -> 토큰 스왑 비율
  monthlySubscriptionPoint: 16500, // 월 구독료 (포인트 결제 기준)
};

const dryRun = process.argv.includes("--dry-run");

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const ref = doc(db, "settings", "point_rules");

const snap = await getDoc(ref);
const before = snap.exists() ? snap.data() : {};
console.log(`문서 존재: ${snap.exists()} / 기존 키 ${Object.keys(before).length}개`);

console.log("\n--- 변경 내역 ---");
for (const [key, next] of Object.entries(RULES)) {
  const prev = before[key];
  const prevStr = prev ? `${prev.amount}P ${prev.active ? "ON" : "OFF"}` : "(없음)";
  const nextStr = `${next.amount}P ${next.active ? "ON" : "OFF"}`;
  const changed = !prev || prev.amount !== next.amount || prev.active !== next.active || prev.label !== next.label;
  console.log(`${changed ? "*" : " "} ${key.padEnd(26)} ${prevStr.padEnd(14)} -> ${nextStr}`);
}

console.log("\n--- _policy 변경 내역 ---");
const prevPolicy = before._policy || {};
for (const [key, next] of Object.entries(POLICY)) {
  const prev = prevPolicy[key];
  const changed = prev !== next;
  console.log(`${changed ? "*" : " "} ${key.padEnd(26)} ${String(prev ?? "(없음)").padEnd(14)} -> ${next}`);
}

const preserved = Object.keys(before).filter((k) => !(k in RULES) && k !== "_policy");
console.log(`\n보존되는 기존 키: ${preserved.length ? preserved.join(", ") : "(없음)"}`);

if (dryRun) {
  console.log("\n[dry-run] 쓰기 없이 종료했습니다.");
  process.exit(0);
}

await setDoc(ref, { ...RULES, _policy: POLICY }, { merge: true });
console.log("\n완료 — settings/point_rules 갱신됨 (merge, _policy 포함)");
process.exit(0);
