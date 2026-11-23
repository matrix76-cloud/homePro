/**
 * 관리자 통계 공통 계산 — 기간 · 묶음 · 증감 · 시도 이름 정리.
 * 화면(React)이 없는 순수 계산만 둔다. 세 화면(신규 가입자 · 오더 등록 · 구독 매출)이 이 파일 하나를 같이 쓴다.
 *
 * 기간 규칙 (대표 리뷰 11/22 "개발팀 통일 규칙") — 전부 한국 시간 기준
 *   당일   : 오늘 00:00 ~ 지금          (비교: 전일 같은 시각까지)
 *   1주일  : 오늘 포함 최근 7일
 *   1개월  : 최근 30일  또는  당월 1일 ~ 지금
 *   분기   : 최근 90일  또는  1~4분기
 *   6개월  : 최근 180일
 *   1년    : 최근 365일
 *   직접 설정 : 시작 · 끝 날짜
 * 비교 기간은 "바로 앞의 같은 길이"이고, 끝 시각도 같은 만큼 당겨서 맞춘다(오늘이 아직 안 끝났으면 앞 기간도 같은 시각까지만).
 */

const KST_OFFSET = 9 * 3600000;
const HOUR = 3600000;
const DAY = 86400000;
const pad = (n) => String(n).padStart(2, "0");

/** Firestore Timestamp · Date · 문자열 · 숫자 → Date (없으면 null) */
export const toDate = (v) => {
    if (!v) return null;
    if (typeof v.toDate === "function") return v.toDate();
    if (v instanceof Date) return v;
    if (typeof v === "object" && typeof v.seconds === "number") return new Date(v.seconds * 1000);
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};

/** 한국 시간 달력 값 */
export const kstParts = (d) => {
    const k = new Date(d.getTime() + KST_OFFSET);
    return { y: k.getUTCFullYear(), m: k.getUTCMonth() + 1, d: k.getUTCDate(), h: k.getUTCHours(), mi: k.getUTCMinutes() };
};
/** 한국 시간 y-m-d h:mi 가 가리키는 순간 (월 · 일이 넘치면 알아서 넘어간다) */
export const kstDate = (y, m, d, h = 0, mi = 0) => new Date(Date.UTC(y, m - 1, d, h, mi) - KST_OFFSET);
export const kstDayStart = (d) => { const p = kstParts(d); return kstDate(p.y, p.m, p.d); };
export const kstYmd = (d) => { const p = kstParts(d); return `${p.y}-${pad(p.m)}-${pad(p.d)}`; };
export const kstYmdDots = (d) => { const p = kstParts(d); return `${p.y}.${pad(p.m)}.${pad(p.d)}`; };
export const kstDateTime = (d) => { const p = kstParts(d); return `${p.y}-${pad(p.m)}-${pad(p.d)} ${pad(p.h)}:${pad(p.mi)}`; };
/** "2026-11-24" → 그날 00:00(한국 시간). 모양이 틀리면 null */
export const ymdToDate = (ymd) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ""));
    return m ? kstDate(Number(m[1]), Number(m[2]), Number(m[3])) : null;
};
/** 한국은 서머타임이 없어 하루 = 24시간으로 더해도 날짜가 어긋나지 않는다 */
export const addDays = (d, n) => new Date(d.getTime() + n * DAY);

export const PERIOD_TABS = [
    { key: "today", label: "당일" },
    { key: "week", label: "1주일" },
    { key: "month", label: "1개월" },
    { key: "quarter", label: "분기" },
    { key: "half", label: "6개월" },
    { key: "year", label: "1년" },
    { key: "custom", label: "직접 설정" },
];

export const defaultPeriod = (key = "today") => ({ key, monthMode: "recent", quarterMode: "recent", from: "", to: "" });

