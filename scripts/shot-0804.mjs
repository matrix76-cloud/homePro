// 8/4 리뷰 반영분 확인 캡처 — 안심케어 탭 / 현장기록 / 마이 교육.장터
//   node scripts/shot-0804.mjs [출력디렉토리] [포트]
import { createRequire } from "module";
import fs from "fs";
const require = createRequire("/Users/a1111/.npm/_npx/55158e48eb5c59f7/");
const puppeteer = require("puppeteer");

const OUT = process.argv[2] || "/tmp/shot-0804";
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
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE:", m.text().slice(0, 160)); });

await page.goto(`${BASE}/seed-login`, { waitUntil: "networkidle2" });
await sleep(1500);
await page.evaluate(() => {
  const els = [...document.querySelectorAll("div,button")];
  const card = els.find((e) => (e.innerText || "").includes("성실한청소부") && e.children.length && e.innerText.length < 60);
  if (card) card.click();
});
await sleep(6000);

async function go(path, name, waitText) {
  for (let i = 0; i < 6; i++) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle2" });
    await sleep(2200);
    if (!waitText) break;
    const ok = await page.evaluate((t) => document.body.innerText.includes(t), waitText);
    if (ok) break;
    console.log(`${name} 재시도 ${i + 1}`);
  }
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

await go("/insurance", "01-insurance", "안심케어");
await go("/MobileConfig", "02-my", "교육.장터");
// 마이 화면에서 교육.장터 카드 위치까지 스크롤
await page.evaluate(() => {
  const main = document.querySelector("main");
  const el = [...document.querySelectorAll("div")].find((e) => (e.innerText || "").trim().startsWith("교육.장터") && e.innerText.length < 60);
  if (el && main) main.scrollTop = el.getBoundingClientRect().top + main.scrollTop - 200;
});
await sleep(600);
await page.screenshot({ path: `${OUT}/03-my-education.png` });

await go("/order/my-orders", "04-myorders", null);

console.log("saved to", OUT);
await browser.close();
process.exit(0);
