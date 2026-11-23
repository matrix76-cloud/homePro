/* eslint-disable */
/**
 * 관리자 — 구독 매출 통계 (대표 리뷰 11/22 — Wdh6kK)
 *
 * 무엇을 '구독'으로 세나 — payments 컬렉션에서 다달이 나가는 두 가지만
 *   · subscription       앱 월 구독 (users.subscription — 0차수 이용권, 자동결제 또는 단건)
 *   · insurance_monthly  월 구독형 보험 (insurance_policies type=monthly — 업종 그룹 A~D)
 *   1년 단체보험 · 건당 보험 · 시공대금 결제 링크는 구독이 아니라 여기서 뺀다(전체는 'PG 결제 내역'에 있다).
 *
 * 금액 세는 법
 *   · 결제 성공액 = 승인된 결제(done, 뒤에 환불된 것 포함)를 승인된 날에 더한다.
 *   · 환불 · 취소액 = 환불된 결제(status refund)를 환불한 날에 따로 더한다 → 순매출 = 성공액 − 환불액.
 *     (같은 날 결제 · 취소면 그날 순매출에서 빠지고, 앞서 결제한 것을 오늘 환불하면 오늘 환불액으로 잡힌다)
 *     ※ 환불 처리 기능은 아직 없다 — 환불 기록이 한 건도 없으면 환불 칸은 화면에 내지 않는다.
 *   · 결제 대기(ready — 결제창만 열고 끝낸 것)는 합계에서 뺀다. 원장에는 보인다.
 *   · 테스트 계정(seed_ · PG 심사용) 결제는 기본으로 빼고, 체크하면 포함한다.
 * 기간 규칙은 statPeriod.js (세 통계 화면 공통, 한국 시간).
 */
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { collection, getDocs, query, where } from "firebase/firestore";
import { IoCloseOutline } from "react-icons/io5";
import { db } from "../../api/config";
import { CATEGORIES, memberTypesLabel } from "../../config/homeproConfig";
import { TOSS_METHOD_LABEL } from "../../utility/tossConfig";
import {
    SummaryTable, TableWrap, Table, Th, Td, Tr, Status, Select, Input, FilterRow, FilterLabel,
    Overlay, Modal, ModalHead, ModalTitle, ModalClose, ModalBody, Fields,
} from "../insurance-admin/insAdminUi";
import {
    usePeriod, PeriodBar, useDocsSince, useAllDocs, StatPage, PageHead, PageTitle, HeadRight, Card, CardHead, CardTitle, CardMeta, CardBody, TwoCol,
    SummaryGrid, SummaryCell, TrendChart, withPrev, DistTable, Pager, PAGE_SIZE, CheckToggle, PlainBtn, SpinnerBox, ErrorNote, EmptyNote,
    INK, LINE, LINE_SOFT, POINT, POINT_DARK, TONE_GRAY, DOWN, num, won,
    toDate, inRange, seriesOf, resolveRange, defaultPeriod, kstDate, kstParts, kstDateTime, kstYmdDots,
    sidoOfUser, SIDO_17, isTestUid, isTestUser, isCountedUser,
} from "../../components/admin/statKit";
import { memberBucket } from "../../components/admin/SignupStatsCard";

const SUB_PURPOSES = ["subscription", "insurance_monthly"];
const PRODUCT_LABEL = { subscription: "앱 월 구독", insurance_monthly: "월 구독형 보험" };
const PAY_STATUS = { done: "결제완료", fail: "결제실패", refund: "환불완료", ready: "결제 대기" };
const STATUS_COLOR = { done: POINT_DARK, fail: DOWN, refund: "#b45309", ready: INK };
const CAT_NAME = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.name]));
const BUCKET_LABEL = { business: "사업자", freelancer: "프리랜서", general: "일반고객", unset: "구분 미선택" };
const UNIT_LABEL = { hour: "시간별", day: "날짜별", week: "주별", month: "월별" };

