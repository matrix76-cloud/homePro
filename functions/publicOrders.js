/**
 * 공개 오더리스트 — 로그인 없이 보이는 서버 페이지 + RSS + sitemap
 * (대표 리뷰 11/12 16번 · 11/13 "사장님 안으로 진행" → 11/21 "공개 오더리스트(지역 × 업종)"로 넓힘)
 *
 *   /orders                       전체
 *   /orders/{업종}                업종별            예) /orders/move-cleaning
 *   /orders/{시도}                시·도별           예) /orders/gyeonggi
 *   /orders/{시도}/{업종}         시·도 × 업종      예) /orders/gyeonggi/move-cleaning
 *   /recent-orders                예전 주소 — 같은 화면(대표 주소는 /orders)
 *   /recent-orders/feed.xml       새 오더가 생길 때마다 새 글로 잡히는 RSS
 *   /sitemap.xml                  고정 페이지 + 위 목록 주소 전부(시도 × 업종은 오더가 있는 조합만)
 * slug 표는 publicOrderSlugs.js.
 *
 * 보여 주는 것: 업종 · 세부 항목 · 지역(시 · 구까지) · 건물유형 · 면적 · 작업일 · 작업시간 · 요청 방식 ·
 *               단가유형(이름만) · 모집 상태 · 접수 시각 — 전부 고르는 값이거나 정해진 꼴의 값.
 * 싣지 않는 것: 제목 · 설명 같은 자유 글(연락처나 주소가 섞여 있을 수 있다) · 상세 주소 · 금액 · 접수자 · 연락처.
 *               ★금액은 숫자 일부를 가려서도 싣지 않는다. 읽어 올 때부터 그 필드를 빼고 읽는다(FIELDS).
 * 안 보이는 오더: 대기 · 취소 · 거부, 셀프 등록 오더(본인 기록용), 시드(seed_) · 테스트 · 심사용 계정 오더,
 *                 운영자가 숨긴 오더(adminHidden).
 * 누르면 앱 설치 · 로그인(/app)으로 이어진다.
 */
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { SIDO, CATS, SIDO_BY_SLUG, CAT_BY_SLUG, CAT_BY_ID, sidoOf } = require("./publicOrderSlugs");

const SITE = "https://www.tryhomepro.com";
const WINDOW = 500;        // 한 번에 읽는 최근 오더 수 — 이 안에서 지역 · 업종별로 거른다
const CACHE_MS = 120000;   // 함수 인스턴스 안에서 2분은 다시 읽지 않는다
const INSURANCE_PUBLIC = false; // 공개 목록에 보험 관련 글을 싣나 — 앞단 featureFlags.INSURANCE_ENABLED 와 같은 값으로
const OPEN_MAX = 60;       // 모집 중 목록
const MATCHED_MAX = 10;    // 최근 매칭된 오더 (빈 페이지 방지)
const OTHER_MAX = 10;      // 그 지역 · 업종에 한 건도 없을 때 보여 주는 다른 곳 최근 오더
const RSS_MAX = 60;
const APP_LINK = "/app?from=orders";

// 읽어 오는 필드 — 여기 없는 것(제목 · 설명 · 금액 · 연락처 · 접수자 이름)은 서버 메모리에도 올라오지 않는다
const FIELDS = [
  "orderStatus", "selfOrder", "createdBy", "isTest", "pgReview", "_isSeed", "_pgReview", "adminHidden", "createdAt", "recruit",
  "categoryId", "categoryName", "subcategories", "subcategory", "region", "address", "location",
  "matchType", "applicantCount", "buildingType", "areaValue", "workDate", "workDatePicker", "workTime",
  "b2bPriceType", "wagePay.method", "wagePay.timing", "insurancePreferred",
];

const STATUS_PUBLIC = { "접수": "모집 중", "선정대기": "모집 중", "배정": "진행 중", "완료": "작업 완료" };
const MATCH_LABEL = { priority: "빠른배정", compare: "비교선정", direct: "지정배정" };
const PRICE_TYPE_LABEL = { fixed: "시공금액", balance: "잔금", onsite: "현장견적", estimate: "견적요청", info: "정보공유", hpoint: "H-포인트", contract: "도급", sale: "매매" };
const PRICED_TYPES = ["fixed", "balance", "hpoint"]; // 금액이 있는 유형 — "금액은 로그인 후 확인"을 붙인다
const WAGE_METHODS = ["일급", "시급", "건당", "월급", "협의"];
const WORK_DATE_SHORT = { "긴급": "긴급", "가능한 빨리 진행 원해요": "가능한 빨리", "협의가능해요!": "협의", "일주일 이내 진행 원해요": "일주일 이내" };

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const toDate = (ts) => (ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null);

