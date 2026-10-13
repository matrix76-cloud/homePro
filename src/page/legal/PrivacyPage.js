/* eslint-disable */
import React from "react";
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";

// 제2조 — 처리하는 개인정보의 항목 (전부 필수항목)
const ITEMS = [
    { who: "공통 회원", use: "가입 및 계정 관리", items: "성명, 이메일 주소, 휴대전화번호, 비밀번호, 로그인 ID, 본인인증값(CI/DI), 서비스 이용 기록, 접속 로그, 쿠키, 접속 IP 정보" },
    { who: "소비자 회원", use: "오더 등록 및 서비스 이용", items: "서비스 요청 주소/위치, 작업 희망일, 현장 사진, 작업 상세 내용, 연락처" },
    { who: "사업자 회원", use: "비즈프로필 및 오더 수락", items: "상호(업체명), 대표자명, 사업자등록번호, 사업장 주소, 대표 전화번호, 정산 계좌정보, 비즈프로필 선택 카테고리(최대 5개), 면허/자격 증빙 서류" },
    { who: "개인프리랜서 회원", use: "비즈프로필 및 오더 수락", items: "성명, 생년월일, 연락처, 주소, 정산 계좌정보, 비즈프로필 선택 카테고리(최대 5개), 기술/면허 자격 증빙" },
    { who: "공인중개사 회원", use: "부동산 공동중개 서비스", items: "개업공인중개사 성명, 중개사무소 명칭, 사무소 개설등록번호, 자격증 번호, 사업자등록증 및 개설등록증 사본" },
    { who: "안심케어 / 현장인증", use: "작업 증빙 및 보험 적용", items: "실시간 위치정보(GPS 데이터), 작업 시작/종료(체크인/체크아웃) 시각, 작업 전·후 현장 사진" },
    { who: "PG 결제링크 이용", use: "결제 및 정산 연결", items: "사업자 등록 정보, 결제 요청 금액, 결제링크 발급 이력, 거래 상태 정보" },
    { who: "블랙리스트 신고", use: "신고 접수 및 심사", items: "신고자 및 피신고자의 식별 정보, 신고 사유, 증빙 캡처 이미지(최대 3장)", note: "게시판 공개 시 성명/상호/연락처는 일부 마스킹 처리됩니다." },
];

// 제4조 — 제3자 제공
const PROVIDED = [
    {
        to: "거래 상대방 (소비자, 사업자, 개인프리랜서, 공인중개사)",
        why: "오더 수행, 현장 방문, 작업 이행 및 당사자 간 직거래·정산",
        items: "성명/상호, 연락처, 작업 현장 주소, 오더 신청내용, 비즈프로필 정보",
        keep: "거래 완료 및 분쟁 해결 처리 시까지",
    },
    {
        to: "제휴 보험회사 (안심케어 담당 보험사)",
        why: "단체 도급배상책임보험 가입, 사고 접수, 현장 확인 및 보험금 지급 심사",
        items: "성명/상호, 연락처, 작업 현장 위치(GPS), 체크인/체크아웃 시각, 현장 작업 사진, 사고 경위",
        keep: "보험계약 유지 기간 및 사고 처리 완료 시까지",
    },
    {
        to: "제휴 결제대행업체 (PG사)",
        why: "사업자 PG 결제링크 서비스 제공, 결제 승인 및 사업자 직접 정산",
        items: "사업자등록정보, 대표자 성명, 계좌정보, 결제 요청 정보",
        keep: "관련 법령에 따른 거래 기록 보존 기간",
    },
];

// 제5조 — 처리 위탁
const ENTRUSTED = [
    { to: "토스페이먼츠", work: "본인인증 및 본인확인 서비스" },
    { to: "Google Cloud (Firebase)", work: "데이터 보관 및 시스템 인프라 운영" },
    { to: "(주)카카오 / 문자알림 서비스 업체", work: "카카오톡 알림톡 및 문자메시지(SMS/LMS) 발송" },
];

