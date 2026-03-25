/* eslint-disable */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../../api/config";
import { THEME } from "../../config/homeproConfig";
import { IoSearchOutline, IoCloseOutline } from "react-icons/io5";

// ─── Helpers ───

const FILTER_LABELS = {
    all: "전체 회원",
    general: "일반 사용자",
    pro: "사업자 회원",
};

const PAGE_SIZE = 20;

const providerMap = {
    email: { label: "아이디", bg: "#6366F1", color: "#fff" },
    kakao: { label: "카카오", bg: "#FEE500", color: "#3C1E1E" },
    google: { label: "구글", bg: "#EA4335", color: "#fff" },
    apple: { label: "애플", bg: "#000", color: "#fff" },
};

const roleMap = {
    pro: { label: "프로", bg: THEME.primary, color: "#fff" },
    member: { label: "일반", bg: THEME.background, color: THEME.textSecondary },
};

const statusMap = {
    active: { label: "활성", bg: THEME.success, color: "#fff" },
    pending: { label: "대기", bg: THEME.accent, color: "#fff" },
    rejected: { label: "거절", bg: THEME.danger, color: "#fff" },
    suspended: { label: "정지", bg: THEME.muted, color: "#fff" },
};

const orderStatusMap = {
    pending: "대기", requested: "요청", matched: "매칭",
    in_progress: "진행", completed: "완료", cancelled: "취소",
};
const orderStatusColor = {
    pending: "#D97706", requested: "#D97706", matched: "#2563EB",
    in_progress: "#2563EB", completed: "#059669", cancelled: "#DC2626",
};

const settlementStatusMap = {
    pending: "대기", approved: "승인", completed: "완료", rejected: "거절",
};

const pointTypeMap = {
    earn: { label: "적립", color: "#059669" },
    use: { label: "사용", color: "#DC2626" },
    refund: { label: "환불", color: "#2563EB" },
};