/** 고르는 값만 통과 — 전화번호 · 긴 숫자 · 주소 · 링크처럼 보이는 글은 버린다(세부 항목의 '기타 → 직접 입력' 대비) */
function safeText(v, max = 30) {
  const s = String(v ?? "").replace(/\s+/g, " ").trim();
  if (!s || s.length > max) return "";
  if (/\d[\d\s\-.]{5,}\d/.test(s)) return "";       // 숫자가 7자리 넘게 이어짐
  if (/@|https?:|www\.|카톡|kakao/i.test(s)) return "";
  return s;
}

/** KST 표기 "11월 18일 오전 9:05" */
function kst(d) {
  const k = new Date(d.getTime() + 9 * 3600000);
  const h = k.getUTCHours();
  const m = String(k.getUTCMinutes()).padStart(2, "0");
  return `${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일 ${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${m}`;
}
const kstMonthDay = (d) => { const k = new Date(d.getTime() + 9 * 3600000); return `${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일`; };
const kstYmd = (d) => new Date(d.getTime() + 9 * 3600000).toISOString().slice(0, 10);

/** 주소 → { sido(표의 항목), text("서울 종로구" · "경기 성남시 분당구") }. 시·도를 못 알아보면 지역을 싣지 않는다 */
function regionOf(o) {
  const r = o.region;
  const tokens = (r && typeof r === "object" && (r.sido || r.sigungu)
    ? [r.sido, ...String(r.sigungu || "").split(/\s+/)]
    : String(o.address || o.location || "").trim().split(/\s+/)).filter(Boolean);
  const sido = sidoOf(tokens[0], tokens[1]);
  if (!sido) return { sido: null, text: "" };
  const out = [sido.name];
  for (let i = 1; i < tokens.length && i < 3; i++) {
    if (/^[가-힣]{1,7}(시|군|구)$/.test(tokens[i])) out.push(tokens[i]); else break;
  }
  return { sido, text: out.join(" ") };
}

