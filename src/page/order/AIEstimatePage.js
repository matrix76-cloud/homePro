/* eslint-disable */
import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { CATEGORIES, CATEGORY_GROUPS, THEME, SPACE_TYPES } from "../../config/homeproConfig";
import { CATEGORY_ICONS } from "../../utility/CategoryIcons";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoSparkles, IoChevronDown, IoChevronUp } from "react-icons/io5";
import { getAiEstimate } from "../../service/AiEstimateService";

/* 탭 내장용 콘텐츠 컴포넌트 */
export const AIEstimateContent = () => {
  const navigate = useNavigate();
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedSubs, setSelectedSubs] = useState([]);
  const [spaceType, setSpaceType] = useState("");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [showDetail, setShowDetail] = useState(true);
  const [showReasoning, setShowReasoning] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); }, []);

  const category = useMemo(() => CATEGORIES.find((c) => c.id === selectedCat), [selectedCat]);
  const hasSubcategories = category?.subcategories?.length > 0;

  const toggleSub = (sub) => {
    setSelectedSubs((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const handleAnalyze = async () => {
    if (!selectedCat) return;
    setAnalyzing(true);
    setResult(null);
    try {
      const data = await getAiEstimate({
        categoryName: category?.name || "",
        subcategories: selectedSubs,
        spaceType,
        area,
        description,
      });
      setResult(data);
    } catch (e) {
      console.error("AI 분석 실패:", e);
      showToast("분석에 실패했습니다. 다시 시도해주세요");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRealEstimate = () => {
    navigate("/order/create", { state: { fromAI: true, categoryId: selectedCat, subcategories: selectedSubs, spaceType, description, aiEstimate: result } });
  };

  const formatPrice = (n) => !n || n === 0 ? "상담 후 결정" : n.toLocaleString() + "원";

  return (
    <PageWrap>
        {/* 카테고리 선택 */}
        <Section>
          <Label>카테고리 선택</Label>
          {CATEGORY_GROUPS.map((group) => (
            <div key={group.id}>
              <CatGroupLabel>{group.label}</CatGroupLabel>
              <CatGrid>
                {CATEGORIES.filter((c) => c.group === group.id).map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.id];
                  return (
                    <CatChip
                      key={cat.id}
                      $active={selectedCat === cat.id}
                      onClick={() => { setSelectedCat(cat.id); setSelectedSubs([]); setSpaceType(""); setResult(null); }}
                    >
                      <CatChipIcon>{Icon ? <Icon /> : null}</CatChipIcon>
                      {cat.shortName}
                    </CatChip>
                  );
                })}
              </CatGrid>
            </div>
          ))}
        </Section>

        {/* 세부 항목 선택 */}
        {selectedCat && hasSubcategories && (
          <Section>
            <Label>세부 항목 선택</Label>
            <CatGrid>
              {category.subcategories.map((sub) => (
                <CatChip
                  key={sub}
                  $active={selectedSubs.includes(sub)}
                  onClick={() => toggleSub(sub)}
                >
                  {sub}
                </CatChip>
              ))}
            </CatGrid>
          </Section>
        )}

        {/* 공간유형 */}
        {selectedCat && (
          <Section>
            <Label>공간유형</Label>
            <CatGrid>
              {SPACE_TYPES.map((type) => (
                <CatChip
                  key={type}
                  $active={spaceType === type}
                  onClick={() => setSpaceType(spaceType === type ? "" : type)}
                >
                  {type}
                </CatChip>
              ))}
            </CatGrid>
          </Section>
        )}

        {/* 면적 */}
        {selectedCat && (
          <Section>
            <Label>면적 (선택)</Label>
            <AreaInput
              placeholder="예: 30평, 100m²"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </Section>
        )}

        {/* 작업 설명 */}
        {selectedCat && (
          <Section>
            <Label>작업 내용 (선택)</Label>
            <TextArea
              placeholder={`예: ${category?.subcategories?.[0] || "작업"} 요청합니다.\n면적, 수량, 특이사항 등을 입력하면 더 정확한 견적을 받을 수 있어요.`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </Section>
        )}

        {/* 분석 버튼 */}
        {selectedCat && !result && (
          <AnalyzeBtn onClick={handleAnalyze} disabled={analyzing}>
            {analyzing ? (
              <>
                <Spinner />
                AI 분석 중...
              </>
            ) : (
              <>
                <IoSparkles size={18} />
                AI 견적 분석하기
              </>
            )}
          </AnalyzeBtn>
        )}

        {/* 결과 — success */}
        {result?.status === "success" && result.estimate && (
          <>
            <ResultCard>
              <ResultHeader>
                <ResultIcon><IoSparkles size={20} color={THEME.primary} /></ResultIcon>
                <ResultHeaderText>
                  <ResultTitle>AI 예상 견적</ResultTitle>
                  <ResultCat>{category?.name}</ResultCat>
                </ResultHeaderText>
              </ResultHeader>

              <TotalRow>
                <TotalLabel>예상 비용<br/>범위</TotalLabel>
                <TotalPriceCol>
                  <TotalPrice>{formatPrice(result.estimate.minPrice)}</TotalPrice>
                  <TotalTilde>~</TotalTilde>
                  <TotalPrice>{formatPrice(result.estimate.maxPrice)}</TotalPrice>
                </TotalPriceCol>
              </TotalRow>

              <DetailToggle onClick={() => setShowDetail(!showDetail)}>
                항목별 내역 {showDetail ? <IoChevronUp size={16} /> : <IoChevronDown size={16} />}
              </DetailToggle>

              {showDetail && result.estimate.items?.length > 0 && (
                <DetailList>
                  {result.estimate.items.map((item, i) => (
                    <DetailRow key={i}>
                      <DetailLeft>
                        <DetailName>{item.name}</DetailName>
                        {item.note && <DetailNote>{item.note}</DetailNote>}
                      </DetailLeft>
                      <DetailPrice>{formatPrice(item.price)}</DetailPrice>
                    </DetailRow>
                  ))}
                </DetailList>
              )}

              {result.estimate.timeEstimate && (
                <InfoRow>
                  <InfoLabel>예상 소요시간</InfoLabel>
                  <InfoValue>{result.estimate.timeEstimate}</InfoValue>
                </InfoRow>
              )}

              {result.estimate.tip && (
                <TipBox>
                  <TipIcon>Tip</TipIcon>
                  <TipText>{result.estimate.tip}</TipText>
                </TipBox>
              )}

              {result.reasoning && (
                <>
                  <DetailToggle onClick={() => setShowReasoning(!showReasoning)} style={{ marginTop: 8 }}>
                    산출 근거 {showReasoning ? <IoChevronUp size={16} /> : <IoChevronDown size={16} />}
                  </DetailToggle>
                  {showReasoning && <ReasoningBox>{result.reasoning}</ReasoningBox>}
                </>
              )}

              <Disclaimer>* AI 예상 견적은 참고용이며, 실제 비용은 현장 상황에 따라 달라질 수 있습니다.</Disclaimer>
            </ResultCard>

            <RealEstimateBtn onClick={handleRealEstimate}>실제 견적 요청하기</RealEstimateBtn>
            <RetryBtn onClick={() => setResult(null)}>다른 조건으로 다시 분석</RetryBtn>
          </>
        )}

        {/* 결과 — need_info */}
        {result?.status === "need_info" && (
          <>
            <ResultCard>
              <ResultHeader>
                <ResultIcon><IoSparkles size={20} color={THEME.primary} /></ResultIcon>
                <ResultHeaderText>
                  <ResultTitle>추가 정보가 필요해요</ResultTitle>
                  <ResultCat>{category?.name}</ResultCat>
                </ResultHeaderText>
              </ResultHeader>

              {result.questions?.length > 0 && (
                <QuestionList>
                  {result.questions.map((q, i) => (
                    <QuestionItem key={i}>• {q}</QuestionItem>
                  ))}
                </QuestionList>
              )}

              {result.partialEstimate && (
                <>
                  <TotalRow style={{ marginTop: 16 }}>
                    <TotalLabel>대략적 범위</TotalLabel>
                    <TotalPrice style={{ fontSize: 18 }}>
                      {formatPrice(result.partialEstimate.minPrice)} ~ {formatPrice(result.partialEstimate.maxPrice)}
                    </TotalPrice>
                  </TotalRow>
                  {result.partialEstimate.note && (
                    <Disclaimer style={{ marginTop: 8 }}>{result.partialEstimate.note}</Disclaimer>
                  )}
                </>
              )}
            </ResultCard>

            <RetryBtn onClick={() => setResult(null)}>정보 추가 후 다시 분석</RetryBtn>
          </>
        )}

        {toast && <AIToast>{toast}</AIToast>}
    </PageWrap>
  );
};

const AIEstimatePage = () => (
  <SimpleBackLayout NAME="AI 견적 분석" hideFooter>
    <AIEstimateContent />
  </SimpleBackLayout>
);

export default AIEstimatePage;

/* ===================== styles ===================== */

const PageWrap = styled.div`
  padding: 12px 12px 40px;
  display: flex;
  flex-direction: column;
`;

const HeaderCard = styled.div`
  background: linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark});
  padding: 28px 20px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const AIIconWrap = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
`;

const HeaderTitle = styled.div`
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.03em;
`;

const HeaderDesc = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: rgba(255,255,255,0.8);
  margin-top: 8px;
  line-height: 1.5;
  white-space: pre-line;
`;

const Section = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  margin-top: 12px;
  box-shadow: ${THEME.cardShadow};
`;

const Label = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 12px;
  letter-spacing: -0.02em;
`;

const CatGroupLabel = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.textSecondary};
  background: ${THEME.background};
  padding: 8px 10px;
  border-radius: 8px;
  margin: 14px 0 8px;
`;

const CatGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const CatChip = styled.button`
  padding: 8px 14px;
  border-radius: 20px;
  border: ${({ $active }) => $active ? "none" : `1.5px solid ${THEME.border}`};
  background: ${({ $active }) => $active ? THEME.primary : THEME.surface};
  color: ${({ $active }) => $active ? "#fff" : THEME.text};
  font-size: 13px;
  font-weight: 400;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  &:active { opacity: 0.8; }
`;

const CatChipIcon = styled.span`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg { width: 24px; height: 24px; }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 14px 16px;
  border: 1.5px solid ${THEME.border};
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  color: ${THEME.text};
  background: ${THEME.surface};
  outline: none;
  resize: none;
  box-sizing: border-box;
  line-height: 1.5;
  &:focus { border-color: ${THEME.primary}; }
  &::placeholder { color: ${THEME.muted}; }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  width: 18px;
  height: 18px;
  border: 2.5px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;

const AnalyzeBtn = styled.button`
  margin: 20px 0 0;
  padding: 16px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, ${THEME.primary}, ${THEME.purple});
  color: #fff;
  font-size: 16px;
  font-weight: 400;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  &:active { opacity: 0.9; }
  &:disabled { opacity: 0.7; cursor: default; }
`;

const ResultCard = styled.div`
  margin: 20px 0 0;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  box-shadow: ${THEME.cardShadow};
`;

const ResultHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
`;

const ResultIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: ${THEME.purpleLight};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const ResultHeaderText = styled.div``;

const ResultTitle = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
`;

const ResultCat = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 2px;
`;

const TotalRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: linear-gradient(135deg, ${THEME.primary}10, ${THEME.purple}10);
  border-radius: 12px;
  margin-bottom: 16px;
`;

const TotalLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.textSecondary};
  line-height: 1.4;
  flex-shrink: 0;
`;

const TotalPriceCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
`;

const TotalPrice = styled.div`
  font-size: 22px;
  font-weight: 700;
  color: ${THEME.primary};
`;

const TotalTilde = styled.div`
  font-size: 14px;
  color: ${THEME.muted};
  text-align: right;
`;

const DetailToggle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
  cursor: pointer;
  padding: 8px 0;
  &:active { opacity: 0.6; }
`;

const DetailList = styled.div`
  border-top: 1px solid ${THEME.border};
  padding-top: 12px;
  margin-bottom: 12px;
`;

const DetailRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px solid ${THEME.border};
  &:last-child { border-bottom: none; }
`;

const DetailLeft = styled.div`
  flex: 1;
  min-width: 0;
`;

const DetailName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.text};
`;

const DetailPrice = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.primary};
  flex-shrink: 0;
  text-align: right;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-top: 1px solid ${THEME.border};
