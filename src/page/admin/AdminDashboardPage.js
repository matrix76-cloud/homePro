/* eslint-disable */
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";
import { db } from "../../api/config";
import {
    collection, getDocs, query, where, orderBy, limit, Timestamp,
} from "firebase/firestore";
import { IoArrowForwardOutline } from "react-icons/io5";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from "recharts";

// ─── 유틸 ───
const formatDate = (ts) => {
    if (!ts) return "-";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

const formatDateTime = (ts) => {
    if (!ts) return "-";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const getMonthStart = () => {
    const now = new Date();
    return Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 1));
};


// ─── 컴포넌트 ───
const AdminDashboardPage = () => {
    const nav = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        // 회원
        totalUsers: 0, generalUsers: 0, totalPros: 0,
        // 매칭
        totalOrders: 0, requestedOrders: 0, matchedOrders: 0,
        inProgressOrders: 0, completedOrders: 0, cancelledOrders: 0,
        // 채팅
        totalChats: 0, activeChats: 0, flaggedChats: 0, closedChats: 0,
        // 광고
        topAds: 0, middleAds: 0, settingsAds: 0, popupAds: 0,
        // 포인트
        totalPoints: 0, earnPoints: 0, usePoints: 0, refundPoints: 0,
        // 정산
        totalSettlement: 0, pendingSettlement: 0, approvedSettlement: 0,
        completedSettlement: 0, rejectedSettlement: 0,
        // 공지
        totalNotice: 0, pinnedNotice: 0, generalNotice: 0,
        // 매출
        monthRevenue: 0,
    });
    const [recentUsers, setRecentUsers] = useState([]);
    const [recentOrders, setRecentOrders] = useState([]);
    // 차트 데이터 (추후 Firestore 연동)
    const emptyChartData = useMemo(() => {
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const users = [], orders = [], revenue = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const label = `${d}일`;
            users.push({ name: label, value: 0 });
            orders.push({ name: label, value: 0 });
            revenue.push({ name: label, value: 0 });
        }
        return { users, orders, revenue };
    }, []);

    useEffect(() => { fetchDashboardData(); }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const monthStart = getMonthStart();

            // 기본 컬렉션 전체 로드 (개별 실패해도 나머지 정상 동작)
            const empty = { docs: [], size: 0, forEach: () => {} };
            const safe = (p) => p.catch((e) => { console.warn("대시보드 쿼리 실패:", e.message); return empty; });

            const [
                usersSnap, ordersSnap, chatsSnap, adsSnap,
                pointsSnap, settlementSnap, noticesSnap,
                prosSnap,
                monthCompletedSnap,
                recentUsersSnap, recentOrdersSnap,
            ] = await Promise.all([
                safe(getDocs(collection(db, "users"))),
                safe(getDocs(collection(db, "homepro_orders"))),
                safe(getDocs(collection(db, "chatRooms"))),
                safe(getDocs(collection(db, "ads"))),
                safe(getDocs(collection(db, "homepro_cash"))),
                safe(getDocs(collection(db, "homepro_settlements"))),
                safe(getDocs(collection(db, "notices"))),
                safe(getDocs(collection(db, "homepro_pros"))),
                safe(getDocs(query(collection(db, "homepro_orders"), where("createdAt", ">=", monthStart), where("status", "==", "completed")))),
                safe(getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"), limit(5)))),
                safe(getDocs(query(collection(db, "homepro_orders"), orderBy("createdAt", "desc"), limit(5)))),
            ]);

            // 회원 분류 (프로 수는 homepro_pros에서 approved 기준)
            let totalPros = 0;
            prosSnap.forEach(d => { if (d.data().status === "approved") totalPros++; });
            // 고유 프로 uid 수 (같은 사람이 여러 카테고리 등록 가능)
            const proUids = new Set();
            prosSnap.forEach(d => { if (d.data().status === "approved") proUids.add(d.data().uid); });
            totalPros = proUids.size;

            // 매칭 분류 (orderStatus 한글 → 영문 정규화)
            const normalizeStatus = (data) => {
                if (data.status) return data.status;
                const map = { "접수": "requested", "요청": "requested", "매칭": "matched", "진행": "in_progress", "완료": "completed", "취소": "cancelled" };
                return map[data.orderStatus] || "requested";
            };
            let totalOrders = ordersSnap.size, requestedOrders = 0, matchedOrders = 0,
                inProgressOrders = 0, completedOrders = 0, cancelledOrders = 0;
            ordersSnap.forEach(d => {
                const s = normalizeStatus(d.data());
                if (s === "pending" || s === "requested") requestedOrders++;
                else if (s === "matched") matchedOrders++;
                else if (s === "in_progress") inProgressOrders++;
                else if (s === "completed") completedOrders++;
                else if (s === "cancelled") cancelledOrders++;
            });

            // 채팅 분류
            let activeChats = 0, flaggedChats = 0, closedChats = 0;
            chatsSnap.forEach(d => {
                const data = d.data();
                if (data.status === "closed") closedChats++;
                else activeChats++;
                if (data.flagged) flaggedChats++;
            });

            // 광고 분류
            let topAds = 0, middleAds = 0, settingsAds = 0, popupAds = 0;
            adsSnap.forEach(d => {
                const data = d.data();
                if (!data.active) return;
                const pos = data.position || "";
                if (pos === "상단배너" || pos === "top") topAds++;
                else if (pos === "중간배너" || pos === "middle") middleAds++;
                else if (pos === "설정배너" || pos === "settings") settingsAds++;
                else if (pos === "팝업" || pos === "popup") popupAds++;
                else topAds++; // default
            });

            // 포인트 분류
            let totalPoints = 0, earnPoints = 0, usePoints = 0, refundPoints = 0;
            pointsSnap.forEach(d => {
                const data = d.data();
                const amt = data.amount || 0;
                if (data.type === "earn") { earnPoints += amt; totalPoints += amt; }
                else if (data.type === "use") { usePoints += amt; totalPoints -= amt; }
                else if (data.type === "refund") { refundPoints += amt; totalPoints += amt; }
            });

            // 정산 분류
            let pendingS = 0, approvedS = 0, completedS = 0, rejectedS = 0;
            settlementSnap.forEach(d => {
                const s = d.data().status;
                if (s === "pending") pendingS++;
                else if (s === "approved") approvedS++;
                else if (s === "completed") completedS++;
                else if (s === "rejected") rejectedS++;
            });

            // 공지 분류
            let pinnedNotice = 0, generalNotice = 0;
            noticesSnap.forEach(d => {
                const data = d.data();
                if (data.pinned) pinnedNotice++;
                else generalNotice++;
            });

            // 매출
            let monthRevenue = 0;
            monthCompletedSnap.forEach(d => { monthRevenue += d.data().amount || 0; });

            // 전화번호 인증된 회원만 카운팅
            let validUsers = 0;
            usersSnap.forEach(d => { const data = d.data(); if (data.phoneE164 || data.phone) validUsers++; });

            setStats({
                totalUsers: validUsers, generalUsers: validUsers - totalPros, totalPros,
                totalOrders, requestedOrders, matchedOrders, inProgressOrders, completedOrders, cancelledOrders,
                totalChats: chatsSnap.size, activeChats, flaggedChats, closedChats,
                topAds, middleAds, settingsAds, popupAds,
                totalPoints, earnPoints, usePoints, refundPoints,
                totalSettlement: settlementSnap.size, pendingSettlement: pendingS,
                approvedSettlement: approvedS, completedSettlement: completedS, rejectedSettlement: rejectedS,
                totalNotice: noticesSnap.size, pinnedNotice, generalNotice,
                monthRevenue,
            });

            setRecentUsers(recentUsersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setRecentOrders(recentOrdersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error("대시보드 데이터 로드 실패:", err);
        } finally {
            setLoading(false);
        }
    };

    const cardGroups = [
        {
            title: "회원관리", cards: [
                { label: "전체 회원 목록",  value: stats.totalUsers,    unit: "명", link: "/admin/users" },
                { label: "일반 사용자 회원", value: stats.generalUsers, unit: "명", link: "/admin/users/general" },
                { label: "사업자(프로) 회원", value: stats.totalPros,   unit: "명", link: "/admin/users/pro" },
            ], color: "#1E3A5F",
        },
        {
            title: "매칭관리", cards: [
                { label: "전체 매칭 내역",  value: stats.totalOrders,      unit: "건", link: "/admin/matching" },
                { label: "견적 요청중",     value: stats.requestedOrders,  unit: "건", link: "/admin/matching/requested" },
                { label: "매칭 완료 건",    value: stats.matchedOrders,    unit: "건", link: "/admin/matching/matched" },
                { label: "시공 진행중",     value: stats.inProgressOrders, unit: "건", link: "/admin/matching/in_progress" },
                { label: "시공 완료 건",    value: stats.completedOrders,  unit: "건", link: "/admin/matching/completed" },
                { label: "취소/환불 건",    value: stats.cancelledOrders,  unit: "건", link: "/admin/matching/cancelled" },
            ], color: "#1B4D7A",
        },
        {
            title: "채팅관리", cards: [
                { label: "전체 채팅방",    value: stats.totalChats,   unit: "개", link: "/admin/chat" },
                { label: "활성 채팅방",    value: stats.activeChats,  unit: "개", link: "/admin/chat/active" },
                { label: "관심 등록 채팅", value: stats.flaggedChats, unit: "개", link: "/admin/chat/flagged" },
                { label: "종료된 채팅방",  value: stats.closedChats,  unit: "개", link: "/admin/chat/closed" },
            ], color: "#174E6E",
        },
        {
            title: "광고관리", cards: [
                { label: "상단 배너",     value: stats.topAds,      unit: "개", link: "/admin/ads" },
                { label: "중간 배너",     value: stats.middleAds,   unit: "개", link: "/admin/ads/middle" },
                { label: "설정 페이지 배너", value: stats.settingsAds, unit: "개", link: "/admin/ads/settings" },
                { label: "팝업 광고",     value: stats.popupAds,    unit: "개", link: "/admin/ads/popup" },
            ], color: "#1A5C8A",
        },
        {
            title: "포인트관리", cards: [
                { label: "포인트 잔액",    value: stats.totalPoints,  unit: "P",  link: "/admin/points" },
                { label: "포인트 적립",    value: stats.earnPoints,   unit: "P",  link: "/admin/points/earn" },
                { label: "포인트 사용",    value: stats.usePoints,    unit: "P",  link: "/admin/points/use" },
                { label: "포인트 환불",    value: stats.refundPoints, unit: "P",  link: "/admin/points/refund" },
            ], color: "#2E86AB", light: true,
        },
        {
            title: "정산관리", cards: [
                { label: "전체 정산 내역", value: stats.totalSettlement,     unit: "건", link: "/admin/settlement" },
                { label: "정산 대기 건",   value: stats.pendingSettlement,   unit: "건", link: "/admin/settlement/pending" },
                { label: "정산 승인 건",   value: stats.approvedSettlement,  unit: "건", link: "/admin/settlement/approved" },
                { label: "정산 완료 건",   value: stats.completedSettlement, unit: "건", link: "/admin/settlement/completed" },
                { label: "정산 거절 건",   value: stats.rejectedSettlement,  unit: "건", link: "/admin/settlement/rejected" },
            ], color: "#1B3D6F",
        },
        {
            title: "공지관리", cards: [
                { label: "전체 공지사항", value: stats.totalNotice,   unit: "건", link: "/admin/notice" },
                { label: "고정 공지사항", value: stats.pinnedNotice,  unit: "건", link: "/admin/notice/pinned" },
                { label: "일반 공지사항", value: stats.generalNotice, unit: "건", link: "/admin/notice/general" },
            ], color: "#1C4A72",
        },
        {
            title: "매출", cards: [
                { label: "이번달 매출", value: stats.monthRevenue, unit: "원", link: "/admin/settlement" },
            ], color: "#1A3B5C",
        },
    ];

    const getSignupType = (u) => {
        if (u.provider === "kakao") return "카카오";
        if (u.provider === "google") return "구글";
        if (u.provider === "apple") return "Apple";
        return "이메일";
    };

    const getSignupColor = (u) => {
        if (u.provider === "kakao") return "#FEE500";
        if (u.provider === "google") return "#4285F4";
        if (u.provider === "apple") return "#333";
        return THEME.primary;
    };

    const getStatusLabel = (s) => {
        const m = { pending: "대기", requested: "요청", matched: "매칭", in_progress: "진행", completed: "완료", cancelled: "취소" };
        return m[s] || s || "-";
    };

    const getStatusColor = (s) => {
        const m = { pending: "#D97706", requested: "#D97706", matched: "#2563EB", in_progress: "#2563EB", completed: "#059669", cancelled: "#DC2626" };
        return m[s] || THEME.muted;
    };

    const getRoleLabel = (r) => r === "pro" ? "프로" : "일반";

    const revenueTooltip = ({ active, payload }) => {
        if (active && payload?.[0]) {
            return (
                <ChartTooltipBox>
                    <div>{payload[0].payload.name}</div>
                    <div style={{ fontWeight: 700 }}>{payload[0].value.toLocaleString()}원</div>
                </ChartTooltipBox>
            );
        }
        return null;
    };

    const countTooltip = ({ active, payload }) => {
        if (active && payload?.[0]) {
            return (
                <ChartTooltipBox>
                    <div>{payload[0].payload.name}</div>
                    <div style={{ fontWeight: 700 }}>{payload[0].value.toLocaleString()}</div>
                </ChartTooltipBox>
            );
        }
        return null;
    };

    if (loading) return <LoadingWrap>데이터를 불러오는 중...</LoadingWrap>;

    return (
        <Wrap>
            {/* 통계 카드 */}
            <StatsWrap>
                {cardGroups.flatMap((group) =>
                    group.cards.map((card, ci) => (
                        <StatCard key={`${group.title}-${ci}`} $bg={group.color} onClick={() => nav(card.link)}>
                            <StatLabel>{card.label}</StatLabel>
                            <StatValueRow>
                                <StatValue>{card.value.toLocaleString()}</StatValue>
                                <StatUnit>{card.unit}</StatUnit>
                            </StatValueRow>
                        </StatCard>
                    ))
                )}
            </StatsWrap>

            {/* 추이 차트 3열 */}
            <ChartGrid>
                <ChartCard>
                    <ChartHeader>
                        <ChartTitle>회원 가입 추이</ChartTitle>
                        <ChartSub>이번달 일별</ChartSub>
                    </ChartHeader>
                    <ChartBody>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={emptyChartData.users} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip content={countTooltip} />
                                <Area type="monotone" dataKey="value" stroke="#2563EB" fill="#DBEAFE" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartBody>
                </ChartCard>

                <ChartCard>
                    <ChartHeader>
                        <ChartTitle>매칭 건수 추이</ChartTitle>
                        <ChartSub>이번달 일별</ChartSub>
                    </ChartHeader>
                    <ChartBody>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={emptyChartData.orders} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip content={countTooltip} />
                                <Bar dataKey="value" fill="#1B4D7A" radius={[4, 4, 0, 0]} barSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartBody>
                </ChartCard>

                <ChartCard>
                    <ChartHeader>
                        <ChartTitle>매출 추이</ChartTitle>
                        <ChartSub>이번달 일별</ChartSub>
                    </ChartHeader>
                    <ChartBody>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={emptyChartData.revenue} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false}
                                    tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}만` : v.toLocaleString()} />
                                <Tooltip content={revenueTooltip} />
                                <Area type="monotone" dataKey="value" stroke="#059669" fill="#D1FAE5" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartBody>
                </ChartCard>
            </ChartGrid>

            {/* 테이블 2열 */}
            <TableGrid>
                <TableCard>
                    <TableHeader>
                        <TableTitle>최근 가입 회원</TableTitle>
                        <MoreLink onClick={() => nav("/admin/users")}>전체보기 <IoArrowForwardOutline size={13} /></MoreLink>
                    </TableHeader>
                    <TableBody>
                        <Table>
                            <thead>
                                <tr><Th>이름</Th><Th>전화번호</Th><Th>유형</Th><Th>가입방식</Th><Th>가입일</Th></tr>
                            </thead>
                            <tbody>
                                {recentUsers.length === 0 ? (
                                    <tr><Td colSpan={5}><EmptyText>가입한 회원이 없습니다</EmptyText></Td></tr>
                                ) : recentUsers.map((u) => (
                                    <tr key={u.id}>
                                        <Td><UserName>{u.name || "-"}</UserName></Td>
                                        <Td>{u.phone || "-"}</Td>
                                        <Td><RoleBadge $pro={u.role === "pro"}>{getRoleLabel(u.role)}</RoleBadge></Td>
                                        <Td><ProviderDot $color={getSignupColor(u)} />{getSignupType(u)}</Td>
                                        <Td>{formatDateTime(u.createdAt)}</Td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </TableBody>
                </TableCard>

                <TableCard>
                    <TableHeader>
                        <TableTitle>최근 매칭 내역</TableTitle>
                        <MoreLink onClick={() => nav("/admin/matching")}>전체보기 <IoArrowForwardOutline size={13} /></MoreLink>
                    </TableHeader>
                    <TableBody>
                        <Table>
                            <thead>
                                <tr><Th>주문번호</Th><Th>카테고리</Th><Th>고객</Th><Th>금액</Th><Th>상태</Th><Th>날짜</Th></tr>
                            </thead>
                            <tbody>
                                {recentOrders.length === 0 ? (
                                    <tr><Td colSpan={6}><EmptyText>매칭 내역이 없습니다</EmptyText></Td></tr>
                                ) : recentOrders.map((o) => (
                                    <tr key={o.id}>
                                        <Td><OrderId>{o.id.substring(0, 8)}</OrderId></Td>
                                        <Td>{o.category || "-"}</Td>
                                        <Td>{o.customerName || "-"}</Td>
                                        <Td>{o.amount ? `${o.amount.toLocaleString()}원` : "-"}</Td>
                                        <Td><StatusBadge $color={getStatusColor(o.status)}>{getStatusLabel(o.status)}</StatusBadge></Td>
                                        <Td>{formatDate(o.createdAt)}</Td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </TableBody>
                </TableCard>
            </TableGrid>
        </Wrap>
    );
};

export default AdminDashboardPage;

// ─── 스타일 ───
const Wrap = styled.div``;

const LoadingWrap = styled.div`
    display: flex; align-items: center; justify-content: center;
    height: 50vh; font-size: 14px; color: ${THEME.muted};
`;

// ── 통계 카드 ──
const StatsWrap = styled.div`
    display: flex; flex-wrap: wrap; gap: 6px;
    margin-bottom: 20px;
`;

const StatCard = styled.div`
    background: ${p => p.$bg};
    border-radius: 4px;
    padding: 18px 16px;
    width: 140px;
    cursor: pointer;
    transition: all 0.15s;
    display: flex; flex-direction: column; justify-content: space-between;
    &:hover { opacity: 0.9; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
`;

const StatLabel = styled.div`
    font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 700;
    margin-bottom: 10px; white-space: nowrap;
`;

const StatValueRow = styled.div`
    display: flex; align-items: baseline; justify-content: center; gap: 4px;
`;

const StatValue = styled.span`
    font-size: 24px; font-weight: 700; color: #fff; line-height: 1.2;
`;

const StatUnit = styled.span`
    font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.55);
`;

// ── 차트 ──
const ChartGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
    margin-bottom: 24px;
`;

const ChartCard = styled.div`
    background: #fff;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    overflow: hidden;
`;

const ChartHeader = styled.div`
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px 0;
`;

const ChartTitle = styled.h3`
    font-size: 14px; font-weight: 700; color: ${THEME.text}; margin: 0;
`;

const ChartSub = styled.span`
    font-size: 12px; color: ${THEME.muted};
`;

const ChartBody = styled.div`
    padding: 12px 8px 8px;
`;

const ChartTooltipBox = styled.div`
    background: #1E293B; color: #fff; padding: 8px 12px;
    border-radius: 4px; font-size: 12px; line-height: 1.5;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
`;

// ── 테이블 ──
const TableGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
`;

const TableCard = styled.div`
    background: #fff;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    overflow: hidden;
`;

const TableHeader = styled.div`
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid ${THEME.border};
`;

const TableTitle = styled.h3`
    font-size: 15px; font-weight: 700; color: ${THEME.text}; margin: 0;
`;

const MoreLink = styled.button`
    display: flex; align-items: center; gap: 4px;
    font-size: 13px; color: ${THEME.primary}; font-weight: 500;
    background: none; border: none; cursor: pointer; padding: 0;
    &:hover { opacity: 0.8; }
`;

const TableBody = styled.div`overflow-x: auto;`;

const Table = styled.table`width: 100%; border-collapse: collapse; font-size: 13px;`;

const Th = styled.th`
    text-align: left; padding: 10px 16px;
    background: ${THEME.background}; color: ${THEME.muted};
    font-weight: 600; font-size: 12px; white-space: nowrap;
    border-bottom: 1px solid ${THEME.border};
`;

const Td = styled.td`
    padding: 10px 16px; color: ${THEME.text};
    border-bottom: 1px solid ${THEME.border};
    white-space: nowrap; font-size: 13px;
`;

const EmptyText = styled.div`
    text-align: center; color: ${THEME.muted}; padding: 20px 0; font-size: 13px;
`;

const UserName = styled.span`font-weight: 600;`;
const OrderId = styled.span`font-family: monospace; font-size: 12px; color: ${THEME.muted};`;

const RoleBadge = styled.span`
    display: inline-block; padding: 2px 8px; border-radius: 4px;
    font-size: 11px; font-weight: 600;
    color: ${p => p.$pro ? "#D97706" : THEME.primary};
    background: ${p => p.$pro ? "#FFFBEB" : "#EFF6FF"};
`;

const ProviderDot = styled.span`
    display: inline-block; width: 8px; height: 8px; border-radius: 50%;
    background: ${p => p.$color}; margin-right: 6px; vertical-align: middle;
`;

const StatusBadge = styled.span`
    display: inline-block; padding: 2px 8px; border-radius: 4px;
    font-size: 11px; font-weight: 600;
    color: ${p => p.$color}; background: ${p => `${p.$color}14`};
`;
