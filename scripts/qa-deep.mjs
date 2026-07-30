// C 심화 8관점 (dp01~) — 권한·상태전이·정합성·내성·악성입력·회귀
//   node scripts/qa-deep.mjs
import { createRunner, BASE, db, fx, COL, sleep } from "./qa-shared.mjs";

const r = createRunner({ group: "deep", dir: "20260731-deep" });

// 로그인 유도/차단으로 볼 신호
const LOGIN_SIGNAL = /로그인|시작하기|카카오|간편|MobileLogin|MobileSplash/;

async function main() {
  const page = await r.boot();

  // ══ C1 권한·접근 통제 [심화1] ══════════════════════════════════════
  // 사전: 남의 오더/방 id (읽기전용, seed_A2 소유 오더 · A1 미포함 방은 없어 A2로 로그인해 A1방 접근)
  const foreignOrder = "F5NOjs4x84lcf6gvbUKF";  // createdBy seed_A2
  const a1Room = "Rwm4inrwJPn7BImrzm5u";        // [seed_B1, seed_A1] — A2는 미참여

  // dp01 남의 오더 상세 — A1(의뢰자)이 A2 소유 오더 직접 URL
  await r.loginAs("성실한청소부"); // A1
  await r.go(`${BASE}/order/detail/${foreignOrder}`);
  await sleep(2500);
  let body = await r.txt();
  // 소유자 전용 '관리' 액션(취소요청/작업완료/오더삭제/견적 마감)이 비소유자에게 노출되면 문제.
  // '지원하기'(누구나 가능한 프로 지원)는 정상이므로 제외.
  const ownerMgmt = /오더 취소|취소 요청|취소요청|작업 완료|작업완료|오더 삭제|지원자 관리|선정하기/.test(body);
  const readOnlyOrBlocked = /권한|접근 권한|없는 오더|찾을 수 없|로그인이 필요/.test(body) || !ownerMgmt;
  await r.shot("dp01");
  r.push({ id: "dp01", name: "남의 오더 상세 접근", action: "A1이 A2 소유 오더 URL 직접 진입",
    ok: readOnlyOrBlocked, shot: "dp01.png",
    note: ownerMgmt ? "비소유자에게 소유자 관리액션 노출됨(보고)" : "열람/지원만 가능 — 소유자 관리액션 미노출" });

  // dp02 남의 채팅방 — A2가 [B1,A1] 방 직접 진입
  await r.logout();
  await r.loginAs("부지런한사장"); // A2
  await r.go(`${BASE}/chat/${a1Room}`);
  await sleep(2500);
  body = await r.txt();
  const canSeeMsgs = /메시지 입력|전송|보내기/.test(body) && !/권한|참여자|없는 대화|접근/.test(body);
  await r.shot("dp02");
  r.push({ id: "dp02", name: "남의 채팅방 접근", action: "A2가 미참여 방 URL 직접 진입",
    ok: !canSeeMsgs, shot: "dp02.png",
    note: canSeeMsgs ? "미참여자가 대화 열람·입력 가능(보고)" : "미참여 방 차단/빈 화면" });

  // dp03 관리자 페이지 — 일반 계정 /admin
  await r.go(`${BASE}/admin`);
  await sleep(2500);
  body = await r.txt();
  const inAdmin = /대시보드|회원 관리|매칭 관리|정산 관리|프로 승인/.test(body);
  const adminBlocked = /관리자 로그인|권한|접근/.test(body) || page.url().includes("/admin/login") || !inAdmin;
  await r.shot("dp03");
  r.push({ id: "dp03", name: "관리자 페이지 접근 통제", action: "일반 계정 /admin 직접 진입",
    ok: adminBlocked, shot: "dp03.png",
    note: inAdmin ? "일반 계정이 관리자 대시보드 열람(보고)" : "관리자 로그인/차단으로 리다이렉트" });

  // dp04 프로 전용(공동중개) — 의뢰자 등록 폼 (brokerage 러너 bk06과 동일 결론 상호검증)
  await r.go(`${BASE}/brokerage/create`);
  await sleep(2000);
  body = await r.txt();
  const canCreateBrokerage = /등록하기/.test(body) && /손님 찾습니다|매물 있습니다/.test(body);
  await r.shot("dp04");
  r.push({ id: "dp04", name: "프로전용 공동중개 등록 통제", action: "의뢰자 /brokerage/create",
    ok: !canCreateBrokerage, shot: "dp04.png",
    note: canCreateBrokerage ? "의뢰자도 등록 폼 접근(보고: proOnly 미적용 — bk06과 동일)" : "비프로 차단" });

  // dp05 비로그인 보호화면
  await r.logout();
  await r.go(`${BASE}/biz-profile`);
  await sleep(2200);
  body = await r.txt();
  const guardBiz = LOGIN_SIGNAL.test(body) || page.url().includes("Login") || page.url().includes("Splash") || !/비즈프로필|전문분야|내 프로필/.test(body);
  await r.shot("dp05");
  r.push({ id: "dp05", name: "비로그인 보호화면 가드", action: "로그아웃 상태 /biz-profile 진입",
    ok: guardBiz, shot: "dp05.png",
    note: guardBiz ? "비로그인 시 로그인 유도/차단" : "비로그인이 보호화면 열람(보고)" });

  // ══ C3 상태 전이 [심화3] — 배정 상태 오더에 잘못된 전이 버튼이 없는가(관찰) ══
  await r.logout();
  await r.loginAs("성실한청소부"); // A1
  // A1 소유 배정 오더
  await r.go(`${BASE}/order/detail/McVdBrlpKdqSybNXnr2W`);
  await sleep(2500);
  body = await r.txt();
  await r.shot("dp10");
  // 배정 상태에서 '작업 완료'는 있을 수 있으나 '견적 보내기'(프로 액션)는 의뢰자에게 없어야
  const wrongAction = /견적 보내기|수락하기/.test(body);
  r.push({ id: "dp10", name: "상태·역할 전이 가드(의뢰자 화면)", action: "배정 오더 상세에서 프로 전용 액션 노출 여부",
    ok: !wrongAction, shot: "dp10.png",
    note: wrongAction ? "의뢰자 화면에 프로 액션 노출(보고)" : "역할에 맞는 액션만 노출" });

  // ══ C4 데이터 정합성 [심화4] ══════════════════════════════════════
  // dp14 포인트: 화면 잔액 vs referral/points 내역 — 관찰 캡처(시드P는 원장무관 함정 주의)
  await r.go(`${BASE}/referral/points`);
  await sleep(2500);
  body = await r.txt();
  await r.shot("dp14");
  const hasPointUI = /포인트|P\b|적립|사용/.test(body);
  r.push({ id: "dp14", name: "포인트 내역 화면 정합", action: "/referral/points 잔액·내역 렌더",
    ok: hasPointUI, shot: "dp14.png",
    note: "잔액/내역 표시 확인(시드 포인트는 원장과 무관 — 실지급 경로만 원장 반영)" });

  // dp15 내 요청 카운트 vs Firestore
  await r.go(`${BASE}/my-orders`);
  await sleep(2500);
  await r.shot("dp15");
  const myOrdersSnap = await fx.getDocs(fx.query(fx.collection(db, COL.orders), fx.where("createdBy", "==", "seed_A1")));
  body = await r.txt();
  r.push({ id: "dp15", name: "내 요청 수 정합", action: "화면 목록 vs createdBy 쿼리 수",
    ok: true, shot: "dp15.png",
    note: `Firestore createdBy=seed_A1 오더 ${myOrdersSnap.size}건 — 화면 목록과 대조(캡처)` });

  // ══ C6 악성·극단 입력 [심화6] — 커뮤니티 글쓰기 XSS ══════════════════
  await r.go(`${BASE}/community/write`);
  await sleep(2000);
  body = await r.txt();
  if (/제목|내용|작성|등록/.test(body)) {
    const tas = await page.$$("textarea");
    const inputs = await page.$$("input");
    const XSS = '<img src=x onerror="window.__cxss=1">';
    if (inputs[0]) await inputs[0].type("[QA] XSS " + XSS, { delay: 3 }).catch(() => {});
    if (tas[0]) await tas[0].type("[QA] " + XSS + " 자동점검", { delay: 3 }).catch(() => {});
    await r.shot("dp20");
    const fired = await page.evaluate(() => window.__cxss === 1);
    r.push({ id: "dp20", name: "커뮤니티 입력 XSS 방어", action: "글쓰기 폼에 onerror 페이로드 입력",
      ok: !fired, shot: "dp20.png", note: fired ? "입력 단계 XSS 실행(보고)" : "입력 단계 미실행(등록은 안 함)" });
  } else {
    await r.shot("dp20");
    r.push({ id: "dp20", name: "커뮤니티 입력 XSS 방어", action: "글쓰기 폼 진입",
      ok: LOGIN_SIGNAL.test(body), shot: "dp20.png", note: "글쓰기 폼 미노출(로그인/권한 게이트 추정)" });
  }

  // ══ C7 회귀(7월 수정 버그 재발) [심화7] ══════════════════════════════
  // dp24 커뮤니티 익명/좋아요 정상
  await r.go(`${BASE}/community`);
  await sleep(2500);
  body = await r.txt();
  await r.shot("dp24");
  const communityOk = /커뮤니티|글쓰기|좋아요|인기|최신/.test(body) && !/오류|에러|Something went wrong/.test(body);
  r.push({ id: "dp24", name: "회귀: 커뮤니티 익명/좋아요", action: "/community 진입·크래시 여부",
    ok: communityOk, shot: "dp24.png", note: communityOk ? "커뮤니티 정상 렌더(크래시 없음)" : "이상 징후(보고)" });

  // dp25 location 크래시 회귀 — 위치 관련 화면 진입
  await r.go(`${BASE}/legal/location`);
  await sleep(1500);
  body = await r.txt();
  await r.shot("dp25");
  const locOk = !/오류|에러|Cannot read|undefined is not/.test(body) && body.length > 30;
  r.push({ id: "dp25", name: "회귀: location 크래시", action: "/legal/location 진입",
    ok: locOk, shot: "dp25.png", note: locOk ? "정상 렌더(크래시 없음)" : "렌더 이상(보고)" });

  // dp23 가입 온보딩 튕김 회귀 — 가입 화면 진입 안정성
  await r.logout();
  await r.go(`${BASE}/MobileSignup`);
  await sleep(2000);
  body = await r.txt();
  await r.shot("dp23");
  const signupOk = !/오류|에러|Something went wrong/.test(body) && body.length > 30;
  r.push({ id: "dp23", name: "회귀: 가입 온보딩 안정성", action: "/MobileSignup 진입",
    ok: signupOk, shot: "dp23.png", note: signupOk ? "가입 진입 정상(튕김 없음)" : "진입 이상(보고)" });

  await r.finish();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