/** 작업일 — "오늘 · 내일"은 접수한 날 기준이라 날짜로 바꿔 적는다 */
function workDayOf(o, at) {
  const wd = String(o.workDate || "");
  const pick = String(o.workDatePicker || "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(pick) && (!wd || wd === "예약날짜" || wd === "희망날짜지정")) return `${Number(pick.slice(5, 7))}월 ${Number(pick.slice(8, 10))}일`;
  if (wd === "오늘") return kstMonthDay(at);
  if (wd === "내일") return kstMonthDay(new Date(at.getTime() + 86400000));
  return WORK_DATE_SHORT[wd] || "";
}

function workTimeOf(o) {
  const t = String(o.workTime || "").trim();
  if (t === "시간무관") return t;
  if (/^(하루|오전|오후|저녁) \d{2}:\d{2}~\d{2}:\d{2}$/.test(t)) return t;
  if (/^\d{1,2}:\d{2} 시작$/.test(t)) return t;
  return "";
}

function areaOf(o) {
  const a = String(o.areaValue || "").trim();
  if (/^\d{1,4}(\.\d)?$/.test(a)) return `${a}평`;
  if (/^\d{1,4}(\.\d)?\s?(평|㎡)$/.test(a)) return a;
  return "";
}

async function loadRows() {
  const db = admin.firestore();
  const snap = await db.collection("homepro_orders").orderBy("createdAt", "desc").limit(WINDOW).select(...FIELDS).get();
  const rows = [];
  const recruitRows = new Map(); // 구인 모집 묶음(같은 내용의 오더 여러 건)은 한 줄로 — groupId → 첫 줄
  for (const d of snap.docs) {
    const o = d.data() || {};
    const status = STATUS_PUBLIC[o.orderStatus];
    if (!status) continue;
    if (o.selfOrder || o.adminHidden === true) continue;
    const by = String(o.createdBy || "");
    if (!by || by.startsWith("seed_") || o.isTest || o.pgReview || o._isSeed || o._pgReview) continue;
    const at = toDate(o.createdAt);
    if (!at || Number.isNaN(at.getTime())) continue;

    const cat = CAT_BY_ID.get(String(o.categoryId || "")) || null;
    // 세부 항목이 많으면 앞 세 개 + "외 N개" (사업장청소는 열 개 넘게 고르기도 한다)
    const subs = (Array.isArray(o.subcategories) && o.subcategories.length ? o.subcategories : String(o.subcategory || "").split(/,\s*/))
      .map((x) => safeText(x, 40)).filter(Boolean);
    const sub = subs.slice(0, 3).join(" · ") + (subs.length > 3 ? ` 외 ${subs.length - 3}개` : "");
    const { sido, text: region } = regionOf(o);
    const open = status === "모집 중";

    // 구인 모집 묶음 — 모집 인원만큼 올라온 같은 오더를 한 줄로 모은다. 한 자리라도 모집 중이면 모집 중으로 (대표 리뷰 11/24)
    const rc = o.recruit && o.recruit.groupId ? o.recruit : null;
    if (rc) {
      const first = recruitRows.get(String(rc.groupId));
      if (first) {
        if (open && !first.open) { first.open = true; first.status = status; }
        continue;
      }
    }

    // 한 줄 요약 — 건물유형 · 면적 · 작업일 · 작업시간
    const facts = [];
    if (rc && Number(rc.total) > 0 && Number(rc.need) > 0) facts.push(`${Math.floor(Number(rc.total))}명 중 ${Math.floor(Number(rc.need))}명 모집`);
    const bt = safeText(o.buildingType, 12); if (bt) facts.push(bt);
    const area = areaOf(o); if (area) facts.push(area);
    const day = workDayOf(o, at); if (day) facts.push(`작업일 ${day}`);
    const time = workTimeOf(o); if (time) facts.push(time);

    // 거래 조건 — 요청 방식 · 단가유형(이름만). 금액은 싣지 않는다
    const terms = [];
    const mt = MATCH_LABEL[o.matchType];
    if (mt) terms.push(o.matchType === "compare" && open ? `비교선정 · 지원 ${Math.min(3, Math.max(0, Number(o.applicantCount) || 0))}/3` : mt);
    const pt = PRICE_TYPE_LABEL[o.b2bPriceType];
    const wage = o.wagePay && WAGE_METHODS.includes(o.wagePay.method) ? o.wagePay.method : "";
    if (pt) terms.push(`단가유형 ${pt}`);
    else if (wage) terms.push(`지급 방식 ${wage}`);
    if (PRICED_TYPES.includes(o.b2bPriceType) || (wage && wage !== "협의")) terms.push("금액은 로그인 후 확인");
    // 보험을 감춘 동안에는 싣지 않는다 (대표 리뷰 11/27 "보험 삭제합니다(초기에는)" — 앞단 src/config/featureFlags.js 와 같이 푼다)
    if (INSURANCE_PUBLIC && o.insurancePreferred === true) terms.push("배상책임보험 가입 업체 선호");

    const row = {
      id: d.id,
      cat,
      category: cat ? cat.name : (safeText(o.categoryName, 20) || "기타"),
      sub, sido, region, status, open, facts, terms, at,
    };
    rows.push(row);
    if (rc) recruitRows.set(String(rc.groupId), row);
  }
  return rows;
}

// 인스턴스 안 짧은 캐시 — 검색 로봇이 주소 수백 개를 한꺼번에 긁어도 Firestore 는 2분에 한 번만 읽는다
let _cache = { at: 0, rows: null, pending: null };
function getRows() {
  if (_cache.rows && Date.now() - _cache.at < CACHE_MS) return Promise.resolve(_cache.rows);
  if (!_cache.pending) {
    _cache.pending = loadRows()
      .then((rows) => { _cache = { at: Date.now(), rows, pending: null }; return rows; })
      .catch((e) => { _cache.pending = null; if (_cache.rows) return _cache.rows; throw e; });
  }
  return _cache.pending;
}

const titleOf = (r) => `${r.region ? r.region + " " : ""}${r.category}${r.sub ? " · " + r.sub : ""} 오더`;
const hrefOf = (sido, cat) => "/orders" + (sido ? "/" + sido.slug : "") + (cat ? "/" + cat.slug : "");

/** 제목 · 설명 · H1 규칙 (지역 × 업종) */
function pageMeta(sido, cat) {
  // 제목 문구 "실시간 예약 오더공유 리스트" · 안내 끝 문장 (대표 리뷰 11/24)
  const list = cat ? (cat.listName || `${cat.name} 실시간 예약 오더공유 리스트`) : "실시간 예약 오더공유 리스트";
  const where = sido ? `${sido.full}${sido.areas.length ? `(${sido.areas.join(" · ")} 등)` : ""} 지역` : "전국";
  const tail = "서비스 예약·견적 요청부터 작업 오더 수주까지, HomePro 앱에서 간편하게!";
  if (!sido && !cat) {
    return {
      title: "실시간 예약 오더공유 리스트 — 청소 · 설비 · 인테리어 · 현장구인 | 홈프로",
      h1: "전국 실시간 예약 오더공유 리스트",
      desc: `홈프로에 지금 올라오는 청소 · 설비 · 인테리어 오더공유와 현장 기술자 구인 목록입니다. ${tail}`,
      lead: `홈프로에 올라오는 청소 · 설비 · 인테리어 오더와 현장 기술자 구인을 지역 · 업종별로 모은 실시간 오더공유(오더방) 리스트입니다. ${tail}`,
    };
  }
  const what = cat ? `${cat.name}(${cat.desc})` : "청소 · 설비 · 인테리어 오더공유와 현장 기술자 구인";
  return {
    title: `${sido ? `[${sido.name}] ` : ""}${list} | 홈프로`,
    h1: `${sido ? sido.name + " " : ""}${list}`,
    desc: `${where}의 ${what} 목록입니다. ${tail}`,
    lead: `${where}의 ${what} 목록입니다. ${tail}`,
  };
}

function rowHtml(r) {
  return `
      <li id="o-${esc(r.id)}">
        <a href="${APP_LINK}" class="row">
          <span class="cat">${esc(r.category)}</span>
          <span class="main">
            <strong>${esc(r.region || "지역 미표기")}${r.sub ? ` · ${esc(r.sub)}` : ""}</strong>
            ${r.facts.length ? `<span class="line">${esc(r.facts.join(" · "))}</span>` : ""}
            ${r.terms.length ? `<span class="line">${esc(r.terms.join(" · "))}</span>` : ""}
          </span>
          <span class="meta">
            <span class="st${r.open ? " open" : ""}">${esc(r.status)}</span>
            <time datetime="${r.at.toISOString()}">${esc(kst(r.at))} 접수</time>
          </span>
        </a>
      </li>`;
}

/** 내부 링크 허브 — 지역 줄 · 업종 줄. 전부 <a href> (검색 로봇이 하위 목록을 따라간다) */
function hubHtml(rows, sido, cat) {
  const inCat = cat ? rows.filter((r) => r.cat === cat) : rows;
  const inSido = sido ? rows.filter((r) => r.sido === sido) : rows;
  const count = (list, pick) => { const m = new Map(); for (const r of list) { const k = pick(r); if (k) m.set(k, (m.get(k) || 0) + 1); } return m; };
  const bySido = count(inCat, (r) => r.sido);
  const byCat = count(inSido, (r) => r.cat);
  const link = (href, label, on, n) => `<a href="${href}"${on ? ' aria-current="page"' : ""}>${esc(label)}${n ? `<span class="n">${n}</span>` : ""}</a>`;
  return `
  <section class="hub" id="hub" aria-label="지역 · 업종별 오더리스트">
    <h2>지역 · 업종별 오더리스트</h2>
    <div class="hrow">
      <p class="hlabel">지역</p>
      <nav class="hlinks">${link(hrefOf(null, cat), "전국", !sido)}${SIDO.map((s) => link(hrefOf(s, cat), s.name, s === sido, bySido.get(s))).join("")}</nav>
    </div>
    <div class="hrow">
      <p class="hlabel">업종</p>
      <nav class="hlinks">${link(hrefOf(sido, null), "전체 업종", !cat)}${CATS.map((c) => link(hrefOf(sido, c), c.name, c === cat, byCat.get(c))).join("")}</nav>
    </div>
  </section>`;
}

const STYLE = `
@font-face{font-family:'Pretendard Variable';font-weight:45 920;font-style:normal;font-display:swap;src:url('/fonts/PretendardVariable.woff2') format('woff2-variations'),url('/fonts/PretendardVariable.woff2') format('woff2')}
:root{--ink:#14181F;--line:#e3e6eb;--soft:#f5f7f9;--point:#00963F;--pointDark:#007A33}
*{box-sizing:border-box}
body{margin:0;background:#fff;color:var(--ink);font-family:'Pretendard Variable',Pretendard,-apple-system,BlinkMacSystemFont,'Segoe UI','Malgun Gothic',sans-serif;font-size:16px;line-height:1.55;letter-spacing:-.01em}
a{color:inherit;text-decoration:none}
.top{border-bottom:1px solid var(--line)}
.top .in{max-width:860px;margin:0 auto;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.brand{display:flex;align-items:center;gap:8px;font-weight:700;font-size:18px}
.brand img{width:28px;height:28px}
.btn{display:inline-block;padding:11px 16px;border-radius:6px;background:var(--pointDark);color:#fff;font-weight:600;font-size:15px;word-break:keep-all}
main{max-width:860px;margin:0 auto;padding:24px 20px 60px}
.crumb{margin:0 0 14px;font-size:15px}
.crumb a{text-decoration:underline}
h1{font-size:25px;line-height:1.35;margin:0 0 10px;font-weight:700;word-break:keep-all}
h2{font-size:19px;margin:36px 0 10px;font-weight:700;word-break:keep-all}
.lead{margin:0 0 16px;font-size:16px;word-break:keep-all}
.now{margin:0;padding:12px 14px;border:1px solid var(--line);border-radius:6px;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;font-size:15px}
.now b{font-weight:700}
.now a{margin-left:auto;text-decoration:underline;font-weight:600}
.list{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
.list li{border-bottom:1px solid var(--line)}
.row{display:flex;align-items:flex-start;gap:14px;padding:16px 4px}
.row:hover{background:var(--soft)}
.cat{flex:0 0 auto;width:112px;padding:8px 8px;border:1px solid var(--line);border-radius:6px;font-size:15px;font-weight:600;text-align:center;word-break:keep-all}
.main{flex:1 1 auto;display:flex;flex-direction:column;gap:3px;min-width:0}
.main strong{font-size:17px;font-weight:600;word-break:keep-all}
.line{font-size:15px;word-break:keep-all}
.meta{flex:0 0 auto;display:flex;flex-direction:column;align-items:flex-end;gap:2px;font-size:15px}
.st{font-weight:500}
.st.open{color:var(--pointDark);font-weight:700}
.note{margin:0;padding:22px 4px;font-size:16px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);word-break:keep-all}
.more{margin:10px 0 0;font-size:15px}
.about p{margin:0 0 8px;font-size:16px;word-break:keep-all}
.hrow{margin-top:14px}
.hlabel{margin:0 0 8px;font-size:16px;font-weight:700}
.hlinks{display:flex;flex-wrap:wrap;gap:8px}
.hlinks a{padding:10px 14px;border:1px solid var(--line);border-radius:6px;background:#fff;font-size:15px;word-break:keep-all}
.hlinks a:hover{background:var(--soft)}
.hlinks a[aria-current]{background:#e9ecf1;border-color:#c9ced6;font-weight:700}
.hlinks .n{margin-left:6px;color:var(--pointDark);font-weight:700}
.foot{margin-top:36px;padding:20px;border:1px solid var(--line);border-radius:6px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
.foot p{margin:0;font-size:16px;word-break:keep-all}
.links{margin-top:22px;font-size:15px;display:flex;gap:14px;flex-wrap:wrap}
.links a{text-decoration:underline}
@media (max-width:560px){h1{font-size:23px}.row{flex-wrap:wrap;gap:8px 12px}.cat{width:auto;min-width:0;order:1}.meta{display:contents}.st{order:2;margin-left:auto;align-self:center}.main{flex-basis:100%;order:3}.row time{order:4;flex-basis:100%;font-size:15px}.now a{margin-left:0}}
`;

function shell({ title, desc, canonical, robots, ld, body }) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${robots ? `<meta name="robots" content="${robots}">` : ""}
${canonical ? `<link rel="canonical" href="${SITE}${canonical}">` : ""}
<link rel="alternate" type="application/rss+xml" title="홈프로 최근 오더" href="${SITE}/recent-orders/feed.xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="홈프로">
<meta property="og:locale" content="ko_KR">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${canonical ? `<meta property="og:url" content="${SITE}${canonical}">` : ""}
<meta property="og:image" content="${SITE}/og-image.png?v=4">
<link rel="icon" href="/favicon.ico">
<link rel="preload" as="font" type="font/woff2" href="/fonts/PretendardVariable.woff2" crossorigin>
${(ld || []).map((x) => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, "\\u003c")}</script>`).join("\n")}
<style>${STYLE}</style>
</head>
<body>
<header class="top"><div class="in">
  <a class="brand" href="/"><img src="/homepro-symbol.svg" alt="">홈프로</a>
  <a class="btn" href="${APP_LINK}">앱에서 오더 받기</a>
</div></header>
<main>
${body}
  <div class="foot">
    <p>오더에 지원하거나 내 오더를 공유하려면 홈프로 앱을 설치하세요.</p>
    <a class="btn" href="${APP_LINK}">앱 설치 · 로그인</a>
  </div>
  <nav class="links"><a href="/">홈프로 소개</a><a href="/orders">전체 오더리스트</a><a href="/recent-orders/feed.xml">RSS</a><a href="/legal/terms">이용약관</a><a href="/legal/privacy">개인정보처리방침</a></nav>
</main>
</body>
</html>`;
}

