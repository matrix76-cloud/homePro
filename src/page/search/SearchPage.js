/* eslint-disable */
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { CATEGORIES, THEME } from "../../config/homeproConfig";
import { CATEGORY_ICONS } from "../../utility/CategoryIcons";
import {
  IoArrowBack,
  IoSearchOutline,
  IoCloseCircle,
  IoTimeOutline,
  IoTrendingUpOutline,
  IoClose,
} from "react-icons/io5";

const STORAGE_KEY = "homepro_recent_searches";
const MAX_RECENT = 10;

/* ─── 인기 검색어 (추후 Firestore 연동) ─── */
const POPULAR_SEARCHES = [];

/* ─── 지역 데이터 (추후 Firestore 연동) ─── */
const REGIONS = [];

/* ─── 금액 관련 데이터 (추후 Firestore 연동) ─── */
const PRICE_DATA = [];

/* ─── 검색 결과 탭 ─── */
const RESULT_TABS = ["전체", "카테고리", "지역", "금액", "기타"];

/* ================================================================ */

const SearchPage = () => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);
  const [activeTab, setActiveTab] = useState("전체");

  /* localStorage에서 최근 검색어 로드 */
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      setRecentSearches(saved);
    } catch { setRecentSearches([]); }
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const saveSearch = (term) => {
    const t = term.trim();
    if (!t) return;
    const updated = [t, ...recentSearches.filter((s) => s !== t)].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const removeRecent = (term) => {
    const updated = recentSearches.filter((s) => s !== term);
    setRecentSearches(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleSearch = (term) => {
    setQuery(term);
    saveSearch(term);
    setActiveTab("전체");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) saveSearch(query.trim());
  };

  /* ─── 검색 로직 ─── */
  const q = query.trim().toLowerCase();
  const hasQuery = q.length > 0;

  const categoryResults = hasQuery
    ? CATEGORIES.filter(
        (cat) =>
          cat.name.toLowerCase().includes(q) ||
          cat.shortName.toLowerCase().includes(q) ||
          (cat.description || "").toLowerCase().includes(q) ||
          (cat.subcategories || []).some((sub) => sub.toLowerCase().includes(q))
      )
    : [];

  const regionResults = hasQuery
    ? REGIONS.filter((r) => r.toLowerCase().includes(q))
    : [];

  const priceResults = hasQuery
    ? PRICE_DATA.filter(
        (p) =>
          p.label.includes(q) ||
          p.range.includes(q) ||
          p.categories.some((c) => c.toLowerCase().includes(q))
      )
    : [];

  const etcResults = hasQuery
    ? CATEGORIES.flatMap((cat) =>
        (cat.subcategories || [])
          .filter((sub) => sub.toLowerCase().includes(q))
          .map((sub) => ({ sub, category: cat }))
      )
    : [];

  const totalCount =
    categoryResults.length + regionResults.length + priceResults.length + etcResults.length;

  return (
    <PageWrap>
      {/* ── 검색 헤더 ── */}
      <SearchHeader>
        <BackBtn onClick={() => navigate(-1)}>
          <IoArrowBack size={22} color={THEME.text} />
        </BackBtn>
        <SearchForm onSubmit={handleSubmit}>
          <IoSearchOutline size={18} color={THEME.muted} />
          <SearchInput
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="서비스, 지역, 카테고리 검색"
          />
          {query && (
            <ClearBtn type="button" onClick={() => setQuery("")}>
              <IoCloseCircle size={18} color={THEME.muted} />
            </ClearBtn>
          )}
        </SearchForm>
      </SearchHeader>

      <ContentWrap>
        {!hasQuery ? (
          /* ══════ 검색 전: 최근/인기 검색어 ══════ */
          <>
            {recentSearches.length > 0 && (
              <Section>
                <SectionHeader>
                  <SectionTitle>
                    <IoTimeOutline size={15} color={THEME.muted} />
                    최근 검색어
                  </SectionTitle>
                  <ClearAllBtn onClick={clearAllRecent}>전체 삭제</ClearAllBtn>
                </SectionHeader>
                <RecentList>
                  {recentSearches.map((term) => (
                    <RecentItem key={term}>
                      <RecentText onClick={() => handleSearch(term)}>{term}</RecentText>
                      <RemoveBtn onClick={() => removeRecent(term)}>
                        <IoClose size={14} color={THEME.muted} />
                      </RemoveBtn>
                    </RecentItem>
                  ))}
                </RecentList>
              </Section>
            )}

            <Section>
              <SectionHeader>
                <SectionTitle>
                  <IoTrendingUpOutline size={15} color={THEME.danger} />
                  인기 검색어
                </SectionTitle>
              </SectionHeader>
              <PopularGrid>
                {POPULAR_SEARCHES.map((term, i) => (
                  <PopularItem key={term} onClick={() => handleSearch(term)}>
                    <PopularRank $top={i < 3}>{i + 1}</PopularRank>
                    <PopularText>{term}</PopularText>
                  </PopularItem>
                ))}
              </PopularGrid>
            </Section>
          </>
        ) : (
          /* ══════ 검색 후: 탭 + 결과 ══════ */
          <>
            <TabRow>
              {RESULT_TABS.map((tab) => (
                <Tab key={tab} $active={activeTab === tab} onClick={() => setActiveTab(tab)}>
                  {tab}
                </Tab>
              ))}
            </TabRow>

            {totalCount === 0 ? (
              <EmptyWrap>
                <EmptyText>'{query}' 검색 결과가 없습니다</EmptyText>
                <EmptySub>다른 키워드로 검색해보세요</EmptySub>
              </EmptyWrap>
            ) : (
              <ResultsWrap>
                {/* ── 카테고리 결과 ── */}
                {(activeTab === "전체" || activeTab === "카테고리") && categoryResults.length > 0 && (
                  <ResultSection>
                    {activeTab === "전체" && <ResultLabel>카테고리</ResultLabel>}
                    {categoryResults.map((cat) => (
                      <ResultCard key={cat.id} onClick={() => navigate(`/category/${cat.id}`)}>
                        <ResultIcon>{(() => { const Icon = CATEGORY_ICONS[cat.id]; return Icon ? <Icon /> : cat.shortName.charAt(0); })()}</ResultIcon>
                        <ResultInfo>
                          <ResultName>{cat.name}</ResultName>
                          <ResultDesc>{cat.description}</ResultDesc>
                          {cat.subcategories && (
                            <SubcatRow>
                              {cat.subcategories
                                .filter((s) => s.toLowerCase().includes(q))
                                .slice(0, 3)
                                .map((s) => (
                                  <SubcatChip key={s} $highlight>{s}</SubcatChip>
                                ))}
                              {cat.subcategories
                                .filter((s) => !s.toLowerCase().includes(q))
                                .slice(0, 2)
                                .map((s) => (
                                  <SubcatChip key={s}>{s}</SubcatChip>
                                ))}
                            </SubcatRow>
                          )}
                        </ResultInfo>
                      </ResultCard>
                    ))}
                  </ResultSection>
                )}

                {/* ── 지역 결과 ── */}
                {(activeTab === "전체" || activeTab === "지역") && regionResults.length > 0 && (
                  <ResultSection>
                    {activeTab === "전체" && <ResultLabel>지역</ResultLabel>}
                    {regionResults.map((region) => (
                      <RegionItem key={region} onClick={() => handleSearch(region)}>
                        <IoSearchOutline size={14} color={THEME.muted} />
                        <RegionText>{region}</RegionText>
                      </RegionItem>
                    ))}
                  </ResultSection>
                )}

                {/* ── 금액 결과 ── */}
                {(activeTab === "전체" || activeTab === "금액") && priceResults.length > 0 && (
                  <ResultSection>
                    {activeTab === "전체" && <ResultLabel>금액</ResultLabel>}
                    {priceResults.map((p) => (
                      <PriceItem key={p.label}>
                        <PriceLeft>
                          <PriceRange>{p.label}</PriceRange>
                          <PriceDetail>{p.range}</PriceDetail>
                        </PriceLeft>
                        <PriceCats>{p.categories.join(", ")}</PriceCats>
                      </PriceItem>
                    ))}
                  </ResultSection>
                )}

                {/* ── 기타 결과 ── */}
                {(activeTab === "전체" || activeTab === "기타") && etcResults.length > 0 && (
                  <ResultSection>
                    {activeTab === "전체" && <ResultLabel>기타</ResultLabel>}
                    {etcResults.map(({ sub, category }) => (
                      <EtcItem key={`${category.id}-${sub}`} onClick={() => navigate(`/category/${category.id}`)}>
                        <EtcText>{sub}</EtcText>
                        <EtcCat>{category.shortName}</EtcCat>
                      </EtcItem>
                    ))}
                  </ResultSection>
                )}
              </ResultsWrap>
            )}
          </>
        )}
      </ContentWrap>
    </PageWrap>
  );
};

export default SearchPage;

/* ===================== styles ===================== */

const PageWrap = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: ${THEME.background};
`;

/* ── 검색 헤더 ── */
const SearchHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  padding-top: calc(8px + env(safe-area-inset-top, 0px));
  background: ${THEME.surface};
  border-bottom: 1px solid ${THEME.border};
  flex-shrink: 0;
`;

const BackBtn = styled.button`
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  &:active { opacity: 0.6; }
`;

const SearchForm = styled.form`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: ${THEME.background};
  border-radius: 10px;
`;

const SearchInput = styled.input`
  flex: 1;
  border: none;
  background: none;
  outline: none;
  font-size: 15px;
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

/* ── 콘텐츠 영역 ── */
const ContentWrap = styled.div`
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
`;

/* ── 섹션 (최근/인기) ── */
const Section = styled.div`
  background: ${THEME.surface};
  margin: 0 12px 8px;
  padding: 20px;
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
`;

const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
`;

const ClearAllBtn = styled.button`
  border: none;
  background: none;
  padding: 0;
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
  cursor: pointer;
  font-family: inherit;
  &:active { opacity: 0.6; }
`;

/* 최근 검색어 */
const RecentList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const RecentItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 12px;
  background: ${THEME.background};
  border-radius: 20px;
`;

const RecentText = styled.span`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  cursor: pointer;
  &:active { color: ${THEME.primary}; }
`;

const RemoveBtn = styled.button`
  border: none;
  background: none;
  padding: 0;
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-left: 2px;
`;

/* 인기 검색어 */
const PopularGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
`;

const PopularItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 4px;
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;

const PopularRank = styled.span`
  font-size: 14px;
  font-weight: 400;
  color: ${({ $top }) => ($top ? THEME.primary : THEME.muted)};
  min-width: 20px;
  text-align: center;
`;

const PopularText = styled.span`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.text};
`;

/* ── 결과 탭 ── */
const TabRow = styled.div`
  display: flex;
  background: ${THEME.surface};
  border-bottom: 2px solid ${THEME.border};
  padding: 0 12px;
  flex-shrink: 0;
`;

const Tab = styled.div`
  flex: 1;
  text-align: center;
  padding: 12px 0;
  font-size: 14px;
  font-weight: 400;
  color: ${({ $active }) => ($active ? THEME.primary : THEME.muted)};
  border-bottom: 2px solid ${({ $active }) => ($active ? THEME.primary : "transparent")};
  cursor: pointer;
  white-space: nowrap;
  margin-bottom: -2px;
  &:active { opacity: 0.7; }
`;

/* ── 결과 영역 ── */
const ResultsWrap = styled.div`
  padding-bottom: 40px;
`;

const ResultSection = styled.div`
  background: ${THEME.surface};
  margin: 0 12px 8px;
  padding: 20px;
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
`;

const ResultLabel = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.primary};
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${THEME.border};
`;

/* 카테고리 결과 카드 */
const ResultCard = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px 0;
  cursor: pointer;
  &:not(:last-child) { border-bottom: 1px solid ${THEME.border}; }
  &:active { opacity: 0.7; }
`;

const ResultIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: ${THEME.background};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg { width: 36px; height: 36px; }
`;

const ResultInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ResultName = styled.div`
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.text};
`;

const ResultDesc = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 2px;
  line-height: 1.4;
`;

const SubcatRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
`;

const SubcatChip = styled.span`
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 400;
  background: ${({ $highlight }) => ($highlight ? THEME.purpleLight : THEME.background)};
  color: ${({ $highlight }) => ($highlight ? THEME.purple : THEME.textSecondary)};
`;

/* 지역 결과 */
const RegionItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 0;
  cursor: pointer;
  &:not(:last-child) { border-bottom: 1px solid ${THEME.border}; }
  &:active { background: ${THEME.background}; }
`;

const RegionText = styled.span`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.text};
`;

/* 금액 결과 */
const PriceItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  &:not(:last-child) { border-bottom: 1px solid ${THEME.border}; }
`;

const PriceLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const PriceRange = styled.div`
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.text};
`;

const PriceDetail = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const PriceCats = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  text-align: right;
  max-width: 50%;
`;

/* 기타 결과 */
const EtcItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 0;
  cursor: pointer;
  &:not(:last-child) { border-bottom: 1px solid ${THEME.border}; }
  &:active { opacity: 0.7; }
`;

const EtcText = styled.span`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.text};
`;

const EtcCat = styled.span`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.primary};
  padding: 3px 8px;
  background: ${THEME.background};
  border-radius: 20px;
`;

/* 빈 결과 */
const EmptyWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 8px;
`;

const EmptyText = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: ${THEME.text};
`;

const EmptySub = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
`;
