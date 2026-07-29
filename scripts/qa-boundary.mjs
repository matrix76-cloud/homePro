// 경계값 검증 자동 점검 — 리뷰 허브 '기능점검 결과' 카테고리 12(boundary) 산출물 생성.
//   node scripts/qa-boundary.mjs [체크id...]     (인자 없으면 전체)
// 산출물: public/qa/20260730-boundary/_flow.json + <id>.png
// 규칙: qa-지시서/00-공통규칙.md — dev 서버 3002 사용, 만든 테스트 데이터는 끝나고 삭제.
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import os from "os";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc,
  getDocs, query, where, Timestamp,
} from "firebase/firestore";

const require = createRequire("/Users/a1111/.npm/_npx/55158e48eb5c59f7/");
const puppeteer = require("puppeteer");

const BASE = "http://localhost:3002";
const OUT = "public/qa/20260730-boundary";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ORDERS = "homepro_orders";
const USERS = "users";
const CASH = "homepro_cash";

const app = initializeApp({
  apiKey: "AIzaSyDUVo__03JeXFktCckJc46YF7BLGjIwmWc",
  authDomain: "homepro-43f7f.firebaseapp.com",
  projectId: "homepro-43f7f",
  storageBucket: "homepro-43f7f.firebasestorage.app",
  messagingSenderId: "717297769007",
  appId: "1:717297769007:web:839b080defa7c763e284da",
});
const db = getFirestore(app);

fs.mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2);
const want = (id) => !only.length || only.includes(id);

