/* eslint-disable */
import React, { useState } from "react";
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoChevronDown, IoChevronUp } from "react-icons/io5";

const NOTICES = [
    {
        id: 1,
        badge: "공지",
        title: "홈프로 서비스 오픈 안내",
        date: "2026.02.08",
        content:
            "안녕하세요, 홈프로입니다.\n\n각 분야 전문가를 연결하는 실전형 플랫폼 '홈프로'가 정식 오픈했습니다.\n\n이사, 홈클리닝, 인테리어, 전기, 배관 등 20개 분야의 전문가를 빠르고 편리하게 만나보세요.\n\n앞으로도 더 나은 서비스를 제공하기 위해 노력하겠습니다.\n감사합니다.",
    },
    {
        id: 2,
        badge: "이벤트",
        title: "오픈 기념! 첫 오더 수수료 무료 이벤트",
        date: "2026.02.08",
        content:
            "홈프로 오픈을 기념하여 첫 오더 수수료 무료 이벤트를 진행합니다.\n\n- 대상: 전문가(홈프로) 회원 전체\n- 기간: 2026.02.08 ~ 별도 공지 시까지\n- 내용: 첫 번째 성사된 오더의 소개수수료 면제\n\n많은 참여 부탁드립니다!",
    },
    {
        id: 3,
        badge: "공지",
        title: "추천인 보상 프로그램 안내",
        date: "2026.02.08",
        content:
            "홈프로 추천인 보상 프로그램을 안내드립니다.\n\n1. 가입 보상: 추천인/피추천인 각각 5,000원 쿠폰 지급\n2. 거래 보상: 피추천인 거래 성사 시 거래금액의 3% 캐시 적립\n\n마이페이지 > 추천인 코드에서 내 추천 코드를 확인하세요.",
    },
    {
        id: 4,
        badge: "안내",
        title: "개인정보처리방침 및 이용약관 게시 안내",
        date: "2026.02.08",
        content:
            "홈프로 서비스 이용에 관한 약관을 안내드립니다.\n\n마이페이지 하단에서 아래 항목을 확인하실 수 있습니다.\n- 이용약관\n- 개인정보처리방침\n- 위치기반서비스 이용약관\n\n궁금한 사항은 고객센터로 문의해 주세요.",
    },
];

const NoticePage = () => {
    const [openId, setOpenId] = useState(null);

    const toggle = (id) => setOpenId(openId === id ? null : id);

    return (
        <SimpleBackLayout NAME="공지사항" hideFooter>
            <Wrap>
                {NOTICES.map((n) => {
                    const isOpen = openId === n.id;
                    return (
                        <NoticeItem key={n.id}>
                            <NoticeRow onClick={() => toggle(n.id)}>
                                <NoticeLeft>
                                    <Badge $type={n.badge}>{n.badge}</Badge>
                                    <NoticeTitle>{n.title}</NoticeTitle>
                                    <NoticeDate>{n.date}</NoticeDate>
                                </NoticeLeft>
                                {isOpen
                                    ? <IoChevronUp size={18} color={THEME.muted} />
                                    : <IoChevronDown size={18} color={THEME.muted} />
                                }
                            </NoticeRow>
                            {isOpen && (
                                <NoticeBody>{n.content}</NoticeBody>
                            )}
                        </NoticeItem>
                    );
                })}
            </Wrap>
        </SimpleBackLayout>
    );
};

export default NoticePage;

/* ===================== styles ===================== */

const Wrap = styled.div`
    padding: 12px;
`;

const NoticeItem = styled.div`
    background: ${THEME.surface};
    &:first-child { border-radius: 16px 16px 0 0; }
    &:last-child { border-radius: 0 0 16px 16px; }
    &:only-child { border-radius: 16px; }
    &:not(:last-child) { border-bottom: 1px solid ${THEME.border}; }
`;

const NoticeRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px;
    cursor: pointer;
    &:active { background: ${THEME.background}; }
`;

const NoticeLeft = styled.div`
    flex: 1;
    min-width: 0;
    margin-right: 12px;
`;

const Badge = styled.span`
    display: inline-block;
    padding: 2px 8px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 400;
    margin-bottom: 6px;
    background: ${({ $type }) =>
        $type === "이벤트" ? "#FEF3C7" :
        $type === "안내" ? THEME.purpleLight :
        THEME.purpleLight};
    color: ${({ $type }) =>
        $type === "이벤트" ? "#D97706" :
        $type === "안내" ? THEME.purple :
        THEME.primary};
`;

const NoticeTitle = styled.div`
    font-size: 15px;
    font-weight: 400;
    color: ${THEME.text};
    line-height: 1.4;
    word-break: keep-all;
`;

const NoticeDate = styled.div`
    font-size: 12px;
    color: ${THEME.muted};
    margin-top: 4px;
`;

const NoticeBody = styled.div`
    padding: 0 20px 20px;
    font-size: 14px;
    color: ${THEME.textSecondary};
    line-height: 1.7;
    white-space: pre-line;
    word-break: keep-all;
`;
