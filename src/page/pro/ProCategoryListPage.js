/* eslint-disable */
import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAtomValue } from "jotai";
import { CATEGORIES, THEME } from "../../config/homeproConfig";
import { proCategoriesAtom } from "../../store/store";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoChevronForward, IoAddOutline } from "react-icons/io5";

const ProCategoryListPage = () => {
    const navigate = useNavigate();
    const proCategories = useAtomValue(proCategoriesAtom);
    const myCats = CATEGORIES.filter((c) => proCategories.includes(c.id));

    return (
        <SimpleBackLayout NAME="업무분야 관리" hideFooter>
            <Wrap>
                {myCats.length === 0 ? (
                    <EmptyBox>
                        <EmptyIcon>📋</EmptyIcon>
                        <EmptyText>등록된 업무분야가 없습니다</EmptyText>
                        <EmptySub>아래 버튼을 눌러 분야를 등록하세요</EmptySub>
                    </EmptyBox>
                ) : (
                    <List>
                        {myCats.map((cat) => (
                            <CatRow key={cat.id} onClick={() => navigate(`/pro/category-detail/${cat.id}`)}>
                                <CatLeft>
                                    <CatIcon>{cat.icon}</CatIcon>
                                    <CatInfo>
                                        <CatName>{cat.name}</CatName>
                                        <CatStatus>승인완료</CatStatus>
                                    </CatInfo>
                                </CatLeft>
                                <IoChevronForward size={18} color={THEME.muted} />
                            </CatRow>
                        ))}
                    </List>
                )}

                <AddBtn onClick={() => navigate("/pro/register-category")}>
                    <IoAddOutline size={20} color="#fff" />
                    분야 추가 등록
                </AddBtn>
            </Wrap>
        </SimpleBackLayout>
    );
};

export default ProCategoryListPage;

/* ===================== styles ===================== */

const Wrap = styled.div`
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: calc(100vh - 52px - env(safe-area-inset-top, 0px));
`;

const EmptyBox = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 60px 0;
`;

const EmptyIcon = styled.div`
    font-size: 48px;
    margin-bottom: 8px;
`;

const EmptyText = styled.div`
    font-size: 16px;
    font-weight: 700;
    color: ${THEME.text};
`;

const EmptySub = styled.div`
    font-size: 14px;
    color: ${THEME.muted};
`;

const List = styled.div`
    background: ${THEME.surface};
    border-radius: 16px;
    overflow: hidden;
    box-shadow: ${THEME.cardShadow};
`;

const CatRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    cursor: pointer;
    &:not(:last-child) {
        border-bottom: 1px solid ${THEME.border};
    }
    &:active { background: ${THEME.background}; }
`;

const CatLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
`;

const CatIcon = styled.div`
    font-size: 28px;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: ${THEME.background};
    display: flex;
    align-items: center;
    justify-content: center;
`;

const CatInfo = styled.div``;

const CatName = styled.div`
    font-size: 15px;
    font-weight: 700;
    color: ${THEME.text};
`;

const CatStatus = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: ${THEME.success};
    margin-top: 2px;
`;

const AddBtn = styled.button`
    width: 100%;
    padding: 16px;
    border: none;
    border-radius: 14px;
    background: ${THEME.primary};
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    &:active { opacity: 0.9; }
`;