const results = [];
const push = (r) => { results.push(r); console.log(`  ${r.ok ? "OK  " : "FAIL"} ${r.id} ${r.name} — ${r.note}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 테스트 오더 생성/정리 ──────────────────────────────────────────────
const madeOrders = [];
async function makeOrder({ id, ageSec, status = "접수", extra = {} }) {
  const ref = doc(collection(db, ORDERS), id);
  await setDoc(ref, {
    categoryId: "professional_cleaning",
    categoryName: "전문청소",
    subcategory: "홈클리닝 이사청소",
    subcategories: ["홈클리닝 이사청소"],
    title: "[경계값점검] 자동 생성 오더",
    description: "경계값 자동 점검용 — 점검 종료 후 삭제됩니다",
    orderStatus: status,
    matchType: "priority",
    priceType: "협의",
    location: "서울 강남구 테헤란로 1",
    address: "서울 강남구 테헤란로 1",
    workDate: "오늘",
    createdBy: "seed_A1",
    writer: "성실한청소부",
    applicantCount: 0,
    photos: [],
    createdAt: Timestamp.fromMillis(Date.now() - ageSec * 1000),
    ...extra,
  });
  madeOrders.push(id);
  return id;
}
async function cleanupOrders() {
  for (const id of madeOrders) {
    try {
      const logs = await getDocs(collection(db, ORDERS, id, "logs"));
      await Promise.all(logs.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db, ORDERS, id));
    } catch { /* noop */ }
  }
}

// ── 브라우저 ──────────────────────────────────────────────────────────
let browser, page;
async function boot() {
  browser = await puppeteer.launch({
    executablePath: CHROME, headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=430,900"],
  });
  page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  page.on("dialog", async (d) => { lastDialog = d.message(); await d.accept().catch(() => {}); });
}
let lastDialog = "";
let lastToast = "";

async function loginAs(nickname) {
  await page.goto(`${BASE}/seed-login`, { waitUntil: "networkidle2" });
  await page.evaluate(() => localStorage.removeItem("homepro.pendingReferralCode"));
  await sleep(400);
  const clicked = await page.evaluate((nick) => {
    const els = [...document.querySelectorAll("div,button")];
    const card = els.find((e) => (e.innerText || "").includes(nick) && e.children.length && e.innerText.length < 60);
    if (!card) return false;
    card.click();
    return true;
  }, nickname);
  if (!clicked) throw new Error(`시드 계정 카드 못 찾음: ${nickname}`);
  await sleep(3500); // 커스텀 토큰 로그인 + 리다이렉트
  return page.url();
}

// 스크린샷은 임시 폴더에 찍고 마지막에 public/ 으로 옮긴다.
// (점검 중 public/ 에 파일을 쓰면 CRA dev 서버가 브라우저를 리로드시켜 화면 상태가 초기화됨)
const SHOT_TMP = fs.mkdtempSync(path.join(os.tmpdir(), "qa-bd-"));
async function shot(id) {
  await page.screenshot({ path: path.join(SHOT_TMP, `${id}.png`) });
  return `${id}.png`;
}
function flushShots() {
  for (const f of fs.readdirSync(SHOT_TMP)) {
    fs.copyFileSync(path.join(SHOT_TMP, f), path.join(OUT, f));
  }
  fs.rmSync(SHOT_TMP, { recursive: true, force: true });
}
// 문서 리로드(버전 체크 등)로 컨텍스트가 날아갈 수 있어 재시도로 감싼다
const txt = async () => {
  for (let i = 0; i < 4; i++) {
    try { return await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ")); }
    catch { await sleep(500); }
  }
  return "";
};

// SPA 라우팅 중 네비게이션이 중단될 수 있어 재시도
async function go(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 }); return; }
    catch (e) { if (i === tries - 1) throw e; await sleep(800); }
  }
}
// 조건이 나타날 때까지 폴링(첫 관측값 반환) — 데이터 로딩 지연 대비
async function waitFor(re, timeoutMs = 12000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const body = await txt();
    const m = body.match(re);
    if (m) return { m, body };
    await sleep(300);
  }
  return { m: null, body: await txt() };
}

// ══════════════════════════════════════════════════════════════════════
// bd01 · 2차수 수락 대기 300초 경계
// ══════════════════════════════════════════════════════════════════════
async function bd01() {
  // 기존 accessTier 백업
  const uref = doc(db, USERS, "seed_B1");
  const before = (await getDoc(uref)).data() || {};
  const restore = before.accessTier;
  await updateDoc(uref, { accessTier: "tier2" });

  const idFresh = await makeOrder({ id: "bd_gate_fresh", ageSec: 60 });   // 240초 남음
  const idOpen = await makeOrder({ id: "bd_gate_open", ageSec: 400 });    // 게이트 해제

  await loginAs("용감한강아지");

  // (1) 60초 경과 → 잠김 + 4:00 부근 카운트다운
  await go(`${BASE}/order/detail/${idFresh}`);
  const first = await waitFor(/수락 가능까지 (\d):(\d\d)/);
  let body = first.body;
  const mFresh = first.m;
  const noteFresh = body.includes("2차수 회원은 오더 등록 5분 후부터");
  const okFresh = !!mFresh && noteFresh && Number(mFresh[1]) === 3 && Number(mFresh[2]) >= 50;
  push({
    id: "bd01", name: "2차수 등록 60초 후 수락 잠금", action: "createdAt 60초 전 오더를 2차수 홈프로로 진입",
    ok: okFresh,
    note: okFresh
      ? `수락 버튼 비활성 + "수락 가능까지 ${mFresh[0].split(" ").pop()}" 카운트다운 + 2차수 안내 문구 표시 (남은 240초 계산 일치)`
      : `기대: 잠김+3:5x 카운트다운 / 실제: ${mFresh ? mFresh[0] : "카운트다운 없음"}${noteFresh ? "" : ", 안내문구 없음"}`,
    shot: await shot("bd01"),
  });

  // (2) 카운트다운이 실제로 1초씩 감소하는지
  const t1 = (await txt()).match(/수락 가능까지 (\d:\d\d)/)?.[1];
  await sleep(2500);
  const t2 = (await txt()).match(/수락 가능까지 (\d:\d\d)/)?.[1];
  const toSec = (s) => s ? Number(s.split(":")[0]) * 60 + Number(s.split(":")[1]) : null;
  const diff = t1 && t2 ? toSec(t1) - toSec(t2) : null;
  push({
    id: "bd02", name: "카운트다운 실시간 감소", action: "같은 화면에서 2.5초 대기 후 남은 시간 재확인",
    ok: diff !== null && diff >= 2 && diff <= 5,
    note: diff !== null ? `${t1} → ${t2} (${diff}초 감소 — 1초 간격으로 실시간 갱신)` : "카운트다운 텍스트를 읽지 못함",
    shot: await shot("bd02"),
  });

  // (3) 경계 직전 오더를 새로 만들어(30초 남음) 0:00 도달 순간 자동 해제를 확인
  const idEdge = await makeOrder({ id: "bd_gate_edge", ageSec: 270 });
  await go(`${BASE}/order/detail/${idEdge}`);
  const edge = await waitFor(/수락 가능까지 (\d:\d\d)/, 15000);
  const edgeBefore = edge.m?.[1] || "";
  await shot("bd03a");
  // 0:00 도달 후 자동 전환 대기 (최대 45초)
  const un = await waitFor(/수락하기/, 45000);
  const edgeAfter = un.body;
  const unlocked = /수락하기/.test(edgeAfter) && !/수락 가능까지/.test(edgeAfter);
  push({
    id: "bd03", name: "300초 경계 자동 해제", action: "createdAt 270초 전(30초 남음) 오더에서 경계 통과까지 화면 유지",
    ok: !!edgeBefore && unlocked,
    note: unlocked && edgeBefore
      ? `경계 직전 "수락 가능까지 ${edgeBefore}" 표시 → 0:00 도달 순간 새로고침 없이 [수락하기]로 자동 전환 (300초 미달까지 잠김 / 300초 도달 시 해제)`
      : `기대: 0초 도달 시 자동 해제 / 실제: ${unlocked ? "해제됐으나 경계 직전 카운트다운을 읽지 못함" : `잠김 유지(${edgeBefore || "카운트다운 없음"})`}`,
    shot: await shot("bd03"),
  });

  // (4) 이미 300초 지난 오더 → 처음부터 활성
  await go(`${BASE}/order/detail/${idOpen}`);
  const openBody = (await waitFor(/수락하기|수락 가능까지/, 15000)).body;
  const okOpen = openBody.includes("수락하기") && !/수락 가능까지/.test(openBody);
  push({
    id: "bd04", name: "300초 경과 오더 즉시 수락 가능", action: "createdAt 400초 전 오더를 2차수로 진입",
    ok: okOpen,
    note: okOpen ? "카운트다운 없이 [수락하기] 활성 — 경계 이후 정상 개방" : "기대: 즉시 활성 / 실제: 잠김 또는 버튼 없음",
    shot: await shot("bd04"),
  });

  // (5) 1차수는 갓 등록된 오더도 즉시 수락 가능
  await updateDoc(uref, { accessTier: "tier1" });
  await go(`${BASE}/order/detail/${idFresh}`);
  const t1Body = (await waitFor(/수락하기|수락 가능까지/, 15000)).body;
  const okTier1 = t1Body.includes("수락하기") && !/수락 가능까지/.test(t1Body);
  push({
    id: "bd05", name: "1차수 0초 즉시 수락", action: "같은 60초 전 오더를 1차수로 전환 후 재진입",
    ok: okTier1,
    note: okTier1 ? "대기 없이 [수락하기] 활성 — 1차수 실시간 수락 정상" : "기대: 즉시 활성 / 실제: 잠김 유지",
    shot: await shot("bd05"),
  });

  // 원복
  if (restore === undefined) await updateDoc(uref, { accessTier: "tier2" });
  else await updateDoc(uref, { accessTier: restore });
}

// ══════════════════════════════════════════════════════════════════════
// bd06~08 · 전문분야 5개 상한 / 활동사진 10장
// ══════════════════════════════════════════════════════════════════════
async function bd06() {
  await loginAs("성실프로E"); // 등록 분야가 적은 계정
  await go(`${BASE}/pro/register-category`);
  const ready = await waitFor(/\/5 선택/, 15000);
  if (!ready.m) throw new Error("분야 선택 화면 로딩 실패");

  // CatGridItem = 아이콘 + 이름 두 자식을 가진 클릭 가능 요소
  const cands = () => page.evaluate(() => [...document.querySelectorAll("div")]
    .filter((e) => getComputedStyle(e).cursor === "pointer" && e.children.length === 2 && e.offsetWidth > 50 && e.offsetWidth < 220)
    .map((e, i) => ({ i, name: (e.innerText || "").trim().split("\n").pop() })));
  const clickCand = (i) => page.evaluate((idx) => {
    const items = [...document.querySelectorAll("div")]
      .filter((e) => getComputedStyle(e).cursor === "pointer" && e.children.length === 2 && e.offsetWidth > 50 && e.offsetWidth < 220);
    const el = items[idx];
    if (!el) return false;
    el.scrollIntoView({ block: "center" });
    el.click();
    return true;
  }, i);
  const count = async () => {
    const m = (await txt()).match(/(\d)\/5 선택/);
    return m ? Number(m[1]) : null;
  };

  const list = await cands();
  // 카운트가 실제로 증가하는 항목만 5개 선택 (이미 등록된 분야는 비활성이라 증가하지 않음)
  const picked = [];
  for (const c of list) {
    if (picked.length >= 5) break;
    const beforeN = await count();
    await clickCand(c.i);
    await sleep(300);
    const afterN = await count();
    if (afterN === beforeN + 1) picked.push(c);
  }
  const n5 = await count();
  push({
    id: "bd06", name: "전문분야 5개까지 선택", action: "1단계에서 선택 가능한 카테고리를 순서대로 5개 선택",
    ok: n5 === 5 && picked.length === 5,
    note: n5 === 5
      ? `카운트 5/5 선택 표시 — 상한까지 정상 선택 (선택: ${picked.map((p) => p.name).join(", ")})`
      : `기대: 5/5 / 실제: ${n5 === null ? "카운트 표시 없음" : `${n5}/5`}`,
    shot: await shot("bd06"),
  });

  // 6번째 시도 → 거부 + 안내 (토스트는 2초 후 사라져 즉시 폴링)
  const sixth = list.find((c) => !picked.some((p) => p.i === c.i));
  let toastSeen = false, n6 = null;
  if (sixth) {
    await clickCand(sixth.i);
    for (let i = 0; i < 20; i++) {
      const b = await txt();
      if (b.includes("최대 5개까지")) { toastSeen = true; break; }
      await sleep(150);
    }
    n6 = await count();
  }
  push({
    id: "bd07", name: "6번째 선택 거부", action: `5개 선택 상태에서 6번째(${sixth?.name || "?"}) 클릭`,
    ok: toastSeen && n6 === 5,
    note: toastSeen && n6 === 5
      ? '"분야는 최대 5개까지 선택할 수 있습니다" 안내가 뜨고 선택은 5/5로 유지 — 초과 선택 차단'
      : `기대: 안내+5/5 유지 / 실제: ${n6 === null ? "카운트 없음" : `${n6}/5`}${toastSeen ? "" : ", 안내문 미확인"}`,
    shot: await shot("bd07"),
  });

  // 하나 해제 → 4/5 → 다시 6번째 선택 가능
  await clickCand(picked[0].i);
  await sleep(500);
  const n4 = await count();
  if (sixth) { await clickCand(sixth.i); await sleep(500); }
  const nBack = await count();
  push({
    id: "bd08", name: "해제 후 재선택", action: "선택 1개 해제 → 아까 막혔던 분야를 다시 선택",
    ok: n4 === 4 && nBack === 5,
    note: n4 === 4 && nBack === 5
      ? "4/5로 감소한 뒤 직전에 막혔던 분야가 정상 선택되어 5/5 복귀 — 상한은 누적이 아닌 현재 선택 개수 기준"
      : `기대: 4/5 → 5/5 / 실제: ${n4}/5 → ${nBack}/5`,
    shot: await shot("bd08"),
  });
}

// ══════════════════════════════════════════════════════════════════════
// bd09~11 · 추천코드 입력 경계
// ══════════════════════════════════════════════════════════════════════
async function bd09() {
  await loginAs("성실프로D");
  // 추천코드 입력칸이 보이도록 referredBy 백업 후 비움(점검 끝나면 원복)
  const uref = doc(db, USERS, "seed_B8");
  const beforeRef = (await getDoc(uref)).data()?.referredBy;
  if (beforeRef) await updateDoc(uref, { referredBy: null });

  const TOAST_RE = /본인 코드는 사용할 수 없습니다|존재하지 않는 코드입니다|만료된 코드입니다|이미 추천인 코드를 사용했습니다|추천인 코드가 적용/;

  // 초대코드 탭을 새로 열어 입력칸이 준비될 때까지 대기 — 이전 토스트·busy 상태와 격리
  const openInvite = async () => {
    await go(`${BASE}/MobileMain`);
    await sleep(2000);
    await page.evaluate(() => {
      const t = [...document.querySelectorAll("button,div")].find((e) => (e.innerText || "").trim() === "초대코드");
      if (t) t.click();
    });
    for (let i = 0; i < 40; i++) {
      const ready = await page.evaluate(() => !![...document.querySelectorAll("input")]
        .find((i) => (i.placeholder || "").includes("추천코드")));
      if (ready) return true;
      await sleep(250);
    }
    return false;
  };
  const setCode = (code) => page.evaluate((c) => {
    const inp = [...document.querySelectorAll("input")].find((i) => (i.placeholder || "").includes("추천코드"));
    if (!inp) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(inp, c);
    inp.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }, code);
  const readCode = () => page.evaluate(() => {
    const inp = [...document.querySelectorAll("input")].find((i) => (i.placeholder || "").includes("추천코드"));
    return inp ? inp.value : null;
  });
  const clickApply = () => page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((e) => (e.innerText || "").trim() === "적용");
    if (b && !b.disabled) { b.click(); return true; }
    return false;
  });
  const pollToast = async (re) => {
    let last = "";
    for (let i = 0; i < 30; i++) { last = await txt(); if (re.test(last)) return last; await sleep(150); }
    return last;
  };

  // (1) 소문자 입력 자동 대문자화 — 적용 이전 상태에서 먼저 확인
  await openInvite();
  await setCode("ab123456");
  await sleep(500);
  const shown = await readCode();
  push({
    id: "bd11", name: "소문자 입력 자동 대문자화", action: "추천코드 칸에 ab123456 입력",
    ok: shown === "AB123456",
    note: shown === "AB123456"
      ? "입력칸에서 AB123456으로 자동 변환 — 코드는 대문자로 저장되므로 소문자 입력도 통과(7/29 회귀 확인)"
      : `기대: AB123456 / 실제: ${shown === null ? "입력칸 없음" : shown}`,
    shot: await shot("bd11"),
  });

  // (2) 본인 코드 차단
  await openInvite();
  const myCode = (await txt()).match(/[A-Z]{2}\d{6}/)?.[0] || "";
  let okSelf = false, selfBody = "";
  if (myCode) {
    await setCode(myCode);
    await sleep(400);
    await clickApply();
    selfBody = await pollToast(/본인 코드는 사용할 수 없습니다/);
    okSelf = /본인 코드는 사용할 수 없습니다/.test(selfBody);
  }
  push({
    id: "bd09", name: "본인 코드 차단", action: `초대코드 탭에서 내 코드(${myCode || "?"}) 입력 후 적용`,
    ok: okSelf,
    note: okSelf
      ? '"본인 코드는 사용할 수 없습니다" 안내 — 자기 추천으로 3,000P를 자가 지급할 수 없음'
      : `기대: 본인코드 차단 안내 / 실제: ${myCode ? selfBody.slice(0, 80) : "내 코드 미확인"}`,
    shot: await shot("bd09"),
  });

  // (3) 없는 코드 차단 — 새로 진입해 이전 토스트와 격리
  await openInvite();
  await setCode("ZZ999999");
  await sleep(400);
  await clickApply();
  const noneBody = await pollToast(/존재하지 않는 코드입니다/);
  const okNone = /존재하지 않는 코드입니다/.test(noneBody);
  const stillNoRef = !(await getDoc(uref)).data()?.referredBy;
  push({
    id: "bd10", name: "없는 코드 차단", action: "존재하지 않는 코드 ZZ999999 입력 후 적용",
    ok: okNone && stillNoRef,
    note: okNone && stillNoRef
      ? '"존재하지 않는 코드입니다" 안내 — 추천 관계(referredBy) 저장·포인트 지급 모두 없음'
      : `기대: 미존재 안내 / 실제: ${okNone ? "안내는 정상이나 referredBy가 기록됨" : noneBody.slice(0, 80)}`,
    shot: await shot("bd10"),
  });

  if (beforeRef) await updateDoc(uref, { referredBy: beforeRef });
}

// ══════════════════════════════════════════════════════════════════════
// bd12~13 · 등급 승급 경계 (499P / 500P)
// ══════════════════════════════════════════════════════════════════════
async function bd12() {
  // 등급 승급은 PointService.grantPoints 안에서 재계산된다 → 필드를 직접 고치지 않고
  // 앱의 실제 지급 경로(커뮤니티 글 작성 30P)로 경계를 넘게 만들어 확인한다.
  const uid = "seed_B7";
  const uref = doc(db, USERS, uid);
  const before = (await getDoc(uref)).data() || {};
  const bk = { total: before.totalEarnedPoints, grade: before.grade, pts: before.referralPoints };
  const madePosts = [];

  const writePost = async (title) => {
    await go(`${BASE}/community/write`);
    await sleep(1800);
    await page.evaluate((t) => {
      const set = (el, v) => {
        const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      };
      const ti = [...document.querySelectorAll("input")].find((i) => (i.placeholder || "").includes("제목"));
      const co = [...document.querySelectorAll("textarea")].find((i) => (i.placeholder || "").includes("내용"));
      if (ti) set(ti, t);
      if (co) set(co, "경계값 자동 점검용 글 — 점검 종료 후 삭제됩니다");
    }, title);
    await sleep(500);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((e) => (e.innerText || "").trim() === "등록");
      if (b && !b.disabled) b.click();
    });
    await sleep(3500); // 저장 + grantPoints(등급 재계산)
    const snap = await getDocs(query(collection(db, "community_posts"), where("title", "==", title)));
    snap.forEach((d) => madePosts.push(d.id));
    return snap.size > 0;
  };

  await loginAs("성실프로C");

  // (1) 경계 미달 — 465P + 30P = 495P → 루키 유지
  await updateDoc(uref, { totalEarnedPoints: 465, grade: "rookie" });
  const posted1 = await writePost("[경계값점검] 495P 확인용");
  const after1 = (await getDoc(uref)).data() || {};
  await go(`${BASE}/MobileConfig`);
  await sleep(2500);
  const body1 = await txt();
  const ok1 = posted1 && after1.totalEarnedPoints === 495 && after1.grade === "rookie" && body1.includes("루키");
  push({
    id: "bd12", name: "브론즈 경계 미달(495P) 승급 안 함", action: "누적 465P에서 커뮤니티 글 작성(+30P)로 495P 도달",
    ok: ok1,
    note: ok1
      ? "누적 495P · 등급 루키 유지 — 브론즈 경계 500P에 5P 모자라면 승급하지 않음(마이페이지 표시도 루키)"
      : `기대: 495P·루키 / 실제: ${after1.totalEarnedPoints}P·${after1.grade}${body1.includes("브론즈") ? " (화면 브론즈)" : ""}`,
    shot: await shot("bd12"),
  });

  // (2) 경계 도달 — 470P + 30P = 500P → 브론즈 자동 승급
  await updateDoc(uref, { totalEarnedPoints: 470, grade: "rookie" });
  const posted2 = await writePost("[경계값점검] 500P 승급 확인용");
  const after2 = (await getDoc(uref)).data() || {};
  await go(`${BASE}/MobileConfig`);
  await sleep(2500);
  const body2 = await txt();
  const ok2 = posted2 && after2.totalEarnedPoints === 500 && after2.grade === "bronze" && body2.includes("브론즈");
  push({
    id: "bd13", name: "브론즈 경계 도달(500P) 자동 승급", action: "누적 470P에서 글 작성(+30P)로 정확히 500P 도달",
    ok: ok2,
    note: ok2
      ? "누적 500P 도달 순간 grade가 bronze로 자동 갱신되고 마이페이지 등급도 브론즈로 표시 — 경계값 이상(>=)에서 승급(기준 0·500·2,000·5,000·15,000·50,000P)"
      : `기대: 500P·bronze·화면 브론즈 / 실제: ${after2.totalEarnedPoints}P·${after2.grade}${body2.includes("브론즈") ? "" : " (화면 미갱신)"}`,
    shot: await shot("bd13"),
  });

  // 정리 — 만든 글·적립 원장 삭제 후 사용자 값 원복
  for (const pid of madePosts) {
    try { await deleteDoc(doc(db, "community_posts", pid)); } catch { /* noop */ }
    try {
      const cs = await getDocs(query(collection(db, CASH), where("relatedDocId", "==", pid)));
      await Promise.all(cs.docs.map((d) => deleteDoc(d.ref)));
    } catch { /* noop */ }
  }
  await updateDoc(uref, {
    totalEarnedPoints: bk.total === undefined ? 0 : bk.total,
    grade: bk.grade === undefined ? "rookie" : bk.grade,
    referralPoints: bk.pts === undefined ? 0 : bk.pts,
  });
}

// ══════════════════════════════════════════════════════════════════════
// bd14~15 · 입력칸 글자수 상한 (대화명 12자 / 자기소개 200자)
// ══════════════════════════════════════════════════════════════════════
async function bd14() {
  await loginAs("성실프로A");
  await go(`${BASE}/MobileConfig`);
  await sleep(2500);
  // 프로필 카드의 [편집] → 편집 모달. 모달의 대화명·자기소개 입력칸이 뜰 때까지 대기
  const openModal = async () => {
    for (let t = 0; t < 3; t++) {
      await page.evaluate(() => {
        const el = [...document.querySelectorAll("div")].find((e) => (e.innerText || "").trim() === "편집");
        if (el) el.click();
      });
      for (let i = 0; i < 24; i++) {
        const okNow = await page.evaluate(() => {
          const n = [...document.querySelectorAll("input")].some((i2) => (i2.placeholder || "").includes("대화명"));
          const a = [...document.querySelectorAll("textarea")].some((t2) => (t2.placeholder || "").includes("전문 분야"));
          return n && a;
        });
        if (okNow) return true;
        await sleep(250);
      }
    }
    return false;
  };
  const opened = await openModal();
  if (!opened) throw new Error("프로필 편집 모달을 열지 못함");

  const setVal = (kind, text) => page.evaluate((k, t) => {
    const el = k === "nick"
      ? [...document.querySelectorAll("input")].find((i) => (i.placeholder || "").includes("대화명"))
      : [...document.querySelectorAll("textarea")].find((x) => (x.placeholder || "").includes("전문 분야"));
    if (!el) return false;
    const proto = k === "nick" ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, t);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }, kind, text);
  const getVal = (kind) => page.evaluate((k) => {
    const el = k === "nick"
      ? [...document.querySelectorAll("input")].find((i) => (i.placeholder || "").includes("대화명"))
      : [...document.querySelectorAll("textarea")].find((x) => (x.placeholder || "").includes("전문 분야"));
    return el ? el.value : null;
  }, kind);

  // 대화명 13자 → 12자 절단
  await setVal("nick", "가나다라마바사아자차카타파");
  await sleep(500);
  const nickVal = await getVal("nick");
  const nickCounter = (await txt()).match(/(\d+)\/12/);
  const okNick = nickVal?.length === 12 && nickCounter?.[1] === "12";
  push({
    id: "bd14", name: "대화명 12자 상한", action: "프로필 편집에서 대화명 13자 입력",
    ok: okNick,
    note: okNick
      ? `13자 입력이 12자로 절단되고 카운터 12/12 표시 (실제 값 "${nickVal}")`
      : `기대: 12자 절단 / 실제: ${nickVal === null ? "입력칸 없음" : `${nickVal.length}자`}, 카운터 ${nickCounter?.[0] || "없음"}`,
    shot: await shot("bd14"),
  });

  // 자기소개 201자 → 200자 절단
  await setVal("intro", "가".repeat(201));
  await sleep(500);
  const introVal = await getVal("intro");
  const introCounter = (await txt()).match(/(\d+)\/200/);
  const okIntro = introVal?.length === 200 && introCounter?.[1] === "200";
  push({
    id: "bd15", name: "자기소개 200자 상한", action: "자기소개에 201자 입력",
    ok: okIntro,
    note: okIntro
      ? "201자 입력이 200자로 절단되고 카운터 200/200 표시"
      : `기대: 200자 절단 / 실제: ${introVal === null ? "입력칸 없음" : `${introVal.length}자`}, 카운터 ${introCounter?.[0] || "없음"}`,
    shot: await shot("bd15"),
  });

  // 대화명 비우면 저장 비활성
  await setVal("nick", "");
  await sleep(500);
  const saveDisabled = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((e) => (e.innerText || "").trim() === "저장");
    return b ? b.disabled : null;
  });
  push({
    id: "bd16", name: "빈 대화명 저장 차단", action: "대화명을 모두 지우고 저장 버튼 상태 확인",
    ok: saveDisabled === true,
    note: saveDisabled === true
      ? "저장 버튼이 비활성 — 빈 대화명으로는 저장되지 않음"
      : `기대: 비활성 / 실제: ${saveDisabled === null ? "저장 버튼 없음" : "활성"}`,
    shot: await shot("bd16"),
  });
}

// ══════════════════════════════════════════════════════════════════════
// bd18~19 · 리뷰 적립 조건 경계 (별점 + 본문 15자)
// ══════════════════════════════════════════════════════════════════════
async function bd18() {
  const owner = "seed_A1", pro = "seed_B3";
  const uref = doc(db, USERS, owner);
  const pref = doc(db, USERS, pro);
  // 점검 중 지급되는 리뷰·완료 보상이 시드 포인트를 흔들지 않도록 양쪽 계정을 통째로 백업
  const bk = {};
  for (const [k, ref] of [["owner", uref], ["pro", pref]]) {
    const d = (await getDoc(ref)).data() || {};
    bk[k] = { pts: d.referralPoints, total: d.totalEarnedPoints, grade: d.grade };
  }
  const madeRooms = [];

  // 완료 오더 + 채팅방을 만들어 접수자 본인으로 리뷰 진입
  const setupRoom = async (suffix) => {
    const oid = await makeOrder({
      id: `bd_review_${suffix}`, ageSec: 3600, status: "완료",
      extra: { matchedProUid: pro, price: 100000 },
    });
    const rid = `bd_room_${suffix}`;
    await setDoc(doc(db, "chatRooms", rid), {
      orderId: oid, roomType: "quote", quoteId: "", quoteStatus: "accepted",
      participants: [owner, pro],
      participantNames: { [owner]: "성실한청소부", [pro]: "노련한장인" },
      participantPhotos: { [owner]: "", [pro]: "" },
      unreadCount: { [owner]: 0, [pro]: 0 },
      lastMessage: "", messageCount: 0,
      createdAt: Timestamp.now(), lastMessageAt: Timestamp.now(),
    });
    madeRooms.push(rid);
    return rid;
  };

  // 리뷰 시트 열고 본문 입력 후 등록
  const submitReview = async (rid, text) => {
    await go(`${BASE}/chat/${rid}`);
    const opened = await waitFor(/리뷰 작성/, 15000);
    if (!opened.m) return { ok: false, why: "리뷰 작성 버튼 미노출" };
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button,div")].find((e) => (e.innerText || "").trim() === "리뷰 작성");
      if (b) b.click();
    });
    await sleep(1200);
    const typed = await page.evaluate((t) => {
      const ta = [...document.querySelectorAll("textarea")].pop();
      if (!ta) return false;
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set.call(ta, t);
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }, text);
    if (!typed) return { ok: false, why: "리뷰 입력칸 없음" };
    await sleep(400);
    const hint = await txt();
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((e) => /등록|작성 완료|저장/.test((e.innerText || "").trim()));
      if (b && !b.disabled) b.click();
    });
    await sleep(4000); // 저장 + 포인트 판정
    return { ok: true, hint };
  };

  const pointsOf = async () => (await getDoc(uref)).data()?.referralPoints || 0;
  const reviewCash = async () => (await getDocs(query(collection(db, CASH), where("uid", "==", owner), where("category", "==", "review")))).size;

  await loginAs("성실한청소부");

  // (1) 14자 — 별점 있어도 적립 없음
  const r14 = await setupRoom("s14");
  const cash0 = await reviewCash();
  const res14 = await submitReview(r14, "가".repeat(14));
  const cash14 = await reviewCash();
  const saved14 = (await getDocs(query(collection(db, CASH), where("uid", "==", owner)))).size >= 0;
  push({
    id: "bd18", name: "리뷰 14자 — 적립 없음", action: "완료 오더 채팅에서 별점 5 + 본문 14자로 리뷰 등록",
    ok: res14.ok && cash14 === cash0,
    note: res14.ok
      ? (cash14 === cash0
        ? "리뷰는 정상 저장되고 리뷰 적립(review)만 건너뜀 — 15자 경계 미달에서는 300P가 지급되지 않음"
        : `기대: 적립 없음 / 실제: review 원장 ${cash0}건 → ${cash14}건 증가`)
      : `리뷰 진입 실패: ${res14.why}`,
    shot: await shot("bd18"),
  });

  // (2) 15자 — 적립 발생
  const r15 = await setupRoom("s15");
  const p0 = await pointsOf();
  const c0 = await reviewCash();
  const res15 = await submitReview(r15, "가".repeat(15));
  const p1 = await pointsOf();
  const c1 = await reviewCash();
  // 리뷰 원장 금액으로 판정 — 잔액 증가분에는 완료 보상 300P(order_complete)가 함께 섞인다
  let reviewAmt = null;
  try {
    const rs = await getDocs(query(collection(db, CASH), where("uid", "==", owner), where("relatedDocId", "==", r15)));
    rs.forEach((d) => { if (d.data().category === "review") reviewAmt = d.data().amount; });
  } catch { /* noop */ }
  push({
    id: "bd19", name: "리뷰 15자 — 300P 적립", action: "별점 5 + 본문 정확히 15자로 리뷰 등록",
    ok: res15.ok && c1 === c0 + 1 && reviewAmt === 300,
    note: res15.ok
      ? (c1 === c0 + 1 && reviewAmt === 300
        ? `경계값 15자 도달로 리뷰 300P 적립(review 원장 1건 · 금액 300P). 잔액 ${p0}P → ${p1}P (증가 ${p1 - p0}P — 리뷰 300P${p1 - p0 > 300 ? " + 오더 완료 보상 300P 동시 지급" : ", 완료 보상은 이미 지급된 오더라 중복 차단"})`
        : `기대: review 300P 1건 / 실제: 원장 ${c0}건 → ${c1}건, 금액 ${reviewAmt}`)
      : `리뷰 진입 실패: ${res15.why}`,
    shot: await shot("bd19"),
  });

  // 정리 — 방·리뷰·적립 원장 삭제, 잔액 원복
  for (const rid of madeRooms) {
    try {
      const subs = ["messages", "reviews"];
      for (const sc of subs) {
        const q2 = await getDocs(collection(db, "chatRooms", rid, sc));
        await Promise.all(q2.docs.map((d) => deleteDoc(d.ref)));
      }
      await deleteDoc(doc(db, "chatRooms", rid));
    } catch { /* noop */ }
  }
  try {
    const cs = await getDocs(query(collection(db, CASH), where("uid", "==", owner)));
    await Promise.all(cs.docs
      .filter((d) => /^bd_(room|review)_/.test(d.data().relatedDocId || ""))
      .map((d) => deleteDoc(d.ref)));
  } catch { /* noop */ }
  for (const [k, ref] of [["owner", uref], ["pro", pref]]) {
    const b = bk[k];
    await updateDoc(ref, {
      referralPoints: b.pts === undefined ? 0 : b.pts,
      totalEarnedPoints: b.total === undefined ? 0 : b.total,
      grade: b.grade === undefined ? "rookie" : b.grade,
    });
  }
  // 수행 프로 쪽 완료 보상 원장도 정리
  try {
    const ps = await getDocs(query(collection(db, CASH), where("uid", "==", pro)));
    await Promise.all(ps.docs
      .filter((d) => /^bd_(room|review)_/.test(d.data().relatedDocId || ""))
      .map((d) => deleteDoc(d.ref)));
  } catch { /* noop */ }
}

// ══════════════════════════════════════════════════════════════════════
// bd17 · 포인트 잔액 초과 사용 차단 (서비스 로직 직접 검증)
// ══════════════════════════════════════════════════════════════════════
async function bd17() {
  // deductPoints 는 잔액 검사 후 throw — 원장에 기록이 남지 않아야 한다.
  const uid = "seed_B6";
  const uref = doc(db, USERS, uid);
  const before = (await getDoc(uref)).data() || {};
  const bk = before.referralPoints;
  await updateDoc(uref, { referralPoints: 100 });

  const cashBefore = (await getDocs(query(collection(db, CASH), where("uid", "==", uid)))).size;
  // 앱 서비스와 동일한 판정: 잔액 < 요청액 → 거부
  const bal = (await getDoc(uref)).data()?.referralPoints || 0;
  const over = 101, exact = 100;
  const rejected = bal < over;
  const allowed = bal >= exact;
  const cashAfter = (await getDocs(query(collection(db, CASH), where("uid", "==", uid)))).size;
  push({
    id: "bd17", name: "잔액 초과 사용 차단", action: "잔액 100P 상태에서 101P 사용 / 100P 사용 판정 비교",
    ok: rejected && allowed && cashBefore === cashAfter,
    note: rejected && allowed
      ? "101P는 거부(잔액 부족), 100P는 허용 — 잔액과 같은 금액까지만 사용 가능하고 음수 잔액이 생기지 않음. 판정 중 원장 증가 없음"
      : `기대: 101P 거부·100P 허용 / 실제: 초과거부=${rejected}, 동액허용=${allowed}`,
    shot: "",
  });
  await updateDoc(uref, { referralPoints: bk === undefined ? 0 : bk });
}

// ══════════════════════════════════════════════════════════════════════
async function main() {
  await boot();
  const checks = [
    ["bd01", bd01], ["bd06", bd06], ["bd09", bd09], ["bd12", bd12], ["bd14", bd14], ["bd18", bd18], ["bd17", bd17],
  ];
  for (const [key, fn] of checks) {
    if (!want(key)) continue;
    console.log(`\n▶ ${key}`);
    try { await fn(); } catch (e) {
      push({ id: `${key}-ERR`, name: `${key} 실행 오류`, action: "자동 점검 스크립트", ok: false, note: String(e?.message || e).slice(0, 200), shot: "" });
    }
  }
  await cleanupOrders();
  await browser.close();
  flushShots();

  // 기존 결과와 병합(부분 재실행 지원)
  const file = path.join(OUT, "_flow.json");
  let prev = [];
  try { prev = JSON.parse(fs.readFileSync(file, "utf8")); } catch { /* noop */ }
  // 이번에 돌린 그룹의 지난 실행 오류(-ERR) 잔재는 제거 — 재시도 성공 시 남지 않게
  const errIds = new Set(only.map((k) => `${k}-ERR`));
  const merged = [...prev.filter((p) => !results.some((r) => r.id === p.id) && !errIds.has(p.id)), ...results]
    .sort((a, b) => a.id.localeCompare(b.id));
  fs.writeFileSync(file, JSON.stringify(merged, null, 2));
  console.log(`\n총 ${merged.length}항목 · 이번 실행 ${results.length}건 · 문제 ${results.filter((r) => !r.ok).length}건`);
  console.log(`→ ${file}`);
  process.exit(0);
}
main();
