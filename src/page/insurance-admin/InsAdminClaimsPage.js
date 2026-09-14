import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import styled from "styled-components";
import { IoCloseOutline } from "react-icons/io5";
import {
    fetchClaims, updateClaimStatus, saveClaimMemo, logAdminAction,
    fetchMyUnmaskRequests, requestUnmask, UNMASK_STATUS,
    formatDateTime, maskPhone, normalizePhone,
    CLAIM_STATUS, CLAIM_NEXT_STATUS, DAMAGE_LABELS,
} from "../../service/InsuranceAdminService";
import {
    Page, PageHead, PageTitle, PageDesc, HeadRight, Btn, SmallBtn,
    FilterRow, FilterLabel, Select, Count,
    TableWrap, Table, Th, Td, Tr, Empty, Loading, Status, Mono,
    PageNav, PageBtn, PageInfo,
    Overlay, Modal, ModalHead, ModalTitle, ModalClose, ModalBody, ModalFoot, Fields, Textarea, FieldLabel, SavedText, LINE,
} from "./insAdminUi";

const PAGE_SIZE = 20;

const Photos = styled.div`display: flex; gap: 8px; flex-wrap: wrap;`;
const Thumb = styled.img`width: 88px; height: 88px; object-fit: cover; border: 1px solid ${LINE}; cursor: zoom-in; background: #f1f4f8;`;
const Lightbox = styled.div`position: fixed; inset: 0; background: rgba(0,0,0,0.82); display: flex; align-items: center; justify-content: center; z-index: 1100; cursor: zoom-out;`;
const LightboxImg = styled.img`max-width: 92vw; max-height: 90vh; object-fit: contain; background: #000;`;
const MemoWrap = styled.div`margin-top: 18px; display: flex; flex-direction: column; gap: 8px;`;
const MemoFoot = styled.div`display: flex; align-items: center; gap: 10px;`;
const Desc = styled.div`white-space: pre-wrap; line-height: 1.55;`;

const statusOf = (s) => CLAIM_STATUS[s] || { label: s || "-", color: undefined, weight: 500 };

