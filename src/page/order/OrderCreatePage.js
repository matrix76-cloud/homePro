/* eslint-disable */
import React, { useState, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { UserContext } from "../../context/User";
import {
  CATEGORIES,
  THEME,
  COMMISSION_TYPES,
  COMMISSION_PRESETS,
  MATCH_TYPES,
  SCHEDULE_OPTIONS,
  SPACE_TYPES,
} from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";

const Section = styled.div`
  background: #fff;
  margin-top: 12px;
  padding: 20px;
`;

const Label = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.text};
  margin-bottom: 12px;
`;

const SubLabel = styled.div`
  font-size: 13px;
  color: ${THEME.muted};
  margin-bottom: 8px;
`;

const ChipGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Chip = styled.button`
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid ${({ $selected }) => ($selected ? THEME.primary : THEME.border)};
  background: ${({ $selected }) => ($selected ? THEME.primary : "#fff")};
  color: ${({ $selected }) => ($selected ? "#fff" : THEME.text)};
  font-weight: ${({ $selected }) => ($selected ? 600 : 400)};
  &:active {
    opacity: 0.8;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  &:focus {
    border-color: ${THEME.primary};
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  &:focus {
    border-color: ${THEME.primary};
  }
`;

const RadioGroup = styled.div`
  display: flex;
  gap: 12px;
`;

const RadioButton = styled.button`
  flex: 1;
  padding: 14px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  border: 2px solid ${({ $selected }) => ($selected ? THEME.primary : THEME.border)};
  background: ${({ $selected }) => ($selected ? `${THEME.primary}10` : "#fff")};
  color: ${({ $selected }) => ($selected ? THEME.primary : THEME.text)};
`;

const CheckRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 14px;
  color: ${THEME.text};
  cursor: pointer;
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 16px;
  margin-top: 12px;
  background: ${THEME.primary};
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  &:active {
    background: ${THEME.primaryDark};
  }
  &:disabled {
    background: #ccc;
  }
`;

const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
`;

const PhotoBox = styled.div`
  aspect-ratio: 1;
  border: 1px dashed ${THEME.border};
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: ${THEME.muted};
  cursor: pointer;
  background: #fff;
`;

const OrderCreatePage = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const { user } = useContext(UserContext);

  const [selectedCategory, setSelectedCategory] = useState(categoryId || "");
  const [selectedSub, setSelectedSub] = useState([]);
  const [detail, setDetail] = useState("");
  const [callFirst, setCallFirst] = useState(false);
  const [schedule, setSchedule] = useState("");
  const [address, setAddress] = useState("");
  const [contactType, setContactType] = useState("self");
  const [customerPhone, setCustomerPhone] = useState("");
  const [priceType, setPriceType] = useState("");
  const [directPrice, setDirectPrice] = useState("");
  const [commissionType, setCommissionType] = useState(COMMISSION_TYPES.NONE);
  const [commissionAmount, setCommissionAmount] = useState("");
  const [matchType, setMatchType] = useState(MATCH_TYPES.PRIORITY);
  const [spaceType, setSpaceType] = useState("");

  const category = CATEGORIES.find((c) => c.id === selectedCategory);

  const handleSubToggle = (sub) => {
    setSelectedSub((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const handleSubmit = () => {
    // TODO: Firestore에 오더 저장
    alert("오더가 등록되었습니다! (Firestore 연동 후 실제 저장)");
    navigate("/MobileMain");
  };

  return (
    <SimpleBackLayout NAME="견적서 요청">
      {/* 1. 카테고리 선택 */}
      {!categoryId && (
        <Section>
          <Label>카테고리 선택</Label>
          <ChipGrid>
            {CATEGORIES.map((cat) => (
              <Chip
                key={cat.id}
                $selected={selectedCategory === cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedSub([]);
                }}
              >
                {cat.icon} {cat.name}
              </Chip>
            ))}
          </ChipGrid>
        </Section>
      )}

      {/* 카테고리 정보 표시 */}
      {category && (
        <>
          {categoryId && (
            <Section>
              <Label>{category.icon} {category.name}</Label>
              <SubLabel>{category.description}</SubLabel>
            </Section>
          )}

          {/* 2. 세부 항목 */}
          {category.subcategories && (
            <Section>
              <Label>세부 항목 선택</Label>
              <ChipGrid>
                {category.subcategories.map((sub) => (
                  <Chip
                    key={sub}
                    $selected={selectedSub.includes(sub)}
                    onClick={() => handleSubToggle(sub)}
                  >
                    {sub}
                  </Chip>
                ))}
              </ChipGrid>
            </Section>
          )}

          {/* 3. 공간유형 */}
          <Section>
            <Label>공간유형</Label>
            <ChipGrid>
              {SPACE_TYPES.map((type) => (
                <Chip
                  key={type}
                  $selected={spaceType === type}
                  onClick={() => setSpaceType(type)}
                >
                  {type}
                </Chip>
              ))}
            </ChipGrid>
          </Section>

          {/* 4. 상세내용 */}
          <Section>
            <Label>상세 요청내용</Label>
            <TextArea
              placeholder="구체적인 작업내용, 면적, 기타 요청사항을 입력하세요..."
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
            <CheckRow>
              <input
                type="checkbox"
                checked={callFirst}
                onChange={(e) => {
                  setCallFirst(e.target.checked);
                  if (e.target.checked) {
                    setDetail((prev) => prev + "\n전화먼저 주세요!");
                  }
                }}
              />
              전화먼저 주세요!
            </CheckRow>
          </Section>

          {/* 5. 사진 등록 */}
          <Section>
            <Label>현장사진등록 (선택)</Label>
            <PhotoGrid>
              {[1, 2, 3, 4].map((n) => (
                <PhotoBox key={n}>+</PhotoBox>
              ))}
            </PhotoGrid>
          </Section>

          {/* 6. 일정 */}
          <Section>
            <Label>작업 희망일정</Label>
            <ChipGrid>
              {SCHEDULE_OPTIONS.map((opt) => (
                <Chip
                  key={opt.key}
                  $selected={schedule === opt.key}
                  onClick={() => setSchedule(opt.key)}
                >
                  {opt.label}
                </Chip>
              ))}
            </ChipGrid>
          </Section>

          {/* 7. 주소 */}
          <Section>
            <Label>주소</Label>
            <Input
              placeholder="주소를 입력하세요"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Section>

          {/* 8. 연락처 */}
          <Section>
            <Label>연락처</Label>
            <RadioGroup>
              <RadioButton
                $selected={contactType === "self"}
                onClick={() => setContactType("self")}
              >
                1. 접수자
              </RadioButton>
              <RadioButton
                $selected={contactType === "customer"}
                onClick={() => setContactType("customer")}
              >
                2. 요청고객
              </RadioButton>
            </RadioGroup>
            {contactType === "customer" && (
              <Input
                style={{ marginTop: 12 }}
                placeholder="요청고객 전화번호"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            )}
          </Section>

          {/* 9. 서비스 단가 */}
          <Section>
            <Label>서비스 단가입력</Label>
            <RadioGroup>
              <RadioButton
                $selected={priceType === "direct"}
                onClick={() => setPriceType("direct")}
              >
                단가 직접입력
              </RadioButton>
              <RadioButton
                $selected={priceType === "estimate"}
                onClick={() => setPriceType("estimate")}
              >
                견적 제시요청
              </RadioButton>
            </RadioGroup>
            {priceType === "direct" && (
              <Input
                style={{ marginTop: 12 }}
                type="number"
                placeholder="서비스 금액 (원)"
                value={directPrice}
                onChange={(e) => setDirectPrice(e.target.value)}
              />
            )}
          </Section>

          {/* 10. 소개수수료 */}
          {!category.noCommission && (
            <Section>
              <Label>소개(캐시백) 수수료 설정</Label>
              <ChipGrid>
                <Chip
                  $selected={commissionType === COMMISSION_TYPES.NONE}
                  onClick={() => setCommissionType(COMMISSION_TYPES.NONE)}
                >
                  미적용
                </Chip>
                <Chip
                  $selected={commissionType === COMMISSION_TYPES.FIXED}
                  onClick={() => setCommissionType(COMMISSION_TYPES.FIXED)}
                >
                  정액설정
                </Chip>
                {priceType !== "direct" && (
                  <>
                    <Chip
                      $selected={commissionType === COMMISSION_TYPES.CONTRACT}
                      onClick={() => setCommissionType(COMMISSION_TYPES.CONTRACT)}
                    >
                      계약성사
                    </Chip>
                    <Chip
                      $selected={commissionType === COMMISSION_TYPES.INFO}
                      onClick={() => setCommissionType(COMMISSION_TYPES.INFO)}
                    >
                      정보제공
                    </Chip>
                  </>
                )}
              </ChipGrid>

              {(commissionType === COMMISSION_TYPES.FIXED || commissionType === COMMISSION_TYPES.CONTRACT) && (
                <div style={{ marginTop: 12 }}>
                  <ChipGrid>
                    {COMMISSION_PRESETS.FIXED.map((amt) => (
                      <Chip
                        key={amt}
                        $selected={commissionAmount === String(amt)}
                        onClick={() => setCommissionAmount(String(amt))}
                      >
                        {amt.toLocaleString()}원
                      </Chip>
                    ))}
                  </ChipGrid>
                  <Input
                    style={{ marginTop: 8 }}
                    type="number"
                    placeholder="직접입력 (원)"
                    value={
                      COMMISSION_PRESETS.FIXED.includes(Number(commissionAmount))
                        ? ""
                        : commissionAmount
                    }
                    onChange={(e) => setCommissionAmount(e.target.value)}
                  />
                </div>
              )}

              {commissionType === COMMISSION_TYPES.INFO && (
                <div style={{ marginTop: 12 }}>
                  <ChipGrid>
                    {COMMISSION_PRESETS.INFO.map((amt) => (
                      <Chip
                        key={amt}
                        $selected={commissionAmount === String(amt)}
                        onClick={() => setCommissionAmount(String(amt))}
                      >
                        {amt.toLocaleString()}원
                      </Chip>
                    ))}
                  </ChipGrid>
                  <Input
                    style={{ marginTop: 8 }}
                    type="number"
                    placeholder="직접입력 (원)"
                    value={
                      COMMISSION_PRESETS.INFO.includes(Number(commissionAmount))
                        ? ""
                        : commissionAmount
                    }
                    onChange={(e) => setCommissionAmount(e.target.value)}
                  />
                </div>
              )}
            </Section>
          )}

          {/* 11. 홈프로 선택 */}
          <Section>
            <Label>홈프로 선택</Label>
            <RadioGroup>
              <RadioButton
                $selected={matchType === MATCH_TYPES.PRIORITY}
                onClick={() => setMatchType(MATCH_TYPES.PRIORITY)}
              >
                우선 배정호출
              </RadioButton>
              <RadioButton
                $selected={matchType === MATCH_TYPES.MULTI}
                onClick={() => setMatchType(MATCH_TYPES.MULTI)}
              >
                다중 비교호출
              </RadioButton>
            </RadioGroup>
            <SubLabel style={{ marginTop: 8 }}>
              {matchType === MATCH_TYPES.PRIORITY
                ? "가장 먼저 수락한 홈프로가 배정됩니다"
                : "여러 홈프로 중에 접수자가 선택하여 계약합니다"}
            </SubLabel>
          </Section>

          {/* 등록 버튼 */}
          <Section>
            <SubmitButton
              disabled={!selectedCategory}
              onClick={handleSubmit}
            >
              등록하기
            </SubmitButton>
          </Section>
        </>
      )}
    </SimpleBackLayout>
  );
};

export default OrderCreatePage;
