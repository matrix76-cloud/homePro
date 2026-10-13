/* eslint-disable */
import React from "react";
import styled from "styled-components";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";

const DeleteAccountPage = () => (
    <SimpleBackLayout NAME="계정 삭제 안내" hideFooter>
        <Wrap>
            <Title>계정 삭제 안내</Title>
            <Date>최종 업데이트: 2026년 9월 30일</Date>

            <P>
                홈프로 서비스를 이용해 주셔서 감사합니다.<br />
                계정을 삭제하시면 아래에 안내된 데이터가 처리됩니다.
            </P>

            <H2>삭제되는 데이터</H2>
            <P>
                - 회원 정보(이름, 이메일, 휴대전화번호)<br />
                - 소셜 로그인 연동 정보(Google, 카카오)<br />
                - 작성한 견적 요청 및 채팅 내역<br />
                - 전문가 프로필 및 포트폴리오<br />
                - 알림 설정 및 즐겨찾기 목록
            </P>

            <H2>보존되는 데이터</H2>
            <P>
                - 완료된 거래 내역: 전자상거래 등에서의 소비자 보호에 관한 법률에 따라 <B>5년</B> 보관<br />
                - 분쟁 처리 관련 기록: <B>3년</B> 보관
            </P>

            <H2>계정 삭제 방법</H2>
            <P>
                앱 또는 웹에서 로그인 후 아래 경로로 이동하여 계정을 삭제하실 수 있습니다.
            </P>
            <StepBox>
                <Step>1. 앱 하단 메뉴 → <B>마이페이지</B> 탭 이동</Step>
                <Step>2. 화면 오른쪽 상단 <B>설정(⚙)</B> 아이콘 클릭</Step>
                <Step>3. <B>계정 관리</B> → <B>회원 탈퇴</B> 선택</Step>
                <Step>4. 안내 사항 확인 후 <B>탈퇴 신청</B> 버튼 클릭</Step>
            </StepBox>

            <H2>문의</H2>
            <P>
                계정 삭제 관련 문의는 고객센터로 연락해 주세요.<br />
                이메일: support@homepro.app
            </P>
        </Wrap>
    </SimpleBackLayout>
);

export default DeleteAccountPage;

const Wrap = styled.div`
    padding: 24px 20px 60px;
    max-width: 720px;
    margin: 0 auto;
`;
const Title = styled.h1`
    font-size: 22px;
    font-weight: 700;
    color: #1b1f27;
    margin-bottom: 6px;
`;
const Date = styled.p`
    font-size: 13px;
    color: #888;
    margin-bottom: 28px;
`;
const H2 = styled.h2`
    font-size: 16px;
    font-weight: 700;
    color: #1b1f27;
    margin: 28px 0 10px;
`;
const P = styled.p`
    font-size: 15px;
    color: #2b2f36;
    line-height: 1.8;
    margin-bottom: 8px;
`;
const B = styled.span`
    font-weight: 700;
`;
const StepBox = styled.div`
    background: #f6f8fa;
    border: 1px solid #e2e6ec;
    padding: 18px 20px;
    margin: 10px 0 8px;
`;
const Step = styled.p`
    font-size: 15px;
    color: #2b2f36;
    line-height: 1.9;
    margin: 0;
`;
