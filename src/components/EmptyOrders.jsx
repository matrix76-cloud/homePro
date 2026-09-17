/**
 * 오더가 없을 때 보이는 화면 (대표 9/17 시안 2번 "행동 두 가지")
 *   왜 비었는지 알려 주고, 조건을 되돌리거나 직접 접수하도록 길을 준다.
 *   홈 오더목록 · 나의오더현황 · 오더 목록에서 함께 쓴다.
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { IoSearchOutline } from "react-icons/io5";
import { THEME } from "../config/homeproConfig";

const EmptyOrders = ({
  title = "조건에 맞는 오더가 없어요",
  desc = "거리를 넓히거나 기간을 늘려 보세요.",
  onReset,
  resetLabel = "조건 초기화",
  showCreate = true,
  icon,                 // 아이콘을 바꿔 끼울 때 (포인트 내역 등)
  primaryLabel,         // 주 버튼 문구를 바꿀 때
  onPrimary,            // 주 버튼이 할 일을 바꿀 때
}) => {
  const navigate = useNavigate();
  return (
    <Wrap>
      <IconCircle>{icon || <IoSearchOutline size={30} color={THEME.primary} />}</IconCircle>
      <Title>{title}</Title>
      <Desc>{desc}</Desc>
      <BtnRow>
        {onReset && <GhostBtn type="button" onClick={onReset}>{resetLabel}</GhostBtn>}
        {showCreate && (
          <PrimaryBtn type="button" onClick={onPrimary || (() => navigate("/order/create"))}>
            {primaryLabel || "예약접수 하기"}
          </PrimaryBtn>
        )}
      </BtnRow>
    </Wrap>
  );
};

export default EmptyOrders;

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 46px 24px;
  text-align: center;
`;

const IconCircle = styled.div`
  width: 66px;
  height: 66px;
  border-radius: 50%;
  background: ${THEME.purpleLight};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Title = styled.div`
  margin-top: 4px;
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
  word-break: keep-all;
`;

const Desc = styled.div`
  font-size: 14px;
  line-height: 1.6;
  color: #2b2f36;
  word-break: keep-all;
  white-space: pre-line;
`;

const BtnRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
  justify-content: center;
`;

const GhostBtn = styled.button`
  border: 1px solid ${THEME.border};
  background: ${THEME.surface};
  color: ${THEME.text};
  padding: 11px 18px;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  border-radius: 8px;
  cursor: pointer;
`;

const PrimaryBtn = styled.button`
  border: none;
  background: ${THEME.button};
  color: #ffffff;
  padding: 11px 18px;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  border-radius: 8px;
  cursor: pointer;
`;
