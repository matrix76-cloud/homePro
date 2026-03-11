/* eslint-disable */
import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { collection, getDocs, doc, addDoc, query, orderBy, where, Timestamp } from "firebase/firestore";
import { db } from "../../api/config";
import { THEME } from "../../config/homeproConfig";

// ─── Styled Components ───

const Wrap = styled.div``;

const Header = styled.div`
    margin-bottom: 20px;
`;

const Title = styled.h1`
    font-size: 22px;
    font-weight: 700;
    color: ${THEME.text};
    margin: 0 0 4px;
`;

const SubTitle = styled.p`
    font-size: 13px;
    color: ${THEME.muted};
    margin: 0;
`;

const TabRow = styled.div`
    display: flex;
    gap: 0;
    border-bottom: 1px solid ${THEME.border};
    margin-bottom: 16px;
`;

const Tab = styled.button`
    padding: 10px 20px;
    font-size: 14px;
    font-weight: ${({ $active }) => ($active ? "700" : "500")};
    color: ${({ $active }) => ($active ? THEME.primary : THEME.muted)};
    background: none;
    border: none;
    border-bottom: 2px solid ${({ $active }) => ($active ? THEME.primary : "transparent")};
    cursor: pointer;
    transition: all 0.15s;
    &:hover {
        color: ${THEME.primary};
    }
`;

const TopRow = styled.div`
    display: flex;
    align-items: center;
    margin-bottom: 16px;
    gap: 12px;
`;

const SearchBar = styled.div`
    position: relative;
    max-width: 360px;
`;

const SearchIcon = styled.span`
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: ${THEME.muted};
    font-size: 15px;
    pointer-events: none;
`;

const SearchInput = styled.input`
    width: 100%;
    padding: 9px 12px 9px 36px;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    font-size: 14px;
    outline: none;
    background: #fff;
    &:focus {
        border-color: ${THEME.primary};
    }
`;

const CountInfo = styled.span`
    font-size: 13px;
    color: ${THEME.muted};
    margin-left: auto;
`;

const AddBtn = styled.button`
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    color: #fff;
    background: ${THEME.primary};
    &:hover {
        opacity: 0.85;
    }
`;

const TableWrap = styled.div`
    background: #fff;
    border-radius: 4px;
    overflow-x: auto;
    box-shadow: ${THEME.cardShadow};
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    min-width: 700px;
`;

const Th = styled.th`
    text-align: left;
    padding: 10px 14px;
    font-size: 12px;
    font-weight: 600;
    color: ${THEME.textSecondary};
    background: ${THEME.background};
    border-bottom: 1px solid ${THEME.border};
    white-space: nowrap;
`;

const Td = styled.td`
    padding: 10px 14px;
    font-size: 13px;
    color: ${THEME.text};
    border-bottom: 1px solid ${THEME.border};
    white-space: nowrap;
`;

const Tr = styled.tr`
    transition: background 0.12s;
    &:hover {
        background: ${THEME.background};
    }
`;

const Badge = styled.span`
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    color: ${({ $color }) => $color || "#fff"};
    background: ${({ $bg }) => $bg || THEME.muted};
`;

const AmountText = styled.span`
    font-weight: 600;
    color: ${({ $type }) =>
        $type === "earn" ? THEME.success :
        $type === "refund" ? THEME.primary :
        THEME.danger};
`;

const PaginationRow = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    padding: 16px 0;
`;

const PageBtn = styled.button`
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    background: #fff;
    color: ${THEME.text};
    cursor: pointer;
    &:disabled {
        opacity: 0.4;
        cursor: default;
    }
    &:hover:not(:disabled) {
        background: ${THEME.background};
    }
`;

const PageInfo = styled.span`
    font-size: 13px;
    color: ${THEME.textSecondary};
`;

const EmptyRow = styled.div`
    text-align: center;
    padding: 40px 0;
    color: ${THEME.muted};
    font-size: 14px;
`;

const LoadingWrap = styled.div`
    text-align: center;
    padding: 60px 0;
    color: ${THEME.muted};
    font-size: 14px;
`;

// ─── Modal Styled ───

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const ModalCard = styled.div`
    background: #fff;
    border-radius: 4px;
    width: 480px;
    max-height: 85vh;
    overflow-y: auto;
    padding: 28px 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
`;

const ModalTitle = styled.h3`
    font-size: 18px;
    font-weight: 700;
    color: ${THEME.text};
    margin: 0 0 20px;