const amountOf = (p) => Number(p.amount) || 0;
const createdOf = (p) => toDate(p.createdAt);
/** 승인된 시각(없으면 만든 시각) */
const paidAt = (p) => toDate(p.approvedAt) || toDate(p.createdAt);
/** 환불한 시각 — 환불 기록에 남은 시각 중 있는 것 */
const refundedAt = (p) => toDate(p.refundedAt) || toDate(p.canceledAt) || toDate(p.updatedAt);
const refundAmountOf = (p) => Number(p.refundAmount ?? p.cancelAmount ?? p.amount) || 0;
const isPaid = (p) => p.status === "done" || p.status === "refund";
/** 원장에 적는 날짜 — 승인된 결제는 승인 시각, 나머지는 만든 시각 */
const rowDate = (p) => (isPaid(p) ? paidAt(p) : createdOf(p));
const sum = (rows, f = amountOf) => rows.reduce((a, r) => a + f(r), 0);
const ymd = (v) => { const d = toDate(v); return d ? kstYmdDots(d) : ""; };
const userName = (u) => (u ? (u.companyName || u.name || u.nickname || "") : "");
/** "+821012345678" · "01012345678" → "010-1234-5678" (모양이 다르면 적힌 그대로) */
const fmtPhone = (v) => {
    const digits = String(v || "").replace(/^\+82/, "0").replace(/[^0-9]/g, "");
    return /^01\d{8,9}$/.test(digits) ? digits.replace(/^(\d{3})(\d{3,4})(\d{4})$/, "$1-$2-$3") : String(v || "");
};
const userPhone = (u) => (u ? fmtPhone(u.phone || u.phoneNumber || u.phoneE164 || "") : "");

const methodText = (p) => {
    if (p.method === "points") return "H-포인트";
    const base = p.method === "billing" ? "카드 자동결제" : (TOSS_METHOD_LABEL[p.tossMethod] || p.tossMethod || "카드");
    const pts = Number(p.meta?.pointsUsed || 0);
    return pts > 0 ? `${base} + H-포인트 ${num(pts)}P` : base;
};

const NameBtn = styled.button`
    background: none; border: none; padding: 0; font: inherit; font-size: 15px; color: ${INK};
    text-decoration: underline; text-underline-offset: 3px; cursor: pointer; text-align: left;
`;
const KeyText = styled.div`font-family: monospace; font-size: 13px; color: ${INK}; word-break: break-all; white-space: normal; width: 190px;`;
const ModalTabs = styled.div`display: inline-flex; border: 1px solid ${LINE}; margin-bottom: 16px;`;
const ModalTab = styled.button`
    height: 38px; padding: 0 18px; border: none; border-left: 1px solid ${LINE}; font: inherit; font-size: 15px; cursor: pointer; color: ${INK};
    background: ${(p) => (p.$on ? LINE_SOFT : "#fff")}; font-weight: ${(p) => (p.$on ? 600 : 400)};
    &:first-child { border-left: none; }
`;
const SubTitle = styled.div`font-size: 15px; font-weight: 600; color: ${INK}; margin: 18px 0 8px; &:first-child { margin-top: 0; }`;

