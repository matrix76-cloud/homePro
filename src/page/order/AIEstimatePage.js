/* eslint-disable */
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { CATEGORIES, THEME, SPACE_TYPES } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoSparkles, IoChevronDown, IoChevronUp } from "react-icons/io5";

/* ─── AI 견적 시뮬레이션 데이터 ─── */
const AI_ESTIMATE_DATA = {
  professional_cleaning: { base: 200000, items: [{ name: "기본 청소 비용", price: 150000 }, { name: "자재/소모품", price: 30000 }, { name: "출장비", price: 20000 }], time: "3~5시간", tip: "입주청소는 면적에 따라 가격이 달라집니다. 32평 기준 평균 25~35만원대입니다." },
  plumbing: { base: 120000, items: [{ name: "출장 점검비", price: 30000 }, { name: "작업비", price: 70000 }, { name: "부자재", price: 20000 }], time: "1~3시간", tip: "하수구 막힘은 정도에 따라 가격이 달라집니다. 고압세척 필요 시 추가 비용이 발생할 수 있습니다." },
  appliance_cleaning: { base: 80000, items: [{ name: "에어컨 분해청소 (1대)", price: 60000 }, { name: "항균코팅", price: 20000 }], time: "1~2시간/대", tip: "벽걸이 기준이며, 스탠드/시스템 에어컨은 별도 견적이 필요합니다." },
  home_repair: { base: 80000, items: [{ name: "출장비", price: 20000 }, { name: "작업비", price: 40000 }, { name: "부자재", price: 20000 }], time: "1~2시간", tip: "소규모 수리는 출장비 포함 5~15만원대가 일반적입니다." },
  electrical: { base: 100000, items: [{ name: "출장 점검비", price: 30000 }, { name: "수리 작업비", price: 50000 }, { name: "부자재", price: 20000 }], time: "1~2시간", tip: "전기 고장은 원인에 따라 비용이 달라집니다. 누전 점검은 별도 장비비가 추가될 수 있습니다." },
  mattress_care: { base: 80000, items: [{ name: "매트리스 케어 (1개)", price: 60000 }, { name: "UV살균", price: 20000 }], time: "1~2시간", tip: "킹사이즈 기준이며, 싱글/더블은 할인 가능합니다." },
  aircon_install: { base: 250000, items: [{ name: "설치 공임", price: 150000 }, { name: "배관 작업", price: 70000 }, { name: "부자재", price: 30000 }], time: "2~4시간", tip: "벽걸이 기준이며, 배관 길이에 따라 추가 비용이 발생합니다." },
  appliance_install: { base: 80000, items: [{ name: "설치 공임", price: 50000 }, { name: "부자재", price: 15000 }, { name: "출장비", price: 15000 }], time: "1~2시간", tip: "가전 종류에 따라 공임이 달라집니다." },
  boiler: { base: 150000, items: [{ name: "출장 점검비", price: 30000 }, { name: "수리 작업비", price: 80000 }, { name: "부품비", price: 40000 }], time: "1~3시간", tip: "보일러 고장은 부품 교체 여부에 따라 비용이 크게 달라집니다." },
  worker_call: { base: 150000, items: [{ name: "일당 (1인)", price: 150000 }], time: "8시간 기준", tip: "숙련도와 작업 종류에 따라 일당이 달라집니다. 전문기술자는 20~30만원대입니다." },
  partial_interior: { base: 300000, items: [{ name: "자재비", price: 150000 }, { name: "시공비", price: 120000 }, { name: "철거/정리", price: 30000 }], time: "1~3일", tip: "도배, 장판 등 부분 시공은 면적과 자재에 따라 달라집니다." },
  full_remodel: { base: 3000000, items: [{ name: "설계/디자인", price: 500000 }, { name: "철거 공사", price: 500000 }, { name: "시공비", price: 1500000 }, { name: "자재비", price: 500000 }], time: "2~4주", tip: "25평 기준 종합 리모델링은 2000~5000만원대가 일반적입니다. 현장 실측 후 정확한 견적이 가능합니다." },
  heavy_equipment: { base: 300000, items: [{ name: "장비 대여 (1일)", price: 250000 }, { name: "운반비", price: 50000 }], time: "1일 기준", tip: "스카이차 기준이며, 높이와 작업 시간에 따라 달라집니다." },
  waste: { base: 200000, items: [{ name: "수거비", price: 150000 }, { name: "운반/처리비", price: 50000 }], time: "1~2시간", tip: "폐기물 양과 종류에 따라 가격이 달라집니다. 1톤 트럭 기준입니다." },
  demolition: { base: 500000, items: [{ name: "철거 작업비", price: 350000 }, { name: "폐기물 처리", price: 100000 }, { name: "정리비", price: 50000 }], time: "1~3일", tip: "면적과 철거 범위에 따라 비용이 달라집니다." },
  pest_control: { base: 80000, items: [{ name: "방역 약제비", price: 30000 }, { name: "시공비", price: 30000 }, { name: "출장비", price: 20000 }], time: "1~2시간", tip: "원룸 기준이며, 면적이 넓을수록 비용이 증가합니다." },
  mold: { base: 200000, items: [{ name: "곰팡이 제거", price: 100000 }, { name: "항균코팅", price: 60000 }, { name: "자재비", price: 40000 }], time: "2~4시간", tip: "면적과 곰팡이 정도에 따라 달라집니다. 재발방지 코팅 포함 기준입니다." },
  auto: { base: 50000, items: [{ name: "외부세차", price: 25000 }, { name: "내부세차", price: 25000 }], time: "1~2시간", tip: "SUV는 소형차 대비 1~2만원 추가됩니다. 광택/코팅은 별도입니다." },
  moving: { base: 400000, items: [{ name: "운송비", price: 200000 }, { name: "인건비 (2인)", price: 150000 }, { name: "포장/자재", price: 50000 }], time: "4~8시간", tip: "원룸 기준이며, 짐 양과 이동 거리에 따라 달라집니다." },
  computer: { base: 50000, items: [{ name: "출장 점검비", price: 20000 }, { name: "수리 작업비", price: 30000 }], time: "1~2시간", tip: "부품 교체가 필요한 경우 부품비가 별도 추가됩니다." },
  inspection: { base: 200000, items: [{ name: "점검 수수료", price: 150000 }, { name: "보고서 작성", price: 50000 }], time: "2~3시간", tip: "아파트 사전점검 기준이며, 면적에 따라 달라집니다." },
  supplies: { base: 100000, items: [{ name: "자재비", price: 80000 }, { name: "배송비", price: 20000 }], time: "당일~익일", tip: "품목과 수량에 따라 가격이 달라집니다." },
  training: { base: 300000, items: [{ name: "교육비 (1일)", price: 250000 }, { name: "교재/자재", price: 50000 }], time: "1일 기준", tip: "교육 분야와 기간에 따라 달라집니다." },
  electrical_work: { base: 300000, items: [{ name: "공사비", price: 200000 }, { name: "자재비", price: 70000 }, { name: "출장비", price: 30000 }], time: "1~2일", tip: "증설 개소 수에 따라 달라집니다." },
  realestate: { base: 0, items: [{ name: "중개수수료 (법정요율)", price: 0 }], time: "-", tip: "중개수수료는 거래 금액에 따라 법정요율이 적용됩니다." },
  insurance: { base: 0, items: [{ name: "보험료 (상담 후 결정)", price: 0 }], time: "-", tip: "업종, 인원, 매출 규모에 따라 보험료가 산정됩니다." },
  fortune: { base: 50000, items: [{ name: "상담료", price: 50000 }], time: "30분~1시간", tip: "사주, 작명 등 상담 종류에 따라 달라집니다." },
};

