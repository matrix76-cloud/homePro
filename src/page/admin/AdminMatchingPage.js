/* eslint-disable */
import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { THEME, CATEGORIES, COLLECTIONS } from "../../config/homeproConfig";
import { db } from "../../api/config";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    query,
    orderBy,
} from "firebase/firestore";

// ─── 상태 정의 ───
const STATUS_MAP = {
    requested: { label: "요청중", color: THEME.accent },
    matched: { label: "매칭완료", color: THEME.primary },
    in_progress: { label: "진행중", color: THEME.purple },
    completed: { label: "완료", color: THEME.success },
    cancelled: { label: "취소", color: THEME.danger },
};

const FILTER_LABELS = {
    all: "전체 매칭",
    requested: "요청중",
    matched: "매칭완료",
    in_progress: "진행중",
    completed: "완료",
    cancelled: "취소",
};

const PAGE_SIZE = 20;

// ─── 유틸 ───
const formatDate = (val) => {
    if (!val) return "-";
    const d = val.toDate ? val.toDate() : new Date(val);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}.${m}.${day}`;
};

const getCategoryName = (categoryId) => {
    const cat = CATEGORIES.find((c) => c.id === categoryId);
    return cat ? cat.shortName : categoryId || "-";
};

// ─── 컴포넌트 ───
const AdminMatchingPage = () => {
    const { filter } = useParams();
    const activeTab = filter || "all";
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState(null);

    // Firestore에서 주문 목록 조회
    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, COLLECTIONS.ORDERS),
                orderBy("createdAt", "desc")
            );
            const snap = await getDocs(q);
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setOrders(list);
        } catch (err) {
            console.error("주문 목록 조회 실패:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // 상태 변경
    const handleStatusChange = async (orderId, newStatus, e) => {
        if (e) e.stopPropagation();
        try {
            await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
                status: newStatus,
                updatedAt: new Date(),
            });
            setOrders((prev) =>
                prev.map((o) =>
                    o.id === orderId
                        ? { ...o, status: newStatus, updatedAt: new Date() }
                        : o
                )
            );
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder((prev) => ({
                    ...prev,
                    status: newStatus,
                    updatedAt: new Date(),
                }));
            }
        } catch (err) {
            console.error("상태 변경 실패:", err);
            alert("상태 변경에 실패했습니다.");
        }
    };

    // 필터링
    const filtered = orders.filter((o) => {
        if (activeTab !== "all" && o.status !== activeTab) return false;
        if (searchText.trim()) {
            const s = searchText.trim().toLowerCase();
            const matchId = o.id.toLowerCase().includes(s);
            const matchCustomer = (o.customerName || "").toLowerCase().includes(s);
            const matchPro = (o.proName || "").toLowerCase().includes(s);
            if (!matchId && !matchCustomer && !matchPro) return false;
        }
        return true;
    });

    // 페이지네이션
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const paged = filtered.slice(
        (safePage - 1) * PAGE_SIZE,
        safePage * PAGE_SIZE
    );

    // 탭/검색 변경 시 페이지 리셋
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchText]);

    // 탭별 건수
    const getTabCount = (key) => {
        if (key === "all") return orders.length;
        return orders.filter((o) => o.status === key).length;
    };

    return (
        <Wrapper>
            <Header>
                <Title>{FILTER_LABELS[activeTab] || "전체 매칭"} ({filtered.length}건)</Title>
                <RefreshBtn onClick={fetchOrders}>새로고침</RefreshBtn>
            </Header>

            {/* 검색 */}
            <SearchRow>
                <SearchInput
                    placeholder="주문번호, 고객명, 프로명 검색"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                />
            </SearchRow>

            {/* 테이블 */}
            {loading ? (
                <EmptyMsg>불러오는 중...</EmptyMsg>
            ) : paged.length === 0 ? (
                <EmptyMsg>해당 조건의 주문이 없습니다.</EmptyMsg>
            ) : (
                <>
                    <TableWrap>
                        <Table>
                            <thead>
                                <tr>
                                    <Th>주문번호</Th>
                                    <Th>카테고리</Th>
                                    <Th>고객명</Th>
                                    <Th>프로명</Th>
                                    <Th style={{ textAlign: "right" }}>금액</Th>
                                    <Th>요청일</Th>
                                    <Th>상태</Th>
                                    <Th>변경</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {paged.map((order) => (
                                    <Tr
                                        key={order.id}
                                        onClick={() => setSelectedOrder(order)}
                                    >
                                        <Td>
                                            <OrderId>
                                                {order.id.slice(0, 8)}
                                            </OrderId>
                                        </Td>
                                        <Td>
                                            {getCategoryName(order.categoryId)}
                                        </Td>
                                        <Td>{order.customerName || "-"}</Td>
                                        <Td>{order.proName || "-"}</Td>
                                        <Td style={{ textAlign: "right" }}>
                                            {order.amount != null
                                                ? order.amount.toLocaleString() +
                                                  "원"
                                                : "-"}
                                        </Td>
                                        <Td>{formatDate(order.createdAt)}</Td>
                                        <Td>
                                            <Badge
                                                $color={
                                                    STATUS_MAP[order.status]
                                                        ?.color || THEME.muted
                                                }
                                            >
                                                {STATUS_MAP[order.status]
                                                    ?.label || order.status}
                                            </Badge>
                                        </Td>
                                        <Td>
                                            <StatusSelect
                                                value={order.status}
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                                onChange={(e) =>
                                                    handleStatusChange(
                                                        order.id,
                                                        e.target.value,
                                                        e
                                                    )
                                                }
                                            >
                                                {Object.entries(
                                                    STATUS_MAP
                                                ).map(([k, v]) => (
                                                    <option key={k} value={k}>
                                                        {v.label}
                                                    </option>
                                                ))}
                                            </StatusSelect>
                                        </Td>
                                    </Tr>
                                ))}
                            </tbody>
                        </Table>
                    </TableWrap>

                    {/* 페이지네이션 */}
                    <Pagination>
                        <PageBtn
                            disabled={safePage <= 1}
                            onClick={() => setCurrentPage((p) => p - 1)}
                        >
                            이전
                        </PageBtn>
                        <PageInfo>
                            {safePage} / {totalPages}
                        </PageInfo>
                        <PageBtn
                            disabled={safePage >= totalPages}
                            onClick={() => setCurrentPage((p) => p + 1)}
                        >
                            다음
                        </PageBtn>
                    </Pagination>
                </>
            )}

            {/* 상세 모달 */}
            {selectedOrder && (
                <Overlay onClick={() => setSelectedOrder(null)}>
                    <Modal onClick={(e) => e.stopPropagation()}>
                        <ModalHeader>
                            <ModalTitle>주문 상세</ModalTitle>
                            <CloseBtn onClick={() => setSelectedOrder(null)}>
                                닫기
                            </CloseBtn>
                        </ModalHeader>
                        <ModalBody>
                            <InfoSection>
                                <SectionTitle>주문 정보</SectionTitle>
                                <InfoRow>
                                    <InfoLabel>주문번호</InfoLabel>
                                    <InfoValue>{selectedOrder.id}</InfoValue>
                                </InfoRow>
                                <InfoRow>
                                    <InfoLabel>카테고리</InfoLabel>
                                    <InfoValue>
                                        {getCategoryName(
                                            selectedOrder.categoryId
                                        )}
                                        {selectedOrder.categoryName
                                            ? ` (${selectedOrder.categoryName})`
                                            : ""}
                                    </InfoValue>
                                </InfoRow>
                                {selectedOrder.subcategory && (
                                    <InfoRow>
                                        <InfoLabel>세부분류</InfoLabel>
                                        <InfoValue>
                                            {selectedOrder.subcategory}
                                        </InfoValue>
                                    </InfoRow>
                                )}
                                <InfoRow>
                                    <InfoLabel>금액</InfoLabel>
                                    <InfoValue>
                                        {selectedOrder.amount != null
                                            ? selectedOrder.amount.toLocaleString() +
                                              "원"
                                            : "-"}
                                    </InfoValue>
                                </InfoRow>
                                <InfoRow>
                                    <InfoLabel>상태</InfoLabel>
                                    <InfoValue>
                                        <Badge
                                            $color={
                                                STATUS_MAP[
                                                    selectedOrder.status
                                                ]?.color || THEME.muted
                                            }
                                        >
                                            {STATUS_MAP[selectedOrder.status]
                                                ?.label ||
                                                selectedOrder.status}
                                        </Badge>
                                    </InfoValue>
                                </InfoRow>
                                <InfoRow>
                                    <InfoLabel>상태 변경</InfoLabel>
                                    <InfoValue>
                                        <StatusSelect
                                            value={selectedOrder.status}
                                            onChange={(e) =>
                                                handleStatusChange(
                                                    selectedOrder.id,
                                                    e.target.value
                                                )
                                            }
                                        >
                                            {Object.entries(STATUS_MAP).map(
                                                ([k, v]) => (
                                                    <option key={k} value={k}>
                                                        {v.label}
                                                    </option>
                                                )
                                            )}
                                        </StatusSelect>
                                    </InfoValue>
                                </InfoRow>
                            </InfoSection>

                            <InfoSection>
                                <SectionTitle>고객 정보</SectionTitle>
                                <InfoRow>
                                    <InfoLabel>고객명</InfoLabel>
                                    <InfoValue>
                                        {selectedOrder.customerName || "-"}
                                    </InfoValue>
                                </InfoRow>
                                <InfoRow>
                                    <InfoLabel>고객 UID</InfoLabel>
                                    <InfoValue style={{ fontSize: 12 }}>
                                        {selectedOrder.customerUid || "-"}
                                    </InfoValue>
                                </InfoRow>
                            </InfoSection>

                            <InfoSection>
                                <SectionTitle>프로 정보</SectionTitle>
                                <InfoRow>
                                    <InfoLabel>프로명</InfoLabel>
                                    <InfoValue>
                                        {selectedOrder.proName || "-"}
                                    </InfoValue>
                                </InfoRow>
                                <InfoRow>
                                    <InfoLabel>프로 UID</InfoLabel>
                                    <InfoValue style={{ fontSize: 12 }}>
                                        {selectedOrder.proUid || "-"}
                                    </InfoValue>
                                </InfoRow>
                            </InfoSection>

                            <InfoSection>
                                <SectionTitle>상세 내용</SectionTitle>
                                {selectedOrder.description && (
                                    <InfoRow>
                                        <InfoLabel>요청 내용</InfoLabel>
                                        <InfoValue>
                                            {selectedOrder.description}
                                        </InfoValue>
                                    </InfoRow>
                                )}
                                {selectedOrder.address && (
                                    <InfoRow>
                                        <InfoLabel>주소</InfoLabel>
                                        <InfoValue>
                                            {selectedOrder.address}
                                        </InfoValue>
                                    </InfoRow>
                                )}
                                {selectedOrder.schedule && (
                                    <InfoRow>
                                        <InfoLabel>일정</InfoLabel>
                                        <InfoValue>
                                            {selectedOrder.schedule}
                                        </InfoValue>
                                    </InfoRow>
                                )}
                                <InfoRow>
                                    <InfoLabel>요청일</InfoLabel>
                                    <InfoValue>
                                        {formatDate(selectedOrder.createdAt)}
                                    </InfoValue>
                                </InfoRow>
                                {selectedOrder.updatedAt && (
                                    <InfoRow>
                                        <InfoLabel>수정일</InfoLabel>
                                        <InfoValue>
                                            {formatDate(
                                                selectedOrder.updatedAt
                                            )}
                                        </InfoValue>
                                    </InfoRow>
                                )}
                            </InfoSection>
                        </ModalBody>
                    </Modal>
                </Overlay>
            )}
        </Wrapper>
    );
};

export default AdminMatchingPage;

// ─── Styled Components ───

const Wrapper = styled.div``;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
`;

