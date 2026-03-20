/* eslint-disable */
import React, { useContext, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAtom } from "jotai";
import { UserContext } from "../../context/User";
import { CATEGORIES, CATEGORY_GROUPS, THEME, PRO_DETAIL_FIELDS } from "../../config/homeproConfig";
import { proCategoriesAtom } from "../../store/store";
import { uploadBusinessLicense, uploadActivityPhotos, registerProCategory } from "../../service/ProService";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoCheckmarkCircle, IoCameraOutline, IoCloseCircle, IoDocumentOutline, IoImageOutline, IoLocationOutline } from "react-icons/io5";
import RegionSelectModal from "../../modal/RegionSelectModal";
import { regionToDisplayName } from "../../utility/regionUtils";
import { CATEGORY_ICONS } from "../../utility/CategoryIcons";

const STEP_LABELS = ["분야 선택", "상세 정보"];

const ProCategoryRegisterPage = () => {
    const navigate = useNavigate();
    const { user } = useContext(UserContext);
    const [proCategories, setProCategories] = useAtom(proCategoriesAtom);

    // step
    const [step, setStep] = useState(1);

    // step 1
    const [selectedCat, setSelectedCat] = useState(null);

    // step 2
    const [selectedSubs, setSelectedSubs] = useState([]);
    const [experience, setExperience] = useState("");
    const [intro, setIntro] = useState("");
    const [region, setRegion] = useState(null); // { sido, gu }
    const [showRegionModal, setShowRegionModal] = useState(false);
    const [extraFields, setExtraFields] = useState({});
    const [certs, setCerts] = useState([]); // [{ id, certName, file, preview }]
    const certFileRefs = useRef({});
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [activityPhotos, setActivityPhotos] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const fileRef = useRef(null);
    const activityFileRef = useRef(null);

    const uid = user?.USERS_ID;

    const catObj = useMemo(
        () => CATEGORIES.find((c) => c.id === selectedCat),
        [selectedCat]
    );
    const hasSubcategories = catObj?.subcategories?.length > 0;

    const catDetailFields = useMemo(
        () => PRO_DETAIL_FIELDS[selectedCat] || [],
        [selectedCat]
    );

    // ─── step 1 handlers ───
    const handleSelectCat = (catId) => {
        if (proCategories.includes(catId)) return;
        setSelectedCat(catId);
        setSelectedSubs([]);
        setExtraFields({});
    };

    // ─── step 2 handlers ───
    const toggleSub = (sub) => {
        setSelectedSubs((prev) =>
            prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
        );
    };

    const updateExtra = (key, value) => setExtraFields((prev) => ({ ...prev, [key]: value }));
    const toggleExtraChip = (key, value) => {
        setExtraFields((prev) => {
            const arr = prev[key] || [];
            return { ...prev, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
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
        if (!selectedCat || !imageFile || submitting) return;
        if (!uid) {
            alert("로그인이 필요합니다.");
            return;
        }
        setSubmitting(true);
        try {
            const licenseUrl = await uploadBusinessLicense(uid, selectedCat, imageFile);
            const photoUrls = activityPhotos.length > 0
                ? await uploadActivityPhotos(uid, selectedCat, activityPhotos.map((p) => p.file))
                : [];
            await registerProCategory(uid, selectedCat, licenseUrl, photoUrls, {
                subcategories: selectedSubs,
                experience,
                intro,
                ...extraFields,
            }, region);
            setProCategories([...proCategories, selectedCat]);
            alert("전문분야가 등록되었습니다.");
            navigate(-1);
        } catch (err) {
            console.error("register error:", err);
            alert("등록 중 오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            setSubmitting(false);
        }
    };

    // ─── step navigation ───
    const goNext = () => setStep(2);
    const goPrev = () => {
        if (step === 1) {
            navigate(-1);
        } else {
            setStep(1);
        }
    };

    // ─── validation ───
    const canStep1 = !!selectedCat;
    const canSubmit = experience.trim() !== "" && intro.trim() !== "" && !!imageFile && !submitting;

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
                            <SectionTitle>등록할 분야를 선택하세요</SectionTitle>
                            {CATEGORY_GROUPS.map((group) => (
                                <div key={group.id}>
                                    <CatGroupLabel>{group.label}</CatGroupLabel>
                                    <CatGrid>
                                        {CATEGORIES.filter((c) => c.group === group.id).map((cat) => {
                                            const isRegistered = proCategories.includes(cat.id);
                                            const isSelected = selectedCat === cat.id;
                                            const Icon = CATEGORY_ICONS[cat.id];
                                            return (
                                                <CatGridItem
                                                    key={cat.id}
                                                    $selected={isSelected}
                                                    $disabled={isRegistered}
                                                    onClick={() => handleSelectCat(cat.id)}
                                                >
                                                    <CatGridIcon $selected={isSelected} $disabled={isRegistered}>
                                                        {Icon ? <Icon /> : cat.shortName.charAt(0)}
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
                        {hasSubcategories && (
                            <Section>
                                <SectionTitle>전문분야 선택 (복수 선택 가능)</SectionTitle>
                                <ChipWrap>
                                    {catObj.subcategories.map((sub) => {
                                        const active = selectedSubs.includes(sub);
                                        return (
                                            <Chip key={sub} $active={active} onClick={() => toggleSub(sub)}>
                                                {sub}
                                            </Chip>
                                        );
                                    })}
                                </ChipWrap>
                            </Section>
                        )}

                        {catDetailFields.map((field) => {
                            const isCertField = ["certifications", "licenseNumber", "permits"].includes(field.key);
                            return (
                            <Section key={field.key}>
                                <SectionTitle>{field.label}</SectionTitle>
                                {field.type === "text" && !isCertField && (
                                    <StyledInput
                                        type="text"
                                        placeholder={field.placeholder}
                                        value={extraFields[field.key] || ""}
                                        onChange={(e) => updateExtra(field.key, e.target.value)}
                                    />
                                )}
                                {field.type === "number" && (
                                    <StyledInput
                                        type="number"
                                        placeholder={field.placeholder}
                                        value={extraFields[field.key] || ""}
                                        onChange={(e) => updateExtra(field.key, e.target.value)}
                                        min="0"
                                        inputMode="numeric"
                                    />
                                )}
                                {field.type === "textarea" && (
                                    <StyledTextarea
                                        placeholder={field.placeholder}
                                        value={extraFields[field.key] || ""}
                                        onChange={(e) => updateExtra(field.key, e.target.value)}
                                        rows={3}
                                    />
                                )}
                                {field.type === "chips" && (
                                    <ChipWrap>
                                        {field.options.map((opt) => {
                                            const active = (extraFields[field.key] || []).includes(opt);
                                            return (
                                                <Chip key={opt} $active={active} onClick={() => toggleExtraChip(field.key, opt)}>
                                                    {opt}
                                                </Chip>
                                            );
                                        })}
                                    </ChipWrap>
                                )}
                                {/* 자격증/면허 필드일 경우 자격증 페어 */}
                                {isCertField && (
                                    <CertSection>
                                        {certs.map((cert) => (
                                            <CertCard key={cert.id}>
                                                <CertCardHeader>
                                                    <CertNameInput
                                                        type="text"
                                                        placeholder={field.placeholder || "자격증명"}
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
                                )}
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
                            {submitting ? "신청 중..." : "신청하기"}
                        </ActionBtn>
                    </>
                )}
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
    font-size: 14px;
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
    font-size: 12px;
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
    font-size: 17px;
    font-weight: 700;
    color: ${THEME.text};
    letter-spacing: -0.03em;
    margin-bottom: 14px;
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

const CatCheckBadge = styled.div`
    position: absolute;
    top: -4px;
    right: -4px;
    background: #fff;
    border-radius: 50%;
    line-height: 0;
`;

const CatGridName = styled.div`
    font-size: 12px;
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
    font-size: 13px;
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
    font-size: 15px;
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
    font-size: 15px;
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
    font-size: 12px;
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
    font-size: 14px;
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
    font-size: 13px;
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
    font-size: 14px;
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
    font-size: 14px;
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
    font-size: 12px;
    font-weight: 400;
    color: ${THEME.muted};
`;

const PhotoHint = styled.div`
    font-size: 12px;
    color: ${THEME.muted};
    margin-top: 8px;
`;

/* ─── Region Select ─── */
const RegionSelectBtn = styled.button`
    width: 100%;
    padding: 14px 16px;
    border: 1.5px solid ${THEME.border};
    border-radius: 10px;
    font-size: 15px;
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
    font-size: 16px;
    font-weight: 400;
    font-family: inherit;
    cursor: ${({ $active }) => ($active ? "pointer" : "default")};
    transition: background 0.2s;
    &:active {
        opacity: ${({ $active }) => ($active ? 0.9 : 1)};
    }
`;