const formatDate = (v) => {
    if (!v) return "-";
    let d;
    if (v.toDate) d = v.toDate();
    else if (v.seconds) d = new Date(v.seconds * 1000);
    else d = new Date(v);
    if (isNaN(d.getTime())) return "-";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}.${m}.${day}`;
};

const formatDateTime = (v) => {
    if (!v) return "-";
    let d;
    if (v.toDate) d = v.toDate();
    else if (v.seconds) d = new Date(v.seconds * 1000);
    else d = new Date(v);
    if (isNaN(d.getTime())) return "-";
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const TABS = [
    { key: "info", label: "기본정보" },
    { key: "orders", label: "주문/매칭" },
    { key: "chats", label: "채팅" },
    { key: "points", label: "포인트" },
    { key: "settlement", label: "정산" },
    { key: "community", label: "커뮤니티" },
    { key: "pro", label: "프로정보" },
];

// ─── Component ───

const AdminUsersPage = () => {
    const { filter } = useParams();
    const currentFilter = filter || "all";
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    // modal
    const [selectedUser, setSelectedUser] = useState(null);
    const [activeTab, setActiveTab] = useState("info");
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailData, setDetailData] = useState({});
    const [newPassword, setNewPassword] = useState("");
    const [pwSaving, setPwSaving] = useState(false);

    // fetch users
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, "users"));
            const list = snap.docs
                .map((d) => ({ id: d.id, ...d.data() }))
                .filter((u) => u.phoneE164 || u.phone); // 전화번호 미인증 유령 문서 제외
            list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setUsers(list);
        } catch (e) {
            console.error("users fetch error:", e);
        }
        setLoading(false);
    };

    useEffect(() => { fetchUsers(); }, []);

    // fetch detail data when user selected
    const fetchDetailData = useCallback(async (user) => {
        setDetailLoading(true);
        const uid = user.id;
        const data = {};

        try {
            const [ordersSnap, chatsSnap, pointsSnap, settlementSnap, communitySnap, proSnap] = await Promise.all([
                getDocs(query(collection(db, "homepro_orders"), where("createdBy", "==", uid), orderBy("createdAt", "desc"))).catch(() => ({ docs: [] })),
                getDocs(query(collection(db, "chatRooms"), where("participants", "array-contains", uid), orderBy("lastMessageAt", "desc"))).catch(() => ({ docs: [] })),
                getDocs(query(collection(db, "homepro_cash"), where("uid", "==", uid), orderBy("createdAt", "desc"))).catch(() => ({ docs: [] })),
                getDocs(query(collection(db, "homepro_settlements"), where("proUid", "==", uid), orderBy("createdAt", "desc"))).catch(() => ({ docs: [] })),
                getDocs(query(collection(db, "community_posts"), where("authorUid", "==", uid), orderBy("createdAt", "desc"))).catch(() => ({ docs: [] })),
                getDocs(query(collection(db, "homepro_pros"), where("uid", "==", uid))).catch(() => ({ docs: [] })),
            ]);

            data.orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.chats = chatsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.points = pointsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.settlement = settlementSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.community = communitySnap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.pro = proSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // 포인트 잔액 계산
            data.pointBalance = data.points.reduce((acc, p) => {
                if (p.type === "earn" || p.type === "refund") return acc + (p.amount || 0);
                if (p.type === "use") return acc - (p.amount || 0);
                return acc;
            }, 0);
        } catch (e) {
            console.error("detail fetch error:", e);
        }

        setDetailData(data);
        setDetailLoading(false);
    }, []);

    const openDetail = (user) => {
        setSelectedUser(user);
        setActiveTab("info");
        setNewPassword("");
        setDetailData({});
        fetchDetailData(user);
    };

    const closeDetail = () => {
        setSelectedUser(null);
        setDetailData({});
    };

    // filter
    const tabFiltered = useMemo(() => {
        if (currentFilter === "general") return users.filter((u) => !u.role || u.role === "member" || u.role === "user");
        if (currentFilter === "pro") return users.filter((u) => u.role === "pro");
        return users;
    }, [users, currentFilter]);

    const filtered = useMemo(() => {
        if (!search.trim()) return tabFiltered;
        const q = search.trim().toLowerCase();
        return tabFiltered.filter((u) => {
            const name = (u.name || "").toLowerCase();
            const phone = (u.phone || "").replace(/-/g, "");
            const email = (u.email || "").toLowerCase();
            return name.includes(q) || phone.includes(q) || email.includes(q);
        });
    }, [tabFiltered, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    useEffect(() => { setPage(1); }, [currentFilter, search]);

    // actions
    const handleApprove = async (e, user) => {
        e.stopPropagation();
        try {
            await updateDoc(doc(db, "users", user.id), { status: "active" });
            setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: "active" } : u)));
        } catch (err) {
            alert("승인 처리 중 오류가 발생했습니다.");
        }
    };

    const handleReject = async (e, user) => {
        e.stopPropagation();
        try {
            await updateDoc(doc(db, "users", user.id), { status: "rejected" });
            setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: "rejected" } : u)));
        } catch (err) {
            alert("거절 처리 중 오류가 발생했습니다.");
        }
    };

    const handleDelete = async (e, user) => {
        e.stopPropagation();
        if (!window.confirm(`"${user.name || user.id}" 회원을 삭제하시겠습니까?`)) return;
        try {
            if (user.phoneE164) {
                try { await deleteDoc(doc(db, "phones", user.phoneE164)); } catch (pe) {}
                try { await deleteDoc(doc(db, "users_by_phone", user.phoneE164)); } catch (pe) {}
            }
            await deleteDoc(doc(db, "users", user.id));
            setUsers((prev) => prev.filter((u) => u.id !== user.id));
            if (selectedUser?.id === user.id) closeDetail();
        } catch (err) {
            alert("삭제 처리 중 오류가 발생했습니다.");
        }
    };

    const handlePasswordChange = async () => {
        if (!newPassword.trim()) { alert("새 비밀번호를 입력하세요."); return; }
        setPwSaving(true);
        try {
            await updateDoc(doc(db, "users", selectedUser.id), { password: newPassword.trim() });
            alert("비밀번호가 변경되었습니다.");
            setNewPassword("");
        } catch (err) {
            alert("비밀번호 변경 중 오류가 발생했습니다.");
        }
        setPwSaving(false);
    };

    const renderProvider = (provider) => {
        const info = providerMap[provider] || { label: provider || "-", bg: THEME.muted, color: "#fff" };
        return <Badge $bg={info.bg} $color={info.color}>{info.label}</Badge>;
    };
    const renderRole = (role) => {
        const info = roleMap[role === "pro" ? "pro" : "member"];
        return <Badge $bg={info.bg} $color={info.color}>{info.label}</Badge>;
    };
    const renderStatus = (status) => {
        const info = statusMap[status] || statusMap.active;
        return <Badge $bg={info.bg} $color={info.color}>{info.label}</Badge>;
    };

    // visible tabs (프로 전용 탭은 프로만)
    const visibleTabs = useMemo(() => {
        if (!selectedUser) return TABS;
        const isPro = selectedUser.role === "pro";
        return TABS.filter(t => {
            if (t.key === "settlement" && !isPro) return false;
            if (t.key === "pro" && !isPro) return false;
            return true;
        });
    }, [selectedUser]);

    // ─── 탭별 렌더 ───

    const renderInfoTab = () => (
        <>
            <FieldRow><FL>이름</FL><FV>{selectedUser.name || "-"}</FV></FieldRow>
            <FieldRow><FL>대화명</FL><FV>{selectedUser.nickname || "-"}</FV></FieldRow>
            <FieldRow><FL>전화번호</FL><FV>{selectedUser.phone || "-"}</FV></FieldRow>
            <FieldRow><FL>이메일</FL><FV>{selectedUser.email || "-"}</FV></FieldRow>
            <FieldRow><FL>로그인 ID</FL><FV>{selectedUser.loginId || "-"}</FV></FieldRow>
            <FieldRow><FL>가입형태</FL><FV>{renderProvider(selectedUser.provider)}</FV></FieldRow>
            <FieldRow><FL>역할</FL><FV>{renderRole(selectedUser.role)}</FV></FieldRow>
            <FieldRow><FL>상태</FL><FV>{renderStatus(selectedUser.status)}</FV></FieldRow>
            <FieldRow><FL>지역</FL><FV>{selectedUser.region || "-"}</FV></FieldRow>
            <FieldRow><FL>가입일</FL><FV>{formatDateTime(selectedUser.createdAt)}</FV></FieldRow>
            {selectedUser.linkedSocialUids?.length > 0 && (
                <FieldRow><FL>소셜 연결</FL><FV style={{ fontSize: 11 }}>{selectedUser.linkedSocialUids.join(", ")}</FV></FieldRow>
            )}
            {selectedUser.linkedEmailUid && (
                <FieldRow><FL>이메일 연결</FL><FV style={{ fontSize: 11 }}>{selectedUser.linkedEmailUid}</FV></FieldRow>
            )}
            {selectedUser.referralCode && (
                <FieldRow><FL>추천인 코드</FL><FV>{selectedUser.referralCode}</FV></FieldRow>
            )}
            {selectedUser.referredBy && (
                <FieldRow><FL>추천인</FL><FV style={{ fontSize: 11 }}>{selectedUser.referredBy}</FV></FieldRow>
            )}
            {selectedUser.categories?.length > 0 && (
                <FieldRow><FL>카테고리</FL><FV>{selectedUser.categories.join(", ")}</FV></FieldRow>
            )}

            <Divider />
            <FL style={{ marginBottom: 8 }}>비밀번호 변경</FL>
            <div style={{ display: "flex", gap: 8 }}>
                <ModalInput type="text" placeholder="새 비밀번호 입력" value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)} style={{ flex: 1 }} />
                <SmallActionBtn onClick={handlePasswordChange} disabled={pwSaving}>
                    {pwSaving ? "저장중..." : "변경"}
                </SmallActionBtn>
            </div>
        </>
    );

    const renderOrdersTab = () => {
        const orders = detailData.orders || [];
        if (orders.length === 0) return <TabEmpty>주문/매칭 내역이 없습니다</TabEmpty>;
        return (
            <MiniTable>
                <thead>
                    <tr><MTh>주문번호</MTh><MTh>카테고리</MTh><MTh>금액</MTh><MTh>상태</MTh><MTh>날짜</MTh></tr>
                </thead>
                <tbody>
                    {orders.map(o => (
                        <tr key={o.id}>
                            <MTd><Mono>{o.id.substring(0, 8)}</Mono></MTd>
                            <MTd>{o.categoryId || o.category || "-"}</MTd>
                            <MTd>{o.amount ? `${o.amount.toLocaleString()}원` : "-"}</MTd>
                            <MTd><MiniStatus $color={orderStatusColor[o.status] || THEME.muted}>{orderStatusMap[o.status] || o.status || "-"}</MiniStatus></MTd>
                            <MTd>{formatDate(o.createdAt)}</MTd>
                        </tr>
                    ))}
                </tbody>
            </MiniTable>
        );
    };

    const renderChatsTab = () => {
        const chats = detailData.chats || [];
        if (chats.length === 0) return <TabEmpty>참여 중인 채팅이 없습니다</TabEmpty>;
        return (
            <MiniTable>
                <thead>
                    <tr><MTh>상대방</MTh><MTh>마지막 메시지</MTh><MTh>메시지 수</MTh><MTh>상태</MTh><MTh>날짜</MTh></tr>
                </thead>
                <tbody>
                    {chats.map(c => {
                        const otherUid = (c.participants || []).find(p => p !== selectedUser.id);
                        const otherName = c.participantNames?.[otherUid] || otherUid?.substring(0, 8) || "-";
                        return (
                            <tr key={c.id}>
                                <MTd>{otherName}</MTd>
                                <MTd><MsgPreview>{c.lastMessage || "-"}</MsgPreview></MTd>
                                <MTd>{c.messageCount || 0}</MTd>
                                <MTd><MiniStatus $color={c.status === "closed" ? THEME.muted : "#059669"}>{c.status === "closed" ? "종료" : "활성"}</MiniStatus></MTd>
                                <MTd>{formatDate(c.lastMessageAt)}</MTd>
                            </tr>
                        );
                    })}
                </tbody>
            </MiniTable>
        );
    };

    const renderPointsTab = () => {
        const points = detailData.points || [];
        return (
            <>
                <PointSummary>
                    <PointBox>
                        <PointBoxLabel>잔액</PointBoxLabel>
                        <PointBoxValue>{(detailData.pointBalance || 0).toLocaleString()} P</PointBoxValue>
                    </PointBox>
                    <PointBox>
                        <PointBoxLabel>총 적립</PointBoxLabel>
                        <PointBoxValue $color="#059669">
                            {points.filter(p => p.type === "earn").reduce((a, p) => a + (p.amount || 0), 0).toLocaleString()} P
                        </PointBoxValue>
                    </PointBox>
                    <PointBox>
                        <PointBoxLabel>총 사용</PointBoxLabel>
                        <PointBoxValue $color="#DC2626">
                            {points.filter(p => p.type === "use").reduce((a, p) => a + (p.amount || 0), 0).toLocaleString()} P
                        </PointBoxValue>
                    </PointBox>
                </PointSummary>
                {points.length === 0 ? <TabEmpty>포인트 내역이 없습니다</TabEmpty> : (
                    <MiniTable>
                        <thead>
                            <tr><MTh>유형</MTh><MTh>금액</MTh><MTh>사유</MTh><MTh>날짜</MTh></tr>
                        </thead>
                        <tbody>
                            {points.map(p => {
                                const info = pointTypeMap[p.type] || { label: p.type, color: THEME.muted };
                                return (
                                    <tr key={p.id}>
                                        <MTd><MiniStatus $color={info.color}>{info.label}</MiniStatus></MTd>
                                        <MTd style={{ fontWeight: 600 }}>{(p.amount || 0).toLocaleString()} P</MTd>
                                        <MTd>{p.reason || p.category || "-"}</MTd>
                                        <MTd>{formatDate(p.createdAt)}</MTd>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </MiniTable>
                )}
            </>
        );
    };

    const renderSettlementTab = () => {
        const list = detailData.settlement || [];
        if (list.length === 0) return <TabEmpty>정산 내역이 없습니다</TabEmpty>;
        return (
            <MiniTable>
                <thead>
                    <tr><MTh>금액</MTh><MTh>방법</MTh><MTh>상태</MTh><MTh>비고</MTh><MTh>날짜</MTh></tr>
                </thead>
                <tbody>
                    {list.map(s => (
                        <tr key={s.id}>
                            <MTd style={{ fontWeight: 600 }}>{(s.amount || 0).toLocaleString()}원</MTd>
                            <MTd>{s.method || "-"}</MTd>
                            <MTd><MiniStatus $color={
                                s.status === "completed" ? "#059669" :
                                s.status === "rejected" ? "#DC2626" :
                                s.status === "approved" ? "#2563EB" : "#D97706"
                            }>{settlementStatusMap[s.status] || s.status || "-"}</MiniStatus></MTd>
                            <MTd>{s.note || "-"}</MTd>
                            <MTd>{formatDate(s.createdAt)}</MTd>
                        </tr>
                    ))}
                </tbody>
            </MiniTable>
        );
    };

    const renderCommunityTab = () => {
        const posts = detailData.community || [];
        if (posts.length === 0) return <TabEmpty>작성한 게시글이 없습니다</TabEmpty>;
        return (
            <MiniTable>
                <thead>
                    <tr><MTh>제목</MTh><MTh>좋아요</MTh><MTh>댓글</MTh><MTh>날짜</MTh></tr>
                </thead>
                <tbody>
                    {posts.map(p => (
                        <tr key={p.id}>
                            <MTd><MsgPreview style={{ maxWidth: 240 }}>{p.title || p.content?.substring(0, 30) || "-"}</MsgPreview></MTd>
                            <MTd>{p.likeCount || 0}</MTd>
                            <MTd>{p.commentCount || 0}</MTd>
                            <MTd>{formatDate(p.createdAt)}</MTd>
                        </tr>
                    ))}
                </tbody>
            </MiniTable>
        );
    };

    const renderProTab = () => {
        const pros = detailData.pro || [];
        if (pros.length === 0) return <TabEmpty>등록된 프로 정보가 없습니다</TabEmpty>;
        return (
            <ProList>
                {pros.map(p => (
                    <ProCard key={p.id}>
                        <ProCardHeader>
                            <ProCategory>{p.categoryId || "-"}</ProCategory>
                            <MiniStatus $color={
                                p.status === "approved" ? "#059669" :
                                p.status === "rejected" ? "#DC2626" : "#D97706"
                            }>{p.status === "approved" ? "승인" : p.status === "rejected" ? "거절" : "대기"}</MiniStatus>
                        </ProCardHeader>
                        <FieldRow><FL>지역</FL><FV>{p.region ? `${p.region.sido || ""} ${p.region.gu || ""}`.trim() : "-"}</FV></FieldRow>
                        <FieldRow><FL>신청일</FL><FV>{formatDate(p.appliedAt || p.createdAt)}</FV></FieldRow>
                        {p.approvedAt && <FieldRow><FL>승인일</FL><FV>{formatDate(p.approvedAt)}</FV></FieldRow>}
                        {p.licenseUrl && (
                            <FieldRow><FL>사업자등록증</FL><FV><a href={p.licenseUrl} target="_blank" rel="noreferrer" style={{ color: THEME.primary, fontSize: 12 }}>보기</a></FV></FieldRow>
                        )}
                        {p.photoUrls?.length > 0 && (
                            <ProPhotos>
                                {p.photoUrls.map((url, i) => (
                                    <ProPhoto key={i} src={url} alt={`활동사진 ${i + 1}`} />
                                ))}
                            </ProPhotos>
                        )}
                        {p.detail && (
                            <ProDetail>
                                {Object.entries(p.detail).map(([k, v]) => (
                                    <FieldRow key={k}><FL>{k}</FL><FV>{String(v)}</FV></FieldRow>
                                ))}
                            </ProDetail>
                        )}
                    </ProCard>
                ))}
            </ProList>
        );
    };

    const renderTabContent = () => {
        if (detailLoading) return <TabEmpty>데이터를 불러오는 중...</TabEmpty>;
        switch (activeTab) {
            case "info": return renderInfoTab();
            case "orders": return renderOrdersTab();
            case "chats": return renderChatsTab();
            case "points": return renderPointsTab();
            case "settlement": return renderSettlementTab();
            case "community": return renderCommunityTab();
            case "pro": return renderProTab();
            default: return null;
        }
    };

    return (
        <Wrap>
            <Header>
                <Title>{FILTER_LABELS[currentFilter] || "전체 회원"}</Title>
                <SubTitle>홈프로 가입 회원을 관리합니다 (총 {tabFiltered.length}명)</SubTitle>
            </Header>

            <TopRow>
                <SearchBar>
                    <SearchIcon><IoSearchOutline size={16} /></SearchIcon>
                    <SearchInput placeholder="이름, 전화번호, 이메일 검색" value={search}
                        onChange={(e) => setSearch(e.target.value)} />
                </SearchBar>
                <CountInfo>검색 결과 {filtered.length}명</CountInfo>
            </TopRow>

            {loading ? (
                <LoadingWrap>회원 목록을 불러오는 중...</LoadingWrap>
            ) : (
                <>
                    <TableWrap>
                        <Table>
                            <thead>
                                <tr>
                                    <Th>이름</Th><Th>전화번호</Th><Th>가입형태</Th>
                                    <Th>역할</Th><Th>가입일</Th><Th>상태</Th><Th>관리</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {paged.length === 0 ? (
                                    <tr><Td colSpan={7}><EmptyRow>해당 조건의 회원이 없습니다.</EmptyRow></Td></tr>
                                ) : paged.map((u) => (
                                    <Tr key={u.id} onClick={() => openDetail(u)}>
                                        <Td>{u.name || "-"}</Td>
                                        <Td>{u.phone || "-"}</Td>
                                        <Td>{renderProvider(u.provider)}</Td>
                                        <Td>{renderRole(u.role)}</Td>
                                        <Td>{formatDate(u.createdAt)}</Td>
                                        <Td>{renderStatus(u.status)}</Td>
                                        <Td onClick={(e) => e.stopPropagation()}>
                                            {u.status === "pending" && (
                                                <>
                                                    <ActionBtn $bg={THEME.success} onClick={(e) => handleApprove(e, u)}>승인</ActionBtn>
                                                    <ActionBtn $bg={THEME.danger} onClick={(e) => handleReject(e, u)}>거절</ActionBtn>
                                                </>
                                            )}
                                            <ActionBtn $bg={THEME.danger} onClick={(e) => handleDelete(e, u)}>삭제</ActionBtn>
                                        </Td>
                                    </Tr>
                                ))}
                            </tbody>
                        </Table>
                    </TableWrap>

                    <PaginationRow>
                        <PageBtn disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>이전</PageBtn>
                        <PageInfo>{page} / {totalPages}</PageInfo>
                        <PageBtn disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>다음</PageBtn>
                    </PaginationRow>
                </>
            )}

            {/* ─── Detail Modal ─── */}
            {selectedUser && (
                <Overlay onClick={closeDetail}>
                    <ModalCard onClick={(e) => e.stopPropagation()}>
                        <ModalHeader>
                            <ModalTitle>
                                {selectedUser.name || selectedUser.nickname || "-"}
                            </ModalTitle>
                            <CloseBtn onClick={closeDetail}><IoCloseOutline size={22} /></CloseBtn>
                        </ModalHeader>

                        <TabBar>
                            {visibleTabs.map(t => (
                                <TabItem key={t.key} $active={activeTab === t.key} onClick={() => setActiveTab(t.key)}>
                                    {t.label}
                                    {t.key !== "info" && !detailLoading && detailData[t.key]?.length > 0 && (
                                        <TabCount>{detailData[t.key].length}</TabCount>
                                    )}
                                </TabItem>
                            ))}
                        </TabBar>

                        <TabContent>
                            {renderTabContent()}
                        </TabContent>
                    </ModalCard>
                </Overlay>
            )}
        </Wrap>
    );
};

export default AdminUsersPage;

// ─── Styled ───

const Wrap = styled.div``;
const Header = styled.div`margin-bottom: 20px;`;
const Title = styled.h1`font-size: 22px; font-weight: 700; color: ${THEME.text}; margin: 0 0 4px;`;
const SubTitle = styled.p`font-size: 13px; color: ${THEME.muted}; margin: 0;`;

const SearchBar = styled.div`position: relative; margin-bottom: 16px; max-width: 360px;`;
const SearchIcon = styled.span`position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: ${THEME.muted}; font-size: 15px; pointer-events: none;`;
const SearchInput = styled.input`width: 100%; padding: 9px 12px 9px 36px; border: 1px solid ${THEME.border}; border-radius: 4px; font-size: 14px; outline: none; background: #fff; &:focus { border-color: ${THEME.primary}; }`;

