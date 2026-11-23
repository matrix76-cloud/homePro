/* eslint-disable */
import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import {
    collection, getDocs, doc, addDoc, updateDoc, deleteDoc,
    query, orderBy, Timestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../api/config";
import { THEME } from "../../config/homeproConfig";
import { ChatBannerPreview, CHAT_BANNER_POSITION } from "../../components/ChatTopBanner";

// ─── 위치 옵션 ───
const POSITION_OPTIONS = [
    { value: "상단배너", label: "상단 배너" },
    { value: "중간배너", label: "중간 배너" },
    { value: "설정배너", label: "설정 배너" },
    { value: "팝업", label: "팝업" },
    // 채팅 탭 맨 위 롤링 배너 — 이벤트 · 공지 · 파트너십 안내 (대표 리뷰 11/19). 앱의 ChatTopBanner 가 읽는다
    { value: CHAT_BANNER_POSITION, label: "채팅 상단 배너" },
];

const FILTER_MAP = {
    all: null,
    middle: "중간배너",
    settings: "설정배너",
    popup: "팝업",
    chat: CHAT_BANNER_POSITION,
};

const FILTER_LABELS = {
    all: "상단 배너",
    middle: "중간 배너",
    settings: "설정 배너",
    popup: "팝업 관리",
    chat: "채팅 상단 배너",
};

// ─── 상태 판별 ───
const getAdStatus = (ad) => {
    if (!ad.active) return "inactive";
    const now = new Date();
    const end = ad.endDate?.toDate ? ad.endDate.toDate() : new Date(ad.endDate);
    if (end < now) return "expired";
    const start = ad.startDate?.toDate ? ad.startDate.toDate() : ad.startDate ? new Date(ad.startDate) : null;
    if (start && start > now) return "scheduled"; // 시작일 전 — 앱에는 아직 안 보인다
    return "active";
};

const STATUS_MAP = {
    active: { label: "활성", color: THEME.success },
    inactive: { label: "비활성", color: THEME.muted },
    expired: { label: "만료", color: THEME.danger },
    scheduled: { label: "예정", color: THEME.muted },
};

// ─── 날짜 포맷 ───
const formatDate = (val) => {
    if (!val) return "-";
    const d = val.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString("ko-KR");
};

// 날짜는 한국 시간 기준으로 다룬다 — 시작일 0시부터 종료일 밤 11시 59분까지 보인다
// (예전엔 UTC 0시로 저장돼 종료일 아침 9시에 만료됐다)
const KST_MS = 9 * 3600000;
const toInputDate = (val) => {
    if (!val) return "";
    const d = val.toDate ? val.toDate() : new Date(val);
    if (Number.isNaN(d.getTime())) return "";
    return new Date(d.getTime() + KST_MS).toISOString().slice(0, 10);
};
const kstDayStart = (ymd) => new Date(`${ymd}T00:00:00+09:00`);
const kstDayEnd = (ymd) => new Date(`${ymd}T23:59:59+09:00`);

// ─── 초기 폼 ───
const INIT_FORM = {
    title: "",
    desc: "",
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
    font-size: 24px;
    font-weight: 700;
    color: ${THEME.text};
    margin: 0 0 4px;
`;

const SubTitle = styled.p`
    font-size: 15px;
    color: ${THEME.muted};
    margin: 0;
`;

const PrimaryBtn = styled.button`
    padding: 9px 18px;
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    background: ${THEME.button};
    border: none;
    border-radius: 4px;
    cursor: pointer;
    &:hover { opacity: 0.9; }
`;

const DangerBtn = styled.button`
    padding: 5px 12px;
    font-size: 15px;
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
    font-size: 15px;
    font-weight: 500;
    color: ${THEME.primary};
    background: none;
    border: 1px solid ${THEME.primary};
    border-radius: 4px;
    cursor: pointer;
    margin-right: 6px;
    &:hover { background: ${THEME.button}; color: #fff; }
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
    font-size: 15px;
    font-weight: 600;
    color: ${THEME.muted};
    background: ${THEME.background};
    text-align: left;
    border-bottom: 1px solid ${THEME.border};
    white-space: nowrap;
`;

const Td = styled.td`
    padding: 12px 14px;
    font-size: 16px;
    color: ${THEME.text};
    border-bottom: 1px solid ${THEME.border};
    vertical-align: middle;
`;

const Badge = styled.span`
    display: inline-block;
    padding: 3px 10px;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    background: ${({ $color }) => $color};
    border-radius: 4px;
`;

const Empty = styled.div`
    padding: 48px 0;
    text-align: center;
    color: ${THEME.muted};
    font-size: 16px;
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
    font-size: 20px;
    font-weight: 700;
    color: ${THEME.text};
    margin: 0 0 20px;
`;

const FormGroup = styled.div`
    margin-bottom: 16px;
`;

const Label = styled.label`
    display: block;
    font-size: 15px;
    font-weight: 600;
    color: ${THEME.text};
    margin-bottom: 6px;
`;

const Input = styled.input`
    width: 100%;
    padding: 9px 12px;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    font-size: 16px;
    outline: none;
    box-sizing: border-box;
    &:focus { border-color: ${THEME.primary}; }
`;

const Select = styled.select`
    width: 100%;
    padding: 9px 12px;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    font-size: 16px;
    outline: none;
    background: #fff;
    box-sizing: border-box;
    &:focus { border-color: ${THEME.primary}; }
`;

const CheckRow = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
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
    font-size: 16px;
    font-weight: 500;
    color: ${THEME.muted};
    background: ${THEME.background};
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    cursor: pointer;
`;

const Hint = styled.p`
    margin: 6px 0 0;
    font-size: 14px;
    line-height: 1.5;
    color: ${THEME.textSecondary};
    word-break: keep-all;
`;

const UploadRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
`;

const UploadBtn = styled.label`
    display: inline-flex;
    align-items: center;
    padding: 8px 14px;
    font-size: 15px;
    font-weight: 500;
    color: ${THEME.text};
    background: #fff;
    border: 1px solid #cfd5dd;
    border-radius: 4px;
    cursor: pointer;
    &:hover { background: ${THEME.background}; }
    input { display: none; }
`;

const TitleSub = styled.div`
    margin-top: 2px;
    font-size: 14px;
    color: ${THEME.textSecondary};
`;

const PreviewBox = styled.div`
    width: 366px; /* 폰 폭 390 에서 좌우 여백 12 를 뺀 실제 배너 폭 */
    max-width: 100%;
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
    const [uploading, setUploading] = useState(false);

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
            desc: ad.desc || "",
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

        if (form.endDate < form.startDate) return alert("종료일이 시작일보다 앞에 있습니다.");
        if (uploading) return alert("그림을 올리는 중입니다. 잠시 뒤 다시 눌러 주세요.");

        const data = {
            title: form.title.trim(),
            desc: (form.desc || "").trim(), // 채팅 상단 배너의 둘째 줄
            imageUrl: form.imageUrl.trim(),
            linkUrl: form.linkUrl.trim(),
            position: form.position,
            startDate: Timestamp.fromDate(kstDayStart(form.startDate)),
            endDate: Timestamp.fromDate(kstDayEnd(form.endDate)),
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

    // ── 그림 올리기 — 저장소에 올리고 주소를 이미지 URL 칸에 넣는다 ──
    const handleUpload = async (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = "";
        if (!file) return;
        if (!/^image\//.test(file.type)) return alert("그림 파일만 올릴 수 있습니다.");
        if (file.size > 3 * 1024 * 1024) return alert("그림은 3MB 이하로 올려 주세요.");
        setUploading(true);
        try {
            const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
            const r = ref(storage, `ads/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`);
            await uploadBytes(r, file, { contentType: file.type });
            const url = await getDownloadURL(r);
            onChange("imageUrl", url);
        } catch (err) {
            console.error("그림 올리기 실패:", err);
            alert("그림을 올리지 못했습니다. 다시 시도해 주세요.");
        }
        setUploading(false);
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
    const isChatFilter = positionFilter === CHAT_BANNER_POSITION;
    const isChatForm = form.position === CHAT_BANNER_POSITION;
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
                    <SubTitle>
                        {isChatFilter
                            ? "앱 채팅 탭 맨 위에서 5초마다 넘어가는 배너입니다. 여기 올린 배너가 기본 3장(기술전수 수강생 모집 · 거래장터 · 양도·매매) 앞에 붙어 함께 돕니다."
                            : "배너 광고를 등록하고 관리합니다"}
                    </SubTitle>
                </TitleArea>
                <PrimaryBtn onClick={openCreate}>{isChatFilter ? "배너 등록" : "광고 등록"}</PrimaryBtn>
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
                                <Empty>{isChatFilter ? "올린 배너가 없습니다. 지금은 기본 3장만 돌고 있습니다" : "등록된 광고가 없습니다"}</Empty>
                            </Td>
                        </tr>
                    ) : (
                        filtered.map((ad) => {
                            const status = getAdStatus(ad);
                            const s = STATUS_MAP[status];
                            return (
                                <tr key={ad.id}>
                                    <Td>
                                        {ad.title}
                                        {ad.desc ? <TitleSub>{ad.desc}</TitleSub> : null}
                                    </Td>
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
                        <ModalTitle>{isChatForm ? (editId ? "배너 수정" : "배너 등록") : (editId ? "광고 수정" : "광고 등록")}</ModalTitle>

                        {isChatForm && (
                            <FormGroup>
                                <Label>미리보기</Label>
                                <PreviewBox>
                                    <ChatBannerPreview title={form.title} desc={form.desc} imageUrl={form.imageUrl.trim()} />
                                </PreviewBox>
                            </FormGroup>
                        )}

                        <FormGroup>
                            <Label>제목</Label>
                            <Input
                                value={form.title}
                                onChange={(e) => onChange("title", e.target.value)}
                                placeholder={isChatForm ? "배너 첫 줄 (예: 12월 오픈 이벤트 안내)" : "광고 제목"}
                            />
                        </FormGroup>

                        {isChatForm && (
                            <FormGroup>
                                <Label>설명 (둘째 줄, 선택)</Label>
                                <Input
                                    value={form.desc}
                                    onChange={(e) => onChange("desc", e.target.value)}
                                    placeholder="제목 아래 작은 글씨 한 줄"
                                />
                            </FormGroup>
                        )}

                        <FormGroup>
                            <Label>{isChatForm ? "그림 (선택)" : "이미지 URL"}</Label>
                            <Input
                                value={form.imageUrl}
                                onChange={(e) => onChange("imageUrl", e.target.value)}
                                placeholder={isChatForm ? "그림 주소 — 아래 버튼으로 올리면 자동으로 들어갑니다" : "배너 이미지 URL"}
                            />
                            <UploadRow>
                                <UploadBtn>
                                    {uploading ? "올리는 중…" : "그림 올리기"}
                                    <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
                                </UploadBtn>
                                {form.imageUrl.trim() && !uploading && (
                                    <CancelBtn type="button" onClick={() => onChange("imageUrl", "")}>그림 빼기</CancelBtn>
                                )}
                            </UploadRow>
                            {isChatForm && <Hint>배너 오른쪽에 작게(정사각형) 들어갑니다. 정사각형 그림을 권합니다. 비워 두면 확성기 그림이 들어갑니다.</Hint>}
                        </FormGroup>

                        <FormGroup>
                            <Label>{isChatForm ? "눌렀을 때 갈 곳 (선택)" : "링크 URL"}</Label>
                            <Input
                                value={form.linkUrl}
                                onChange={(e) => onChange("linkUrl", e.target.value)}
                                placeholder={isChatForm ? "예: /notice  또는  https://…" : "클릭 시 이동할 URL"}
                            />
                            {isChatForm && <Hint>앱 안 화면은 / 로 시작하는 경로(공지사항 /notice, 커뮤니티 /community 등), 바깥 사이트는 https 로 시작하는 주소를 적습니다. 비워 두면 눌러도 이동하지 않는 안내 배너가 됩니다.</Hint>}
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
                            <Hint>시작일 0시부터 종료일 밤까지 보입니다.</Hint>
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
