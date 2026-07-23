/* eslint-disable */
// 공동중개 — 공인중개 라운지 (개업 공인중개사 전용 B2B 매물/손님 매칭)
// Phase 2: 라운지 소개 + 면책 안내 랜딩. 피드/등록폼/자격검증 가입은 Phase 3.
import React from "react";
import styled from "styled-components";
import MainListLayout from "../../screen/Layout/Layout/MainListLayout";
import { THEME } from "../../config/homeproConfig";
import { IoHomeOutline, IoSearchOutline, IoShieldCheckmarkOutline } from "react-icons/io5";

const BrokeragePage = () => {
  return (
    <MainListLayout NAME="공동중개" footerType="brokerage" hideBack>
      <Wrap>
        <Hero>
          <HeroTitle>공인중개 라운지</HeroTitle>
          <HeroSub>자격이 검증된 개업 공인중개사만 입장하는 프라이빗 B2B 네트워크</HeroSub>
        </Hero>

        <NoticeBox>
          본 라운지는 100% 개업공인중개사 전용 공간입니다. 국토교통부 데이터를 통해 자격이 검증된
          대표 공인중개사만 가입을 승인하며, 무자격자·중개보조원·일반회원의 진입은 차단됩니다.
        </NoticeBox>

        <Card>
          <CardIco><IoSearchOutline size={22} color={THEME.primary} /></CardIco>
          <CardTitle>손님 찾습니다 (수요 등록)</CardTitle>
          <CardDesc>지역·거래유형·계약형태·예산으로 찾는 손님을 등록하고, 매물 있는 중개사와 실시간 매칭.</CardDesc>
        </Card>

        <Card>
          <CardIco><IoHomeOutline size={22} color={THEME.primary} /></CardIco>
          <CardTitle>매물 있습니다 (공동매물 · 보안형)</CardTitle>
          <CardDesc>상세 번지는 블라인드(시/구/동까지만) 처리해 안전하게 공동매물을 등록하고 채팅으로 오픈.</CardDesc>
        </Card>

        <Card>
          <CardIco><IoShieldCheckmarkOutline size={22} color={THEME.primary} /></CardIco>
          <CardTitle>안전한 실속 매칭</CardTitle>
          <CardDesc>[채팅하기] 한 번으로 연결. 대화방 상단에 상대 상호명·대표자·연락처가 표시됩니다.</CardDesc>
        </Card>

        <ComingSoon>라운지 피드·매물/손님 등록·자격검증 가입은 순차 오픈 예정입니다.</ComingSoon>

        <Disclaimer>
          본 서비스는 개업공인중개사 상호 간의 소통과 정보 교환을 돕는 부가통신 서비스(IT 플랫폼)이며,
          공인중개사법상 부동산 거래정보망이 아닙니다. 홈프로는 중개 행위에 직접 개입하거나 거래를 보증하지 않으며,
          실제 계약 진행 및 중개 사고에 대한 모든 법적 책임은 공동 날인을 진행하는 거래 당사자에게 있습니다.
        </Disclaimer>
      </Wrap>
    </MainListLayout>
  );
};

export default BrokeragePage;

const Wrap = styled.div`
  padding: 12px 12px 40px;
  background: ${THEME.background};
  min-height: 100%;
`;

const Hero = styled.div`
  background: ${THEME.primary};
  border-radius: 16px;
  padding: 24px 20px;
  color: #fff;
`;

const HeroTitle = styled.div`
  font-size: 20px;
  font-weight: 700;
`;

const HeroSub = styled.div`
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.5;
  opacity: 0.92;
`;

const NoticeBox = styled.div`
  margin-top: 12px;
  padding: 14px 16px;
  background: ${THEME.surface};
  border: 1px solid ${THEME.border};
  border-radius: 12px;
  font-size: 13px;
  color: ${THEME.textSecondary};
  line-height: 1.6;
`;

const Card = styled.div`
  margin-top: 10px;
  padding: 16px;
  background: ${THEME.surface};
  border-radius: 14px;
  box-shadow: ${THEME.cardShadow};
`;

const CardIco = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: ${THEME.background};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
`;

const CardTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
`;

const CardDesc = styled.div`
  margin-top: 6px;
  font-size: 13px;
  color: ${THEME.muted};
  line-height: 1.55;
`;

const ComingSoon = styled.div`
  margin-top: 16px;
  padding: 14px;
  text-align: center;
  border: 1px dashed ${THEME.border};
  border-radius: 12px;
  font-size: 13px;
  color: ${THEME.primary};
  font-weight: 600;
`;

const Disclaimer = styled.div`
  margin-top: 16px;
  font-size: 11.5px;
  color: ${THEME.muted};
  line-height: 1.6;
`;
