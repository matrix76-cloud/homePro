/* eslint-disable */
import React, { useContext, useState, useRef, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAtom } from "jotai";
import { UserContext } from "../../context/User";
import { useAuth } from "../../context/AuthContext";
import { CATEGORIES, CATEGORY_GROUPS, PRO_ONLY_CATEGORY_GROUPS, THEME, PRO_DETAIL_FIELDS } from "../../config/homeproConfig";
import { proCategoriesAtom } from "../../store/store";
import {
    uploadBusinessLicense,
    uploadActivityPhotos,
    uploadCertLicenses,
    registerProCategory,
    isApprovalRequiredCategory,
} from "../../service/ProService";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoCheckmarkCircle, IoCameraOutline, IoCloseCircle, IoDocumentOutline, IoImageOutline, IoLocationOutline } from "react-icons/io5";
import RegionSelectModal from "../../modal/RegionSelectModal";
import { regionToDisplayName } from "../../utility/regionUtils";
import {
    TbSparkles, TbSpray, TbShieldCheck, TbWashMachine, TbBed, TbBuildingStore,
    TbRipple, TbDropletSearch, TbDroplet, TbTools, TbFlame, TbAirConditioning,
    TbPlugConnected, TbBolt, TbBug, TbBiohazard, TbBulb, TbSofa, TbHomeCog,
    TbHammer, TbTrash, TbSchool, TbBackhoe, TbClipboardCheck, TbPackage,
    TbDeviceDesktop, TbCar, TbBuildingSkyscraper, TbTruckDelivery, TbDeviceTv,
    TbShieldHalfFilled, TbMoonStars, TbHeartHandshake,
} from "react-icons/tb";

const STEP_LABELS = ["분야 선택", "상세 정보"];

// 한 번에 등록 가능한 최대 카테고리 수 (대표 지시 7/30)
const MAX_CATS = 5;

// PRO_DETAIL_FIELDS 안에서 "자격증/면허" 성격의 텍스트 필드 키
// (사진 첨부는 공통 자격증 섹션에서 한 번만 받는다)
const CERT_TEXT_KEYS = ["certifications", "licenseNumber", "permits"];

// 카테고리 ID → 디테일 라인 아이콘 (모노톤, currentColor 상속)
const DETAIL_ICONS = {
    // 청소
    move_cleaning: TbSparkles,
    regular_cleaning: TbSpray,
    special_cleaning: TbShieldCheck,
    appliance_cleaning: TbWashMachine,
    mattress_care: TbBed,
    business_cleaning: TbBuildingStore,
    // 배관/설비
    drain_pipe: TbRipple,
    leak_detection: TbDropletSearch,
    leak_construction: TbDroplet,
    home_repair: TbTools,
    boiler: TbFlame,
    // 설치/전기
    aircon_install: TbAirConditioning,
    appliance_install: TbPlugConnected,
    electrical: TbBolt,
    pest_control: TbBug,
    mold: TbBiohazard,
    electrical_work: TbBulb,
    // 시공
    partial_interior: TbSofa,
    full_remodel: TbHomeCog,
    demolition: TbHammer,
    waste: TbTrash,
    training: TbSchool,
    // 장비/서비스
    heavy_equipment: TbBackhoe,
    inspection: TbClipboardCheck,
    supplies: TbPackage,
    computer: TbDeviceDesktop,
    auto: TbCar,
    // 생활
    realestate: TbBuildingSkyscraper,
    brokerage: TbBuildingSkyscraper,
    moving: TbTruckDelivery,
    appliance_rental: TbDeviceTv,
    insurance: TbShieldHalfFilled,
    fortune: TbMoonStars,
    // 하위호환 (기존 ID)
    professional_cleaning: TbSpray,
    plumbing: TbRipple,
    worker_call: TbHeartHandshake,
};

