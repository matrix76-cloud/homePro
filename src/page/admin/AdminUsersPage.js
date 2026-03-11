/* eslint-disable */
import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy } from "firebase/firestore";
import { db } from "../../api/config";
import { THEME } from "../../config/homeproConfig";

// ─── Styled Components ───

const Wrap = styled.div``;

const Header = styled.div`
    margin-bottom: 20px;
`;

const Title = styled.h1`
    font-size: 22px;
    font-weight: 700;
    color: ${THEME.text};
    margin: 0 0 4px;
`;

const SubTitle = styled.p`
    font-size: 13px;
    color: ${THEME.muted};
    margin: 0;
`;


const SearchBar = styled.div`
    position: relative;
    margin-bottom: 16px;
    max-width: 360px;
`;

const SearchIcon = styled.span`
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: ${THEME.muted};
    font-size: 15px;
    pointer-events: none;
`;

const SearchInput = styled.input`
    width: 100%;
    padding: 9px 12px 9px 36px;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    font-size: 14px;
    outline: none;
    background: #fff;
    &:focus {
        border-color: ${THEME.primary};
    }
`;

const TableWrap = styled.div`
    background: #fff;
    border-radius: 4px;
    overflow-x: auto;
    box-shadow: ${THEME.cardShadow};
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    min-width: 780px;
`;

const Th = styled.th`
    text-align: left;
    padding: 10px 14px;
    font-size: 12px;
    font-weight: 600;
    color: ${THEME.textSecondary};
    background: ${THEME.background};
    border-bottom: 1px solid ${THEME.border};
    white-space: nowrap;
`;

const Td = styled.td`
    padding: 10px 14px;
    font-size: 13px;
    color: ${THEME.text};
    border-bottom: 1px solid ${THEME.border};
    white-space: nowrap;
`;

const Tr = styled.tr`
    cursor: pointer;
    transition: background 0.12s;
    &:hover {
        background: ${THEME.background};
    }
`;

const Badge = styled.span`
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    color: ${({ $color }) => $color || "#fff"};
    background: ${({ $bg }) => $bg || THEME.muted};
`;

const ActionBtn = styled.button`
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 600;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 4px;
    color: #fff;
    background: ${({ $bg }) => $bg || THEME.primary};
    &:hover {
        opacity: 0.85;
    }
`;

const PaginationRow = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    padding: 16px 0;
`;

const PageBtn = styled.button`
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    background: #fff;
    color: ${THEME.text};
    cursor: pointer;
    &:disabled {
        opacity: 0.4;
        cursor: default;
    }
    &:hover:not(:disabled) {
        background: ${THEME.background};
    }
`;

const PageInfo = styled.span`
    font-size: 13px;
    color: ${THEME.textSecondary};
`;

const CountInfo = styled.span`
    font-size: 13px;
    color: ${THEME.muted};
    margin-left: auto;
`;

const TopRow = styled.div`
    display: flex;
    align-items: center;
    margin-bottom: 16px;
    gap: 12px;
`;

// ─── Modal Styled ───

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const ModalCard = styled.div`
    background: #fff;
    border-radius: 4px;
    width: 480px;
    max-height: 85vh;
    overflow-y: auto;
    padding: 28px 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
`;

const ModalTitle = styled.h3`
    font-size: 18px;
    font-weight: 700;
    color: ${THEME.text};
    margin: 0 0 20px;
`;

const FieldRow = styled.div`
    display: flex;
    margin-bottom: 12px;
    font-size: 13px;
`;

const FieldLabel = styled.div`
    width: 100px;
    flex-shrink: 0;
    color: ${THEME.muted};
    font-weight: 600;
`;

const FieldValue = styled.div`
    color: ${THEME.text};
    word-break: break-all;
`;

const Divider = styled.div`
    height: 1px;
    background: ${THEME.border};
    margin: 16px 0;
`;

const ModalInput = styled.input`
    width: 100%;
    padding: 8px 10px;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    font-size: 13px;
    outline: none;
    &:focus {
        border-color: ${THEME.primary};
    }
`;

const ModalBtnRow = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
`;

const ModalBtn = styled.button`
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 600;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    color: #fff;
    background: ${({ $bg }) => $bg || THEME.primary};
    &:hover {
        opacity: 0.85;
    }
`;

const ModalCloseBtn = styled.button`
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    cursor: pointer;
    color: ${THEME.text};
    background: #fff;
    &:hover {
        background: ${THEME.background};
    }
`;

