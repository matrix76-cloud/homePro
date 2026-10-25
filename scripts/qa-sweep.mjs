// 전 화면 자동 점검 (2026-10-25 전면 점검 때 만든 것). 쓰는 법:
//   npm run build && npx serve -s build -l 3077   (다른 터미널)
//   node scripts/qa-sweep.mjs <결과폴더> [all|public|mobile|admin|pc]
// 로그인은 /seed-login 의 '성실한청소부' 카드. 크롬은 headless-shell 만 쓴다(형 크롬 금지).
// Full-route sweep: logged-out public pass, logged-in mobile pass, admin pass, PC pass.
// Collects console errors, page errors, failed requests, blank bodies, horizontal overflow, tiny fonts, dialogs.
import { createRequire } from "module";
import fs from "fs";
const require = createRequire("/Users/a1111/.npm/_npx/55158e48eb5c59f7/");
const puppeteer = require("puppeteer");
const OUT = process.argv[2];
const ONLY = process.argv[3] || "all"; // all | public | mobile | admin | pc
const BASE = "http://localhost:3077";
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ORDER = "4TybXL2NhyHrjtZD1M8x", ORDER2 = "O1", CHAT = "21twd6fIitcPfGFTjK2s", POST = "Vp8WX4DHUFau5bdpsSmn";
const PUBLIC = ["/", "/intro", "/app", "/MobileSplash", "/MobileLogin", "/MobileSignup", "/MobileFindAccount", "/legal/terms", "/legal/privacy", "/legal/location", "/legal/delete-account", "/pg/0Y0uIRePY250UHsoUegL", "/colorlab", "/iconlab", "/lab", "/MobileMain", "/order/detail/" + ORDER, "/community"];
const MOBILE = [
  "/MobileMain", "/MobileMain?tab=all_orders", "/MobileMain?tab=my_orders", "/MobileMain?tab=ai_estimate", "/MobileMain?tab=assets",
  "/MobileLinkPhone", "/MobileSetNickname", "/ReferralInput", "/welcome", "/MobileConfig",
  "/MobileChat", `/chat/${CHAT}`, `/chat/${CHAT}/memo`, "/MobileContract",
  "/biz-profile", "/pro/list", "/education-market",
  "/insurance", "/insurance/my", "/insurance/claim", "/insurance/inquiry", `/insurance/claim/${ORDER}`,
  "/pay", "/pay/success", "/pay/fail", "/pay/billing-success",
  "/brokerage", "/brokerage/create", "/brokerage/7DhBD2beBLJU09OG5S9Q", "/profile/seed_B7", "/profile/seed_A1",
  "/training", "/training/create", "/training/T1", "/supplies", "/supplies/create", "/supplies/2F4cQIwfn2HBj7DnqTuw",
  "/pro/register-category", "/pro/categories", "/pro/category-detail/drain_pipe", "/pro/category-edit/drain_pipe",
  "/category/professional_cleaning", "/category/worker_call", "/service/professional_cleaning/x",
  "/notice", "/support", "/my-orders",
  "/order/ai-estimate", "/order/my-orders", "/order/create", "/order/create/professional_cleaning", "/order/create/worker_call", "/order/list",
  `/order/detail/${ORDER}`, `/order/detail/${ORDER2}`, "/order/detail/nope", `/order/worklog/${ORDER}`,
  "/order/worker-request/create", "/order/worker-request/detail/38IUFTezH9LxoyB4hgTF",
  "/marketplace", "/marketplace/create", "/marketplace/2rjqBoRs5A7EYeYpikPM",
  "/subscription", "/mypage/payments", "/mypage/pg", "/search", "/search?q=청소", "/calendar", "/calendar/create",
  ...Array.from({ length: 10 }, (_, i) => `/guide/${i + 1}`),
  "/mypage/blocks", "/mypage/app-settings", "/mypage/blacklist", "/blacklist-board",
  "/community", "/community/write", `/community/${POST}`, "/community/nope", "/referral/friends", "/referral/points",
  "/legal/terms", "/legal/privacy", "/legal/location", "/legal/delete-account", "/nope-404",
];
const ADMIN = ["/admin/login", "/admin", "/admin/users", "/admin/pro-approval", "/admin/blacklist", "/admin/reports", "/admin/insurance-inquiries", "/admin/matching", "/admin/chat", "/admin/ads", "/admin/points", "/admin/notice", "/admin/settlement", "/admin/payments", "/admin/updates", "/admin/settings",
  "/insurance-admin", "/insurance-admin/policies", "/insurance-admin/settlement", "/insurance-admin/claims", "/insurance-admin/settings"];