const ProCategoryRegisterPage = () => {
    const navigate = useNavigate();
    const { user } = useContext(UserContext);
    const [proCategories, setProCategories] = useAtom(proCategoriesAtom);

    // step
    const [step, setStep] = useState(1);

    // step 1 — 최대 5개 일괄 선택
    const [selectedCats, setSelectedCats] = useState([]);

    // step 2 — 카테고리별 입력 (세부분야 / 동적 필드)
    const [subsByCat, setSubsByCat] = useState({});   // { catId: [sub] }
    const [extrasByCat, setExtrasByCat] = useState({}); // { catId: { key: value } }

    // step 2 — 공통 입력
    const [experience, setExperience] = useState("");
    const [intro, setIntro] = useState("");
    const [region, setRegion] = useState(null); // { sido, gu }
    const [showRegionModal, setShowRegionModal] = useState(false);
    const [certs, setCerts] = useState([]); // [{ id, certName, file, preview }]
    const certFileRefs = useRef({});
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [activityPhotos, setActivityPhotos] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState("");
    const toastTimer = useRef(null);
    const fileRef = useRef(null);
    const activityFileRef = useRef(null);

    const { userData } = useAuth();
    const uid = user?.USERS_ID || userData?.uid;

    useEffect(() => () => clearTimeout(toastTimer.current), []);

    const showToast = (msg) => {
        setToast(msg);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(""), 2000);
    };

    // 선택 순서를 유지한 카테고리 객체 목록
    const selectedCatObjs = useMemo(
        () => selectedCats.map((id) => CATEGORIES.find((c) => c.id === id)).filter(Boolean),
        [selectedCats]
    );

    // ─── step 1 handlers ───
    const handleToggleCat = (catId) => {
        if (proCategories.includes(catId)) return;
        if (selectedCats.includes(catId)) {
            setSelectedCats(selectedCats.filter((id) => id !== catId));
            setSubsByCat((prev) => {
                const next = { ...prev };
                delete next[catId];
                return next;
            });
            setExtrasByCat((prev) => {
                const next = { ...prev };
                delete next[catId];
                return next;
            });
            return;
        }
        if (selectedCats.length >= MAX_CATS) {
            showToast(`분야는 최대 ${MAX_CATS}개까지 선택할 수 있습니다.`);
            return;
        }
        setSelectedCats([...selectedCats, catId]);
    };

    // ─── step 2 handlers (카테고리별) ───
    const toggleSub = (catId, sub) => {
        setSubsByCat((prev) => {
            const arr = prev[catId] || [];
            return {
                ...prev,
                [catId]: arr.includes(sub) ? arr.filter((s) => s !== sub) : [...arr, sub],
            };
        });
    };

    const updateExtra = (catId, key, value) => {
        setExtrasByCat((prev) => ({ ...prev, [catId]: { ...(prev[catId] || {}), [key]: value } }));
    };

    const toggleExtraChip = (catId, key, value) => {
        setExtrasByCat((prev) => {
            const cur = prev[catId] || {};
            const arr = cur[key] || [];
            return {
                ...prev,
                [catId]: {
                    ...cur,
                    [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
                },
            };
        });
    };

    // ─── cert handlers ───
    const addCert = () => {
        setCerts((prev) => [...prev, { id: Date.now(), certName: "", file: null, preview: null }]);
    };

    const updateCertName = (id, name) => {
        setCerts((prev) => prev.map((c) => (c.id === id ? { ...c, certName: name } : c)));
    };

    const handleCertPhoto = (id, e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setCerts((prev) => prev.map((c) => (c.id === id ? { ...c, file, preview: reader.result } : c)));
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const removeCert = (id) => {
        setCerts((prev) => prev.filter((c) => c.id !== id));
    };

    // ─── image handlers ───
    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleActivityPhotos = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const remaining = 10 - activityPhotos.length;
        const toAdd = files.slice(0, remaining);
        toAdd.forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setActivityPhotos((prev) => {
                    if (prev.length >= 10) return prev;
                    return [...prev, { id: Date.now() + Math.random(), file, preview: reader.result }];
                });
            };
            reader.readAsDataURL(file);
        });
        e.target.value = "";
    };

    const removeActivityPhoto = (id) => {
        setActivityPhotos((prev) => prev.filter((p) => p.id !== id));
    };

    const handleSubmit = async () => {
        if (!canSubmit) return;
        if (!uid) {
            alert("로그인이 필요합니다.");
            return;
        }
        setSubmitting(true);
        const registered = [];
        try {
            // 공통 서류·사진은 한 번만 업로드해서 카테고리별 문서가 같은 URL을 공유
            const licenseUrl = await uploadBusinessLicense(uid, selectedCats[0], imageFile);
            const photoUrls = activityPhotos.length > 0
                ? await uploadActivityPhotos(uid, selectedCats[0], activityPhotos.map((p) => p.file))
                : [];
            const certList = await uploadCertLicenses(uid, certs);

            for (const catId of selectedCats) {
                await registerProCategory(uid, catId, licenseUrl, photoUrls, {
                    subcategories: subsByCat[catId] || [],
                    experience,
                    intro,
                    // certs: 상세/수정 화면이 읽는 기존 스키마, certLicenses: 사진 URL 포함 명세 스키마
                    certs: certList,
                    certLicenses: certList.map((c) => ({ name: c.certName, url: c.url || "" })),
                    ...(extrasByCat[catId] || {}),
                }, region);
                registered.push(catId);
            }

            setProCategories([...proCategories, ...registered]);

            // 비즈프로필 작성 완료 2,000P (1회, 조건 판정은 함수 내부 — 대표 지시 7/29)
            try {
                const { grantProfileCompleteBonus } = await import("../../service/PointService");
                await grantProfileCompleteBonus(uid, userData?.nickname || userData?.name || "");
            } catch (e) { /* 보너스 실패가 등록을 막지 않게 */ }

            const pendingCats = registered
                .filter((id) => isApprovalRequiredCategory(id))
                .map((id) => CATEGORIES.find((c) => c.id === id)?.shortName || id);
            const msg = `${registered.length}개 전문분야가 등록되었습니다.`
                + (pendingCats.length > 0 ? `\n${pendingCats.join(", ")}는 관리자 승인 후 노출됩니다.` : "");
            alert(msg);
            navigate(-1);
        } catch (err) {
            console.error("register error:", err);
            if (registered.length > 0) setProCategories([...proCategories, ...registered]);
            alert("등록 중 오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            setSubmitting(false);
        }
    };

    // ─── step navigation ───
    const goNext = () => {
        if (!canStep1) return;
        setStep(2);
    };
    const goPrev = () => {
        if (step === 1) {
            navigate(-1);
        } else {
            setStep(1);
        }
    };

    // ─── validation ───
    const canStep1 = selectedCats.length > 0;
    // 세부분야가 있는 카테고리는 1개 이상 선택해야 등록 가능
    const missingSubCat = selectedCatObjs.find(
        (c) => c.subcategories?.length > 0 && !(subsByCat[c.id]?.length > 0)
    );
    const canSubmit =
        selectedCats.length > 0 &&
        !missingSubCat &&
        experience.trim() !== "" &&
        intro.trim() !== "" &&
        !!imageFile &&
        !submitting;

    const handleBack = () => goPrev();

    return (
        <SimpleBackLayout NAME="전문분야 등록" hideFooter onBack={handleBack}>
            <PageWrap>
                {/* 스텝 인디케이터 */}
                <StepIndicator>
                    {STEP_LABELS.map((label, i) => {
                        const num = i + 1;
                        const active = num === step;
                        const done = num < step;
                        return (
                            <React.Fragment key={num}>
                                <StepDot $active={active} $done={done}>
                                    {done ? "✓" : num}
                                </StepDot>
                                {num < 2 && <StepLine $done={num < step} />}
                            </React.Fragment>
                        );
                    })}
                </StepIndicator>
                <StepLabelRow>
                    {STEP_LABELS.map((label, i) => (
                        <StepLabel key={i} $active={i + 1 === step}>
                            {label}
                        </StepLabel>
                    ))}
                </StepLabelRow>

                {/* ══════ Step 1: 카테고리 선택 ══════ */}
                {step === 1 && (
                    <>
                        <Section>
                            <SectionTitleRow>
                                <SectionTitle $noGap>등록할 분야를 선택하세요</SectionTitle>
                                <SelectCount $full={selectedCats.length >= MAX_CATS}>
                                    {selectedCats.length}/{MAX_CATS} 선택
                                </SelectCount>
                            </SectionTitleRow>
                            <HelpText>최대 {MAX_CATS}개까지 함께 선택해 한 번에 등록할 수 있습니다.</HelpText>
                            {/* 소비자용 그룹 + 전문분야 등록 전용 그룹(공동중개) */}
                            {[...CATEGORY_GROUPS, ...PRO_ONLY_CATEGORY_GROUPS].map((group) => (
                                <div key={group.id}>
                                    <CatGroupLabel>{group.label}</CatGroupLabel>
                                    <CatGrid>
                                        {CATEGORIES.filter((c) => c.group === group.id).map((cat) => {
                                            const isRegistered = proCategories.includes(cat.id);
                                            const isSelected = selectedCats.includes(cat.id);
                                            const Icon = DETAIL_ICONS[cat.id];
                                            return (
                                                <CatGridItem
                                                    key={cat.id}
                                                    $selected={isSelected}
                                                    $disabled={isRegistered}
                                                    onClick={() => handleToggleCat(cat.id)}
                                                >
                                                    <CatGridIcon $selected={isSelected} $disabled={isRegistered}>
                                                        {Icon ? <Icon /> : <CatFallbackChar>{cat.shortName.charAt(0)}</CatFallbackChar>}
                                                        {isRegistered && (
                                                            <CatCheckBadge>
                                                                <IoCheckmarkCircle size={16} color={THEME.success} />
                                                            </CatCheckBadge>
                                                        )}
                                                    </CatGridIcon>
                                                    <CatGridName $disabled={isRegistered} $selected={isSelected}>{cat.shortName}</CatGridName>
                                                </CatGridItem>
                                            );
                                        })}
                                    </CatGrid>
                                </div>
                            ))}
                        </Section>
                        <ActionBtn disabled={!canStep1} $active={canStep1} onClick={goNext}>
                            다음
                        </ActionBtn>
                    </>
                )}

                {/* ══════ Step 2: 상세 정보 + 서류 + 사진 ══════ */}
                {step === 2 && (
                    <>
                        {/* 선택한 카테고리별 세부분야 + 상세 필드 */}
                        {selectedCatObjs.map((cat, idx) => {
                            const catSubs = subsByCat[cat.id] || [];
                            const catExtras = extrasByCat[cat.id] || {};
                            const fields = PRO_DETAIL_FIELDS[cat.id] || [];
                            const hasSubs = cat.subcategories?.length > 0;
                            return (
                                <Section key={cat.id}>
                                    <CatSectionHeader>
                                        <CatSectionIndex>분야 {idx + 1}</CatSectionIndex>
                                        <CatSectionName>{cat.name}</CatSectionName>
                                    </CatSectionHeader>

                                    {hasSubs && (
                                        <FieldBlock>
                                            <FieldLabel>세부 전문분야 (복수 선택 가능)</FieldLabel>
                                            <ChipWrap>
                                                {cat.subcategories.map((sub) => (
                                                    <Chip
                                                        key={sub}
                                                        $active={catSubs.includes(sub)}
                                                        onClick={() => toggleSub(cat.id, sub)}
                                                    >
                                                        {sub}
                                                    </Chip>
                                                ))}
                                            </ChipWrap>
                                            {catSubs.length === 0 && (
                                                <FieldHint>1개 이상 선택해주세요</FieldHint>
                                            )}
                                        </FieldBlock>
                                    )}

                                    {fields.map((field) => (
                                        <FieldBlock key={field.key}>
                                            <FieldLabel>{field.label}</FieldLabel>
                                            {field.type === "text" && (
                                                <StyledInput
                                                    type="text"
                                                    placeholder={field.placeholder}
                                                    value={catExtras[field.key] || ""}
                                                    onChange={(e) => updateExtra(cat.id, field.key, e.target.value)}
                                                />
                                            )}
                                            {field.type === "number" && (
                                                <StyledInput
                                                    type="number"
                                                    placeholder={field.placeholder}
                                                    value={catExtras[field.key] || ""}
                                                    onChange={(e) => updateExtra(cat.id, field.key, e.target.value)}
                                                    min="0"
                                                    inputMode="numeric"
                                                />
                                            )}
                                            {field.type === "textarea" && (
                                                <StyledTextarea
                                                    placeholder={field.placeholder}
                                                    value={catExtras[field.key] || ""}
                                                    onChange={(e) => updateExtra(cat.id, field.key, e.target.value)}
                                                    rows={3}
                                                />
                                            )}
                                            {field.type === "chips" && (
                                                <ChipWrap>
                                                    {field.options.map((opt) => (
                                                        <Chip
                                                            key={opt}
                                                            $active={(catExtras[field.key] || []).includes(opt)}
                                                            onClick={() => toggleExtraChip(cat.id, field.key, opt)}
                                                        >
                                                            {opt}
                                                        </Chip>
                                                    ))}
                                                </ChipWrap>
                                            )}
                                            {CERT_TEXT_KEYS.includes(field.key) && (
                                                <FieldHint>자격증 사진은 아래 자격증·면허 항목에서 함께 첨부합니다</FieldHint>
                                            )}
                                        </FieldBlock>
                                    ))}
                                </Section>
                            );
                        })}

                        <Section>
                            <SectionTitle>경력 (년)</SectionTitle>
                            <StyledInput
                                type="number"
                                placeholder="예: 5"
                                value={experience}
                                onChange={(e) => setExperience(e.target.value)}
                                min="0"
                                inputMode="numeric"
                            />
                        </Section>

                        <Section>
                            <SectionTitle>한줄 소개</SectionTitle>
                            <StyledTextarea
                                placeholder="고객에게 보여질 한줄 소개를 입력하세요"
                                value={intro}
                                onChange={(e) => setIntro(e.target.value)}
                                rows={3}
                                maxLength={100}
                            />
                            <CharCount>{intro.length}/100</CharCount>
                        </Section>

                        <Section>
                            <SectionTitle>활동 지역</SectionTitle>
                            <RegionSelectBtn type="button" onClick={() => setShowRegionModal(true)}>
                                <IoLocationOutline size={18} color={region ? THEME.primary : THEME.muted} />
                                <RegionBtnText $hasValue={!!region}>
                                    {region ? regionToDisplayName(region) : "지역을 선택하세요"}
                                </RegionBtnText>
                            </RegionSelectBtn>
                            <RegionSelectModal
                                open={showRegionModal}
                                onClose={() => setShowRegionModal(false)}
                                onSelect={(r) => setRegion(r)}
                                defaultValue={region || { sido: "서울", gu: "전체" }}
                            />
                        </Section>

                        {/* 사업자등록증 */}
                        <Section>
                            <SectionTitle>사업자등록증</SectionTitle>
                            <UploadBox onClick={() => fileRef.current?.click()}>
                                {imagePreview ? (
                                    <PreviewImg src={imagePreview} alt="사업자등록증 미리보기" />
                                ) : (
                                    <UploadPlaceholder>
                                        <IoCameraOutline size={36} color={THEME.muted} />
                                        <UploadText>사진 첨부하기</UploadText>
                                    </UploadPlaceholder>
                                )}
                            </UploadBox>
                            <HiddenInput
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                            />
                        </Section>

                        {/* 자격증·면허 (공통 — 선택한 분야 전체에 함께 저장) */}
                        <Section>
                            <SectionTitle>자격증·면허</SectionTitle>
                            <HelpText>보유한 자격증·면허를 이름과 사진으로 등록하세요. (선택)</HelpText>
                            <CertSection>
                                {certs.map((cert) => (
                                    <CertCard key={cert.id}>
                                        <CertCardHeader>
                                            <CertNameInput
                                                type="text"
                                                placeholder="자격증명 (예: 전기기능사)"
                                                value={cert.certName}
                                                onChange={(e) => updateCertName(cert.id, e.target.value)}
                                            />
                                            <CertRemoveBtn onClick={() => removeCert(cert.id)}>
                                                <IoCloseCircle size={22} color="#fff" />
                                            </CertRemoveBtn>
                                        </CertCardHeader>
                                        <CertPhotoArea onClick={() => certFileRefs.current[cert.id]?.click()}>
                                            {cert.preview ? (
                                                <CertPhotoPreview src={cert.preview} alt={cert.certName} />
                                            ) : (
                                                <CertPhotoPlaceholder>
                                                    <IoCameraOutline size={28} color={THEME.muted} />
                                                    <CertPhotoText>사진 첨부</CertPhotoText>
                                                </CertPhotoPlaceholder>
                                            )}
                                        </CertPhotoArea>
                                        <HiddenInput
                                            ref={(el) => (certFileRefs.current[cert.id] = el)}
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={(e) => handleCertPhoto(cert.id, e)}
                                        />
                                    </CertCard>
                                ))}
                                <CertAddBtn onClick={addCert}>
                                    <IoDocumentOutline size={20} color={THEME.primary} />
                                    <CertAddText>자격증 추가하기</CertAddText>
                                </CertAddBtn>
                            </CertSection>
                        </Section>

                        {/* 활동 사진 */}
                        <Section>
                            <SectionTitle>활동 사진 ({activityPhotos.length}/10)</SectionTitle>
                            <PhotoGrid>
                                {activityPhotos.map((photo) => (
                                    <PhotoItem key={photo.id}>
                                        <PhotoThumb src={photo.preview} alt="활동사진" />
                                        <PhotoRemoveBtn onClick={() => removeActivityPhoto(photo.id)}>
                                            <IoCloseCircle size={22} color="#fff" />
                                        </PhotoRemoveBtn>
                                    </PhotoItem>
                                ))}
                                {activityPhotos.length < 10 && (
                                    <PhotoAddBtn onClick={() => activityFileRef.current?.click()}>
                                        <IoImageOutline size={28} color={THEME.muted} />
                                        <PhotoAddText>추가</PhotoAddText>
                                    </PhotoAddBtn>
                                )}
                            </PhotoGrid>
                            <HiddenInput
                                ref={activityFileRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleActivityPhotos}
                            />
                            <PhotoHint>시공 사례, 작업 현장 등 활동 사진을 등록하세요</PhotoHint>
                        </Section>

                        <ActionBtn disabled={!canSubmit} $active={canSubmit} onClick={handleSubmit}>
                            {submitting
                                ? "등록 중..."
                                : `${selectedCats.length}개 분야 등록하기`}
                        </ActionBtn>
                    </>
                )}

                {toast && <Toast>{toast}</Toast>}
            </PageWrap>
        </SimpleBackLayout>
    );
};

