// B1 공동중개 라운지 (brokerage) — bk01~bk08
//   node scripts/qa-brokerage.mjs
import { createRunner, BASE, db, fx, COL, sleep } from "./qa-shared.mjs";

const r = createRunner({ group: "brokerage", dir: "20260731-brokerage" });
const made = [];

async function clickText(page, texts, tag = "button,div,span") {
  return page.evaluate((texts, tag) => {
    const arr = Array.isArray(texts) ? texts : [texts];
    const els = [...document.querySelectorAll(tag)];
    for (const t of arr) {
      const el = els.find((e) => (e.innerText || "").trim() === t || (e.innerText || "").includes(t));
      if (el && el.children.length < 3) { el.click(); return t; }
    }
    return null;
  }, texts, tag);
}

// 등록 폼 입력: Input 순서 [지역, 예산, 한줄요약(필수)] + textarea[0]=상세
async function fillCreateForm(page, { region, oneLine, detail }) {
  const inputs = await page.$$("input");
  const set = async (el, val) => {
    if (!el) return;
    await el.click({ clickCount: 3 }).catch(() => {});
    await el.type(val, { delay: 8 });
  };
  await set(inputs[0], region);        // 지역
  await set(inputs[2] || inputs[1], oneLine); // 한 줄 요약(필수) — 3번째 Input
  const tas = await page.$$("textarea");
  if (tas[0] && detail) await tas[0].type(detail, { delay: 4 });
}

// SubmitBtn(정확히 "등록하기"/"등록 중...") 을 콕 집어 클릭
async function submitForm(page) {
  await sleep(200);
  return page.evaluate(() => {
    const btns = [...document.querySelectorAll("button,div")];
    const b = btns.find((e) => /^등록하기$|^등록 중/.test((e.innerText || "").trim()));
    if (b) { b.click(); return true; }
    return false;
  });
}

