/* eslint-disable */
/**
 * 대시보드 '신규 가입자 현황' (대표 리뷰 11/22 — PANdkh)
 *   기준 시각 · 전체 누적 / 사업자 · 프리랜서 · 일반고객 신규 인원 / 사업자 · 프리랜서의 프로필 등록 완료 수 / 기간별 추이
 *
 * 세는 기준
 *   · 회원 = 전화번호 인증까지 끝낸 회원 문서(회원 목록 화면과 같은 기준). 합쳐진 중복 계정(mergedInto) · 탈퇴 회원은 뺀다.
 *   · 테스트 계정(seed_ · 시드 표시 · PG 심사용)은 기본으로 빼고, 체크하면 포함한다.
 *   · 구분: 회원 구분(userTypes / userType)에 사업자가 있으면 사업자, 프리랜서 · 부동산중개사면 프리랜서, 일반만 있으면 일반고객.
 *           예전 값 pro → 사업자, member → 일반고객. 구분을 아직 안 고른 회원은 '구분 미선택'으로 따로 센다.
 *   · 프로필 등록 완료 = 전문분야를 하나 이상 등록한 회원(homepro_pros 에 그 회원 문서가 있거나 users.proCategories 가 있음).
 */
import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { getMemberTypes } from "../../config/homeproConfig";
import {
    usePeriod, PeriodBar, Card, CardHead, CardTitle, CardMeta, CardBody, SummaryGrid, SummaryCell, TrendChart,
    CheckToggle, SpinnerBox, INK, POINT_DARK, POINT_SOFT, TONE_GRAY, num,
    toDate, inRange, seriesOf, kstDateTime, isTestUser, isCountedUser,
} from "./statKit";

/** 'business' | 'freelancer' | 'general' | 'unset' */
export const memberBucket = (u) => {
    const types = getMemberTypes(u);
    if (types.includes("business")) return "business";
    if (types.includes("freelancer") || types.includes("broker")) return "freelancer";
    if (types.includes("general")) return "general";
    if (u.userType === "pro") return "business";
    if (u.userType === "member") return "general";
    return "unset";
};

const BUCKETS = [
    { key: "business", label: "사업자", color: POINT_DARK, profile: true },
    { key: "freelancer", label: "프리랜서", color: POINT_SOFT, profile: true },
    { key: "general", label: "일반고객", color: TONE_GRAY, profile: false },
];

const TitleRow = styled.div`display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;`;
const HeadRight = styled.div`display: flex; align-items: center; gap: 18px; flex-wrap: wrap;`;
const TotalText = styled.span`font-size: 15px; color: ${INK}; b { font-size: 21px; font-weight: 600; margin: 0 2px 0 6px; }`;
const Stack = styled.div`display: flex; flex-direction: column; gap: 14px;`;

export default function SignupStatsCard({ users, pros, loading }) {
    const { period, change, range, now } = usePeriod("today");
    const [includeTest, setIncludeTest] = useState(false);

    const proUids = useMemo(() => new Set((pros || []).map((p) => p.uid).filter(Boolean)), [pros]);
    const members = useMemo(
        () => (users || []).filter((u) => isCountedUser(u) && (includeTest || !isTestUser(u)) && toDate(u.createdAt)),
        [users, includeTest],
    );
    const joinedAt = (u) => toDate(u.createdAt);
    const profileDone = (u) => proUids.has(u.id) || (Array.isArray(u.proCategories) && u.proCategories.length > 0);

    const view = useMemo(() => {
        const cur = inRange(members, joinedAt, range.start, range.end);
        const prev = inRange(members, joinedAt, range.prevStart, range.prevEnd);
        const by = (list, key) => list.filter((u) => memberBucket(u) === key);
        const cells = BUCKETS.map((b) => {
            const c = by(cur, b.key); const all = by(members, b.key);
            return {
                ...b,
                cur: c.length, prev: by(prev, b.key).length,
                curDone: b.profile ? c.filter(profileDone).length : null,
                total: all.length,
                totalDone: b.profile ? all.filter(profileDone).length : null,
            };
        });
        const fields = { value: () => 1 };
        BUCKETS.forEach((b) => { fields[b.key] = (u) => (memberBucket(u) === b.key ? 1 : 0); });
        fields.unset = (u) => (memberBucket(u) === "unset" ? 1 : 0);
        return {
            curTotal: cur.length, prevTotal: prev.length,
            unsetCur: by(cur, "unset").length, unsetAll: by(members, "unset").length,
            cells,
            series: seriesOf(range.start, range.end, range.unit, cur, joinedAt, fields),
        };
    }, [members, range, proUids]);

    const chartSeries = [
        ...BUCKETS.map((b) => ({ key: b.key, label: b.label, color: b.color, stackId: "t" })),
        ...(view.unsetCur > 0 ? [{ key: "unset", label: "구분 미선택", color: "#dfe3e9", stackId: "t" }] : []),
    ];
    const unitLabel = range.unit === "hour" ? "시간별" : range.unit === "day" ? "날짜별" : range.unit === "week" ? "주별" : "월별";

    return (
        <Card>
            <CardHead>
                <TitleRow>
                    <CardTitle>신규 가입자 현황</CardTitle>
                    <CardMeta>{kstDateTime(now)} 기준</CardMeta>
                </TitleRow>
                <HeadRight>
                    <CheckToggle><input type="checkbox" checked={includeTest} onChange={(e) => setIncludeTest(e.target.checked)} />테스트 계정 포함</CheckToggle>
                    <TotalText>전체 누적<b>{num(members.length)}</b>명</TotalText>
                </HeadRight>
            </CardHead>
            <CardBody>
                <Stack>
                    <PeriodBar period={period} onChange={change} range={range} now={now} />
                    {loading ? <SpinnerBox height={420} /> : (
                        <>
                            <SummaryGrid $cols={4}>
                                <SummaryCell
                                    label="신규 가입 합계" value={num(view.curTotal)} unit="명"
                                    delta={{ cur: view.curTotal, prev: view.prevTotal, unit: "명", prevLabel: range.prevLabel }}
                                    lines={[
                                        view.unsetCur > 0 ? `구분 미선택 ${num(view.unsetCur)}명 포함` : null,
                                        `누적 ${num(members.length)}명${view.unsetAll > 0 ? ` (구분 미선택 ${num(view.unsetAll)}명 포함)` : ""}`,
                                    ]}
                                    spark={view.series}
                                />
                                {view.cells.map((c) => (
                                    <SummaryCell
                                        key={c.key} label={c.label} value={num(c.cur)} unit="명"
                                        delta={{ cur: c.cur, prev: c.prev, unit: "명", prevLabel: range.prevLabel }}
                                        lines={[
                                            c.profile ? `프로필 등록 완료 ${num(c.curDone)}명 · 미완료 ${num(c.cur - c.curDone)}명` : null,
                                            c.profile ? `누적 ${num(c.total)}명 (등록 완료 ${num(c.totalDone)}명)` : `누적 ${num(c.total)}명`,
                                        ]}
                                    />
                                ))}
                            </SummaryGrid>
                            <div>
                                <CardMeta>{unitLabel} 가입 추이</CardMeta>
                                <TrendChart data={view.series} series={chartSeries} unit="명" height={240} />
                            </div>
                        </>
                    )}
                </Stack>
            </CardBody>
        </Card>
    );
}
