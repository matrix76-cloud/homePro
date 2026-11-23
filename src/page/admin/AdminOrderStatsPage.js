/* eslint-disable */
/**
 * 관리자 — 오더 등록 통계 (대표 리뷰 11/22 — atXyAy)
 *   카테고리별 · 시도별 오더 등록 건수를 당일 / 1주일 / 1개월 / 분기 / 6개월 / 1년 / 직접 설정으로 본다.
 *   기간 규칙은 statPeriod.js (세 통계 화면 공통, 한국 시간).
 *
 * 세는 기준
 *   · 등록 건수 = 그 기간에 접수(등록)된 오더. 뒤에 취소 · 대기로 바뀐 오더도 등록은 등록으로 센다.
 *   · 테스트 오더(시드 · 테스트 · PG 심사용)와 셀프 등록 오더(본인 기록용)는 기본으로 빼고, 체크하면 포함한다.
 *   · 지역 = 오더 주소의 시 · 도(17개). 주소가 없으면 '지역 미상'.
 */
import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { CATEGORIES, CATEGORY_GROUPS } from "../../config/homeproConfig";
import {
    usePeriod, PeriodBar, useDocsSince, StatPage, PageHead, PageTitle, HeadRight, Card, CardHead, CardTitle, CardMeta, CardBody, TwoCol,
    SummaryGrid, SummaryCell, TrendChart, withPrev, DistTable, CheckToggle, PlainBtn, SpinnerBox, ErrorNote, EmptyNote,
    INK, LINE, LINE_SOFT, FILL_SOFT, POINT, TONE_GRAY, num,
    toDate, inRange, seriesOf, tally, sidoOfOrder, SIDO_17, isTestOrder,
} from "../../components/admin/statKit";

// 오더를 받는 카테고리만(전문분야 등록 전용인 공동중개는 뺀다), 화면 표기 순서 그대로
const ORDER_CAT_IDS = new Set(CATEGORY_GROUPS.flatMap((g) => g.categoryIds));
const ORDER_CATS = CATEGORIES.filter((c) => ORDER_CAT_IDS.has(c.id));
const CAT_NAME = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.name]));
const CAT_NAMES = ORDER_CATS.map((c) => c.name);
const CAT_UNKNOWN = "분류 없음";

const catOf = (o) => CAT_NAME[o.categoryId] || o.categoryName || CAT_UNKNOWN;
const createdOf = (o) => toDate(o.createdAt);
const UNIT_LABEL = { hour: "시간별", day: "날짜별", week: "주별", month: "월별" };

const MatrixWrap = styled.div`overflow-x: auto;`;
const MTable = styled.table`border-collapse: collapse; width: 100%;`;
const MTh = styled.th`
    padding: 9px 8px; font-size: 14px; font-weight: 500; color: ${INK}; background: ${FILL_SOFT};
    border-bottom: 1px solid ${LINE}; border-left: 1px solid ${LINE_SOFT}; white-space: nowrap; text-align: center;
    &:first-child { text-align: left; border-left: none; position: sticky; left: 0; z-index: 1; padding-left: 12px; }
`;
const MTd = styled.td`
    padding: 9px 8px; font-size: 15px; color: ${INK}; text-align: center; font-variant-numeric: tabular-nums;
    border-bottom: 1px solid ${LINE_SOFT}; border-left: 1px solid ${LINE_SOFT}; min-width: 48px;
    background: ${(p) => (p.$heat > 0 ? `rgba(0, 150, 63, ${(0.06 + p.$heat * 0.3).toFixed(3)})` : "#fff")};
    font-weight: ${(p) => (p.$sum ? 600 : 400)};
`;
const MName = styled.td`
    padding: 9px 12px; font-size: 15px; color: ${INK}; white-space: nowrap; background: #fff;
    border-bottom: 1px solid ${LINE_SOFT}; position: sticky; left: 0; z-index: 1;
`;

