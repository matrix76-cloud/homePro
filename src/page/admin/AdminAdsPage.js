/* eslint-disable */
import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import {
    collection, getDocs, doc, addDoc, updateDoc, deleteDoc,
    query, orderBy, Timestamp
} from "firebase/firestore";
import { db } from "../../api/config";
import { THEME } from "../../config/homeproConfig";

// ─── 위치 옵션 ───
const POSITION_OPTIONS = [
    { value: "상단배너", label: "상단 배너" },
    { value: "중간배너", label: "중간 배너" },
    { value: "설정배너", label: "설정 배너" },
    { value: "팝업", label: "팝업" },
];

const FILTER_MAP = {
    all: null,
    middle: "중간배너",
    settings: "설정배너",
    popup: "팝업",
};

const FILTER_LABELS = {
    all: "상단 배너",
    middle: "중간 배너",
    settings: "설정 배너",
    popup: "팝업 관리",
};

// ─── 상태 판별 ───
const getAdStatus = (ad) => {
    if (!ad.active) return "inactive";
    const now = new Date();
    const end = ad.endDate?.toDate ? ad.endDate.toDate() : new Date(ad.endDate);
    if (end < now) return "expired";
    return "active";
};

const STATUS_MAP = {
    active: { label: "활성", color: THEME.success },
    inactive: { label: "비활성", color: THEME.muted },
    expired: { label: "만료", color: THEME.danger },
};

// ─── 날짜 포맷 ───
const formatDate = (val) => {
    if (!val) return "-";
    const d = val.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString("ko-KR");
};

const toInputDate = (val) => {
    if (!val) return "";
    const d = val.toDate ? val.toDate() : new Date(val);
    return d.toISOString().slice(0, 10);
};

// ─── 초기 폼 ───
const INIT_FORM = {
    title: "",
    imageUrl: "",
    linkUrl: "",
    position: "상단배너",
    startDate: "",
    endDate: "",
    active: true,
};

// ─── Styled Components ───

const Wrap = styled.div``;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
`;

const TitleArea = styled.div``;

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

const PrimaryBtn = styled.button`
    padding: 9px 18px;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    background: ${THEME.primary};
    border: none;
    border-radius: 4px;
    cursor: pointer;
    &:hover { opacity: 0.9; }
