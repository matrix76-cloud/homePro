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
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [toast, setToast] = useState("");
  // 한 화면에 칸을 다 펼치지 않고 단계로 넘어간다 (대표 9/17)
  //  1 카테고리 · 2 세부 항목 · 3 공간과 면적 · 4 자세히(선택)
  //  세부 항목이 없는 카테고리는 2를 건너뛴다
  const [step, setStep] = useState(1);

  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); }, []);

  const category = useMemo(() => CATEGORIES.find((c) => c.id === selectedCat), [selectedCat]);
  const hasSubcategories = category?.subcategories?.length > 0;

  // 실제로 지나가는 단계만 (대표 9/17 — 세부 항목은 별도 화면)
  const flow = useMemo(() => (hasSubcategories ? [1, 2, 3, 4] : [1, 3, 4]), [hasSubcategories]);
  const stepIdx = Math.max(0, flow.indexOf(step));
  const goNext = () => setStep(flow[Math.min(stepIdx + 1, flow.length - 1)]);

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
        {/* 진행 막대는 빼기로 함 (형 9/17) */}

        {/* 지난 단계는 접어 고른 값만 한 줄로 (대표 9/17) */}
        {selectedCat && step >= 2 && (
          <DoneRow onClick={() => setStep(1)}>
            <DoneText>
              {CATEGORIES.find((c) => c.id === selectedCat)?.name}
              {step >= 3 && selectedSubs.length > 0 ? " · " + selectedSubs.join(", ") : ""}
              {step >= 4 && spaceType ? " · " + spaceType : ""}
              {step >= 4 && area ? " · " + area : ""}
            </DoneText>
            <DoneEdit>수정</DoneEdit>
          </DoneRow>
        )}

        {/* 카테고리 선택 — 세 칸 그리드 (대표 9/17 시안 2번) */}
        {step < 2 && !result && (
        <Section>
          <Label>카테고리 선택</Label>
          <CatCellGrid>
            {CATEGORIES.filter((cat) => !cat.proOnly).map((cat) => (
              <CatCell
                key={cat.id}
                type="button"
                $active={selectedCat === cat.id}
                onClick={() => {
                  const sub = cat.subcategories?.length > 0;
                  if (selectedCat !== cat.id) { setSelectedCat(cat.id); setSelectedSubs([]); setSpaceType(""); setResult(null); }
                  setStep(sub ? 2 : 3);
                }}
              >
                {cat.name}
              </CatCell>
            ))}
          </CatCellGrid>
        </Section>
        )}

        {/* 세부 항목 선택 */}
        {selectedCat && step === 2 && hasSubcategories && !result && (
          <Section>
            <Label>세부 항목 선택</Label>
            <SubHint>해당하는 항목을 모두 골라 주세요. 여러 개 고를 수 있습니다.</SubHint>
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
        {selectedCat && step === 3 && !result && (
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
        {selectedCat && step === 3 && !result && (
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
        {selectedCat && step >= 4 && !result && (
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

        {/* 다음 단계로 (대표 9/17) */}
        {selectedCat && !result && step >= 2 && step < 4 && (
          <StepRow>
            <StepHint>
              {step === 2 ? "고르지 않고 넘어가도 견적은 나옵니다." : "공간과 면적을 넣으면 금액이 더 정확해집니다."}
            </StepHint>
            <StepBtnRow>
              {step === 3 && (
                <StepGhostBtn type="button" onClick={handleAnalyze} disabled={analyzing}>
                  이대로 견적 받기
                </StepGhostBtn>
              )}
              <StepNextBtn type="button" onClick={goNext}>
                다음
              </StepNextBtn>
            </StepBtnRow>
          </StepRow>
        )}

        {/* 분석 버튼 */}
        {selectedCat && !result && step >= 4 && (
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

              {result.reasoning && (
                <WhyBox>
                  <WhyTitle>이렇게 계산했습니다</WhyTitle>
                  <WhyText>{result.reasoning}</WhyText>
                </WhyBox>
              )}

              {result.estimate.priceFactors?.length > 0 && (
                <FactorBox>
                  <FactorTitle>이럴 때 금액이 달라집니다</FactorTitle>
                  {result.estimate.priceFactors.map((f, i) => (
                    <FactorItem key={i}>{f}</FactorItem>
                  ))}
                </FactorBox>
              )}

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

              <Disclaimer>실제 금액은 현장을 확인한 뒤 달라질 수 있습니다. 부가세는 별도입니다.</Disclaimer>
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
                    <TotalPrice style={{ fontSize: 20 }}>
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
  background: linear-gradient(135deg, ${THEME.button}, ${THEME.buttonDark});
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
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.03em;
`;

const HeaderDesc = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: rgba(255,255,255,0.8);
  margin-top: 8px;
  line-height: 1.5;
  white-space: pre-line;
`;

const Section = styled.div`
  padding: 4px 4px 0;
  margin-top: 14px;
`;

const CatCellGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
`;

const CatCell = styled.button`
  min-height: 62px;
  padding: 14px 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  word-break: keep-all;
  line-height: 1.35;
  border-radius: 10px;
  border: 1px solid ${({ $active }) => $active ? THEME.primary : THEME.border};
  background: ${({ $active }) => $active ? `${THEME.primary}15` : THEME.surface};
  color: ${({ $active }) => $active ? THEME.primary : THEME.text};
  font-size: 15px;
  font-weight: ${({ $active }) => $active ? 700 : 500};
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.8; }
  &:focus { outline: none; }
`;

const Label = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 12px;
  letter-spacing: -0.02em;
`;

const SubHint = styled.div`
  font-size: 14px;
  color: #2b2f36;
  line-height: 1.6;
  margin: -6px 0 12px;
`;

const CatGroupLabel = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.textSecondary};
  background: ${THEME.background};
  padding: 8px 10px;
  border-radius: 8px;
  margin: 14px 0 8px;
`;

const CatAccordion = styled.div`
  margin-bottom: 4px;
`;

const CatAccordionHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 14px;
  background: ${({ $active }) => $active ? `${THEME.primary}10` : THEME.background};
  border-radius: 8px;
  cursor: pointer;
  &:active { opacity: 0.8; }
`;

const CatAccordionLabel = styled.div`
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: ${THEME.text};
`;

const CatAccordionSelected = styled.span`
  font-size: 14px;
  color: ${THEME.primary};
  margin-right: 8px;
`;

const CatAccordionArrow = styled.span`
  font-size: 13px;
  color: ${THEME.muted};
`;

const CatGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 10px 0 2px;
`;

const CatChip = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 6px;
  min-height: 52px;
  padding: 13px 14px;
  white-space: normal;
  word-break: keep-all;
  line-height: 1.35;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? THEME.primary : THEME.border};
  background: ${({ $active }) => $active ? `${THEME.primary}15` : THEME.surface};
  color: ${({ $active }) => $active ? THEME.primary : THEME.text};
  font-size: 15px;
  font-weight: ${({ $active }) => $active ? 700 : 500};
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.8; }
  &:focus { outline: none; }
`;

const CatChipIcon = styled.span`
  width: 54px;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg { width: 54px; height: 54px; }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 14px 16px;
  border: 1.5px solid ${THEME.border};
  border-radius: 10px;
  font-size: 16px;
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

/* 단계 진행 (대표 9/17) */
/* 지난 단계 요약 줄 (대표 9/17) */
const DoneRow = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: calc(100% - 8px);
  margin: 14px 4px 6px;
  padding: 13px 14px;
  background: ${THEME.surface};
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
`;

const DoneText = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const DoneEdit = styled.span`
  flex-shrink: 0;
  font-size: 14px;
  color: ${THEME.primaryDark};
`;

const StepRow = styled.div`
  margin: 8px 4px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const StepHint = styled.div`
  font-size: 14px;
  color: #2b2f36;
  line-height: 1.6;
`;

const StepBtnRow = styled.div`
  display: flex;
  gap: 8px;
`;

const StepNextBtn = styled.button`
  flex: 1.4;
  height: 52px;
  border: none;
  border-radius: 10px;
  background: ${THEME.button};
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
`;

const StepGhostBtn = styled.button`
  flex: 1;
  height: 52px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  background: ${THEME.surface};
  color: ${THEME.text};
  font-size: 15px;
  font-family: inherit;
  cursor: pointer;
  &:disabled { opacity: 0.5; }
`;

const AnalyzeBtn = styled.button`
  margin: 20px 4px 0;
  padding: 16px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, ${THEME.button}, ${THEME.purple});
  color: #fff;
  font-size: 18px;
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
  font-size: 19px;
  font-weight: 700;
  color: ${THEME.text};
`;

const ResultCat = styled.div`
  font-size: 15px;
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
  font-size: 16px;
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
  font-size: 24px;
  font-weight: 700;
  color: ${THEME.primary};
`;

const TotalTilde = styled.div`
  font-size: 16px;
  color: ${THEME.muted};
  text-align: right;
`;

const DetailToggle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 16px;
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
  font-size: 16px;
  font-weight: 600;
  color: ${THEME.text};
`;

const DetailPrice = styled.div`
  font-size: 17px;
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
  font-size: 16px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const InfoValue = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: ${THEME.text};
`;

const WhyBox = styled.div`
  margin-top: 14px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid ${THEME.primary};
  background: ${THEME.primary}12;
`;

const WhyTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.primaryDark};
  margin-bottom: 6px;
`;

const WhyText = styled.div`
  font-size: 15px;
  color: #2b2f36;
  line-height: 1.65;
  word-break: keep-all;
`;

const FactorBox = styled.div`
  margin-top: 10px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid ${THEME.border};
  background: ${THEME.surface};
`;

const FactorTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 6px;
`;

const FactorItem = styled.div`
  font-size: 15px;
  color: #2b2f36;
  line-height: 1.65;
  word-break: keep-all;
  padding-left: 12px;
  position: relative;
  &::before { content: "·"; position: absolute; left: 2px; }
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
  font-size: 18px;
  flex-shrink: 0;
`;

const TipText = styled.div`
  font-size: 15px;
  font-weight: 400;
  color: #92400E;
  line-height: 1.5;
`;

const Disclaimer = styled.div`
  font-size: 14px;
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
  background: ${THEME.button};
  color: #fff;
  font-size: 18px;
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
  font-size: 16px;
  font-family: inherit;
  color: ${THEME.text};
  outline: none;
  box-sizing: border-box;
  &:focus { border-color: ${THEME.primary}; }
  &::placeholder { color: ${THEME.muted}; }
`;

const DetailNote = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 4px;
  line-height: 1.4;
`;

const ReasoningBox = styled.div`
  padding: 14px;
  background: ${THEME.background};
  border-radius: 10px;
  font-size: 15px;
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
  font-size: 16px;
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
  font-size: 16px;
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
  font-size: 17px;
  font-weight: 400;
  font-family: inherit;
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;
