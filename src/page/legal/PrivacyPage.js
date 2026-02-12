/* eslint-disable */
import React from "react";
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";

const PrivacyPage = () => (
    <SimpleBackLayout NAME="개인정보처리방침" hideFooter>
        <Wrap>
            <Title>개인정보처리방침</Title>
            <Date>시행일: 2026년 2월 8일</Date>

            <P>
                홈프로(이하 "회사")는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」,
                「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련 법령을 준수합니다.
                회사는 본 개인정보처리방침을 통해 이용자의 개인정보가 어떠한 목적과 방식으로
                수집·이용·관리되는지 알려드립니다.
            </P>

            <H2>제1조 (수집하는 개인정보 항목)</H2>
            <P>회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.</P>
            <P><B>1. 회원가입 시</B></P>
            <P>&nbsp;&nbsp;- 필수: 이름(닉네임), 이메일, 휴대전화번호</P>
            <P>&nbsp;&nbsp;- 소셜로그인 시: 소셜 계정 식별자(Google UID, 카카오 ID)</P>
            <P><B>2. 전문가 등록 시</B></P>
            <P>&nbsp;&nbsp;- 필수: 사업자등록증 이미지, 전문분야 정보</P>
            <P><B>3. 서비스 이용 과정에서 자동 수집</B></P>
            <P>&nbsp;&nbsp;- 기기정보(OS, 기기모델), 접속 IP, 접속 일시, 서비스 이용기록</P>

            <H2>제2조 (개인정보의 수집·이용 목적)</H2>
            <P>1. 회원 관리: 회원제 서비스 이용에 따른 본인 확인, 개인 식별, 부정이용 방지</P>
            <P>2. 서비스 제공: 전문가-고객 매칭, 견적 요청/발송, 채팅, 일정 관리</P>
            <P>3. 요금 정산: 구독료, 소개수수료, 캐시 충전/사용 내역 관리</P>
            <P>4. 마케팅 및 광고: 이벤트/프로모션 안내, 서비스 개선을 위한 통계 분석</P>
            <P>5. 고객 지원: 문의 응대, 불만 처리, 공지사항 전달</P>

            <H2>제3조 (개인정보의 보유 및 이용기간)</H2>
            <P>1. 회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.</P>
            <P>2. 다만, 관련 법령에 의해 보존할 필요가 있는 경우 아래와 같이 보관합니다.</P>
            <P>&nbsp;&nbsp;- 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</P>
            <P>&nbsp;&nbsp;- 대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</P>
            <P>&nbsp;&nbsp;- 소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</P>
            <P>&nbsp;&nbsp;- 접속에 관한 기록: 3개월 (통신비밀보호법)</P>

            <H2>제4조 (개인정보의 제3자 제공)</H2>
            <P>1. 회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.</P>
            <P>2. 다만, 다음의 경우에는 예외로 합니다.</P>
            <P>&nbsp;&nbsp;- 이용자가 사전에 동의한 경우</P>
            <P>&nbsp;&nbsp;- 법령의 규정에 의하거나, 수사기관의 요청이 있는 경우</P>
            <P>&nbsp;&nbsp;- 서비스 제공을 위해 필요한 범위 내에서 전문가-고객 간 최소한의 연락처 정보 제공</P>

            <H2>제5조 (개인정보의 파기절차 및 방법)</H2>
            <P>1. 파기절차: 이용목적이 달성된 개인정보는 별도의 DB로 옮겨 일정 기간 저장된 후 파기됩니다.</P>
            <P>2. 파기방법: 전자적 파일 형태는 복구 불가능한 방법으로 삭제하며, 종이에 출력된 정보는 분쇄기로 분쇄합니다.</P>

            <H2>제6조 (이용자의 권리와 행사 방법)</H2>
            <P>1. 이용자는 언제든지 자신의 개인정보를 조회하거나 수정할 수 있습니다.</P>
            <P>2. 이용자는 회원 탈퇴를 통해 개인정보의 수집·이용 동의를 철회할 수 있습니다.</P>
            <P>3. 개인정보 열람·정정·삭제·처리정지 요구는 앱 내 고객센터 또는 이메일로 가능합니다.</P>

            <H2>제7조 (개인정보의 안전성 확보조치)</H2>
            <P>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</P>
            <P>&nbsp;&nbsp;- 개인정보 암호화 (Firebase Authentication 기반)</P>
            <P>&nbsp;&nbsp;- 접근 권한 관리 및 접근 통제</P>
            <P>&nbsp;&nbsp;- 개인정보 취급 직원 최소화 및 교육</P>
            <P>&nbsp;&nbsp;- 보안 프로그램 설치 및 주기적 점검</P>

            <H2>제8조 (개인정보 보호책임자)</H2>
            <P>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 이용자의 불만처리 및 피해구제를 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</P>
            <P>&nbsp;&nbsp;- 개인정보 보호책임자: 홈프로 운영팀</P>
            <P>&nbsp;&nbsp;- 문의: 앱 내 고객센터</P>

            <H2>제9조 (개인정보처리방침 변경)</H2>
            <P>본 개인정보처리방침은 법령, 정책 또는 보안기술의 변경에 따라 내용의 추가, 삭제 및 수정이 있을 수 있으며, 변경 시 앱 내 공지사항을 통해 고지합니다.</P>

            <H2>부칙</H2>
            <P>본 방침은 2026년 2월 8일부터 시행합니다.</P>
        </Wrap>
    </SimpleBackLayout>
);

export default PrivacyPage;

const Wrap = styled.div`
    padding: 20px 16px 60px;
`;
const Title = styled.h1`
    font-size: 20px;
    font-weight: 800;
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
    font-weight: 700;
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
const B = styled.span`
    font-weight: 700;
    color: ${THEME.text};
`;