export default function AdminSubscriptionStatsPage() {
    const { period, change, range, now, refresh } = usePeriod("month");
    const [includeTest, setIncludeTest] = useState(false);
    const [product, setProduct] = useState("all");
    const [status, setStatus] = useState("all");
    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);
    const [member, setMember] = useState(null); // 회원 창에 띄운 uid
    const [memberTab, setMemberTab] = useState("info");

    // 요약 칸(당일 · 당월)은 고른 기간과 상관없이 늘 보여 준다
    const todayRange = useMemo(() => resolveRange(defaultPeriod("today"), now), [now]);
    const monthRange = useMemo(() => resolveRange({ ...defaultPeriod("month"), monthMode: "calendar" }, now), [now]);

    // 결제는 필요한 가장 앞 날짜부터만 읽는다 (고른 기간의 비교 기간 · 전월 1일 중 더 앞)
    const since = useMemo(() => {
        const p = kstParts(now);
        const lastMonth = kstDate(p.y, p.m - 1, 1);
        return range.prevStart < lastMonth ? range.prevStart : lastMonth;
    }, [range.prevStart, now]);
    const paysQ = useDocsSince("payments", "createdAt", since, reloadKey);
    const usersQ = useAllDocs("users", reloadKey);
    const prosQ = useAllDocs("homepro_pros", reloadKey);
    const policiesQ = useAllDocs("insurance_policies", reloadKey);

    // 환불 기록은 결제한 날이 아무리 오래됐어도 환불한 날에 잡아야 하므로 따로 읽는다
    const [refundRows, setRefundRows] = useState([]);
    useEffect(() => {
        let alive = true;
        getDocs(query(collection(db, "payments"), where("status", "==", "refund")))
            .then((snap) => { if (alive) setRefundRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); })
            .catch((e) => { console.error("환불 기록 불러오기 실패:", e); });
        return () => { alive = false; };
    }, [reloadKey]);

    const loading = paysQ.loading || usersQ.loading || prosQ.loading || policiesQ.loading;
    const error = paysQ.error || usersQ.error || prosQ.error || policiesQ.error;

    const userMap = useMemo(() => new Map(usersQ.rows.map((u) => [u.id, u])), [usersQ.rows]);
    const policyMap = useMemo(() => new Map(policiesQ.rows.map((p) => [p.id, p])), [policiesQ.rows]);
    const isTestPay = (p) => isTestUid(p.uid) || isTestUser(userMap.get(p.uid)) || p._isSeed === true;

    /** "앱 월 구독 1개월" · "월 구독형 보험 B그룹" */
    const planLabel = (p) => {
        if (p.purpose === "subscription") return `앱 월 구독 ${Number(p.meta?.months) || 1}개월`;
        const g = policyMap.get(p.meta?.policyId)?.group;
        return g ? `월 구독형 보험 ${g}그룹` : "월 구독형 보험";
    };

    // 구독 결제만 — 기간 읽기 + 환불 기록을 합치고, 테스트 · 상품 조건으로 거른다
    const pays = useMemo(() => {
        const byId = new Map();
        for (const p of paysQ.rows) byId.set(p.id, p);
        for (const p of refundRows) byId.set(p.id, p);
        return [...byId.values()].filter((p) => SUB_PURPOSES.includes(p.purpose)
            && (includeTest || !isTestPay(p))
            && (product === "all" || p.purpose === product));
    }, [paysQ.rows, refundRows, includeTest, product, userMap]);

    const paid = useMemo(() => pays.filter(isPaid), [pays]);
    const refunds = useMemo(() => pays.filter((p) => p.status === "refund"), [pays]);
    const fails = useMemo(() => pays.filter((p) => p.status === "fail"), [pays]);
    const hasRefund = refunds.length > 0;

    /** 범위 안 순매출 · 성공 · 환불 */
    const money = (start, end) => {
        const ok = inRange(paid, paidAt, start, end);
        const rf = inRange(refunds, refundedAt, start, end);
        const okSum = sum(ok); const rfSum = sum(rf, refundAmountOf);
        return { ok, rf, okSum, rfSum, net: okSum - rfSum };
    };

    // ── 요약: 당일 · 당월 ──
    const top = useMemo(() => {
        const t = money(todayRange.start, todayRange.end); const tp = money(todayRange.prevStart, todayRange.prevEnd);
        const m = money(monthRange.start, monthRange.end); const mp = money(monthRange.prevStart, monthRange.prevEnd);
        const monthSeries = seriesOf(monthRange.start, monthRange.end, "day", m.ok, paidAt, { value: amountOf });
        return { t, tp, m, mp, monthSeries };
    }, [paid, refunds, todayRange, monthRange]);

    // ── 지금 구독 상태 (회원 · 보험 문서의 현재 값) ──
    const subs = useMemo(() => {
        const nowMs = now.getTime();
        const app = usersQ.rows.filter((u) => {
            const s = u.subscription;
            if (!s || s.status !== "active") return false;
            const end = toDate(s.endAt);
            return (!end || end.getTime() > nowMs) && (includeTest || !isTestUser(u));
        });
        const ins = policiesQ.rows.filter((p) => {
            if (p.type !== "monthly" || p.status !== "active") return false;
            return includeTest || !(isTestUid(p.uid) || isTestUser(userMap.get(p.uid)));
        });
        const useApp = product === "all" || product === "subscription";
        const useIns = product === "all" || product === "insurance_monthly";
        const appList = useApp ? app : [];
        const insList = useIns ? ins : [];
        const appAuto = appList.filter((u) => u.subscription.autoRenew === true);
        const appCancel = appList.filter((u) => u.subscription.autoRenew !== true && u.subscription.autoRenewCanceledAt);
        const appFail = appAuto.filter((u) => Number(u.subscription.billing?.failCount) > 0);
        const insAuto = insList.filter((p) => p.autoRenew !== false);
        const insCancel = insList.filter((p) => p.autoRenew === false);
        const insFail = insAuto.filter((p) => Number(p.billing?.failCount) > 0);
        const uids = new Set([...appList.map((u) => u.id), ...insList.map((p) => p.uid)]);
        return {
            appList, insList, uids,
            auto: appAuto.length + insAuto.length,
            cancel: appCancel.length + insCancel.length,
            oneOff: appList.length - appAuto.length - appCancel.length,
            fail: appFail.length + insFail.length,
        };
    }, [usersQ.rows, policiesQ.rows, userMap, includeTest, product, now]);

    // ── 고른 기간 ──
    const view = useMemo(() => {
        const cur = money(range.start, range.end);
        const prev = money(range.prevStart, range.prevEnd);
        const failCur = inRange(fails, createdOf, range.start, range.end);
        const series = seriesOf(range.start, range.end, range.unit, cur.ok, paidAt, { ok: amountOf });
        const rfSeries = seriesOf(range.start, range.end, range.unit, cur.rf, refundedAt, { refund: refundAmountOf });
        const prevSeries = seriesOf(range.prevStart, range.prevEnd, range.unit, prev.ok, paidAt, { ok: amountOf });
        const chart = withPrev(series, prevSeries, "ok").map((row, i) => ({ ...row, refund: rfSeries[i]?.refund || 0, net: row.ok - (rfSeries[i]?.refund || 0) }));

        // 상품 · 요금제별
        const planMap = new Map();
        for (const p of cur.ok) {
            const k = planLabel(p);
            const o = planMap.get(k) || { name: k, value: 0, count: 0 };
            o.value += amountOf(p); o.count += 1; planMap.set(k, o);
        }
        const plans = [...planMap.values()].sort((a, b) => b.value - a.value);

        // 기간 중 해지 예약 · 끝난 구독 (회원 · 보험 문서에 남은 시각으로)
        const inR = (v) => { const d = toDate(v); return d && d >= range.start && d < range.end; };
        const useApp = product === "all" || product === "subscription";
        const useIns = product === "all" || product === "insurance_monthly";
        const okUser = (u) => includeTest || !isTestUser(u);
        const okPol = (p) => includeTest || !(isTestUid(p.uid) || isTestUser(userMap.get(p.uid)));
        const appUsers = useApp ? usersQ.rows.filter((u) => u.subscription && okUser(u)) : [];
        const insPols = useIns ? policiesQ.rows.filter((p) => p.type === "monthly" && okPol(p)) : [];
        const cancelBooked = appUsers.filter((u) => inR(u.subscription.autoRenewCanceledAt)).length + insPols.filter((p) => inR(p.autoRenewCanceledAt)).length;
        const endedByFail = appUsers.filter((u) => Number(u.subscription.billing?.failCount) >= 3 && inR(u.subscription.billing?.lastFailAt)).length
            + insPols.filter((p) => p.expiredReason === "billing_failed" && inR(p.expiredAt)).length;
        const expired = appUsers.filter((u) => u.subscription.status === "expired" && inR(u.subscription.expiredAt)).length
            + insPols.filter((p) => p.status === "expired" && p.expiredReason !== "billing_failed" && inR(p.expiredAt)).length;

        // 신규 결제 / 자동 갱신 결제 (갱신 결제는 서버가 renewal 표시를 남긴다)
        const renewCount = cur.ok.filter((p) => p.renewal === true).length;
        const newCount = cur.ok.length - renewCount;

        return { cur, prev, failCur, chart, plans, cancelBooked, endedByFail, expired, newCount, renewCount };
    }, [paid, refunds, fails, range, usersQ.rows, policiesQ.rows, userMap, includeTest, product]);

    // ── 지역 · 카테고리별 구독 분포 (지금 구독 중인 회원 기준) ──
    const dist = useMemo(() => {
        const base = usersQ.rows.filter((u) => isCountedUser(u) && (includeTest || !isTestUser(u)));
        const targets = base.filter((u) => ["business", "freelancer"].includes(memberBucket(u)));
        const targetIds = new Set(targets.map((u) => u.id));
        const sidoRows = new Map();
        for (const u of targets) {
            const k = sidoOfUser(u);
            const o = sidoRows.get(k) || { name: k, target: 0, value: 0 };
            o.target += 1; if (subs.uids.has(u.id)) o.value += 1; sidoRows.set(k, o);
        }
        const sidoIdx = (n) => { const i = SIDO_17.indexOf(n); return i < 0 ? 99 : i; };
        const bySido = [...sidoRows.values()].sort((a, b) => b.value - a.value || b.target - a.target || sidoIdx(a.name) - sidoIdx(b.name));

        // 카테고리 — 그 분야를 등록한 회원 수(한 회원이 여러 분야면 분야마다 한 번씩)
        const catUsers = new Map();
        for (const p of prosQ.rows) {
            if (!p.uid || !targetIds.has(p.uid)) continue;
            const k = CAT_NAME[p.categoryId] || p.categoryId || "분류 없음";
            if (!catUsers.has(k)) catUsers.set(k, new Set());
            catUsers.get(k).add(p.uid);
        }
        const byCat = [...catUsers.entries()].map(([name, set]) => ({ name, target: set.size, value: [...set].filter((id) => subs.uids.has(id)).length }))
            .sort((a, b) => b.value - a.value || b.target - a.target);
        return { bySido, byCat, targetCount: targets.length };
    }, [usersQ.rows, prosQ.rows, subs.uids, includeTest]);

    // ── 결제 원장 ──
    const ledger = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return pays
            .filter((p) => { const d = rowDate(p); return d && d >= range.start && d < range.end; })
            .filter((p) => status === "all" || p.status === status)
            .filter((p) => {
                if (!needle) return true;
                const u = userMap.get(p.uid);
                return `${userName(u)} ${u?.name || ""} ${u?.nickname || ""} ${userPhone(u)} ${p.tossOrderId || p.id} ${p.paymentKey || ""}`.toLowerCase().includes(needle);
            })
            .sort((a, b) => rowDate(b) - rowDate(a));
    }, [pays, range, status, q, userMap]);
    useEffect(() => { setPage(1); }, [range.start, range.end, status, q, product, includeTest]);
    const pageRows = ledger.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const reload = () => { refresh(); setReloadKey((k) => k + 1); };
    const openMember = (uid) => { setMember(uid); setMemberTab("info"); };
    const rate = (r) => (r.target > 0 ? `${((r.value / r.target) * 100).toFixed(1)}%` : "0.0%");

    const chartSeries = [
        { key: "ok", label: "결제 성공액", color: POINT },
        ...(hasRefund ? [{ key: "refund", label: "환불 · 취소액", color: TONE_GRAY }, { key: "net", label: "순매출", color: POINT_DARK, type: "line" }] : []),
        { key: "prev", label: `${range.prevLabel} 성공액`, color: TONE_GRAY, type: "line", dashed: true },
    ];

    // ── 회원 창 ──
    const mUser = member ? userMap.get(member) : null;
    const mPays = member ? pays.filter((p) => p.uid === member).sort((a, b) => rowDate(b) - rowDate(a)) : [];
    const mPolicies = member ? policiesQ.rows.filter((p) => p.uid === member && p.type === "monthly") : [];
    const mCats = member ? [...new Set(prosQ.rows.filter((p) => p.uid === member).map((p) => CAT_NAME[p.categoryId] || p.categoryId))] : [];
    const mSub = mUser?.subscription || null;
    const renewText = (autoRenew, canceledAt, strict) => {
        if (strict ? autoRenew === true : autoRenew !== false) return "자동 연장 중";
        if (canceledAt) return `해지 예약 (${ymd(canceledAt)} 신청)`;
        return "자동 연장 없음";
    };

    return (
        <StatPage>
            <PageHead>
                <PageTitle>구독 매출 통계</PageTitle>
                <HeadRight>
                    <FilterLabel>상품</FilterLabel>
                    <Select value={product} onChange={(e) => setProduct(e.target.value)}>
                        <option value="all">전체</option>
                        {SUB_PURPOSES.map((k) => <option key={k} value={k}>{PRODUCT_LABEL[k]}</option>)}
                    </Select>
                    <CheckToggle><input type="checkbox" checked={includeTest} onChange={(e) => setIncludeTest(e.target.checked)} />테스트 계정 결제 포함</CheckToggle>
                    <PlainBtn type="button" onClick={reload}>새로고침</PlainBtn>
                </HeadRight>
            </PageHead>
            {error ? <ErrorNote>자료를 불러오지 못했습니다 — {error}</ErrorNote> : null}

            {loading ? <Card><SpinnerBox height={560} /></Card> : (
                <>
                    {/* 늘 보이는 요약 — 당일 · 당월 · 지금 구독 상태 */}
                    <SummaryGrid $cols={4}>
                        <SummaryCell
                            label="당일 구독 매출" value={num(top.t.net)} unit="원"
                            delta={{ cur: top.t.net, prev: top.tp.net, unit: "원", prevLabel: "전일 같은 시각" }}
                            lines={[`결제 성공 ${num(top.t.ok.length)}건`]}
                        />
                        <SummaryCell
                            label="당월 구독 매출" value={num(top.m.net)} unit="원"
                            delta={{ cur: top.m.net, prev: top.mp.net, unit: "원", prevLabel: "전월 같은 날까지" }}
                            lines={[`결제 성공 ${num(top.m.ok.length)}건`]}
                            spark={top.monthSeries}
                        />
                        <SummaryCell
                            label="활성 구독" value={num(subs.appList.length + subs.insList.length)} unit="건"
                            lines={[
                                `앱 월 구독 ${num(subs.appList.length)}건 · 월 구독형 보험 ${num(subs.insList.length)}건`,
                                `자동 연장 ${num(subs.auto)}건${subs.oneOff > 0 ? ` · 연장 없는 단건 ${num(subs.oneOff)}건` : ""}`,
                            ]}
                        />
                        <SummaryCell
                            label="결제 실패 · 해지 예약" value={num(subs.fail + subs.cancel)} unit="건"
                            lines={[
                                `자동결제 실패 (다시 시도 중) ${num(subs.fail)}건`,
                                `해지 예약 (만료일까지 이용) ${num(subs.cancel)}건`,
                            ]}
                        />
                    </SummaryGrid>

                    <PeriodBar period={period} onChange={change} range={range} now={now} />

                    <SummaryTable>
                        <tbody>
                            <tr>
                                <td className="l">결제 청구액</td><td className="v">{won(view.cur.okSum + sum(view.failCur))}</td>
                                <td className="l">결제 성공액</td><td className="v">{won(view.cur.okSum)} (신규 {num(view.newCount)}건 · 갱신 {num(view.renewCount)}건)</td>
                                <td className="l">결제 실패</td><td className="v">{won(sum(view.failCur))} ({num(view.failCur.length)}건)</td>
                                {hasRefund ? <><td className="l">환불 · 취소액</td><td className="v">{won(view.cur.rfSum)} ({num(view.cur.rf.length)}건)</td></> : null}
                                <td className="l">순 구독 매출</td><td className="v">{won(view.cur.net)}</td>
                                <td className="l">{range.prevLabel}</td><td className="v">{won(view.prev.net)}</td>
                            </tr>
                            <tr>
                                <td className="l">기간 중 해지 예약</td><td className="v">{num(view.cancelBooked)}건</td>
                                <td className="l">자동결제 실패로 끊김</td><td className="v">{num(view.endedByFail)}건</td>
                                <td className="l">기간 만료</td><td className="v" colSpan={hasRefund ? 7 : 5}>{num(view.expired)}건</td>
                            </tr>
                        </tbody>
                    </SummaryTable>

                    <Card>
                        <CardHead>
                            <CardTitle>{UNIT_LABEL[range.unit]} 구독 매출 추이</CardTitle>
                            <CardMeta>{range.label}</CardMeta>
                        </CardHead>
                        <CardBody>
                            <TrendChart data={view.chart} series={chartSeries} money height={280} />
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHead><CardTitle>상품 · 요금제별 매출</CardTitle><CardMeta>결제 성공액 {won(view.cur.okSum)}</CardMeta></CardHead>
                        <CardBody>
                            {view.plans.length === 0 ? <EmptyNote>이 기간에 승인된 구독 결제가 없습니다</EmptyNote> : (
                                <DistTable
                                    rows={view.plans} nameHead="상품 · 요금제" valueHead="매출" unit="원"
                                    extra={[{ head: "결제 건수", render: (r) => `${num(r.count)}건` }]}
                                />
                            )}
                        </CardBody>
                    </Card>

                    <TwoCol>
                        <Card>
                            <CardHead><CardTitle>시 · 도별 구독 회원</CardTitle><CardMeta>사업자 · 프리랜서 {num(dist.targetCount)}명 중</CardMeta></CardHead>
                            <CardBody>
                                {dist.bySido.length === 0 ? <EmptyNote>사업자 · 프리랜서 회원이 없습니다</EmptyNote> : (
                                    <DistTable
                                        rows={dist.bySido} nameHead="시 · 도 (활동 지역)" valueHead="구독 회원" unit="명" showShare={false}
                                        extra={[{ head: "대상 회원", render: (r) => `${num(r.target)}명` }, { head: "구독 전환율", render: rate }]}
                                    />
                                )}
                            </CardBody>
                        </Card>
                        <Card>
                            <CardHead><CardTitle>카테고리별 구독 회원</CardTitle><CardMeta>전문분야 등록 회원 기준</CardMeta></CardHead>
                            <CardBody>
                                {dist.byCat.length === 0 ? <EmptyNote>전문분야를 등록한 회원이 없습니다</EmptyNote> : (
                                    <DistTable
                                        rows={dist.byCat} nameHead="카테고리" valueHead="구독 회원" unit="명" showShare={false}
                                        extra={[{ head: "등록 회원", render: (r) => `${num(r.target)}명` }, { head: "구독 전환율", render: rate }]}
                                    />
                                )}
                            </CardBody>
                        </Card>
                    </TwoCol>

                    {/* 결제 원장 */}
                    <Card>
                        <CardHead>
                            <CardTitle>구독 결제 원장</CardTitle>
                            <FilterRow>
                                <FilterLabel>상태</FilterLabel>
                                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                                    <option value="all">전체</option>
                                    {Object.entries(PAY_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </Select>
                                <Input placeholder="회원명 · 상호 · 연락처 · 주문번호" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 260 }} />
                            </FilterRow>
                        </CardHead>
                        {ledger.length === 0 ? <EmptyNote style={{ minHeight: 200 }}>조건에 맞는 구독 결제가 없습니다</EmptyNote> : (
                            <TableWrap style={{ border: "none" }}>
                                <Table $minW="1000px">
                                    <thead>
                                        <tr>
                                            <Th>번호</Th><Th>결제일시</Th><Th>회원명 · 상호</Th><Th>연락처</Th><Th>상품 · 요금제</Th><Th>결제수단</Th>
                                            <Th style={{ textAlign: "right" }}>금액</Th><Th>주문번호 · PG 거래번호</Th><Th>상태</Th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageRows.map((p, i) => {
                                            const u = userMap.get(p.uid);
                                            return (
                                                <Tr key={p.id}>
                                                    <Td>{ledger.length - ((page - 1) * PAGE_SIZE + i)}</Td>
                                                    <Td>{kstDateTime(rowDate(p))}</Td>
                                                    <Td><NameBtn type="button" onClick={() => openMember(p.uid)}>{userName(u) || "(회원 정보 없음)"}</NameBtn></Td>
                                                    <Td>{userPhone(u)}</Td>
                                                    <Td>{planLabel(p)}{p.renewal ? " (갱신)" : ""}</Td>
                                                    <Td>{methodText(p)}</Td>
                                                    <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{won(amountOf(p))}</Td>
                                                    <Td>
                                                        <KeyText>{p.tossOrderId || p.id}</KeyText>
                                                        {p.paymentKey ? <KeyText>{p.paymentKey}</KeyText> : null}
                                                        {p.receiptUrl ? <a href={p.receiptUrl} target="_blank" rel="noreferrer" style={{ fontSize: 14, color: INK }}>영수증</a> : null}
                                                    </Td>
                                                    <Td>
                                                        <Status $color={STATUS_COLOR[p.status]} $weight={p.status === "ready" ? 400 : 600}>{PAY_STATUS[p.status] || p.status}</Status>
                                                        {p.status === "fail" && p.failMessage ? <div style={{ fontSize: 14, color: DOWN, whiteSpace: "normal", maxWidth: 220 }}>{p.failMessage}</div> : null}
                                                    </Td>
                                                </Tr>
                                            );
                                        })}
                                    </tbody>
                                </Table>
                            </TableWrap>
                        )}
                        <Pager page={page} total={ledger.length} onChange={setPage} />
                    </Card>
                </>
            )}

            {member ? (
                <Overlay onClick={() => setMember(null)}>
                    <Modal $w="760px" style={{ height: "min(82vh, 640px)" }} onClick={(e) => e.stopPropagation()}>
                        <ModalHead>
                            <ModalTitle>{userName(mUser) || "회원"}</ModalTitle>
                            <ModalClose type="button" onClick={() => setMember(null)} aria-label="닫기"><IoCloseOutline size={24} /></ModalClose>
                        </ModalHead>
                        <ModalBody>
                            <ModalTabs>
                                {[["info", "회원 정보"], ["sub", "구독 상태"], ["pays", "결제 내역"]].map(([k, label]) => (
                                    <ModalTab key={k} type="button" $on={memberTab === k} onClick={() => setMemberTab(k)}>{label}</ModalTab>
                                ))}
                            </ModalTabs>

                            {memberTab === "info" && (
                                !mUser ? <EmptyNote>회원 문서를 찾지 못했습니다 (탈퇴했거나 합쳐진 계정일 수 있습니다)</EmptyNote> : (
                                    <Fields>
                                        <tbody>
                                            <tr><td className="l">이름 · 상호</td><td className="v">{userName(mUser)}</td></tr>
                                            <tr><td className="l">대화명</td><td className="v">{mUser.nickname || ""}</td></tr>
                                            <tr><td className="l">연락처</td><td className="v">{userPhone(mUser)}</td></tr>
                                            <tr><td className="l">회원 구분</td><td className="v">{memberTypesLabel(mUser) || BUCKET_LABEL[memberBucket(mUser)]}</td></tr>
                                            <tr><td className="l">활동 지역</td><td className="v">{[mUser.region?.sido, mUser.region?.gu].filter(Boolean).join(" ")}</td></tr>
                                            <tr><td className="l">등록 전문분야</td><td className="v">{mCats.join(" · ")}</td></tr>
                                            <tr><td className="l">가입일</td><td className="v">{ymd(mUser.createdAt)}</td></tr>
                                        </tbody>
                                    </Fields>
                                )
                            )}

                            {memberTab === "sub" && (
                                <>
                                    <SubTitle>앱 월 구독</SubTitle>
                                    {!mSub ? <EmptyNote style={{ padding: "20px 0" }}>구독한 적이 없습니다</EmptyNote> : (
                                        <Fields>
                                            <tbody>
                                                <tr><td className="l">상태</td><td className="v">{mSub.status === "active" ? "이용 중" : mSub.status === "expired" ? "만료" : (mSub.status || "")}</td></tr>
                                                <tr><td className="l">이용 기간</td><td className="v">{ymd(mSub.startAt)} ~ {ymd(mSub.endAt)}</td></tr>
                                                <tr><td className="l">자동 연장</td><td className="v">{renewText(mSub.autoRenew, mSub.autoRenewCanceledAt, true)}</td></tr>
                                                <tr><td className="l">다음 결제일</td><td className="v">{ymd(mSub.billing?.nextChargeAt)}</td></tr>
                                                <tr><td className="l">결제 실패</td><td className="v">{num(mSub.billing?.failCount)}회{mSub.billing?.lastFailMessage ? ` — ${mSub.billing.lastFailMessage}` : ""}</td></tr>
                                                <tr><td className="l">등록 카드</td><td className="v">{[mSub.billing?.cardCompany, mSub.billing?.cardNumberMasked].filter(Boolean).join(" ")}</td></tr>
                                            </tbody>
                                        </Fields>
                                    )}
                                    <SubTitle>월 구독형 보험</SubTitle>
                                    {mPolicies.length === 0 ? <EmptyNote style={{ padding: "20px 0" }}>가입한 적이 없습니다</EmptyNote> : mPolicies.map((pol) => (
                                        <Fields key={pol.id} style={{ marginBottom: 10 }}>
                                            <tbody>
                                                <tr><td className="l">상태</td><td className="v">{pol.status === "active" ? "가입 중" : pol.status === "expired" ? "만료" : (pol.status || "")}{pol.group ? ` · ${pol.group}그룹` : ""} · 월 {won(pol.price)}</td></tr>
                                                <tr><td className="l">보장 기간</td><td className="v">{ymd(pol.startAt)} ~ {ymd(pol.endAt)}</td></tr>
                                                <tr><td className="l">자동 연장</td><td className="v">{renewText(pol.autoRenew, pol.autoRenewCanceledAt, false)}</td></tr>
                                                <tr><td className="l">다음 결제일</td><td className="v">{ymd(pol.billing?.nextChargeAt)}</td></tr>
                                                <tr><td className="l">결제 실패</td><td className="v">{num(pol.billing?.failCount)}회</td></tr>
                                            </tbody>
                                        </Fields>
                                    ))}
                                </>
                            )}

                            {memberTab === "pays" && (
                                mPays.length === 0 ? <EmptyNote>불러온 기간 안에 이 회원의 구독 결제가 없습니다</EmptyNote> : (
                                    <TableWrap>
                                        <Table $minW="640px">
                                            <thead><tr><Th>결제일시</Th><Th>상품 · 요금제</Th><Th>결제수단</Th><Th style={{ textAlign: "right" }}>금액</Th><Th>상태</Th></tr></thead>
                                            <tbody>
                                                {mPays.map((p) => (
                                                    <Tr key={p.id}>
                                                        <Td>{kstDateTime(rowDate(p))}</Td>
                                                        <Td>{planLabel(p)}{p.renewal ? " (갱신)" : ""}</Td>
                                                        <Td>{methodText(p)}</Td>
                                                        <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{won(amountOf(p))}</Td>
                                                        <Td><Status $color={STATUS_COLOR[p.status]} $weight={p.status === "ready" ? 400 : 600}>{PAY_STATUS[p.status] || p.status}</Status></Td>
                                                    </Tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </TableWrap>
                                )
                            )}
                        </ModalBody>
                    </Modal>
                </Overlay>
            ) : null}
        </StatPage>
    );
}
