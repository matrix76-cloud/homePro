/* eslint-disable */
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";
import { FAQ_CATEGORIES, FAQ_ITEMS as ALL_FAQ_ITEMS, searchFaq } from "../../config/faqData";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { isIosApp } from "../../bridge/webviewBridge";
import {
    IoChevronDown, IoChevronUp, IoChevronForward,
    IoCallOutline, IoMailOutline, IoChatbubbleEllipsesOutline,
    IoSearchOutline, IoCloseCircle,
} from "react-icons/io5";
// 아이폰 앱에서는 구독료 안내(bl-02)를 빼 둔다 — 애플 3.1.1
const FAQ_ITEMS = ALL_FAQ_ITEMS.filter((i) => !(isIosApp() && i.id === "bl-02"));

const ALL = "all";

const SupportPage = () => {
    const nav = useNavigate();
    const [keyword, setKeyword] = useState("");
    const [cat, setCat] = useState(ALL);
    const [openId, setOpenId] = useState(null);

    // 연락처 — settings/companyInfo(관리자 설정)에서 로드, 값 없으면 "준비 중" (사업자 정보 실제값 전환 8/14)
    const [companyInfo, setCompanyInfo] = useState(null);
    useEffect(() => {
        (async () => {
            try {
                const { doc, getDoc } = await import("firebase/firestore");
                const { db } = await import("../../api/config");
                const snap = await getDoc(doc(db, "settings", "companyInfo"));
                if (snap.exists()) setCompanyInfo(snap.data());
            } catch {}
        })();
    }, []);

    const searching = keyword.trim().length > 0;

    // 검색어가 있으면 카테고리 필터를 무시하고 전체에서 찾는다 (찾으려는 답이 다른 주제에 있어도 걸리게)
    const results = useMemo(() => {
        if (searching) return searchFaq(FAQ_ITEMS, keyword);
        if (cat === ALL) return FAQ_ITEMS;
        return FAQ_ITEMS.filter((i) => i.category === cat);
    }, [keyword, cat, searching]);

    // 주제별 묶음 — 전체 보기일 때만 소제목으로 구분
    const groups = useMemo(() => {
        if (searching || cat !== ALL) return [{ id: null, label: null, items: results }];
        return FAQ_CATEGORIES
            .map((c) => ({ id: c.id, label: c.label, items: results.filter((i) => i.category === c.id) }))
            .filter((g) => g.items.length > 0);
    }, [results, searching, cat]);

    const toggle = (id) => setOpenId(openId === id ? null : id);

    const handleKeyword = (v) => {
        setKeyword(v);
        setOpenId(null);
    };

    const handleCat = (id) => {
        setCat(id);
        setKeyword("");
        setOpenId(null);
    };

    const catLabel = (id) => FAQ_CATEGORIES.find((c) => c.id === id)?.label || "";

    return (
        <SimpleBackLayout NAME="고객센터" hideFooter>
            <Wrap>
                {/* 검색 */}
                <SearchSection>
                    <SearchTitle>무엇을 도와드릴까요?</SearchTitle>
                    <SearchBox>
                        <IoSearchOutline size={20} color={THEME.muted} />
                        <SearchInput
                            value={keyword}
                            onChange={(e) => handleKeyword(e.target.value)}
                            placeholder="궁금한 내용을 검색해 보세요"
                        />
                        {keyword && (
                            <ClearBtn type="button" onClick={() => handleKeyword("")} aria-label="검색어 지우기">
                                <IoCloseCircle size={19} color={THEME.muted} />
                            </ClearBtn>
                        )}
                    </SearchBox>
                </SearchSection>

                {/* 주제 필터 */}
                <CatRow>
                    {/* 검색 중엔 주제와 무관하게 전체에서 찾으므로 '전체'를 활성으로 표시 */}
                    <CatChip $active={searching || cat === ALL} onClick={() => handleCat(ALL)}>전체</CatChip>
                    {FAQ_CATEGORIES.map((c) => (
                        <CatChip key={c.id} $active={!searching && cat === c.id} onClick={() => handleCat(c.id)}>
                            {c.label}
                        </CatChip>
                    ))}
                </CatRow>

                {/* FAQ 목록 */}
                <ListArea>
                    {searching && (
                        <ResultCount>
                            {results.length > 0
                                ? `검색 결과 ${results.length}건`
                                : "검색 결과가 없습니다"}
                        </ResultCount>
                    )}

                    {results.length === 0 ? (
                        <EmptyBox>
                            <EmptyTitle>찾으시는 답변이 없습니다</EmptyTitle>
                            <EmptyDesc>
                                다른 검색어로 찾아보시거나, 아래 연락처로 문의해 주세요.
                                {"\n"}문의 내용은 확인 후 자주 묻는 질문에 반영됩니다.
                            </EmptyDesc>
                        </EmptyBox>
                    ) : (
                        groups.map((g) => (
                            <FaqSection key={g.id || "flat"}>
                                {g.label && <SectionTitle>{g.label}</SectionTitle>}
                                {g.items.map((item) => {
                                    const isOpen = openId === item.id;
                                    return (
                                        <FaqItem key={item.id}>
                                            <FaqRow onClick={() => toggle(item.id)}>
                                                <FaqQ>{item.q}</FaqQ>
                                                {isOpen
                                                    ? <IoChevronUp size={18} color={THEME.muted} />
                                                    : <IoChevronDown size={18} color={THEME.muted} />}
                                            </FaqRow>
                                            {isOpen && (
                                                <FaqBody>
                                                    <FaqA>{item.a}</FaqA>
                                                    {searching && (
                                                        <FaqCat>{catLabel(item.category)}</FaqCat>
                                                    )}
                                                    {item.link && (
                                                        <GoBtn type="button" onClick={() => nav(item.link)}>
                                                            바로 가기
                                                            <IoChevronForward size={15} />
                                                        </GoBtn>
                                                    )}
                                                </FaqBody>
                                            )}
                                        </FaqItem>
                                    );
                                })}
                            </FaqSection>
                        ))
                    )}
                </ListArea>

                {/* 연락처 */}
                <ContactHead>해결되지 않으셨나요?</ContactHead>
                <ContactCard>
                    <ContactRow>
                        <ContactIcon><IoCallOutline size={20} color={THEME.primary} /></ContactIcon>
                        <ContactInfo>
                            <ContactLabel>전화 문의</ContactLabel>
                            <ContactValue>{companyInfo?.phone || "준비 중"}</ContactValue>
                        </ContactInfo>
                        <ContactSub>{companyInfo?.phone ? "평일 09:00 ~ 18:00" : ""}</ContactSub>
                    </ContactRow>
                    <Divider />
                    <ContactRow>
                        <ContactIcon><IoMailOutline size={20} color={THEME.primary} /></ContactIcon>
                        <ContactInfo>
                            <ContactLabel>이메일 문의</ContactLabel>
                            <ContactValue>{companyInfo?.email || "준비 중"}</ContactValue>
                        </ContactInfo>
                        <ContactSub>{companyInfo?.email ? "24시간 접수" : ""}</ContactSub>
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
            </Wrap>
        </SimpleBackLayout>
    );
};