export default ProCategoryRegisterPage;

/* ===================== styles ===================== */

const PageWrap = styled.div`
    padding: 20px 12px 40px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

/* ─── Step Indicator ─── */
const StepIndicator = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    margin-bottom: -16px;
    padding: 0 40px;
`;

const StepDot = styled.div`
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 400;
    flex-shrink: 0;
    background: ${({ $active, $done }) =>
        $active ? THEME.primary : $done ? THEME.success : THEME.border};
    color: ${({ $active, $done }) =>
        $active || $done ? "#fff" : THEME.muted};
    transition: all 0.2s;
`;

const StepLine = styled.div`
    flex: 1;
    height: 3px;
    background: ${({ $done }) => ($done ? THEME.success : THEME.border)};
    transition: background 0.2s;
`;

const StepLabelRow = styled.div`
    display: flex;
    justify-content: space-between;
    padding: 0 24px;
`;

const StepLabel = styled.div`
    font-size: 14px;
    font-weight: 400;
    color: ${({ $active }) => ($active ? THEME.primary : THEME.muted)};
    text-align: center;
    flex: 1;
`;

/* ─── Shared ─── */
const Section = styled.div`
    background: ${THEME.surface};
    border-radius: 16px;
    padding: 20px;
    box-shadow: ${THEME.cardShadow};
`;