`;

const InfoLabel = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const InfoValue = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.text};
`;

const TipBox = styled.div`
  display: flex;
  gap: 8px;
  padding: 14px;
  background: #FFF7ED;
  border-radius: 12px;
  margin-top: 12px;
`;

const TipIcon = styled.div`
  font-size: 16px;
  flex-shrink: 0;
`;

const TipText = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: #92400E;
  line-height: 1.5;
`;

const Disclaimer = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 12px;
  text-align: center;
  line-height: 1.4;
`;

const RealEstimateBtn = styled.button`
  margin: 16px 0 0;
  padding: 16px;
  border: none;
  border-radius: 10px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 16px;
  font-weight: 400;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.9; }
`;

const AreaInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid ${THEME.border};
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  color: ${THEME.text};
  outline: none;
  box-sizing: border-box;
  &:focus { border-color: ${THEME.primary}; }
  &::placeholder { color: ${THEME.muted}; }
`;

const DetailNote = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 4px;
  line-height: 1.4;
`;

const ReasoningBox = styled.div`
  padding: 14px;
  background: ${THEME.background};
  border-radius: 10px;
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  line-height: 1.6;
  white-space: pre-line;
  margin-top: 4px;
`;

const QuestionList = styled.div`
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const QuestionItem = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.text};
  line-height: 1.5;
  padding: 10px 14px;
  background: ${THEME.background};
  border-radius: 10px;
`;

const toastAnim = keyframes`
  from { transform: translate(-50%, 10px); opacity: 0; }
  to { transform: translate(-50%, 0); opacity: 1; }
`;

const AIToast = styled.div`
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: #333;
  color: #fff;
  font-size: 14px;
  font-weight: 400;
  border-radius: 10px;
  z-index: 9999;
  white-space: nowrap;
  animation: ${toastAnim} 0.25s ease-out;
`;

const RetryBtn = styled.button`
  margin: 8px 0 0;
  padding: 14px;
  border: 1.5px solid ${THEME.border};
  border-radius: 10px;
  background: ${THEME.surface};
  color: ${THEME.textSecondary};
  font-size: 15px;
  font-weight: 400;
  font-family: inherit;
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;