`;

const FormGroup = styled.div`
    margin-bottom: 14px;
`;

const FormLabel = styled.label`
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: ${THEME.muted};
    margin-bottom: 6px;
`;

const ModalInput = styled.input`
    width: 100%;
    padding: 8px 10px;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
    &:focus {
        border-color: ${THEME.primary};
    }
`;

const ModalSelect = styled.select`
    width: 100%;
    padding: 8px 10px;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    font-size: 13px;
    outline: none;
    background: #fff;
    box-sizing: border-box;
    &:focus {
        border-color: ${THEME.primary};
    }
`;

const ModalBtnRow = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
`;

const ModalBtn = styled.button`
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 600;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    color: #fff;
    background: ${({ $bg }) => $bg || THEME.primary};
    &:disabled {
        opacity: 0.5;
        cursor: default;
    }
    &:hover:not(:disabled) {
        opacity: 0.85;
    }
`;

const ModalCloseBtn = styled.button`
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    cursor: pointer;
    color: ${THEME.text};
    background: #fff;
    &:hover {
        background: ${THEME.background};
    }
`;

// ─── Helpers ───

const TABS = [
    { key: "all", label: "전체" },
    { key: "earn", label: "적립" },
    { key: "use", label: "사용" },
    { key: "refund", label: "환불" },
];

const TYPE_MAP = {
    earn: { label: "적립", bg: THEME.success, color: "#fff" },
    use: { label: "사용", bg: THEME.danger, color: "#fff" },
    refund: { label: "환불", bg: THEME.primary, color: "#fff" },
};

const PAGE_SIZE = 20;