const SectionTitle = styled.div`
    font-size: 19px;
    font-weight: 700;
    color: ${THEME.text};
    letter-spacing: -0.03em;
    margin-bottom: ${({ $noGap }) => ($noGap ? "0" : "14px")};
`;

const SectionTitleRow = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
`;

const SelectCount = styled.div`
    font-size: 15px;
    font-weight: 700;
    color: ${({ $full }) => ($full ? THEME.primaryDark : THEME.textSecondary)};
    flex-shrink: 0;
`;

const HelpText = styled.div`
    font-size: 14px;
    color: ${THEME.muted};
    margin-top: 6px;
`;

/* ─── Step 2: 카테고리별 섹션 ─── */
const CatSectionHeader = styled.div`
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding-bottom: 12px;
    margin-bottom: 4px;
    border-bottom: 1px solid ${THEME.border};
`;

const CatSectionIndex = styled.div`
    font-size: 14px;
    font-weight: 400;
    color: ${THEME.muted};
    flex-shrink: 0;
`;

const CatSectionName = styled.div`
    font-size: 19px;
    font-weight: 700;
    color: ${THEME.text};
    letter-spacing: -0.03em;
`;

const FieldBlock = styled.div`
    margin-top: 18px;
`;

const FieldLabel = styled.div`
    font-size: 16px;
    font-weight: 700;
    color: ${THEME.textSecondary};
    margin-bottom: 10px;