const DEFAULT_ESTIMATE = { base: 100000, items: [{ name: "기본 작업비", price: 70000 }, { name: "출장비", price: 30000 }], time: "1~2시간", tip: "상세 내용에 따라 견적이 달라질 수 있습니다." };

const AIEstimatePage = () => {
  const navigate = useNavigate();
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedSubs, setSelectedSubs] = useState([]);
  const [spaceType, setSpaceType] = useState("");
  const [description, setDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [showDetail, setShowDetail] = useState(true);

  const category = useMemo(() => CATEGORIES.find((c) => c.id === selectedCat), [selectedCat]);
  const hasSubcategories = category?.subcategories?.length > 0;

  const toggleSub = (sub) => {
    setSelectedSubs((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const handleAnalyze = () => {
    if (!selectedCat) return;
    setAnalyzing(true);
    setResult(null);
    // AI 분석 시뮬레이션 (1.5초)
    setTimeout(() => {
      const data = AI_ESTIMATE_DATA[selectedCat] || DEFAULT_ESTIMATE;
      setResult(data);
      setAnalyzing(false);
    }, 1500);
  };

  const handleRealEstimate = () => {
    navigate("/order/create", { state: { fromAI: true, categoryId: selectedCat, subcategories: selectedSubs, spaceType, description, aiEstimate: result } });
  };

  const formatPrice = (n) => n === 0 ? "상담 후 결정" : n.toLocaleString() + "원";

  return (
    <SimpleBackLayout NAME="AI 견적" hideFooter>
      <PageWrap>
        {/* 헤더 */}
        <HeaderCard>
          <AIIconWrap>
            <IoSparkles size={28} color="#fff" />
          </AIIconWrap>
          <HeaderTitle>AI 견적 분석</HeaderTitle>
          <HeaderDesc>카테고리와 작업 내용을 알려주시면{"\n"}AI가 예상 견적을 분석해드려요</HeaderDesc>
        </HeaderCard>

        {/* 카테고리 선택 */}
        <Section>
          <Label>카테고리 선택</Label>
          <CatGrid>
            {CATEGORIES.map((cat) => (
              <CatChip
                key={cat.id}
                $active={selectedCat === cat.id}
                onClick={() => { setSelectedCat(cat.id); setSelectedSubs([]); setSpaceType(""); setResult(null); }}
              >
                <span>{cat.icon}</span> {cat.shortName}
              </CatChip>
            ))}
          </CatGrid>
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

        {/* 결과 */}
        {result && (
          <>
            <ResultCard>
              <ResultHeader>
                <ResultIcon><IoSparkles size={20} color={THEME.primary} /></ResultIcon>
                <ResultHeaderText>
                  <ResultTitle>AI 예상 견적</ResultTitle>
                  <ResultCat>{category?.icon} {category?.name}</ResultCat>
                </ResultHeaderText>
              </ResultHeader>

              <TotalRow>
                <TotalLabel>예상 총 비용</TotalLabel>
                <TotalPrice>{formatPrice(result.base)}</TotalPrice>
              </TotalRow>

              <DetailToggle onClick={() => setShowDetail(!showDetail)}>
                상세 내역 {showDetail ? <IoChevronUp size={16} /> : <IoChevronDown size={16} />}
              </DetailToggle>

              {showDetail && (
                <DetailList>
                  {result.items.map((item, i) => (
                    <DetailRow key={i}>
                      <DetailName>{item.name}</DetailName>
                      <DetailPrice>{formatPrice(item.price)}</DetailPrice>
                    </DetailRow>
                  ))}
                </DetailList>
              )}

              <InfoRow>
                <InfoLabel>예상 소요시간</InfoLabel>
                <InfoValue>{result.time}</InfoValue>
              </InfoRow>

              <TipBox>
                <TipIcon>💡</TipIcon>
                <TipText>{result.tip}</TipText>
              </TipBox>

              <Disclaimer>
                * AI 예상 견적은 참고용이며, 실제 비용은 현장 상황에 따라 달라질 수 있습니다.
              </Disclaimer>
            </ResultCard>

            {/* 실제 견적 넣기 버튼 */}
            <RealEstimateBtn onClick={handleRealEstimate}>
              실제 견적 넣기
            </RealEstimateBtn>

            {/* 다시 분석 */}
            <RetryBtn onClick={() => { setResult(null); }}>
              다른 조건으로 다시 분석
            </RetryBtn>
          </>
        )}
      </PageWrap>
    </SimpleBackLayout>
  );
};

export default AIEstimatePage;

/* ===================== styles ===================== */

const PageWrap = styled.div`
  padding: 0 0 40px;
  display: flex;
  flex-direction: column;
`;

const HeaderCard = styled.div`
  background: linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark});
  padding: 28px 20px;
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
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.03em;
`;

const HeaderDesc = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: rgba(255,255,255,0.8);
  margin-top: 8px;
  line-height: 1.5;
  white-space: pre-line;
`;

const Section = styled.div`
  padding: 20px 16px 0;
`;

const Label = styled.div`
  font-size: 16px;
  font-weight: 800;
  color: ${THEME.text};
  margin-bottom: 12px;
  letter-spacing: -0.02em;
`;

const CatGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const CatChip = styled.button`
  padding: 8px 14px;
  border-radius: 6px;
  border: 1.5px solid ${({ $active }) => $active ? THEME.primary : THEME.border};
  background: ${({ $active }) => $active ? THEME.primary : THEME.surface};
  color: ${({ $active }) => $active ? "#fff" : THEME.text};
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  &:active { opacity: 0.8; }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 14px 16px;
  border: 1.5px solid ${THEME.border};
  border-radius: 12px;
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
  margin: 20px 16px 0;
  padding: 16px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, ${THEME.primary}, ${THEME.purple});
  color: #fff;
  font-size: 16px;
  font-weight: 700;
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
  margin: 20px 16px 0;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  box-shadow: ${THEME.cardShadow};
  border: 1px solid ${THEME.border};
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
  font-weight: 800;
  color: ${THEME.text};
`;

const ResultCat = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.muted};
  margin-top: 2px;
`;

const TotalRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: linear-gradient(135deg, ${THEME.primary}10, ${THEME.purple}10);
  border-radius: 12px;
  margin-bottom: 16px;
`;

const TotalLabel = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
`;

const TotalPrice = styled.div`
  font-size: 22px;
  font-weight: 800;
  color: ${THEME.primary};
`;

const DetailToggle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
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
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
`;

const DetailName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${THEME.textSecondary};
`;

const DetailPrice = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${THEME.text};
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
  font-weight: 500;
  color: ${THEME.muted};
`;

const InfoValue = styled.div`
  font-size: 14px;
  font-weight: 700;
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
  font-weight: 500;
  color: #92400E;
  line-height: 1.5;
`;

const Disclaimer = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${THEME.muted};
  margin-top: 12px;
  text-align: center;
  line-height: 1.4;
`;

const RealEstimateBtn = styled.button`
  margin: 16px 16px 0;
  padding: 16px;
  border: none;
  border-radius: 14px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.9; }
`;

const RetryBtn = styled.button`
  margin: 8px 16px 0;
  padding: 14px;
  border: 1.5px solid ${THEME.border};
  border-radius: 14px;
  background: ${THEME.surface};
  color: ${THEME.textSecondary};
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;