const TableWrap = styled.div`background: #fff; border-radius: 4px; overflow-x: auto; box-shadow: ${THEME.cardShadow};`;
const Table = styled.table`width: 100%; border-collapse: collapse; min-width: 780px;`;
const Th = styled.th`text-align: left; padding: 10px 14px; font-size: 12px; font-weight: 600; color: ${THEME.textSecondary}; background: ${THEME.background}; border-bottom: 1px solid ${THEME.border}; white-space: nowrap;`;
const Td = styled.td`padding: 10px 14px; font-size: 13px; color: ${THEME.text}; border-bottom: 1px solid ${THEME.border}; white-space: nowrap;`;
const Tr = styled.tr`cursor: pointer; transition: background 0.12s; &:hover { background: ${THEME.background}; }`;

const Badge = styled.span`display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; color: ${({ $color }) => $color || "#fff"}; background: ${({ $bg }) => $bg || THEME.muted};`;
const ActionBtn = styled.button`padding: 4px 10px; font-size: 12px; font-weight: 600; border: none; border-radius: 4px; cursor: pointer; margin-right: 4px; color: #fff; background: ${({ $bg }) => $bg || THEME.primary}; &:hover { opacity: 0.85; }`;

const PaginationRow = styled.div`display: flex; justify-content: center; align-items: center; gap: 12px; padding: 16px 0;`;
const PageBtn = styled.button`padding: 6px 14px; font-size: 13px; font-weight: 600; border: 1px solid ${THEME.border}; border-radius: 4px; background: #fff; color: ${THEME.text}; cursor: pointer; &:disabled { opacity: 0.4; cursor: default; } &:hover:not(:disabled) { background: ${THEME.background}; }`;
const PageInfo = styled.span`font-size: 13px; color: ${THEME.textSecondary};`;
const CountInfo = styled.span`font-size: 13px; color: ${THEME.muted}; margin-left: auto;`;
const TopRow = styled.div`display: flex; align-items: center; margin-bottom: 16px; gap: 12px;`;
const EmptyRow = styled.div`text-align: center; padding: 40px 0; color: ${THEME.muted}; font-size: 14px;`;
const LoadingWrap = styled.div`text-align: center; padding: 60px 0; color: ${THEME.muted}; font-size: 14px;`;