`;

const FieldHint = styled.div`
    font-size: 13px;
    color: ${THEME.muted};
    margin-top: 8px;
`;

const Toast = styled.div`
    position: fixed;
    left: 50%;
    bottom: 90px;
    transform: translateX(-50%);
    max-width: 340px;
    padding: 12px 18px;
    border-radius: 10px;
    background: rgba(20, 24, 31, 0.92);
    color: #fff;
    font-size: 15px;
    font-weight: 400;
    text-align: center;
    z-index: 1000;
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

/* ─── Step 1: Category Grid (숨고 스타일) ─── */
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
    cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
    opacity: ${({ $disabled }) => ($disabled ? 0.55 : 1)};
    border: 1.5px solid ${({ $selected }) => ($selected ? THEME.primary : "transparent")};
    background: ${({ $selected }) => ($selected ? `${THEME.primary}0D` : "transparent")};
    &:active { background: ${THEME.background}; }
    transition: all 0.15s;
    &:active {
        opacity: ${({ $disabled }) => ($disabled ? 0.55 : 0.85)};
    }
`;

const CatGridIcon = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 54px;
    height: 54px;
    margin-bottom: 8px;
    border-radius: 50%;
    background: ${({ $disabled, $selected }) =>
        $disabled ? "#F2F4F6" : $selected ? "#EAF2FD" : "#F4F6F8"};
    color: ${({ $disabled, $selected }) =>
        $disabled ? THEME.muted : $selected ? THEME.primary : "#5A6673"};
    transition: background 0.15s, color 0.15s;
    svg {
        width: 30px;
        height: 30px;
        stroke-width: 1.4;
    }
`;

