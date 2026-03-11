/* eslint-disable */
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { collection, getDocs, doc, updateDoc, addDoc, query, orderBy, where, Timestamp } from "firebase/firestore";
import { db } from "../../api/config";
import { THEME, COLLECTIONS } from "../../config/homeproConfig";
import { IoSearchOutline, IoDownloadOutline } from "react-icons/io5";

const Page = styled.div``;
const Header = styled.div`display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;`;
const Title = styled.h2`font-size:20px;font-weight:700;color:${THEME.text};margin:0;`;
const HeaderRight = styled.div`display:flex;gap:8px;`;
const Btn = styled.button`
    padding:8px 16px;border:none;border-radius:4px;font-size:13px;font-weight:600;cursor:pointer;
    background:${p => p.$danger ? THEME.danger : p.$outline ? '#fff' : THEME.primary};
    color:${p => p.$outline ? THEME.primary : '#fff'};
    border:${p => p.$outline ? `1px solid ${THEME.primary}` : 'none'};
    &:disabled{opacity:0.5;}
`;

const Tabs = styled.div`display:flex;gap:0;border-bottom:1px solid ${THEME.border};margin-bottom:16px;`;
const Tab = styled.button`
    padding:10px 18px;border:none;background:none;font-size:14px;cursor:pointer;
    color:${p => p.$active ? THEME.primary : THEME.muted};font-weight:${p => p.$active ? 600 : 400};
    border-bottom:${p => p.$active ? `2px solid ${THEME.primary}` : '2px solid transparent'};
`;
const TabCount = styled.span`
    margin-left:4px;font-size:11px;background:${p => p.$active ? THEME.primary : THEME.border};
    color:${p => p.$active ? '#fff' : THEME.muted};padding:1px 6px;border-radius:10px;
`;

const SearchRow = styled.div`display:flex;align-items:center;gap:12px;margin-bottom:16px;`;
const SearchWrap = styled.div`position:relative;flex:1;max-width:320px;`;
const SearchIcon = styled(IoSearchOutline)`position:absolute;left:10px;top:50%;transform:translateY(-50%);color:${THEME.muted};font-size:16px;`;
const SearchInput = styled.input`
    width:100%;padding:9px 12px 9px 34px;border:1px solid ${THEME.border};border-radius:4px;font-size:13px;outline:none;
    &:focus{border-color:${THEME.primary};}
`;

const Card = styled.div`background:#fff;border-radius:4px;overflow:hidden;box-shadow:${THEME.cardShadow};`;
const Table = styled.table`width:100%;border-collapse:collapse;`;
const Th = styled.th`
    padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:${THEME.muted};
    background:${THEME.background};border-bottom:1px solid ${THEME.border};
    &:last-child{text-align:center;}
`;
const Td = styled.td`
    padding:10px 12px;font-size:13px;color:${THEME.text};border-bottom:1px solid ${THEME.border};
    &:last-child{text-align:center;}
`;
const Tr = styled.tr`&:hover{background:#F8FAFC;}cursor:pointer;`;
const Badge = styled.span`
    display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;
    background:${p => p.$bg || THEME.background};color:${p => p.$color || THEME.text};
`;
const AmountCell = styled.span`font-weight:600;color:${THEME.text};`;

const Overlay = styled.div`
    position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);
    display:flex;align-items:center;justify-content:center;z-index:1000;
`;
const Modal = styled.div`background:#fff;border-radius:4px;width:520px;max-height:85vh;overflow-y:auto;padding:28px;`;
const ModalTitle = styled.h3`font-size:17px;font-weight:700;color:${THEME.text};margin:0 0 20px;`;
const Row = styled.div`margin-bottom:14px;`;
const Label = styled.label`display:block;font-size:12px;font-weight:600;color:${THEME.muted};margin-bottom:4px;`;
const Input = styled.input`
    width:100%;padding:9px 12px;border:1px solid ${THEME.border};border-radius:4px;font-size:13px;outline:none;
    &:focus{border-color:${THEME.primary};}
`;
const Select = styled.select`
    width:100%;padding:9px 12px;border:1px solid ${THEME.border};border-radius:4px;font-size:13px;outline:none;
`;
const ModalBtns = styled.div`display:flex;gap:8px;justify-content:flex-end;margin-top:20px;`;