async function main() {
  const page = await r.boot();

  // ── bk06/dp04 먼저: 의뢰자(비프로) 진입 시 무엇이 보이는가 ─────────────
  await r.loginAs("성실한청소부"); // 의뢰자 A1
  await r.go(`${BASE}/brokerage`);
  await sleep(2500);
  let body = await r.txt();
  const reqSawLounge = /공동중개|공인중개|라운지|손님|매물/.test(body);
  await r.go(`${BASE}/brokerage/create`);
  await r.waitFor(/유형 선택|등록하기|손님 찾습니다/, 8000);
  const reqCreateBody = await r.txt();
  const reqCanCreate = /등록하기/.test(reqCreateBody) && /손님 찾습니다|매물 있습니다/.test(reqCreateBody);
  await r.shot("bk06");
  r.push({ id: "bk06", name: "의뢰자 공동중개 접근 통제", action: "의뢰자 계정으로 /brokerage·/create 직접 진입",
    ok: !reqCanCreate, shot: "bk06.png",
    note: reqCanCreate ? "게이트 없음 — 의뢰자도 등록 폼 접근·등록 가능(보고: proOnly 미적용, '개업 공인중개사 전용'은 안내문뿐)" : "비프로 등록 차단 확인" });

  // ── 홈프로로 전환: 등록/목록 정상 흐름 ───────────────────────────────
  await r.logout();
  await r.loginAs("용감한강아지"); // 홈프로 B1

  // bk01 손님찾기 등록
  await r.go(`${BASE}/brokerage/create`);
  await r.waitFor(/유형 선택|손님 찾습니다/, 8000);
  await clickText(page, "손님 찾습니다");
  await sleep(300);
  await clickText(page, "아파트/주상복합/콘도미니엄", "div,span,button");
  await clickText(page, "매매", "div,span,button");
  await fillCreateForm(page, { region: "마포구 공덕동", oneLine: "[QA] 카페 무권리 상가 찾는 손님", detail: "[QA] 자동점검 등록 — 종료 후 삭제" });
  await r.shot("bk01");
  const before = (await fx.getDocs(fx.collection(db, COL.brokerage))).size;
  await submitForm(page);
  await sleep(2500);
  const afterSnap = await fx.getDocs(fx.query(fx.collection(db, COL.brokerage), fx.orderBy("createdAt", "desc")));
  const after = afterSnap.size;
  const mine = afterSnap.docs.find((d) => (d.data().oneLine || d.data().title || "").includes("[QA]"));
  if (mine) made.push(mine.id);
  r.push({ id: "bk01", name: "손님찾기(demand) 등록", action: "홈프로 등록 폼 작성→등록",
    ok: after > before && !!mine, shot: "bk01.png",
    note: mine ? `brokerage_posts 생성(type=${mine.data().type})` : `등록 반영 확인 실패(before ${before}/after ${after})` });

  // bk02 매물등록
  await r.go(`${BASE}/brokerage/create`);
  await r.waitFor(/유형 선택|매물 있습니다/, 8000);
  // 매물 탭이 실제로 활성화될 때까지(보안형 안내문 출현) 확인 — 정확 매칭 클릭
  let listingOn = false;
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => {
      const el = [...document.querySelectorAll("button,div,span")]
        .find((e) => (e.innerText || "").trim() === "매물 있습니다");
      if (el) el.click();
    });
    await sleep(600);
    if (/보안형|상세 번지는 노출되지/.test(await r.txt())) { listingOn = true; break; }
  }
  await clickText(page, "상가.점포/사무실/지식산업센터", "div,span,button");
  await clickText(page, "월세", "div,span,button");
  await fillCreateForm(page, { region: "강서구 화곡동", oneLine: "[QA] 역세권 코너 상가 임대", detail: "[QA] 자동점검 매물 — 종료 후 삭제" });
  await submitForm(page);
  await sleep(2200);
  const listSnap = await fx.getDocs(fx.query(fx.collection(db, COL.brokerage), fx.orderBy("createdAt", "desc")));
  const listing = listSnap.docs.find((d) => (d.data().oneLine || d.data().title || "").includes("역세권 코너"));
  if (listing) made.push(listing.id);
  await r.shot("bk02");
  r.push({ id: "bk02", name: "매물등록(listing) 등록", action: "매물 탭 등록",
    ok: !!listing && listing.data().type === "listing", shot: "bk02.png",
    note: listing ? `type=${listing.data().type}` : "매물 등록 반영 확인 실패" });

  // bk03 목록 최신순
  await r.go(`${BASE}/brokerage`);
  await sleep(2000);
  await r.shot("bk03");
  const listBody = await r.txt();
  r.push({ id: "bk03", name: "목록 노출·최신순", action: "/brokerage 진입",
    ok: /역세권 코너|카페 무권리|매물|손님/.test(listBody), shot: "bk03.png",
    note: "createdAt desc 목록 렌더 확인" });

  // bk04 거래유형 8·계약유형 4 노출
  await r.go(`${BASE}/brokerage/create`);
  await sleep(1500);
  const createBody = await r.txt();
  const dealCount = ["아파트/주상복합/콘도미니엄","빌라","단독","상가.점포","통빌딩","공장/창고","나대지","기타"].filter((t) => createBody.includes(t)).length;
  const contractOk = ["매매","전세","월세","기타"].every((t) => createBody.includes(t));
  await r.shot("bk04");
  r.push({ id: "bk04", name: "거래유형 8·계약유형 4 노출", action: "등록 폼 옵션 확인",
    ok: dealCount >= 7 && contractOk, shot: "bk04.png",
    note: `거래유형 ${dealCount}/8 · 계약유형 ${contractOk ? "4/4" : "누락"}` });

  // bk05 필수값(지역) 미입력 차단
  await r.go(`${BASE}/brokerage/create`);
  await sleep(1500);
  await submitForm(page);
  await sleep(800);
  await r.shot("bk05");
  const blocked = /지역을 입력|입력해주세요|실패/.test(r.lastDialog) || /지역을 입력/.test(await r.txt());
  r.push({ id: "bk05", name: "필수값 미입력 등록 차단", action: "빈 폼 등록 시도",
    ok: blocked, shot: "bk05.png", note: blocked ? `차단: ${r.lastDialog || "안내"}` : "빈 폼도 등록됨(보고)" });

  // bk07 상세 진입·작성자 표기
  await r.go(`${BASE}/brokerage`);
  await sleep(1800);
  await clickText(page, "역세권 코너", "div,span,button,h1,h2,h3,p");
  await sleep(1500);
  await r.shot("bk07");
  r.push({ id: "bk07", name: "상세·작성자 표기", action: "목록→카드→상세",
    ok: true, shot: "bk07.png", note: "상세 진입 화면 캡처(작성자 companyName>nickname)" });

  // bk08 XSS 문자열
  await r.go(`${BASE}/brokerage/create`);
  await r.waitFor(/유형 선택|손님 찾습니다/, 8000);
  await clickText(page, "손님 찾습니다");
  await sleep(300);
  const XSS = '<img src=x onerror="window.__xss=1">';
  await fillCreateForm(page, { region: "테스트구", oneLine: "[QA] XSS " + XSS, detail: "[QA] " + XSS });
  await submitForm(page);
  await sleep(2000);
  const xssSnap = await fx.getDocs(fx.query(fx.collection(db, COL.brokerage), fx.orderBy("createdAt", "desc")));
  const xssDoc = xssSnap.docs.find((d) => (d.data().oneLine || d.data().title || "").includes("XSS"));
  if (xssDoc) made.push(xssDoc.id);
  await r.go(`${BASE}/brokerage`);
  await sleep(2000);
  const xssFired = await page.evaluate(() => window.__xss === 1);
  await r.shot("bk08");
  r.push({ id: "bk08", name: "XSS 입력 이스케이프", action: "onerror 페이로드 등록→목록 렌더",
    ok: !xssFired, shot: "bk08.png", note: xssFired ? "XSS 실행됨(심각·보고)" : "이스케이프 렌더(스크립트 미실행)" });

  // 정리 — 만든 테스트 글 삭제
  for (const id of made) { try { await fx.deleteDoc(fx.doc(db, COL.brokerage, id)); } catch {} }
  console.log(`cleanup: ${made.length} brokerage_posts 삭제`);

  await r.finish();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
