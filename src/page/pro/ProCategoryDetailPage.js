/* eslint-disable */
import { proRegionText } from "../../utility/regionUtils";
import React, { useContext, useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import styled from "styled-components";
import { useAtom } from "jotai";
import { UserContext } from "../../context/User";
import { useAuth } from "../../context/AuthContext";
import { CATEGORIES, THEME, PRO_DETAIL_FIELDS } from "../../config/homeproConfig";
import { proCategoriesAtom } from "../../store/store";
import { getProCategoryDoc, deleteProCategory } from "../../service/ProService";
import { hasBusinessLicense, isFreelancerNoBiz } from "../../service/CertificateService";
import { getUserProfileByUid } from "../../service/UserProfileService";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoCheckmarkCircleOutline, IoCreateOutline, IoAlertCircleOutline } from "react-icons/io5";
import { BROKER_STATUS_TEXT, brokerStatusStyle, normalizeBrokerStatus, withBrokerFields } from "../../service/BrokerService";

const ProCategoryDetailPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { categoryId } = useParams();
    const { user } = useContext(UserContext);
    const [proCategories, setProCategories] = useAtom(proCategoriesAtom);

    const viewUid = location.state?.viewUid;
    const [docData, setDocData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [slideIdx, setSlideIdx] = useState(0);
    const slideRef = useRef(null);

    const { userData } = useAuth();
    const uid = viewUid || userData?.uid || user?.USERS_ID; // 문서 id 우선 (B7)
    const isViewingOther = !!viewUid;
    const cat = CATEGORIES.find((c) => c.id === categoryId);

    useEffect(() => {
        if (!uid || !categoryId) return;
        getProCategoryDoc(uid, categoryId)
            .then((data) => setDocData(data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [uid, categoryId]);

    // 남의 분야를 볼 때는 그 프로의 회원 정보로 프리랜서 여부를 판정한다 (B14)
    const [viewedProfile, setViewedProfile] = useState(null);
    useEffect(() => {
        if (!viewUid) return;
        let alive = true;
        getUserProfileByUid(viewUid)
            .then((p) => { if (alive) setViewedProfile(p || null); })
            .catch(() => {});
        return () => { alive = false; };
    }, [viewUid]);
    const ownerProfile = isViewingOther ? viewedProfile : userData;

    const handleDelete = async () => {
        if (!uid || deleting) return;
        const ok = window.confirm("이 업무분야 등록을 삭제하시겠습니까?");
        if (!ok) return;
        setDeleting(true);
        try {
            await deleteProCategory(uid, categoryId);
            setProCategories(proCategories.filter((id) => id !== categoryId));
            navigate(-1);
        } catch (err) {
            console.error("delete error:", err);
            alert("삭제 중 오류가 발생했습니다.");
            setDeleting(false);
        }
    };

    const formatDate = (ts) => {
        if (!ts) return "-";
        const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    };

    const photos = docData?.photoUrls || [];
    const detail = docData?.detail || {};
    const rawCerts = detail.certifications || detail.certs || [];
    const certs = Array.isArray(rawCerts) ? rawCerts : [];
    // 공동중개는 대표자 성명 · 연락처 칸까지 (대표 리뷰 11/02)
    const catFields = withBrokerFields(categoryId, PRO_DETAIL_FIELDS[categoryId] || []);
    const isBrokerCat = categoryId === "brokerage";
    const brokerSt = isBrokerCat && docData ? normalizeBrokerStatus(docData.status) : null;
    const regionText = proRegionText(docData);

    const getStatusBadge = (status) => {
        if (status === "approved") return { label: "승인완료", bg: THEME.success, color: "#fff" };
        if (status === "rejected") return { label: "반려", bg: THEME.danger, color: "#fff" };
        return { label: "심사중", bg: "#F59E0B", color: "#fff" };
    };
    const badge = docData ? getStatusBadge(docData.status) : getStatusBadge("");
    const docStatusLabel = docData?.status === "approved" ? "검수완료" : "검수중";

    // slide scroll handler
    const handleSlideScroll = () => {
        if (!slideRef.current) return;
        const scrollLeft = slideRef.current.scrollLeft;
        const width = slideRef.current.offsetWidth;
        setSlideIdx(Math.round(scrollLeft / width));
    };

    if (!cat) return null;

    return (
        <SimpleBackLayout NAME={cat.shortName} hideFooter>
            {/* 사진 슬라이더 - 전면 배너 */}
            {!loading && photos.length > 0 ? (
                <SliderWrap>
                    <SliderTrack ref={slideRef} onScroll={handleSlideScroll}>
                        {photos.map((url, i) => (
                            <SlideItem key={i}>
                                <SlideImg src={url} alt={`활동사진 ${i + 1}`} />
                            </SlideItem>
                        ))}
                    </SliderTrack>
                    {photos.length > 1 && (
                        <SliderCounter>{slideIdx + 1}/{photos.length}</SliderCounter>
                    )}
                </SliderWrap>
            ) : !loading ? (
                <NoPhotoArea>
                    <NoPhotoText>등록된 활동 사진이 없습니다</NoPhotoText>
                </NoPhotoArea>
            ) : null}

            <ContentWrap>
                {/* 카테고리 + 상태 */}
                <HeaderRow>
                    <CatName>{cat.name}</CatName>
                    {!isBrokerCat && <StatusBadge $bg={badge.bg} $color={badge.color}>{badge.label}</StatusBadge>}
                </HeaderRow>
                {/* 공동중개 선활동 · 후관리 상태 — 뱃지 없이 글씨 + 아이콘 (대표 리뷰 11/02) */}
                {brokerSt && (() => {
                    const { color, Icon } = brokerStatusStyle(brokerSt);
                    return (
                        <BrokerStatusBox>
                            <BrokerStatusLine style={{ color }}>
                                <Icon size={18} style={{ flexShrink: 0 }} />
                                {BROKER_STATUS_TEXT[brokerSt]}
                            </BrokerStatusLine>
                            {brokerSt === "provisional" && <BrokerStatusNote>글 등록 · 오더 지원 등 모든 활동을 지금 바로 할 수 있습니다. 관리자가 서류를 확인하면 공식 인증으로 바뀝니다.</BrokerStatusNote>}
                            {brokerSt === "rejected" && (
                                <>
                                    <BrokerStatusNote>서류 보완 요청{docData.rejectReason ? `: ${docData.rejectReason}` : ""}. 다시 등록하실 때까지 공동중개 활동이 제한됩니다.</BrokerStatusNote>
                                    {!isViewingOther && <ReRegisterBtn type="button" onClick={() => navigate("/pro/register-category?category=brokerage")}>서류 다시 등록</ReRegisterBtn>}
                                </>
                            )}
                            {brokerSt === "banned" && <BrokerStatusNote>허위 자격 등록으로 이용이 정지되었습니다.</BrokerStatusNote>}
                        </BrokerStatusBox>
                    );
                })()}
                <CatDesc>{cat.description}</CatDesc>

                {/* 한줄 소개 */}
                {detail.intro && (
                    <Section>
                        <SectionTitle>소개</SectionTitle>
                        <IntroText>{detail.intro}</IntroText>
                    </Section>
                )}

                {/* 기본 정보 */}
                <Section>
                    <SectionTitle>기본 정보</SectionTitle>
                    {detail.experience && (
                        <InfoRow>
                            <InfoLabel>경력</InfoLabel>
                            <InfoValue>{detail.experience}년</InfoValue>
                        </InfoRow>
                    )}
                    {regionText && (
                        <InfoRow>
                            <InfoLabel>활동 지역</InfoLabel>
                            <InfoValue>{regionText}</InfoValue>
                        </InfoRow>
                    )}
                    {detail.subcategories?.length > 0 && (
                        <InfoRow>
                            <InfoLabel>전문분야</InfoLabel>
                            <InfoValue>{detail.subcategories.join(", ")}</InfoValue>
                        </InfoRow>
                    )}
                    {/* PRO_DETAIL_FIELDS 동적 렌더링 */}
                    {catFields.map((field) => {
                        const val = detail[field.key];
                        if (!val || (Array.isArray(val) && val.length === 0)) return null;
                        if (typeof val === "object" && !Array.isArray(val)) return null;
                        return (
                            <InfoRow key={field.key}>
                                <InfoLabel>{field.label}</InfoLabel>
                                <InfoValue>
                                    {field.type === "chips" && Array.isArray(val) ? val.join(", ")
                                        : field.type === "number" ? `${val}명`
                                        : String(val)}
                                </InfoValue>
                            </InfoRow>
                        );
                    })}
                </Section>

                {/* 제출 서류 */}
                <Section>
                    <SectionTitle>제출 서류</SectionTitle>
                    {/* 사업자등록증 — 제출 · 개인 프리랜서 · 미제출 상태대로 (B14) */}
                    {(() => {
                        const submitted = !!docData?.licenseUrl || hasBusinessLicense(ownerProfile);
                        if (submitted) return (
                            <DocRow>
                                <IoCheckmarkCircleOutline size={18} color={THEME.success} />
                                <DocText>사업자등록증 제출 완료</DocText>
                                <DocStatus>{docStatusLabel}</DocStatus>
                            </DocRow>
                        );
                        if (isFreelancerNoBiz(ownerProfile)) return (
                            <DocRow>
                                <IoCheckmarkCircleOutline size={18} color={THEME.success} />
                                <DocText>개인 프리랜서 (사업자등록 없음)</DocText>
                            </DocRow>
                        );
                        return (
                            <DocRow>
                                <IoAlertCircleOutline size={18} color={THEME.muted} />
                                <DocText>사업자등록증 미제출</DocText>
                            </DocRow>
                        );
                    })()}
                    {certs.length > 0 && certs.map((cert, i) => (
                        <DocRow key={i}>
                            <IoCheckmarkCircleOutline size={18} color={THEME.success} />
                            <DocText>{typeof cert === "string" ? cert : cert.certName || `자격증 ${i + 1}`}</DocText>
                            <DocStatus>{docStatusLabel}</DocStatus>
                        </DocRow>
                    ))}
                </Section>

                {/* 등록 정보 */}
                {docData && (
                    <Section>
                        <SectionTitle>등록 정보</SectionTitle>
                        <InfoRow>
                            <InfoLabel>신청일</InfoLabel>
                            <InfoValue>{formatDate(docData.appliedAt)}</InfoValue>
                        </InfoRow>
                        {docData.approvedAt && (
                            <InfoRow>
                                <InfoLabel>승인일</InfoLabel>
                                <InfoValue>{formatDate(docData.approvedAt)}</InfoValue>
                            </InfoRow>
                        )}
                    </Section>
                )}

                {/* 수정/삭제 버튼 — 본인만 */}
                {!isViewingOther && (
                  <>
                    <EditBtn onClick={() => navigate(`/pro/category-edit/${categoryId}`)}>
                        프로필 수정
                    </EditBtn>
                    <DeleteBtn onClick={handleDelete} disabled={deleting}>
                        {deleting ? "삭제 중..." : "업무분야 삭제"}
                    </DeleteBtn>
                  </>
                )}
            </ContentWrap>
        </SimpleBackLayout>
    );
};

export default ProCategoryDetailPage;

/* ===================== styles ===================== */

const SliderWrap = styled.div`
    position: relative;
    width: 100%;
    background: ${THEME.text};
`;

const SliderTrack = styled.div`
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
`;

const SlideItem = styled.div`
    flex: 0 0 100%;
    scroll-snap-align: start;
`;

const SlideImg = styled.img`
    width: 100%;
    height: 260px;
    object-fit: cover;
    display: block;
`;

const SliderCounter = styled.div`
    position: absolute;
    bottom: 12px;
    right: 12px;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    font-size: 14px;
    font-weight: 400;
    padding: 4px 10px;
    border-radius: 12px;
    letter-spacing: 0.5px;
`;

const NoPhotoArea = styled.div`
    width: 100%;
    height: 160px;
    background: ${THEME.background};
    display: flex;
    align-items: center;
    justify-content: center;
`;

const NoPhotoText = styled.div`
    font-size: 16px;
    color: ${THEME.muted};
`;

const ContentWrap = styled.div`
    padding: 20px 12px 40px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const HeaderRow = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
`;

const CatName = styled.div`
    font-size: 22px;
    font-weight: 400;
    color: ${THEME.text};
    letter-spacing: -0.02em;
    padding-left: 4px;
`;

const CatDesc = styled.div`
    font-size: 15px;
    color: ${THEME.textSecondary};
    line-height: 1.5;
    word-break: keep-all;
    font-weight: 400;
`;

const BrokerStatusBox = styled.div`
    margin: 4px 0 12px;
    padding: 12px 14px;
    border: 1px solid #D5D9E0;
    border-radius: 4px;
    background: ${THEME.surface};
`;

const BrokerStatusLine = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 16px;
    font-weight: 600;
    word-break: keep-all;
`;

const BrokerStatusNote = styled.div`
    margin-top: 6px;
    font-size: 14px;
    line-height: 1.55;
    color: ${THEME.text};
    word-break: keep-all;
`;

const ReRegisterBtn = styled.button`
    margin-top: 10px;
    height: 40px;
    padding: 0 14px;
    border: 1px solid #D5D9E0;
    border-radius: 4px;
    background: ${THEME.surface};
    color: ${THEME.text};
    font-size: 15px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
`;

const StatusBadge = styled.div`
    padding: 5px 12px;
    border-radius: 20px;
    background: ${({ $bg }) => $bg || THEME.success};
    color: ${({ $color }) => $color || "#fff"};
    font-size: 14px;
    font-weight: 500;
    flex-shrink: 0;
    white-space: nowrap;
`;

const Section = styled.div`background: ${THEME.surface}; border-radius: 16px; padding: 20px; box-shadow: ${THEME.cardShadow};`;

const SectionTitle = styled.div`
    font-size: 17px;
    font-weight: 700;
    color: ${THEME.text};
    margin-bottom: 10px;
`;

const IntroText = styled.div`
    font-size: 16px;
    color: ${THEME.text};
    line-height: 1.6;
    background: ${THEME.background};
    padding: 14px;
    border-radius: 12px;
`;

const InfoRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    &:not(:last-child) {
        border-bottom: 1px solid ${THEME.border};
    }
`;

const InfoLabel = styled.div`
    font-size: 16px;
    color: ${THEME.muted};
    font-weight: 400;
`;

const InfoValue = styled.div`
    font-size: 16px;
    color: ${THEME.text};
    font-weight: 400;
    text-align: right;
    max-width: 60%;
    word-break: keep-all;
`;

const DocRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 0;
    &:not(:last-child) {
        border-bottom: 1px solid ${THEME.border};
    }
`;

const DocText = styled.div`
    flex: 1;
    font-size: 16px;
    color: ${THEME.text};
    font-weight: 400;
`;

const DocStatus = styled.div`
    font-size: 14px;
    font-weight: 400;
    color: ${THEME.success};
`;

const EditBtn = styled.button`
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 10px;
    background: ${THEME.button};
    color: #fff;
    font-size: 17px;
    font-weight: 400;
    font-family: inherit;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    &:active { opacity: 0.85; }
`;

const DeleteBtn = styled.button`
    width: 100%;
    padding: 14px;
    border: 1px solid ${THEME.border};
    border-radius: 10px;
    background: ${THEME.surface};
    color: ${THEME.text};
    font-size: 16px;
    font-weight: 400;
    font-family: inherit;
    cursor: pointer;
    &:active { background: ${THEME.background}; }
    &:disabled { opacity: 0.5; cursor: default; }
`;