const SummaryRow = styled.div`
    display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;
`;
const SummaryCard = styled.div`
    background:#fff;border-radius:4px;padding:16px;box-shadow:${THEME.cardShadow};
`;
const SummaryLabel = styled.div`font-size:12px;color:${THEME.muted};margin-bottom:4px;`;
const SummaryValue = styled.div`font-size:20px;font-weight:700;color:${p => p.$color || THEME.text};`;

const PageNav = styled.div`display:flex;align-items:center;justify-content:center;gap:12px;margin-top:16px;`;
const PageBtn = styled.button`
    padding:6px 14px;border:1px solid ${THEME.border};border-radius:4px;background:#fff;
    font-size:13px;cursor:pointer;color:${THEME.text};
    &:disabled{opacity:0.4;cursor:default;}
`;
const PageInfo = styled.span`font-size:13px;color:${THEME.muted};`;

const Empty = styled.div`padding:40px;text-align:center;color:${THEME.muted};font-size:14px;`;
const Loading = styled.div`padding:60px;text-align:center;color:${THEME.muted};font-size:14px;`;

const STATUS_MAP = {
    pending: { label: "대기", bg: "#FEF3C7", color: "#D97706" },
    approved: { label: "승인", bg: "#D1FAE5", color: "#059669" },
    completed: { label: "완료", bg: "#DBEAFE", color: "#2563EB" },
    rejected: { label: "거절", bg: "#FEE2E2", color: "#DC2626" },
};

const formatDate = (v) => {
    if (!v) return "-";
    const d = v.toDate ? v.toDate() : new Date(v);
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
};

