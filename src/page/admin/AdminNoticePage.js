/* eslint-disable */
import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, query, orderBy, Timestamp } from "firebase/firestore";
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
    justify-content: space-between;
    margin-bottom: 16px;
`;

const CountInfo = styled.span`
    font-size: 13px;
    color: ${THEME.muted};
`;

const CreateBtn = styled.button`
    padding: 8px 18px;
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
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    min-width: 680px;
`;

const Th = styled.th`
    text-align: left;
    padding: 10px 14px;
    font-size: 12px;
    font-weight: 600;
    color: ${THEME.muted};
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

const ActionBtn = styled.button`
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 600;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 4px;
    color: #fff;
    background: ${({ $bg }) => $bg || THEME.primary};
    &:hover {
        opacity: 0.85;
    }
`;

const PinBtn = styled.button`
    background: none;
    border: none;
    cursor: pointer;
    font-size: 18px;
    padding: 2px 6px;
    line-height: 1;
    color: ${({ $pinned }) => ($pinned ? THEME.accent : THEME.muted)};
    &:hover {
        opacity: 0.7;
    }
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

const FormSelect = styled.select`
    width: 100%;
    padding: 8px 10px;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    font-size: 13px;
    outline: none;
    background: #fff;
    &:focus {
        border-color: ${THEME.primary};
    }
`;

const FormInput = styled.input`
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

const FormTextarea = styled.textarea`
    width: 100%;
    padding: 8px 10px;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    font-size: 13px;
    outline: none;
    resize: vertical;
    box-sizing: border-box;
    font-family: inherit;
    &:focus {
        border-color: ${THEME.primary};
    }
`;

const CheckboxRow = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: ${THEME.text};
    cursor: pointer;
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

// ─── Helpers ───

const TABS = [
    { key: "all", label: "전체" },
    { key: "공지", label: "공지" },
    { key: "이벤트", label: "이벤트" },
    { key: "안내", label: "안내" },
];

const categoryStyle = {
    "공지": { bg: THEME.primary, color: "#fff" },
    "이벤트": { bg: THEME.accent, color: "#fff" },
    "안내": { bg: THEME.muted, color: "#fff" },
};

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

const INITIAL_FORM = {
    category: "공지",
    title: "",
    content: "",
    pinned: false,
};

// ─── Component ───

const FILTER_LABELS = { all: "전체 공지", pinned: "고정 공지", general: "일반 공지" };