const Title = styled.h1`
    font-size: 22px;
    font-weight: 700;
    color: ${THEME.text};
    margin: 0;
`;

const RefreshBtn = styled.button`
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    color: ${THEME.primary};
    background: ${THEME.surface};
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    cursor: pointer;
    &:hover {
        background: ${THEME.background};
    }
`;

const TabRow = styled.div`
    display: flex;
    gap: 4px;
    margin-bottom: 16px;
    overflow-x: auto;
`;

const Tab = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    font-size: 13px;
    font-weight: ${({ $active }) => ($active ? 700 : 500)};
    color: ${({ $active }) => ($active ? THEME.surface : THEME.text)};
    background: ${({ $active }) => ($active ? THEME.primary : THEME.surface)};
    border: 1px solid ${({ $active }) => ($active ? THEME.primary : THEME.border)};
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
    &:hover {
        opacity: 0.85;
    }
`;

const TabCount = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: ${({ $active }) => ($active ? "rgba(255,255,255,0.8)" : THEME.muted)};
`;

const SearchRow = styled.div`
    margin-bottom: 16px;
`;

const SearchInput = styled.input`
    width: 100%;
    max-width: 360px;
    padding: 10px 12px;
    font-size: 13px;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    background: ${THEME.surface};
    color: ${THEME.text};
    outline: none;
    box-sizing: border-box;
    &:focus {
        border-color: ${THEME.primary};
    }
    &::placeholder {
        color: ${THEME.muted};
    }
`;

