// 일회성 캡처 — 고객센터 FAQ 화면 확인용
//   node scripts/shot-support.mjs [출력디렉토리] [포트]
import { createRequire } from "module";
import fs from "fs";
const require = createRequire("/Users/a1111/.npm/_npx/55158e48eb5c59f7/");
const puppeteer = require("puppeteer");

const OUT = process.argv[2] || "/tmp/shot-support";
const PORT = process.argv[3] || "3005";
const BASE = `http://localhost:${PORT}`;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=430,900"],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
page.on("dialog", async (d) => { await d.accept().catch(() => {}); });

// 시드 로그인
await page.goto(`${BASE}/seed-login`, { waitUntil: "networkidle2" });
await sleep(1200);
const clicked = await page.evaluate(() => {
  const els = [...document.querySelectorAll("div,button")];
  const card = els.find((e) => (e.innerText || "").includes("성실한청소부") && e.children.length && e.innerText.length < 60);
  if (!card) return false;
  card.click();
  return true;
});
console.log("login clicked:", clicked);
await sleep(6000);

// 로그인 반영까지 대기 — 바로 이동하면 가드에 걸려 로그인 화면으로 튕긴다
for (let i = 0; i < 10; i++) {
  await page.goto(`${BASE}/support`, { waitUntil: "networkidle2" });
  await sleep(2000);
  const ok = await page.evaluate(() => document.body.innerText.includes("무엇을 도와드릴까요"));
  if (ok) break;
  console.log("support 진입 재시도", i + 1);
  await sleep(2000);
}
await sleep(1000);
await page.screenshot({ path: `${OUT}/01-top.png` });

// 전체 목록 스크롤
await page.evaluate(() => window.scrollTo(0, 600));
await sleep(400);
await page.screenshot({ path: `${OUT}/02-list.png` });

// 카테고리 필터 (포인트·등급) 후 아코디언 열기
await page.evaluate(() => window.scrollTo(0, 0));
await sleep(300);
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => (b.innerText || "").trim() === "포인트·등급");
  if (btn) btn.click();
});
await sleep(600);
await page.evaluate(() => {
  const rows = [...document.querySelectorAll("div")]
    .filter((e) => (e.innerText || "").trim().startsWith("포인트는 어떻게 모으나요") && e.children.length === 2);
  if (rows.length) rows[rows.length - 1].click();
});
await sleep(600);
await page.screenshot({ path: `${OUT}/03-open.png` });

await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => (b.innerText || "").trim() === "오더·견적");
  if (btn) btn.click();
});
await sleep(600);
await page.screenshot({ path: `${OUT}/04-filter.png` });

// 검색
await page.evaluate(() => {
  const input = document.querySelector("input");
  if (input) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(input, "탈퇴");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
});
await sleep(800);
await page.screenshot({ path: `${OUT}/05-search.png` });

// 검색 결과 없음
await page.evaluate(() => {
  const input = document.querySelector("input");
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(input, "zzzz없는검색어");
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await sleep(800);
await page.screenshot({ path: `${OUT}/06-empty.png` });

console.log("saved to", OUT);
await browser.close();
process.exit(0);