const PrivacyPage = () => (
    <SimpleBackLayout NAME="개인정보처리방침" hideFooter>
        <Wrap>
            <Title>홈프로 개인정보 처리방침</Title>
            <Date>시행일자: 2026년 10월 15일</Date>

            <P>
                주식회사 윈플래닛(이하 "회사")은 정보주체의 개인정보를 보호하고 이와 관련한 고충을
                신속하고 원활하게 처리할 수 있도록 「개인정보 보호법」 제30조에 따라 다음과 같이
                개인정보 처리방침을 수립·공개합니다.
            </P>

            <H2>제1조 (개인정보의 처리 목적)</H2>
            <P>
                회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적
                이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 「개인정보 보호법」
                제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </P>
            <P><B>1. 회원 가입 및 관리</B></P>
            <Li>회원가입 의사 확인, 본인식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지, 가입 의사 확인, 만 14세 미만 아동 개인정보 수집 시 법정대리인 동의 여부 확인, 각종 고지·통지, 고충처리 목적</Li>
            <P><B>2. 사업자회원 및 개인프리랜서회원, 공인중개사 자격 검증</B></P>
            <Li>비즈프로필 등록 자격 검증, 개업공인중개사 사후 자격 인증(중개사무소 개설등록증, 자격증 확인), 서비스 제공 자격 유지 관리</Li>
            <P><B>3. 서비스 제공 및 계약 이행</B></P>
            <Li>오더 등록·공유, 사업자 매칭·연결, 비즈프로필 관리, "나의 오더 현황" 진행 상태 관리, AI 기반 예상 견적 산출, PG 결제링크 생성 편의 제공, 대금 정산, H-포인트 적립·이용 및 소멸 관리</Li>
            <P><B>4. 안심케어(도급배상책임보험) 및 현장 관리</B></P>
            <Li>단체 도급배상책임보험(대인·대물·물적확대담보) 피보험자 적용, 작업 현장 GPS 체크인·체크아웃 시각 및 위치 확인, 작업 전·후 사진 등록을 통한 보험 사고 접수 및 증빙 확인</Li>
            <P><B>5. 블랙리스트 신고 및 안전한 거래 환경 조성</B></P>
            <Li>허위오더, 노쇼, 대금미지급 등 부정행위 신고 접수·심사, 개인정보 일부 마스킹 공개를 통한 타 회원 피해 예방, 오더 작성·수락 권한 제한 관리</Li>
            <P><B>6. 신규 서비스 개발 및 마케팅·광고에의 활용 (선택)</B></P>
            <Li>신규 서비스 개발 및 맞춤형 서비스 제공, 이벤트 및 광고성 정보 제공 및 참여기회 제공, AI 모델 고도화를 위한 비식별화 데이터 분석</Li>

            <H2>제2조 (처리하는 개인정보의 항목)</H2>
            <P>회사는 서비스 제공을 위해 최소한의 개인정보를 수집·처리하고 있습니다.</P>
            {ITEMS.map((it) => (
                <Block key={it.who}>
                    <BlockHead>{it.who} — {it.use}</BlockHead>
                    <Row><RowLabel>필수항목</RowLabel><RowValue>{it.items}</RowValue></Row>
                    {it.note && <BlockNote>※ {it.note}</BlockNote>}
                </Block>
            ))}

            <H2>제3조 (개인정보의 처리 및 보유 기간)</H2>
            <P>① 회사는 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용 기간 내에서 개인정보를 처리·보유합니다.</P>
            <Li>회원 가입 및 관리: 회원 탈퇴 시까지 (단, 관계 법령 위반에 따른 수사·조사 중인 경우에는 해당 수사·조사 종료 시까지)</Li>
            <Li>부정 이용 및 블랙리스트 관리: 부정 이용 방지 및 피해 예방을 위해 탈퇴 후 1년간 식별 정보 및 신고 기록 보관</Li>
            <P>② 관계 법령의 규정에 의하여 보존할 필요가 있는 경우 회사는 아래와 같이 관계 법령에서 정한 일정한 기간 동안 개인정보를 보관합니다.</P>
            <P><B>「전자상거래 등에서의 소비자보호에 관한 법률」</B></P>
            <Li>계약 또는 청약철회 등에 관한 기록: 5년</Li>
            <Li>대금결제 및 재화 등의 공급에 관한 기록: 5년</Li>
            <Li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년</Li>
            <Li>표시/광고에 관한 기록: 6개월</Li>
            <P><B>「통신비밀보호법」</B></P>
            <Li>웹사이트/앱 방문 기록 (로그인 기록): 3개월</Li>

            <H2>제4조 (개인정보의 제3자 제공)</H2>
            <P>① 회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.</P>
            <P>② 회사는 원활한 서비스 이행을 위하여 다음과 같이 개인정보를 제3자에게 제공하고 있습니다.</P>
            {PROVIDED.map((it) => (
                <Block key={it.to}>
                    <BlockHead>{it.to}</BlockHead>
                    <Row><RowLabel>제공 목적</RowLabel><RowValue>{it.why}</RowValue></Row>
                    <Row><RowLabel>제공 항목</RowLabel><RowValue>{it.items}</RowValue></Row>
                    <Row><RowLabel>보유 및 이용 기간</RowLabel><RowValue>{it.keep}</RowValue></Row>
                </Block>
            ))}

            <H2>제5조 (개인정보 처리의 위탁)</H2>
            <P>① 회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.</P>
            {ENTRUSTED.map((it) => (
                <Block key={it.to}>
                    <BlockHead>{it.to}</BlockHead>
                    <Row><RowLabel>위탁 업무</RowLabel><RowValue>{it.work}</RowValue></Row>
                </Block>
            ))}
            <P>② 회사는 위탁계약 체결 시 「개인정보 보호법」 제26조에 따라 위탁업무 수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지 감독하고 있습니다.</P>

            <H2>제6조 (개인정보의 파기절차 및 파기방법)</H2>
            <P>① 회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.</P>
            <P>② 파기의 절차 및 방법은 다음과 같습니다.</P>
            <Li>파기절차: 회사는 파기 사유가 발생한 개인정보를 선정하고, 회사의 개인정보 보호책임자의 승인을 받아 개인정보를 파기합니다.</Li>
            <Li>파기방법: 전자적 파일 형태로 기록·저장된 개인정보는 기록을 재생할 수 없도록 기술적 방법을 사용하여 삭제하며, 종이 문서에 기록·저장된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.</Li>

            <H2>제7조 (정보주체와 법정대리인의 권리·의무 및 행사방법)</H2>
            <P>① 정보주체는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 요구 등의 권리를 행사할 수 있습니다.</P>
            <P>② 권리 행사는 회사에 대해 「개인정보 보호법」 시행령 제41조 제1항에 따라 서면, 전자우편, 모바일 앱 내 마이페이지 기능 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다.</P>
            <P>③ 정보주체가 개인정보의 오류 등에 대한 정정 또는 삭제를 요구한 경우에는 회사는 정정 또는 삭제를 완료할 때까지 당해 개인정보를 이용하거나 제공하지 않습니다.</P>

            <H2>제8조 (위치정보의 수집 및 이용)</H2>
            <P>① 회사는 「위치정보의 보호 및 이용 등에 관한 법률」에 따라 사업자회원 및 개인프리랜서회원의 현장 체크인·체크아웃 실시간 GPS 위치정보를 수집·이용합니다.</P>
            <P>② 수집 목적: 안심케어(도급배상책임보험) 보장 요건 입증, 현장 도착 및 작업 완료 확인, 오더 위치 기반 매칭</P>
            <P>③ 보존 기간: 안심케어 보험 사고 입증 및 분쟁 처리를 위해 작업 완료일로부터 1년간 보관 후 파기</P>
            <P>④ 위치주체는 위치정보의 수집·이용·제공에 대한 동의의 전부 또는 일부를 철회할 수 있습니다.</P>

            <H2>제9조 (개인정보의 안전성 확보조치)</H2>
            <P>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</P>
            <Li>관리적 조치: 내부관리계획 수립·시행, 정기적 직원 교육, 개인정보 취급자의 최소화</Li>
            <Li>기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 비밀번호 및 고유식별정보의 암호화 저장, 보안프로그램 설치 및 주기적 갱신, SSL 통신 암호화</Li>
            <Li>물리적 조치: 데이터센터 및 서류 보관실의 접근통제</Li>

            <H2>제10조 (개인정보 자동 수집 장치의 설치·운영 및 거부에 관한 사항)</H2>
            <P>① 회사는 이용자에게 개별적인 맞춤서비스를 제공하기 위해 이용정보를 저장하고 수시로 불러오는 '쿠키(cookie)' 등을 사용합니다.</P>
            <P>② 이용자는 웹 브라우저 옵션 설정을 통해 쿠키 저장을 거부할 수 있습니다. 단, 쿠키 저장을 거부할 경우 맞춤형 서비스 이용에 어려움이 발생할 수 있습니다.</P>

            <H2>제11조 (개인정보 보호책임자)</H2>
            <P>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</P>
            <Block>
                <BlockHead>개인정보 보호책임자</BlockHead>
                <Row><RowLabel>성명</RowLabel><RowValue>박성우</RowValue></Row>
                <Row><RowLabel>직책</RowLabel><RowValue>운영팀장</RowValue></Row>
                <Row><RowLabel>연락처</RowLabel><RowValue>1555-3364</RowValue></Row>
                <Row><RowLabel>이메일</RowLabel><RowValue>support@gethomepro.co.kr</RowValue></Row>
            </Block>

            <H2>제12조 (개인정보 처리방침의 변경)</H2>
            <P>이 개인정보 처리방침은 2026년 10월 15일부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.</P>
        </Wrap>
    </SimpleBackLayout>
);

