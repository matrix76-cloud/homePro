/* eslint-disable */
/* 관리자 — 보험 문의내역 관리 (대표 리뷰 2026-10-06)
 * 홈프로가 보험 탭 [1:1 문의하기]로 남긴 문의 목록(미답변 / 답변 완료) → 줄을 고르면 오른쪽에 대화와 답변 칸.
 * 답변을 등록하면 홈프로의 채팅 목록 '보험문의' 방에 바로 뜨고 알림이 나간다. */
import React, { useState, useEffect, useMemo, useRef } from "react";
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";
import {
    subscribeInsuranceInquiries, subscribeInquiryMessages, replyInsuranceInquiry, markInquiryChecked,
    isInquiryUnanswered, INQUIRY_ADMIN_UID,
} from "../../service/InsuranceInquiryService";

const TAB_LIST = [
    { key: "open", label: "미답변" },
    { key: "answered", label: "답변 완료" },
    { key: "all", label: "전체" },
];

const formatDate = (v) => {
    if (!v) return "-";
    const d = v.toDate ? v.toDate() : (v.seconds ? new Date(v.seconds * 1000) : new Date(v));
    if (isNaN(d.getTime())) return "-";
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const AdminInsuranceInquiriesPage = () => {
    const [activeTab, setActiveTab] = useState("open");
    const [rooms, setRooms] = useState(null); // null = 불러오는 중
    const [selectedId, setSelectedId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [reply, setReply] = useState("");
    const [busy, setBusy] = useState(false);
    const threadRef = useRef(null);

    useEffect(() => subscribeInsuranceInquiries(setRooms), []);

    useEffect(() => {
        setMessages([]);
        setReply("");
        if (!selectedId) return;
        return subscribeInquiryMessages(selectedId, setMessages);
    }, [selectedId]);

    useEffect(() => {
        const el = threadRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages]);

    const list = rooms || [];
    const filtered = useMemo(() => list.filter((r) => (
        activeTab === "all" ? true : activeTab === "open" ? isInquiryUnanswered(r) : !isInquiryUnanswered(r)
    )), [list, activeTab]);
    const count = (key) => (key === "all" ? list.length : list.filter((r) => (key === "open" ? isInquiryUnanswered(r) : !isInquiryUnanswered(r))).length);
    const selected = list.find((r) => r.id === selectedId) || null;
    const askerName = (r) => r?.participantNames?.[r.inquiryUid] || "홈프로";

    const submit = async () => {
        if (busy || !selected) return;
        if (!reply.trim()) { alert("답변 내용을 입력해 주세요."); return; }
        setBusy(true);
        try {
            await replyInsuranceInquiry(selected.id, reply);
            setReply("");
        } catch (e) {
            alert(e?.message || "답변을 등록하지 못했습니다.");
        }
        setBusy(false);
    };

    const checkOnly = async () => {
        if (busy || !selected) return;
        if (!window.confirm("답변 없이 확인 처리하시겠습니까? 미답변 목록에서 내려갑니다.")) return;
        setBusy(true);
        try { await markInquiryChecked(selected.id); } catch (e) { alert("처리 중 오류가 발생했습니다."); }
        setBusy(false);
    };

    return (
        <Wrap>
            <Header>
                <Title>보험 문의내역 관리</Title>
            </Header>

            <TabBar>
                {TAB_LIST.map((t) => (
                    <TabItem key={t.key} type="button" $active={activeTab === t.key} onClick={() => setActiveTab(t.key)}>
                        {t.label} {count(t.key)}
                    </TabItem>
                ))}
            </TabBar>

            <Cols>
                <TableWrap>
                    {rooms === null ? (
                        <EmptyMsg>불러오는 중...</EmptyMsg>
                    ) : filtered.length === 0 ? (
                        <EmptyMsg>해당 상태의 문의가 없습니다.</EmptyMsg>
                    ) : (
                        <Table>
                            <thead>
                                <tr>
                                    <Th>최근 글</Th>
                                    <Th>유형</Th>
                                    <Th>제목</Th>
                                    <Th>문의자</Th>
                                    <Th>상태</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((r) => {
                                    const open = isInquiryUnanswered(r);
                                    return (
                                        <Tr key={r.id} $on={r.id === selectedId} onClick={() => setSelectedId(r.id)}>
                                            <Td $nowrap>{formatDate(r.lastMessageAt)}</Td>
                                            <Td $nowrap>{r.inquiryType || "-"}</Td>
                                            <Td><strong>{r.inquiryTitle || "-"}</strong></Td>
                                            <Td $nowrap>{askerName(r)}</Td>
                                            <Td $nowrap style={{ color: open ? "#B45309" : THEME.text, fontWeight: 700 }}>{open ? "미답변" : "답변 완료"}</Td>
                                        </Tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    )}
                </TableWrap>

                <Detail>
                    {!selected ? (
                        <EmptyMsg>왼쪽에서 문의를 고르면 내용과 답변 칸이 열립니다.</EmptyMsg>
                    ) : (
                        <>
                            <DetailHead>
                                <DetailTitle>{selected.inquiryTitle}</DetailTitle>
                                <DetailMeta>{selected.inquiryType} · {askerName(selected)} · 접수 {formatDate(selected.createdAt)}</DetailMeta>
                            </DetailHead>
                            <Thread ref={threadRef}>
                                {messages.map((m) => {
                                    const mine = m.senderId === INQUIRY_ADMIN_UID;
                                    return (
                                        <Msg key={m.id} $mine={mine}>
                                            <MsgWho>{mine ? "관리자 답변" : (m.senderName || askerName(selected))} · {formatDate(m.createdAt)}</MsgWho>
                                            <MsgText>{m.text || (m.fileName ? `(첨부) ${m.fileName}` : "")}</MsgText>
                                        </Msg>
                                    );
                                })}
                            </Thread>
                            <ReplyBox>
                                <ReplyInput value={reply} placeholder="답변을 입력하세요" onChange={(e) => setReply(e.target.value)} />
                                <ReplyBtns>
                                    {isInquiryUnanswered(selected) && <ActionBtn type="button" onClick={checkOnly} disabled={busy}>답변 없이 확인 처리</ActionBtn>}
                                    <SubmitBtn type="button" onClick={submit} disabled={busy}>{busy ? "등록 중..." : "답변 등록"}</SubmitBtn>
                                </ReplyBtns>
                            </ReplyBox>
                        </>
                    )}
                </Detail>
            </Cols>
        </Wrap>
    );
};

export default AdminInsuranceInquiriesPage;

// ─── Styled ───

const Wrap = styled.div``;
const Header = styled.div`display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;`;
const Title = styled.h1`font-size: 24px; font-weight: 700; color: ${THEME.text}; margin: 0;`;

/* 탭 — 한 박스로 묶고 사이에만 세로선, 열린 탭은 연회색 면 + 굵은 글씨 */
const TabBar = styled.div`display: inline-flex; border: 1px solid #D9DDE3; margin-bottom: 16px;`;
const TabItem = styled.button`
    padding: 9px 18px; font-size: 15px; font-family: inherit; cursor: pointer; border: none;
    font-weight: ${p => p.$active ? 700 : 500};
    color: ${THEME.text};
    background: ${p => p.$active ? "#e9ecf1" : "#fff"};
    & + & { border-left: 1px solid #D9DDE3; }
`;

/* 목록 + 상세 2단 — 높이를 고정해 문의를 바꿔도 화면이 흔들리지 않게 */
const Cols = styled.div`display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 16px; align-items: stretch; @media (max-width: 1100px) { grid-template-columns: minmax(0, 1fr); }`;
const EmptyMsg = styled.div`text-align: center; padding: 60px 20px; color: ${THEME.text}; font-size: 16px; word-break: keep-all;`;
const TableWrap = styled.div`background: #fff; overflow: auto; border: 1px solid #D9DDE3; height: 620px;`;
const Table = styled.table`width: 100%; border-collapse: collapse;`;
const Th = styled.th`text-align: left; padding: 10px 14px; font-size: 14px; font-weight: 700; color: ${THEME.text}; background: ${THEME.background}; border-bottom: 1px solid #D9DDE3; white-space: nowrap; position: sticky; top: 0;`;
const Tr = styled.tr`cursor: pointer; background: ${p => p.$on ? "#e9ecf1" : "#fff"}; &:hover { background: ${p => p.$on ? "#e9ecf1" : THEME.background}; }`;
const Td = styled.td`
    padding: 11px 14px; font-size: 15px; line-height: 1.5; color: ${THEME.text}; border-bottom: 1px solid #E5E7EB; vertical-align: top;
    white-space: ${p => p.$nowrap ? "nowrap" : "normal"}; word-break: keep-all;
`;

const Detail = styled.div`background: #fff; border: 1px solid #D9DDE3; height: 620px; display: flex; flex-direction: column; min-width: 0;`;
const DetailHead = styled.div`padding: 16px 18px; border-bottom: 1px solid #D9DDE3;`;
const DetailTitle = styled.div`font-size: 18px; font-weight: 700; color: ${THEME.text}; word-break: keep-all;`;
const DetailMeta = styled.div`margin-top: 4px; font-size: 14px; color: ${THEME.text};`;
const Thread = styled.div`flex: 1; min-height: 0; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 12px;`;
const Msg = styled.div`align-self: ${p => p.$mine ? "flex-end" : "flex-start"}; max-width: 86%; padding: 10px 14px; border: 1px solid #D9DDE3; background: ${p => p.$mine ? THEME.background : "#fff"};`;
const MsgWho = styled.div`font-size: 13px; font-weight: 700; color: ${THEME.text}; margin-bottom: 4px;`;
const MsgText = styled.div`font-size: 15px; line-height: 1.6; color: ${THEME.text}; white-space: pre-wrap; word-break: break-word;`;
const ReplyBox = styled.div`padding: 14px 18px 16px; border-top: 1px solid #D9DDE3;`;
const ReplyInput = styled.textarea`width: 100%; box-sizing: border-box; height: 96px; padding: 12px; font-size: 15px; line-height: 1.6; font-family: inherit; color: ${THEME.text}; border: 1px solid #D9DDE3; resize: none; outline: none; &:focus { border-color: ${THEME.text}; }`;
const ReplyBtns = styled.div`display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;`;
const ActionBtn = styled.button`padding: 10px 16px; font-size: 15px; font-weight: 600; font-family: inherit; border: 1px solid #D9DDE3; border-radius: 4px; cursor: pointer; color: ${THEME.text}; background: #fff; &:hover { border-color: ${THEME.text}; } &:disabled { opacity: 0.5; }`;
const SubmitBtn = styled.button`padding: 10px 22px; font-size: 15px; font-weight: 700; font-family: inherit; border: none; border-radius: 4px; cursor: pointer; color: #fff; background: #1b1f27; &:disabled { opacity: 0.5; }`;