const AdminNoticePage = () => {
    const { filter } = useParams();
    const tab = filter || "all";
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({ ...INITIAL_FORM });
    const [saving, setSaving] = useState(false);

    // fetch notices
    const fetchNotices = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setNotices(list);
        } catch (e) {
            console.error("notices fetch error:", e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchNotices();
    }, []);

    // filter by route
    const filtered = useMemo(() => {
        let base = notices;
        if (tab === "pinned") base = notices.filter((n) => n.pinned);
        else if (tab === "general") base = notices.filter((n) => !n.pinned);
        return [...base].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            const ta = a.createdAt?.seconds || 0;
            const tb = b.createdAt?.seconds || 0;
            return tb - ta;
        });
    }, [notices, tab]);

    // open create modal
    const openCreate = () => {
        setEditId(null);
        setForm({ ...INITIAL_FORM });
        setModalOpen(true);
    };

    // open edit modal
    const openEdit = (notice) => {
        setEditId(notice.id);
        setForm({
            category: notice.category || "공지",
            title: notice.title || "",
            content: notice.content || "",
            pinned: !!notice.pinned,
        });
        setModalOpen(true);
    };

    // close modal
    const closeModal = () => {
        setModalOpen(false);
        setEditId(null);
        setForm({ ...INITIAL_FORM });
    };

    // save (create or update)
    const handleSave = async () => {
        if (!form.title.trim()) {
            alert("제목을 입력하세요.");
            return;
        }
        setSaving(true);
        try {
            if (editId) {
                // update
                await updateDoc(doc(db, "notices", editId), {
                    category: form.category,
                    title: form.title.trim(),
                    content: form.content.trim(),
                    pinned: form.pinned,
                    updatedAt: Timestamp.now(),
                });
                setNotices((prev) =>
                    prev.map((n) =>
                        n.id === editId
                            ? { ...n, category: form.category, title: form.title.trim(), content: form.content.trim(), pinned: form.pinned, updatedAt: Timestamp.now() }
                            : n
                    )
                );
            } else {
                // create
                const docData = {
                    category: form.category,
                    title: form.title.trim(),
                    content: form.content.trim(),
                    pinned: form.pinned,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                };
                const ref = await addDoc(collection(db, "notices"), docData);
                setNotices((prev) => [{ id: ref.id, ...docData }, ...prev]);
            }
            closeModal();
        } catch (err) {
            console.error("save error:", err);
            alert("저장 중 오류가 발생했습니다.");
        }
        setSaving(false);
    };

    // toggle pinned
    const handleTogglePin = async (notice) => {
        const newPinned = !notice.pinned;
        try {
            await updateDoc(doc(db, "notices", notice.id), { pinned: newPinned });
            setNotices((prev) =>
                prev.map((n) => (n.id === notice.id ? { ...n, pinned: newPinned } : n))
            );
        } catch (err) {
            console.error("pin toggle error:", err);
            alert("고정 변경 중 오류가 발생했습니다.");
        }
    };

    // delete
    const handleDelete = async (notice) => {
        if (!window.confirm(`"${notice.title}" 공지를 삭제하시겠습니까?`)) return;
        try {
            await deleteDoc(doc(db, "notices", notice.id));
            setNotices((prev) => prev.filter((n) => n.id !== notice.id));
        } catch (err) {
            console.error("delete error:", err);
            alert("삭제 중 오류가 발생했습니다.");
        }
    };

    // render category badge
    const renderCategory = (category) => {
        const style = categoryStyle[category] || categoryStyle["안내"];
        return <Badge $bg={style.bg} $color={style.color}>{category}</Badge>;
    };

    return (
        <Wrap>
            <Header>
                <Title>{FILTER_LABELS[tab] || "전체 공지"} ({filtered.length}건)</Title>
                <SubTitle>공지사항을 등록하고 관리합니다</SubTitle>
            </Header>

            <TopRow>
                <CountInfo>{filtered.length}건</CountInfo>
                <CreateBtn onClick={openCreate}>공지 작성</CreateBtn>
            </TopRow>

            {loading ? (
                <LoadingWrap>공지사항을 불러오는 중...</LoadingWrap>
            ) : (
                <TableWrap>
                    <Table>
                        <thead>
                            <tr>
                                <Th>분류</Th>
                                <Th>제목</Th>
                                <Th>작성일</Th>
                                <Th style={{ textAlign: "center" }}>고정</Th>
                                <Th>관리</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <Td colSpan={5}>
                                        <EmptyRow>등록된 공지사항이 없습니다.</EmptyRow>
                                    </Td>
                                </tr>
                            ) : (
                                filtered.map((n) => (
                                    <Tr key={n.id}>
                                        <Td>{renderCategory(n.category)}</Td>
                                        <Td style={{ whiteSpace: "normal", maxWidth: 300 }}>{n.title}</Td>
                                        <Td>{formatDate(n.createdAt)}</Td>
                                        <Td style={{ textAlign: "center" }}>
                                            <PinBtn $pinned={n.pinned} onClick={() => handleTogglePin(n)}>
                                                {n.pinned ? "\u2605" : "\u2606"}
                                            </PinBtn>
                                        </Td>
                                        <Td>
                                            <ActionBtn $bg={THEME.primary} onClick={() => openEdit(n)}>수정</ActionBtn>
                                            <ActionBtn $bg={THEME.danger} onClick={() => handleDelete(n)}>삭제</ActionBtn>
                                        </Td>
                                    </Tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </TableWrap>
            )}

            {/* ─── Create / Edit Modal ─── */}
            {modalOpen && (
                <Overlay onClick={closeModal}>
                    <ModalCard onClick={(e) => e.stopPropagation()}>
                        <ModalTitle>{editId ? "공지 수정" : "공지 작성"}</ModalTitle>

                        <FormGroup>
                            <FormLabel>분류</FormLabel>
                            <FormSelect
                                value={form.category}
                                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                            >
                                <option value="공지">공지</option>
                                <option value="이벤트">이벤트</option>
                                <option value="안내">안내</option>
                            </FormSelect>
                        </FormGroup>

                        <FormGroup>
                            <FormLabel>제목</FormLabel>
                            <FormInput
                                type="text"
                                placeholder="공지 제목을 입력하세요"
                                value={form.title}
                                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                            />
                        </FormGroup>

                        <FormGroup>
                            <FormLabel>내용</FormLabel>
                            <FormTextarea
                                rows={5}
                                placeholder="공지 내용을 입력하세요"
                                value={form.content}
                                onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                            />
                        </FormGroup>

                        <FormGroup>
                            <CheckboxRow>
                                <input
                                    type="checkbox"
                                    checked={form.pinned}
                                    onChange={(e) => setForm((prev) => ({ ...prev, pinned: e.target.checked }))}
                                />
                                상단 고정
                            </CheckboxRow>
                        </FormGroup>

                        <ModalBtnRow>
                            <ModalCloseBtn onClick={closeModal}>취소</ModalCloseBtn>
                            <ModalBtn onClick={handleSave} disabled={saving}>
                                {saving ? "저장중..." : "저장"}
                            </ModalBtn>
                        </ModalBtnRow>
                    </ModalCard>
                </Overlay>
            )}
        </Wrap>
    );
};

export default AdminNoticePage;
