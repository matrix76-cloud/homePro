import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
    fetchInsurancePayments, logAdminAction, downloadCsv, csvStamp,
    paymentsToCsvRows, PAYMENTS_CSV_HEADERS,
    formatDateTime, formatMoney, inDateRange, toInputDate, monthRange,
    PURPOSE_LABELS, PAYMENT_STATUS,
} from "../../service/InsuranceAdminService";
import {
    Page, PageHead, PageTitle, PageDesc, HeadRight, Btn,
    FilterRow, FilterLabel, Select, Input, Count, SummaryTable,
    TableWrap, Table, Th, Td, Tr, Empty, Loading, Status, Mono,
    PageNav, PageBtn, PageInfo,
} from "./insAdminUi";

const PAGE_SIZE = 20;

const InsAdminSettlementPage = () => {
    const { admin } = useOutletContext();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const initial = monthRange();
    const [from, setFrom] = useState(toInputDate(initial.start));
    const [to, setTo] = useState(toInputDate(initial.end));
    const [purpose, setPurpose] = useState("all");
    const [status, setStatus] = useState("all");
    const [page, setPage] = useState(0);

    const load = async () => {
        setLoading(true);
        try { setItems(await fetchInsurancePayments()); } catch (e) { console.error(e); alert("결제 내역 불러오기 실패: " + e.message); }
        setLoading(false);
    };
    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => items.filter((p) => {
        if (purpose !== "all" && p.purpose !== purpose) return false;
        if (status !== "all" && p.status !== status) return false;
        if ((from || to) && !inDateRange(p.approvedAt || p.createdAt, from, to)) return false;
        return true;
    }), [items, purpose, status, from, to]);

    const sum = useMemo(() => {
        const done = filtered.filter((p) => p.status === "done");
        const refund = filtered.filter((p) => p.status === "refund");
        const fail = filtered.filter((p) => p.status === "fail");
        const amt = (l) => l.reduce((s, p) => s + Number(p.amount || 0), 0);
        return {
            doneCount: done.length, doneAmount: amt(done),
            refundCount: refund.length, refundAmount: amt(refund),
            failCount: fail.length,
            net: amt(done) - amt(refund),
        };
    }, [filtered]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const resetPage = () => setPage(0);

    const handleCsv = async () => {
        if (filtered.length === 0) { alert("내려받을 데이터가 없습니다."); return; }
        downloadCsv(`보험정산_${from || "전체"}_${to || "전체"}_${csvStamp()}.csv`, PAYMENTS_CSV_HEADERS, paymentsToCsvRows(filtered));
        await logAdminAction({ admin, action: "excel_download", tab: "settlement", target: `${from || ""}~${to || ""}`, rows: filtered.length });
    };

    return (
        <Page>
            <PageHead>
                <div>
                    <PageTitle>정산 대사</PageTitle>
                    <PageDesc>토스 결제 기록 중 보험 관련 건(1년·월·건당)만 모아 기간별로 대조합니다. CSV 다운로드는 기록이 남습니다.</PageDesc>
                </div>
                <HeadRight>
                    <Btn onClick={load} disabled={loading}>새로고침</Btn>
                    <Btn onClick={handleCsv} disabled={loading}>CSV 다운로드</Btn>
                </HeadRight>
            </PageHead>

            <FilterRow>
                <FilterLabel>승인일</FilterLabel>
                <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); resetPage(); }} />
                <FilterLabel>~</FilterLabel>
                <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); resetPage(); }} />
                <Btn onClick={() => { setFrom(""); setTo(""); resetPage(); }}>전체 기간</Btn>
                <FilterLabel>용도</FilterLabel>
                <Select value={purpose} onChange={(e) => { setPurpose(e.target.value); resetPage(); }}>
                    <option value="all">전체</option>
                    <option value="insurance_yearly">1년 단체보험</option>
                    <option value="insurance_monthly">월 구독형</option>
                    <option value="insurance_order">건당 단기</option>
                </Select>
                <FilterLabel>상태</FilterLabel>
                <Select value={status} onChange={(e) => { setStatus(e.target.value); resetPage(); }}>
                    <option value="all">전체</option>
                    <option value="done">완료</option>
                    <option value="ready">대기</option>
                    <option value="fail">실패</option>
                    <option value="refund">환불</option>
                </Select>
                <Count>{filtered.length}건</Count>
            </FilterRow>

            <SummaryTable>
                <tbody>
                    <tr>
                        <td className="l">결제 완료</td><td className="v">{sum.doneCount}건 · {formatMoney(sum.doneAmount)}</td>
                        <td className="l">환불</td><td className="v">{sum.refundCount}건 · {formatMoney(sum.refundAmount)}</td>
                        <td className="l">실패</td><td className="v">{sum.failCount}건</td>
                        <td className="l">순 정산액</td><td className="v">{formatMoney(sum.net)}</td>
                    </tr>
                </tbody>
            </SummaryTable>

            {loading ? (
                <Loading>불러오는 중...</Loading>
            ) : (
                <>
                    <TableWrap>
                        <Table $minW="1100px">
                            <thead>
                                <tr>
                                    <Th>승인일시</Th><Th>결제ID</Th><Th>용도</Th><Th>결제명</Th><Th>회원UID</Th><Th>금액</Th><Th>상태</Th><Th>수단</Th><Th>영수증</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {paged.length === 0 ? (
                                    <tr><Td colSpan={9}><Empty>조건에 맞는 결제 내역이 없습니다.</Empty></Td></tr>
                                ) : paged.map((p) => {
                                    const st = PAYMENT_STATUS[p.status] || { label: p.status || "-", color: undefined, weight: 500 };
                                    return (
                                        <Tr key={p.id}>
                                            <Td>{formatDateTime(p.approvedAt || p.createdAt)}</Td>
                                            <Td><Mono>{p.tossOrderId || p.id}</Mono></Td>
                                            <Td>{PURPOSE_LABELS[p.purpose] || p.purpose || "-"}</Td>
                                            <Td>{p.orderName || "-"}</Td>
                                            <Td><Mono>{(p.uid || "-").slice(0, 10)}</Mono></Td>
                                            <Td style={{ fontWeight: 700 }}>{formatMoney(p.amount)}</Td>
                                            <Td><Status $color={st.color} $weight={st.weight}>{st.label}</Status>{p.status === "fail" && p.failMessage ? ` · ${p.failMessage}` : ""}</Td>
                                            <Td>{p.tossMethod || "-"}</Td>
                                            <Td>{p.receiptUrl ? <a href={p.receiptUrl} target="_blank" rel="noreferrer" style={{ color: "#14181F", fontWeight: 600 }}>보기</a> : "-"}</Td>
                                        </Tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </TableWrap>
                    {totalPages > 1 && (
                        <PageNav>
                            <PageBtn disabled={page === 0} onClick={() => setPage((p) => p - 1)}>이전</PageBtn>
                            <PageInfo>{page + 1} / {totalPages}</PageInfo>
                            <PageBtn disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>다음</PageBtn>
                        </PageNav>
                    )}
                </>
            )}
        </Page>
    );
};

export default InsAdminSettlementPage;
