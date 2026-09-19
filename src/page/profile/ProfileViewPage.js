/* eslint-disable */
/**
 * 프로필 보기 — 팝업이 아니라 별도 페이지 (대표 9/17)
 *   접수자·홈프로 이름을 누르면 이 화면으로 들어온다. 뒤로가기로 돌아간다.
 */
import React from "react";
import { useParams, useLocation } from "react-router-dom";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import styled from "styled-components";
import ProfilePopup from "../../components/ProfilePopup";
import { pcOnly, PC } from "../../pc/pcKit";

/* PC 2단 — 왼쪽 요약(사진·이름·등급 + 거부/신고 버튼), 오른쪽 상세·리뷰.
   ProfilePopup(공용 부품)은 고치지 않고, 페이지 모드의 뼈대(껍데기 > 상자 > [머리, 본문, 버튼 줄])를 자리로 짚어 배치만 바꾼다.
   폰에서는 display: contents 라 없는 것과 같다. */
const PcProfileWrap = styled.div`
  display: contents;
  ${pcOnly`
    display: block; max-width: 1180px; margin: 0 auto; box-sizing: border-box; padding: 28px 32px 60px; word-break: keep-all;
    & > div { background: transparent; }
    & > div > div:first-child {
      display: grid; grid-template-columns: 340px minmax(0, 1fr); grid-template-rows: auto auto 1fr; gap: 16px 24px;
      align-items: start; background: transparent;
    }
    & > div > div:first-child > div:nth-child(1) {
      grid-column: 1; grid-row: 1; background: #fff; border: 1px solid ${PC.line}; padding: 26px 24px;
    }
    & > div > div:first-child > div:nth-child(2) {
      grid-column: 2; grid-row: 1 / span 3; background: #fff; border: 1px solid ${PC.line}; padding: 10px 28px 16px; overflow: visible; min-height: 420px;
    }
    & > div > div:first-child > div:nth-child(3) {
      grid-column: 1; grid-row: 2; background: #fff; border: 1px solid ${PC.line}; padding: 16px 24px;
    }
    @media (max-width: 1040px) {
      & > div > div:first-child { grid-template-columns: minmax(0, 1fr); }
      & > div > div:first-child > div:nth-child(1), & > div > div:first-child > div:nth-child(2), & > div > div:first-child > div:nth-child(3) { grid-column: 1; grid-row: auto; }
    }
  `}
`;

const ProfileViewPage = () => {
  const { uid } = useParams();
  const { state } = useLocation();
  return (
    <SimpleBackLayout NAME="프로필">
      <PcProfileWrap>
        <ProfilePopup
          asPage
          uid={uid}
          fallbackName={state?.fallbackName}
          fallbackPhoto={state?.fallbackPhoto}
        />
      </PcProfileWrap>
    </SimpleBackLayout>
  );
};

export default ProfileViewPage;