function renderList(rows, sido, cat) {
  const mine = rows.filter((r) => (!sido || r.sido === sido) && (!cat || r.cat === cat));
  // '모집 중인 오더 N건' 칸은 없앴다 (대표 리뷰 11/24) — 모집 중 · 매칭된 오더를 한 목록에 접수 최근 순으로, 상태는 줄 오른쪽 글씨로만
  const listed = mine.slice(0, OPEN_MAX + MATCHED_MAX);
  const others = mine.length ? [] : rows.slice(0, OTHER_MAX);
  const meta = pageMeta(sido, cat);
  const path = hrefOf(sido, cat);
  const label = `${sido ? sido.name + " " : ""}${cat ? cat.name + " " : ""}`;

  const crumbs = [{ name: "홈프로", href: "/" }, { name: "오더리스트", href: "/orders" }];
  if (sido) crumbs.push({ name: sido.name, href: hrefOf(sido, null) });
  if (cat) crumbs.push({ name: cat.name, href: hrefOf(sido, cat) });

  const shown = listed;
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: SITE + c.href })),
    },
  ];
  if (shown.length) {
    ld.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: meta.h1,
      numberOfItems: shown.length,
      itemListElement: shown.slice(0, 30).map((r, i) => ({ "@type": "ListItem", position: i + 1, name: titleOf(r) })),
    });
  }

  const about = [];
  if (cat) about.push(`<h2>${esc(cat.name)} 오더에 올라오는 작업</h2><p>${esc(cat.desc)}.</p><p>${esc(cat.items.join(" · "))}</p>`);
  if (sido) about.push(`<h2>${esc(sido.name)} 지역 오더</h2><p>${esc(sido.full)}${sido.areas.length ? `(${esc(sido.areas.join(" · "))} 등)` : ""} 전 지역에서 올라온 오더를 모읍니다.</p>`);
  about.push(`<h2>홈프로 오더공유 · 오더방</h2><p>홈프로는 집(Home) 전문 사업자끼리 오더(일감)를 공유하고 하도급 · 협업 · 현장 구인을 연결하는 플랫폼입니다. 오더 지원과 수락, 연락처 · 상세 주소 · 금액 확인은 앱에 로그인한 뒤에 할 수 있습니다.</p>`);

  const body = `
  <nav class="crumb" aria-label="현재 위치">${crumbs.map((c, i) => (i === crumbs.length - 1 ? `<span>${esc(c.name)}</span>` : `<a href="${c.href}">${esc(c.name)}</a>`)).join(" / ")}</nav>
  <h1>${esc(meta.h1)}</h1>
  <p class="lead">${esc(meta.lead)}</p>
  <p class="now"><span>지역 <b>${esc(sido ? sido.name : "전국")}</b></span><span>업종 <b>${esc(cat ? cat.name : "전체")}</b></span><a href="#hub">지역 · 업종 바꾸기</a></p>

  ${listed.length ? `<section>
    <h2>최근 ${esc(label)}오더</h2>
    <ul class="list">${listed.map(rowHtml).join("")}</ul>${mine.length > listed.length ? `<p class="more">최근 ${listed.length}건을 보여 줍니다. 전체는 앱에서 볼 수 있습니다.</p>` : ""}
  </section>` : ""}
  ${others.length ? `<section>
    <h2>다른 지역 · 업종의 최근 오더</h2>
    <ul class="list">${others.map(rowHtml).join("")}</ul>
  </section>` : ""}
${hubHtml(rows, sido, cat)}
  <section class="about">${about.join("")}</section>`;

  return shell({
    title: meta.title,
    desc: meta.desc,
    canonical: path,
    // 시도 × 업종 조합에 오더가 한 건도 없으면 검색에는 올리지 않는다(내용 없는 페이지로 잡히지 않게). 한 건이라도 생기면 저절로 풀린다
    robots: sido && cat && !mine.length ? "noindex,follow" : "",
    ld,
    body,
  });
}

