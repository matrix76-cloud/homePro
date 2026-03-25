/* eslint-disable */
import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";
import { db } from "../../api/config";
import {
    collection,
    getDocs,
    doc,
    deleteDoc,
    query,
    orderBy,
    limit as fbLimit,
} from "firebase/firestore";

// ─── 시간 포맷 ───
const formatTime = (timestamp) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const h = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${y}.${m}.${d} ${h}:${min}`;
};

const FILTER_LABELS = { all: "전체 채팅방", active: "활성 채팅방", flagged: "관심 채팅", closed: "종료된 채팅방" };

const AdminChatPage = () => {
    const { filter } = useParams();
    const currentFilter = filter || "all";
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [msgLoading, setMsgLoading] = useState(false);

    // ─── 채팅방 목록 로드 ───
    const fetchRooms = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, "chatRooms"));
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            list.sort((a, b) => {
                const ta = a.lastMessageAt?.toMillis?.() || 0;
                const tb = b.lastMessageAt?.toMillis?.() || 0;
                return tb - ta;
            });
            setRooms(list);
        } catch (e) {
            console.error("채팅방 목록 로드 실패:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    // ─── 채팅방 삭제 ───
    const handleDelete = async (e, roomId) => {
        e.stopPropagation();
        if (!window.confirm("이 채팅방을 삭제하시겠습니까?")) return;
        try {
            await deleteDoc(doc(db, "chatRooms", roomId));
            setRooms((prev) => prev.filter((r) => r.id !== roomId));
        } catch (err) {
            console.error("채팅방 삭제 실패:", err);
            alert("삭제에 실패했습니다.");
        }
    };

    // ─── 상세 모달 열기 ───
    const openDetail = async (room) => {
        setSelectedRoom(room);
        setMsgLoading(true);
        try {
            const q = query(
                collection(db, "chatRooms", room.id, "messages"),
                orderBy("createdAt"),
                fbLimit(50)
            );
            const snap = await getDocs(q);
            setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error("메시지 로드 실패:", e);
            setMessages([]);
        } finally {
            setMsgLoading(false);
        }
    };

    const closeDetail = () => {
        setSelectedRoom(null);
        setMessages([]);
    };

    // 필터링: active = status !== "closed", closed = status === "closed"
    const filtered = useMemo(() => {
        if (currentFilter === "active") return rooms.filter(r => r.status !== "closed");
        if (currentFilter === "flagged") return rooms.filter(r => r.flagged === true);
        if (currentFilter === "closed") return rooms.filter(r => r.status === "closed");
        return rooms;
    }, [rooms, currentFilter]);

    // ─── 렌더 ───
    return (
        <Wrapper>
            <Title>{FILTER_LABELS[currentFilter] || "전체 채팅방"} ({filtered.length})</Title>

            {loading ? (
                <LoadingText>로딩 중...</LoadingText>
            ) : filtered.length === 0 ? (
                <EmptyText>채팅방이 없습니다.</EmptyText>
            ) : (
                <Table>
                    <thead>
                        <tr>
                            <Th>대화 참여자</Th>
                            <Th>상태</Th>
                            <Th>마지막 메시지</Th>
                            <Th>시간</Th>
                            <Th>메시지 수</Th>
                            <Th style={{ width: 70 }}>삭제</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((room) => {
                            const names = room.participantNames
                                ? Object.values(room.participantNames).join(" ↔ ")
                                : Array.isArray(room.participants) ? room.participants.join(", ") : "-";
                            const status = room.quoteStatus === "cancelled" ? "취소"
                                : room.workStatus === "completed" ? "완료"
                                : room.paymentStatus === "paid" ? "결제완료"
                                : room.quoteStatus === "accepted" ? "수락"
                                : room.quoteStatus === "rejected" ? "거절"
                                : room.quoteStatus === "pending" ? "대기"
                                : "일반";
                            return (
                            <Tr key={room.id} onClick={() => openDetail(room)}>
                                <Td>{names}</Td>
                                <Td><StatusTag $status={status}>{status}</StatusTag></Td>
                                <Td>{room.lastMessage || "-"}</Td>
                                <Td>{formatTime(room.lastMessageAt)}</Td>
                                <Td style={{ textAlign: "center" }}>
                                    {room.messageCount ?? 0}
                                </Td>
                                <Td style={{ textAlign: "center" }}>
                                    <DeleteBtn
                                        onClick={(e) =>
                                            handleDelete(e, room.id)
                                        }
                                    >
                                        삭제
                                    </DeleteBtn>
                                </Td>
                            </Tr>
                            );
                        })}
                    </tbody>
                </Table>
            )}

            {/* ─── 상세 모달 ─── */}
            {selectedRoom && (
                <Overlay onClick={closeDetail}>
                    <Modal onClick={(e) => e.stopPropagation()}>
                        <ModalHeader>
                            <ModalTitle>채팅방 상세</ModalTitle>
                            <CloseBtn onClick={closeDetail}>닫기</CloseBtn>
                        </ModalHeader>

                        <RoomInfo>
                            <InfoRow>
                                <InfoLabel>참여자</InfoLabel>
                                <InfoValue>
                                    {selectedRoom.participantNames
                                        ? Object.values(selectedRoom.participantNames).join(" ↔ ")
                                        : Array.isArray(selectedRoom.participants) ? selectedRoom.participants.join(", ") : "-"}
                                </InfoValue>
                            </InfoRow>
                            <InfoRow>
                                <InfoLabel>마지막 메시지</InfoLabel>
                                <InfoValue>
                                    {selectedRoom.lastMessage || "-"}
                                </InfoValue>
                            </InfoRow>
                            <InfoRow>
                                <InfoLabel>시간</InfoLabel>
                                <InfoValue>
                                    {formatTime(selectedRoom.lastMessageAt)}
                                </InfoValue>
                            </InfoRow>
                            <InfoRow>
                                <InfoLabel>메시지 수</InfoLabel>
                                <InfoValue>
                                    {selectedRoom.messageCount ?? 0}
                                </InfoValue>
                            </InfoRow>
                        </RoomInfo>

                        <MsgSection>
                            <MsgSectionTitle>메시지 목록</MsgSectionTitle>
                            {msgLoading ? (
                                <LoadingText>메시지 로딩 중...</LoadingText>
                            ) : messages.length === 0 ? (
                                <EmptyText>메시지가 없습니다.</EmptyText>
                            ) : (
                                <MsgList>
                                    {messages.map((msg) => (
                                        <MsgItem key={msg.id}>
                                            <MsgSender>
                                                {msg.senderName ||
                                                    msg.senderId ||
                                                    "알 수 없음"}
                                            </MsgSender>
                                            <MsgText>{msg.text || ""}</MsgText>
                                            <MsgTime>
                                                {formatTime(msg.createdAt)}
                                            </MsgTime>
                                        </MsgItem>
                                    ))}
                                </MsgList>
                            )}
                        </MsgSection>
                    </Modal>
                </Overlay>
            )}
        </Wrapper>
    );
};

export default AdminChatPage;

// ─── Styled ───

const Wrapper = styled.div``;

const Title = styled.h2`
    font-size: 20px;
    font-weight: 700;
    color: ${THEME.text};
    margin-bottom: 20px;