`;

const DangerBtn = styled.button`
    padding: 5px 12px;
    font-size: 13px;
    font-weight: 500;
    color: ${THEME.danger};
    background: none;
    border: 1px solid ${THEME.danger};
    border-radius: 4px;
    cursor: pointer;
    &:hover { background: ${THEME.danger}; color: #fff; }
`;

const EditBtn = styled.button`
    padding: 5px 12px;
    font-size: 13px;
    font-weight: 500;
    color: ${THEME.primary};
    background: none;
    border: 1px solid ${THEME.primary};
    border-radius: 4px;
    cursor: pointer;
    margin-right: 6px;
    &:hover { background: ${THEME.primary}; color: #fff; }
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    background: ${THEME.surface};
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid ${THEME.border};
`;

const Th = styled.th`
    padding: 12px 14px;
    font-size: 13px;
    font-weight: 600;
    color: ${THEME.muted};
    background: ${THEME.background};
    text-align: left;
    border-bottom: 1px solid ${THEME.border};
    white-space: nowrap;
`;

const Td = styled.td`
    padding: 12px 14px;
    font-size: 14px;
    color: ${THEME.text};
    border-bottom: 1px solid ${THEME.border};
    vertical-align: middle;
`;

const Badge = styled.span`
    display: inline-block;
    padding: 3px 10px;
    font-size: 12px;
    font-weight: 600;
    color: #fff;
    background: ${({ $color }) => $color};
    border-radius: 4px;
`;

const Empty = styled.div`
    padding: 48px 0;
    text-align: center;
    color: ${THEME.muted};
    font-size: 14px;
`;

// ─── Modal ───

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const Modal = styled.div`
    background: ${THEME.surface};
    border-radius: 4px;
    width: 480px;
    max-width: 92vw;
    max-height: 90vh;
    overflow-y: auto;
    padding: 28px 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
`;

const ModalTitle = styled.h2`
    font-size: 18px;
    font-weight: 700;
    color: ${THEME.text};
    margin: 0 0 20px;
`;

const FormGroup = styled.div`
    margin-bottom: 16px;
`;

const Label = styled.label`
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: ${THEME.text};
    margin-bottom: 6px;
`;

const Input = styled.input`
    width: 100%;
    padding: 9px 12px;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
    &:focus { border-color: ${THEME.primary}; }
`;

const Select = styled.select`
    width: 100%;
    padding: 9px 12px;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    font-size: 14px;
    outline: none;
    background: #fff;
    box-sizing: border-box;
    &:focus { border-color: ${THEME.primary}; }
`;

const CheckRow = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: ${THEME.text};
    cursor: pointer;
`;

const BtnRow = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 24px;
`;

const CancelBtn = styled.button`
    padding: 9px 18px;
    font-size: 14px;
    font-weight: 500;
    color: ${THEME.muted};
    background: ${THEME.background};
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    cursor: pointer;
`;

// ─── Component ───

export default function AdminAdsPage() {
    const { filter } = useParams();
    const currentFilter = filter || "all";
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(INIT_FORM);

    // ── 목록 조회 ──
    const fetchAds = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "ads"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            setAds(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error("광고 목록 조회 실패:", e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAds();
    }, []);

    // ── 폼 변경 ──
    const onChange = (key, val) => setForm((p) => ({ ...p, [key]: val }));

    // ── 등록 / 수정 모달 열기 ──
    const openCreate = () => {
        setEditId(null);
        const defaultPos = positionFilter || "상단배너";
        setForm({ ...INIT_FORM, position: defaultPos });
        setModalOpen(true);
    };

    const openEdit = (ad) => {
        setEditId(ad.id);
        setForm({
            title: ad.title || "",
            imageUrl: ad.imageUrl || "",
            linkUrl: ad.linkUrl || "",
            position: ad.position || "메인상단",
            startDate: toInputDate(ad.startDate),
            endDate: toInputDate(ad.endDate),
            active: ad.active ?? true,
        });
        setModalOpen(true);
    };

    // ── 저장 ──
    const handleSave = async () => {
        if (!form.title.trim()) return alert("제목을 입력하세요.");
        if (!form.startDate || !form.endDate) return alert("기간을 설정하세요.");

        const data = {
            title: form.title.trim(),
            imageUrl: form.imageUrl.trim(),
            linkUrl: form.linkUrl.trim(),
            position: form.position,
            startDate: Timestamp.fromDate(new Date(form.startDate)),
            endDate: Timestamp.fromDate(new Date(form.endDate)),
            active: form.active,
        };

        try {
            if (editId) {
                await updateDoc(doc(db, "ads", editId), data);
            } else {
                await addDoc(collection(db, "ads"), {
                    ...data,
                    clicks: 0,
                    createdAt: Timestamp.now(),
                });
            }
            setModalOpen(false);
            fetchAds();
        } catch (e) {
            console.error("광고 저장 실패:", e);
            alert("저장 중 오류가 발생했습니다.");
        }
    };

    // ── 삭제 ──
    const handleDelete = async (id) => {
        if (!window.confirm("이 광고를 삭제하시겠습니까?")) return;
        try {
            await deleteDoc(doc(db, "ads", id));
            fetchAds();
        } catch (e) {
            console.error("광고 삭제 실패:", e);
        }
    };

    const positionFilter = FILTER_MAP[currentFilter];
    const filtered = useMemo(() => {
        if (!positionFilter && currentFilter === "all") return ads.filter(a => a.position === "상단배너" || !a.position);
        if (positionFilter) return ads.filter(a => a.position === positionFilter);
        return ads;
    }, [ads, currentFilter, positionFilter]);

    return (
        <Wrap>
            <Header>
                <TitleArea>
                    <Title>{FILTER_LABELS[currentFilter] || "광고 관리"} ({filtered.length})</Title>
                    <SubTitle>배너 광고를 등록하고 관리합니다</SubTitle>
                </TitleArea>
                <PrimaryBtn onClick={openCreate}>광고 등록</PrimaryBtn>
            </Header>

            <Table>
                <thead>
                    <tr>
                        <Th>제목</Th>
                        <Th>위치</Th>
                        <Th>기간</Th>
                        <Th>상태</Th>
                        <Th>클릭수</Th>
                        <Th>관리</Th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr>
                            <Td colSpan={6} style={{ textAlign: "center", color: THEME.muted }}>
                                로딩 중...
                            </Td>
                        </tr>
                    ) : filtered.length === 0 ? (
                        <tr>
                            <Td colSpan={6}>
                                <Empty>등록된 광고가 없습니다</Empty>
                            </Td>
                        </tr>
                    ) : (
                        filtered.map((ad) => {
                            const status = getAdStatus(ad);
                            const s = STATUS_MAP[status];
                            return (
                                <tr key={ad.id}>
                                    <Td>{ad.title}</Td>
                                    <Td>{ad.position}</Td>
                                    <Td>
                                        {formatDate(ad.startDate)} ~ {formatDate(ad.endDate)}
                                    </Td>
                                    <Td>
                                        <Badge $color={s.color}>{s.label}</Badge>
                                    </Td>
                                    <Td>{ad.clicks ?? 0}</Td>
                                    <Td>
                                        <EditBtn onClick={() => openEdit(ad)}>수정</EditBtn>
                                        <DangerBtn onClick={() => handleDelete(ad.id)}>삭제</DangerBtn>
                                    </Td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </Table>

            {/* ── 등록/수정 모달 ── */}
            {modalOpen && (
                <Overlay onClick={() => setModalOpen(false)}>
                    <Modal onClick={(e) => e.stopPropagation()}>
                        <ModalTitle>{editId ? "광고 수정" : "광고 등록"}</ModalTitle>

                        <FormGroup>
                            <Label>제목</Label>
                            <Input
                                value={form.title}
                                onChange={(e) => onChange("title", e.target.value)}
                                placeholder="광고 제목"
                            />
                        </FormGroup>

                        <FormGroup>
                            <Label>이미지 URL</Label>
                            <Input
                                value={form.imageUrl}
                                onChange={(e) => onChange("imageUrl", e.target.value)}
                                placeholder="배너 이미지 URL"
                            />
                        </FormGroup>

                        <FormGroup>
                            <Label>링크 URL</Label>
                            <Input
                                value={form.linkUrl}
                                onChange={(e) => onChange("linkUrl", e.target.value)}
                                placeholder="클릭 시 이동할 URL"
                            />
                        </FormGroup>

                        <FormGroup>
                            <Label>위치</Label>
                            <Select
                                value={form.position}
                                onChange={(e) => onChange("position", e.target.value)}
                            >
                                {POSITION_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </Select>
                        </FormGroup>

                        <FormGroup>
                            <Label>시작일</Label>
                            <Input
                                type="date"
                                value={form.startDate}
                                onChange={(e) => onChange("startDate", e.target.value)}
                            />
                        </FormGroup>

                        <FormGroup>
                            <Label>종료일</Label>
                            <Input
                                type="date"
                                value={form.endDate}
                                onChange={(e) => onChange("endDate", e.target.value)}
                            />
                        </FormGroup>

                        <FormGroup>
                            <CheckRow>
                                <input
                                    type="checkbox"
                                    checked={form.active}
                                    onChange={(e) => onChange("active", e.target.checked)}
                                />
                                활성 여부
                            </CheckRow>
                        </FormGroup>

                        <BtnRow>
                            <CancelBtn onClick={() => setModalOpen(false)}>취소</CancelBtn>
                            <PrimaryBtn onClick={handleSave}>
                                {editId ? "수정" : "등록"}
                            </PrimaryBtn>
                        </BtnRow>
                    </Modal>
                </Overlay>
            )}
        </Wrap>
    );
}