export default function AdminOrderStatsPage() {
    const { period, change, range, now, refresh } = usePeriod("month");
    const [includeTest, setIncludeTest] = useState(false);
    const [includeSelf, setIncludeSelf] = useState(false);
    const [showZero, setShowZero] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    // 비교 기간 맨 앞부터만 읽는다 (더 앞이 필요해지면 그때 다시 읽음)
    const { rows, loading, error } = useDocsSince("homepro_orders", "createdAt", range.prevStart, reloadKey);

    const orders = useMemo(
        () => rows.filter((o) => (includeTest || !isTestOrder(o)) && (includeSelf || !o.selfOrder)),
        [rows, includeTest, includeSelf],
    );

    const view = useMemo(() => {
        const cur = inRange(orders, createdOf, range.start, range.end);
        const prev = inRange(orders, createdOf, range.prevStart, range.prevEnd);
        const series = seriesOf(range.start, range.end, range.unit, cur, createdOf);
        const prevSeries = seriesOf(range.prevStart, range.prevEnd, range.unit, prev, createdOf);

        const byCat = tally(cur, catOf, CAT_NAMES);
        const bySido = tally(cur, sidoOfOrder, SIDO_17);
        const prevCat = new Map(tally(prev, catOf, CAT_NAMES).map((r) => [r.name, r.value]));
        const prevSido = new Map(tally(prev, sidoOfOrder, SIDO_17).map((r) => [r.name, r.value]));

        // 카테고리 × 시도
        const cell = new Map();
        for (const o of cur) { const k = `${catOf(o)}|${sidoOfOrder(o)}`; cell.set(k, (cell.get(k) || 0) + 1); }
        const maxCell = [...cell.values()].reduce((a, v) => Math.max(a, v), 0);

        // 하루뿐인 기간이면 '하루 평균' 대신 앞날 하루 전체 건수를 보여 준다
        const prevFullDay = inRange(orders, createdOf, range.prevStart, range.start).length;

        return {
            total: cur.length, prevTotal: prev.length,
            series, chart: withPrev(series, prevSeries),
            byCat, bySido, prevCat, prevSido, cell, maxCell, prevFullDay,
            topCat: byCat[0] && byCat[0].value > 0 ? byCat[0] : null,
            topSido: bySido[0] && bySido[0].value > 0 ? bySido[0] : null,
        };
    }, [orders, range]);

    const share = (v) => (view.total > 0 ? `${((v / view.total) * 100).toFixed(1)}%` : "0.0%");
    const diffText = (cur, prev) => { const d = cur - (prev || 0); return d === 0 ? "0" : `${d > 0 ? "+" : ""}${num(d)}`; };

    // 줄 = 카테고리(0건을 같이 볼 땐 화면 표기 순서, 아니면 많은 순), 칸 = 시 · 도(늘 정해진 순서)
    const catOrder = (name) => { const i = CAT_NAMES.indexOf(name); return i < 0 ? 99 : i; };
    const matrixRows = (showZero ? view.byCat.map((r) => r.name).sort((a, b) => catOrder(a) - catOrder(b)) : view.byCat.filter((r) => r.value > 0).map((r) => r.name));
    const sidoOrder = (name) => { const i = SIDO_17.indexOf(name); return i < 0 ? 99 : i; };
    const matrixCols = (showZero ? view.bySido : view.bySido.filter((r) => r.value > 0)).map((r) => r.name).sort((a, b) => sidoOrder(a) - sidoOrder(b));
    const catTotal = new Map(view.byCat.map((r) => [r.name, r.value]));
    const sidoTotal = new Map(view.bySido.map((r) => [r.name, r.value]));

    const reload = () => { refresh(); setReloadKey((k) => k + 1); };

    return (
        <StatPage>
            <PageHead>
                <PageTitle>오더 등록 통계</PageTitle>
                <HeadRight>
                    <CheckToggle><input type="checkbox" checked={includeTest} onChange={(e) => setIncludeTest(e.target.checked)} />테스트 오더 포함</CheckToggle>
                    <CheckToggle><input type="checkbox" checked={includeSelf} onChange={(e) => setIncludeSelf(e.target.checked)} />셀프 등록 오더 포함</CheckToggle>
                    <PlainBtn type="button" onClick={reload}>새로고침</PlainBtn>
                </HeadRight>
            </PageHead>

            <PeriodBar period={period} onChange={change} range={range} now={now} />
            {error ? <ErrorNote>오더를 불러오지 못했습니다 — {error}</ErrorNote> : null}

            {loading ? <Card><SpinnerBox height={520} /></Card> : (
                <>
                    <SummaryGrid $cols={4}>
                        <SummaryCell
                            label="등록 건수" value={num(view.total)} unit="건"
                            delta={{ cur: view.total, prev: view.prevTotal, unit: "건", prevLabel: range.prevLabel }}
                            spark={view.series}
                        />
                        {range.days <= 1 ? (
                            <SummaryCell label="전일 하루 전체" value={num(view.prevFullDay)} unit="건" lines={["전일 0시 ~ 24시 등록 건수"]} />
                        ) : (
                            <SummaryCell
                                label="하루 평균" value={(view.total / range.days).toFixed(1)} unit="건"
                                lines={[`${range.prevLabel} 하루 평균 ${(view.prevTotal / range.days).toFixed(1)}건`]}
                            />
                        )}
                        <SummaryCell
                            label="가장 많은 카테고리" text={view.topCat ? view.topCat.name : "없음"}
                            lines={[view.topCat ? `${num(view.topCat.value)}건 · ${share(view.topCat.value)}` : null]}
                        />
                        <SummaryCell
                            label="가장 많은 시 · 도" text={view.topSido ? view.topSido.name : "없음"}
                            lines={[view.topSido ? `${num(view.topSido.value)}건 · ${share(view.topSido.value)}` : null]}
                        />
                    </SummaryGrid>

                    <Card>
                        <CardHead>
                            <CardTitle>{UNIT_LABEL[range.unit]} 등록 추이</CardTitle>
                            <CardMeta>{range.label}</CardMeta>
                        </CardHead>
                        <CardBody>
                            <TrendChart
                                data={view.chart} unit="건" height={280}
                                series={[
                                    { key: "value", label: "이번 기간", color: POINT },
                                    { key: "prev", label: range.prevLabel, color: TONE_GRAY, type: "line", dashed: true },
                                ]}
                            />
                        </CardBody>
                    </Card>

                    <TwoCol>
                        <Card>
                            <CardHead><CardTitle>카테고리별 등록 건수</CardTitle><CardMeta>합계 {num(view.total)}건</CardMeta></CardHead>
                            <CardBody>
                                <DistTable
                                    rows={view.byCat} nameHead="카테고리" foldZero
                                    extra={[{ head: "전 기간 대비", render: (r) => diffText(r.value, view.prevCat.get(r.name)) }]}
                                />
                            </CardBody>
                        </Card>
                        <Card>
                            <CardHead><CardTitle>시 · 도별 등록 건수</CardTitle><CardMeta>합계 {num(view.total)}건</CardMeta></CardHead>
                            <CardBody>
                                <DistTable
                                    rows={view.bySido} nameHead="시 · 도" foldZero
                                    extra={[{ head: "전 기간 대비", render: (r) => diffText(r.value, view.prevSido.get(r.name)) }]}
                                />
                            </CardBody>
                        </Card>
                    </TwoCol>

                    <Card>
                        <CardHead>
                            <CardTitle>카테고리 × 시 · 도</CardTitle>
                            <CheckToggle><input type="checkbox" checked={showZero} onChange={(e) => setShowZero(e.target.checked)} />0건인 줄 · 칸도 보기</CheckToggle>
                        </CardHead>
                        {matrixRows.length === 0 || matrixCols.length === 0 ? <EmptyNote>이 기간에 등록된 오더가 없습니다</EmptyNote> : (
                            <MatrixWrap>
                                <MTable>
                                    <thead>
                                        <tr>
                                            <MTh>카테고리</MTh>
                                            {matrixCols.map((s) => <MTh key={s}>{s}</MTh>)}
                                            <MTh>합계</MTh>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {matrixRows.map((c) => (
                                            <tr key={c}>
                                                <MName>{c}</MName>
                                                {matrixCols.map((s) => {
                                                    const v = view.cell.get(`${c}|${s}`) || 0;
                                                    return <MTd key={s} $heat={view.maxCell > 0 ? v / view.maxCell : 0}>{v > 0 ? num(v) : ""}</MTd>;
                                                })}
                                                <MTd $sum>{num(catTotal.get(c) || 0)}</MTd>
                                            </tr>
                                        ))}
                                        <tr>
                                            <MName style={{ fontWeight: 600 }}>합계</MName>
                                            {matrixCols.map((s) => <MTd key={s} $sum>{num(sidoTotal.get(s) || 0)}</MTd>)}
                                            <MTd $sum>{num(view.total)}</MTd>
                                        </tr>
                                    </tbody>
                                </MTable>
                            </MatrixWrap>
                        )}
                    </Card>
                </>
            )}
        </StatPage>
    );
}