const CatFallbackChar = styled.div`
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 700;
`;

const CatCheckBadge = styled.div`
    position: absolute;
    top: -2px;
    right: -2px;
    background: #fff;
    border-radius: 50%;
    line-height: 0;
`;

const CatGridName = styled.div`
    font-size: 14px;
    font-weight: ${({ $selected }) => ($selected ? 600 : 400)};
    color: ${({ $disabled, $selected }) => $disabled ? THEME.muted : $selected ? THEME.primary : THEME.text};
    text-align: center;
    line-height: 1.3;
    word-break: keep-all;
`;

/* ─── Detail Form ─── */
const ChipWrap = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const Chip = styled.div`
    padding: 8px 14px;
    border-radius: 20px;
    font-size: 15px;
    font-weight: 400;
    cursor: pointer;
    transition: all 0.15s;
    background: ${({ $active }) => ($active ? THEME.primary : THEME.surface)};
    color: ${({ $active }) => ($active ? "#fff" : THEME.text)};
    border: 1.5px solid ${({ $active }) => ($active ? THEME.primary : THEME.border)};
    &:active {
        opacity: 0.8;
    }
`;

const StyledInput = styled.input`
    width: 100%;
    padding: 14px 16px;
    border: 1.5px solid ${THEME.border};
    border-radius: 10px;
    font-size: 17px;
    font-family: inherit;
    color: ${THEME.text};
    background: ${THEME.surface};
    outline: none;
    box-sizing: border-box;
    &:focus {
        border-color: ${THEME.primary};
    }
    &::placeholder {
        color: ${THEME.muted};
    }
`;