/** 분기 고르기 보기 — 최근 90일 + 올해 · 작년의 1~4분기(아직 시작 안 한 분기는 뺀다) */
export const quarterOptions = (now = new Date()) => {
    const { y } = kstParts(now);
    const out = [{ value: "recent", label: "최근 90일" }];
    for (const year of [y, y - 1]) {
        for (let q = 4; q >= 1; q--) {
            if (kstDate(year, (q - 1) * 3 + 1, 1) > now) continue;
            out.push({ value: `${year}-Q${q}`, label: `${year}년 ${q}분기` });
        }
    }
    return out;
};

const spanDays = (start, end) => {
    if (end <= start) return 1;
    return Math.round((kstDayStart(new Date(end.getTime() - 1)).getTime() - kstDayStart(start).getTime()) / DAY) + 1;
};

const build = (start, end, prevStart, prevEnd, prevLabel, extra = {}) => {
    const days = spanDays(start, end);
    const unit = days <= 1 ? "hour" : days <= 92 ? "day" : days <= 200 ? "week" : "month";
    const lastDay = new Date(Math.max(start.getTime(), end.getTime() - 1));
    const label = days <= 1 ? kstYmdDots(start) : `${kstYmdDots(start)} ~ ${kstYmdDots(lastDay)}`;
    return { start, end, prevStart, prevEnd, prevLabel, days, unit, label, valid: true, ...extra };
};

/**
 * 기간 고른 값 → 실제 시각 범위.
 *   { start, end, prevStart, prevEnd, prevLabel, days, unit('hour'|'day'|'week'|'month'), label, valid }
 * end 는 "지금"을 넘지 않는다.
 */
export function resolveRange(period, now = new Date()) {
    const p = period || defaultPeriod();
    const today0 = kstDayStart(now);
    const recent = (days, prevLabel) => {
        const start = addDays(today0, -(days - 1));
        return build(start, now, addDays(start, -days), addDays(now, -days), prevLabel);
    };
    const { y, m } = kstParts(now);

    if (p.key === "week") return recent(7, "직전 7일");
    if (p.key === "half") return recent(180, "직전 180일");
    if (p.key === "year") return recent(365, "직전 365일");

    if (p.key === "month") {
        if (p.monthMode !== "calendar") return recent(30, "직전 30일");
        const start = kstDate(y, m, 1);
        const prevStart = kstDate(y, m - 1, 1);
        // 전월 같은 날 · 같은 시각까지. 전월이 더 짧으면 전월 끝에서 멈춘다
        const prevEnd = new Date(Math.min(prevStart.getTime() + (now.getTime() - start.getTime()), start.getTime()));
        return build(start, now, prevStart, prevEnd, "전월 같은 날까지");
    }

    if (p.key === "quarter") {
        const mq = /^(\d{4})-Q([1-4])$/.exec(String(p.quarterMode || ""));
        if (!mq) return recent(90, "직전 90일");
        const year = Number(mq[1]); const q = Number(mq[2]);
        const start = kstDate(year, (q - 1) * 3 + 1, 1);
        const qEnd = kstDate(year, q * 3 + 1, 1);
        const end = new Date(Math.max(start.getTime(), Math.min(qEnd.getTime(), now.getTime())));
        const prevStart = kstDate(year, (q - 2) * 3 + 1, 1);
        const prevEnd = new Date(Math.min(prevStart.getTime() + (end.getTime() - start.getTime()), start.getTime()));
        return build(start, end, prevStart, prevEnd, "직전 분기 같은 기간");
    }

    if (p.key === "custom") {
        const from = ymdToDate(p.from);
        const to = ymdToDate(p.to);
        if (!from || !to || from > to || from > now) {
            // 날짜를 아직 다 안 골랐으면 오늘로 보여 주고, 화면이 valid 를 보고 안내한다
            return build(today0, now, addDays(today0, -1), addDays(now, -1), "전일 같은 시각", { valid: false });
        }
        const endFull = addDays(to, 1);
        const end = new Date(Math.min(endFull.getTime(), now.getTime()));
        const fullDays = Math.round((endFull.getTime() - from.getTime()) / DAY);
        const prevStart = addDays(from, -fullDays);
        const prevEnd = new Date(prevStart.getTime() + (end.getTime() - from.getTime()));
        return build(from, end, prevStart, prevEnd, `직전 ${fullDays}일`);
    }

    // today
    return build(today0, now, addDays(today0, -1), addDays(now, -1), "전일 같은 시각");
}

