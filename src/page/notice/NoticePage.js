/* eslint-disable */
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../api/config";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoChevronDown, IoChevronUp } from "react-icons/io5";
import usePcWide from "../../hooks/usePcWide";

const formatDate = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

const NoticePage = () => {
    const pcWide = usePcWide();
    const [openId, setOpenId] = useState(null);
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
                const snap = await getDocs(q);
                setNotices(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error("공지사항 로드 실패:", e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const toggle = (id) => setOpenId(openId === id ? null : id);

    return (
        <SimpleBackLayout NAME="공지사항" hideFooter>
            <Wrap>
                <ListBox>
                {pcWide && <PcHead><span>구분</span><span>제목</span><span>날짜</span><span /></PcHead>}
                {loading ? (
                    <EmptyText>불러오는 중...</EmptyText>
                ) : notices.length === 0 ? (
                    <EmptyText>등록된 공지사항이 없습니다</EmptyText>
                ) : (
                    notices.map((n) => {
                        const isOpen = openId === n.id;
                        return (
                            <NoticeItem key={n.id}>
                                <NoticeRow onClick={() => toggle(n.id)}>
                                    <NoticeLeft>
                                        <NoticeMeta><span className="kind">{n.badge || "공지"}</span><span className="dot"> · </span><span className="date">{formatDate(n.createdAt)}</span></NoticeMeta>
                                        <NoticeTitle>{n.title}</NoticeTitle>
                                        {!isOpen && n.content && (
                                            <NoticeLead>{String(n.content).split("\n")[0]}</NoticeLead>
                                        )}
                                    </NoticeLeft>
                                    {isOpen
                                        ? <IoChevronUp size={18} color={THEME.muted} />
                                        : <IoChevronDown size={18} color={THEME.muted} />
                                    }
                                </NoticeRow>
                                {isOpen && (
                                    <NoticeBody>{n.content}</NoticeBody>
                                )}
                            </NoticeItem>
                        );
                    })
                )}
                </ListBox>
            </Wrap>
        </SimpleBackLayout>
    );
};

export default NoticePage;

/* ===================== styles ===================== */

const PC_COLS = "110px minmax(0, 1fr) 130px 24px";

const Wrap = styled.div`
    padding: 12px;
    .pc-mode & { max-width: 1180px; margin: 0 auto; padding: 30px 32px 80px; box-sizing: border-box; }
`;

/* 폰에서는 모양 없는 묶음. PC 에서는 표 상자 */
const ListBox = styled.div`
    .pc-mode & { background: #fff; border: 1px solid #dfe3e8; min-height: 420px; }
`;
const PcHead = styled.div`
    display: grid; grid-template-columns: ${PC_COLS}; gap: 12px; padding: 14px 24px; background: #e9ecf1;
    font-size: 15px; font-weight: 700; color: #14181F;
`;

const EmptyText = styled.div`
    text-align: center;
    padding: 40px 0;
    font-size: 16px;
    color: ${THEME.muted};
    .pc-mode & { padding: 90px 20px; color: #14181F; border-top: 1px solid #dfe3e8; }
`;

const NoticeItem = styled.div`
    background: ${THEME.surface};
    &:first-child { border-radius: 16px 16px 0 0; }
    &:last-child { border-radius: 0 0 16px 16px; }
    &:only-child { border-radius: 16px; }
    &:not(:last-child) { border-bottom: 1px solid ${THEME.border}; }
    .pc-mode & { border-radius: 0 !important; border-bottom: none !important; border-top: 1px solid #dfe3e8; }
`;

const NoticeRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px;
    cursor: pointer;
    &:active { background: ${THEME.background}; }
    .pc-mode & {
        display: grid; grid-template-columns: ${PC_COLS}; gap: 0 12px; padding: 16px 24px; align-items: start;
        &:hover { background: #f4f6f8; }
        & > svg { grid-column: 4; grid-row: 1; margin-top: 3px; }
    }
`;

/* PC 에서는 안쪽 글씨들이 표의 칸(구분 · 제목 · 날짜)으로 흩어진다 */
const NoticeLeft = styled.div`
    flex: 1;
    min-width: 0;
    margin-right: 12px;
    .pc-mode & { display: contents; }
`;

/* 딱지 대신 종류와 날짜를 한 줄 글씨로 (대표 9/17 시안 1번) */
const NoticeMeta = styled.div`
    font-size: 13px;
    color: ${THEME.muted};
    .pc-mode & {
        display: contents;
        .kind { grid-column: 1; grid-row: 1; font-size: 16px; font-weight: 700; color: #14181F; }
        .dot { display: none; }
        .date { grid-column: 3; grid-row: 1; font-size: 16px; color: #14181F; }
    }
`;

const NoticeTitle = styled.div`
    font-size: 17px;
    font-weight: 700;
    color: ${THEME.text};
    line-height: 1.4;
    margin-top: 4px;
    word-break: keep-all;
    .pc-mode & { grid-column: 2; grid-row: 1; margin-top: 0; font-size: 16px; }
`;

/* 열지 않아도 무슨 내용인지 보이게 첫 줄만 */
const NoticeLead = styled.div`
    font-size: 15px;
    color: #2b2f36;
    line-height: 1.6;
    margin-top: 5px;
    word-break: keep-all;
    .pc-mode & { grid-column: 2; grid-row: 2; }
`;

const NoticeBody = styled.div`
    padding: 0 20px 20px;
    font-size: 16px;
    color: ${THEME.textSecondary};
    line-height: 1.7;
    white-space: pre-line;
    word-break: keep-all;
    .pc-mode & { padding: 4px 24px 26px 146px; color: #2b2f36; max-width: 960px; }
`;
