/**
 * 가입 완료 — /welcome  (대표 9/17 시안 2번 "다음 할 일 안내")
 *   가입 마지막 단계를 마치면 한 번 보여 준다. 받은 포인트와 다음에 할 일을 함께 안내한다.
 *   글이 길어져 두 줄이 되어도 단어가 잘리지 않게 문장 단위로 줄을 넘긴다.
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { IoCheckmark } from "react-icons/io5";
import { THEME } from "../../config/homeproConfig";
import { useAuth } from "../../context/AuthContext";
import { getAllPointRules } from "../../service/PointService";

const WelcomePage = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const name = userData?.companyName || userData?.nickname || userData?.name || "";
  const [rewards, setRewards] = useState({ signup: 1000, profile: 2000, referral: 3000 });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rules = await getAllPointRules();
        if (!alive || !rules) return;
        const amt = (key, fallback) => Number(rules?.[key]?.amount ?? rules?.[key] ?? fallback) || fallback;
        setRewards({
          signup: amt("signup", 1000),
          profile: amt("profile_complete", 2000),
          referral: amt("referral_signup", 3000),
        });
      } catch (e) { /* 기본값으로 보여 준다 */ }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <Wrap>
      <CheckCircle><IoCheckmark size={34} color={THEME.primary} /></CheckCircle>
      <Title>{name ? `${name}님, 가입이 끝났습니다` : "가입이 끝났습니다"}</Title>
      <Desc>
        가입 환영 포인트 {rewards.signup.toLocaleString()}P를 드렸습니다.
        아래를 채우면 포인트를 더 받을 수 있습니다.
      </Desc>

      <Todos>
        <Todo onClick={() => navigate("/biz-profile")}>
          <TodoText>
            <TodoTitle>비즈프로필 등록</TodoTitle>
            <TodoDesc>평점과 인증, 포트폴리오를 상대에게 보여 줍니다</TodoDesc>
          </TodoText>
          <TodoReward>+{rewards.profile.toLocaleString()}P</TodoReward>
        </Todo>

        <Todo onClick={() => navigate("/pro/register-category")}>
          <TodoText>
            <TodoTitle>전문분야 등록</TodoTitle>
            <TodoDesc>맡을 수 있는 분야를 골라 두면 맞는 오더를 먼저 봅니다</TodoDesc>
          </TodoText>
          <TodoReward>필요</TodoReward>
        </Todo>

        <Todo onClick={() => navigate("/MobileMain?tab=assets")}>
          <TodoText>
            <TodoTitle>친구 초대</TodoTitle>
            <TodoDesc>초대 코드를 공유하면 두 분 모두 포인트를 받습니다</TodoDesc>
          </TodoText>
          <TodoReward>+{rewards.referral.toLocaleString()}P</TodoReward>
        </Todo>
      </Todos>

      <BtnCol>
        <PrimaryBtn type="button" onClick={() => navigate("/biz-profile")}>비즈프로필 채우기</PrimaryBtn>
        <GhostBtn type="button" onClick={() => navigate("/MobileMain", { replace: true })}>나중에 하고 오더 보기</GhostBtn>
      </BtnCol>
    </Wrap>
  );
};

export default WelcomePage;

const Wrap = styled.div`
  min-height: 100vh;
  box-sizing: border-box;
  background: ${THEME.background};
  padding: 40px 20px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const CheckCircle = styled.div`
  width: 62px;
  height: 62px;
  border-radius: 50%;
  background: ${THEME.purpleLight};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
`;

const Title = styled.div`
  font-size: 21px;
  font-weight: 700;
  color: ${THEME.text};
  text-align: center;
  word-break: keep-all;
  line-height: 1.45;
`;

const Desc = styled.div`
  font-size: 15px;
  line-height: 1.7;
  color: #2b2f36;
  text-align: center;
  word-break: keep-all;
  margin-bottom: 6px;
`;

const Todos = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Todo = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  text-align: left;
  background: ${THEME.surface};
  border: 1px solid #D9DDE3;
  border-radius: 12px;
  padding: 16px 16px;
  font-family: inherit;
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;

const TodoText = styled.div`
  min-width: 0;
`;

const TodoTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
`;

const TodoDesc = styled.div`
  margin-top: 4px;
  font-size: 14px;
  line-height: 1.6;
  color: #2b2f36;
  word-break: keep-all;
`;

const TodoReward = styled.div`
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.primary};
`;

const BtnCol = styled.div`
  margin-top: auto;
  padding-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const PrimaryBtn = styled.button`
  height: 54px;
  border: none;
  border-radius: 10px;
  background: ${THEME.button};
  color: #ffffff;
  font-size: 17px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
`;

const GhostBtn = styled.button`
  height: 54px;
  border: 1px solid #D9DDE3;
  border-radius: 10px;
  background: ${THEME.surface};
  color: ${THEME.text};
  font-size: 16px;
  font-family: inherit;
  cursor: pointer;
`;
