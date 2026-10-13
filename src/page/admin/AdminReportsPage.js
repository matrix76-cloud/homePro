/* eslint-disable */
/* 관리자 — 글·댓글·채팅 신고 관리 (애플 심사 1.2, 2026-10-01)
 * 신고 건 확인 → [가리기]: 글·댓글에 hidden 표시(목록·상세에서 안 보임), 되살리기도 여기서.
 * 채팅 신고는 가릴 대상이 없어 확인 후 [반려] 또는 블랙리스트 관리에서 권한 차단으로 처리한다. */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import styled from "styled-components";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../api/config";
import { THEME } from "../../config/homeproConfig";
import { getAllReports, updateReportStatus, REPORT_TARGET_LABEL } from "../../service/ReportService";
import { setPostHidden, setCommentHidden } from "../../service/CommunityService";

const TAB_LIST = [
    { key: "pending", label: "확인중" },
    { key: "hidden", label: "가림 처리" },
    { key: "dismissed", label: "반려" },
];
const STATUS_TEXT = {
    pending: { label: "확인중", color: "#B45309" },
    hidden: { label: "가림 처리", color: THEME.danger },
    dismissed: { label: "반려", color: THEME.text },
};

const formatDate = (v) => {
    if (!v) return "-";
    const d = v.toDate ? v.toDate() : (v.seconds ? new Date(v.seconds * 1000) : new Date(v));
    if (isNaN(d.getTime())) return "-";
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const AdminReportsPage = () => {
    const [activeTab, setActiveTab] = useState("pending");
    const [reports, setReports] = useState([]);
    const [users, setUsers] = useState({});
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [list, usersSnap] = await Promise.all([
                getAllReports().catch(() => []),
                getDocs(collection(db, "users")).catch(() => ({ docs: [] })),
            ]);
            setReports(list);
            const uMap = {};
            usersSnap.docs.forEach(d => { uMap[d.id] = d.data(); });
            setUsers(uMap);
        } catch (e) {
            console.error("신고 조회 실패:", e);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filtered = useMemo(
        () => reports.filter(r => (r.status || "pending") === activeTab),
        [reports, activeTab]
    );
    const getTabCount = (key) => reports.filter(r => (r.status || "pending") === key).length;
    const uName = (uid, fallback) => {
        const u = users[uid] || {};
        return u.companyName || u.nickname || u.name || fallback || (uid ? uid.substring(0, 8) : "-");
    };

    // 글·댓글 가리기/되살리기 + 신고 상태 변경
    const applyStatus = async (r, status, confirmMsg) => {
        if (busy) return;
        if (confirmMsg && !window.confirm(confirmMsg)) return;
        setBusy(true);
        try {
            const hide = status === "hidden";
            if (r.targetType === "post" && r.postId) await setPostHidden(r.postId, hide);
            if (r.targetType === "comment" && r.postId && r.commentId) await setCommentHidden(r.postId, r.commentId, hide);
            await updateReportStatus(r.id, status);
            setReports(prev => prev.map(x => x.id === r.id ? { ...x, status } : x));
        } catch (e) {
            alert("처리 중 오류가 발생했습니다.");
        }
        setBusy(false);
    };

    const renderActions = (r) => {
        const st = r.status || "pending";
        const canHide = r.targetType === "post" || r.targetType === "comment";
        if (st === "pending") return (
            <>
                {canHide && <ActionBtn onClick={() => applyStatus(r, "hidden", "이 글(댓글)을 가리시겠습니까? 모든 사용자에게 보이지 않게 됩니다.")} disabled={busy}>가리기</ActionBtn>}
                <ActionBtn onClick={() => applyStatus(r, "dismissed", "신고를 반려하시겠습니까?")} disabled={busy}>반려</ActionBtn>
            </>
        );
        if (st === "hidden") return (
            <ActionBtn onClick={() => applyStatus(r, "dismissed", "가림을 풀고 신고를 반려 처리하시겠습니까?")} disabled={busy}>되살리기</ActionBtn>
        );
        return <ActionBtn onClick={() => applyStatus(r, "pending", "재검토(확인중)로 되돌리시겠습니까?")} disabled={busy}>재검토</ActionBtn>;
    };

    return (
        <Wrap>
            <Header>
                <Title>신고 관리</Title>
                <RefreshBtn onClick={fetchData}>새로고침</RefreshBtn>
            </Header>

            <TabBar>
                {TAB_LIST.map(t => (
                    <TabItem key={t.key} type="button" $active={activeTab === t.key} onClick={() => setActiveTab(t.key)}>
                        {t.label} {getTabCount(t.key)}
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
                                <Th>구분</Th>
                                <Th>작성자</Th>
                                <Th>신고된 내용</Th>
                                <Th>사유</Th>
                                <Th>신고자</Th>
                                <Th>상태</Th>
                                <Th>관리</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(r => {
                                const st = STATUS_TEXT[r.status] || STATUS_TEXT.pending;
                                return (
                                    <tr key={r.id}>
                                        <Td $nowrap>{formatDate(r.createdAt)}</Td>
                                        <Td $nowrap>{REPORT_TARGET_LABEL[r.targetType] || r.targetType || "-"}</Td>
                                        <Td $nowrap><strong>{uName(r.targetUid, r.targetName)}</strong></Td>
                                        <Td>
                                            {r.snippet || "-"}
                                            {r.targetType !== "chat" && r.postId && <> <a href={`/community/${r.postId}`} target="_blank" rel="noreferrer">글 열기</a></>}
                                        </Td>
                                        <Td>{r.reasonType || "기타"}{r.content ? ` — ${r.content}` : ""}</Td>
                                        <Td $nowrap>{uName(r.reporterUid)}</Td>
                                        <Td $nowrap style={{ color: st.color, fontWeight: 700 }}>{st.label}</Td>
                                        <Td $nowrap>{renderActions(r)}</Td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                </TableWrap>
            )}
        </Wrap>
    );
};

export default AdminReportsPage;

// ─── Styled ───

const Wrap = styled.div``;
const Header = styled.div`display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;`;
const Title = styled.h1`font-size: 24px; font-weight: 700; color: ${THEME.text}; margin: 0;`;
const RefreshBtn = styled.button`padding: 8px 16px; font-size: 15px; font-weight: 600; color: ${THEME.text}; background: ${THEME.surface}; border: 1px solid #D9DDE3; border-radius: 4px; cursor: pointer; &:hover { background: ${THEME.background}; }`;

/* 탭 — 한 박스로 묶고 사이에만 세로선, 열린 탭은 연회색 면 + 굵은 글씨 */
const TabBar = styled.div`display: inline-flex; border: 1px solid #D9DDE3; margin-bottom: 16px;`;
const TabItem = styled.button`
    padding: 9px 18px; font-size: 15px; font-family: inherit; cursor: pointer; border: none;
    font-weight: ${p => p.$active ? 700 : 500};
    color: ${THEME.text};
    background: ${p => p.$active ? "#e9ecf1" : "#fff"};
    & + & { border-left: 1px solid #D9DDE3; }
`;

const EmptyMsg = styled.div`text-align: center; padding: 60px 0; color: ${THEME.text}; font-size: 16px; min-height: 240px;`;

const TableWrap = styled.div`background: #fff; overflow-x: auto; border: 1px solid #D9DDE3; min-height: 240px;`;
const Table = styled.table`width: 100%; border-collapse: collapse; min-width: 980px;`;
const Th = styled.th`text-align: left; padding: 10px 14px; font-size: 14px; font-weight: 700; color: ${THEME.text}; background: ${THEME.background}; border-bottom: 1px solid #D9DDE3; white-space: nowrap;`;
const Td = styled.td`
    padding: 10px 14px; font-size: 15px; line-height: 1.5; color: ${THEME.text}; border-bottom: 1px solid #E5E7EB; vertical-align: top;
    white-space: ${p => p.$nowrap ? "nowrap" : "pre-wrap"}; word-break: keep-all;
    a { color: ${THEME.primaryDark}; font-weight: 600; }
`;
const ActionBtn = styled.button`padding: 6px 12px; font-size: 14px; font-weight: 600; font-family: inherit; border: 1px solid #D9DDE3; border-radius: 4px; cursor: pointer; margin-right: 6px; color: ${THEME.text}; background: #fff; &:hover { border-color: ${THEME.text}; } &:disabled { opacity: 0.5; }`;
