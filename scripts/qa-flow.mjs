// End-to-end order flow test with seed accounts. Creates 3 QA orders, drives the UI, verifies Firestore, cleans up.
import { createRequire } from "module";
import fs from "fs";
import path from "path";
const W = "/Users/a1111/Downloads/2026Dev/mainproject/2026Web/homePro";
const req = createRequire("/Users/a1111/.npm/_npx/55158e48eb5c59f7/");
const puppeteer = req("puppeteer");
const { initializeApp, cert } = require_(path.join(W, "node_modules/firebase-admin/lib/app"));
const { getFirestore, Timestamp, FieldValue } = require_(path.join(W, "node_modules/firebase-admin/lib/firestore"));
function require_(p) { return createRequire(import.meta.url)(p); }
initializeApp({ credential: cert(require_(path.join(W, "_migration/keys/target-homepro-nexlabs.json"))) });
const db = getFirestore();
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3077";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NICK = { seed_A1: "성실한청소부", seed_B1: "용감한강아지", seed_B2: "든든한기술자", seed_B4: "정직한작업자", seed_B5: "성실프로A", seed_B6: "성실프로B" };
const UIDS = Object.keys(NICK);
const results = []; const push = (id, name, ok, note) => { results.push({ id, name, ok, note }); console.log(`${ok ? "OK  " : "FAIL"} ${id} ${name} — ${note}`); };
const startedAt = Timestamp.now();

// ---------- setup ----------
const before = {};
for (const u of UIDS) before[u] = (await db.collection("users").doc(u).get()).data() || {};
const prosOf = async (uid) => (await db.collection("homepro_pros").where("uid", "==", uid).where("status", "==", "approved").get()).docs.map((d) => d.data().categoryId);
const catB1 = (await prosOf("seed_B1"))[0] || "special_cleaning";
const catB4 = (await prosOf("seed_B4"))[0] || catB1;
const b5 = await prosOf("seed_B5"), b6 = await prosOf("seed_B6");
const catC = b5.find((c) => b6.includes(c)) || b5[0] || catB1;
console.log("categories", { catB1, catB4, catC, b5, b6 });
const base = (await db.collection("homepro_orders").doc("4TybXL2NhyHrjtZD1M8x").get()).data();
const { getCategoryName } = { getCategoryName: (id) => id };
const mk = async (suffix, patch) => {
  const ref = db.collection("homepro_orders").doc();
  const docData = { ...base, ...patch, title: `[QA] ${suffix}`, description: `자동 점검용 오더 (${suffix}). 끝나면 지워집니다.`, createdBy: "seed_A1", writer: NICK.seed_A1, contactPhone: before.seed_A1.phoneNumber || "+821000000001",
    orderStatus: "접수", matchedProUid: null, applicantUids: [], applicantCount: 0, applicantQuotes: {}, b2bPriceType: "balance", b2bPriceAmount: 300000, price: "300,000원", photos: [],
    createdAt: Timestamp.fromMillis(Date.now() - 20 * 60 * 1000), updatedAt: Timestamp.now(), _qa: true };
  for (const k of ["insurance", "assignedAt", "pointsGrantedAt", "reviewed", "cancelReason", "cancelledAt", "completedAt"]) delete docData[k];
  await ref.set(docData);
  return ref.id;
};
const P = await mk("우선배정", { matchType: "priority", categoryId: catB1, categoryName: catB1 });
const C = await mk("다중비교", { matchType: "compare", categoryId: catC, categoryName: catC });
const D = await mk("지정배정", { matchType: "direct", categoryId: catB4, categoryName: catB4, directAssignTarget: { uid: "seed_B4", phone: before.seed_B4.phoneNumber || "" }, directPhone: before.seed_B4.phoneNumber || "" });
const IDS = [P, C, D];
console.log("orders", { P, C, D });
const order = async (id) => (await db.collection("homepro_orders").doc(id).get()).data() || {};
const waitOrder = async (id, pred, ms = 12000) => { const t0 = Date.now(); let o = await order(id); while (!pred(o) && Date.now() - t0 < ms) { await sleep(800); o = await order(id); } return o; };

