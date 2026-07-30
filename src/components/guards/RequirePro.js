import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import { THEME } from "../../config/homeproConfig";

// 홈프로(개업 공인중개사 포함) 전용 공간 가드.
// 프로 판정: userType==="pro" | roles 에 "pro" | 등록한 전문분야(proCategories) 보유.
// 비프로(의뢰자·일반회원)는 차단 안내 화면을 보여준다(조용한 리다이렉트 대신).
export const isProUser = (userData) => {
  if (!userData) return false;
  if (userData.userType === "pro") return true;
  if (Array.isArray(userData.roles) && userData.roles.includes("pro")) return true;
  if (Array.isArray(userData.proCategories) && userData.proCategories.length > 0) return true;
  return false;
};

const RequirePro = () => {
  const { userData, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;
  if (isProUser(userData)) return <Outlet />;

  return (
    <Block>
      <Inner>
        <Title>홈프로 전용 공간이에요</Title>
        <Desc>
          공동중개 라운지는 전문분야를 등록한 홈프로(개업 공인중개사)만
          이용할 수 있어요. 전문분야를 등록하면 바로 참여할 수 있습니다.
        </Desc>
        <PrimaryBtn onClick={() => navigate("/pro/register-category")}>전문분야 등록하기</PrimaryBtn>
        <GhostBtn onClick={() => navigate("/MobileMain")}>홈으로</GhostBtn>
      </Inner>
    </Block>
  );
};

const Block = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f7f8fa;
`;
const Inner = styled.div`
  width: 100%;
  max-width: 360px;
  text-align: center;
`;
const Title = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 12px;
`;
const Desc = styled.p`
  font-size: 15px;
  line-height: 1.6;
  color: #6b7280;
  margin: 0 0 28px;
`;
const PrimaryBtn = styled.button`
  width: 100%;
  height: 52px;
  border: none;
  border-radius: 10px;
  background: ${THEME.primary || "#00C74E"};
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  margin-bottom: 12px;
`;
const GhostBtn = styled.button`
  width: 100%;
  height: 48px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  color: #4b5563;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
`;

export default RequirePro;