/**
 * 범위를 그래프 칸으로 나눈다 — 하루면 시간별, 석 달까지 날짜별, 그보다 길면 주별 · 월별.
 * 돌려주는 값: { list: [{ name, start, end }], indexOf(date) }
 */
export function makeBuckets(start, end, unit) {
    const list = [];
    if (end <= start) return { list, indexOf: () => -1 };

    if (unit === "month") {
        const s = kstParts(start);
        let cy = s.y; let cm = s.m;
        for (let guard = 0; guard < 240; guard++) {
            const bs = kstDate(cy, cm, 1);
            if (bs >= end) break;
            const be = kstDate(cy, cm + 1, 1);
            list.push({ name: `${String(cy).slice(2)}.${pad(cm)}`, start: bs < start ? start : bs, end: be > end ? end : be });
            cm += 1; if (cm > 12) { cm = 1; cy += 1; }
        }
        return {
            list,
            indexOf: (d) => {
                if (!d || d < start || d >= end) return -1;
                const k = kstParts(d);
                return (k.y - s.y) * 12 + (k.m - s.m);
            },
        };
    }

    const step = unit === "hour" ? HOUR : unit === "week" ? 7 * DAY : DAY;
    const base = unit === "hour" ? start : kstDayStart(start);
    for (let t = base.getTime(), guard = 0; t < end.getTime() && guard < 800; t += step, guard++) {
        const bs = new Date(t);
        const k = kstParts(bs);
        const name = unit === "hour" ? `${k.h}시` : unit === "week" ? `${k.m}.${k.d}~` : `${k.m}.${k.d}`;
        list.push({ name, start: bs, end: new Date(Math.min(t + step, end.getTime())) });
    }
    return {
        list,
        indexOf: (d) => {
            if (!d || d < start || d >= end) return -1;
            return Math.floor((d.getTime() - base.getTime()) / step);
        },
    };
}

/**
 * 줄(rows)을 그래프 칸에 담아 합친다.
 *   getDate(row) → Date,  fields = { 이름: (row) => 숫자 }  (기본은 건수 value)
 * 돌려주는 값: [{ name, value, ... }]
 */
export function seriesOf(start, end, unit, rows, getDate, fields = { value: () => 1 }) {
    const { list, indexOf } = makeBuckets(start, end, unit);
    const keys = Object.keys(fields);
    const out = list.map((b) => { const o = { name: b.name }; keys.forEach((k) => { o[k] = 0; }); return o; });
    for (const row of rows || []) {
        const i = indexOf(getDate(row));
        if (i < 0 || i >= out.length) continue;
        for (const k of keys) out[i][k] += Number(fields[k](row)) || 0;
    }
    return out;
}

/** 범위 안에 든 줄만 */
export const inRange = (rows, getDate, start, end) => (rows || []).filter((r) => { const d = getDate(r); return d && d >= start && d < end; });

/** 증감 — { diff, pct(앞 기간이 0이면 null), dir: 'up'|'down'|'flat' } */
export const deltaOf = (cur, prev) => {
    const c = Number(cur) || 0; const p = Number(prev) || 0;
    const diff = c - p;
    return { diff, pct: p === 0 ? null : (diff / p) * 100, dir: diff > 0 ? "up" : diff < 0 ? "down" : "flat" };
};

/** "+12.5%" · "-8.0%" · 앞 기간이 0이면 "" */
export const pctText = (pct) => (pct === null || pct === undefined ? "" : `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`);

// ─────────────────────────── 시 · 도 ───────────────────────────
export const SIDO_17 = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
export const SIDO_UNKNOWN = "지역 미상";