// ---------- browser ----------
const browser = await puppeteer.launch({ headless: "shell", executablePath: "/Users/a1111/.cache/puppeteer/chrome-headless-shell/mac_arm-155.0.8059.79/chrome-headless-shell-mac-arm64/chrome-headless-shell", args: ["--no-sandbox", "--lang=ko-KR"] });
const pages = {};
let lastDialog = "";
async function as(uid) {
  if (pages[uid] && !pages[uid].isClosed()) return pages[uid];
  const ctx = await browser.createBrowserContext();
  await ctx.overridePermissions(BASE, ["geolocation"]).catch(() => {});
  const page = await ctx.newPage();
  await page.setGeolocation({ latitude: 37.2, longitude: 127.07 }).catch(() => {});
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  page.on("dialog", async (d) => { lastDialog = d.message(); await d.accept().catch(() => {}); });
  page.errors = []; page.on("pageerror", (e) => page.errors.push(String(e.message).slice(0, 200)));
  await page.goto(`${BASE}/seed-login`, { waitUntil: "networkidle2" }); await sleep(1200);
  const ok = await page.evaluate((nick) => { const c = [...document.querySelectorAll("div,button")].find((e) => (e.innerText || "").includes(nick) && e.children.length && e.innerText.length < 60); if (c) { c.click(); return true; } return false; }, NICK[uid]);
  if (!ok) throw new Error("seed card not found " + uid);
  for (let i = 0; i < 30; i++) { await sleep(500); if (!/seed-login/.test(page.url())) break; }
  await sleep(2500);
  console.log("login", uid, "->", page.url().replace(BASE, ""));
  pages[uid] = page; return page;
}
const go = async (page, p, wait = 1500) => {
  await page.goto(BASE + p, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  let last = -1, stable = 0; const t0 = Date.now();
  while (Date.now() - t0 < 15000) { await sleep(500); const len = await page.evaluate(() => (document.body.innerText || "").trim().length).catch(() => -1); if (len > 40 && len === last) { if (++stable >= 3) break; } else stable = 0; last = len; }
  await sleep(wait);
};
const txt = (page) => page.evaluate(() => document.body.innerText || "");
const shot = (page, n) => page.screenshot({ path: `${OUT}/${n}.png` }).catch((e) => console.log("   shot fail", n, e.message.slice(0, 60)));
async function click(page, re, { tags = "button,a,[role=button],div,span,label", prefer = "button" } = {}) {
  const r = await page.evaluate((src, flags, tags, prefer) => {
    const re = new RegExp(src, flags);
    const vis = (el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
    const own = (el) => Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim() || (el.children.length <= 2 ? (el.innerText || "").trim() : "");
    let cands = [...document.querySelectorAll(tags)].filter((el) => vis(el) && re.test(own(el)) && (el.innerText || "").trim().length < 80);
    if (!cands.length) return { ok: false, buttons: [...document.querySelectorAll("button")].filter(vis).map((b) => (b.innerText || "").trim()).filter(Boolean).slice(0, 40) };
    cands.sort((a, b) => (a.tagName.toLowerCase() === prefer ? -1 : 0) - (b.tagName.toLowerCase() === prefer ? -1 : 0));
    const el = cands[0]; el.scrollIntoView({ block: "center" }); el.click(); return { ok: true, text: (el.innerText || "").trim().slice(0, 40), tag: el.tagName };
  }, re.source, re.flags, tags, prefer);
  if (!r.ok) console.log(`   (no match for ${re}; visible buttons: ${JSON.stringify(r.buttons)})`);
  return r;
}
async function type(page, selector, text) { const el = await page.$(selector); if (!el) return false; await el.click({ clickCount: 3 }); await el.type(text, { delay: 20 }); return true; }

try {
  // ===== 1. priority: B1 accepts =====
  const b1 = await as("seed_B1");
  await go(b1, `/order/detail/${P}`); await shot(b1, "01-B1-detail-P");
  let t = await txt(b1);
  let r = await click(b1, /^수락(하기)?$/); let o = await waitOrder(P, (x) => x.orderStatus === "배정"); await sleep(1500); await shot(b1, "02-B1-after-accept");
  push("p1", "우선배정 수락", r.ok && o.orderStatus === "배정" && o.matchedProUid === "seed_B1", `click=${r.ok} status=${o.orderStatus} matched=${o.matchedProUid} url=${b1.url().replace(BASE, "")} dialog=${lastDialog}`);

  // ===== 2. B2 sees assigned order =====
  const b2 = await as("seed_B2");
  await go(b2, `/order/detail/${P}`); await shot(b2, "03-B2-detail-P-assigned");
  t = await txt(b2);
  const b2HasAccept = await b2.evaluate(() => [...document.querySelectorAll("button")].some((b) => /^수락(하기)?$/.test((b.innerText || "").trim())));
  push("p2", "배정된 오더에 다른 프로 수락 버튼 숨김", !b2HasAccept, `수락버튼=${b2HasAccept} text has 배정=${/배정/.test(t)}`);

  // ===== 3. A1 my orders + chat =====
  const a1 = await as("seed_A1");
  await go(a1, "/order/my-orders", 3500); await shot(a1, "04-A1-myorders");
  t = await txt(a1);
  push("p3", "접수자 나의오더현황에 배정 오더 표시", /\[QA\] 우선배정/.test(t), `found=${/\[QA\] 우선배정/.test(t)}`);
  await go(a1, `/order/detail/${P}`); await shot(a1, "05-A1-detail-P-assigned");
  r = await click(a1, /채팅/); await sleep(3500); await shot(a1, "06-A1-chat");
  const chatUrl = a1.url().replace(BASE, "");
  let roomId = (chatUrl.match(/\/chat\/([^/?]+)/) || [])[1];
  if (roomId) {
    const typed = await type(a1, "input[placeholder*='메시지'],textarea[placeholder*='메시지']", "QA 자동 점검 메시지입니다");
    await a1.keyboard.press("Enter"); await sleep(2500);
    const room = (await db.collection("chatRooms").doc(roomId).get()).data() || {};
    const msgs = await db.collection("chatRooms").doc(roomId).collection("messages").get();
    await shot(a1, "07-A1-chat-sent");
    push("p4", "오더 상세 → 채팅 → 메시지 전송", typed && /QA 자동 점검/.test(room.lastMessage || "") , `room=${roomId} typed=${typed} last="${room.lastMessage}" msgs=${msgs.size} participants=${JSON.stringify(room.participants)}`);
  } else push("p4", "오더 상세 → 채팅", false, `click=${r.ok} url=${chatUrl}`);

  // ===== 4. B1 checks in and checks out via 현장기록 (photo required) =====
  const PHOTO = OUT.replace(/\/flow[0-9]*$/, "") + "/qa_photo.png";
  const sheetSubmit = async (page) => {
    const inp = await page.$("input[type=file]"); if (inp) { await inp.uploadFile(PHOTO); await sleep(4000); }
    console.log("   photo count text:", await page.evaluate(() => (document.body.innerText.match(/[0-9]\/5/) || [])[0]));
    return click(page, /(체크인 등록|체크아웃 등록|기록 등록|등록)$/, { tags: "button" });
  };
  await go(b1, "/order/my-orders", 2500); await shot(b1, "08-B1-myorders");
  r = await click(b1, /작업시작\(체크인\)/); await sleep(3500); await shot(b1, "09-B1-after-checkin-btn");
  if (/worklog/.test(b1.url())) {
    r = await click(b1, /작업시작 \(체크인\)/); await sleep(1200); await shot(b1, "10-B1-checkin-sheet");
    r = await sheetSubmit(b1); await waitOrder(P, (x) => !!x.checkInAt, 20000); await sleep(1500); await shot(b1, "11-B1-checkin-done");
    r = await click(b1, /작업완료 \(체크아웃\)/); await sleep(1200); await shot(b1, "12-B1-checkout-sheet");
    r = await sheetSubmit(b1); o = await waitOrder(P, (x) => x.orderStatus === "완료", 25000); await shot(b1, "13-B1-checkout-done");
  }
  o = await order(P);
  push("p5", "홈프로 작업완료 처리", o.orderStatus === "완료", `status=${o.orderStatus} pointsGrantedAt=${!!o.pointsGrantedAt} url=${b1.url().replace(BASE, "")} dialog=${lastDialog}`);

  // ===== 5. A1 writes review =====
  await go(a1, `/order/detail/${P}`, 3500); await shot(a1, "14-A1-detail-completed");
  r = await click(a1, /리뷰 작성/); await sleep(4000); await shot(a1, "15-A1-review-sheet");
  const hasTextarea = await type(a1, "textarea[placeholder*='리뷰'],input[placeholder*='리뷰']", "자동 점검 리뷰입니다. 친절하고 깔끔하게 마무리해 주셨어요.");
  await sleep(300); r = await click(a1, /^(리뷰 등록|등록)$/, { tags: "button" }); await sleep(3500); await shot(a1, "16-A1-review-submitted");
  const revs = await db.collection("homepro_reviews").where("orderId", "==", P).get();
  o = await order(P);
  const b1After = (await db.collection("users").doc("seed_B1").get()).data() || {};
  const a1After = (await db.collection("users").doc("seed_A1").get()).data() || {};
  push("p6", "접수자 리뷰 작성", revs.size === 1 && o.reviewed === true, `textarea=${hasTextarea} reviews=${revs.size} reviewed=${o.reviewed} B1 reviewCount ${before.seed_B1.reviewCount}->${b1After.reviewCount} A1 points ${before.seed_A1.referralPoints}->${a1After.referralPoints} B1 points ${before.seed_B1.referralPoints}->${b1After.referralPoints}`);
  // second review attempt should be blocked
  await go(a1, `/order/detail/${P}`, 3000);
  const hasReviewBtn = await a1.evaluate(() => [...document.querySelectorAll("button")].some((b) => /리뷰 작성/.test(b.innerText || "")));
  await shot(a1, "17-A1-detail-after-review");
  push("p7", "리뷰 뒤 '리뷰 작성' 버튼 숨김", !hasReviewBtn, `button still shown=${hasReviewBtn}`);

  // ===== 6. compare: B5, B6 apply; A1 selects =====
  const b5 = await as("seed_B5");
  await go(b5, `/order/detail/${C}`); await shot(b5, "20-B5-detail-C");
  r = await click(b5, /^지원하기$/); o = await waitOrder(C, (x) => x.applicantCount >= 1);
  push("c1", "다중비교 지원(B5)", r.ok && o.applicantCount === 1, `click=${r.ok} applicantCount=${o.applicantCount} uids=${JSON.stringify(o.applicantUids)} url=${b5.url().replace(BASE, "")}`);
  await go(b5, `/order/detail/${C}`); await shot(b5, "21-B5-detail-C-applied");
  const b5Again = await b5.evaluate(() => [...document.querySelectorAll("button")].some((b) => /^지원하기$/.test((b.innerText || "").trim())));
  push("c2", "지원 뒤 지원하기 버튼 숨김", !b5Again, `still shown=${b5Again}`);
  const b6 = await as("seed_B6");
  await go(b6, `/order/detail/${C}`); r = await click(b6, /^지원하기$/); o = await waitOrder(C, (x) => x.applicantCount >= 2);
  push("c3", "다중비교 지원(B6)", r.ok && o.applicantCount === 2, `click=${r.ok} applicantCount=${o.applicantCount}`);
  await go(a1, `/order/detail/${C}`, 3500); await shot(a1, "22-A1-detail-C-applicants");
  t = await txt(a1);
  r = await click(a1, /^선정$/); o = await waitOrder(C, (x) => x.orderStatus === "배정"); await shot(a1, "23-A1-selected");
  const apps = await db.collection("homepro_orders").doc(C).collection("applicants").get();
  const rejected = apps.docs.filter((d) => d.data().rejected).length;
  push("c4", "접수자 선정 → 배정", r.ok && o.orderStatus === "배정" && !!o.matchedProUid, `click=${r.ok} status=${o.orderStatus} matched=${o.matchedProUid} applicants=${apps.size} rejected=${rejected} shows names=${/성실프로A/.test(t)}`);

  // ===== 7. direct: B1 cannot accept; B4 rejects → 대기; A1 re-registers; B4 accepts =====
  await go(b1, `/order/detail/${D}`); await shot(b1, "30-B1-detail-D");
  const b1Accept = await b1.evaluate(() => [...document.querySelectorAll("button")].some((b) => /^수락(하기)?$/.test((b.innerText || "").trim())));
  t = await txt(b1);
  push("d1", "지정배정: 지정 아닌 프로에게 수락 숨김", !b1Accept, `수락=${b1Accept} notice=${/지정된 홈프로만/.test(t)}`);
  const b4 = await as("seed_B4");
  await go(b4, `/order/detail/${D}`); await shot(b4, "31-B4-detail-D");
  r = await click(b4, /^거절하기$/); o = await waitOrder(D, (x) => x.orderStatus === "대기");
  push("d2", "지정배정 거절 → 대기", r.ok && o.orderStatus === "대기", `click=${r.ok} status=${o.orderStatus}`);
  await go(a1, `/order/detail/${D}`, 3500); await shot(a1, "32-A1-detail-D-waiting");
  r = await click(a1, /^재접수$/); o = await waitOrder(D, (x) => x.orderStatus === "접수");
  push("d3", "접수자 재접수 → 접수", r.ok && o.orderStatus === "접수", `click=${r.ok} status=${o.orderStatus} target=${JSON.stringify(o.directAssignTarget)}`);
  await go(b4, `/order/detail/${D}`); r = await click(b4, /^수락(하기)?$/); o = await waitOrder(D, (x) => x.orderStatus === "배정"); await shot(b4, "33-B4-accepted");
  push("d4", "지정 프로 수락 → 배정", r.ok && o.orderStatus === "배정" && o.matchedProUid === "seed_B4", `click=${r.ok} status=${o.orderStatus} matched=${o.matchedProUid}`);

  // ===== 8. A1 cancels assigned D with reason =====
  await go(a1, `/order/detail/${D}`, 3500); await shot(a1, "40-A1-detail-D-assigned");
  r = await click(a1, /^취소$/); await sleep(1500); await shot(a1, "41-A1-cancel-sheet");
  let r2 = await click(a1, /^일정변경$/); await sleep(500); await sleep(600); let r3 = await click(a1, /^(확인|취소하기|취소 확정|선택 완료)$/); await sleep(3000); await shot(a1, "42-A1-cancelled");
  o = await order(D);
  push("x1", "배정 오더 취소(사유 선택)", o.orderStatus === "취소", `click=${r.ok}/${r2.ok}/${r3.ok} status=${o.orderStatus} reason=${o.cancelReason || o.cancelledReason || ""} dialog=${lastDialog}`);

  // ===== 9. home list visibility for A1 (own orders) and B2 =====
  await go(b2, "/MobileMain", 4000); t = await txt(b2); await shot(b2, "50-B2-home");
  push("h1", "홈 요청목록(B2) 렌더", t.length > 200 && !/문제가 발생|오류/.test(t), `len=${t.length} hasQA=${/\[QA\]/.test(t)}`);
  for (const [uid, p] of Object.entries(pages)) if (p.errors.length) push("err-" + uid, "페이지 JS 에러", false, p.errors.slice(0, 3).join(" | "));
} catch (e) {
  console.log("FLOW ERROR", e.message);
  push("fatal", "스크립트 중단", false, e.message);
}

// ---------- cleanup ----------
console.log("cleanup...");
try {
  const after = {};
  for (const u of UIDS) after[u] = (await db.collection("users").doc(u).get()).data() || {};
  for (const u of UIDS) {
    const patch = {};
    for (const k of ["referralPoints", "totalEarnedPoints", "reviewCount", "ratingSum", "points", "hpoint", "hpointBalance", "completedOrders", "orderCount"]) {
      if (JSON.stringify(before[u][k]) !== JSON.stringify(after[u][k])) patch[k] = before[u][k] === undefined ? FieldValue.delete() : before[u][k];
    }
    if (Object.keys(patch).length) { await db.collection("users").doc(u).update(patch); console.log("restored", u, Object.keys(patch).join(",")); }
  }
  for (const id of IDS) await db.recursiveDelete(db.collection("homepro_orders").doc(id));
  const rooms = await db.collection("chatRooms").where("orderId", "in", IDS).get();
  for (const d of rooms.docs) await db.recursiveDelete(d.ref);
  const del = async (col, field) => { const s = await db.collection(col).where(field, "in", IDS).get(); for (const d of s.docs) await d.ref.delete(); return s.size; };
  const n1 = await del("homepro_reviews", "orderId"), n2 = await del("homepro_cash", "relatedDocId"), n3 = await del("homepro_schedules", "orderId"), n4 = await del("homepro_contracts", "orderId"), n5 = await del("notifications", "data.orderId");
  const cashSince = await db.collection("homepro_cash").where("createdAt", ">=", startedAt).get();
  let n6 = 0; for (const d of cashSince.docs) if (UIDS.includes(d.data().uid)) { await d.ref.delete(); n6++; }
  const notifSince = await db.collection("notifications").where("createdAt", ">=", startedAt).get();
  let n7 = 0; for (const d of notifSince.docs) { const tu = d.data().targetUids || []; if (tu.some((x) => UIDS.includes(x))) { await d.ref.delete(); n7++; } }
  console.log("cleanup done", { rooms: rooms.size, reviews: n1, cash: n2 + n6, schedules: n3, contracts: n4, notifs: n5 + n7 });
} catch (e) { console.log("CLEANUP ERROR", e.message); }
fs.writeFileSync(`${OUT}/flow.json`, JSON.stringify(results, null, 1));
await browser.close();
console.log("DONE", results.filter((r) => r.ok).length, "/", results.length);
process.exit(0);