// ─── Modal ───

const Overlay = styled.div`position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000;`;
const ModalCard = styled.div`background: #fff; border-radius: 6px; width: 680px; max-height: 88vh; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.18);`;
const ModalHeader = styled.div`display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 0;`;
const ModalTitle = styled.h3`font-size: 18px; font-weight: 700; color: ${THEME.text}; margin: 0; display: flex; align-items: baseline; gap: 10px;`;
const ModalSubId = styled.span`font-size: 11px; color: ${THEME.muted}; font-weight: 400; font-family: monospace;`;
const CloseBtn = styled.button`background: none; border: none; cursor: pointer; color: ${THEME.muted}; padding: 4px; border-radius: 4px; display: flex; &:hover { background: ${THEME.background}; }`;

const TabBar = styled.div`display: flex; gap: 0; border-bottom: 1px solid ${THEME.border}; padding: 0 24px; margin-top: 16px;`;
const TabItem = styled.button`
    padding: 10px 14px; font-size: 13px; font-weight: 600; border: none; background: none; cursor: pointer;
    color: ${p => p.$active ? THEME.primary : THEME.muted};
    border-bottom: 2px solid ${p => p.$active ? THEME.primary : "transparent"};
    transition: all 0.15s; display: flex; align-items: center; gap: 4px;
    &:hover { color: ${THEME.text}; }
`;
const TabCount = styled.span`font-size: 10px; font-weight: 700; background: ${THEME.background}; color: ${THEME.muted}; padding: 1px 6px; border-radius: 999px;`;
const TabContent = styled.div`padding: 20px 24px; overflow-y: auto; flex: 1;`;
const TabEmpty = styled.div`text-align: center; padding: 40px 0; color: ${THEME.muted}; font-size: 13px;`;