export default PrivacyPage;

const Wrap = styled.div`
    padding: 20px 16px 60px;
`;
const Title = styled.h1`
    font-size: 22px;
    font-weight: 400;
    color: ${THEME.text};
    margin: 0 0 4px;
`;
const Date = styled.div`
    font-size: 15px;
    color: ${THEME.muted};
    margin-bottom: 28px;
`;
const H2 = styled.h2`
    font-size: 18px;
    font-weight: 400;
    color: ${THEME.text};
    margin: 24px 0 8px;
`;
const P = styled.p`
    font-size: 16px;
    color: ${THEME.textSecondary};
    line-height: 1.7;
    margin: 4px 0;
    word-break: keep-all;
`;
const B = styled.span`
    font-weight: 400;
    color: ${THEME.text};
`;
// 긴 항목이 두 줄로 넘어가도 "-" 아래로 글이 들어가지 않게 내어쓰기
const Li = styled(P)`
    padding-left: 22px;
    text-indent: -12px;
    &::before { content: "- "; }
`;
const Block = styled.div`
    margin: 10px 0;
    border: 1px solid ${THEME.border || "#e3e6ea"};
    background: #fff;
`;
const BlockHead = styled.div`
    padding: 12px 14px;
    font-size: 16px;
    font-weight: 700;
    color: ${THEME.text};
    line-height: 1.5;
    word-break: keep-all;
    border-bottom: 1px solid ${THEME.border || "#e3e6ea"};
`;
const Row = styled.div`
    padding: 10px 14px;
    & + & { border-top: 1px solid ${THEME.border || "#e3e6ea"}; }
`;
const RowLabel = styled.div`
    font-size: 14px;
    font-weight: 700;
    color: ${THEME.text};
    margin-bottom: 2px;
`;
const RowValue = styled.div`
    font-size: 16px;
    color: ${THEME.textSecondary};
    line-height: 1.7;
    word-break: keep-all;
`;
const BlockNote = styled.div`
    padding: 0 14px 12px;
    font-size: 14px;
    color: ${THEME.textSecondary};
    line-height: 1.6;
    word-break: keep-all;
`;
