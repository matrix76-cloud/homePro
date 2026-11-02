/* eslint-disable */
/**
 * 공인중개사 사후 인증 관리 (대표 리뷰 11/02 선활동 · 후관리)
 *  - 공동중개는 인증서 사진을 올리는 즉시 우선활동(provisional) — 여기서 사후에 대조한다
 *  - [승인 완료] approved + 알림 / [반려 · 서류 보완] rejected + 사유 알림 (재등록 전까지 활동 제한)
 *  - [허위 제재] banned + users.orderBlocked · brokerBanned (계정 이용 정지)
 *  - 승인이 필요한 분야(PRO_APPROVAL_REQUIRED_CATEGORIES = 공동중개)만 다룬다 — 다른 분야는 등록 즉시 승인이라 섞이면 목록이 묻힌다
 *  - 옛 "pending" 문서는 우선활동과 같은 탭에서 본다 (마이그레이션 없음)
 */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { collection, getDocs, doc, updateDoc, addDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../api/config";
import { THEME, PRO_APPROVAL_REQUIRED_CATEGORIES } from "../../config/homeproConfig";
import { normalizeBrokerStatus, brokerStatusStyle } from "../../service/BrokerService";
import { IoSearchOutline, IoCloseOutline, IoImageOutline } from "react-icons/io5";

const PAGE_SIZE = 20;

const TAB_LIST = [
    { key: "provisional", label: "우선활동 (사후심사)" },
    { key: "approved", label: "승인완료" },
    { key: "rejected", label: "반려" },
    { key: "banned", label: "제재" },
];

// 활동 상태 — 뱃지 없이 글씨 색 + 아이콘
const ACTIVITY_LABEL = {
    provisional: "우선활동 중",
    approved: "공식 인증",
    rejected: "보완 요청",
    banned: "제재",
};

const REJECT_REASONS = ["서류 식별 불가", "정보 불일치", "기타 (직접 입력)"];

const formatDate = (v) => {
    if (!v) return "-";
    let d;
    if (v.toDate) d = v.toDate();
    else if (v.seconds) d = new Date(v.seconds * 1000);
    else d = new Date(v);
    if (isNaN(d.getTime())) return "-";
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

const formatDateTime = (v) => {
    if (!v) return "-";
    let d;
    if (v.toDate) d = v.toDate();
    else if (v.seconds) d = new Date(v.seconds * 1000);
    else d = new Date(v);
    if (isNaN(d.getTime())) return "-";
    return `${formatDate(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// 인증서 사진 — 자격증 사본 · 개설등록증(certs) 먼저, 없으면 사업자등록증
const certImages = (p) => {
    const certs = Array.isArray(p.detail?.certs) ? p.detail.certs : [];
    const list = certs.filter(c => c?.url).map(c => ({ url: c.url, name: c.certName || c.name || "인증서" }));
    if (p.licenseUrl) list.push({ url: p.licenseUrl, name: "사업자등록증" });
    return list;
};

const ActivityStatus = ({ status }) => {
    const { color, Icon } = brokerStatusStyle(status);
    return (
        <StatusText style={{ color }}>
            <Icon size={16} style={{ flexShrink: 0 }} />
            {ACTIVITY_LABEL[status] || "-"}
        </StatusText>
    );
};

const AdminProApprovalPage = () => {
    const { filter } = useParams();
    // 옛 주소(/pending)는 우선활동 탭으로
    const activeTab = !filter || filter === "pending" ? "provisional" : filter;
    const [pros, setPros] = useState([]);
    const [users, setUsers] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(null);
    const [reasonKind, setReasonKind] = useState(REJECT_REASONS[0]);
    const [reasonText, setReasonText] = useState("");
    const [busy, setBusy] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [prosSnap, usersSnap] = await Promise.all([
                getDocs(query(collection(db, "homepro_pros"), orderBy("appliedAt", "desc"))).catch(() => ({ docs: [] })),
                getDocs(collection(db, "users")).catch(() => ({ docs: [] })),
            ]);
            setPros(prosSnap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(p => PRO_APPROVAL_REQUIRED_CATEGORIES.includes(p.categoryId)));
            const uMap = {};
            usersSnap.docs.forEach(d => { uMap[d.id] = d.data(); });
            setUsers(uMap);
        } catch (e) {
            console.error("프로 목록 조회 실패:", e);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const getUserInfo = (uid) => users[uid] || {};
    const nameOf = (p) => { const u = getUserInfo(p.uid); return u.name || u.nickname || p.detail?.repName || p.uid?.substring(0, 8) || "-"; };
    const phoneOf = (p) => { const u = getUserInfo(p.uid); return u.phone || u.phoneE164 || p.detail?.repPhone || "-"; };

    const filtered = useMemo(() => {
        let list = pros.filter(p => normalizeBrokerStatus(p.status) === activeTab);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(p => {
                const hay = [nameOf(p), phoneOf(p), p.detail?.officeName, p.detail?.registrationNumber]
                    .filter(Boolean).join(" ").toLowerCase();
                return hay.includes(q);
            });
        }
        return list;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pros, activeTab, search, users]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    useEffect(() => { setPage(1); }, [activeTab, search]);

    const getTabCount = (key) => pros.filter(p => normalizeBrokerStatus(p.status) === key).length;

    const patchLocal = (id, patch) => {
        setPros(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
        setSelected(prev => (prev?.id === id ? { ...prev, ...patch } : prev));
    };

    const notify = async (uid, title, body, type) => {
        if (!uid) return;
        await addDoc(collection(db, "notifications"), {
            targetUids: [uid], title, body, type,
            read: false, sent: false, createdAt: serverTimestamp(),
        });
    };

    // [승인 완료] — 즉시 공식 인증 + 파트너에게 알림
    const handleApprove = async (pro) => {
        if (busy) return;
        setBusy(true);
        try {
            await updateDoc(doc(db, "homepro_pros", pro.id), { status: "approved", approvedAt: serverTimestamp() });
            await notify(pro.uid, "공인중개사 공식 인증", "공인중개사 공식 인증이 완료되었습니다", "pro_approval");
            patchLocal(pro.id, { status: "approved", approvedAt: new Date() });
        } catch (e) {
            alert("승인 처리 중 오류가 발생했습니다.");
        }
        setBusy(false);
    };

    // [반려 / 서류 보완] — 사유 안내 + 재등록 전까지 활동 제한
    const handleReject = async (pro) => {
        if (busy) return;
        const isEtc = reasonKind === REJECT_REASONS[REJECT_REASONS.length - 1];
        const reason = (isEtc ? reasonText : reasonKind).trim();
        if (!reason) { alert("보완 요청 사유를 입력해주세요."); return; }
        setBusy(true);
        try {
            await updateDoc(doc(db, "homepro_pros", pro.id), {
                status: "rejected",
                rejectedAt: serverTimestamp(),
                rejectReason: reason,
            });
            await notify(pro.uid, "공인중개사 서류 보완 요청", `서류 보완 요청: ${reason}. 선명한 사진으로 다시 등록해 주세요.`, "pro_rejection");
            patchLocal(pro.id, { status: "rejected", rejectReason: reason, rejectedAt: new Date() });
            setReasonText("");
        } catch (e) {
            alert("반려 처리 중 오류가 발생했습니다.");
        }
        setBusy(false);
    };

    // [허위 제재] — 명백한 도용 · 허위 자격 등록 시 계정 이용 정지
    const handleBan = async (pro) => {
        if (busy) return;
        if (!window.confirm(`${nameOf(pro)} 님을 허위 자격 등록으로 제재할까요?\n공동중개 활동과 오더 작성 · 수락이 모두 막힙니다.`)) return;
        setBusy(true);
        try {
            await updateDoc(doc(db, "homepro_pros", pro.id), { status: "banned", bannedAt: serverTimestamp() });
            if (pro.uid) await updateDoc(doc(db, "users", pro.uid), { orderBlocked: true, brokerBanned: true });
            await notify(pro.uid, "이용 정지 안내", "허위 자격 등록으로 이용이 정지되었습니다", "pro_banned");
            patchLocal(pro.id, { status: "banned" });
            setUsers(prev => ({ ...prev, [pro.uid]: { ...(prev[pro.uid] || {}), orderBlocked: true, brokerBanned: true } }));
        } catch (e) {
            alert("제재 처리 중 오류가 발생했습니다.");
        }
        setBusy(false);
    };

    // [제재 해제] — 우선활동으로 되돌리고 계정 차단을 푼다
    const handleUnban = async (pro) => {
        if (busy) return;
        if (!window.confirm(`${nameOf(pro)} 님의 제재를 해제할까요?\n우선활동 상태로 돌아가고 오더 작성 · 수락 차단도 풀립니다.`)) return;
        setBusy(true);
        try {
            await updateDoc(doc(db, "homepro_pros", pro.id), { status: "provisional", provisionalAt: serverTimestamp(), bannedAt: null });
            if (pro.uid) await updateDoc(doc(db, "users", pro.uid), { orderBlocked: false, brokerBanned: false });
            patchLocal(pro.id, { status: "provisional" });
            setUsers(prev => ({ ...prev, [pro.uid]: { ...(prev[pro.uid] || {}), orderBlocked: false, brokerBanned: false } }));
        } catch (e) {
            alert("제재 해제 중 오류가 발생했습니다.");
        }
        setBusy(false);
    };

    const openDetail = (pro) => {
        setSelected(pro);
        setReasonKind(REJECT_REASONS[0]);
        setReasonText("");
    };

    const rowActions = (p) => {
        const st = normalizeBrokerStatus(p.status);
        if (st === "provisional") return (
            <>
                <ActionBtn $primary onClick={() => handleApprove(p)} disabled={busy}>승인 완료</ActionBtn>
                <ActionBtn $danger onClick={() => openDetail(p)} disabled={busy}>반려 / 서류 보완</ActionBtn>
                <ActionBtn $danger onClick={() => handleBan(p)} disabled={busy}>허위 제재</ActionBtn>
            </>
        );
        if (st === "approved") return <ActionBtn $danger onClick={() => handleBan(p)} disabled={busy}>허위 제재</ActionBtn>;
        if (st === "rejected") return (
            <>
                <ActionBtn $primary onClick={() => handleApprove(p)} disabled={busy}>재승인</ActionBtn>
                <ActionBtn $danger onClick={() => handleBan(p)} disabled={busy}>허위 제재</ActionBtn>
            </>
        );
        if (st === "banned") return <ActionBtn onClick={() => handleUnban(p)} disabled={busy}>제재 해제</ActionBtn>;
        return null;
    };

    const selSt = selected ? normalizeBrokerStatus(selected.status) : null;
    const isEtcReason = reasonKind === REJECT_REASONS[REJECT_REASONS.length - 1];

    return (
        <Wrap>
            <Header>
                <Title>공인중개사 사후 인증 관리</Title>
                <RefreshBtn onClick={fetchData}>새로고침</RefreshBtn>
            </Header>

            <TabBar>
                {TAB_LIST.map(t => (
                    <TabItem key={t.key} $active={activeTab === t.key}
                        onClick={() => window.location.hash = ""}
                        as="a" href={t.key === "provisional" ? "/admin/pro-approval" : `/admin/pro-approval/${t.key}`}>
                        {t.label}
                        <TabCount $active={activeTab === t.key}>{getTabCount(t.key)}</TabCount>
                    </TabItem>
                ))}
            </TabBar>

            <SearchBar>
                <SearchIcon><IoSearchOutline size={16} /></SearchIcon>
                <SearchInput placeholder="회원명, 연락처, 사무소명, 등록번호 검색" value={search}
                    onChange={(e) => setSearch(e.target.value)} />
            </SearchBar>

            {loading ? (
                <EmptyMsg>불러오는 중...</EmptyMsg>
            ) : paged.length === 0 ? (
                <EmptyMsg>해당 조건의 공인중개사가 없습니다.</EmptyMsg>
            ) : (
                <>
                    <TableWrap>
                        <Table>
                            <thead>
                                <tr>
                                    <Th>회원명</Th>
                                    <Th>연락처</Th>
                                    <Th>사무소명</Th>
                                    <Th>등록번호</Th>
                                    <Th>인증서</Th>
                                    <Th>등록일시</Th>
                                    <Th>활동 상태</Th>
                                    <Th>관리</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {paged.map(p => {
                                    const imgs = certImages(p);
                                    return (
                                        <Tr key={p.id} onClick={() => openDetail(p)}>
                                            <Td>{nameOf(p)}</Td>
                                            <Td>{phoneOf(p)}</Td>
                                            <Td $wrap>{p.detail?.officeName || "-"}</Td>
                                            <Td $wrap>{p.detail?.registrationNumber || "-"}</Td>
                                            <Td>
                                                {imgs.length ? (
                                                    <Thumb src={imgs[0].url} alt={imgs[0].name} title="눌러서 크게 보기" />
                                                ) : (
                                                    <NoThumb><IoImageOutline size={16} /> 없음</NoThumb>
                                                )}
                                            </Td>
                                            <Td>{formatDateTime(p.provisionalAt || p.appliedAt)}</Td>
                                            <Td><ActivityStatus status={normalizeBrokerStatus(p.status)} /></Td>
                                            <Td onClick={e => e.stopPropagation()}>{rowActions(p)}</Td>
                                        </Tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </TableWrap>

                    <PaginationRow>
                        <PageBtn disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</PageBtn>
                        <PageInfo>{page} / {totalPages}</PageInfo>
                        <PageBtn disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>다음</PageBtn>
                    </PaginationRow>
                </>
            )}

            {/* 상세 모달 — 인증서 크게 보기 + 승인 · 보완 · 제재 */}
            {selected && (
                <Overlay onClick={() => setSelected(null)}>
                    <Modal onClick={e => e.stopPropagation()}>
                        <ModalHeader>
                            <ModalTitle>공인중개사 인증 상세</ModalTitle>
                            <CloseBtn onClick={() => setSelected(null)}><IoCloseOutline size={22} /></CloseBtn>
                        </ModalHeader>
                        <ModalBody>
                            <Section>
                                <SectionTitle>회원 정보</SectionTitle>
                                <InfoRow><IL>회원명</IL><IV>{nameOf(selected)}</IV></InfoRow>
                                <InfoRow><IL>연락처</IL><IV>{phoneOf(selected)}</IV></InfoRow>
                                <InfoRow><IL>이메일</IL><IV>{getUserInfo(selected.uid).email || "-"}</IV></InfoRow>
                            </Section>

                            <Section>
                                <SectionTitle>사무소 정보 (대조용)</SectionTitle>
                                <InfoRow><IL>사무소명</IL><IV>{selected.detail?.officeName || "-"}</IV></InfoRow>
                                <InfoRow><IL>등록번호</IL><IV>{selected.detail?.registrationNumber || "-"}</IV></InfoRow>
                                <InfoRow><IL>대표자</IL><IV>{selected.detail?.repName || "-"}</IV></InfoRow>
                                <InfoRow><IL>대표 연락처</IL><IV>{selected.detail?.repPhone || "-"}</IV></InfoRow>
                                {selected.detail?.subcategories?.length > 0 && (
                                    <InfoRow><IL>세부분야</IL><IV>{selected.detail.subcategories.join(", ")}</IV></InfoRow>
                                )}
                                {selected.detail?.mainProperties?.length > 0 && (
                                    <InfoRow><IL>주력 매물</IL><IV>{selected.detail.mainProperties.join(", ")}</IV></InfoRow>
                                )}
                                <InfoRow><IL>등록일시</IL><IV>{formatDateTime(selected.provisionalAt || selected.appliedAt)}</IV></InfoRow>
                                {selected.approvedAt && selSt === "approved" && (
                                    <InfoRow><IL>승인일</IL><IV>{formatDate(selected.approvedAt)}</IV></InfoRow>
                                )}
                                <InfoRow><IL>활동 상태</IL><IV><ActivityStatus status={selSt} /></IV></InfoRow>
                                {selected.rejectReason && selSt === "rejected" && (
                                    <InfoRow><IL>보완 사유</IL><IV style={{ color: THEME.danger }}>{selected.rejectReason}</IV></InfoRow>
                                )}
                            </Section>

                            <Section>
                                <SectionTitle>인증서 (자격증 사본 · 개설등록증)</SectionTitle>
                                {certImages(selected).length === 0 ? (
                                    <IV>첨부된 사진이 없습니다.</IV>
                                ) : certImages(selected).map((c, i) => (
                                    <CertFigure key={i}>
                                        <CertCaption>{c.name}</CertCaption>
                                        <a href={c.url} target="_blank" rel="noreferrer"><LicenseImg src={c.url} alt={c.name} /></a>
                                    </CertFigure>
                                ))}
                            </Section>

                            {selected.photoUrls?.length > 0 && (
                                <Section>
                                    <SectionTitle>활동 사진</SectionTitle>
                                    <PhotoGrid>
                                        {selected.photoUrls.map((url, i) => (
                                            <Photo key={i} src={url} alt={`활동사진 ${i + 1}`} />
                                        ))}
                                    </PhotoGrid>
                                </Section>
                            )}

                            {/* 액션 */}
                            {(selSt === "provisional" || selSt === "approved") && (
                                <ActionSection>
                                    {selSt === "provisional" && (
                                        <>
                                            <RejectArea>
                                                <RejectSelect value={reasonKind} onChange={e => setReasonKind(e.target.value)}>
                                                    {REJECT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                                </RejectSelect>
                                                {isEtcReason && (
                                                    <RejectInput placeholder="보완 요청 사유 직접 입력" value={reasonText}
                                                        onChange={e => setReasonText(e.target.value)} />
                                                )}
                                                <BigBtn $danger onClick={() => handleReject(selected)} disabled={busy}>반려 / 서류 보완</BigBtn>
                                            </RejectArea>
                                            <BigBtn $primary onClick={() => handleApprove(selected)} disabled={busy}>승인 완료</BigBtn>
                                        </>
                                    )}
                                    <BigBtn $danger onClick={() => handleBan(selected)} disabled={busy}>허위 제재</BigBtn>
                                </ActionSection>
                            )}
                            {selSt === "rejected" && (
                                <ActionSection>
                                    <BigBtn $primary onClick={() => handleApprove(selected)} disabled={busy}>재승인</BigBtn>
                                    <BigBtn $danger onClick={() => handleBan(selected)} disabled={busy}>허위 제재</BigBtn>
                                </ActionSection>
                            )}
                            {selSt === "banned" && (
                                <ActionSection>
                                    <BigBtn onClick={() => handleUnban(selected)} disabled={busy}>제재 해제</BigBtn>
                                </ActionSection>
                            )}
                        </ModalBody>
                    </Modal>
                </Overlay>
            )}
        </Wrap>
    );
};

export default AdminProApprovalPage;

// ─── Styled ───
// 관리자 글씨 굵기: 제목만 600, 나머지 400~500 (대표 리뷰 11/02)

const Wrap = styled.div``;
const Header = styled.div`display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;`;
const Title = styled.h1`font-size: 24px; font-weight: 600; color: ${THEME.text}; margin: 0;`;
const RefreshBtn = styled.button`padding: 8px 16px; font-size: 15px; font-weight: 500; color: ${THEME.text}; background: ${THEME.surface}; border: 1px solid #D5D9E0; border-radius: 4px; cursor: pointer; &:hover { background: ${THEME.background}; }`;

const TabBar = styled.div`display: flex; gap: 4px; margin-bottom: 16px; flex-wrap: wrap;`;
const TabItem = styled.a`
    display: flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 15px; text-decoration: none;
    font-weight: 500;
    color: ${p => p.$active ? "#fff" : THEME.text};
    background: ${p => p.$active ? THEME.primary : THEME.surface};
    border: 1px solid ${p => p.$active ? THEME.primary : "#D5D9E0"};
    border-radius: 4px; cursor: pointer; &:hover { opacity: 0.85; }
`;
const TabCount = styled.span`font-size: 13px; font-weight: 500; color: ${p => p.$active ? "#fff" : THEME.text};`;

const SearchBar = styled.div`position: relative; margin-bottom: 16px; max-width: 420px;`;
const SearchIcon = styled.span`position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: ${THEME.muted}; pointer-events: none;`;
const SearchInput = styled.input`width: 100%; box-sizing: border-box; padding: 9px 12px 9px 36px; border: 1px solid #D5D9E0; border-radius: 4px; font-size: 16px; outline: none; background: #fff; &:focus { border-color: ${THEME.primary}; }`;

const EmptyMsg = styled.div`text-align: center; padding: 60px 0; color: ${THEME.text}; font-size: 16px;`;

const TableWrap = styled.div`background: #fff; border-radius: 4px; overflow-x: auto; border: 1px solid #D5D9E0;`;
const Table = styled.table`width: 100%; border-collapse: collapse; min-width: 1100px;`;
const Th = styled.th`text-align: left; padding: 10px 14px; font-size: 14px; font-weight: 500; color: ${THEME.text}; background: ${THEME.background}; border-bottom: 1px solid #D5D9E0; white-space: nowrap;`;
const Td = styled.td`padding: 10px 14px; font-size: 15px; font-weight: 400; color: ${THEME.text}; border-bottom: 1px solid ${THEME.border}; vertical-align: middle; white-space: ${p => p.$wrap ? "normal" : "nowrap"}; word-break: keep-all;`;
const Tr = styled.tr`cursor: pointer; &:hover { background: ${THEME.background}; }`;

const StatusText = styled.span`display: inline-flex; align-items: center; gap: 5px; font-size: 15px; font-weight: 500;`;
const Thumb = styled.img`width: 56px; height: 42px; object-fit: cover; border: 1px solid #D5D9E0; border-radius: 4px; display: block; background: ${THEME.background};`;
const NoThumb = styled.span`display: inline-flex; align-items: center; gap: 4px; font-size: 14px; color: ${THEME.danger};`;
const ActionBtn = styled.button`
    padding: 5px 10px; font-size: 14px; font-weight: 500; border-radius: 4px; cursor: pointer; margin-right: 4px; font-family: inherit;
    color: ${p => p.$primary ? "#fff" : p.$danger ? THEME.danger : THEME.text};
    background: ${p => p.$primary ? THEME.button : "#fff"};
    border: 1px solid ${p => p.$primary ? THEME.button : p.$danger ? THEME.danger : "#D5D9E0"};
    &:hover { opacity: 0.85; } &:disabled { opacity: 0.5; }
`;

const PaginationRow = styled.div`display: flex; justify-content: center; align-items: center; gap: 12px; padding: 16px 0;`;
const PageBtn = styled.button`padding: 6px 14px; font-size: 15px; font-weight: 500; border: 1px solid #D5D9E0; border-radius: 4px; background: #fff; color: ${THEME.text}; cursor: pointer; &:disabled { opacity: 0.4; }`;
const PageInfo = styled.span`font-size: 15px; color: ${THEME.text};`;

// ─── Modal ───
const Overlay = styled.div`position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000;`;
const Modal = styled.div`background: #fff; border-radius: 6px; width: 640px; height: 86vh; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.18);`;
const ModalHeader = styled.div`display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid ${THEME.border};`;
const ModalTitle = styled.h3`font-size: 20px; font-weight: 600; color: ${THEME.text}; margin: 0;`;
const CloseBtn = styled.button`background: none; border: none; cursor: pointer; color: ${THEME.text}; padding: 4px; border-radius: 4px; display: flex; &:hover { background: ${THEME.background}; }`;
const ModalBody = styled.div`padding: 20px 24px; overflow-y: auto; flex: 1;`;

const Section = styled.div`margin-bottom: 20px;`;
const SectionTitle = styled.div`font-size: 16px; font-weight: 600; color: ${THEME.text}; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid ${THEME.border};`;
const InfoRow = styled.div`display: flex; align-items: center; padding: 5px 0; gap: 12px; font-size: 15px;`;
const IL = styled.div`flex: 0 0 96px; color: ${THEME.text}; font-weight: 500;`;
const IV = styled.div`flex: 1; color: ${THEME.text}; font-weight: 400; word-break: break-all;`;

const CertFigure = styled.div`margin-bottom: 14px;`;
const CertCaption = styled.div`font-size: 14px; font-weight: 500; color: ${THEME.text}; margin-bottom: 6px;`;
const LicenseImg = styled.img`max-width: 100%; max-height: 420px; border-radius: 4px; border: 1px solid #D5D9E0; display: block;`;
const PhotoGrid = styled.div`display: flex; gap: 8px; flex-wrap: wrap;`;
const Photo = styled.img`width: 100px; height: 100px; border-radius: 4px; object-fit: cover; border: 1px solid ${THEME.border};`;

const ActionSection = styled.div`margin-top: 20px; padding-top: 16px; border-top: 1px solid ${THEME.border}; display: flex; flex-direction: column; gap: 10px;`;
const RejectArea = styled.div`display: flex; gap: 8px; flex-wrap: wrap;`;
const RejectSelect = styled.select`padding: 8px 10px; border: 1px solid #D5D9E0; border-radius: 4px; font-size: 15px; font-family: inherit; background: #fff; color: ${THEME.text};`;
const RejectInput = styled.input`flex: 1; min-width: 180px; padding: 8px 10px; border: 1px solid #D5D9E0; border-radius: 4px; font-size: 15px; outline: none; &:focus { border-color: ${THEME.primary}; }`;
const BigBtn = styled.button`
    padding: 10px 24px; font-size: 16px; font-weight: 500; border-radius: 4px; cursor: pointer; font-family: inherit;
    color: ${p => p.$primary ? "#fff" : p.$danger ? THEME.danger : THEME.text};
    background: ${p => p.$primary ? THEME.button : "#fff"};
    border: 1px solid ${p => p.$primary ? THEME.button : p.$danger ? THEME.danger : "#D5D9E0"};
    &:hover { opacity: 0.85; } &:disabled { opacity: 0.5; }
`;