// ─── Detail fields ───

const FieldRow = styled.div`display: flex; margin-bottom: 10px; font-size: 13px;`;
const FL = styled.div`width: 100px; flex-shrink: 0; color: ${THEME.muted}; font-weight: 600;`;
const FV = styled.div`color: ${THEME.text}; word-break: break-all;`;
const Divider = styled.div`height: 1px; background: ${THEME.border}; margin: 16px 0;`;
const ModalInput = styled.input`width: 100%; padding: 8px 10px; border: 1px solid ${THEME.border}; border-radius: 4px; font-size: 13px; outline: none; &:focus { border-color: ${THEME.primary}; }`;
const SmallActionBtn = styled.button`padding: 8px 18px; font-size: 13px; font-weight: 600; border: none; border-radius: 4px; cursor: pointer; color: #fff; background: ${THEME.primary}; white-space: nowrap; &:hover { opacity: 0.85; } &:disabled { opacity: 0.5; }`;

// ─── Mini table (tabs) ───

const MiniTable = styled.table`width: 100%; border-collapse: collapse; font-size: 12px;`;
const MTh = styled.th`text-align: left; padding: 8px 10px; font-size: 11px; font-weight: 600; color: ${THEME.muted}; background: ${THEME.background}; border-bottom: 1px solid ${THEME.border}; white-space: nowrap;`;
const MTd = styled.td`padding: 8px 10px; color: ${THEME.text}; border-bottom: 1px solid ${THEME.border}; white-space: nowrap; font-size: 12px;`;
const Mono = styled.span`font-family: monospace; font-size: 11px; color: ${THEME.muted};`;
const MsgPreview = styled.span`display: inline-block; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
const MiniStatus = styled.span`display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; color: ${p => p.$color}; background: ${p => `${p.$color}14`};`;

// ─── Points ───

const PointSummary = styled.div`display: flex; gap: 10px; margin-bottom: 16px;`;
const PointBox = styled.div`flex: 1; background: ${THEME.background}; border-radius: 6px; padding: 14px; text-align: center;`;
const PointBoxLabel = styled.div`font-size: 11px; color: ${THEME.muted}; font-weight: 600; margin-bottom: 4px;`;
const PointBoxValue = styled.div`font-size: 16px; font-weight: 700; color: ${p => p.$color || THEME.text};`;

// ─── Pro tab ───

const ProList = styled.div`display: flex; flex-direction: column; gap: 12px;`;
const ProCard = styled.div`border: 1px solid ${THEME.border}; border-radius: 6px; padding: 16px;`;
const ProCardHeader = styled.div`display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;`;
const ProCategory = styled.div`font-size: 14px; font-weight: 700; color: ${THEME.text};`;
const ProPhotos = styled.div`display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap;`;
const ProPhoto = styled.img`width: 80px; height: 80px; border-radius: 6px; object-fit: cover; border: 1px solid ${THEME.border};`;
const ProDetail = styled.div`margin-top: 10px; padding-top: 10px; border-top: 1px solid ${THEME.border};`;
