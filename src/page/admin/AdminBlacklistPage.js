/* eslint-disable */
/* 관리자 — 블랙리스트 신고 관리 (형 지시 7/31)
 * 신고 건 확인 → 중대 사안이면 [권한 차단]: users.orderBlocked=true (오더 작성·수락 차단)
 * 반려하면 공개 게시판에서 내려감. 차단 해제도 여기서. */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../api/config";
import { THEME } from "../../config/homeproConfig";
import { IoCloseOutline } from "react-icons/io5";
import {
    getAllBlacklistReports, updateBlacklistReportStatus, setUserOrderBlocked,
} from "../../service/BlacklistService";

const TAB_LIST = [
    { key: "pending", label: "확인중" },
    { key: "confirmed", label: "권한차단" },
    { key: "dismissed", label: "반려" },
];

const STATUS_STYLE = {
    pending: { label: "확인중", bg: "#D97706" },
    confirmed: { label: "권한차단", bg: THEME.danger },
    dismissed: { label: "반려", bg: THEME.muted },
};

const formatDate = (v) => {
    if (!v) return "-";
    const d = v.toDate ? v.toDate() : (v.seconds ? new Date(v.seconds * 1000) : new Date(v));
    if (isNaN(d.getTime())) return "-";
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

const AdminBlacklistPage = () => {
    const { filter } = useParams();
    const activeTab = filter || "pending";
    const [reports, setReports] = useState([]);
    const [users, setUsers] = useState({});
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [busy, setBusy] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [list, usersSnap] = await Promise.all([
                getAllBlacklistReports().catch(() => []),
                getDocs(collection(db, "users")).catch(() => ({ docs: [] })),
            ]);
            setReports(list);
            const uMap = {};
            usersSnap.docs.forEach(d => { uMap[d.id] = d.data(); });
            setUsers(uMap);
        } catch (e) {
            console.error("블랙리스트 조회 실패:", e);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filtered = useMemo(
        () => reports.filter(r => (r.status || "pending") === activeTab),
        [reports, activeTab]
    );
    const getTabCount = (key) => reports.filter(r => (r.status || "pending") === key).length;
    const uInfo = (uid) => users[uid] || {};
    const uName = (uid) => {
        const u = uInfo(uid);
        return u.companyName || u.nickname || u.name || (uid ? uid.substring(0, 8) : "-");
    };

    const applyStatus = async (report, status, orderBlocked, confirmMsg) => {
        if (busy) return;
        if (confirmMsg && !window.confirm(confirmMsg)) return;
        setBusy(true);
        try {
            await updateBlacklistReportStatus(report.id, status);
            if (typeof orderBlocked === "boolean" && report.targetUid) {
                await setUserOrderBlocked(report.targetUid, orderBlocked);
            }
            setReports(prev => prev.map(r => r.id === report.id ? { ...r, status } : r));
            if (selected?.id === report.id) setSelected(prev => ({ ...prev, status }));
        } catch (e) {
            alert("처리 중 오류가 발생했습니다.");
        }
        setBusy(false);
    };

    const handleConfirm = (r) => applyStatus(r, "confirmed", true,
        `중대 사안으로 판단하여 [${uName(r.targetUid)}] 사용자의 오더 작성·수락 권한을 차단하시겠습니까?`);
    const handleDismiss = (r) => applyStatus(r, "dismissed", false,
        "신고를 반려하시겠습니까? 반려하면 공개 블랙리스트 게시판에서 내려갑니다.");
    const handleRelease = (r) => applyStatus(r, "dismissed", false,
        `[${uName(r.targetUid)}] 사용자의 권한 차단을 해제하시겠습니까? (신고 건은 반려 처리되어 게시판에서 내려갑니다)`);
    const handleReopen = (r) => applyStatus(r, "pending", null, "재검토(확인중)로 되돌리시겠습니까?");

    const renderActions = (r) => {
        const st = r.status || "pending";
        if (st === "pending") return (
            <>
                <ActionBtn $bg={THEME.danger} onClick={() => handleConfirm(r)} disabled={busy}>권한 차단</ActionBtn>
                <ActionBtn $bg={THEME.muted} onClick={() => handleDismiss(r)} disabled={busy}>반려</ActionBtn>
            </>
        );
        if (st === "confirmed") return (
            <ActionBtn $bg={THEME.success} onClick={() => handleRelease(r)} disabled={busy}>차단 해제</ActionBtn>
        );
        return (
            <ActionBtn $bg={THEME.primary} onClick={() => handleReopen(r)} disabled={busy}>재검토</ActionBtn>
        );
    };

    return (
        <Wrap>
            <Header>
                <Title>블랙리스트 관리</Title>
                <RefreshBtn onClick={fetchData}>새로고침</RefreshBtn>
            </Header>

            <TabBar>
                {TAB_LIST.map(t => (
                    <TabItem key={t.key} $active={activeTab === t.key}
                        as="a" href={t.key === "pending" ? "/admin/blacklist" : `/admin/blacklist/${t.key}`}>
                        {t.label}
                        <TabCount $active={activeTab === t.key}>{getTabCount(t.key)}</TabCount>
                    </TabItem>
                ))}
            </TabBar>

            {loading ? (
                <EmptyMsg>불러오는 중...</EmptyMsg>
            ) : filtered.length === 0 ? (
                <EmptyMsg>해당 상태의 신고 건이 없습니다.</EmptyMsg>
            ) : (
                <TableWrap>
                    <Table>
                        <thead>
                            <tr>
                                <Th>신고일</Th>
                                <Th>신고 대상</Th>
                                <Th>게시판 표기</Th>
                                <Th>신고자</Th>
                                <Th>사유</Th>
                                <Th>증빙</Th>
                                <Th>상태</Th>
                                <Th>관리</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(r => {
                                const st = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
                                return (
                                    <Tr key={r.id} onClick={() => setSelected(r)}>
                                        <Td>{formatDate(r.createdAt)}</Td>
                                        <Td><strong>{uName(r.targetUid)}</strong></Td>
                                        <Td>{r.targetNameMasked || "-"} / {r.targetPhoneMasked || "-"}</Td>
                                        <Td>{uName(r.reporterUid)}</Td>
                                        <Td>{r.reasonType || r.reason || "기타"}</Td>
                                        <Td>{Array.isArray(r.imgs) && r.imgs.length ? `${r.imgs.length}장` : "-"}</Td>
                                        <Td><Badge $bg={st.bg}>{st.label}</Badge></Td>
                                        <Td onClick={e => e.stopPropagation()}>{renderActions(r)}</Td>
                                    </Tr>
                                );
                            })}
                        </tbody>
                    </Table>
                </TableWrap>
            )}

            {/* 상세 모달 */}
            {selected && (
                <Overlay onClick={() => setSelected(null)}>
                    <Modal onClick={e => e.stopPropagation()}>
                        <ModalHeader>
                            <ModalTitle>신고 상세</ModalTitle>
                            <CloseBtn onClick={() => setSelected(null)}><IoCloseOutline size={22} /></CloseBtn>
                        </ModalHeader>
                        <ModalBody>
                            <Section>
                                <SectionTitle>신고 대상</SectionTitle>
                                <InfoRow><IL>이름/업체</IL><IV>{uName(selected.targetUid)}</IV></InfoRow>
                                <InfoRow><IL>전화번호</IL><IV>{uInfo(selected.targetUid).phone || uInfo(selected.targetUid).phoneNumber || "-"}</IV></InfoRow>
                                <InfoRow><IL>게시판 표기</IL><IV>{selected.targetNameMasked || "-"} / {selected.targetPhoneMasked || "-"}</IV></InfoRow>
                                <InfoRow><IL>UID</IL><IV>{selected.targetUid || "-"}</IV></InfoRow>
                            </Section>
                            <Section>
                                <SectionTitle>신고 내용</SectionTitle>
                                <InfoRow><IL>신고자</IL><IV>{uName(selected.reporterUid)}</IV></InfoRow>
                                <InfoRow><IL>신고일</IL><IV>{formatDate(selected.createdAt)}</IV></InfoRow>
                                <InfoRow><IL>사유</IL><IV>{selected.reasonType || selected.reason || "기타"}</IV></InfoRow>
                                <InfoRow><IL>내용</IL><IV style={{ whiteSpace: "pre-wrap" }}>{selected.content || "-"}</IV></InfoRow>
                            </Section>
                            {Array.isArray(selected.imgs) && selected.imgs.length > 0 && (
                                <Section>
                                    <SectionTitle>증빙 캡처</SectionTitle>
                                    <PhotoGrid>
                                        {selected.imgs.map((src, i) => (
                                            <a key={i} href={src} target="_blank" rel="noreferrer"><Photo src={src} alt={`증빙 ${i + 1}`} /></a>
                                        ))}
                                    </PhotoGrid>
                                </Section>
                            )}
                            <ActionSection>{renderActions(selected)}</ActionSection>
                        </ModalBody>
                    </Modal>
                </Overlay>
            )}
        </Wrap>
    );
};

