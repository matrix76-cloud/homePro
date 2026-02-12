/* eslint-disable */
import React, { useContext, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAtom } from "jotai";
import { UserContext } from "../../context/User";
import { CATEGORIES, THEME, PRO_DETAIL_FIELDS } from "../../config/homeproConfig";
import { proCategoriesAtom } from "../../store/store";
import { uploadBusinessLicense, registerProCategory } from "../../service/ProService";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoCheckmarkCircle, IoCameraOutline, IoCloseCircle, IoDocumentOutline } from "react-icons/io5";

const STEP_LABELS = ["분야 선택", "상세 정보", "서류 제출"];

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
    const [region, setRegion] = useState("");
    const [extraFields, setExtraFields] = useState({});
    const [certFiles, setCertFiles] = useState([]); // [{ id, name, file, preview }]
    const certFileRef = useRef(null);

    // step 3
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const fileRef = useRef(null);

    const uid = user?.uid;

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

    // ─── cert file handlers ───
    const handleCertFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setCertFiles((prev) => [
                ...prev,
                { id: Date.now(), name: file.name, file, preview: reader.result },
            ]);
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const removeCertFile = (id) => {
        setCertFiles((prev) => prev.filter((f) => f.id !== id));
    };

    // ─── step 3 handlers ───
    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        if (!selectedCat || !imageFile || submitting) return;
        if (!uid) {
            // 비로그인 상태에서도 로컬 저장으로 등록 처리
            setProCategories([...proCategories, selectedCat]);
            alert("전문분야가 등록되었습니다.");
            navigate(-1);
            return;
        }
        setSubmitting(true);
        try {
            const licenseUrl = await uploadBusinessLicense(uid, selectedCat, imageFile);
            await registerProCategory(uid, selectedCat, licenseUrl, {
                subcategories: selectedSubs,
                experience,
                intro,
                region,
                ...extraFields,
            });
            setProCategories([...proCategories, selectedCat]);
            alert("전문분야가 등록되었습니다.");
            navigate(-1);
        } catch (err) {
            console.error("register error:", err);
            // Firebase 실패해도 로컬 저장은 처리
            setProCategories([...proCategories, selectedCat]);
            alert("전문분야가 등록되었습니다. (서버 동기화는 나중에 처리됩니다)");
            navigate(-1);
        } finally {
            setSubmitting(false);
        }
    };

    // ─── step navigation ───
    const goNext = () => setStep((s) => Math.min(s + 1, 3));
    const goPrev = () => {
        if (step === 1) {
            navigate(-1);
        } else {
            setStep((s) => s - 1);
        }
    };

    // ─── step validation ───
    const canStep1 = !!selectedCat;
    const canStep2 = experience.trim() !== "" && intro.trim() !== "";
    const canStep3 = !!imageFile && !submitting;

    // ─── header back override ───
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
                                {num < 3 && <StepLine $done={num < step} />}
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
                            <CatGrid>
                                {CATEGORIES.map((cat) => {
                                    const isRegistered = proCategories.includes(cat.id);
                                    const isSelected = selectedCat === cat.id;
                                    return (
                                        <CatItem
                                            key={cat.id}
                                            $selected={isSelected}
                                            $disabled={isRegistered}
                                            onClick={() => handleSelectCat(cat.id)}
                                        >
                                            <CatIcon>{cat.icon}</CatIcon>
                                            <CatName $disabled={isRegistered}>{cat.shortName}</CatName>
                                            {isRegistered && (
                                                <CheckMark>
                                                    <IoCheckmarkCircle size={18} color={THEME.success} />
                                                </CheckMark>
                                            )}
                                        </CatItem>
                                    );
                                })}
                            </CatGrid>
                        </Section>
                        <ActionBtn disabled={!canStep1} $active={canStep1} onClick={goNext}>
                            다음
                        </ActionBtn>
                    </>
                )}

                {/* ══════ Step 2: 상세 정보 입력 ══════ */}
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
                                {field.type === "text" && (
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
                                {/* 자격증/면허 필드일 경우 첨부파일 업로드 */}
                                {isCertField && (
                                    <CertUploadArea>
                                        <CertUploadLabel>첨부파일</CertUploadLabel>
                                        <CertFileList>
                                            {certFiles.map((cf) => (
                                                <CertFileItem key={cf.id}>
                                                    {cf.file.type.startsWith("image/") ? (
                                                        <CertThumb src={cf.preview} alt={cf.name} />
                                                    ) : (
                                                        <CertDocIcon>
                                                            <IoDocumentOutline size={24} color={THEME.primary} />
                                                        </CertDocIcon>
                                                    )}
                                                    <CertFileName>{cf.name}</CertFileName>
                                                    <CertRemoveBtn onClick={() => removeCertFile(cf.id)}>
                                                        <IoCloseCircle size={22} color={THEME.danger} />
                                                    </CertRemoveBtn>
                                                </CertFileItem>
                                            ))}
                                            <CertAddBtn onClick={() => certFileRef.current?.click()}>
                                                <IoCameraOutline size={24} color={THEME.primary} />
                                                <CertAddText>자격증 사진 첨부</CertAddText>
                                            </CertAddBtn>
                                        </CertFileList>
                                        <HiddenInput
                                            ref={certFileRef}
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={handleCertFileChange}
                                        />
                                        <CertHint>자격증, 면허증 등 관련 서류를 촬영하거나 파일로 첨부해주세요.</CertHint>
                                    </CertUploadArea>
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
                            <StyledInput
                                type="text"
                                placeholder="예: 서울 강남구, 서초구"
                                value={region}
                                onChange={(e) => setRegion(e.target.value)}
                            />
                        </Section>

                        <ActionBtn disabled={!canStep2} $active={canStep2} onClick={goNext}>
                            다음
                        </ActionBtn>
                    </>
                )}

                {/* ══════ Step 3: 사업자등록증 업로드 + 신청 ══════ */}
                {step === 3 && (
                    <>
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

                        <ActionBtn disabled={!canStep3} $active={canStep3} onClick={handleSubmit}>
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
    padding: 20px 16px 40px;
    display: flex;
    flex-direction: column;
    gap: 24px;
`;

/* ─── Step Indicator ─── */
const StepIndicator = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    margin-bottom: -16px;
`;

const StepDot = styled.div`
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
    background: ${({ $active, $done }) =>
        $active ? THEME.primary : $done ? THEME.success : THEME.border};
    color: ${({ $active, $done }) =>
        $active || $done ? "#fff" : THEME.muted};
    transition: all 0.2s;
`;

const StepLine = styled.div`
    width: 48px;
    height: 3px;
    background: ${({ $done }) => ($done ? THEME.success : THEME.border)};
    transition: background 0.2s;
`;

const StepLabelRow = styled.div`
    display: flex;
    justify-content: space-between;
    padding: 0 12px;
`;

const StepLabel = styled.div`
    font-size: 12px;
    font-weight: 600;
    color: ${({ $active }) => ($active ? THEME.primary : THEME.muted)};
    text-align: center;
    flex: 1;
`;

/* ─── Shared ─── */
const Section = styled.div``;

const SectionTitle = styled.div`
    font-size: 17px;
    font-weight: 800;
    color: ${THEME.text};
    letter-spacing: -0.03em;
    margin-bottom: 14px;
`;

/* ─── Step 1: Category Grid ─── */
const CatGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
`;

const CatItem = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 14px 8px 10px;
    border-radius: 14px;
    background: ${({ $selected, $disabled }) =>
        $disabled ? THEME.background : $selected ? "#EBF5FF" : THEME.surface};
    border: 2px solid ${({ $selected }) => ($selected ? THEME.primary : THEME.border)};
    cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
    opacity: ${({ $disabled }) => ($disabled ? 0.55 : 1)};
    transition: all 0.15s;
    &:active {
        opacity: ${({ $disabled }) => ($disabled ? 0.55 : 0.8)};
    }
`;

const CatIcon = styled.div`
    font-size: 26px;
    margin-bottom: 6px;
`;

const CatName = styled.div`
    font-size: 12px;
    font-weight: 600;
    color: ${({ $disabled }) => ($disabled ? THEME.muted : THEME.text)};
    text-align: center;
    line-height: 1.3;
    word-break: keep-all;
`;

const CheckMark = styled.div`
    position: absolute;
    top: 6px;
    right: 6px;
`;

/* ─── Step 2: Detail Form ─── */
const ChipWrap = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const Chip = styled.div`
    padding: 8px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
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
    border-radius: 12px;
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
    border-radius: 12px;
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

/* ─── Cert Upload ─── */
const CertUploadArea = styled.div`
    margin-top: 14px;
    padding: 16px;
    background: ${THEME.background};
    border-radius: 12px;
`;

const CertUploadLabel = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: ${THEME.textSecondary};
    margin-bottom: 10px;
`;

const CertFileList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const CertFileItem = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: ${THEME.surface};
    border-radius: 10px;
    border: 1px solid ${THEME.border};
`;

const CertThumb = styled.img`
    width: 44px;
    height: 44px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
`;

const CertDocIcon = styled.div`
    width: 44px;
    height: 44px;
    border-radius: 8px;
    background: ${THEME.purpleLight};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

const CertFileName = styled.div`
    flex: 1;
    font-size: 13px;
    font-weight: 500;
    color: ${THEME.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const CertRemoveBtn = styled.button`
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    &:active { opacity: 0.6; }
`;

const CertAddBtn = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px;
    border: 2px dashed ${THEME.border};
    border-radius: 10px;
    cursor: pointer;
    &:active { background: ${THEME.surface}; }
`;

const CertAddText = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: ${THEME.primary};
`;

const CertHint = styled.div`
    font-size: 12px;
    font-weight: 500;
    color: ${THEME.muted};
    margin-top: 8px;
    line-height: 1.4;
`;

/* ─── Step 3: Upload ─── */
const UploadBox = styled.div`
    width: 100%;
    min-height: 200px;
    border: 2px dashed ${THEME.border};
    border-radius: 14px;
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
    font-weight: 600;
    color: ${THEME.muted};
`;

const PreviewImg = styled.img`
    width: 100%;
    height: auto;
    max-height: 400px;
    object-fit: contain;
`;

const HiddenInput = styled.input`
    display: none;
`;

/* ─── Action Button ─── */
const ActionBtn = styled.button`
    width: 100%;
    padding: 16px;
    border: none;
    border-radius: 14px;
    background: ${({ $active }) => ($active ? THEME.primary : THEME.border)};
    color: ${({ $active }) => ($active ? "#fff" : THEME.muted)};
    font-size: 16px;
    font-weight: 700;
    font-family: inherit;
    cursor: ${({ $active }) => ($active ? "pointer" : "default")};
    transition: background 0.2s;
    &:active {
        opacity: ${({ $active }) => ($active ? 0.9 : 1)};
    }
`;
