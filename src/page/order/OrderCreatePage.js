/* eslint-disable */
import React, { useState, useContext, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../api/config";
import { UserContext } from "../../context/User";
import {
  CATEGORIES,
  THEME,
  COMMISSION_TYPES,
  COMMISSION_PRESETS,
  MATCH_TYPES,
  SCHEDULE_OPTIONS,
  SPACE_TYPES,
  STORAGE_PATH_PREFIX,
} from "../../config/homeproConfig";
import { createOrder } from "../../service/OrderService";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoCloseCircle } from "react-icons/io5";

const MAX_PHOTOS = 4;
const RESIZE_PX = 350;
const JPEG_QUALITY = 0.7;

function resizeAndCompress(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(RESIZE_PX / img.width, RESIZE_PX / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", JPEG_QUALITY);
    };
    img.src = URL.createObjectURL(file);
  });
}

const Section = styled.div`
  background: #fff;
  margin: 12px 12px 0;
  padding: 20px;
  border-radius: 4px;
`;

const Label = styled.div`
  font-size: 15px;
  font-weight: 400;
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
  border-radius: 4px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid ${({ $selected }) => ($selected ? THEME.primary : THEME.border)};
  background: ${({ $selected }) => ($selected ? THEME.primary : "#fff")};
  color: ${({ $selected }) => ($selected ? "#fff" : THEME.text)};
  font-weight: 400;
  &:active {
    opacity: 0.8;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 1px solid ${THEME.border};
  border-radius: 4px;
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
  border-radius: 4px;
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
  border-radius: 4px;
  font-size: 14px;
  font-weight: 400;
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
  border-radius: 4px;
  font-size: 17px;
  font-weight: 400;
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
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: ${THEME.muted};
  cursor: pointer;
  background: #fff;
  overflow: hidden;
  position: relative;
`;

const PhotoPreview = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const RemoveBtn = styled.div`
  position: absolute;
  top: 2px;
  right: 2px;
  color: ${THEME.danger};
  background: #fff;
  border-radius: 50%;
  line-height: 0;
  cursor: pointer;
`;

const AddressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid ${THEME.border};
  border-radius: 4px;
  cursor: pointer;
  background: #fff;
  &:active { background: ${THEME.background}; }
`;

const AddressText = styled.div`
  flex: 1;
  font-size: 14px;
  color: ${({ $hasValue }) => ($hasValue ? THEME.text : THEME.muted)};
`;

const AddressBtn = styled.button`
  flex-shrink: 0;
  padding: 6px 14px;
  border: 1px solid ${THEME.primary};
  border-radius: 4px;
  background: #fff;
  color: ${THEME.primary};
  font-size: 13px;
  font-weight: 400;
  font-family: inherit;
  cursor: pointer;
`;

const CatTable = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-top: 1px solid ${THEME.border};
  border-left: 1px solid ${THEME.border};
`;

const CatCell = styled.div`
  padding: 14px 8px;
  border-right: 1px solid ${THEME.border};
  border-bottom: 1px solid ${THEME.border};
  text-align: center;
  font-size: 13px;
  font-weight: 400;
  color: ${({ $selected }) => ($selected ? "#fff" : THEME.text)};
  background: ${({ $selected }) => ($selected ? THEME.primary : "#fff")};
  cursor: pointer;
  word-break: keep-all;
  &:active { opacity: 0.8; }
`;