export default AdminBlacklistPage;

// ─── Styled ───

const Wrap = styled.div``;
const Header = styled.div`display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;`;
const Title = styled.h1`font-size: 24px; font-weight: 700; color: ${THEME.text}; margin: 0;`;
const RefreshBtn = styled.button`padding: 8px 16px; font-size: 15px; font-weight: 600; color: ${THEME.primary}; background: ${THEME.surface}; border: 1px solid ${THEME.border}; border-radius: 4px; cursor: pointer; &:hover { background: ${THEME.background}; }`;

const TabBar = styled.div`display: flex; gap: 4px; margin-bottom: 16px;`;
const TabItem = styled.a`
    display: flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 15px; text-decoration: none;
    font-weight: ${p => p.$active ? 700 : 500};
    color: ${p => p.$active ? "#fff" : THEME.text};
    background: ${p => p.$active ? THEME.primary : THEME.surface};
    border: 1px solid ${p => p.$active ? THEME.primary : THEME.border};
    border-radius: 4px; cursor: pointer; &:hover { opacity: 0.85; }
`;
const TabCount = styled.span`font-size: 13px; font-weight: 600; color: ${p => p.$active ? "rgba(255,255,255,0.8)" : THEME.muted};`;

const EmptyMsg = styled.div`text-align: center; padding: 60px 0; color: ${THEME.muted}; font-size: 16px;`;