const PC = ["/intro", "/MobileMain", "/MobileMain?tab=my_orders", "/MobileMain?tab=assets", "/MobileChat", `/chat/${CHAT}`, "/order/create", "/order/create/professional_cleaning", `/order/detail/${ORDER}`, "/community", `/community/${POST}`, "/insurance", "/biz-profile", "/MobileConfig", "/calendar", "/mypage/app-settings", "/pro/register-category", "/marketplace", "/training", "/brokerage", "/notice", "/support", "/subscription", "/pay", "/search", "/MobileSignup", "/MobileLogin"];

const NOISE = [/favicon/i, /React DevTools/i, /ResizeObserver/i, /third-party cookie/i, /Tracking Prevention/i, /net::ERR_(ABORTED|BLOCKED_BY_CLIENT)/i, /Permissions-Policy/i, /preload/i, /was preloaded/i, /GSI_LOGGER/i, /\[vite\]/i, /source map/i, /DevTools/i];
const noisy = (t) => NOISE.some((r) => r.test(t));

const browser = await puppeteer.launch({ headless: "shell", executablePath: "/Users/a1111/.cache/puppeteer/chrome-headless-shell/mac_arm-155.0.8059.79/chrome-headless-shell-mac-arm64/chrome-headless-shell", args: ["--no-sandbox", "--lang=ko-KR"] });
const page = await browser.newPage();
let cur = null;
page.on("console", (m) => { if (!cur) return; const t = m.type(); const txt = m.text(); if ((t === "error" || t === "warning") && !noisy(txt)) cur[t === "error" ? "consoleErrors" : "consoleWarns"].push(txt.slice(0, 300)); });
page.on("pageerror", (e) => { if (cur) cur.pageErrors.push(String(e.message || e).slice(0, 300)); });
page.on("dialog", async (d) => { if (cur) cur.dialogs.push(d.message().slice(0, 200)); await d.dismiss().catch(() => {}); });
page.on("requestfailed", (r) => { if (!cur) return; const u = r.url(); const f = r.failure()?.errorText || ""; if (noisy(f) || /google-analytics|gstatic|googleapis\.com\/.*channel|firestore.*Listen/i.test(u)) return; cur.failedReqs.push(`${f} ${u.slice(0, 160)}`); });
page.on("response", (r) => { if (!cur) return; const s = r.status(); const u = r.url(); if (s >= 400 && !/firestore|identitytoolkit|securetoken|googleapis\.com\/v1/i.test(u)) cur.failedReqs.push(`${s} ${u.slice(0, 160)}`); });