`;

const LoadingText = styled.p`
    text-align: center;
    color: ${THEME.muted};
    padding: 40px 0;
`;

const EmptyText = styled.p`
    text-align: center;
    color: ${THEME.muted};
    padding: 40px 0;
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    background: ${THEME.surface};
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    overflow: hidden;
`;

const Th = styled.th`
    padding: 10px 12px;
    font-size: 13px;
    font-weight: 600;
    color: ${THEME.textSecondary};
    background: ${THEME.background};
    border-bottom: 1px solid ${THEME.border};
    text-align: left;
    white-space: nowrap;
`;

const Tr = styled.tr`
    cursor: pointer;
    &:hover {
        background: ${THEME.background};
    }
    &:not(:last-child) td {
        border-bottom: 1px solid ${THEME.border};
    }
`;

const Td = styled.td`
    padding: 10px 12px;
    font-size: 13px;
    color: ${THEME.text};
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const STATUS_COLORS = {
    "대기": { bg: "#F3F4F6", color: "#6B7280" },
    "수락": { bg: "#DBEAFE", color: "#2563EB" },
    "결제완료": { bg: "#D1FAE5", color: "#059669" },
    "완료": { bg: "#D1FAE5", color: "#059669" },
    "거절": { bg: "#FEE2E2", color: "#DC2626" },
    "취소": { bg: "#FEE2E2", color: "#DC2626" },
    "일반": { bg: "#F3F4F6", color: "#6B7280" },
};

const StatusTag = styled.span`
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    background: ${({ $status }) => STATUS_COLORS[$status]?.bg || "#F3F4F6"};
    color: ${({ $status }) => STATUS_COLORS[$status]?.color || "#6B7280"};
`;

const DeleteBtn = styled.button`
    padding: 4px 10px;
    font-size: 12px;
    color: ${THEME.surface};
    background: ${THEME.danger};
    border: none;
    border-radius: 4px;
    cursor: pointer;
    &:hover {
        opacity: 0.85;
    }
`;

/* ─── Modal ─── */

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const Modal = styled.div`
    background: ${THEME.surface};
    border-radius: 4px;
    width: 90%;
    max-width: 560px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const ModalHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid ${THEME.border};
`;

const ModalTitle = styled.h3`
    font-size: 16px;
    font-weight: 700;
    color: ${THEME.text};
    margin: 0;
`;

const CloseBtn = styled.button`
    padding: 6px 14px;
    font-size: 13px;
    color: ${THEME.textSecondary};
    background: ${THEME.background};
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    cursor: pointer;
    &:hover {
        background: ${THEME.border};
    }
`;

const RoomInfo = styled.div`
    padding: 16px 20px;
    border-bottom: 1px solid ${THEME.border};
`;

const InfoRow = styled.div`
    display: flex;
    align-items: baseline;
    gap: 8px;
    &:not(:last-child) {
        margin-bottom: 6px;
    }
`;

const InfoLabel = styled.span`
    font-size: 12px;
    font-weight: 600;
    color: ${THEME.muted};
    min-width: 72px;
    flex-shrink: 0;
`;

const InfoValue = styled.span`
    font-size: 13px;
    color: ${THEME.text};
`;

const MsgSection = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const MsgSectionTitle = styled.div`
    padding: 12px 20px 8px;
    font-size: 13px;
    font-weight: 600;
    color: ${THEME.textSecondary};
`;

const MsgList = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 0 20px 16px;
`;

const MsgItem = styled.div`
    padding: 8px 0;
    &:not(:last-child) {
        border-bottom: 1px solid ${THEME.border};
    }
`;

const MsgSender = styled.span`
    font-size: 13px;
    font-weight: 700;
    color: ${THEME.text};
    margin-right: 8px;
`;

const MsgText = styled.span`
    font-size: 13px;
    color: ${THEME.text};
`;

const MsgTime = styled.div`
    font-size: 11px;
    color: ${THEME.muted};
    margin-top: 2px;
`;