const EmptyRow = styled.div`
    text-align: center;
    padding: 40px 0;
    color: ${THEME.muted};
    font-size: 14px;
`;

const LoadingWrap = styled.div`
    text-align: center;
    padding: 60px 0;
    color: ${THEME.muted};
    font-size: 14px;
`;

// ─── Helpers ───

const FILTER_LABELS = {
    all: "전체 회원",
    general: "일반 사용자",
    pro: "사업자 회원",
};

const PAGE_SIZE = 20;

const providerMap = {
    email: { label: "이메일", bg: "#6366F1", color: "#fff" },
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

// ─── Component ───

const AdminUsersPage = () => {
    const { filter } = useParams();
    const currentFilter = filter || "all";
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newPassword, setNewPassword] = useState("");
    const [pwSaving, setPwSaving] = useState(false);

    // fetch users
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, "users"));
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            list.sort((a, b) => {
                const ta = a.createdAt?.seconds || 0;
                const tb = b.createdAt?.seconds || 0;
                return tb - ta;
            });
            setUsers(list);
        } catch (e) {
            console.error("users fetch error:", e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // filter by route param
    const tabFiltered = useMemo(() => {
        if (currentFilter === "general") return users.filter((u) => !u.role || u.role === "member");
        if (currentFilter === "pro") return users.filter((u) => u.role === "pro");
        return users;
    }, [users, currentFilter]);

    // filter by search
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

    // pagination
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    useEffect(() => {
        setPage(1);
    }, [currentFilter, search]);

    // actions
    const handleApprove = async (e, user) => {
        e.stopPropagation();
        try {
            await updateDoc(doc(db, "users", user.id), { status: "active" });
            setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: "active" } : u)));
        } catch (err) {
            console.error("approve error:", err);
            alert("승인 처리 중 오류가 발생했습니다.");
        }
    };

    const handleReject = async (e, user) => {
        e.stopPropagation();
        try {
            await updateDoc(doc(db, "users", user.id), { status: "rejected" });
            setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: "rejected" } : u)));
        } catch (err) {
            console.error("reject error:", err);
            alert("거절 처리 중 오류가 발생했습니다.");
        }
    };

    const handleDelete = async (e, user) => {
        e.stopPropagation();
        if (!window.confirm(`"${user.name || user.id}" 회원을 삭제하시겠습니까?`)) return;
        try {
            await deleteDoc(doc(db, "users", user.id));
            setUsers((prev) => prev.filter((u) => u.id !== user.id));
            if (selectedUser?.id === user.id) setSelectedUser(null);
        } catch (err) {
            console.error("delete error:", err);
            alert("삭제 처리 중 오류가 발생했습니다.");
        }
    };

    // password change
    const handlePasswordChange = async () => {
        if (!newPassword.trim()) {
            alert("새 비밀번호를 입력하세요.");
            return;
        }
        setPwSaving(true);
        try {
            await updateDoc(doc(db, "users", selectedUser.id), { password: newPassword.trim() });
            alert("비밀번호가 변경되었습니다.");
            setNewPassword("");
            setUsers((prev) =>
                prev.map((u) => (u.id === selectedUser.id ? { ...u, password: newPassword.trim() } : u))
            );
            setSelectedUser((prev) => ({ ...prev, password: newPassword.trim() }));
        } catch (err) {
            console.error("pw change error:", err);
            alert("비밀번호 변경 중 오류가 발생했습니다.");
        }
        setPwSaving(false);
    };

    // render provider badge
    const renderProvider = (provider) => {
        const info = providerMap[provider] || { label: provider || "-", bg: THEME.muted, color: "#fff" };
        return <Badge $bg={info.bg} $color={info.color}>{info.label}</Badge>;
    };

    const renderRole = (role) => {
        const key = role === "pro" ? "pro" : "member";
        const info = roleMap[key];
        return <Badge $bg={info.bg} $color={info.color}>{info.label}</Badge>;
    };

    const renderStatus = (status) => {
        const info = statusMap[status] || statusMap.active;
        return <Badge $bg={info.bg} $color={info.color}>{info.label}</Badge>;
    };

    return (
        <Wrap>
            <Header>
                <Title>{FILTER_LABELS[currentFilter] || "전체 회원"}</Title>
                <SubTitle>홈프로 가입 회원을 관리합니다 (총 {tabFiltered.length}명)</SubTitle>
            </Header>

            <TopRow>
                <SearchBar>
                    <SearchIcon>&#x1F50D;</SearchIcon>
                    <SearchInput
                        placeholder="이름, 전화번호, 이메일 검색"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
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
                                    <Th>이름</Th>
                                    <Th>전화번호</Th>
                                    <Th>가입형태</Th>
                                    <Th>역할</Th>
                                    <Th>가입일</Th>
                                    <Th>상태</Th>
                                    <Th>관리</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {paged.length === 0 ? (
                                    <tr>
                                        <Td colSpan={7}>
                                            <EmptyRow>해당 조건의 회원이 없습니다.</EmptyRow>
                                        </Td>
                                    </tr>
                                ) : (
                                    paged.map((u) => (
                                        <Tr key={u.id} onClick={() => { setSelectedUser(u); setNewPassword(""); }}>
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
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </TableWrap>

                    <PaginationRow>
                        <PageBtn disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                            이전
                        </PageBtn>
                        <PageInfo>{page} / {totalPages}</PageInfo>
                        <PageBtn disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                            다음
                        </PageBtn>
                    </PaginationRow>
                </>
            )}

            {/* ─── User Detail Modal ─── */}
            {selectedUser && (
                <Overlay onClick={() => setSelectedUser(null)}>
                    <ModalCard onClick={(e) => e.stopPropagation()}>
                        <ModalTitle>회원 상세 정보</ModalTitle>

                        <FieldRow>
                            <FieldLabel>문서 ID</FieldLabel>
                            <FieldValue>{selectedUser.id}</FieldValue>
                        </FieldRow>
                        <FieldRow>
                            <FieldLabel>이름</FieldLabel>
                            <FieldValue>{selectedUser.name || "-"}</FieldValue>
                        </FieldRow>
                        <FieldRow>
                            <FieldLabel>전화번호</FieldLabel>
                            <FieldValue>{selectedUser.phone || "-"}</FieldValue>
                        </FieldRow>
                        <FieldRow>
                            <FieldLabel>이메일</FieldLabel>
                            <FieldValue>{selectedUser.email || "-"}</FieldValue>
                        </FieldRow>
                        <FieldRow>
                            <FieldLabel>로그인 ID</FieldLabel>
                            <FieldValue>{selectedUser.loginId || "-"}</FieldValue>
                        </FieldRow>
                        <FieldRow>
                            <FieldLabel>가입형태</FieldLabel>
                            <FieldValue>{renderProvider(selectedUser.provider)}</FieldValue>
                        </FieldRow>
                        <FieldRow>
                            <FieldLabel>역할</FieldLabel>
                            <FieldValue>{renderRole(selectedUser.role)}</FieldValue>
                        </FieldRow>
                        <FieldRow>
                            <FieldLabel>상태</FieldLabel>
                            <FieldValue>{renderStatus(selectedUser.status)}</FieldValue>
                        </FieldRow>
                        <FieldRow>
                            <FieldLabel>가입일</FieldLabel>
                            <FieldValue>{formatDate(selectedUser.createdAt)}</FieldValue>
                        </FieldRow>
                        {selectedUser.linkedSocialUid && (
                            <FieldRow>
                                <FieldLabel>소셜 연결</FieldLabel>
                                <FieldValue>{selectedUser.linkedSocialUid}</FieldValue>
                            </FieldRow>
                        )}
                        {selectedUser.region && (
                            <FieldRow>
                                <FieldLabel>지역</FieldLabel>
                                <FieldValue>{selectedUser.region}</FieldValue>
                            </FieldRow>
                        )}
                        {selectedUser.categories && selectedUser.categories.length > 0 && (
                            <FieldRow>
                                <FieldLabel>카테고리</FieldLabel>
                                <FieldValue>{selectedUser.categories.join(", ")}</FieldValue>
                            </FieldRow>
                        )}

                        <Divider />

                        <FieldLabel style={{ marginBottom: 8 }}>비밀번호 변경</FieldLabel>
                        <div style={{ display: "flex", gap: 8 }}>
                            <ModalInput
                                type="text"
                                placeholder="새 비밀번호 입력"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                style={{ flex: 1 }}
                            />
                            <ModalBtn onClick={handlePasswordChange} disabled={pwSaving}>
                                {pwSaving ? "저장중..." : "변경"}
                            </ModalBtn>
                        </div>

                        <ModalBtnRow>
                            <ModalCloseBtn onClick={() => setSelectedUser(null)}>닫기</ModalCloseBtn>
                        </ModalBtnRow>
                    </ModalCard>
                </Overlay>
            )}
        </Wrap>
    );
};

export default AdminUsersPage;