const results = [];
async function visit(route, tag, viewport) {
  const rec = { tag, route, finalUrl: "", consoleErrors: [], consoleWarns: [], pageErrors: [], failedReqs: [], dialogs: [], textLen: 0, overflowX: false, tinyFonts: 0, tinySample: [], ellipsis: 0, height: 0, title: "", shot: "" };
  cur = rec;
  try {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 25000 });
  } catch (e) { rec.gotoError = String(e.message).slice(0, 120); }
  // wait until body text appears and stops changing (cold loads take 3~8s)
  let last = -1, stable = 0; const t0 = Date.now();
  while (Date.now() - t0 < 14000) {
    await sleep(500);
    const len = await page.evaluate(() => (document.body.innerText || "").trim().length).catch(() => -1);
    if (len > 40 && len === last) { stable++; if (stable >= 3) break; } else stable = 0;
    last = len;
  }
  rec.loadMs = Date.now() - t0;
  await sleep(600);
  try {
    rec.finalUrl = page.url().replace(BASE, "");
    const m = await page.evaluate(() => {
      const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0"; };
      const body = document.body;
      const textLen = (body.innerText || "").trim().length;
      const docW = document.documentElement.scrollWidth, winW = window.innerWidth;
      let tiny = 0; const tinySample = []; let ell = 0;
      const all = body.querySelectorAll("*");
      for (const el of all) {
        if (el.children.length && !Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        const txt = (el.innerText || "").trim(); if (!txt) continue;
        if (!vis(el)) continue;
        const cs = getComputedStyle(el); const fs = parseFloat(cs.fontSize);
        if (fs && fs < 12) { tiny++; if (tinySample.length < 6) tinySample.push(`${fs}px "${txt.slice(0, 18)}"`); }
        if (cs.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1) ell++;
      }
      return { textLen, overflowX: docW > winW + 1, docW, winW, tiny, tinySample, ell, height: document.documentElement.scrollHeight, title: document.title };
    });
    Object.assign(rec, { textLen: m.textLen, overflowX: m.overflowX, docW: m.docW, winW: m.winW, tinyFonts: m.tiny, tinySample: m.tinySample, ellipsis: m.ell, height: m.height, title: m.title });
    const name = `${tag}_${route.replace(/[^A-Za-z0-9가-힣]+/g, "_").replace(/^_|_$/g, "") || "root"}`.slice(0, 90);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: m.height < 6000 });
    rec.shot = name + ".png";
  } catch (e) { rec.evalError = String(e.message).slice(0, 120); }
  cur = null;
  results.push(rec);
  const flags = [rec.loadMs > 6000 && `SLOW${Math.round(rec.loadMs / 1000)}s`, rec.pageErrors.length && `PAGEERR${rec.pageErrors.length}`, rec.consoleErrors.length && `ERR${rec.consoleErrors.length}`, rec.failedReqs.length && `REQ${rec.failedReqs.length}`, rec.textLen < 40 && "BLANK", rec.overflowX && `OVERFLOW(${rec.docW}>${rec.winW})`, rec.tinyFonts && `TINY${rec.tinyFonts}`, rec.dialogs.length && `DIALOG`, rec.finalUrl !== route && `->${rec.finalUrl}`].filter(Boolean).join(" ");
  console.log(`[${tag}] ${route} ${flags}`);
}

const mobileVP = { width: 390, height: 844, deviceScaleFactor: 2 };
const pcVP = { width: 1366, height: 900, deviceScaleFactor: 1 };

if (ONLY === "all" || ONLY === "public") {
  await page.setViewport(mobileVP);
  for (const r of PUBLIC) await visit(r, "pub");
}
async function login() {
  await page.setViewport(mobileVP);
  await page.goto(`${BASE}/seed-login`, { waitUntil: "networkidle2" }); await sleep(1500);
  await page.evaluate(() => { const c = [...document.querySelectorAll("div,button")].find((e) => (e.innerText || "").includes("성실한청소부") && e.children.length && e.innerText.length < 60); c && c.click(); });
  await sleep(7000);
  console.log("logged in ->", page.url());
}
if (ONLY === "all" || ONLY === "mobile") {
  await login();
  for (const r of MOBILE) await visit(r, "m");
}
if (ONLY === "all" || ONLY === "admin") {
  await page.setViewport(pcVP);
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle2" }); await sleep(500);
  await page.evaluate(() => localStorage.setItem("adminSession", JSON.stringify({ id: "superadmin", loginId: "admin", name: "관리자", rank: "superadmin", loggedInAt: new Date().toISOString() })));
  for (const r of ADMIN) await visit(r, "adm");
}
if (ONLY === "all" || ONLY === "pc") {
  if (ONLY === "pc") await login();
  await page.setViewport(pcVP);
  for (const r of PC) await visit(r, "pc");
}
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(results, null, 1));
await browser.close();
console.log("DONE", results.length);