const AdminSettlementPage = () => {
    const { filter } = useParams();
    const tab = filter || "all";
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const [modal, setModal] = useState(null); // null | "detail" | "create"
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState({ proUid: "", proName: "", amount: "", method: "계좌이체", note: "" });
    const PAGE_SIZE = 20;

    const fetchData = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(query(collection(db, COLLECTIONS.SETTLEMENTS), orderBy("createdAt", "desc")));
            setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const filtered = items.filter(it => {
        if (tab !== "all" && it.status !== tab) return false;
        if (search) {
            const s = search.toLowerCase();
            return (it.proName || "").toLowerCase().includes(s) ||
                   (it.proUid || "").toLowerCase().includes(s) ||
                   (it.id || "").toLowerCase().includes(s);
        }
        return true;
    });

    const counts = {
        all: items.length,
        pending: items.filter(i => i.status === "pending").length,
        approved: items.filter(i => i.status === "approved").length,
        completed: items.filter(i => i.status === "completed").length,
        rejected: items.filter(i => i.status === "rejected").length,
    };

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    // 요약 통계
    const totalAmount = items.filter(i => i.status === "completed").reduce((s, i) => s + (i.amount || 0), 0);
    const pendingAmount = items.filter(i => i.status === "pending").reduce((s, i) => s + (i.amount || 0), 0);
    const thisMonthStart = new Date(); thisMonthStart.setDate(1); thisMonthStart.setHours(0,0,0,0);
    const monthCompleted = items.filter(i => {
        if (i.status !== "completed") return false;
        const d = i.completedAt?.toDate ? i.completedAt.toDate() : (i.completedAt ? new Date(i.completedAt) : null);
        return d && d >= thisMonthStart;
    }).reduce((s, i) => s + (i.amount || 0), 0);

    const handleStatusChange = async (item, newStatus) => {
        try {
            const updates = { status: newStatus, updatedAt: Timestamp.now() };
            if (newStatus === "completed") updates.completedAt = Timestamp.now();
            await updateDoc(doc(db, COLLECTIONS.SETTLEMENTS, item.id), updates);
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updates } : i));
        } catch (e) {
            alert("상태 변경 실패: " + e.message);
        }
    };

    const handleCreate = async () => {
        if (!form.proUid || !form.proName || !form.amount) { alert("필수 항목을 입력하세요"); return; }
        try {
            await addDoc(collection(db, COLLECTIONS.SETTLEMENTS), {
                proUid: form.proUid,
                proName: form.proName,
                amount: Number(form.amount),
                method: form.method,
                note: form.note,
                status: "pending",
                createdAt: Timestamp.now(),
            });
            setModal(null);
            setForm({ proUid: "", proName: "", amount: "", method: "계좌이체", note: "" });
            fetchData();
        } catch (e) {
            alert("등록 실패: " + e.message);
        }
    };

    const FILTER_LABELS = { all: "전체 정산", pending: "대기", approved: "승인", completed: "완료", rejected: "거절" };

    if (loading) return <Loading>로딩 중...</Loading>;

    return (
        <Page>
            <Header>
                <Title>{FILTER_LABELS[tab] || "전체 정산"} ({filtered.length}건)</Title>
                <HeaderRight>
                    <Btn onClick={() => setModal("create")}>정산 등록</Btn>
                </HeaderRight>
            </Header>

            <SummaryRow>
                <SummaryCard>
                    <SummaryLabel>총 정산 완료</SummaryLabel>
                    <SummaryValue $color={THEME.primary}>{totalAmount.toLocaleString()}원</SummaryValue>
                </SummaryCard>
                <SummaryCard>
                    <SummaryLabel>대기 금액</SummaryLabel>
                    <SummaryValue $color={THEME.accent}>{pendingAmount.toLocaleString()}원</SummaryValue>
                </SummaryCard>
                <SummaryCard>
                    <SummaryLabel>이번달 정산</SummaryLabel>
                    <SummaryValue $color={THEME.success}>{monthCompleted.toLocaleString()}원</SummaryValue>
                </SummaryCard>
                <SummaryCard>
                    <SummaryLabel>총 건수</SummaryLabel>
                    <SummaryValue>{items.length}건</SummaryValue>
                </SummaryCard>
            </SummaryRow>

            <SearchRow>
                <SearchWrap>
                    <SearchIcon />
                    <SearchInput placeholder="프로명, UID, 정산ID 검색" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
                </SearchWrap>
            </SearchRow>

            <Card>
                <Table>
                    <thead>
                        <tr>
                            <Th>정산ID</Th>
                            <Th>프로명</Th>
                            <Th>금액</Th>
                            <Th>정산방법</Th>
                            <Th>요청일</Th>
                            <Th>상태</Th>
                            <Th>관리</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {paged.length === 0 ? (
                            <tr><Td colSpan={7}><Empty>데이터 없음</Empty></Td></tr>
                        ) : paged.map(it => {
                            const st = STATUS_MAP[it.status] || STATUS_MAP.pending;
                            return (
                                <Tr key={it.id} onClick={() => { setSelected(it); setModal("detail"); }}>
                                    <Td style={{ fontFamily: "monospace", color: THEME.primary }}>{it.id.slice(0, 8)}</Td>
                                    <Td>{it.proName || "-"}</Td>
                                    <Td><AmountCell>{(it.amount || 0).toLocaleString()}원</AmountCell></Td>
                                    <Td>{it.method || "-"}</Td>
                                    <Td>{formatDate(it.createdAt)}</Td>
                                    <Td><Badge $bg={st.bg} $color={st.color}>{st.label}</Badge></Td>
                                    <Td onClick={e => e.stopPropagation()}>
                                        <Select
                                            value={it.status}
                                            onChange={e => handleStatusChange(it, e.target.value)}
                                            style={{ padding: "4px 8px", fontSize: "12px", width: "auto" }}
                                        >
                                            <option value="pending">대기</option>
                                            <option value="approved">승인</option>
                                            <option value="completed">완료</option>
                                            <option value="rejected">거절</option>
                                        </Select>
                                    </Td>
                                </Tr>
                            );
                        })}
                    </tbody>
                </Table>
            </Card>

            {totalPages > 1 && (
                <PageNav>
                    <PageBtn disabled={page === 0} onClick={() => setPage(p => p - 1)}>이전</PageBtn>
                    <PageInfo>{page + 1} / {totalPages}</PageInfo>
                    <PageBtn disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>다음</PageBtn>
                </PageNav>
            )}

            {/* 상세 모달 */}
            {modal === "detail" && selected && (
                <Overlay onClick={() => setModal(null)}>
                    <Modal onClick={e => e.stopPropagation()}>
                        <ModalTitle>정산 상세</ModalTitle>
                        <Row><Label>정산 ID</Label><div style={{ fontSize: 13, fontFamily: "monospace" }}>{selected.id}</div></Row>
                        <Row><Label>프로 UID</Label><div style={{ fontSize: 13 }}>{selected.proUid || "-"}</div></Row>
                        <Row><Label>프로명</Label><div style={{ fontSize: 13 }}>{selected.proName || "-"}</div></Row>
                        <Row><Label>금액</Label><div style={{ fontSize: 16, fontWeight: 700 }}>{(selected.amount || 0).toLocaleString()}원</div></Row>
                        <Row><Label>정산방법</Label><div style={{ fontSize: 13 }}>{selected.method || "-"}</div></Row>
                        <Row><Label>비고</Label><div style={{ fontSize: 13 }}>{selected.note || "-"}</div></Row>
                        <Row><Label>상태</Label>
                            <Select value={selected.status} onChange={e => {
                                handleStatusChange(selected, e.target.value);
                                setSelected(prev => ({ ...prev, status: e.target.value }));
                            }} style={{ width: "auto" }}>
                                <option value="pending">대기</option>
                                <option value="approved">승인</option>
                                <option value="completed">완료</option>
                                <option value="rejected">거절</option>
                            </Select>
                        </Row>
                        <Row><Label>요청일</Label><div style={{ fontSize: 13 }}>{formatDate(selected.createdAt)}</div></Row>
                        <Row><Label>완료일</Label><div style={{ fontSize: 13 }}>{formatDate(selected.completedAt)}</div></Row>
                        <ModalBtns>
                            <Btn $outline onClick={() => setModal(null)}>닫기</Btn>
                        </ModalBtns>
                    </Modal>
                </Overlay>
            )}

            {/* 정산 등록 모달 */}
            {modal === "create" && (
                <Overlay onClick={() => setModal(null)}>
                    <Modal onClick={e => e.stopPropagation()}>
                        <ModalTitle>정산 등록</ModalTitle>
                        <Row><Label>프로 UID *</Label><Input value={form.proUid} onChange={e => setForm(f => ({ ...f, proUid: e.target.value }))} placeholder="프로 UID" /></Row>
                        <Row><Label>프로명 *</Label><Input value={form.proName} onChange={e => setForm(f => ({ ...f, proName: e.target.value }))} placeholder="프로 이름" /></Row>
                        <Row><Label>금액 *</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="정산 금액" /></Row>
                        <Row><Label>정산방법</Label>
                            <Select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                                <option value="계좌이체">계좌이체</option>
                                <option value="카드결제">카드결제</option>
                                <option value="기타">기타</option>
                            </Select>
                        </Row>
                        <Row><Label>비고</Label><Input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="메모" /></Row>
                        <ModalBtns>
                            <Btn $outline onClick={() => setModal(null)}>취소</Btn>
                            <Btn onClick={handleCreate}>등록</Btn>
                        </ModalBtns>
                    </Modal>
                </Overlay>
            )}
        </Page>
    );
};

export default AdminSettlementPage;