const StyledTextarea = styled.textarea`
    width: 100%;
    padding: 14px 16px;
    border: 1.5px solid ${THEME.border};
    border-radius: 10px;
    font-size: 17px;
    font-family: inherit;
    color: ${THEME.text};
    background: ${THEME.surface};
    outline: none;
    resize: none;
    box-sizing: border-box;
    &:focus {
        border-color: ${THEME.primary};
    }
    &::placeholder {
        color: ${THEME.muted};
    }
`;

const CharCount = styled.div`
    text-align: right;
    font-size: 14px;
    color: ${THEME.muted};
    margin-top: 6px;
`;

/* ─── Cert Pair ─── */
const CertSection = styled.div`
    margin-top: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const CertCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const CertCardHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
`;

const CertNameInput = styled.input`
    flex: 1;
    padding: 10px 12px;
    border: 1.5px solid ${THEME.border};
    border-radius: 10px;
    font-size: 16px;
    font-family: inherit;
    color: ${THEME.text};
    background: ${THEME.surface};
    outline: none;
    box-sizing: border-box;
    &:focus { border-color: ${THEME.primary}; }
    &::placeholder { color: ${THEME.muted}; }
`;

const CertRemoveBtn = styled.button`
    background: rgba(0,0,0,0.5);
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

const CertPhotoArea = styled.div`
    width: 100%;
    min-height: 100px;
    border: 1.5px dashed ${THEME.border};
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    overflow: hidden;
    background: ${THEME.background};
    &:active { opacity: 0.8; }
