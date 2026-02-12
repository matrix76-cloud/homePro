/* eslint-disable */
import React, { useContext, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { useAtom } from "jotai";
import { UserContext } from "../../context/User";
import { CATEGORIES, THEME } from "../../config/homeproConfig";
import { proCategoriesAtom } from "../../store/store";
import { getProCategoryDoc, deleteProCategory } from "../../service/ProService";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";

const ProCategoryDetailPage = () => {
    const navigate = useNavigate();
    const { categoryId } = useParams();
    const { user } = useContext(UserContext);
    const [proCategories, setProCategories] = useAtom(proCategoriesAtom);

    const [docData, setDocData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

    const uid = user?.uid;
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
        const ok = window.confirm("이 업무분야 등록을 삭제하시겠습니까?\n삭제 후 다시 등록하려면 사업자등록증을 재제출해야 합니다.");
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

    if (!cat) return null;

    return (
        <SimpleBackLayout NAME={cat.shortName} hideFooter>
            <Wrap>
                {/* 카테고리 정보 */}
                <Card>
                    <CatHeader>
                        <CatIcon>{cat.shortName.charAt(0)}</CatIcon>
                        <CatInfo>
                            <CatName>{cat.name}</CatName>
                            <CatDesc>{cat.description}</CatDesc>
                        </CatInfo>
                    </CatHeader>
                    <StatusBadge>승인완료</StatusBadge>
                </Card>

                {/* 등록 정보 */}
                <Card>
                    <SectionTitle>등록 정보</SectionTitle>
                    {loading ? (
                        <LoadingText>불러오는 중...</LoadingText>
                    ) : docData ? (
                        <>
                            <InfoRow>
                                <InfoLabel>신청일</InfoLabel>
                                <InfoValue>{formatDate(docData.appliedAt)}</InfoValue>
                            </InfoRow>
                            <InfoRow>
                                <InfoLabel>승인일</InfoLabel>
                                <InfoValue>{formatDate(docData.approvedAt)}</InfoValue>
                            </InfoRow>
                            <InfoRow>
                                <InfoLabel>상태</InfoLabel>
                                <InfoValue style={{ color: THEME.success, fontWeight: 700 }}>승인완료</InfoValue>
                            </InfoRow>
                        </>
                    ) : (
                        <LoadingText>등록 정보를 찾을 수 없습니다</LoadingText>
                    )}
                </Card>

                {/* 사업자등록증 */}
                <Card>
                    <SectionTitle>사업자등록증</SectionTitle>
                    {loading ? (
                        <LoadingText>불러오는 중...</LoadingText>
                    ) : docData?.licenseUrl ? (
                        <LicenseImg src={docData.licenseUrl} alt="사업자등록증" />
                    ) : (
                        <LoadingText>이미지를 찾을 수 없습니다</LoadingText>
                    )}
                </Card>

                {/* 삭제 버튼 */}
                <DeleteBtn onClick={handleDelete} disabled={deleting}>
                    {deleting ? "삭제 중..." : "업무분야 삭제"}
                </DeleteBtn>
            </Wrap>
        </SimpleBackLayout>
    );
};

export default ProCategoryDetailPage;

/* ===================== styles ===================== */

const Wrap = styled.div`
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-bottom: 40px;
`;

const Card = styled.div`
    background: ${THEME.surface};
    border-radius: 16px;
    padding: 20px;
    box-shadow: ${THEME.cardShadow};
`;

const CatHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
`;

const CatIcon = styled.div`
    font-size: 18px;
    font-weight: 700;
    color: ${THEME.primary};
    width: 52px;
    height: 52px;
    border-radius: 4px;
    background: ${THEME.background};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

const CatInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const CatName = styled.div`
    font-size: 17px;
    font-weight: 800;
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
    display: inline-block;
    margin-top: 14px;
    padding: 6px 14px;
    border-radius: 8px;
    background: #D1FAE5;
    color: ${THEME.success};
    font-size: 13px;
    font-weight: 700;
`;

const SectionTitle = styled.div`
    font-size: 16px;
    font-weight: 800;
    color: ${THEME.text};
    margin-bottom: 14px;
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
    font-weight: 500;
`;

const InfoValue = styled.div`
    font-size: 14px;
    color: ${THEME.text};
    font-weight: 600;
`;

const LicenseImg = styled.img`
    width: 100%;
    border-radius: 12px;
    border: 1px solid ${THEME.border};
`;

const LoadingText = styled.div`
    font-size: 14px;
    color: ${THEME.muted};
    text-align: center;
    padding: 20px 0;
`;

const DeleteBtn = styled.button`
    width: 100%;
    padding: 16px;
    border: 1px solid ${THEME.danger};
    border-radius: 14px;
    background: #fff;
    color: ${THEME.danger};
    font-size: 16px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    margin-top: 8px;
    &:active { background: #FEF2F2; }
    &:disabled { opacity: 0.5; cursor: default; }
`;