const InsAdminClaimsPage = () => {
    const { admin } = useOutletContext();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("all");
    const [page, setPage] = useState(0);

    const [selected, setSelected] = useState(null);
    const [unmasked, setUnmasked] = useState(false); // 운영자 직접 해제용
    const [unmaskMap, setUnmaskMap] = useState({});   // 대리점 관리자: 내가 낸 해제 요청 { claimId: request }
    const [memo, setMemo] = useState("");
    const [memoSaved, setMemoSaved] = useState(false);
    const [busy, setBusy] = useState(false);
    const [lightbox, setLightbox] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const [list, reqs] = await Promise.all([
                fetchClaims(),
                admin.isOperator ? Promise.resolve({}) : fetchMyUnmaskRequests(admin.adminUid),
            ]);
            setItems(list);
            setUnmaskMap(reqs);
        } catch (e) { console.error(e); alert("사고 접수 불러오기 실패: " + e.message); }
        setLoading(false);
    };
    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const counts = useMemo(() => {
        const c = { all: items.length, received: 0, in_progress: 0, done: 0 };
        items.forEach((x) => { if (c[x.status] !== undefined) c[x.status] += 1; });
        return c;
    }, [items]);

    const filtered = useMemo(() => items.filter((c) => status === "all" || c.status === status), [items, status]);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const openDetail = (c) => { setSelected(c); setUnmasked(false); setMemo(c.agencyMemo || ""); setMemoSaved(false); };
    const closeDetail = () => { setSelected(null); setLightbox(null); };

    const patchLocal = (id, patch) => {
        setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
        setSelected((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
    };

    /** 운영자는 바로 해제(로그), 대리점 관리자는 요청만 만들고 운영자 승인 뒤에 보인다 (대표 9/12) */
    const handleUnmask = async () => {
        if (!selected) return;
        if (admin.isOperator) {
            setUnmasked(true);
            await logAdminAction({ admin, action: "unmask", tab: "claims", target: selected.id, rows: 1 });
            return;
        }
        setBusy(true);
        try {
            const req = await requestUnmask({
                admin, kind: "claim", targetId: selected.id,
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

    const handleNextStatus = async () => {
        if (!selected) return;
        const next = CLAIM_NEXT_STATUS[selected.status];
        if (!next) return;
        if (!window.confirm(`상태를 '${statusOf(next).label}'(으)로 바꿀까요?`)) return;
        setBusy(true);
        try { patchLocal(selected.id, await updateClaimStatus(selected.id, next, admin)); }
        catch (e) { alert("상태 변경 실패: " + e.message); }
        setBusy(false);
    };

    const handleSetStatus = async (next) => {
        if (!selected || selected.status === next) return;
        setBusy(true);
        try { patchLocal(selected.id, await updateClaimStatus(selected.id, next, admin)); }
        catch (e) { alert("상태 변경 실패: " + e.message); }
        setBusy(false);
    };

    const handleSaveMemo = async () => {
        if (!selected) return;
        setBusy(true);
        setMemoSaved(false);
        try {
            patchLocal(selected.id, await saveClaimMemo(selected.id, memo, admin));
            setMemoSaved(true);
        } catch (e) { alert("메모 저장 실패: " + e.message); }
        setBusy(false);
    };

    const next = selected ? CLAIM_NEXT_STATUS[selected.status] : null;

    return (
        <Page>
            <PageHead>
                <div>
                    <PageTitle>사고 접수</PageTitle>
                    <PageDesc>회원이 접수한 사고를 확인하고 접수 → 진행 중 → 완료로 처리합니다. 대리점 메모는 회원에게 보이지 않습니다.</PageDesc>
                </div>
                <HeadRight>
                    <Btn onClick={load} disabled={loading}>새로고침</Btn>
                </HeadRight>
            </PageHead>

            <FilterRow>
                <FilterLabel>상태</FilterLabel>
                <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
                    <option value="all">전체 ({counts.all})</option>
                    <option value="received">접수 ({counts.received})</option>
                    <option value="in_progress">진행 중 ({counts.in_progress})</option>
                    <option value="done">완료 ({counts.done})</option>
                </Select>
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
                                    <Th>접수일시</Th><Th>이름</Th><Th>전화번호</Th><Th>발생일시</Th><Th>장소</Th><Th>피해 정도</Th><Th>사진</Th><Th>상태</Th><Th>담당</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {paged.length === 0 ? (
                                    <tr><Td colSpan={9}><Empty>조건에 맞는 사고 접수가 없습니다.</Empty></Td></tr>
                                ) : paged.map((c) => {
                                    const st = statusOf(c.status);
                                    return (
                                        <Tr key={c.id} $clickable onClick={() => openDetail(c)}>
                                            <Td>{formatDateTime(c.createdAt)}</Td>
                                            <Td style={{ fontWeight: 600 }}>{c.userName || "-"}</Td>
                                            <Td>{maskPhone(c.userPhone)}</Td>
                                            <Td>{formatDateTime(c.occurredAt)}</Td>
                                            <Td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>{c.place || "-"}</Td>
                                            <Td>{DAMAGE_LABELS[c.damageLevel] || c.damageLevel || "-"}</Td>
                                            <Td>{(c.photos || []).length}장</Td>
                                            <Td><Status $color={st.color} $weight={st.weight}>{st.label}</Status></Td>
                                            <Td>{c.handledBy || "-"}</Td>
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
                    <Modal $w="720px" onClick={(e) => e.stopPropagation()}>
                        <ModalHead>
                            <ModalTitle>사고 접수 상세 — {selected.userName || "-"}</ModalTitle>
                            <ModalClose onClick={closeDetail}><IoCloseOutline size={22} /></ModalClose>
                        </ModalHead>
                        <ModalBody>
                            <Fields>
                                <tbody>
                                    <tr><td className="l">접수 ID</td><td className="v"><Mono>{selected.id}</Mono></td></tr>
                                    <tr>
                                        <td className="l">상태</td>
                                        <td className="v" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                            <Status $color={statusOf(selected.status).color} $weight={statusOf(selected.status).weight}>{statusOf(selected.status).label}</Status>
                                            {["received", "in_progress", "done"].filter((s) => s !== selected.status).map((s) => (
                                                <SmallBtn key={s} onClick={() => handleSetStatus(s)} disabled={busy}>{statusOf(s).label}(으)로</SmallBtn>
                                            ))}
                                        </td>
                                    </tr>
                                    <tr><td className="l">이름</td><td className="v">{selected.userName || "-"}</td></tr>
                                    <tr>
                                        <td className="l">전화번호</td>
                                        <td className="v" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                            {renderPhoneCell()}
                                        </td>
                                    </tr>
                                    <tr><td className="l">회원 UID</td><td className="v"><Mono>{selected.uid || "-"}</Mono></td></tr>
                                    <tr>
                                        <td className="l">오더</td>
                                        <td className="v">
                                            {selected.orderId
                                                ? <a href={`/order/detail/${selected.orderId}`} target="_blank" rel="noreferrer" style={{ color: "#14181F", fontWeight: 600 }}>{selected.orderId} (새 창)</a>
                                                : "-"}
                                        </td>
                                    </tr>
                                    <tr><td className="l">가입 ID</td><td className="v"><Mono>{selected.policyId || "-"}</Mono></td></tr>
                                    <tr><td className="l">발생 일시</td><td className="v">{formatDateTime(selected.occurredAt)}</td></tr>
                                    <tr><td className="l">장소</td><td className="v">{selected.place || "-"}</td></tr>
                                    <tr><td className="l">피해 정도</td><td className="v">{DAMAGE_LABELS[selected.damageLevel] || selected.damageLevel || "-"}</td></tr>
                                    <tr><td className="l">경위</td><td className="v"><Desc>{selected.description || "-"}</Desc></td></tr>
                                    <tr>
                                        <td className="l">사진</td>
                                        <td className="v">
                                            {(selected.photos || []).length === 0 ? "없음" : (
                                                <Photos>
                                                    {selected.photos.map((url, i) => (
                                                        <Thumb key={i} src={url} alt={`사고 사진 ${i + 1}`} onClick={() => setLightbox(url)} />
                                                    ))}
                                                </Photos>
                                            )}
                                        </td>
                                    </tr>
                                    <tr><td className="l">접수일시</td><td className="v">{formatDateTime(selected.createdAt)}</td></tr>
                                    <tr><td className="l">담당 / 수정</td><td className="v">{selected.handledBy || "-"} / {formatDateTime(selected.updatedAt)}</td></tr>
                                </tbody>
                            </Fields>

                            <MemoWrap>
                                <FieldLabel>대리점 메모 (내부용)</FieldLabel>
                                <Textarea $h="110px" value={memo} onChange={(e) => { setMemo(e.target.value); setMemoSaved(false); }} placeholder="보험사 접수 번호, 통화 내용, 처리 방향 등" />
                                <MemoFoot>
                                    <SmallBtn onClick={handleSaveMemo} disabled={busy}>메모 저장</SmallBtn>
                                    {memoSaved && <SavedText>저장되었습니다</SavedText>}
                                </MemoFoot>
                            </MemoWrap>
                        </ModalBody>
                        <ModalFoot>
                            {next && <Btn $primary onClick={handleNextStatus} disabled={busy}>{statusOf(next).label}(으)로 변경</Btn>}
                            <Btn onClick={closeDetail}>닫기</Btn>
                        </ModalFoot>
                    </Modal>
                </Overlay>
            )}

            {lightbox && (
                <Lightbox onClick={() => setLightbox(null)}>
                    <LightboxImg src={lightbox} alt="사고 사진 확대" />
                </Lightbox>
            )}
        </Page>
    );
};

export default InsAdminClaimsPage;