`;

const CertPhotoPreview = styled.img`
    width: 100%;
    height: auto;
    max-height: 200px;
    object-fit: contain;
`;

const CertPhotoPlaceholder = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 16px;
`;

const CertPhotoText = styled.div`
    font-size: 15px;
    font-weight: 400;
    color: ${THEME.muted};
`;

const CertAddBtn = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px;
    border: 1.5px dashed ${THEME.border};
    border-radius: 12px;
    cursor: pointer;
    &:active { background: ${THEME.surface}; }
`;

const CertAddText = styled.div`
    font-size: 16px;
    font-weight: 400;
    color: ${THEME.primary};
`;

/* ─── Upload ─── */
const UploadBox = styled.div`
    width: 100%;
    min-height: 160px;
    border: 1.5px dashed ${THEME.border};
    border-radius: 12px;
    background: ${THEME.surface};
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    overflow: hidden;
    &:active { opacity: 0.8; }
`;

const UploadPlaceholder = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
`;

const UploadText = styled.div`
    font-size: 16px;
    font-weight: 400;
    color: ${THEME.muted};
`;

const PreviewImg = styled.img`
    width: 100%;
    height: auto;
    max-height: 300px;
    object-fit: contain;
`;

const HiddenInput = styled.input`
    display: none;
`;

/* ─── Activity Photos ─── */
const PhotoGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
`;

const PhotoItem = styled.div`
    position: relative;
    aspect-ratio: 1;
    border-radius: 12px;
    overflow: hidden;
`;

const PhotoThumb = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

const PhotoRemoveBtn = styled.button`
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

const PhotoAddBtn = styled.div`
    aspect-ratio: 1;
    border: 1.5px dashed ${THEME.border};
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    cursor: pointer;
    &:active { background: ${THEME.surface}; }
`;

const PhotoAddText = styled.div`
    font-size: 14px;
    font-weight: 400;
    color: ${THEME.muted};
`;

const PhotoHint = styled.div`
    font-size: 14px;
    color: ${THEME.muted};
    margin-top: 8px;
`;

/* ─── Region Select ─── */
const RegionSelectBtn = styled.button`
    width: 100%;
    padding: 14px 16px;
    border: 1.5px solid ${THEME.border};
    border-radius: 10px;
    font-size: 17px;
    font-family: inherit;
    background: ${THEME.surface};
    cursor: pointer;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 8px;
    &:active { border-color: ${THEME.primary}; }
`;

const RegionBtnText = styled.span`
    color: ${({ $hasValue }) => ($hasValue ? THEME.text : THEME.muted)};
    font-weight: 400;
`;

/* ─── Action Button ─── */
const ActionBtn = styled.button`
    width: 100%;
    padding: 16px;
    border: none;
    border-radius: 10px;
    background: ${({ $active }) => ($active ? THEME.primary : THEME.border)};
    color: ${({ $active }) => ($active ? "#fff" : THEME.muted)};
    font-size: 18px;
    font-weight: 400;
    font-family: inherit;
    cursor: ${({ $active }) => ($active ? "pointer" : "default")};
    transition: background 0.2s;
    &:active {
        opacity: ${({ $active }) => ($active ? 0.9 : 1)};
    }
`;
