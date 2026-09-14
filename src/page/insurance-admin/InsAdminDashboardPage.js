import React, { useEffect, useState } from "react";
import {
    fetchDashboardData, formatDateTime, formatMoney, maskPhone,
    PURPOSE_LABELS, PAYMENT_STATUS,
} from "../../service/InsuranceAdminService";
import {
    Page, PageHead, PageTitle, PageDesc, HeadRight, Btn,
    SummaryTable, TableWrap, Table, Th, Td, Tr, Empty, Loading, Status, Mono, SectionTitle,
} from "./insAdminUi";
import styled from "styled-components";

const Block = styled.div`display: flex; flex-direction: column; gap: 10px;`;

const InsAdminDashboardPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            setData(await fetchDashboardData());
        } catch (e) {
            console.error(e);
            setError("불러오기 실패: " + (e.message || ""));
        }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    return (
        <Page>
            <PageHead>
                <div>
                    <PageTitle>대시보드</PageTitle>
                    <PageDesc>{data ? `${data.monthLabel} 기준` : "이번 달 기준"} 가입·납부·사고 접수 현황입니다.</PageDesc>
                </div>
                <HeadRight>
                    <Btn onClick={load} disabled={loading}>새로고침</Btn>
                </HeadRight>
            </PageHead>

            {loading ? (
                <Loading>불러오는 중...</Loading>
            ) : error ? (
                <Empty>{error}</Empty>
            ) : (
                <>
                    <Block>
                        <SectionTitle>당월 가입</SectionTitle>
                        <SummaryTable>
                            <tbody>
                                <tr>
                                    <td className="l">신규 가입</td><td className="v">{data.monthNewCount}건</td>
                                    <td className="l">1년 단체</td><td className="v">{data.byType.yearly}건</td>
                                    <td className="l">월 구독형</td><td className="v">{data.byType.monthly}건</td>
                                    <td className="l">건당 단기</td><td className="v">{data.byType.perOrder}건</td>
                                    <td className="l">당월 납부 보험료</td><td className="v">{formatMoney(data.monthPremium)} ({data.monthPaidCount}건)</td>
                                    <td className="l">현재 유효 가입자</td><td className="v">{data.activeCount}명</td>
                                </tr>
                            </tbody>
                        </SummaryTable>
                    </Block>

                    <Block>
                        <SectionTitle>사고 접수</SectionTitle>
                        <SummaryTable>
                            <tbody>
                                <tr>
                                    <td className="l">접수 대기</td><td className="v">{data.claimCounts.received}건</td>
                                    <td className="l">진행 중</td><td className="v">{data.claimCounts.in_progress}건</td>
                                    <td className="l">완료</td><td className="v">{data.claimCounts.done}건</td>
                                    <td className="l">누적</td><td className="v">{data.claimTotal}건</td>
                                </tr>
                            </tbody>
                        </SummaryTable>
                    </Block>

                    <Block>
                        <SectionTitle>최근 납부 10건</SectionTitle>
                        <TableWrap>
                            <Table $minW="1000px">
                                <thead>
                                    <tr>
                                        <Th>승인일시</Th><Th>결제ID</Th><Th>용도</Th><Th>결제명</Th><Th>회원UID</Th><Th>금액</Th><Th>상태</Th><Th>수단</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.recentPayments.length === 0 ? (
                                        <tr><Td colSpan={8}><Empty>납부 이력이 없습니다.</Empty></Td></tr>
                                    ) : data.recentPayments.map((p) => {
                                        const st = PAYMENT_STATUS[p.status] || { label: p.status || "-", color: undefined, weight: 500 };
                                        return (
                                            <Tr key={p.id}>
                                                <Td>{formatDateTime(p.approvedAt || p.createdAt)}</Td>
                                                <Td><Mono>{p.tossOrderId || p.id}</Mono></Td>
                                                <Td>{PURPOSE_LABELS[p.purpose] || p.purpose || "-"}</Td>
                                                <Td>{p.orderName || "-"}</Td>
                                                <Td><Mono>{(p.uid || "-").slice(0, 10)}</Mono></Td>
                                                <Td style={{ fontWeight: 700 }}>{formatMoney(p.amount)}</Td>
                                                <Td><Status $color={st.color} $weight={st.weight}>{st.label}</Status></Td>
                                                <Td>{p.tossMethod || (p.meta?.phone ? maskPhone(p.meta.phone) : "-")}</Td>
                                            </Tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </TableWrap>
                    </Block>
                </>
            )}
        </Page>
    );
};

export default InsAdminDashboardPage;