const TableWrap = styled.div`background: #fff; border-radius: 4px; overflow-x: auto; border: 1px solid ${THEME.border};`;
const Table = styled.table`width: 100%; border-collapse: collapse; min-width: 820px;`;
const Th = styled.th`text-align: left; padding: 10px 14px; font-size: 14px; font-weight: 600; color: ${THEME.muted}; background: ${THEME.background}; border-bottom: 1px solid ${THEME.border}; white-space: nowrap;`;
const Td = styled.td`padding: 10px 14px; font-size: 15px; color: ${THEME.text}; border-bottom: 1px solid ${THEME.border}; white-space: nowrap;`;
const Tr = styled.tr`cursor: pointer; &:hover { background: ${THEME.background}; }`;

const Badge = styled.span`display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 13px; font-weight: 600; color: #fff; background: ${p => p.$bg || THEME.muted};`;
const ActionBtn = styled.button`padding: 4px 10px; font-size: 14px; font-weight: 600; border: none; border-radius: 4px; cursor: pointer; margin-right: 4px; color: #fff; background: ${p => p.$bg || THEME.primary}; &:hover { opacity: 0.85; } &:disabled { opacity: 0.5; }`;

const Overlay = styled.div`position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000;`;
const Modal = styled.div`background: #fff; border-radius: 6px; width: 600px; max-height: 88vh; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.18);`;
const ModalHeader = styled.div`display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid ${THEME.border};`;
const ModalTitle = styled.h3`font-size: 20px; font-weight: 700; color: ${THEME.text}; margin: 0;`;
const CloseBtn = styled.button`background: none; border: none; cursor: pointer; color: ${THEME.muted}; padding: 4px; border-radius: 4px; display: flex; &:hover { background: ${THEME.background}; }`;
const ModalBody = styled.div`padding: 20px 24px; overflow-y: auto; flex: 1;`;

const Section = styled.div`margin-bottom: 20px;`;
const SectionTitle = styled.div`font-size: 15px; font-weight: 700; color: ${THEME.primary}; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid ${THEME.border};`;
const InfoRow = styled.div`display: flex; padding: 5px 0; gap: 12px; font-size: 15px;`;
const IL = styled.div`flex: 0 0 90px; color: ${THEME.muted}; font-weight: 600;`;
const IV = styled.div`flex: 1; color: ${THEME.text}; word-break: break-all;`;

const PhotoGrid = styled.div`display: flex; gap: 8px; flex-wrap: wrap;`;
const Photo = styled.img`width: 100px; height: 100px; border-radius: 6px; object-fit: cover; border: 1px solid ${THEME.border};`;

const ActionSection = styled.div`margin-top: 8px; padding-top: 16px; border-top: 1px solid ${THEME.border}; display: flex; gap: 8px;`;
