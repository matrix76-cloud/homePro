/* eslint-disable */
import React, { useState } from "react";
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoChevronDown, IoChevronUp, IoCallOutline, IoMailOutline, IoChatbubbleEllipsesOutline } from "react-icons/io5";

const FAQ = [
    {
        id: 1,
        q: "홈프로는 어떤 서비스인가요?",
        a: "홈프로는 이사, 청소, 인테리어, 수리 등 홈서비스 분야의 전문가와 고객을 연결하는 매칭 플랫폼입니다. 필요한 서비스를 요청하면 검증된 전문가들의 견적을 비교하고 선택할 수 있습니다.",
    },
    {
        id: 2,
        q: "전문가(홈프로)로 등록하려면 어떻게 하나요?",
        a: "전문가 모드 전환 후 메인 화면에서 '분야추가' 버튼을 누르세요. 원하는 카테고리를 선택하고, 사업자등록증을 첨부하여 제출하면 등록이 완료됩니다.",
    },
    {
        id: 3,
        q: "견적은 어떻게 받나요?",
        a: "카테고리를 선택하고 서비스 요청서를 작성하면, 해당 분야의 전문가들이 견적을 보내드립니다. 받은 견적을 비교하고 원하는 전문가를 선택하세요.",
    },
    {
        id: 4,
        q: "결제는 어떻게 하나요?",
        a: "홈프로는 전문가와 고객 간의 매칭 플랫폼입니다. 결제는 전문가와 직접 협의하여 진행합니다. 카드결제, 계좌이체 등 다양한 결제수단을 이용할 수 있습니다.",
    },
    {
        id: 5,
        q: "서비스에 불만이 있으면 어떻게 하나요?",
        a: "서비스 완료 후 리뷰를 남기실 수 있으며, 심각한 문제가 있는 경우 아래 고객센터 연락처로 문의해 주세요. 확인 후 적절한 조치를 취하겠습니다.",
    },
    {
        id: 6,
        q: "회원 탈퇴는 어떻게 하나요?",
        a: "마이페이지 > 기본 계정정보에서 회원 탈퇴를 진행할 수 있습니다. 탈퇴 시 모든 개인정보와 이용 내역이 삭제되며, 보유 캐시는 소멸됩니다.",
    },
];

const SupportPage = () => {
    const [openId, setOpenId] = useState(null);
    const toggle = (id) => setOpenId(openId === id ? null : id);

    return (
        <SimpleBackLayout NAME="고객센터" hideFooter>
            <Wrap>
                {/* 상단 안내 */}
                <TopCard>
                    <TopTitle>무엇을 도와드릴까요?</TopTitle>
                    <TopDesc>자주 묻는 질문을 확인하시거나, 아래 연락처로 문의해 주세요.</TopDesc>
                </TopCard>

                {/* 연락처 */}
                <ContactCard>
                    <ContactRow>
                        <ContactIcon><IoCallOutline size={20} color={THEME.primary} /></ContactIcon>
                        <ContactInfo>
                            <ContactLabel>전화 문의</ContactLabel>
                            <ContactValue>1588-0000</ContactValue>
                        </ContactInfo>
                        <ContactSub>평일 09:00 ~ 18:00</ContactSub>
                    </ContactRow>
                    <Divider />
                    <ContactRow>
                        <ContactIcon><IoMailOutline size={20} color={THEME.primary} /></ContactIcon>
                        <ContactInfo>
                            <ContactLabel>이메일 문의</ContactLabel>
                            <ContactValue>support@homepro.kr</ContactValue>
                        </ContactInfo>
                        <ContactSub>24시간 접수</ContactSub>
                    </ContactRow>
                    <Divider />
                    <ContactRow>
                        <ContactIcon><IoChatbubbleEllipsesOutline size={20} color={THEME.primary} /></ContactIcon>
                        <ContactInfo>
                            <ContactLabel>카카오톡 문의</ContactLabel>
                            <ContactValue>@홈프로</ContactValue>
                        </ContactInfo>
                        <ContactSub>평일 09:00 ~ 18:00</ContactSub>
                    </ContactRow>
                </ContactCard>

                {/* FAQ */}
                <FaqSection>
                    <FaqTitle>자주 묻는 질문</FaqTitle>
                    {FAQ.map((item) => {
                        const isOpen = openId === item.id;
                        return (
                            <FaqItem key={item.id}>
                                <FaqRow onClick={() => toggle(item.id)}>
                                    <FaqQ>
                                        <FaqBadge>Q</FaqBadge>
                                        {item.q}
                                    </FaqQ>
                                    {isOpen
                                        ? <IoChevronUp size={18} color={THEME.muted} />
                                        : <IoChevronDown size={18} color={THEME.muted} />
                                    }
                                </FaqRow>
                                {isOpen && (
                                    <FaqA>{item.a}</FaqA>
                                )}
                            </FaqItem>
                        );
                    })}
                </FaqSection>
            </Wrap>
        </SimpleBackLayout>
    );
};

export default SupportPage;

/* ===================== styles ===================== */

const Wrap = styled.div`
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-bottom: 40px;
`;

const TopCard = styled.div`
    background: linear-gradient(135deg, ${THEME.primary}, ${THEME.purple});
    border-radius: 16px;
    padding: 24px 20px;
`;

const TopTitle = styled.div`
    font-size: 20px;
    font-weight: 400;
    color: #fff;
    letter-spacing: -0.03em;
`;

const TopDesc = styled.div`
    font-size: 14px;
    color: rgba(255,255,255,0.85);
    margin-top: 6px;
    font-weight: 400;
`;

const ContactCard = styled.div`
    background: ${THEME.surface};
    border-radius: 16px;
    padding: 4px 0;
    box-shadow: ${THEME.cardShadow};
`;

const ContactRow = styled.div`
    display: flex;
    align-items: center;
    padding: 16px 20px;
    gap: 12px;
`;

const ContactIcon = styled.div`
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: ${THEME.background};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

const ContactInfo = styled.div`
    flex: 1;
`;

const ContactLabel = styled.div`
    font-size: 12px;
    color: ${THEME.muted};
    font-weight: 400;
`;

const ContactValue = styled.div`
    font-size: 15px;
    font-weight: 400;
    color: ${THEME.text};
    margin-top: 2px;
`;

const ContactSub = styled.div`
    font-size: 11px;
    color: ${THEME.muted};
    font-weight: 400;
    flex-shrink: 0;
`;

const Divider = styled.div`
    height: 1px;
    background: ${THEME.border};
    margin: 0 20px;
`;

const FaqSection = styled.div`
    background: ${THEME.surface};
    border-radius: 16px;
    overflow: hidden;
    box-shadow: ${THEME.cardShadow};
`;

const FaqTitle = styled.div`
    font-size: 17px;
    font-weight: 400;
    color: ${THEME.text};
    padding: 20px 20px 12px;
`;

const FaqItem = styled.div`
    border-top: 1px solid ${THEME.border};
`;

const FaqRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    cursor: pointer;
    gap: 12px;
    &:active { background: ${THEME.background}; }
`;

const FaqQ = styled.div`
    flex: 1;
    font-size: 14px;
    font-weight: 400;
    color: ${THEME.text};
    line-height: 1.4;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    word-break: keep-all;
`;

const FaqBadge = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: ${THEME.primary};
    color: #fff;
    font-size: 12px;
    font-weight: 400;
    flex-shrink: 0;
`;

const FaqA = styled.div`
    padding: 0 20px 16px 50px;
    font-size: 14px;
    color: ${THEME.textSecondary};
    line-height: 1.7;
    word-break: keep-all;
`;