const formatDate = (v) => {
    if (!v) return "-";
    let d;
    if (v.toDate) d = v.toDate();
    else if (v.seconds) d = new Date(v.seconds * 1000);
    else d = new Date(v);
    if (isNaN(d.getTime())) return "-";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}.${m}.${day}`;
};

const formatAmount = (type, amount) => {
    const num = Number(amount) || 0;
    const sign = type === "use" ? "-" : "+";
    return `${sign}${num.toLocaleString()}원`;
};

// ─── Component ───

const FILTER_LABELS = { all: "전체 내역", earn: "적립 내역", use: "사용 내역", refund: "환불 내역" };

const AdminPointsPage = () => {
    const { filter } = useParams();
    const tab = filter || "all";
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        uid: "",
        userName: "",
        type: "earn",
        amount: "",
        reason: "",
    });

    // fetch records
    const fetchRecords = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "homepro_cash"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setRecords(list);
        } catch (e) {
            console.error("cash fetch error:", e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    // filter by tab
    const tabFiltered = useMemo(() => {
        if (tab === "all") return records;
        return records.filter((r) => r.type === tab);
    }, [records, tab]);

    // filter by search
    const filtered = useMemo(() => {
        if (!search.trim()) return tabFiltered;
        const q = search.trim().toLowerCase();
        return tabFiltered.filter((r) => {
            const name = (r.userName || "").toLowerCase();
            const phone = (r.phone || "").replace(/-/g, "");
            return name.includes(q) || phone.includes(q);
        });
    }, [tabFiltered, search]);

    // pagination
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    useEffect(() => {
        setPage(1);
    }, [tab, search]);

    // modal handlers
    const openModal = () => {
        setForm({ uid: "", userName: "", type: "earn", amount: "", reason: "" });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
    };

    const handleFormChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!form.uid.trim()) { alert("회원 UID를 입력하세요."); return; }
        if (!form.userName.trim()) { alert("회원명을 입력하세요."); return; }
        if (!form.amount || Number(form.amount) <= 0) { alert("금액을 올바르게 입력하세요."); return; }
        if (!form.reason.trim()) { alert("사유를 입력하세요."); return; }

        setSaving(true);
        try {
            const docData = {
                uid: form.uid.trim(),
                userName: form.userName.trim(),
                phone: "",
                type: form.type,
                amount: Number(form.amount),
                reason: form.reason.trim(),
                createdAt: Timestamp.now(),
            };
            await addDoc(collection(db, "homepro_cash"), docData);
            closeModal();
            fetchRecords();
        } catch (err) {
            console.error("add cash error:", err);
            alert("포인트 처리 중 오류가 발생했습니다.");
        }
        setSaving(false);
    };

    // render type badge
    const renderType = (type) => {
        const info = TYPE_MAP[type] || { label: type || "-", bg: THEME.muted, color: "#fff" };
        return <Badge $bg={info.bg} $color={info.color}>{info.label}</Badge>;
    };

    return (
        <Wrap>
            <Header>
                <Title>{FILTER_LABELS[tab] || "전체 내역"} ({filtered.length}건)</Title>
                <SubTitle>회원 포인트 적립, 사용, 환불 내역을 관리합니다</SubTitle>
            </Header>

            <TopRow>
                <SearchBar>
                    <SearchIcon>&#x1F50D;</SearchIcon>
                    <SearchInput
                        placeholder="회원명, 전화번호 검색"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </SearchBar>
                <CountInfo>검색 결과 {filtered.length}건</CountInfo>
                <AddBtn onClick={openModal}>포인트 지급/차감</AddBtn>
            </TopRow>

            {loading ? (
                <LoadingWrap>내역을 불러오는 중...</LoadingWrap>
            ) : (
                <>
                    <TableWrap>
                        <Table>
                            <thead>
                                <tr>
                                    <Th>회원명</Th>
                                    <Th>유형</Th>
                                    <Th>금액</Th>
                                    <Th>사유</Th>
                                    <Th>날짜</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {paged.length === 0 ? (
                                    <tr>
                                        <Td colSpan={5}>
                                            <EmptyRow>해당 조건의 내역이 없습니다.</EmptyRow>
                                        </Td>
                                    </tr>
                                ) : (
                                    paged.map((r) => (
                                        <Tr key={r.id}>
                                            <Td>{r.userName || "-"}</Td>
                                            <Td>{renderType(r.type)}</Td>
                                            <Td>
                                                <AmountText $type={r.type}>
                                                    {formatAmount(r.type, r.amount)}
                                                </AmountText>
                                            </Td>
                                            <Td>{r.reason || "-"}</Td>
                                            <Td>{formatDate(r.createdAt)}</Td>
                                        </Tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </TableWrap>

                    <PaginationRow>
                        <PageBtn disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                            이전
                        </PageBtn>
                        <PageInfo>{page} / {totalPages}</PageInfo>
                        <PageBtn disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                            다음
                        </PageBtn>
                    </PaginationRow>
                </>
            )}

            {/* ─── 포인트 지급/차감 Modal ─── */}
            {showModal && (
                <Overlay onClick={closeModal}>
                    <ModalCard onClick={(e) => e.stopPropagation()}>
                        <ModalTitle>포인트 지급/차감</ModalTitle>

                        <FormGroup>
                            <FormLabel>회원 UID</FormLabel>
                            <ModalInput
                                type="text"
                                placeholder="회원 UID 입력"
                                value={form.uid}
                                onChange={(e) => handleFormChange("uid", e.target.value)}
                            />
                        </FormGroup>

                        <FormGroup>
                            <FormLabel>회원명</FormLabel>
                            <ModalInput
                                type="text"
                                placeholder="회원명 입력"
                                value={form.userName}
                                onChange={(e) => handleFormChange("userName", e.target.value)}
                            />
                        </FormGroup>

                        <FormGroup>
                            <FormLabel>유형</FormLabel>
                            <ModalSelect
                                value={form.type}
                                onChange={(e) => handleFormChange("type", e.target.value)}
                            >
                                <option value="earn">적립</option>
                                <option value="use">사용</option>
                                <option value="refund">환불</option>
                            </ModalSelect>
                        </FormGroup>

                        <FormGroup>
                            <FormLabel>금액</FormLabel>
                            <ModalInput
                                type="number"
                                placeholder="금액 입력"
                                value={form.amount}
                                onChange={(e) => handleFormChange("amount", e.target.value)}
                            />
                        </FormGroup>

                        <FormGroup>
                            <FormLabel>사유</FormLabel>
                            <ModalInput
                                type="text"
                                placeholder="사유 입력"
                                value={form.reason}
                                onChange={(e) => handleFormChange("reason", e.target.value)}
                            />
                        </FormGroup>

                        <ModalBtnRow>
                            <ModalCloseBtn onClick={closeModal}>취소</ModalCloseBtn>
                            <ModalBtn onClick={handleSubmit} disabled={saving}>
                                {saving ? "처리중..." : "등록"}
                            </ModalBtn>
                        </ModalBtnRow>
                    </ModalCard>
                </Overlay>
            )}
        </Wrap>
    );
};

export default AdminPointsPage;
