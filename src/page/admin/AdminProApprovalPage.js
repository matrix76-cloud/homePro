/* eslint-disable */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { collection, getDocs, doc, updateDoc, addDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../api/config";
import { THEME, CATEGORIES } from "../../config/homeproConfig";
import { IoSearchOutline, IoCloseOutline } from "react-icons/io5";

const PAGE_SIZE = 20;

const TAB_LIST = [
    { key: "pending", label: "대기중" },
    { key: "approved", label: "승인완료" },
    { key: "rejected", label: "반려" },
];

const STATUS_STYLE = {
    pending: { label: "대기중", bg: "#D97706", color: "#fff" },
    approved: { label: "승인", bg: THEME.success, color: "#fff" },
    rejected: { label: "반려", bg: THEME.danger, color: "#fff" },
};

const getCategoryName = (id) => {
    const cat = CATEGORIES.find(c => c.id === id);
    return cat ? cat.shortName : id || "-";
};

const formatDate = (v) => {
    if (!v) return "-";
    let d;
    if (v.toDate) d = v.toDate();
    else if (v.seconds) d = new Date(v.seconds * 1000);
    else d = new Date(v);
    if (isNaN(d.getTime())) return "-";
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

const AdminProApprovalPage = () => {
    const { filter } = useParams();
    const activeTab = filter || "pending";
    const [pros, setPros] = useState([]);
    const [users, setUsers] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(null);
    const [rejectReason, setRejectReason] = useState("");
    const [busy, setBusy] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [prosSnap, usersSnap] = await Promise.all([
                getDocs(query(collection(db, "homepro_pros"), orderBy("appliedAt", "desc"))).catch(() => ({ docs: [] })),
                getDocs(collection(db, "users")).catch(() => ({ docs: [] })),
            ]);
            setPros(prosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            const uMap = {};
            usersSnap.docs.forEach(d => { uMap[d.id] = d.data(); });
            setUsers(uMap);
        } catch (e) {
            console.error("프로 목록 조회 실패:", e);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filtered = useMemo(() => {
        let list = pros.filter(p => (p.status || "pending") === activeTab);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(p => {
                const u = users[p.uid] || {};
                const name = (u.name || u.nickname || "").toLowerCase();
                const cat = getCategoryName(p.categoryId).toLowerCase();
                return name.includes(q) || cat.includes(q);
            });
        }
        return list;
    }, [pros, activeTab, search, users]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    useEffect(() => { setPage(1); }, [activeTab, search]);

    const getTabCount = (key) => pros.filter(p => (p.status || "pending") === key).length;

    const handleApprove = async (pro) => {
        if (busy) return;
        setBusy(true);
        try {
            await updateDoc(doc(db, "homepro_pros", pro.id), {
                status: "approved",
                approvedAt: serverTimestamp(),
            });
            // 푸시 알림 발송
            if (pro.uid) {
                const catName = getCategoryName(pro.categoryId);
                await addDoc(collection(db, "notifications"), {
                    targetUids: [pro.uid],
                    title: "전문분야 승인완료",
                    body: `${catName} 전문분야가 승인되었습니다. 이제 견적을 보낼 수 있습니다!`,
                    type: "pro_approval",
                    sent: false,
                    createdAt: serverTimestamp(),
                });
            }
            setPros(prev => prev.map(p => p.id === pro.id ? { ...p, status: "approved" } : p));
            if (selected?.id === pro.id) setSelected(prev => ({ ...prev, status: "approved" }));
        } catch (e) {
            alert("승인 처리 중 오류가 발생했습니다.");
        }
        setBusy(false);
    };

    const handleReject = async (pro, reason) => {
        if (busy) return;
        if (!reason?.trim()) { alert("반려 사유를 입력해주세요."); return; }
        setBusy(true);
        try {
            await updateDoc(doc(db, "homepro_pros", pro.id), {
                status: "rejected",
                rejectedAt: serverTimestamp(),
                rejectReason: reason.trim(),
            });
            // 푸시 알림 발송
            if (pro.uid) {
                const catName = getCategoryName(pro.categoryId);
                await addDoc(collection(db, "notifications"), {
                    targetUids: [pro.uid],
                    title: "전문분야 반려",
                    body: `${catName} 전문분야가 반려되었습니다. 사유: ${reason.trim()}`,
                    type: "pro_rejection",
                    sent: false,
                    createdAt: serverTimestamp(),
                });
            }
            setPros(prev => prev.map(p => p.id === pro.id ? { ...p, status: "rejected", rejectReason: reason.trim() } : p));
            if (selected?.id === pro.id) setSelected(prev => ({ ...prev, status: "rejected", rejectReason: reason.trim() }));
            setRejectReason("");
        } catch (e) {
            alert("반려 처리 중 오류가 발생했습니다.");
        }
        setBusy(false);
    };

    const openDetail = (pro) => {
        setSelected(pro);
        setRejectReason("");
    };

    const getUserInfo = (uid) => users[uid] || {};

    return (
        <Wrap>
            <Header>
                <Title>프로 승인관리</Title>
                <RefreshBtn onClick={fetchData}>새로고침</RefreshBtn>
            </Header>

            <TabBar>
                {TAB_LIST.map(t => (
                    <TabItem key={t.key} $active={activeTab === t.key}
                        onClick={() => window.location.hash = ""}
                        as="a" href={t.key === "pending" ? "/admin/pro-approval" : `/admin/pro-approval/${t.key}`}>
                        {t.label}
                        <TabCount $active={activeTab === t.key}>{getTabCount(t.key)}</TabCount>
                    </TabItem>
                ))}
            </TabBar>

            <SearchBar>
                <SearchIcon><IoSearchOutline size={16} /></SearchIcon>
                <SearchInput placeholder="프로 이름, 카테고리 검색" value={search}
                    onChange={(e) => setSearch(e.target.value)} />
            </SearchBar>

            {loading ? (
                <EmptyMsg>불러오는 중...</EmptyMsg>
            ) : paged.length === 0 ? (
                <EmptyMsg>해당 조건의 프로가 없습니다.</EmptyMsg>
            ) : (
                <>
                    <TableWrap>
                        <Table>
                            <thead>
                                <tr>
                                    <Th>프로 이름</Th>
                                    <Th>카테고리</Th>
                                    <Th>지역</Th>
                                    <Th>등록일</Th>
                                    <Th>상태</Th>
                                    <Th>관리</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {paged.map(p => {
                                    const u = getUserInfo(p.uid);
                                    const st = STATUS_STYLE[p.status] || STATUS_STYLE.pending;
                                    return (
                                        <Tr key={p.id} onClick={() => openDetail(p)}>
                                            <Td><strong>{u.name || u.nickname || p.uid?.substring(0, 8) || "-"}</strong></Td>
                                            <Td>{getCategoryName(p.categoryId)}</Td>
                                            <Td>{p.region ? `${p.region.sido || ""} ${p.region.gu || ""}`.trim() : "-"}</Td>
                                            <Td>{formatDate(p.appliedAt)}</Td>
                                            <Td><Badge $bg={st.bg} $color={st.color}>{st.label}</Badge></Td>
                                            <Td onClick={e => e.stopPropagation()}>
                                                {(p.status === "pending" || !p.status) && (
                                                    <>
                                                        <ActionBtn $bg={THEME.success} onClick={() => handleApprove(p)} disabled={busy}>승인</ActionBtn>
                                                        <ActionBtn $bg={THEME.danger} onClick={() => { openDetail(p); }} disabled={busy}>반려</ActionBtn>
                                                    </>
                                                )}
                                                {p.status === "rejected" && (
                                                    <ActionBtn $bg={THEME.success} onClick={() => handleApprove(p)} disabled={busy}>재승인</ActionBtn>
                                                )}
                                            </Td>
                                        </Tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </TableWrap>

                    <PaginationRow>
                        <PageBtn disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</PageBtn>
                        <PageInfo>{page} / {totalPages}</PageInfo>
                        <PageBtn disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>다음</PageBtn>
                    </PaginationRow>
                </>
            )}

            {/* 상세 모달 */}
            {selected && (
                <Overlay onClick={() => setSelected(null)}>
                    <Modal onClick={e => e.stopPropagation()}>
                        <ModalHeader>
                            <ModalTitle>프로 상세 정보</ModalTitle>
                            <CloseBtn onClick={() => setSelected(null)}><IoCloseOutline size={22} /></CloseBtn>
                        </ModalHeader>
                        <ModalBody>
                            <Section>
                                <SectionTitle>프로 정보</SectionTitle>
                                <InfoRow><IL>이름</IL><IV>{getUserInfo(selected.uid).name || getUserInfo(selected.uid).nickname || "-"}</IV></InfoRow>
                                <InfoRow><IL>전화번호</IL><IV>{getUserInfo(selected.uid).phone || "-"}</IV></InfoRow>
                                <InfoRow><IL>이메일</IL><IV>{getUserInfo(selected.uid).email || "-"}</IV></InfoRow>
                            </Section>

                            <Section>
                                <SectionTitle>등록 정보</SectionTitle>
                                <InfoRow><IL>카테고리</IL><IV>{getCategoryName(selected.categoryId)}</IV></InfoRow>
                                {selected.detail?.subcategories?.length > 0 && (
                                    <InfoRow><IL>세부분류</IL><IV>{selected.detail.subcategories.join(", ")}</IV></InfoRow>
                                )}
                                {selected.detail?.career && (
                                    <InfoRow><IL>경력</IL><IV>{selected.detail.career}</IV></InfoRow>
                                )}
                                <InfoRow><IL>지역</IL><IV>{selected.region ? `${selected.region.sido || ""} ${selected.region.gu || ""}`.trim() : "-"}</IV></InfoRow>
                                <InfoRow><IL>등록일</IL><IV>{formatDate(selected.appliedAt)}</IV></InfoRow>
                                {selected.approvedAt && (
                                    <InfoRow><IL>승인일</IL><IV>{formatDate(selected.approvedAt)}</IV></InfoRow>
                                )}
                                <InfoRow>
                                    <IL>상태</IL>
                                    <IV><Badge $bg={STATUS_STYLE[selected.status]?.bg} $color="#fff">{STATUS_STYLE[selected.status]?.label || "대기중"}</Badge></IV>
                                </InfoRow>
                                {selected.rejectReason && (
                                    <InfoRow><IL>반려 사유</IL><IV style={{ color: THEME.danger }}>{selected.rejectReason}</IV></InfoRow>
                                )}
                            </Section>

                            {selected.licenseUrl && (
                                <Section>
                                    <SectionTitle>사업자등록증</SectionTitle>
                                    <LicenseImg src={selected.licenseUrl} alt="사업자등록증" />
                                </Section>
                            )}

                            {selected.photoUrls?.length > 0 && (
                                <Section>
                                    <SectionTitle>활동 사진</SectionTitle>
                                    <PhotoGrid>
                                        {selected.photoUrls.map((url, i) => (
                                            <Photo key={i} src={url} alt={`활동사진 ${i + 1}`} />
                                        ))}
                                    </PhotoGrid>
                                </Section>
                            )}

                            {/* 상세 정보 (detail 객체) */}
                            {selected.detail && Object.keys(selected.detail).filter(k => k !== "subcategories" && k !== "career").length > 0 && (
                                <Section>
                                    <SectionTitle>추가 정보</SectionTitle>
                                    {Object.entries(selected.detail)
                                        .filter(([k]) => k !== "subcategories" && k !== "career")
                                        .map(([k, v]) => (
                                            <InfoRow key={k}><IL>{k}</IL><IV>{Array.isArray(v) ? v.join(", ") : String(v)}</IV></InfoRow>
                                        ))}
                                </Section>
                            )}

                            {/* 액션 버튼 */}
                            {(selected.status === "pending" || !selected.status) && (
                                <ActionSection>
                                    <RejectArea>
                                        <RejectInput placeholder="반려 사유 입력" value={rejectReason}
                                            onChange={e => setRejectReason(e.target.value)} />
                                        <BigBtn $bg={THEME.danger} onClick={() => handleReject(selected, rejectReason)} disabled={busy}>
                                            반려
                                        </BigBtn>
                                    </RejectArea>
                                    <BigBtn $bg={THEME.success} onClick={() => handleApprove(selected)} disabled={busy}>
                                        승인
                                    </BigBtn>
                                </ActionSection>
                            )}
                            {selected.status === "rejected" && (
                                <ActionSection>
                                    <BigBtn $bg={THEME.success} onClick={() => handleApprove(selected)} disabled={busy}>
                                        재승인
                                    </BigBtn>
                                </ActionSection>
                            )}
                        </ModalBody>
                    </Modal>
                </Overlay>
            )}
        </Wrap>
    );
};

export default AdminProApprovalPage;

// ─── Styled ───

const Wrap = styled.div``;
const Header = styled.div`display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;`;
const Title = styled.h1`font-size: 22px; font-weight: 700; color: ${THEME.text}; margin: 0;`;
const RefreshBtn = styled.button`padding: 8px 16px; font-size: 13px; font-weight: 600; color: ${THEME.primary}; background: ${THEME.surface}; border: 1px solid ${THEME.border}; border-radius: 4px; cursor: pointer; &:hover { background: ${THEME.background}; }`;

const TabBar = styled.div`display: flex; gap: 4px; margin-bottom: 16px;`;
const TabItem = styled.a`
    display: flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 13px; text-decoration: none;
    font-weight: ${p => p.$active ? 700 : 500};
    color: ${p => p.$active ? "#fff" : THEME.text};
    background: ${p => p.$active ? THEME.primary : THEME.surface};
    border: 1px solid ${p => p.$active ? THEME.primary : THEME.border};
    border-radius: 4px; cursor: pointer; &:hover { opacity: 0.85; }
`;
const TabCount = styled.span`font-size: 11px; font-weight: 600; color: ${p => p.$active ? "rgba(255,255,255,0.8)" : THEME.muted};`;

const SearchBar = styled.div`position: relative; margin-bottom: 16px; max-width: 360px;`;
const SearchIcon = styled.span`position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: ${THEME.muted}; pointer-events: none;`;
const SearchInput = styled.input`width: 100%; padding: 9px 12px 9px 36px; border: 1px solid ${THEME.border}; border-radius: 4px; font-size: 14px; outline: none; background: #fff; &:focus { border-color: ${THEME.primary}; }`;

const EmptyMsg = styled.div`text-align: center; padding: 60px 0; color: ${THEME.muted}; font-size: 14px;`;

const TableWrap = styled.div`background: #fff; border-radius: 4px; overflow-x: auto; border: 1px solid ${THEME.border};`;
const Table = styled.table`width: 100%; border-collapse: collapse; min-width: 700px;`;
const Th = styled.th`text-align: left; padding: 10px 14px; font-size: 12px; font-weight: 600; color: ${THEME.muted}; background: ${THEME.background}; border-bottom: 1px solid ${THEME.border}; white-space: nowrap;`;
const Td = styled.td`padding: 10px 14px; font-size: 13px; color: ${THEME.text}; border-bottom: 1px solid ${THEME.border}; white-space: nowrap;`;
const Tr = styled.tr`cursor: pointer; &:hover { background: ${THEME.background}; }`;

const Badge = styled.span`display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; color: ${p => p.$color || "#fff"}; background: ${p => p.$bg || THEME.muted};`;
const ActionBtn = styled.button`padding: 4px 10px; font-size: 12px; font-weight: 600; border: none; border-radius: 4px; cursor: pointer; margin-right: 4px; color: #fff; background: ${p => p.$bg || THEME.primary}; &:hover { opacity: 0.85; } &:disabled { opacity: 0.5; }`;

const PaginationRow = styled.div`display: flex; justify-content: center; align-items: center; gap: 12px; padding: 16px 0;`;
const PageBtn = styled.button`padding: 6px 14px; font-size: 13px; font-weight: 600; border: 1px solid ${THEME.border}; border-radius: 4px; background: #fff; color: ${THEME.text}; cursor: pointer; &:disabled { opacity: 0.4; }`;
const PageInfo = styled.span`font-size: 13px; color: ${THEME.muted};`;

// ─── Modal ───
const Overlay = styled.div`position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000;`;
const Modal = styled.div`background: #fff; border-radius: 6px; width: 600px; max-height: 88vh; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.18);`;
const ModalHeader = styled.div`display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid ${THEME.border};`;
const ModalTitle = styled.h3`font-size: 18px; font-weight: 700; color: ${THEME.text}; margin: 0;`;
const CloseBtn = styled.button`background: none; border: none; cursor: pointer; color: ${THEME.muted}; padding: 4px; border-radius: 4px; display: flex; &:hover { background: ${THEME.background}; }`;
const ModalBody = styled.div`padding: 20px 24px; overflow-y: auto; flex: 1;`;

const Section = styled.div`margin-bottom: 20px;`;
const SectionTitle = styled.div`font-size: 13px; font-weight: 700; color: ${THEME.primary}; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid ${THEME.border};`;
const InfoRow = styled.div`display: flex; padding: 5px 0; gap: 12px; font-size: 13px;`;
const IL = styled.div`flex: 0 0 80px; color: ${THEME.muted}; font-weight: 600;`;
const IV = styled.div`flex: 1; color: ${THEME.text}; word-break: break-all;`;

const LicenseImg = styled.img`max-width: 100%; max-height: 300px; border-radius: 6px; border: 1px solid ${THEME.border};`;
const PhotoGrid = styled.div`display: flex; gap: 8px; flex-wrap: wrap;`;
const Photo = styled.img`width: 100px; height: 100px; border-radius: 6px; object-fit: cover; border: 1px solid ${THEME.border};`;

const ActionSection = styled.div`margin-top: 20px; padding-top: 16px; border-top: 1px solid ${THEME.border}; display: flex; flex-direction: column; gap: 10px;`;
const RejectArea = styled.div`display: flex; gap: 8px;`;
const RejectInput = styled.input`flex: 1; padding: 8px 10px; border: 1px solid ${THEME.border}; border-radius: 4px; font-size: 13px; outline: none; &:focus { border-color: ${THEME.primary}; }`;
const BigBtn = styled.button`padding: 10px 24px; font-size: 14px; font-weight: 600; border: none; border-radius: 4px; cursor: pointer; color: #fff; background: ${p => p.$bg}; &:hover { opacity: 0.85; } &:disabled { opacity: 0.5; }`;