export default SupportPage;

/* ===================== styles ===================== */

const Wrap = styled.div`
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-bottom: 40px;
    /* PC — 왼쪽 분류 세로 목록(260) · 오른쪽 검색과 질문 목록 */
    .pc-mode & {
        max-width: 1180px; margin: 0 auto; padding: 30px 32px 80px; box-sizing: border-box;
        display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 20px 24px; align-items: start;
        & > * { grid-column: 2; }
    }
`;

const SearchSection = styled.div`
    background: ${THEME.surface};
    border-radius: 16px;
    padding: 20px;
    box-shadow: ${THEME.cardShadow};
    .pc-mode & { border: 1px solid #dfe3e8; border-radius: 0; box-shadow: none; padding: 24px 26px; }
`;

const SearchTitle = styled.div`
    font-size: 20px;
    font-weight: 700;
    color: ${THEME.text};
    letter-spacing: -0.02em;
    margin-bottom: 14px;
    .pc-mode & { font-size: 22px; font-weight: 800; }
`;

const SearchBox = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    background: ${THEME.background};
    border-radius: 10px;
    .pc-mode & { max-width: 560px; background: #fff; border: 1px solid #dfe3e8; border-radius: 8px; &:focus-within { border-color: ${THEME.primary}; } }
`;

const SearchInput = styled.input`
    flex: 1;
    min-width: 0;
    border: none;
    background: none;
    outline: none;
    font-size: 16px;
    font-weight: 400;
    color: ${THEME.text};
    font-family: inherit;
    &::placeholder { color: ${THEME.muted}; }
`;

const ClearBtn = styled.button`
    border: none;
    background: none;
    padding: 0;
    display: flex;
    align-items: center;
    cursor: pointer;
`;

const CatRow = styled.div`
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 2px;
    -webkit-overflow-scrolling: touch;
    &::-webkit-scrollbar { display: none; }
    .pc-mode & {
        grid-column: 1; grid-row: 1 / span 6; position: sticky; top: 24px;
        flex-direction: column; gap: 0; padding: 0; overflow: visible; background: #fff; border: 1px solid #dfe3e8;
    }
`;

const CatChip = styled.button`
    flex-shrink: 0;
    padding: 9px 16px;
    border-radius: 20px;
    border: 1px solid ${({ $active }) => ($active ? THEME.text : THEME.border)};
    background: ${({ $active }) => ($active ? THEME.text : THEME.surface)};
    color: ${({ $active }) => ($active ? "#fff" : THEME.textSecondary)};
    font-size: 15px;
    font-weight: ${({ $active }) => ($active ? 700 : 500)};
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    &:active { opacity: 0.7; }
    /* PC — 고른 분류는 연회색 면 + 굵은 글씨 */
    .pc-mode & {
        width: 100%; text-align: left; padding: 15px 20px; border-radius: 0; border: none; white-space: normal;
        background: ${({ $active }) => ($active ? "#e9ecf1" : "#fff")};
        color: #14181F; font-size: 16px; font-weight: ${({ $active }) => ($active ? 800 : 500)};
        & + & { border-top: 1px solid #dfe3e8; }
        &:hover { background: ${({ $active }) => ($active ? "#e9ecf1" : "#f4f6f8")}; }
    }
`;

/* 탭·검색으로 목록이 줄어도 화면이 들쭉날쭉하지 않게 최소 높이 확보 */
const ListArea = styled.div`
    min-height: 420px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const ResultCount = styled.div`
    font-size: 14px;
    color: ${THEME.muted};
    padding: 2px 4px;
    .pc-mode & { font-size: 15px; color: #14181F; font-weight: 700; }
`;

const FaqSection = styled.div`
    background: ${THEME.surface};
    border-radius: 16px;
    overflow: hidden;
    box-shadow: ${THEME.cardShadow};
    .pc-mode & { border: 1px solid #dfe3e8; border-radius: 0; box-shadow: none; }
`;

const SectionTitle = styled.div`
    font-size: 17px;
    font-weight: 700;
    color: ${THEME.text};
    padding: 18px 20px 10px;
    .pc-mode & { padding: 14px 24px; background: #e9ecf1; font-size: 16px; }
`;

const FaqItem = styled.div`
    & + & { border-top: 1px solid ${THEME.border}; }
    ${SectionTitle} + & { border-top: 1px solid ${THEME.border}; }
`;

const FaqRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    cursor: pointer;
    gap: 12px;
    &:active { background: ${THEME.background}; }
    .pc-mode & { padding: 16px 24px; &:hover { background: #f4f6f8; } }
`;

const FaqQ = styled.div`
    flex: 1;
    font-size: 16px;
    font-weight: 500;
    color: ${THEME.text};
    line-height: 1.45;
    word-break: keep-all;
`;

const FaqBody = styled.div`
    padding: 0 20px 18px;
    .pc-mode & { padding: 2px 24px 22px; max-width: 820px; }
`;

const FaqA = styled.div`
    font-size: 16px;
    color: ${THEME.textSecondary};
    line-height: 1.7;
    word-break: keep-all;
    white-space: pre-line;
    .pc-mode & { color: #2b2f36; }
`;

const FaqCat = styled.div`
    margin-top: 10px;
    font-size: 13px;
    color: ${THEME.muted};
`;

const GoBtn = styled.button`
    margin-top: 12px;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 9px 14px;
    border: 1px solid ${THEME.border};
    border-radius: 10px;
    background: ${THEME.surface};
    color: ${THEME.primaryDark};
    font-size: 15px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    &:active { background: ${THEME.background}; }
`;

const EmptyBox = styled.div`
    background: ${THEME.surface};
    border-radius: 16px;
    box-shadow: ${THEME.cardShadow};
    padding: 48px 24px;
    text-align: center;
    .pc-mode & { border: 1px solid #dfe3e8; border-radius: 0; box-shadow: none; padding: 90px 24px; }
`;

const EmptyTitle = styled.div`
    font-size: 17px;
    font-weight: 700;
    color: ${THEME.text};
`;

const EmptyDesc = styled.div`
    margin-top: 8px;
    font-size: 15px;
    color: ${THEME.muted};
    line-height: 1.6;
    white-space: pre-line;
    word-break: keep-all;
    .pc-mode & { color: #14181F; }
`;

const ContactHead = styled.div`
    font-size: 17px;
    font-weight: 700;
    color: ${THEME.text};
    padding: 4px 4px 0;
    .pc-mode & { font-size: 18px; font-weight: 800; padding: 12px 0 0; }
`;

const ContactCard = styled.div`
    background: ${THEME.surface};
    border-radius: 16px;
    padding: 4px 0;
    box-shadow: ${THEME.cardShadow};
    /* PC — 문의 방법 세 가지를 한 줄에 나란히 */
    .pc-mode & {
        border: 1px solid #dfe3e8; border-radius: 0; box-shadow: none; padding: 0;
        display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
        & > div:nth-child(2n) { display: none; }
        & > div:nth-child(2n + 1):not(:first-child) { border-left: 1px solid #dfe3e8; }
    }
`;

const ContactRow = styled.div`
    display: flex;
    align-items: center;
    padding: 16px 20px;
    gap: 12px;
    .pc-mode & { display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 6px 12px; padding: 20px 22px; align-items: center; }
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
    font-size: 14px;
    color: ${THEME.muted};
    font-weight: 400;
    .pc-mode & { color: #14181F; font-weight: 700; }
`;

const ContactValue = styled.div`
    font-size: 17px;
    font-weight: 400;
    color: ${THEME.text};
    margin-top: 2px;
    .pc-mode & { word-break: break-all; }
`;

const ContactSub = styled.div`
    font-size: 13px;
    color: ${THEME.muted};
    font-weight: 400;
    flex-shrink: 0;
    .pc-mode & { color: #2b2f36; font-size: 14px; grid-column: 2; &:empty { display: none; } }
`;

const Divider = styled.div`
    height: 1px;
    background: ${THEME.border};
    margin: 0 20px;
`;
