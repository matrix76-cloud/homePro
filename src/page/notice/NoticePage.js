/* eslint-disable */
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../api/config";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoChevronDown, IoChevronUp } from "react-icons/io5";

const formatDate = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

const NoticePage = () => {
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
                                        <Badge $type={n.badge}>{n.badge || "공지"}</Badge>
                                        <NoticeTitle>{n.title}</NoticeTitle>
                                        <NoticeDate>{formatDate(n.createdAt)}</NoticeDate>
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
            </Wrap>
        </SimpleBackLayout>
    );
};

export default NoticePage;

/* ===================== styles ===================== */

const Wrap = styled.div`
    padding: 12px;
`;

const EmptyText = styled.div`
    text-align: center;
    padding: 40px 0;
    font-size: 14px;
    color: ${THEME.muted};
`;

const NoticeItem = styled.div`
    background: ${THEME.surface};
    &:first-child { border-radius: 16px 16px 0 0; }
    &:last-child { border-radius: 0 0 16px 16px; }
    &:only-child { border-radius: 16px; }
    &:not(:last-child) { border-bottom: 1px solid ${THEME.border}; }
`;

const NoticeRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px;
    cursor: pointer;
    &:active { background: ${THEME.background}; }
`;

const NoticeLeft = styled.div`
    flex: 1;
    min-width: 0;
    margin-right: 12px;
`;

const Badge = styled.span`
    display: inline-block;
    padding: 2px 8px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 400;
    margin-bottom: 6px;
    background: ${({ $type }) =>
        $type === "이벤트" ? "#FEF3C7" :
        $type === "안내" ? THEME.purpleLight :
        THEME.purpleLight};
    color: ${({ $type }) =>
        $type === "이벤트" ? "#D97706" :
        $type === "안내" ? THEME.purple :
        THEME.primary};
`;

const NoticeTitle = styled.div`
    font-size: 15px;
    font-weight: 400;
    color: ${THEME.text};
    line-height: 1.4;
    word-break: keep-all;
`;

const NoticeDate = styled.div`
    font-size: 12px;
    color: ${THEME.muted};
    margin-top: 4px;
`;

const NoticeBody = styled.div`
    padding: 0 20px 20px;
    font-size: 14px;
    color: ${THEME.textSecondary};
    line-height: 1.7;
    white-space: pre-line;
    word-break: keep-all;
`;
