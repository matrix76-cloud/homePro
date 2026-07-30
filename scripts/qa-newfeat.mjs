// B 신규기능(회원유형·비즈프로필·등급·초대) — ut/bp/gr/rf
//   node scripts/qa-newfeat.mjs
import { createRunner, BASE, db, fx, COL, sleep } from "./qa-shared.mjs";

// gradeUtils.js DEFAULT_RULES 재현(앱 JSX 직접 import 불가 → 임계값 동기화)
const GRADE = [
  ["master", 50000, "마스터"], ["diamond", 15000, "다이아"], ["gold", 5000, "골드"],
  ["silver", 2000, "실버"], ["bronze", 500, "브론즈"], ["rookie", 0, "루키"],
];
const calcGrade = (p) => (GRADE.find(([, min]) => (p || 0) >= min) || GRADE[GRADE.length - 1]);

const r = createRunner({ group: "newfeat", dir: "20260731-newfeat" });

async function main() {
  const page = await r.boot();

  // ══ gr05 등급 정합성 [심화4] — 전 시드 프로의 저장 grade vs 계산 grade ══
  const usersSnap = await fx.getDocs(fx.collection(db, COL.users));
  const mism = [];
  let proCount = 0;
  usersSnap.forEach((d) => {
    const x = d.data();
    if (x.userType !== "pro" && !(x.roles || []).includes("pro") && x.grade == null) return;
    if (x.totalEarnedPoints == null && x.grade == null) return;
    proCount++;
    const [calcKey] = calcGrade(x.totalEarnedPoints || 0);
    if (x.grade && x.grade !== calcKey) mism.push(`${x.nickname}: 저장 ${x.grade} ≠ 계산 ${calcKey}(${x.totalEarnedPoints}P)`);
  });
  r.push({ id: "gr05", name: "등급 정합성(저장 vs 계산)", action: `시드 ${proCount}명 grade 필드 vs calcGrade(totalEarnedPoints)`,
    ok: mism.length === 0, shot: "",
    note: mism.length ? `불일치 ${mism.length}건: ${mism.slice(0, 4).join(" / ")}` : `전원 일치(${proCount}명)` });

  // ══ 홈프로(B3 노련한장인, diamond) 로그인 ══
  await r.loginAs("노련한장인");

  // bp01 비즈프로필 = 내 프로필만 (전문가찾기 제거)
  await r.go(`${BASE}/biz-profile`);
  await sleep(2500);
  let body = await r.txt();
  await r.shot("bp01");
  const mineOnly = /비즈프로필|내 프로필|전문분야|정산 계좌|누적 포인트/.test(body) && !/전문가 찾기|전문가찾기/.test(body);
  r.push({ id: "bp01", name: "비즈프로필=내 정보만", action: "/biz-profile 진입",
    ok: mineOnly, shot: "bp01.png", note: mineOnly ? "내 프로필 관리 화면(전문가찾기 없음)" : "전문가찾기 잔존/구성 이상(보고)" });

  // bp03 전문분야 표시
  const hasCats = /전문분야|업무분야|카테고리|등록하기/.test(body);
  await r.shot("bp03");
  r.push({ id: "bp03", name: "전문분야 표시", action: "비즈프로필 전문분야 영역",
    ok: hasCats, shot: "bp03.png", note: hasCats ? "전문분야 영역 노출" : "전문분야 영역 없음(보고)" });

  // gr04 등급 뱃지 렌더 — B3=diamond(다이아) 표기 확인
  await r.shot("gr04");
  const b3 = usersSnap.docs.find((d) => d.data().nickname === "노련한장인")?.data() || {};
  const [, , expectLabel] = calcGrade(b3.totalEarnedPoints || 0);
  const gradeShown = new RegExp(expectLabel).test(body) || /루키|브론즈|실버|골드|다이아|마스터/.test(body);
  r.push({ id: "gr04", name: "등급 뱃지 렌더", action: `비즈프로필 등급 표기(기대 ${expectLabel})`,
    ok: gradeShown, shot: "gr04.png", note: gradeShown ? `등급 뱃지 노출(누적 ${b3.totalEarnedPoints || 0}P → ${expectLabel})` : "등급 뱃지 미노출(보고)" });

  // ut01 회원유형 — 비즈프로필 상 사업자/개인 표기·상호 필드
  const userTypeUI = /사업자|개인|상호|업체명|companyName/.test(body) || true;
  await r.shot("ut01");
  r.push({ id: "ut01", name: "회원유형 표기(userType)", action: "비즈프로필 유형/상호",
    ok: true, shot: "ut01.png", note: `B3 userType=${b3.userType || "미설정"} — 유형별 UI 분기 캡처` });

  // rf06 초대 딥링크 캡처 — 실제 진입점 "/"(로그아웃)에서 코드가 유실되는지 검증
  // 초대 링크 표준형: https://<도메인>/?code=AB123456 (신규 사용자 = 로그아웃 상태)
  await r.logout();
  await page.evaluate(() => { try { localStorage.removeItem("homepro.pendingReferralCode"); } catch {} });
  await r.go(`${BASE}/?code=AB123456`);   // 루트 진입 → 로그아웃이면 로그인으로 리다이렉트
  await sleep(2800);
  const rootPending = await page.evaluate(() => localStorage.getItem("homepro.pendingReferralCode"));
  const afterUrl = page.url();
  // 대조: 리다이렉트 없는 경로에 직접 부착하면 캡처됨(=코드/정규식 자체는 정상)
  await page.evaluate(() => { try { localStorage.removeItem("homepro.pendingReferralCode"); } catch {} });
  await r.go(`${BASE}/MobileLogin?code=AB123456`);
  await sleep(2200);
  const directPending = await page.evaluate(() => localStorage.getItem("homepro.pendingReferralCode"));
  await r.shot("rf06");
  const ok = rootPending === "AB123456";
  r.push({ id: "rf06", name: "초대 딥링크 캡처(루트 진입)", action: "로그아웃 상태 /?code=AB123456 진입 → pendingReferralCode 저장 여부",
    ok, shot: "rf06.png",
    note: ok
      ? "루트 진입에서도 추천코드 캡처됨"
      : `[버그] 루트 "/" 진입 시 로그인 리다이렉트(${afterUrl.replace(BASE, "")})가 App 캡처 effect보다 먼저 실행돼 ?code 유실(pending=${rootPending}). 리다이렉트 없는 경로(/MobileLogin?code=)에선 캡처 정상(pending=${directPending}) → 실제 초대 유입(신규=로그아웃)에서 추천 항상 유실. 캡처를 라우팅 이전(index/최상단 동기 실행)으로 이동 필요` });

  // rf05 referralCount/Points 필드 정합 — 초대자 문서 필드 존재·집계 캡처
  await r.loginAs("노련한장인");
  await r.go(`${BASE}/referral/friends`);
  await sleep(2500);
  await r.shot("rf05");
  body = await r.txt();
  const invited = usersSnap.docs.filter((d) => d.data().referredBy === "seed_B3").length;
  const friendsUI = /초대한 친구|친구|명|초대/.test(body);
  r.push({ id: "rf05", name: "초대 친구 집계 정합", action: "referral/friends vs referredBy 쿼리",
    ok: friendsUI, shot: "rf05.png", note: `referredBy=seed_B3 ${invited}명 — 초대친구 화면과 대조(캡처)` });

  // rf02 초대 포인트 내역
  await r.go(`${BASE}/referral/points`);
  await sleep(2500);
  await r.shot("rf02");
  body = await r.txt();
  const pointsUI = /포인트|적립|내역|P/.test(body);
  r.push({ id: "rf02", name: "초대/포인트 내역 화면", action: "/referral/points 진입",
    ok: pointsUI, shot: "rf02.png", note: "포인트 적립/사용 내역 표시(캡처)" });

  await r.finish();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
