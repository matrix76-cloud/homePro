// 공용 QA 하네스 — qa-boundary.mjs 패턴을 그룹 러너들이 재사용.
//   import { createRunner } from "./qa-shared.mjs";
//   const r = createRunner({ group: "brokerage", dir: "20260731-brokerage" });
//   await r.boot(); await r.loginAs("용감한강아지"); ... r.push({...}); await r.finish();
// 규칙(00-공통규칙): dev 3002, 스샷은 임시폴더→마지막에 public/qa/<dir>/로 복사,
//   기존 데이터 수정·삭제 금지, 만든 테스트 데이터는 finish에서 정리.
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import os from "os";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc,
  getDocs, query, where, orderBy, Timestamp, serverTimestamp,
} from "firebase/firestore";

const require = createRequire("/Users/a1111/.npm/_npx/55158e48eb5c59f7/");
const puppeteer = require("puppeteer");

export const BASE = "http://localhost:3002";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export const COL = {
  orders: "homepro_orders", users: "users", pros: "homepro_pros",
  cash: "homepro_cash", reviews: "homepro_reviews", blacklist: "homepro_blacklist",
  brokerage: "brokerage_posts", referralCodes: "referral_codes",
  community: "community_posts", chatRooms: "chatRooms", notifications: "notifications",
};

const app = initializeApp({
  apiKey: "AIzaSyDUVo__03JeXFktCckJc46YF7BLGjIwmWc",
  authDomain: "homepro-43f7f.firebaseapp.com",
  projectId: "homepro-43f7f",
  storageBucket: "homepro-43f7f.firebasestorage.app",
  messagingSenderId: "717297769007",
  appId: "1:717297769007:web:839b080defa7c763e284da",
});
export const db = getFirestore(app);
export const fx = { collection, doc, setDoc, getDoc, updateDoc, deleteDoc, getDocs, query, where, orderBy, Timestamp, serverTimestamp };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createRunner({ group, dir }) {
  const OUT = path.join("public/qa", dir);
  const SHOT_TMP = fs.mkdtempSync(path.join(os.tmpdir(), `qa-${group}-`));
  const results = [];
  let browser, page, lastDialog = "";

  const push = (r) => { results.push(r); console.log(`  ${r.ok ? "OK  " : "FAIL"} ${r.id} ${r.name} — ${r.note}`); };

  async function boot() {
    browser = await puppeteer.launch({
      executablePath: CHROME, headless: "new",
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=430,900"],
    });
    page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    page.on("dialog", async (d) => { lastDialog = d.message(); await d.accept().catch(() => {}); });
    return page;
  }

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
    await sleep(3500);
    return page.url();
  }

  async function logout() {
    // Firebase Auth 는 IndexedDB(firebaseLocalStorageDb)에 세션을 저장한다 —
    // localStorage 만 지우면 세션이 안 끊긴다. IndexedDB 까지 삭제 후 리로드.
    await page.evaluate(async () => {
      try { localStorage.clear(); sessionStorage.clear(); } catch {}
      try {
        const dbs = (indexedDB.databases ? await indexedDB.databases() : [])
          .map((d) => d.name).filter(Boolean);
        const names = dbs.length ? dbs : ["firebaseLocalStorageDb", "firebase-heartbeat-database", "firebaseLocalStorage"];
        await Promise.all(names.map((n) => new Promise((res) => {
          const req = indexedDB.deleteDatabase(n);
          req.onsuccess = req.onerror = req.onblocked = () => res();
        })));
      } catch {}
    });
    await page.goto(`${BASE}/MobileSplash`, { waitUntil: "domcontentloaded" }).catch(() => {});
    await sleep(1500);
    // 리로드 후에도 남아있을 수 있어 한 번 더 정리
    await page.evaluate(() => { try { localStorage.clear(); } catch {} });
    await sleep(500);
  }

  const txt = async () => {
    for (let i = 0; i < 4; i++) {
      try { return await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ")); }
      catch { await sleep(500); }
    }
    return "";
  };
  async function go(url, tries = 3) {
    for (let i = 0; i < tries; i++) {
      try { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 }); return; }
      catch (e) { if (i === tries - 1) throw e; await sleep(800); }
    }
  }
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
  async function shot(id) {
    await page.screenshot({ path: path.join(SHOT_TMP, `${id}.png`) });
    return `${id}.png`;
  }

  async function finish() {
    if (browser) await browser.close().catch(() => {});
    fs.mkdirSync(OUT, { recursive: true });
    for (const f of fs.readdirSync(SHOT_TMP)) fs.copyFileSync(path.join(SHOT_TMP, f), path.join(OUT, f));
    fs.rmSync(SHOT_TMP, { recursive: true, force: true });
    fs.writeFileSync(path.join(OUT, "_flow.json"), JSON.stringify(results, null, 2));
    const ok = results.filter((r) => r.ok).length;
    console.log(`\n[${group}] ${results.length}건 · 정상 ${ok} · 문제 ${results.length - ok} → ${OUT}/_flow.json`);
    return results;
  }

  return { boot, loginAs, logout, txt, go, waitFor, shot, push, finish,
    get page() { return page; }, get lastDialog() { return lastDialog; } };
}