/* 탭 내장용 콘텐츠 컴포넌트 */
export const OrderCreateContent = () => {
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
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState([]); // { preview, blob }
  const fileInputRef = useRef(null);

  const [addressDetail, setAddressDetail] = useState("");

  const category = CATEGORIES.find((c) => c.id === selectedCategory);

  // Daum 주소 API 스크립트 로드
  useEffect(() => {
    if (document.getElementById("daum-postcode-script")) return;
    const script = document.createElement("script");
    script.id = "daum-postcode-script";
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const openDaumPostcode = () => {
    if (!window.daum?.Postcode) return;
    new window.daum.Postcode({
      oncomplete: (data) => {
        const addr = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;
        setAddress(addr);
        setAddressDetail("");
      },
    }).open();
  };

  const handlePhotoAdd = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const remaining = MAX_PHOTOS - photos.length;
    const toProcess = files.slice(0, remaining);
    const newPhotos = await Promise.all(
      toProcess.map(async (f) => {
        const blob = await resizeAndCompress(f);
        return { preview: URL.createObjectURL(blob), blob };
      })
    );
    setPhotos((prev) => [...prev, ...newPhotos]);
    e.target.value = "";
  };

  const handlePhotoRemove = (idx) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubToggle = (sub) => {
    setSelectedSub((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // 사진 업로드
      const photoURLs = await Promise.all(
        photos.map(async (p, i) => {
          const path = `${STORAGE_PATH_PREFIX}/orders/${user?.uid || "anon"}/${Date.now()}_${i}.jpg`;
          const storageRef = ref(storage, path);
          await uploadBytes(storageRef, p.blob, { contentType: "image/jpeg" });
          return getDownloadURL(storageRef);
        })
      );

      const nickname = user?.USERINFO?.nickname || "익명";
      const maskedName = nickname.charAt(0) + "**";
      await createOrder({
        categoryId: selectedCategory,
        categoryName: category?.shortName || "",
        subcategories: selectedSub,
        subcategory: selectedSub.join(", "),
        title: `${category?.shortName || ""} ${selectedSub[0] || "요청"}`,
        description: detail,
        spaceType,
        schedule,
        address,
        contactType,
        customerPhone: contactType === "customer" ? customerPhone : "",
        priceType,
        directPrice: priceType === "direct" ? directPrice : "",
        price: priceType === "direct" ? `${Number(directPrice).toLocaleString()}원` : "견적요청",
        commissionType,
        commissionAmount: commissionType !== COMMISSION_TYPES.NONE ? commissionAmount : "",
        matchType: matchType === MATCH_TYPES.PRIORITY ? "우선" : "다중",
        createdBy: user?.uid || "",
        writer: maskedName,
        location: addressDetail ? `${address} ${addressDetail}` : address,
        photos: photoURLs,
      });
      alert("오더가 등록되었습니다!");
      navigate("/MobileMain");
    } catch (err) {
      console.error("오더 등록 실패:", err);
      alert("등록에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* 1. 카테고리 선택 */}
      {!categoryId && (
        <Section>
          <Label>카테고리 선택</Label>
          <CatTable>
            {CATEGORIES.map((cat) => (
              <CatCell
                key={cat.id}
                $selected={selectedCategory === cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedSub([]);
                }}
              >
                {cat.shortName}
              </CatCell>
            ))}
          </CatTable>
        </Section>
      )}

      {/* 카테고리 정보 표시 */}
      {category && (
        <>
          {categoryId && (
            <Section>
              <Label>{category.name}</Label>
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
            <Label>현장사진등록 (선택, 최대 {MAX_PHOTOS}장)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={handlePhotoAdd}
            />
            <PhotoGrid>
              {photos.map((p, i) => (
                <PhotoBox key={i} style={{ position: "relative", padding: 0 }}>
                  <PhotoPreview src={p.preview} alt={`사진${i + 1}`} />
                  <RemoveBtn onClick={() => handlePhotoRemove(i)}>
                    <IoCloseCircle size={22} />
                  </RemoveBtn>
                </PhotoBox>
              ))}
              {photos.length < MAX_PHOTOS && (
                <PhotoBox onClick={() => fileInputRef.current?.click()}>+</PhotoBox>
              )}
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
            <AddressRow onClick={openDaumPostcode}>
              <AddressText $hasValue={!!address}>
                {address || "주소를 검색하세요"}
              </AddressText>
              <AddressBtn type="button">검색</AddressBtn>
            </AddressRow>
            {address && (
              <Input
                style={{ marginTop: 8 }}
                placeholder="상세주소 입력 (동/호수 등)"
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
              />
            )}
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
              disabled={!selectedCategory || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "등록 중..." : "등록하기"}
            </SubmitButton>
          </Section>
        </>
      )}
    </>
  );
};

const OrderCreatePage = () => (
  <SimpleBackLayout NAME="견적서 요청">
    <OrderCreateContent />
  </SimpleBackLayout>
);

export default OrderCreatePage;