function renderNotFound(rows) {
  const body = `
  <nav class="crumb" aria-label="현재 위치"><a href="/">홈프로</a> / <a href="/orders">오더리스트</a></nav>
  <h1>찾는 오더리스트 주소가 없습니다</h1>
  <p class="lead">주소가 바뀌었거나 잘못 들어온 것 같습니다. 아래에서 지역 · 업종을 골라 주세요. <a href="/orders" style="text-decoration:underline">전체 오더리스트 보기</a></p>
${hubHtml(rows, null, null)}`;
  return shell({ title: "오더리스트를 찾을 수 없습니다 | 홈프로", desc: "홈프로 지역 · 업종별 오더리스트 안내", canonical: "", robots: "noindex,follow", ld: [], body });
}

function renderRss(rows) {
  const list = rows.slice(0, RSS_MAX);
  const last = list[0]?.at || new Date();
  const items = list.map((r) => `
    <item>
      <title>${esc(titleOf(r))}</title>
      <link>${SITE}/orders#o-${esc(r.id)}</link>
      <guid isPermaLink="false">homepro-order-${esc(r.id)}</guid>
      <category>${esc(r.category)}</category>
      <pubDate>${r.at.toUTCString()}</pubDate>
      <description>${esc(`${r.region || "지역 미표기"} · ${r.category}${r.sub ? " · " + r.sub : ""} · ${r.status}. 홈프로 앱에서 오더를 확인하고 지원하세요.`)}</description>
    </item>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>홈프로 최근 오더</title>
    <link>${SITE}/orders</link>
    <atom:link href="${SITE}/recent-orders/feed.xml" rel="self" type="application/rss+xml"/>
    <description>청소 · 설비 · 인테리어 · 현장구인 — 홈프로에 올라오는 최근 오더</description>
    <language>ko</language>
    <lastBuildDate>${last.toUTCString()}</lastBuildDate>${items}
  </channel>
</rss>`;
}

// 고정 페이지 — 예전 public/sitemap.xml 에 있던 것. 화면을 고치면 날짜를 같이 올린다
const STATIC_PAGES = [
  { loc: "/", lastmod: "2026-11-24", changefreq: "weekly", priority: "1.0" },
  { loc: "/app", lastmod: "2026-10-27", changefreq: "monthly", priority: "0.8" },
  { loc: "/legal/terms", lastmod: "2026-10-27", changefreq: "yearly", priority: "0.3" },
  { loc: "/legal/privacy", lastmod: "2026-11-18", changefreq: "yearly", priority: "0.3" },
  { loc: "/legal/location", lastmod: "2026-10-27", changefreq: "yearly", priority: "0.3" },
  { loc: "/legal/delete-account", lastmod: "2026-10-27", changefreq: "yearly", priority: "0.3" },
];

function renderSitemap(rows) {
  const latest = (list) => (list.length ? kstYmd(list.reduce((a, r) => (r.at > a ? r.at : a), list[0].at)) : "");
  const urls = STATIC_PAGES.map((p) => ({ ...p }));
  urls.push({ loc: "/orders", lastmod: latest(rows), changefreq: "hourly", priority: "0.9" });
  for (const c of CATS) urls.push({ loc: hrefOf(null, c), lastmod: latest(rows.filter((r) => r.cat === c)), changefreq: "daily", priority: "0.7" });
  for (const s of SIDO) urls.push({ loc: hrefOf(s, null), lastmod: latest(rows.filter((r) => r.sido === s)), changefreq: "daily", priority: "0.7" });
  // 시도 × 업종은 오더가 한 건이라도 있는 조합만
  for (const s of SIDO) {
    for (const c of CATS) {
      const mine = rows.filter((r) => r.sido === s && r.cat === c);
      if (mine.length) urls.push({ loc: hrefOf(s, c), lastmod: latest(mine), changefreq: "daily", priority: "0.6" });
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${SITE}${u.loc}</loc>${u.lastmod ? `
    <lastmod>${u.lastmod}</lastmod>` : ""}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>
`;
}

/** 주소 → 무엇을 그릴지. 모르는 주소는 notFound, 순서가 뒤집힌 주소는 바른 주소로 돌려보낸다 */
function route(rawPath) {
  const p = String(rawPath || "/").replace(/\/+$/, "") || "/";
  const lower = p.toLowerCase();
  if (lower === "/sitemap.xml") return { kind: "sitemap" };
  if (lower === "/recent-orders/feed.xml" || lower === "/orders/feed.xml") return { kind: "rss" };
  if (lower === "/" || lower === "/orders" || lower === "/recent-orders") return { kind: "list", sido: null, cat: null };
  const m = lower.match(/^\/orders\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/);
  if (!m) return { kind: "notFound" };
  const [, a, b] = m;
  let out;
  if (!b) {
    if (SIDO_BY_SLUG.has(a)) out = { kind: "list", sido: SIDO_BY_SLUG.get(a), cat: null };
    else if (CAT_BY_SLUG.has(a)) out = { kind: "list", sido: null, cat: CAT_BY_SLUG.get(a) };
  } else if (SIDO_BY_SLUG.has(a) && CAT_BY_SLUG.has(b)) {
    out = { kind: "list", sido: SIDO_BY_SLUG.get(a), cat: CAT_BY_SLUG.get(b) };
  } else if (CAT_BY_SLUG.has(a) && SIDO_BY_SLUG.has(b)) {
    return { kind: "redirect", to: hrefOf(SIDO_BY_SLUG.get(b), CAT_BY_SLUG.get(a)) }; // /orders/{업종}/{시도} → /orders/{시도}/{업종}
  }
  if (!out) return { kind: "notFound" };
  const canonical = hrefOf(out.sido, out.cat);
  if (p !== canonical) return { kind: "redirect", to: canonical }; // 대문자 섞인 주소
  return out;
}

async function handle(req, res) {
  try {
    const r = route(req.path);
    if (r.kind === "redirect") {
      res.set("Cache-Control", "public, max-age=300, s-maxage=3600").redirect(301, r.to);
      return;
    }
    const rows = await getRows();
    if (r.kind === "sitemap") {
      res.set("Cache-Control", "public, max-age=600, s-maxage=1800");
      res.set("Content-Type", "application/xml; charset=utf-8").send(renderSitemap(rows));
    } else if (r.kind === "rss") {
      res.set("Cache-Control", "public, max-age=120, s-maxage=300");
      res.set("Content-Type", "application/rss+xml; charset=utf-8").send(renderRss(rows));
    } else if (r.kind === "list") {
      // 5분은 CDN 이 들고 있게 — 검색 로봇이 몰려도 함수가 매번 돌지 않는다
      res.set("Cache-Control", "public, max-age=120, s-maxage=300");
      res.set("Content-Type", "text/html; charset=utf-8").send(renderList(rows, r.sido, r.cat));
    } else {
      res.status(404).set("Cache-Control", "public, max-age=60, s-maxage=300");
      res.set("Content-Type", "text/html; charset=utf-8").send(renderNotFound(rows));
    }
  } catch (e) {
    console.error("[publicOrders]", e);
    res.status(500).set("Cache-Control", "no-store").send("잠시 뒤 다시 열어 주세요.");
  }
}

exports.publicOrders = onRequest({ region: "asia-northeast3", memory: "256MiB" }, handle);
// 로컬 점검용 (배포되는 함수는 위 하나)
exports._test = { handle, route, renderList, renderSitemap, renderRss, renderNotFound, loadRows, pageMeta };
