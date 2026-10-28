// 아이디·비밀번호 실제 로그인 점검 (2026-10-28). 쓰는 법: node scripts/qa-login.mjs <결과폴더>  (3077 에 serve -s build 가 떠 있어야 한다)
// 테스트 계정 test1234 / 1q2w3e4r — 빈칸 · 틀린 비번 · 맞는 비번 · 새로고침 유지 · 설정 화면 · 로그아웃 · 로그아웃 뒤 보호 화면 · 아이디/비번 찾기 · 회원가입 화면. 크롬은 headless-shell 만.
import { createRequire } from "module";
import fs from "fs";
const require = createRequire("/Users/a1111/.npm/_npx/55158e48eb5c59f7/");
const puppeteer = require("puppeteer");
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3077";
const ID = "test1234", PW = "1q2w3e4r";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const push = (id, name, ok, note) => { results.push({ id, name, ok, note }); console.log(`${ok ? "OK  " : "FAIL"} ${id} ${name} — ${note}`); };
const browser = await puppeteer.launch({ headless: "shell", executablePath: "/Users/a1111/.cache/puppeteer/chrome-headless-shell/mac_arm-155.0.8059.79/chrome-headless-shell-mac-arm64/chrome-headless-shell", args: ["--no-sandbox", "--lang=ko-KR"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
let lastDialog = ""; page.on("dialog", async (d) => { lastDialog = d.message(); await d.accept().catch(() => {}); });
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` }).catch(() => {});
const txt = () => page.evaluate(() => document.body.innerText || "");
const url = () => page.url().replace(BASE, "");
const settle = async (max = 15000) => { let last = -1, stable = 0; const t0 = Date.now(); while (Date.now() - t0 < max) { await sleep(500); const len = await page.evaluate(() => (document.body.innerText || "").trim().length).catch(() => -1); if (len > 20 && len === last) { if (++stable >= 3) break; } else stable = 0; last = len; } };
const waitUrl = async (re, max = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < max) { if (re.test(page.url())) return true; await sleep(400); } return re.test(page.url()); };
const fill = async (sel, v) => { const el = await page.$(sel); if (!el) throw new Error("no input " + sel); await el.click(); await page.$eval(sel, (e) => { e.focus(); e.select(); }); await page.keyboard.press("Backspace"); await page.keyboard.press("Backspace"); const left = await page.$eval(sel, (e) => e.value); for (let i = 0; i < left.length; i++) await page.keyboard.press("Backspace"); await el.type(v, { delay: 20 }); const got = await page.$eval(sel, (e) => e.value); if (got !== v) throw new Error(`fill mismatch ${sel}: ${got}`); };
const clickText = (re) => page.evaluate((src) => { const r = new RegExp(src); const el = [...document.querySelectorAll("button,a,[role=button],div,span")].reverse().find((e) => r.test((e.innerText || "").trim()) && e.children.length <= 2); if (el) { el.click(); return (el.innerText || "").trim().slice(0, 30); } return null; }, re.source);

// 1. 로그인 화면
await page.goto(`${BASE}/MobileLogin`, { waitUntil: "domcontentloaded" }); await settle(); await shot("01-login");
const hasInputs = await page.evaluate(() => !!document.querySelector('input[placeholder="아이디"]') && !!document.querySelector('input[placeholder="비밀번호"]'));
push("l1", "로그인 화면 표시", hasInputs && /MobileLogin/.test(url()), `url=${url()} inputs=${hasInputs}`);

// 2. 빈칸 제출
await clickText(/^로그인 하기$/); await sleep(800);
let t = await txt(); push("l2", "빈칸 제출 안내", /아이디와 비밀번호를 입력/.test(t), `msg=${(t.match(/아이디와 비밀번호를 입력[^\n]*/) || [""])[0]}`);

// 3. 틀린 비밀번호
await fill('input[placeholder="아이디"]', ID); await fill('input[placeholder="비밀번호"]', "wrong-pass-0000");
await clickText(/^로그인 하기$/);
let t0 = Date.now(), errMsg = ""; while (Date.now() - t0 < 12000) { await sleep(500); t = await txt(); const m = t.match(/(비밀번호[^\n]*|로그인[^\n]*실패[^\n]*|존재하지[^\n]*|잘못[^\n]*|일치[^\n]*|확인[^\n]*주세요[^\n]*)/); if (m && !/비밀번호 찾기|비밀번호$/.test(m[0])) { errMsg = m[0]; break; } if (!/MobileLogin/.test(url())) break; }
await shot("02-wrong-pw");
push("l3", "틀린 비밀번호 거절", /MobileLogin/.test(url()) && !!errMsg, `url=${url()} msg=${errMsg}`);

// 4. 맞는 비밀번호
await fill('input[placeholder="아이디"]', ID); await fill('input[placeholder="비밀번호"]', PW);
await clickText(/^로그인 하기$/);
const left = await waitUrl(/\/Mobile(Splash|Main)/, 25000);
await waitUrl(/\/MobileMain/, 20000); await settle(); await shot("03-after-login");
t = await txt();
push("l4", "아이디·비밀번호 로그인", left && /MobileMain/.test(url()), `url=${url()} textLen=${t.length}`);

// 5. 새로고침해도 유지
await page.reload({ waitUntil: "domcontentloaded" }); await waitUrl(/\/MobileMain/, 20000); await settle(); await shot("04-reload");
push("l5", "새로고침 뒤 로그인 유지", /MobileMain/.test(url()), `url=${url()}`);

// 6. 설정 화면 → 내 정보 보임
await page.goto(`${BASE}/MobileConfig`, { waitUntil: "domcontentloaded" }); await settle(); await shot("05-config");
t = await txt();
push("l6", "설정 화면(로그인 상태)", /MobileConfig/.test(url()) && /로그아웃/.test(t), `url=${url()} hasLogout=${/로그아웃/.test(t)}`);

// 7. 로그아웃
const lo = await clickText(/^로그아웃$/); await sleep(1500);
if (/로그아웃/.test(lastDialog) || lastDialog) { /* confirm 자동 수락 */ }
const confirmBtn = await clickText(/^(확인|로그아웃|네)$/).catch(() => null); await sleep(1000);
await waitUrl(/\/Mobile(Login|Splash|Main)|\/intro|\/$/, 15000); await settle(); await shot("06-after-logout");
const afterLogoutUrl = url();
push("l7", "로그아웃", !!lo && !/MobileConfig/.test(afterLogoutUrl), `clicked=${lo} dialog=${lastDialog.slice(0, 40)} url=${afterLogoutUrl}`);

// 8. 로그아웃 뒤 보호 화면
await page.goto(`${BASE}/MobileConfig`, { waitUntil: "domcontentloaded" }); await settle(8000); await shot("07-protected-after-logout");
t = await txt();
push("l8", "로그아웃 뒤 설정 화면 접근", !/로그아웃/.test(t), `url=${url()} hasLogout=${/로그아웃/.test(t)} loginPrompt=${/로그인/.test(t)}`);

// 9. 아이디 찾기 · 비밀번호 찾기 · 회원가입 화면 열림(제출 안 함)
for (const [id, p, re] of [["l9", "/MobileFindAccount?tab=find_id", /아이디 찾기|아이디/], ["l10", "/MobileFindAccount?tab=reset_pw", /비밀번호/], ["l11", "/MobileSignup", /회원가입|가입/]]) {
  await page.goto(BASE + p, { waitUntil: "domcontentloaded" }); await settle(); await shot(id);
  t = await txt(); push(id, "화면 열림 " + p, re.test(t) && t.length > 20, `url=${url()} textLen=${t.length}`);
}
push("l12", "페이지 오류 없음", errors.length === 0, errors.join(" | ").slice(0, 200) || "0");
fs.writeFileSync(`${OUT}/login.json`, JSON.stringify(results, null, 1));
await browser.close();
console.log("DONE", results.filter((r) => r.ok).length, "/", results.length);
process.exit(0);
