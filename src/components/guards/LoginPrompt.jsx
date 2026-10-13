/**
 * 로그인이 필요한 화면에 들어왔을 때 보여 주는 안내 (대표 9/17 요청)
 *   앱을 켜면 로그인 없이 홈을 둘러볼 수 있고, 로그인이 필요한 메뉴를 누른 순간 여기로 온다.
 *   로그인 뒤에는 원래 가려던 화면으로 돌려보낸다(state.from).
 *   버튼은 [로그인 하기] 하나 (형 10/1).
 */
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { IoLockClosedOutline } from "react-icons/io5";
import { THEME } from "../../config/homeproConfig";

const LoginPrompt = ({ title, desc }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.pathname + (location.search || "");

    return (
        <Wrap>
            <IconWrap><IoLockClosedOutline size={30} color={THEME.primary} /></IconWrap>
            <Title>{title || "로그인이 필요한 기능이에요"}</Title>
            <Desc>{desc || "오더 상세 보기와 채팅, 견적 등은 회원만 이용할 수 있어요.\n로그인하면 바로 이어서 볼 수 있습니다."}</Desc>
            <BtnCol>
                {/* 가입 버튼을 따로 두지 않는다 — 처음이면 로그인 뒤에 사업자·개인을 고른다 (형 10/1) */}
                <PrimaryBtn type="button" onClick={() => navigate("/MobileLogin", { state: { from } })}>
                    로그인 하기
                </PrimaryBtn>
                <TextBtn type="button" onClick={() => navigate("/MobileMain", { replace: true })}>
                    둘러보기 계속하기
                </TextBtn>
            </BtnCol>
        </Wrap>
    );
};

export default LoginPrompt;

const Wrap = styled.div`
  min-height: 100vh;
  background: ${THEME.surface};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 0 24px;
  text-align: center;
  box-sizing: border-box;
`;

const IconWrap = styled.div`
  width: 62px;
  height: 62px;
  border-radius: 50%;
  background: ${THEME.background};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Title = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${THEME.text};
`;

const Desc = styled.div`
  font-size: 15px;
  line-height: 1.6;
  color: #2b2f36;
  white-space: pre-line;
`;

const BtnCol = styled.div`
  width: 100%;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
`;

const PrimaryBtn = styled.button`
  height: 52px;
  border: none;
  border-radius: 10px;
  background: ${THEME.button};
  color: #ffffff;
  font-size: 17px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
`;

const TextBtn = styled.button`
  border: none;
  background: none;
  color: #2b2f36;
  font-size: 15px;
  font-family: inherit;
  text-decoration: underline;
  cursor: pointer;
  padding: 6px;
`;
