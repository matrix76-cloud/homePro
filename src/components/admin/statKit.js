/* eslint-disable */
/**
 * 관리자 통계 화면 공통 부품 — 기간 고르기 · 요약 칸 · 추이 그래프 · 분포 표 · 쪽 넘김 · 기다림 고리.
 * 신규 가입자 현황(대시보드) · 오더 등록 통계 · 구독 매출 통계가 같이 쓴다. (대표 리뷰 11/22)
 * 계산(기간 · 묶음 · 증감 · 시도)은 statPeriod.js 에 있고 여기서 다시 내보낸다.
 *
 * 모양 규칙: 흰 카드(모서리 4 · 가는 선), 굵은 글씨는 제목 · 큰 숫자만, 색은 초록 한 계열 + 무채색,
 *            탭은 한 박스로 묶고 사이에만 세로선(고른 탭 = 연회색 면 + 굵은 글씨).
 */
import React, { useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import {
    ResponsiveContainer, ComposedChart, AreaChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { db } from "../../api/config";
import { THEME } from "../../config/homeproConfig";
import {
    PERIOD_TABS, defaultPeriod, quarterOptions, resolveRange, deltaOf, pctText, kstYmd, kstDayStart,
} from "./statPeriod";

export * from "./statPeriod";

// ─────────────────────────── 색 · 숫자 ───────────────────────────
export const INK = "#14181F";
export const LINE = "#d9dee5";
export const LINE_SOFT = "#e9ecf1";
export const FILL_SOFT = "#f4f6f9";
export const POINT = THEME.primary;         // #00963F
export const POINT_DARK = THEME.primaryDark; // #007A33
export const POINT_SOFT = THEME.primaryLight; // #5FBE8A
export const TONE_GRAY = "#aab2bd";
export const DOWN = "#b91c1c";

export const num = (n) => (Number(n) || 0).toLocaleString();
export const won = (n) => `${num(n)}원`;
/** 그래프 세로축 — 만 원 넘으면 "12만" */
export const shortWon = (v) => (Math.abs(v) >= 10000 ? `${Math.round(v / 10000).toLocaleString()}만` : num(v));

// ─────────────────────────── 기간 ───────────────────────────
/**
 * 기간 상태 한 벌 — { period, change(patch), range, now, refresh }
 * 기간을 바꾸거나 새로고침할 때 "지금"을 다시 잡는다.
 */
export function usePeriod(initialKey = "today") {
    const [period, setPeriod] = useState(() => defaultPeriod(initialKey));
    const [now, setNow] = useState(() => new Date());
    const change = (patch) => { setNow(new Date()); setPeriod((p) => ({ ...p, ...patch })); };
    const range = useMemo(() => resolveRange(period, now), [period, now]);
    return { period, change, range, now, refresh: () => setNow(new Date()) };
}

const TabBox = styled.div`
    display: inline-flex; border: 1px solid ${LINE}; background: #fff;
`;
const TabBtn = styled.button`
    height: 38px; padding: 0 16px; border: none; border-left: 1px solid ${LINE};
    background: ${(p) => (p.$on ? LINE_SOFT : "#fff")}; color: ${INK};
    font-size: 15px; font-weight: ${(p) => (p.$on ? 600 : 400)}; font-family: inherit; cursor: pointer;
    &:first-child { border-left: none; }
    &:hover { background: ${(p) => (p.$on ? LINE_SOFT : FILL_SOFT)}; }
`;
const PeriodRow = styled.div`display: flex; align-items: center; gap: 10px; flex-wrap: wrap;`;
const PeriodSelect = styled.select`
    height: 38px; padding: 0 10px; border: 1px solid ${LINE}; background: #fff; color: ${INK};
    font-size: 15px; font-family: inherit;
`;
const PeriodDate = styled.input`
    height: 38px; padding: 0 10px; border: 1px solid ${LINE}; background: #fff; color: ${INK};
    font-size: 15px; font-family: inherit;
`;
const RangeText = styled.span`font-size: 15px; color: ${INK}; margin-left: auto;`;

/** 기간 고르기 줄 — [당일|1주일|1개월|분기|6개월|1년|직접 설정] + 딸린 보기 + 오른쪽에 실제 날짜 */
export function PeriodBar({ period, onChange, range, now }) {
    const qOpts = useMemo(() => quarterOptions(now || new Date()), [now]);
    const today = kstYmd(now || new Date());
    return (
        <PeriodRow>
            <TabBox>
                {PERIOD_TABS.map((t) => (
                    <TabBtn key={t.key} type="button" $on={period.key === t.key} onClick={() => onChange({ key: t.key })}>{t.label}</TabBtn>
                ))}
            </TabBox>
            {period.key === "month" && (
                <PeriodSelect value={period.monthMode} onChange={(e) => onChange({ monthMode: e.target.value })}>
                    <option value="recent">최근 30일</option>
                    <option value="calendar">당월 1일부터</option>
                </PeriodSelect>
            )}
            {period.key === "quarter" && (
                <PeriodSelect value={period.quarterMode} onChange={(e) => onChange({ quarterMode: e.target.value })}>
                    {qOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </PeriodSelect>
            )}
            {period.key === "custom" && (
                <>
                    <PeriodDate type="date" value={period.from} max={period.to || today} onChange={(e) => onChange({ from: e.target.value })} />
                    <span style={{ fontSize: 15, color: INK }}>~</span>
                    <PeriodDate type="date" value={period.to} min={period.from || undefined} max={today} onChange={(e) => onChange({ to: e.target.value })} />
                </>
            )}
            <RangeText>
                {period.key === "custom" && !range.valid
                    ? "시작 · 끝 날짜를 골라 주세요"
                    : `${range.label}${range.days > 1 ? ` (${range.days}일)` : ""}`}
            </RangeText>
        </PeriodRow>
    );
}

// ─────────────────────────── 불러오기 ───────────────────────────
/**
 * 컬렉션에서 field >= since 인 문서만 읽는다. 더 앞 날짜가 필요해지면 그때 다시 읽는다(짧은 기간으로 바꿀 땐 다시 읽지 않음).
 *   { rows, loading, error }
 */
export function useDocsSince(colName, field, since, reloadKey = 0) {
    const sinceMs = since ? kstDayStart(since).getTime() : null;
    const [state, setState] = useState({ rows: null, loadedSince: null, reloadKey: -1, error: null });
    useEffect(() => {
        if (sinceMs === null) return undefined;
        if (state.rows !== null && state.loadedSince !== null && state.loadedSince <= sinceMs && state.reloadKey === reloadKey) return undefined;
        let alive = true;
        getDocs(query(collection(db, colName), where(field, ">=", Timestamp.fromMillis(sinceMs)), orderBy(field, "asc")))
            .then((snap) => { if (alive) setState({ rows: snap.docs.map((d) => ({ id: d.id, ...d.data() })), loadedSince: sinceMs, reloadKey, error: null }); })
            .catch((e) => { console.error(`${colName} 불러오기 실패:`, e); if (alive) setState({ rows: [], loadedSince: sinceMs, reloadKey, error: e.message || "불러오지 못했습니다" }); });
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [colName, field, sinceMs, reloadKey]);
    const loading = sinceMs === null || state.rows === null || state.loadedSince === null || state.loadedSince > sinceMs || state.reloadKey !== reloadKey;
    return { rows: state.rows || [], loading, error: state.error };
}

/** 컬렉션 전체를 한 번 읽는다 — { rows, loading, error } */
export function useAllDocs(colName, reloadKey = 0) {
    const [state, setState] = useState({ rows: null, error: null });
    useEffect(() => {
        let alive = true;
        getDocs(collection(db, colName))
            .then((snap) => { if (alive) setState({ rows: snap.docs.map((d) => ({ id: d.id, ...d.data() })), error: null }); })
            .catch((e) => { console.error(`${colName} 불러오기 실패:`, e); if (alive) setState({ rows: [], error: e.message || "불러오지 못했습니다" }); });
        return () => { alive = false; };
    }, [colName, reloadKey]);
    return { rows: state.rows || [], loading: state.rows === null, error: state.error };
}

// ─────────────────────────── 틀 ───────────────────────────
export const StatPage = styled.div`display: flex; flex-direction: column; gap: 16px;`;
export const PageHead = styled.div`display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;`;
export const PageTitle = styled.h1`font-size: 23px; font-weight: 600; color: ${INK}; margin: 0; letter-spacing: -0.01em;`;
export const HeadRight = styled.div`display: flex; align-items: center; gap: 16px; flex-wrap: wrap;`;

export const Card = styled.section`background: #fff; border: 1px solid ${LINE}; border-radius: 4px; min-width: 0;`;
export const CardHead = styled.div`
    display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    padding: 14px 20px; border-bottom: 1px solid ${LINE_SOFT};
`;
export const CardTitle = styled.h3`font-size: 17px; font-weight: 600; color: ${INK}; margin: 0;`;
export const CardMeta = styled.span`font-size: 14px; color: ${INK};`;
export const CardBody = styled.div`padding: 16px 20px;`;
export const TwoCol = styled.div`display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: start;`;

export const PlainBtn = styled.button`
    height: 36px; padding: 0 14px; border: 1px solid ${LINE}; background: #fff; color: ${INK};
    font-size: 14px; font-weight: 500; font-family: inherit; border-radius: 4px; cursor: pointer;
    &:hover { background: ${FILL_SOFT}; }
    &:disabled { opacity: 0.45; cursor: not-allowed; }
`;
export const CheckToggle = styled.label`
    display: inline-flex; align-items: center; gap: 8px; font-size: 15px; color: ${INK}; cursor: pointer;
    input { width: 17px; height: 17px; accent-color: ${POINT}; }
`;
export const ErrorNote = styled.div`font-size: 15px; color: ${DOWN}; padding: 12px 0;`;
export const EmptyNote = styled.div`font-size: 15px; color: ${INK}; text-align: center; padding: 40px 0;`;

// ─────────────────────────── 기다림 고리 ───────────────────────────
const spin = keyframes`to { transform: rotate(360deg); }`;
export const Ring = styled.span`
    display: inline-block; width: ${(p) => p.$size || 30}px; height: ${(p) => p.$size || 30}px;
    border: 3px solid ${LINE_SOFT}; border-top-color: ${POINT}; border-radius: 50%;
    animation: ${spin} 0.8s linear infinite;
`;
const SpinWrap = styled.div`display: flex; align-items: center; justify-content: center;`;
export const SpinnerBox = ({ height = 240, size }) => (
    <SpinWrap style={{ minHeight: height }} role="status" aria-label="불러오는 중"><Ring $size={size} /></SpinWrap>
);

// ─────────────────────────── 요약 칸 ───────────────────────────
export const SummaryGrid = styled.div`
    display: grid; grid-template-columns: repeat(${(p) => p.$cols || 4}, minmax(0, 1fr)); gap: 12px;
`;
const Cell = styled.div`
    background: #fff; border: 1px solid ${LINE}; border-radius: 4px; padding: 16px 18px;
    display: flex; flex-direction: column; min-height: ${(p) => p.$minH || 150}px; min-width: 0;
`;
const CellLabel = styled.div`font-size: 15px; font-weight: 500; color: ${INK};`;
const CellValueRow = styled.div`display: flex; align-items: baseline; gap: 4px; margin-top: 8px; flex-wrap: wrap;`;
const CellValue = styled.span`font-size: ${(p) => (p.$text ? 21 : 28)}px; font-weight: 600; color: ${INK}; line-height: 1.25; word-break: keep-all;`;
const CellUnit = styled.span`font-size: 15px; color: ${INK};`;
const CellLine = styled.div`font-size: 14px; color: ${INK}; margin-top: 6px; line-height: 1.5;`;
const DeltaText = styled.span`color: ${(p) => (p.$dir === "up" ? POINT_DARK : p.$dir === "down" ? DOWN : INK)}; font-weight: 500;`;
const SparkWrap = styled.div`margin-top: auto; padding-top: 10px; height: 46px;`;

/** 증감 한 줄 — "+12.5% · 직전 7일 8건" (앞 기간이 0이면 % 없이 건수만) */
export function Delta({ cur, prev, unit = "", prevLabel = "전 기간", format = num }) {
    const d = deltaOf(cur, prev);
    const pct = pctText(d.pct);
    return (
        <span>
            {pct ? <DeltaText $dir={d.dir}>{pct}</DeltaText> : d.dir !== "flat" ? <DeltaText $dir={d.dir}>{d.diff > 0 ? "+" : ""}{format(d.diff)}{unit}</DeltaText> : <DeltaText $dir="flat">변동 없음</DeltaText>}
            {` · ${prevLabel} ${format(prev)}${unit}`}
        </span>
    );
}

/**
 * 요약 칸 — 이름 · 큰 숫자 · 증감 · 덧붙는 줄 · 작은 추세선
 *   value 가 글자(카테고리 이름 등)면 text 를 준다. spark = [{ value }]
 */
export function SummaryCell({ label, value, unit, text, delta, lines = [], spark, sparkKey = "value", minH }) {
    return (
        <Cell $minH={minH}>
            <CellLabel>{label}</CellLabel>
            <CellValueRow>
                <CellValue $text={!!text}>{text || value}</CellValue>
                {!text && unit ? <CellUnit>{unit}</CellUnit> : null}
            </CellValueRow>
            {delta ? <CellLine><Delta {...delta} /></CellLine> : null}
            {lines.filter(Boolean).map((l, i) => <CellLine key={i}>{l}</CellLine>)}
            {spark && spark.length > 1 ? (
                <SparkWrap>
                    <ResponsiveContainer width="100%" height={36}>
                        <AreaChart data={spark} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                            <Area type="monotone" dataKey={sparkKey} stroke={POINT} fill={POINT} fillOpacity={0.12} strokeWidth={1.5} isAnimationActive={false} dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </SparkWrap>
            ) : null}
        </Cell>
    );
}

// ─────────────────────────── 추이 그래프 ───────────────────────────
const TipBox = styled.div`
    background: #fff; border: 1px solid ${LINE}; padding: 10px 12px; font-size: 14px; color: ${INK}; line-height: 1.6;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
`;
const TipDot = styled.i`display: inline-block; width: 9px; height: 9px; background: ${(p) => p.$c}; margin-right: 6px;`;
const LegendRow = styled.div`display: flex; align-items: center; gap: 16px; flex-wrap: wrap; font-size: 14px; color: ${INK}; padding: 0 4px 8px;`;

/**
 * 추이 그래프 — series = [{ key, label, color, type: 'bar'|'line', stackId, dashed }]
 *   money 면 세로축을 만 원 단위로 줄여 쓰고 말풍선엔 "원"을 붙인다.
 */
export function TrendChart({ data, series, height = 260, unit = "건", money = false }) {
    const fmt = (v) => (money ? won(v) : `${num(v)}${unit}`);
    // 값이 하나도 없을 때도 세로축 눈금이 사라지지 않게 기본 높이를 잡아 둔다
    const hasData = (data || []).some((row) => series.some((s) => Number(row[s.key]) > 0));
    const yDomain = hasData ? [0, "auto"] : [0, money ? 100000 : 4];
    const renderTip = ({ active, payload, label }) => {
        if (!active || !payload || !payload.length) return null;
        return (
            <TipBox>
                <div style={{ fontWeight: 600 }}>{label}</div>
                {series.map((s) => {
                    const row = payload.find((x) => x.dataKey === s.key);
                    if (!row || row.value === undefined || row.value === null) return null;
                    return <div key={s.key}><TipDot $c={s.color} />{s.label} {fmt(row.value)}</div>;
                })}
            </TipBox>
        );
    };
    return (
        <div>
            {series.length > 1 ? (
                <LegendRow>{series.map((s) => <span key={s.key}><TipDot $c={s.color} />{s.label}</span>)}</LegendRow>
            ) : null}
            <ResponsiveContainer width="100%" height={height}>
                <ComposedChart data={data} margin={{ top: 8, right: 12, left: money ? 4 : -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={LINE_SOFT} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 13, fill: INK }} axisLine={{ stroke: LINE }} tickLine={false} minTickGap={18} />
                    <YAxis domain={yDomain} tick={{ fontSize: 13, fill: INK }} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={money ? shortWon : num} />
                    <Tooltip content={renderTip} cursor={{ fill: "rgba(20,24,31,0.04)" }} />
                    {series.map((s) => (s.type === "line"
                        ? <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? "4 4" : undefined} dot={false} isAnimationActive={false} connectNulls />
                        : <Bar key={s.key} dataKey={s.key} stackId={s.stackId} fill={s.color} maxBarSize={34} isAnimationActive={false} />
                    ))}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}

/** 지금 기간 줄에 앞 기간 값을 같은 자리(순서)로 붙인다 — 그래프의 "전 기간" 선 */
export const withPrev = (cur, prev, key = "value", prevKey = "prev") =>
    cur.map((row, i) => ({ ...row, [prevKey]: prev[i] ? prev[i][key] : null }));

// ─────────────────────────── 분포 표 (막대 + 숫자) ───────────────────────────
const DTable = styled.table`width: 100%; border-collapse: collapse;`;
const DTh = styled.th`
    text-align: ${(p) => p.$align || "left"}; padding: 9px 10px; font-size: 14px; font-weight: 500; color: ${INK};
    background: ${FILL_SOFT}; border-bottom: 1px solid ${LINE}; white-space: nowrap;
`;
const DTd = styled.td`
    text-align: ${(p) => p.$align || "left"}; padding: 9px 10px; font-size: 15px; color: ${INK};
    border-bottom: 1px solid ${LINE_SOFT}; font-variant-numeric: tabular-nums; word-break: keep-all;
`;
const DName = styled(DTd)`white-space: nowrap;`;
const FoldBtn = styled.button`
    background: none; border: none; padding: 0; font: inherit; font-size: 15px; color: ${INK}; cursor: pointer;
    text-decoration: underline; text-underline-offset: 3px;
`;
const BarTrack = styled.div`height: 10px; background: ${FILL_SOFT}; min-width: 80px;`;
const BarFill = styled.div`height: 10px; background: ${POINT}; width: ${(p) => p.$w}%;`;

/**
 * 분포 표 — rows = [{ name, value, ... }], 맨 앞 번호 · 이름 · 막대 · 값 · 비율(+ 덧붙는 칸)
 *   extra = [{ head, align, render(row) }]
 */
export function DistTable({ rows, nameHead = "이름", valueHead = "건수", unit = "건", format = num, extra = [], showShare = true, foldZero = false }) {
    const [open, setOpen] = useState(false);
    const total = rows.reduce((a, r) => a + (Number(r.value) || 0), 0);
    const max = rows.reduce((a, r) => Math.max(a, Number(r.value) || 0), 0);
    // 0인 줄이 길게 늘어지지 않게 접어 두고, 누르면 펼친다
    const zeroCount = foldZero ? rows.filter((r) => !(Number(r.value) > 0)).length : 0;
    const shown = foldZero && !open ? rows.filter((r) => Number(r.value) > 0) : rows;
    const colCount = 4 + (showShare ? 1 : 0) + extra.length;
    return (
        <DTable>
            <thead>
                <tr>
                    <DTh style={{ width: 44 }}>번호</DTh>
                    <DTh>{nameHead}</DTh>
                    <DTh style={{ width: "30%" }} />
                    <DTh $align="right">{valueHead}</DTh>
                    {showShare ? <DTh $align="right">비율</DTh> : null}
                    {extra.map((c) => <DTh key={c.head} $align={c.align || "right"}>{c.head}</DTh>)}
                </tr>
            </thead>
            <tbody>
                {shown.map((r, i) => (
                    <tr key={r.name}>
                        <DTd>{i + 1}</DTd>
                        <DName>{r.name}</DName>
                        <DTd><BarTrack><BarFill $w={max > 0 ? Math.round(((Number(r.value) || 0) / max) * 100) : 0} /></BarTrack></DTd>
                        <DTd $align="right">{format(r.value)}{unit}</DTd>
                        {showShare ? <DTd $align="right">{total > 0 ? `${(((Number(r.value) || 0) / total) * 100).toFixed(1)}%` : "0.0%"}</DTd> : null}
                        {extra.map((c) => <DTd key={c.head} $align={c.align || "right"}>{c.render(r)}</DTd>)}
                    </tr>
                ))}
                {zeroCount > 0 ? (
                    <tr>
                        <DTd colSpan={colCount}>
                            <FoldBtn type="button" onClick={() => setOpen((v) => !v)}>
                                {open ? `0${unit}인 ${zeroCount}곳 접기` : `0${unit}인 ${zeroCount}곳 펼치기`}
                            </FoldBtn>
                        </DTd>
                    </tr>
                ) : null}
            </tbody>
        </DTable>
    );
}

// ─────────────────────────── 쪽 넘김 ───────────────────────────
export const PAGE_SIZE = 15;
const PagerRow = styled.div`display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 12px 20px;`;
const PagerMid = styled.div`display: flex; align-items: center; gap: 12px; font-size: 15px; color: ${INK};`;
const PagerTotal = styled.div`font-size: 15px; color: ${INK}; text-align: right;`;

/** 아래 가운데 [이전] N / M [다음] + 오른쪽 총 건수 */
export function Pager({ page, total, onChange, pageSize = PAGE_SIZE, unit = "건" }) {
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    return (
        <PagerRow>
            <span />
            <PagerMid>
                <PlainBtn type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>이전</PlainBtn>
                <span>{page} / {pageCount}</span>
                <PlainBtn type="button" disabled={page >= pageCount} onClick={() => onChange(page + 1)}>다음</PlainBtn>
            </PagerMid>
            <PagerTotal>총 {num(total)}{unit}</PagerTotal>
        </PagerRow>
    );
}