const SIDO_LONG = {
    "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천", "광주광역시": "광주",
    "대전광역시": "대전", "울산광역시": "울산", "세종특별자치시": "세종", "세종시": "세종",
    "경기도": "경기", "강원도": "강원", "강원특별자치도": "강원",
    "충청북도": "충북", "충청남도": "충남", "전라북도": "전북", "전북특별자치도": "전북", "전라남도": "전남",
    "경상북도": "경북", "경상남도": "경남", "제주도": "제주", "제주특별자치도": "제주",
};
const GWANGJU_GU = ["동구", "서구", "남구", "북구", "광산구"];

/**
 * 주소 맨 앞 낱말 → 17개 시 · 도 짧은 이름.
 * 주소 검색이 "전남광주통합특별시"로 돌려주는 경우는 뒤 낱말(구 이름)로 광주 · 전남을 가른다.
 */
export function normalizeSido(raw, next = "") {
    const s = String(raw || "").trim();
    if (!s) return SIDO_UNKNOWN;
    if (SIDO_17.includes(s)) return s;
    if (SIDO_LONG[s]) return SIDO_LONG[s];
    if (s.includes("광주") && s.includes("전남")) return GWANGJU_GU.includes(String(next || "").trim()) ? "광주" : "전남";
    const cut = s.replace(/(특별자치시|특별자치도|통합특별시|특별시|광역시|시|도)$/, "");
    if (SIDO_17.includes(cut)) return cut;
    return SIDO_UNKNOWN;
}

/** 오더 문서 → 시 · 도 (region 이 있으면 그것, 없으면 주소 앞머리) */
export function sidoOfOrder(o) {
    const r = o && o.region;
    if (r && typeof r === "object" && r.sido) return normalizeSido(r.sido, r.sigungu || r.gu || "");
    const parts = String((o && (o.address || o.location)) || "").trim().split(/\s+/).filter(Boolean);
    return normalizeSido(parts[0] || "", parts[1] || "");
}

/** 회원 문서 → 시 · 도 (활동 지역 region.sido) */
export function sidoOfUser(u) {
    const r = u && u.region;
    if (r && typeof r === "object" && r.sido) return normalizeSido(r.sido, r.gu || r.sigungu || "");
    return SIDO_UNKNOWN;
}

/** 이름별 건수 표 — [{ name, value }] 를 많은 순으로 (같으면 원래 순서) */
export const tally = (rows, keyOf, order = []) => {
    const map = new Map(order.map((k) => [k, 0]));
    for (const r of rows || []) {
        const ks = keyOf(r);
        for (const k of Array.isArray(ks) ? ks : [ks]) {
            if (k === null || k === undefined || k === "") continue;
            map.set(k, (map.get(k) || 0) + 1);
        }
    }
    return [...map.entries()].map(([name, value], i) => ({ name, value, i })).sort((a, b) => b.value - a.value || a.i - b.i).map(({ name, value }) => ({ name, value }));
};

// ─────────────────────────── 세는 기준 (세 화면 공통) ───────────────────────────
/** 테스트 계정 uid — 시드(seed_) · PG 심사용 */
export const isTestUid = (uid) => { const s = String(uid || ""); return s.startsWith("seed_") || s === "pg_review"; };
/** 테스트 회원 문서 — 시드 · PG 심사용 계정 */
export const isTestUser = (u) => !!u && (isTestUid(u.id) || u._isSeed === true || u.pgReview === true);
/** 회원으로 세는 문서 — 전화번호 인증 끝(회원 목록 화면과 같은 기준) + 합쳐진 중복 계정 아님 + 탈퇴 아님 */
export const isCountedUser = (u) => !!u && !!(u.phoneE164 || u.phone) && !u.mergedInto && u.withdrawn !== true;
/** 테스트 오더 — 시드 · 테스트 · PG 심사용, 접수자를 알 수 없는 오더 (공개 '최근 오더' 목록과 같은 기준) */
export const isTestOrder = (o) => {
    const by = String((o && o.createdBy) || "");
    return !by || isTestUid(by) || o._isSeed === true || o.isTest === true || o.pgReview === true || o._pgReview === true;
};
