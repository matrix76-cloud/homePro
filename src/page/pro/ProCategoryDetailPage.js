/* eslint-disable */
import React, { useContext, useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { useAtom } from "jotai";
import { UserContext } from "../../context/User";
import { CATEGORIES, THEME } from "../../config/homeproConfig";
import { proCategoriesAtom } from "../../store/store";
import { getProCategoryDoc, deleteProCategory } from "../../service/ProService";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoCheckmarkCircleOutline, IoCreateOutline } from "react-icons/io5";

const ProCategoryDetailPage = () => {
    const navigate = useNavigate();
    const { categoryId } = useParams();
    const { user } = useContext(UserContext);
    const [proCategories, setProCategories] = useAtom(proCategoriesAtom);

    const [docData, setDocData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [slideIdx, setSlideIdx] = useState(0);
    const slideRef = useRef(null);

    const uid = user?.USERS_ID;
    const cat = CATEGORIES.find((c) => c.id === categoryId);

    useEffect(() => {
        if (!uid || !categoryId) return;
        getProCategoryDoc(uid, categoryId)
            .then((data) => setDocData(data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [uid, categoryId]);

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
    const certs = detail.certs || [];

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
                    <div>
                        <CatName>{cat.name}</CatName>
                        <CatDesc>{cat.description}</CatDesc>
                    </div>
                    <StatusBadge>승인완료</StatusBadge>
                </HeaderRow>

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
                    {detail.region && (
                        <InfoRow>
                            <InfoLabel>활동 지역</InfoLabel>
                            <InfoValue>{detail.region}</InfoValue>
                        </InfoRow>
                    )}
                    {detail.subcategories?.length > 0 && (
                        <InfoRow>
                            <InfoLabel>전문분야</InfoLabel>
                            <InfoValue>{detail.subcategories.join(", ")}</InfoValue>
                        </InfoRow>
                    )}
                </Section>

                {/* 서류 검수 상태 */}
                <Section>
                    <SectionTitle>제출 서류</SectionTitle>
                    <DocRow>
                        <IoCheckmarkCircleOutline size={18} color={THEME.success} />
                        <DocText>사업자등록증 제출 완료</DocText>
                        <DocStatus>검수완료</DocStatus>
                    </DocRow>
                    {certs.length > 0 && certs.map((cert, i) => (
                        <DocRow key={i}>
                            <IoCheckmarkCircleOutline size={18} color={THEME.success} />
                            <DocText>{cert.certName || `자격증 ${i + 1}`}</DocText>
                            <DocStatus>검수완료</DocStatus>
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
                        <InfoRow>
                            <InfoLabel>승인일</InfoLabel>
                            <InfoValue>{formatDate(docData.approvedAt)}</InfoValue>
                        </InfoRow>
                    </Section>
                )}

                {/* 수정 버튼 */}
                <EditBtn onClick={() => navigate(`/pro/category-edit/${categoryId}`)}>
                    <IoCreateOutline size={18} />
                    프로필 수정
                </EditBtn>

                {/* 삭제 버튼 */}
                <DeleteBtn onClick={handleDelete} disabled={deleting}>
                    {deleting ? "삭제 중..." : "업무분야 삭제"}
                </DeleteBtn>
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
    font-size: 12px;
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
    font-size: 14px;
    color: ${THEME.muted};
`;

const ContentWrap = styled.div`
    padding: 20px 16px 40px;
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const HeaderRow = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
`;

const CatName = styled.div`
    font-size: 20px;
    font-weight: 400;
    color: ${THEME.text};
    letter-spacing: -0.02em;
`;

const CatDesc = styled.div`
    font-size: 13px;
    color: ${THEME.muted};
    margin-top: 4px;
    line-height: 1.4;
    word-break: keep-all;
`;

const StatusBadge = styled.div`
    padding: 5px 12px;
    border-radius: 4px;
    background: #D1FAE5;
    color: ${THEME.success};
    font-size: 12px;
    font-weight: 400;
    flex-shrink: 0;
    white-space: nowrap;
`;

const Section = styled.div``;

const SectionTitle = styled.div`
    font-size: 15px;
    font-weight: 400;
    color: ${THEME.text};
    margin-bottom: 10px;
`;

const IntroText = styled.div`
    font-size: 14px;
    color: ${THEME.text};
    line-height: 1.6;
    background: ${THEME.background};
    padding: 14px;
    border-radius: 4px;
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
    font-size: 14px;
    color: ${THEME.muted};
    font-weight: 400;
`;

const InfoValue = styled.div`
    font-size: 14px;
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
    font-size: 14px;
    color: ${THEME.text};
    font-weight: 400;
`;

const DocStatus = styled.div`
    font-size: 12px;
    font-weight: 400;
    color: ${THEME.success};
`;

const EditBtn = styled.button`
    width: 100%;
    padding: 14px;
    border: 1.5px solid ${THEME.primary};
    border-radius: 4px;
    background: #fff;
    color: ${THEME.primary};
    font-size: 15px;
    font-weight: 400;
    font-family: inherit;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    &:active { background: ${THEME.background}; }
`;

const DeleteBtn = styled.button`
    width: 100%;
    padding: 14px;
    border: 1px solid ${THEME.border};
    border-radius: 4px;
    background: #fff;
    color: ${THEME.danger};
    font-size: 14px;
    font-weight: 400;
    font-family: inherit;
    cursor: pointer;
    &:active { background: #FEF2F2; }
    &:disabled { opacity: 0.5; cursor: default; }
`;
