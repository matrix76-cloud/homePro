/* eslint-disable */
import React, { useState, useContext, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../api/config";
import { UserContext } from "../../context/User";
import { useAuth } from "../../context/AuthContext";
import {
  CATEGORIES,
  CATEGORY_GROUPS,
  THEME,
  SPACE_TYPES,
  STORAGE_PATH_PREFIX,
} from "../../config/homeproConfig";
import { createOrder } from "../../service/OrderService";
import ORDER_FORM_CONFIG from "../../config/orderFormConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoCloseCircle } from "react-icons/io5";
import { CATEGORY_ICONS } from "../../utility/CategoryIcons";

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
  background: ${THEME.surface};
  margin: 12px 12px 0;
  padding: 20px;
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
`;

const Label = styled.div`
  font-size: 15px;
  font-weight: 700;
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
  background: ${({ $selected }) => ($selected ? THEME.primary : THEME.surface)};
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
  font-weight: 400;
  font-family: inherit;
  cursor: pointer;
  border: 2px solid ${({ $selected }) => ($selected ? THEME.primary : THEME.border)};
  background: ${({ $selected }) => ($selected ? `${THEME.primary}10` : THEME.surface)};
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
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: ${THEME.muted};
  cursor: pointer;
  background: ${THEME.surface};
  overflow: hidden;
  position: relative;
`;

const PhotoPreview = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const RemoveBtn = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0,0,0,0.5);
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
`;

const AddressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  cursor: pointer;
  background: ${THEME.surface};
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
  border-radius: 10px;
  background: ${THEME.surface};
  color: ${THEME.primary};
  font-size: 13px;
  font-weight: 400;
  font-family: inherit;
  cursor: pointer;
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
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
`;

const CatGridItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 4px 10px;
  border-radius: 12px;
  cursor: pointer;
  border: 1.5px solid ${({ $selected }) => ($selected ? THEME.primary : "transparent")};
  background: ${({ $selected }) => ($selected ? `${THEME.primary}0D` : "transparent")};
  &:active { background: ${THEME.background}; }
`;

const CatGridIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: ${THEME.background};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
  svg { width: 36px; height: 36px; }
`;

const CatGridName = styled.div`
  font-size: 12px;
  font-weight: ${({ $selected }) => ($selected ? 600 : 400)};
  color: ${({ $selected }) => ($selected ? THEME.primary : THEME.text)};
  text-align: center;
  line-height: 1.3;
  word-break: keep-all;
`;

/* 탭 내장용 콘텐츠 컴포넌트 */
export const OrderCreateContent = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const { user } = useContext(UserContext);
  const { userData } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState(categoryId || "");
  const [selectedSub, setSelectedSub] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [buildingType, setBuildingType] = useState("");
  const [areaValue, setAreaValue] = useState("");
  const [areaUnit, setAreaUnit] = useState("평");
  const [spaceFields, setSpaceFields] = useState({});
  const [detail, setDetail] = useState("");
  const [callFirst, setCallFirst] = useState(false);
  const [schedule, setSchedule] = useState("");
  const [address, setAddress] = useState("");
  const [priceType, setPriceType] = useState("");
  const [directPrice, setDirectPrice] = useState("");
  const [spaceType, setSpaceType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(""), 2000); }, []);
  const [photos, setPhotos] = useState([]);
  const fileInputRef = useRef(null);
  const [addressDetail, setAddressDetail] = useState("");
  const [customInput, setCustomInput] = useState("");

  const category = CATEGORIES.find((c) => c.id === selectedCategory);
  const formConfig = ORDER_FORM_CONFIG[selectedCategory];

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

  const handleOptionToggle = (opt) => {
    setSelectedOptions((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
  };

  // 카테고리 변경 시 폼 상태 초기화
  const resetForm = () => {
    setSelectedSub([]);
    setSelectedOptions([]);
    setBuildingType("");
    setAreaValue("");
    setSpaceFields({});
    setDetail("");
    setCallFirst(false);
    setSchedule("");
    setSpaceType("");
    setCustomInput("");
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!selectedCategory) { showToast("카테고리를 선택해주세요"); return; }
    if (selectedSub.length === 0 && formConfig?.subGroups) { showToast("세부 항목을 선택해주세요"); return; }
    if (!schedule) { showToast("일정을 선택해주세요"); return; }
    if (!address.trim()) { showToast("주소를 입력해주세요"); return; }
    if (!detail.trim()) { showToast("요청 내용을 입력해주세요"); return; }
    if (priceType === "direct" && !directPrice) { showToast("금액을 입력해주세요"); return; }
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

      const nickname = userData?.nickname || userData?.name || user?.USERINFO?.nickname || "익명";
      const writerPhoto = userData?.profileImage || userData?.photoURL || user?.USERINFO?.userimg || "";
      await createOrder({
        categoryId: selectedCategory,
        categoryName: category?.shortName || "",
        subcategories: selectedSub.map((s) => s.includes(":") ? `${s.split(":")[0]} ${s.split(":")[1]}` : s),
        subcategory: selectedSub.map((s) => s.includes(":") ? `${s.split(":")[0]} ${s.split(":")[1]}` : s).join(", "),
        title: `${category?.shortName || ""} ${(() => { const first = selectedSub[0] || "요청"; return first.includes(":") ? first.split(":")[1] : first; })()}`,
        description: detail,
        spaceType,
        buildingType,
        options: selectedOptions,
        areaValue: areaValue ? `${areaValue}${areaUnit}` : "",
        spaceFields: Object.keys(spaceFields).length > 0 ? spaceFields : null,
        customInput: customInput || null,
        schedule,
        address,
        priceType,
        directPrice: priceType === "direct" ? directPrice : "",
        price: priceType === "direct" ? `${Number(directPrice).toLocaleString()}원` : "견적요청",
        createdBy: user?.uid || userData?.uid || "",
        writer: nickname,
        writerPhoto,
        location: addressDetail ? `${address} ${addressDetail}` : address,
        photos: photoURLs,
      });
      showToast("오더가 등록되었습니다!");
      setTimeout(() => navigate("/MobileMain"), 1000);
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
          {CATEGORY_GROUPS.map((group) => (
            <div key={group.id}>
              <CatGroupLabel>{group.label}</CatGroupLabel>
              <CatGrid>
                {CATEGORIES.filter((c) => c.group === group.id).map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.id];
                  return (
                    <CatGridItem
                      key={cat.id}
                      $selected={selectedCategory === cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        resetForm();
                      }}
                    >
                      <CatGridIcon $selected={selectedCategory === cat.id}>
                        {Icon ? <Icon /> : cat.shortName.charAt(0)}
                      </CatGridIcon>
                      <CatGridName $selected={selectedCategory === cat.id}>{cat.shortName}</CatGridName>
                    </CatGridItem>
                  );
                })}
              </CatGrid>
            </div>
          ))}
        </Section>
      )}

      {/* 카테고리 선택 후 동적 폼 */}
      {category && (
        <>
          {/* 안내문구 */}
          {formConfig?.notice && (
            <NoticeBox>{formConfig.notice}</NoticeBox>
          )}

          {/* 세부 항목 (subGroups from config) */}
          {formConfig?.subGroups && (
            <Section>
              <Label>세부 항목 선택</Label>
              {formConfig.subGroups.map((group) => (
                <div key={group.label}>
                  <GroupLabel>{group.label}</GroupLabel>
                  <ChipGrid>
                    {group.items.map((item) => {
                      const uniqueKey = `${group.label}:${item}`;
                      return (
                        <Chip
                          key={uniqueKey}
                          $selected={selectedSub.includes(uniqueKey)}
                          onClick={() => {
                            if (item === "직접입력" || item === "입력") return;
                            handleSubToggle(uniqueKey);
                          }}
                        >
                          {item}
                        </Chip>
                      );
                    })}
                  </ChipGrid>
                  {group.items.includes("직접입력") && selectedSub.includes(`${group.label}:직접입력`) && (
                    <Input style={{ marginTop: 8 }} placeholder="직접 입력" value={customInput} onChange={(e) => setCustomInput(e.target.value)} />
                  )}
                </div>
              ))}
              {/* 직접입력 필드 (subGroups에 "직접입력"/"입력" 항목이 있을 때) */}
              {formConfig.subGroups.some((g) => g.items.includes("직접입력") || g.items.includes("입력")) && (
                <div style={{ marginTop: 8 }}>
                  <Chip
                    $selected={selectedSub.includes("직접입력")}
                    onClick={() => handleSubToggle("직접입력")}
                  >
                    직접입력
                  </Chip>
                  {selectedSub.includes("직접입력") && (
                    <Input style={{ marginTop: 8 }} placeholder="항목을 직접 입력하세요" value={customInput} onChange={(e) => setCustomInput(e.target.value)} />
                  )}
                </div>
              )}
            </Section>
          )}

          {/* fallback: config 없을 때 기존 subcategories 사용 */}
          {!formConfig?.subGroups && category.subcategories && (
            <Section>
              <Label>세부 항목 선택</Label>
              <ChipGrid>
                {category.subcategories.map((sub) => (
                  <Chip key={sub} $selected={selectedSub.includes(sub)} onClick={() => handleSubToggle(sub)}>{sub}</Chip>
                ))}
              </ChipGrid>
            </Section>
          )}

          {/* 공간구조 (방/욕실/베란다 개소 입력) */}
          {formConfig?.spaceStructure && (
            <Section>
              <Label>{formConfig.spaceStructure.label || "공간구조"}</Label>
              <FieldGrid>
                {formConfig.spaceStructure.fields.map((field) => (
                  <FieldItem key={field}>
                    <FieldLabel>{field}</FieldLabel>
                    <FieldInput
                      type={field.includes("여/부") ? "text" : "number"}
                      placeholder={field.includes("여/부") ? "여/부" : "0"}
                      value={spaceFields[field] || ""}
                      onChange={(e) => setSpaceFields((prev) => ({ ...prev, [field]: e.target.value }))}
                    />
                  </FieldItem>
                ))}
              </FieldGrid>
            </Section>
          )}

          {/* 옵션 선택 */}
          {formConfig?.options && formConfig.options.length > 0 && (
            <Section>
              <Label>옵션 선택</Label>
              <ChipGrid>
                {formConfig.options.map((opt) => {
                  const label = typeof opt === "string" ? opt : opt.label;
                  return (
                    <Chip key={label} $selected={selectedOptions.includes(label)} onClick={() => handleOptionToggle(label)}>{label}</Chip>
                  );
                })}
              </ChipGrid>
            </Section>
          )}

          {/* 건물유형 */}
          {formConfig?.buildingTypes && (
            <Section>
              <Label>건물유형</Label>
              <ChipGrid>
                {formConfig.buildingTypes.map((type) => (
                  <Chip key={type} $selected={buildingType === type} onClick={() => setBuildingType(type)}>{type}</Chip>
                ))}
              </ChipGrid>
            </Section>
          )}

          {/* 면적 입력 */}
          {formConfig?.areaInput && (
            <Section>
              <Label>면적</Label>
              <AreaRow>
                <Input style={{ flex: 1 }} type="number" placeholder="면적 입력" value={areaValue} onChange={(e) => setAreaValue(e.target.value)} />
                <ChipGrid style={{ flexShrink: 0 }}>
                  {(Array.isArray(formConfig.areaInput) ? formConfig.areaInput : ["평", "m2"]).map((unit) => (
                    <Chip key={unit} $selected={areaUnit === unit} onClick={() => setAreaUnit(unit)}>{unit}</Chip>
                  ))}
                </ChipGrid>
              </AreaRow>
            </Section>
          )}

          {/* 공간유형 (config에 buildingTypes 없을 때 기본) */}
          {!formConfig?.buildingTypes && (
            <Section>
              <Label>공간유형</Label>
              <ChipGrid>
                {SPACE_TYPES.map((type) => (
                  <Chip key={type} $selected={spaceType === type} onClick={() => setSpaceType(type)}>{type}</Chip>
                ))}
              </ChipGrid>
            </Section>
          )}

          {/* 상세 요청내용 */}
          <Section>
            <Label>상세 요청내용</Label>
            <TextArea
              placeholder={formConfig?.detailPlaceholder || "구체적인 작업내용, 면적, 기타 요청사항을 입력하세요..."}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
            <CheckRow>
              <input type="checkbox" checked={callFirst} onChange={(e) => { setCallFirst(e.target.checked); if (e.target.checked) setDetail((prev) => prev + "\n전화먼저 주세요!"); }} />
              전화먼저 주세요!
            </CheckRow>
          </Section>

          {/* 현장사진등록 */}
          <Section>
            <Label>현장사진등록 (선택, 최대 {MAX_PHOTOS}장)</Label>
            <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handlePhotoAdd} />
            <PhotoGrid>
              {photos.map((p, i) => (
                <PhotoBox key={i} style={{ position: "relative", padding: 0 }}>
                  <PhotoPreview src={p.preview} alt={`사진${i + 1}`} />
                  <RemoveBtn onClick={() => handlePhotoRemove(i)}><IoCloseCircle size={22} color="#fff" /></RemoveBtn>
                </PhotoBox>
              ))}
              {photos.length < MAX_PHOTOS && (
                <PhotoBox onClick={() => fileInputRef.current?.click()}>+</PhotoBox>
              )}
            </PhotoGrid>
          </Section>

          {/* 작업 희망일정 */}
          <Section>
            <Label>작업 희망일정</Label>
            <ChipGrid>
              {(formConfig?.scheduleOptions || ["긴급", "오늘", "내일", "희망날짜지정", "협의가능해요!", "가능한 빨리 진행 원해요", "일주일 이내 진행 원해요"]).map((opt) => (
                <Chip key={opt} $selected={schedule === opt} onClick={() => setSchedule(opt)}>{opt}</Chip>
              ))}
            </ChipGrid>
          </Section>

          {/* 주소 */}
          <Section>
            <Label>주소</Label>
            <AddressRow onClick={openDaumPostcode}>
              <AddressText $hasValue={!!address}>{address || "주소를 검색하세요"}</AddressText>
              <AddressBtn type="button">검색</AddressBtn>
            </AddressRow>
            {address && (
              <Input style={{ marginTop: 8 }} placeholder="상세주소 입력 (동/호수 등)" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} />
            )}
          </Section>

          {/* 서비스 단가 */}
          <Section>
            <Label>서비스 단가입력</Label>
            <RadioGroup>
              <RadioButton $selected={priceType === "direct"} onClick={() => setPriceType("direct")}>단가 직접입력</RadioButton>
              <RadioButton $selected={priceType === "estimate"} onClick={() => setPriceType("estimate")}>견적 제시요청</RadioButton>
            </RadioGroup>
            {priceType === "direct" && (
              <Input style={{ marginTop: 12 }} type="number" placeholder="서비스 금액 (원)" value={directPrice} onChange={(e) => setDirectPrice(e.target.value)} />
            )}
          </Section>

          {/* 등록 버튼 */}
          <Section>
            <SubmitButton disabled={!selectedCategory || submitting} onClick={handleSubmit}>
              {submitting ? "등록 중..." : "등록하기"}
            </SubmitButton>
          </Section>
        </>
      )}
      {toast && <OrderToast>{toast}</OrderToast>}
    </>
  );
};

/* ── 동적 폼 추가 스타일 ── */
const NoticeBox = styled.div`
  margin: 12px 12px 0;
  padding: 16px;
  background: ${THEME.purpleLight};
  border-radius: 12px;
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  line-height: 1.6;
  white-space: pre-line;
`;

const GroupLabel = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${THEME.textSecondary};
  background: ${THEME.background};
  padding: 6px 10px;
  border-radius: 6px;
  margin: 14px 0 8px;
  &:first-child { margin-top: 4px; }
`;

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
`;

const FieldItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const FieldLabel = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const FieldInput = styled.input`
  padding: 10px 12px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  &:focus { border-color: ${THEME.primary}; }
`;

const AreaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const OrderCreatePage = () => (
  <SimpleBackLayout NAME="견적서 요청">
    <OrderCreateContent />
  </SimpleBackLayout>
);

export default OrderCreatePage;

const toastFadeIn = keyframes`
  from { transform: translate(-50%, 10px); opacity: 0; }
  to { transform: translate(-50%, 0); opacity: 1; }
`;

const OrderToast = styled.div`
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
  animation: ${toastFadeIn} 0.25s ease-out;
`;
