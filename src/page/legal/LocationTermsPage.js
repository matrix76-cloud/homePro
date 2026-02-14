/* eslint-disable */
import React from "react";
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";

const LocationTermsPage = () => (
    <SimpleBackLayout NAME="위치기반서비스 이용약관" hideFooter>
        <Wrap>
            <Title>위치기반서비스 이용약관</Title>
            <Date>시행일: 2026년 2월 8일</Date>

            <H2>제1조 (목적)</H2>
            <P>
                본 약관은 홈프로(이하 "회사")가 제공하는 위치기반서비스(이하 "위치서비스")에 대해
                회사와 이용자 간의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
            </P>

            <H2>제2조 (정의)</H2>
            <P>1. "위치정보"란 이동성이 있는 물건 또는 개인이 특정한 시간에 존재하거나 존재하였던 장소에 관한 정보를 말합니다.</P>
            <P>2. "개인위치정보"란 특정 개인의 위치정보를 말합니다.</P>
            <P>3. "위치서비스"란 위치정보를 이용한 서비스로서, 회사가 제공하는 근처 전문가 검색, 서비스 지역 설정 등의 기능을 포함합니다.</P>

            <H2>제3조 (서비스 내용)</H2>
            <P>회사는 위치정보를 이용하여 다음과 같은 서비스를 제공합니다.</P>
            <P>&nbsp;&nbsp;1. 주변 전문가 검색 및 추천</P>
            <P>&nbsp;&nbsp;2. 서비스 가능 지역 설정 및 확인</P>
            <P>&nbsp;&nbsp;3. 전문가-고객 간 거리 기반 매칭</P>
            <P>&nbsp;&nbsp;4. 오더 요청 시 서비스 위치 지정</P>

            <H2>제4조 (위치정보 수집 방법)</H2>
            <P>1. 회사는 이용자의 휴대전화 GPS, Wi-Fi, 기지국 정보 등을 통해 위치정보를 수집합니다.</P>
            <P>2. 위치정보의 수집은 이용자의 동의를 얻은 경우에만 이루어집니다.</P>
            <P>3. 이용자는 기기의 설정을 통해 위치정보 수집을 허용하거나 거부할 수 있습니다.</P>

            <H2>제5조 (위치정보 이용·제공)</H2>
            <P>1. 회사는 수집된 위치정보를 제3조의 서비스 제공 목적으로만 이용합니다.</P>
            <P>2. 회사는 이용자의 동의 없이 위치정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우는 예외로 합니다.</P>
            <P>&nbsp;&nbsp;가. 이용자가 사전에 동의한 경우</P>
            <P>&nbsp;&nbsp;나. 법령에 특별한 규정이 있는 경우</P>
            <P>&nbsp;&nbsp;다. 통계작성, 학술연구 또는 시장조사를 위해 특정 개인을 식별할 수 없는 형태로 제공하는 경우</P>

            <H2>제6조 (위치정보의 보유 및 이용기간)</H2>
            <P>1. 회사는 위치서비스 제공에 필요한 기간 동안만 위치정보를 보유하며, 목적 달성 후 즉시 파기합니다.</P>
            <P>2. 다만, 「위치정보의 보호 및 이용 등에 관한 법률」 제16조 제2항에 따라 위치정보 이용·제공 사실 확인자료는 6개월간 보관합니다.</P>

            <H2>제7조 (이용자의 권리)</H2>
            <P>1. 이용자는 언제든지 위치정보의 수집·이용·제공에 대한 동의를 철회할 수 있습니다.</P>
            <P>2. 이용자는 위치정보의 수집·이용·제공에 대한 동의의 전부 또는 일부를 철회할 수 있습니다.</P>
            <P>3. 이용자는 회사에 대하여 다음 각 호의 자료에 대한 열람 또는 고지를 요구할 수 있습니다.</P>
            <P>&nbsp;&nbsp;가. 이용자에 대한 위치정보 수집·이용·제공 사실 확인자료</P>
            <P>&nbsp;&nbsp;나. 이용자의 위치정보가 제3자에게 제공된 이유 및 내용</P>

            <H2>제8조 (법정대리인의 권리)</H2>
            <P>회사는 만 14세 미만의 아동으로부터 개인위치정보를 수집·이용 또는 제공하고자 하는 경우에는 법정대리인의 동의를 얻어야 합니다.</P>

            <H2>제9조 (손해배상)</H2>
            <P>이용자는 회사의 위치정보 관련 위법행위로 손해를 입은 경우에 회사에 대하여 손해배상을 청구할 수 있습니다. 이 경우 회사는 고의 또는 과실이 없음을 입증하지 아니하면 책임을 면할 수 없습니다.</P>

            <H2>제10조 (분쟁의 조정)</H2>
            <P>1. 회사와 이용자 간의 위치정보 관련 분쟁에 대하여 협의가 이루어지지 않는 경우 방송통신위원회에 재정을 신청할 수 있습니다.</P>
            <P>2. 회사 또는 이용자는 위치정보와 관련된 분쟁에 대해 개인정보분쟁조정위원회에 조정을 신청할 수 있습니다.</P>

            <H2>부칙</H2>
            <P>본 약관은 2026년 2월 8일부터 시행합니다.</P>
        </Wrap>
    </SimpleBackLayout>
);

export default LocationTermsPage;

const Wrap = styled.div`
    padding: 20px 16px 60px;
`;
const Title = styled.h1`
    font-size: 20px;
    font-weight: 400;
    color: ${THEME.text};
    margin: 0 0 4px;
`;
const Date = styled.div`
    font-size: 13px;
    color: ${THEME.muted};
    margin-bottom: 28px;
`;
const H2 = styled.h2`
    font-size: 16px;
    font-weight: 400;
    color: ${THEME.text};
    margin: 24px 0 8px;
`;
const P = styled.p`
    font-size: 14px;
    color: ${THEME.textSecondary};
    line-height: 1.7;
    margin: 4px 0;
    word-break: keep-all;
`;