const EmptyMsg = styled.div`
    text-align: center;
    padding: 60px 0;
    color: ${THEME.muted};
    font-size: 14px;
`;

const TableWrap = styled.div`
    overflow-x: auto;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    background: ${THEME.surface};
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    white-space: nowrap;
`;

const Th = styled.th`
    padding: 12px 14px;
    font-size: 12px;
    font-weight: 600;
    color: ${THEME.muted};
    text-align: left;
    background: ${THEME.background};
    border-bottom: 1px solid ${THEME.border};
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
    padding: 12px 14px;
    font-size: 13px;
    color: ${THEME.text};
`;

const OrderId = styled.span`
    font-family: monospace;
    font-size: 12px;
    color: ${THEME.primary};
    font-weight: 600;
`;

const Badge = styled.span`
    display: inline-block;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 600;
    color: #fff;
    background: ${({ $color }) => $color};
    border-radius: 4px;
`;

const StatusSelect = styled.select`
    padding: 5px 8px;
    font-size: 12px;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    background: ${THEME.surface};
    color: ${THEME.text};
    cursor: pointer;
    outline: none;
    &:focus {
        border-color: ${THEME.primary};
    }
`;

const Pagination = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-top: 16px;
    padding: 12px 0;
`;

const PageBtn = styled.button`
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 600;
    color: ${({ disabled }) => (disabled ? THEME.muted : THEME.primary)};
    background: ${THEME.surface};
    border: 1px solid ${({ disabled }) => (disabled ? THEME.border : THEME.primary)};
    border-radius: 4px;
    cursor: ${({ disabled }) => (disabled ? "default" : "pointer")};
    opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
    &:hover:not(:disabled) {
        background: ${THEME.background};
    }
