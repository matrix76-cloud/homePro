/**
 * 공개 '최근 오더' 목록 — 로그인 없이 보이는 페이지 + RSS (대표 리뷰 11/12 16번 · 11/13 "사장님 안으로 진행")
 *   https://www.tryhomepro.com/recent-orders           사람과 검색 로봇이 읽는 HTML (서버에서 그려서 보냄)
 *   https://www.tryhomepro.com/recent-orders/feed.xml  새 오더가 생길 때마다 새 글로 잡히는 RSS
 *
 * 보여 주는 것: 카테고리 · 세부 항목 · 지역(시 · 구까지) · 접수 시각 · 상태 — 이것만.
 * 빼는 것: 제목 · 설명(연락처나 주소가 섞여 있을 수 있다) · 상세 주소 · 금액 · 접수자 · 연락처.
 * 안 보이는 오더: 대기 · 취소 · 거부, 셀프 등록 오더(본인 기록용), 시드(seed_) · 테스트 계정 오더.
 * 누르면 앱 설치 · 로그인(/app)으로 이어진다.
 */
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const SITE = "https://www.tryhomepro.com";
const LIMIT = 60;

const STATUS_PUBLIC = { "접수": "모집 중", "선정대기": "모집 중", "배정": "진행 중", "완료": "작업 완료" };

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** "서울 종로구 낙산길 198" → "서울 종로구" · "경기 성남시 분당구 …" → "경기 성남시 분당구" */
function regionOf(o) {
  const r = o.region;
  if (r && typeof r === "object" && (r.sido || r.sigungu)) return [r.sido, r.sigungu].filter(Boolean).join(" ");
  const parts = String(o.address || o.location || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  const out = [parts[0]];
  for (let i = 1; i < parts.length && i < 3; i++) {
    if (/(시|군|구)$/.test(parts[i])) out.push(parts[i]); else break;
  }
  return out.join(" ");
}

const toDate = (ts) => (ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null);

/** KST 표기 "11월 18일 오전 9:05" */
function kst(d) {
  const k = new Date(d.getTime() + 9 * 3600000);
  const h = k.getUTCHours();
  const m = String(k.getUTCMinutes()).padStart(2, "0");
  return `${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일 ${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${m}`;
}

async function loadOrders() {
  const db = admin.firestore();
  const snap = await db.collection("homepro_orders").orderBy("createdAt", "desc").limit(LIMIT * 3).get();
  const rows = [];
  for (const d of snap.docs) {
    const o = d.data() || {};
    const status = STATUS_PUBLIC[o.orderStatus];
    if (!status) continue;
    if (o.selfOrder) continue;
    const by = String(o.createdBy || "");
    if (!by || by.startsWith("seed_") || o.isTest || o.pgReview) continue;
    const at = toDate(o.createdAt);
    if (!at) continue;
    // 세부 항목이 많으면 앞 세 개 + "외 N개" (사업장청소는 열 개 넘게 고르기도 한다)
    const subs = (Array.isArray(o.subcategories) && o.subcategories.length ? o.subcategories : String(o.subcategory || "").split(/,\s*/))
      .map((x) => String(x).trim()).filter(Boolean);
    const sub = subs.slice(0, 3).join(" · ") + (subs.length > 3 ? ` 외 ${subs.length - 3}개` : "");
    rows.push({
      id: d.id,
      category: String(o.categoryName || "기타"),
      sub,
      region: regionOf(o),
      status,
      at,
    });
    if (rows.length >= LIMIT) break;
  }
  return rows;
}

function titleOf(r) {
  return `${r.region ? r.region + " " : ""}${r.category}${r.sub ? " · " + r.sub : ""} 오더`;
}

function renderHtml(rows) {
  const items = rows.map((r) => `
      <li id="o-${esc(r.id)}">
        <a href="/app?from=recent-orders" class="row">
          <span class="cat">${esc(r.category)}</span>
          <span class="main">
            <strong>${esc(r.region || "지역 미표기")}</strong>
            ${r.sub ? `<span class="sub">${esc(r.sub)}</span>` : ""}
          </span>
          <span class="meta">
            <span class="st${r.status === "모집 중" ? " open" : ""}">${esc(r.status)}</span>
            <time datetime="${r.at.toISOString()}">${esc(kst(r.at))}</time>
          </span>
        </a>
      </li>`).join("");
  const ld = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "홈프로 최근 오더",
    itemListElement: rows.slice(0, 30).map((r, i) => ({ "@type": "ListItem", position: i + 1, name: titleOf(r) })),
  };
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>최근 오더 — 홈클리닝 · 설비 · 인테리어 오더 공유 | 홈프로</title>
<meta name="description" content="홈프로에 지금 올라오는 청소 · 설비 · 인테리어 · 이사 오더입니다. 지역과 분야를 보고 앱에서 바로 수락하세요. 집(Home) 전문 사업자들이 오더를 공유하는 플랫폼, 홈프로.">
<link rel="canonical" href="${SITE}/recent-orders">
<link rel="alternate" type="application/rss+xml" title="홈프로 최근 오더" href="${SITE}/recent-orders/feed.xml">
<meta property="og:type" content="website">
<meta property="og:title" content="홈프로 최근 오더">
<meta property="og:description" content="지금 올라오는 청소 · 설비 · 인테리어 오더를 확인하고 앱에서 수락하세요.">
<meta property="og:url" content="${SITE}/recent-orders">
<meta property="og:image" content="${SITE}/og-image.png?v=4">
<link rel="icon" href="/favicon.ico">
<link rel="preload" as="font" type="font/woff2" href="/fonts/PretendardVariable.woff2" crossorigin>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
<style>
@font-face{font-family:'Pretendard Variable';font-weight:45 920;font-style:normal;font-display:swap;src:url('/fonts/PretendardVariable.woff2') format('woff2-variations'),url('/fonts/PretendardVariable.woff2') format('woff2')}
:root{--ink:#14181F;--line:#e3e6eb;--soft:#f5f7f9;--point:#00963F;--pointDark:#007A33}
*{box-sizing:border-box}
body{margin:0;background:#fff;color:var(--ink);font-family:'Pretendard Variable',Pretendard,-apple-system,BlinkMacSystemFont,'Segoe UI','Malgun Gothic',sans-serif;font-size:15px;line-height:1.55;letter-spacing:-.01em}
a{color:inherit;text-decoration:none}
.top{border-bottom:1px solid var(--line)}
.top .in{max-width:760px;margin:0 auto;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.brand{display:flex;align-items:center;gap:8px;font-weight:700;font-size:18px}
.brand img{width:28px;height:28px}
.btn{display:inline-block;padding:10px 16px;border-radius:6px;background:var(--pointDark);color:#fff;font-weight:600;font-size:15px}
main{max-width:760px;margin:0 auto;padding:28px 20px 60px}
h1{font-size:25px;margin:0 0 8px;font-weight:700}
.lead{margin:0 0 22px;font-size:15px}
.lead a{text-decoration:underline}
ul{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
li{border-bottom:1px solid var(--line)}
.row{display:flex;align-items:center;gap:14px;padding:16px 4px}
.row:hover{background:var(--soft)}
.cat{flex:0 0 auto;min-width:88px;padding:8px 10px;border:1px solid var(--line);border-radius:6px;font-size:14px;font-weight:600;text-align:center;word-break:keep-all}
.main{flex:1 1 auto;display:flex;flex-direction:column;gap:2px;min-width:0}
.main strong{font-size:16px;font-weight:600}
.sub{font-size:14px;word-break:keep-all}
.meta{flex:0 0 auto;display:flex;flex-direction:column;align-items:flex-end;gap:2px;font-size:13px}
.st{font-weight:500}
.st.open{color:var(--pointDark);font-weight:600}
.empty{padding:48px 0;text-align:center;font-size:15px}
.foot{margin-top:28px;padding:20px;border:1px solid var(--line);border-radius:6px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
.foot p{margin:0;font-size:15px}
.links{margin-top:22px;font-size:14px;display:flex;gap:14px;flex-wrap:wrap}
.links a{text-decoration:underline}
@media (max-width:520px){.row{flex-wrap:wrap}.cat{min-width:0}.meta{flex-direction:row;gap:10px;width:100%;justify-content:flex-start;padding-left:2px}}
</style>
</head>
<body>
<header class="top"><div class="in">
  <a class="brand" href="/"><img src="/homepro-symbol.svg" alt="">홈프로</a>
  <a class="btn" href="/app?from=recent-orders">앱에서 오더 받기</a>
</div></header>
<main>
  <h1>최근 오더</h1>
  <p class="lead">홈프로에 지금 올라오는 오더입니다. 연락처 · 상세 주소 · 금액은 앱에 로그인한 회원에게만 보입니다. <a href="/recent-orders/feed.xml">RSS로 받기</a></p>
  ${rows.length ? `<ul>${items}</ul>` : `<p class="empty">지금 모집 중인 오더가 없습니다. 새 오더가 올라오면 여기에 바로 나옵니다.</p>`}
  <div class="foot">
    <p>오더를 수락하거나 내 오더를 공유하려면 홈프로 앱을 설치하세요.</p>
    <a class="btn" href="/app?from=recent-orders">앱 설치 · 로그인</a>
  </div>
  <nav class="links"><a href="/">홈프로 소개</a><a href="/legal/terms">이용약관</a><a href="/legal/privacy">개인정보처리방침</a></nav>
</main>
</body>
</html>`;
}

function renderRss(rows) {
  const last = rows[0]?.at || new Date();
  const items = rows.map((r) => `
    <item>
      <title>${esc(titleOf(r))}</title>
      <link>${SITE}/recent-orders#o-${esc(r.id)}</link>
      <guid isPermaLink="false">homepro-order-${esc(r.id)}</guid>
      <category>${esc(r.category)}</category>
      <pubDate>${r.at.toUTCString()}</pubDate>
      <description>${esc(`${r.region || "지역 미표기"} · ${r.category}${r.sub ? " · " + r.sub : ""} · ${r.status}. 홈프로 앱에서 오더를 확인하고 수락하세요.`)}</description>
    </item>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>홈프로 최근 오더</title>
    <link>${SITE}/recent-orders</link>
    <atom:link href="${SITE}/recent-orders/feed.xml" rel="self" type="application/rss+xml"/>
    <description>홈클리닝 · 설비 · 인테리어 · 이사 — 홈프로에 올라오는 최근 오더</description>
    <language>ko</language>
    <lastBuildDate>${last.toUTCString()}</lastBuildDate>${items}
  </channel>
</rss>`;
}

exports.publicOrders = onRequest({ region: "asia-northeast3", memory: "256MiB" }, async (req, res) => {
  try {
    const rows = await loadOrders();
    // 5분은 CDN 이 들고 있게 — 검색 로봇이 몰려도 Firestore 를 매번 읽지 않는다
    res.set("Cache-Control", "public, max-age=120, s-maxage=300");
    if (/feed\.xml$/.test(req.path)) {
      res.set("Content-Type", "application/rss+xml; charset=utf-8").send(renderRss(rows));
    } else {
      res.set("Content-Type", "text/html; charset=utf-8").send(renderHtml(rows));
    }
  } catch (e) {
    console.error("[publicOrders]", e);
    res.status(500).set("Cache-Control", "no-store").send("잠시 뒤 다시 열어 주세요.");
  }
});
