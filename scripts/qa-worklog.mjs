// 현장기록(체크인/체크아웃) 端-to-端 점검 — 임시 오더를 만들어 실제로 기록을 남기고, 끝나면 지운다.
//   node scripts/qa-worklog.mjs <출력디렉토리> <포트> <테스트사진경로>
// 규칙: 기존 시드 데이터는 건드리지 않는다. 만든 오더/기록/스토리지 파일은 finish에서 전부 삭제.
import { createRequire } from "module";
import fs from "fs";
import { initializeApp } from "firebase/app";
import {
  getFirestore, doc, setDoc, getDoc, deleteDoc, collection, getDocs, serverTimestamp,
} from "firebase/firestore";
import { getStorage, ref, deleteObject } from "firebase/storage";

const require = createRequire("/Users/a1111/.npm/_npx/55158e48eb5c59f7/");
const puppeteer = require("puppeteer");

const OUT = process.argv[2] || "/tmp/qa-worklog";
const PORT = process.argv[3] || "3005";
const PHOTO = process.argv[4];
const BASE = `http://localhost:${PORT}`;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ORDER_ID = "qa_worklog_tmp";
const PRO_UID = "seed_B1";      // 용감한강아지 (수행 홈프로)
const OWNER_UID = "seed_A1";    // 성실한청소부 (접수자)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

fs.mkdirSync(OUT, { recursive: true });

const app = initializeApp({
  apiKey: "AIzaSyDUVo__03JeXFktCckJc46YF7BLGjIwmWc",
  authDomain: "homepro-43f7f.firebaseapp.com",
  projectId: "homepro-43f7f",
  storageBucket: "homepro-43f7f.firebasestorage.app",
  messagingSenderId: "717297769007",
  appId: "1:717297769007:web:839b080defa7c763e284da",
});
const db = getFirestore(app);
const storage = getStorage(app);

const results = [];
const rec = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
};

/* ── 임시 오더 생성 ── */
await setDoc(doc(db, "homepro_orders", ORDER_ID), {
  title: "[QA] 현장기록 점검용 임시오더",
  categoryName: "전문청소",
  categoryId: "professional_cleaning",
  address: "서울 마포구 (QA 임시)",
  orderStatus: "배정",
  createdBy: OWNER_UID,
  writer: "성실한청소부",
  matchedProUid: PRO_UID,
  matchedProName: "용감한강아지",
  assignedAt: new Date(Date.now() - 3 * 3600 * 1000),  // 2시간 게이트 통과
  createdAt: serverTimestamp(),
  b2bPriceType: "fixed",
  price: 100000,
  qaTemp: true,
});
console.log("임시 오더 생성:", ORDER_ID);

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=430,900"],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
page.on("dialog", async (d) => { await d.accept().catch(() => {}); });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

// 위치 권한 부여 (체크인 GPS 기록 확인용)
const ctx = browser.defaultBrowserContext();
await ctx.overridePermissions(BASE, ["geolocation"]);
await page.setGeolocation({ latitude: 37.5559, longitude: 126.9236, accuracy: 12 });

