import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { IoCloseOutline } from "react-icons/io5";
import {
    fetchPolicies, cancelPolicy, extendPolicy, logAdminAction, downloadCsv, csvStamp,
    policiesToCsvRows, POLICIES_CSV_HEADERS,
    fetchMyUnmaskRequests, requestUnmask, UNMASK_STATUS,
    formatDate, formatDateTime, formatMoney, maskPhone, normalizePhone, inDateRange,
    PLAN_LABELS, POLICY_STATUS,
} from "../../service/InsuranceAdminService";
import {
    Page, PageHead, PageTitle, PageDesc, HeadRight, Btn, SmallBtn,
    FilterRow, FilterLabel, Select, Input, Count,
    TableWrap, Table, Th, Td, Tr, Empty, Loading, Status, Mono,
    PageNav, PageBtn, PageInfo,
    Overlay, Modal, ModalHead, ModalTitle, ModalClose, ModalBody, ModalFoot, Fields, Note,
} from "./insAdminUi";

const PAGE_SIZE = 20;

const statusOf = (s) => POLICY_STATUS[s] || { label: s || "-", color: undefined, weight: 500 };

const InsAdminPoliciesPage = () => {
    const { admin } = useOutletContext();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [type, setType] = useState("all");
    const [status, setStatus] = useState("all");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);

    const [selected, setSelected] = useState(null);
    const [unmasked, setUnmasked] = useState(false); // 운영자 직접 해제용
    const [unmaskMap, setUnmaskMap] = useState({});   // 대리점 관리자: 내가 낸 해제 요청 { policyId: request }
    const [busy, setBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [list, reqs] = await Promise.all([
                fetchPolicies(),
                admin.isOperator ? Promise.resolve({}) : fetchMyUnmaskRequests(admin.adminUid),
            ]);
            setItems(list);
            setUnmaskMap(reqs);
        } catch (e) { console.error(e); alert("가입자 목록 불러오기 실패: " + e.message); }
        setLoading(false);
    };
    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const filtered = useMemo(() => items.filter((p) => {
        if (type !== "all" && p.type !== type) return false;
        if (status !== "all" && p.status !== status) return false;
        if ((from || to) && !inDateRange(p.startAt || p.createdAt, from, to)) return false;
        if (search.trim()) {
            const s = search.trim().toLowerCase();
            if (!(p.userName || "").toLowerCase().includes(s)) return false;
        }
        return true;
    }), [items, type, status, from, to, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const resetPage = () => setPage(0);

    const openDetail = (p) => { setSelected(p); setUnmasked(false); };
    const closeDetail = () => { setSelected(null); setUnmasked(false); };

    const patchLocal = (id, patch) => {
        setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
        setSelected((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
    };

    /**
     * 전화번호 보기 — 운영자는 바로 해제(로그), 대리점 관리자는 해제 요청만 만들고 운영자 승인 뒤에 보인다 (대표 9/12)
     */
    const handleUnmask = async () => {
        if (!selected) return;
        if (admin.isOperator) {
            setUnmasked(true);
            await logAdminAction({ admin, action: "unmask", tab: "policies", target: selected.id, rows: 1 });
            return;
        }
        setBusy(true);
        try {
            const req = await requestUnmask({
                admin, kind: "policy", targetId: selected.id,
                target: `${selected.userName || ""} ${maskPhone(selected.userPhone)}`.trim(),
                existing: unmaskMap[selected.id],
            });
            setUnmaskMap((prev) => ({ ...prev, [selected.id]: req }));
        } catch (e) { alert("해제 요청 실패: " + e.message); }
        setBusy(false);
    };

    const renderPhoneCell = () => {
        const req = unmaskMap[selected.id];
        const show = unmasked || req?.status === "approved";
        if (show) return <span>{normalizePhone(selected.userPhone) || "-"}</span>;
        if (!selected.userPhone) return <span>-</span>;
        if (req?.status === "pending") {
            return <>
                <span>{maskPhone(selected.userPhone)}</span>
                <Status $color={UNMASK_STATUS.pending.color} $weight={700}>{UNMASK_STATUS.pending.label}</Status>
                <SmallBtn onClick={load} disabled={busy}>승인 확인</SmallBtn>
            </>;
        }
        return <>
            <span>{maskPhone(selected.userPhone)}</span>
            {req?.status === "rejected" && <Status $color={UNMASK_STATUS.rejected.color} $weight={700}>거절됨</Status>}
            <SmallBtn onClick={handleUnmask} disabled={busy}>
                {admin.isOperator ? "전화번호 보기" : req?.status === "rejected" ? "다시 요청" : "전화번호 보기 요청"}
            </SmallBtn>
        </>;
    };

    const handleCancel = async () => {
        if (!selected) return;
        if (!window.confirm(`${selected.userName || "이 가입자"}의 보험을 해지할까요?\n상태가 '해지'로 바뀌고 되돌릴 수 없습니다.`)) return;
        setBusy(true);
        try {
            const patch = await cancelPolicy(selected.id, admin);
            patchLocal(selected.id, patch);
        } catch (e) { alert("해지 실패: " + e.message); }
        setBusy(false);
    };

    const handleExtend = async (unit) => {
        if (!selected) return;
        const label = unit === "year" ? "1년" : "1개월";
        if (!window.confirm(`종료일을 ${label} 연장할까요? (상태는 '유효'가 됩니다)`)) return;
        setBusy(true);
        try {
            const patch = await extendPolicy(selected, unit, admin);
            patchLocal(selected.id, patch);
        } catch (e) { alert("연장 실패: " + e.message); }
        setBusy(false);
    };

    const handleCsv = async () => {
        if (filtered.length === 0) { alert("내려받을 데이터가 없습니다."); return; }
        downloadCsv(`보험가입자_${csvStamp()}.csv`, POLICIES_CSV_HEADERS, policiesToCsvRows(filtered));
        await logAdminAction({ admin, action: "excel_download", tab: "policies", target: null, rows: filtered.length });
    };

    return (
        <Page>
            <PageHead>
                <div>
                    <PageTitle>가입자·배서</PageTitle>
                    <PageDesc>보험 가입 내역을 조회하고 해지·연장(배서)을 처리합니다. 전화번호는 운영자 승인 뒤에 볼 수 있고, CSV 다운로드는 기록이 남습니다.</PageDesc>
                </div>
                <HeadRight>
                    <Btn onClick={load} disabled={loading}>새로고침</Btn>
                    <Btn onClick={handleCsv} disabled={loading}>CSV 다운로드</Btn>
                </HeadRight>
            </PageHead>

            <FilterRow>
                <FilterLabel>유형</FilterLabel>
                <Select value={type} onChange={(e) => { setType(e.target.value); resetPage(); }}>
                    <option value="all">전체</option>
                    <option value="yearly">1년 단체보험</option>
                    <option value="monthly">월 구독형</option>
                    <option value="perOrder">건당 단기</option>
                </Select>
                <FilterLabel>상태</FilterLabel>
                <Select value={status} onChange={(e) => { setStatus(e.target.value); resetPage(); }}>
                    <option value="all">전체</option>
                    <option value="active">유효</option>
                    <option value="pending">결제 전</option>
                    <option value="expired">만료</option>
                    <option value="canceled">해지</option>
                </Select>
                <FilterLabel>가입 시작일</FilterLabel>
                <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); resetPage(); }} />
                <FilterLabel>~</FilterLabel>
                <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); resetPage(); }} />
                <Input $w="220px" placeholder="이름 검색" value={search} onChange={(e) => { setSearch(e.target.value); resetPage(); }} />
                <Count>{filtered.length}건</Count>
            </FilterRow>

            {loading ? (
                <Loading>불러오는 중...</Loading>
            ) : (
                <>
                    <TableWrap>
                        <Table $minW="1040px">
                            <thead>
                                <tr>
                                    <Th>이름</Th><Th>전화번호</Th><Th>유형</Th><Th>상태</Th><Th>보장 기간</Th><Th>보험료</Th><Th>가입일</Th><Th>오더</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {paged.length === 0 ? (
                                    <tr><Td colSpan={8}><Empty>조건에 맞는 가입 내역이 없습니다.</Empty></Td></tr>
                                ) : paged.map((p) => {
                                    const st = statusOf(p.status);
                                    return (
                                        <Tr key={p.id} $clickable onClick={() => openDetail(p)}>
                                            <Td style={{ fontWeight: 600 }}>{p.userName || "-"}</Td>
                                            <Td>{maskPhone(p.userPhone)}</Td>
                                            <Td>{PLAN_LABELS[p.type] || p.type || "-"}</Td>
                                            <Td><Status $color={st.color} $weight={st.weight}>{st.label}</Status></Td>
                                            <Td>{formatDate(p.startAt)} ~ {formatDate(p.endAt)}</Td>
                                            <Td>{formatMoney(p.price)}</Td>
                                            <Td>{formatDate(p.createdAt)}</Td>
                                            <Td>{p.orderId ? <Mono>{p.orderId.slice(0, 10)}</Mono> : "-"}</Td>
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

            {selected && (
                <Overlay onClick={closeDetail}>
                    <Modal onClick={(e) => e.stopPropagation()}>
                        <ModalHead>
                            <ModalTitle>가입 상세 — {selected.userName || "-"}</ModalTitle>
                            <ModalClose onClick={closeDetail}><IoCloseOutline size={22} /></ModalClose>
                        </ModalHead>
                        <ModalBody>
                            <Fields>
                                <tbody>
                                    <tr><td className="l">가입 ID</td><td className="v"><Mono>{selected.id}</Mono></td></tr>
                                    <tr><td className="l">이름</td><td className="v">{selected.userName || "-"}</td></tr>
                                    <tr>
                                        <td className="l">전화번호</td>
                                        <td className="v" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                            {renderPhoneCell()}
                                        </td>
                                    </tr>
                                    <tr><td className="l">회원 UID</td><td className="v"><Mono>{selected.uid || "-"}</Mono></td></tr>
                                    <tr><td className="l">유형</td><td className="v">{PLAN_LABELS[selected.type] || selected.type || "-"}</td></tr>
                                    <tr>
                                        <td className="l">상태</td>
                                        <td className="v"><Status $color={statusOf(selected.status).color} $weight={statusOf(selected.status).weight}>{statusOf(selected.status).label}</Status></td>
                                    </tr>
                                    <tr><td className="l">보장 기간</td><td className="v">{formatDateTime(selected.startAt)} ~ {formatDateTime(selected.endAt)}</td></tr>
                                    <tr><td className="l">보험료</td><td className="v" style={{ fontWeight: 700 }}>{formatMoney(selected.price)}</td></tr>
                                    <tr><td className="l">결제 ID</td><td className="v"><Mono>{selected.paymentId || "-"}</Mono></td></tr>
                                    {selected.type === "perOrder" && (
                                        <tr><td className="l">오더</td><td className="v">{selected.orderId ? <a href={`/order/${selected.orderId}`} target="_blank" rel="noreferrer" style={{ color: "#14181F", fontWeight: 600 }}>{selected.orderId}</a> : "-"}</td></tr>
                                    )}
                                    {selected.type === "monthly" && (
                                        <tr>
                                            <td className="l">자동결제</td>
                                            <td className="v">
                                                {selected.billing
                                                    ? `${selected.billing.cardCompany || ""} ${selected.billing.cardNumberMasked || ""} · 다음 결제 ${formatDate(selected.billing.nextChargeAt)} · 실패 ${selected.billing.failCount || 0}회`
                                                    : "빌링키 없음"}
                                            </td>
                                        </tr>
                                    )}
                                    <tr><td className="l">본인인증</td><td className="v">{selected.identity?.verified ? `확인됨 (${selected.identity.method || "-"}, ${formatDateTime(selected.identity.verifiedAt)})` : "미확인"}</td></tr>
                                    <tr><td className="l">가입일시</td><td className="v">{formatDateTime(selected.createdAt)}</td></tr>
                                    <tr><td className="l">수정일시</td><td className="v">{formatDateTime(selected.updatedAt)}</td></tr>
                                    {selected.canceledAt && <tr><td className="l">해지일시</td><td className="v">{formatDateTime(selected.canceledAt)}</td></tr>}
                                </tbody>
                            </Fields>
                            <Note style={{ marginTop: 14 }}>
                                연장은 현재 종료일(지났으면 오늘)부터 더해지며 상태가 '유효'로 바뀝니다. 해지는 되돌릴 수 없습니다.
                            </Note>
                        </ModalBody>
                        <ModalFoot>
                            <Btn $danger onClick={handleCancel} disabled={busy || selected.status === "canceled"}>해지</Btn>
                            <Btn onClick={() => handleExtend("month")} disabled={busy}>1개월 연장</Btn>
                            <Btn onClick={() => handleExtend("year")} disabled={busy}>1년 연장</Btn>
                            <Btn onClick={closeDetail}>닫기</Btn>
                        </ModalFoot>
                    </Modal>
                </Overlay>
            )}
        </Page>
    );
};

export default InsAdminPoliciesPage;