`;

const PageInfo = styled.span`
    font-size: 13px;
    color: ${THEME.text};
    font-weight: 500;
`;

// ─── 모달 ───

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.45);
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
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
`;

const ModalHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px;
    border-bottom: 1px solid ${THEME.border};
`;

const ModalTitle = styled.h2`
    font-size: 17px;
    font-weight: 700;
    color: ${THEME.text};
    margin: 0;
`;

const CloseBtn = styled.button`
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 600;
    color: ${THEME.muted};
    background: none;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    cursor: pointer;
    &:hover {
        color: ${THEME.text};
        border-color: ${THEME.text};
    }
`;

const ModalBody = styled.div`
    padding: 20px;
    overflow-y: auto;
`;

const InfoSection = styled.div`
    margin-bottom: 20px;
    &:last-child {
        margin-bottom: 0;
    }
`;

const SectionTitle = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: ${THEME.primary};
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid ${THEME.border};
`;

const InfoRow = styled.div`
    display: flex;
    padding: 6px 0;
    gap: 12px;
`;

const InfoLabel = styled.div`
    flex: 0 0 80px;
    font-size: 12px;
    font-weight: 600;
    color: ${THEME.muted};
`;

const InfoValue = styled.div`
    flex: 1;
    font-size: 13px;
    color: ${THEME.text};
    word-break: break-all;
`;