try {
  /* ── 로그인 (수행 홈프로) ── */
  await page.goto(`${BASE}/seed-login`, { waitUntil: "networkidle2" });
  await sleep(1500);
  await page.evaluate(() => {
    const card = [...document.querySelectorAll("div,button")]
      .find((e) => (e.innerText || "").includes("용감한강아지") && e.children.length && e.innerText.length < 60);
    if (card) card.click();
  });
  await sleep(6000);

  const goWorklog = async (qs = "") => {
    for (let i = 0; i < 6; i++) {
      await page.goto(`${BASE}/order/worklog/${ORDER_ID}${qs}`, { waitUntil: "networkidle2" });
      await sleep(2200);
      const ok = await page.evaluate(() => document.body.innerText.includes("현장기록은 이렇게"));
      if (ok) return true;
    }
    return false;
  };

  /* ── 1. 체크인 전 화면 ── */
  const entered = await goWorklog();
  rec("현장기록 화면 진입", entered);
  await page.screenshot({ path: `${OUT}/01-before-checkin.png` });

  const hasCheckinBtn = await page.evaluate(() =>
    [...document.querySelectorAll("button")].some((b) => b.innerText.includes("작업시작 (체크인)")));
  rec("체크인 전에는 체크인 버튼만 노출", hasCheckinBtn);

  const hasCheckoutBtn = await page.evaluate(() =>
    [...document.querySelectorAll("button")].some((b) => b.innerText.includes("체크아웃")));
  rec("체크인 전 체크아웃 버튼 미노출 (Before/After 짝 강제)", !hasCheckoutBtn);

  /* ── 2. 체크인 시트 ── */
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.innerText.includes("작업시작 (체크인)"));
    if (b) b.click();
  });
  await sleep(2500);
  await page.screenshot({ path: `${OUT}/02-checkin-sheet.png` });

  const geoOk = await page.evaluate(() => document.body.innerText.includes("위치 확인됨"));
  rec("시트에서 위치 확인 표시", geoOk);

  // 사진 없이 등록 시도 → 막혀야 함
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.innerText.includes("현장 체크인 등록"));
    if (b) b.click();
  });
  await sleep(1200);
  const blocked = await page.evaluate(() => document.body.innerText.includes("사진을 최소 1장"));
  rec("사진 없이 체크인 등록 차단", blocked);
  await page.screenshot({ path: `${OUT}/03-photo-required.png` });

  /* ── 3. 사진 첨부 후 체크인 ── */
  const input = await page.$('input[type="file"]');
  await input.uploadFile(PHOTO);
  await sleep(3000);
  await page.screenshot({ path: `${OUT}/04-photo-attached.png` });

  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.innerText.includes("현장 체크인 등록"));
    if (b) b.click();
  });
  await sleep(9000);
  await page.screenshot({ path: `${OUT}/05-after-checkin.png` });

  const logs = await getDocs(collection(db, "homepro_orders", ORDER_ID, "worklogs"));
  const checkin = logs.docs.map((d) => d.data()).find((x) => x.type === "checkin");
  rec("체크인 기록 저장", !!checkin);
  rec("사진 URL 저장", !!checkin?.photos?.[0]?.url, checkin?.photos?.[0]?.url ? "1장" : "");
  rec("사진 해시(SHA-256) 저장", !!checkin?.photos?.[0]?.hash, (checkin?.photos?.[0]?.hash || "").slice(0, 16));
  rec("GPS 좌표 저장", !!checkin?.geo, checkin?.geo ? `${checkin.geo.lat},${checkin.geo.lng}` : "");
  rec("촬영·등록 시각 저장", !!checkin?.capturedAt, checkin?.capturedAt || "");

  const orderSnap = await getDoc(doc(db, "homepro_orders", ORDER_ID));
  rec("오더 요약 checkInAt 갱신", !!orderSnap.data()?.checkInAt);

  /* ── 4. 체크아웃 ── */
  await goWorklog();
  const nowHasCheckout = await page.evaluate(() =>
    [...document.querySelectorAll("button")].some((b) => b.innerText.includes("작업완료 (체크아웃)")));
  rec("체크인 후 체크아웃 버튼 노출", nowHasCheckout);

  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.innerText.includes("작업완료 (체크아웃)"));
    if (b) b.click();
  });
  await sleep(2500);
  const showsBefore = await page.evaluate(() => document.body.innerText.includes("체크인(Before) 사진"));
  rec("체크아웃 시트에 Before 사진 노출", showsBefore);
  await page.screenshot({ path: `${OUT}/06-checkout-sheet.png` });

  const input2 = await page.$('input[type="file"]');
  await input2.uploadFile(PHOTO);
  await sleep(3000);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.innerText.includes("작업완료 체크아웃 등록"));
    if (b) b.click();
  });
  await sleep(10000);
  await page.screenshot({ path: `${OUT}/07-after-checkout.png` });

  const logs2 = await getDocs(collection(db, "homepro_orders", ORDER_ID, "worklogs"));
  const checkout = logs2.docs.map((d) => d.data()).find((x) => x.type === "checkout");
  rec("체크아웃 기록 저장", !!checkout);

  const orderSnap2 = await getDoc(doc(db, "homepro_orders", ORDER_ID));
  rec("체크아웃 시 오더 상태 완료로 변경", orderSnap2.data()?.orderStatus === "완료", orderSnap2.data()?.orderStatus);
  rec("오더 요약 checkOutAt 갱신", !!orderSnap2.data()?.checkOutAt);

  /* ── 5. 접수자 열람 ── */
  await page.evaluate(async () => {
    try { localStorage.clear(); sessionStorage.clear(); } catch {}
    try {
      const dbs = (indexedDB.databases ? await indexedDB.databases() : []).map((d) => d.name).filter(Boolean);
      await Promise.all(dbs.map((n) => new Promise((res) => { const r = indexedDB.deleteDatabase(n); r.onsuccess = r.onerror = r.onblocked = res; })));
    } catch {}
  });
  await page.goto(`${BASE}/seed-login`, { waitUntil: "networkidle2" });
  await sleep(2000);
  await page.evaluate(() => {
    const card = [...document.querySelectorAll("div,button")]
      .find((e) => (e.innerText || "").includes("성실한청소부") && e.children.length && e.innerText.length < 60);
    if (card) card.click();
  });
  await sleep(6000);
  await goWorklog();
  await page.screenshot({ path: `${OUT}/08-owner-view.png` });
  const ownerSees = await page.evaluate(() => document.body.innerText.includes("현장 체크인") && document.body.innerText.includes("작업완료 체크아웃"));
  const ownerNoWrite = await page.evaluate(() =>
    ![...document.querySelectorAll("button")].some((b) => b.innerText.includes("작업시작 (체크인)")));
  rec("접수자도 기록 열람 가능", ownerSees);
  rec("접수자에게는 등록 버튼 미노출", ownerNoWrite);

} catch (e) {
  console.log("ERROR:", e.message);
  rec("스크립트 완주", false, e.message);
} finally {
  await browser.close();

  /* ── 정리: 스토리지 파일 → 서브컬렉션 → 오더 ── */
  try {
    const logs = await getDocs(collection(db, "homepro_orders", ORDER_ID, "worklogs"));
    for (const d of logs.docs) {
      for (const p of (d.data().photos || [])) {
        if (p.path) await deleteObject(ref(storage, p.path)).catch((e) => console.log("스토리지 삭제 실패:", p.path, e.code));
      }
      await deleteDoc(d.ref);
    }
    const olog = await getDocs(collection(db, "homepro_orders", ORDER_ID, "logs"));
    for (const d of olog.docs) await deleteDoc(d.ref);
    await deleteDoc(doc(db, "homepro_orders", ORDER_ID));
    console.log("임시 데이터 정리 완료");
  } catch (e) {
    console.log("정리 실패:", e.message);
  }

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n결과: ${passed}/${results.length} 통과`);
  fs.writeFileSync(`${OUT}/result.json`, JSON.stringify(results, null, 2));
  process.exit(0);
}
