/* eslint-disable */
/**
 * PC 가입·아이디/비번 찾기 틀 — 로그인(MobileLoginpage PC 화면)과 같은 좌우 분할.
 * 왼쪽 연초록 소개 면 + 오른쪽 520 단에 기존 화면을 그대로 넣는다(로직 복제 없음).
 * 오른쪽 단은 .pc-mode + --app-max 로 기존 화면의 폭 제한·고정 헤더가 이 단 기준으로 붙는다.
 */
import React from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { IoCheckmark } from "react-icons/io5";

const POINTS = ["오더를 받고, 공유하고", "소개수익을 만들고", "내 고객에게 카드결제를 받고", "사고위험까지 관리합니다"];

const PcAuthSplit = ({ children }) => {
  const navigate = useNavigate();
  return (
    <Wrap>
      <Left>
        <Brand onClick={() => navigate("/intro")}>홈프로</Brand>
        <Copy>
          <Headline>사업자의 일을 더 쉽게,<br />사업자의 수익을 더 넓게.</Headline>
          <Points>{POINTS.map((t) => <li key={t}><IoCheckmark size={21} />{t}</li>)}</Points>
        </Copy>
        <Foot>고객센터 1555-3364</Foot>
      </Left>
      <Right className="pc-mode" style={{ "--app-max": "520px", "--app-h": "100vh" }}>
        <Scroll>{children}</Scroll>
      </Right>
    </Wrap>
  );
};

export default PcAuthSplit;

const Wrap = styled.div` height: 100vh; display: grid; grid-template-columns: minmax(0, 1fr) 520px; background: #fff; word-break: keep-all; `;
const Left = styled.div` background: #E6F7EE; padding: 52px 64px; box-sizing: border-box; display: flex; flex-direction: column; `;
const Brand = styled.div` font-size: 28px; font-weight: 800; color: #00963F; cursor: pointer; align-self: flex-start; `;
const Copy = styled.div` margin: auto 0; `;
const Headline = styled.h2` font-size: 40px; font-weight: 800; line-height: 1.35; letter-spacing: -0.02em; color: #14181F; margin: 0; `;
const Points = styled.ul`
  list-style: none; padding: 0; margin: 32px 0 0; display: grid; gap: 15px;
  li { display: flex; align-items: center; gap: 12px; font-size: 19px; font-weight: 600; color: #14181F; }
  svg { color: #00963F; flex: 0 0 auto; }
`;
const Foot = styled.div` font-size: 15px; color: #2b2f36; `;
const Right = styled.div` height: 100vh; transform: translateZ(0); overflow: hidden; background: #fff; border-left: 1px solid #dfe3e8; `;
const Scroll = styled.div` height: 100%; overflow-y: auto; overflow-x: hidden; & > div { min-height: 100%; background: #fff; } `;
