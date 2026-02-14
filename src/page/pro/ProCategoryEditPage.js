/* eslint-disable */
import React, { useContext, useState, useRef, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { UserContext } from "../../context/User";
import { CATEGORIES, THEME, PRO_DETAIL_FIELDS } from "../../config/homeproConfig";
import { getProCategoryDoc, uploadBusinessLicense, uploadActivityPhotos, registerProCategory } from "../../service/ProService";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoCameraOutline, IoCloseCircle, IoDocumentOutline, IoImageOutline } from "react-icons/io5";

const ProCategoryEditPage = () => {
    const navigate = useNavigate();
    const { categoryId } = useParams();
    const { user } = useContext(UserContext);

    const [loading, setLoading] = useState(true);
    const [selectedSubs, setSelectedSubs] = useState([]);
    const [experience, setExperience] = useState("");
    const [intro, setIntro] = useState("");
    const [region, setRegion] = useState("");
    const [extraFields, setExtraFields] = useState({});
    const [certs, setCerts] = useState([]);
    const certFileRefs = useRef({});
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [existingLicenseUrl, setExistingLicenseUrl] = useState(null);
    const [activityPhotos, setActivityPhotos] = useState([]);
    const [existingPhotoUrls, setExistingPhotoUrls] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const fileRef = useRef(null);
    const activityFileRef = useRef(null);

    const uid = user?.USERS_ID;
    const cat = CATEGORIES.find((c) => c.id === categoryId);

    const catDetailFields = useMemo(
        () => PRO_DETAIL_FIELDS[categoryId] || [],
        [categoryId]
    );
    const hasSubcategories = cat?.subcategories?.length > 0;

    // 기존 데이터 로드
    useEffect(() => {
        if (!uid || !categoryId) return;
        getProCategoryDoc(uid, categoryId).then((data) => {
            if (!data) { setLoading(false); return; }
            const d = data.detail || {};
            setSelectedSubs(d.subcategories || []);
            setExperience(d.experience || "");
            setIntro(d.intro || "");
            setRegion(d.region || "");
            setCerts(d.certs || []);
            setExistingLicenseUrl(data.licenseUrl || null);
            setExistingPhotoUrls(data.photoUrls || []);
            // extraFields 복원
            const extras = {};
            catDetailFields.forEach((f) => {
                if (d[f.key] !== undefined) extras[f.key] = d[f.key];
            });
            setExtraFields(extras);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [uid, categoryId]);

    // handlers
    const toggleSub = (sub) => {
        setSelectedSubs((prev) => prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]);
    };
    const updateExtra = (key, value) => setExtraFields((prev) => ({ ...prev, [key]: value }));
    const toggleExtraChip = (key, value) => {
        setExtraFields((prev) => {
            const arr = prev[key] || [];
            return { ...prev, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
        });
    };

    // cert handlers
    const addCert = () => setCerts((prev) => [...prev, { id: Date.now(), certName: "", file: null, preview: null }]);
    const updateCertName = (id, name) => setCerts((prev) => prev.map((c) => (c.id === id ? { ...c, certName: name } : c)));
    const handleCertPhoto = (id, e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setCerts((prev) => prev.map((c) => (c.id === id ? { ...c, file, preview: reader.result } : c)));
        reader.readAsDataURL(file);
        e.target.value = "";
    };
    const removeCert = (id) => setCerts((prev) => prev.filter((c) => c.id !== id));

    // image handlers
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
        const total = existingPhotoUrls.length + activityPhotos.length;
        const remaining = 10 - total;
        files.slice(0, remaining).forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setActivityPhotos((prev) => {
                    if (existingPhotoUrls.length + prev.length >= 10) return prev;
                    return [...prev, { id: Date.now() + Math.random(), file, preview: reader.result }];
                });
            };
            reader.readAsDataURL(file);
        });
        e.target.value = "";
    };
    const removeActivityPhoto = (id) => setActivityPhotos((prev) => prev.filter((p) => p.id !== id));
    const removeExistingPhoto = (idx) => setExistingPhotoUrls((prev) => prev.filter((_, i) => i !== idx));

    const handleSubmit = async () => {
        if (submitting) return;
        if (!uid) { alert("로그인이 필요합니다."); return; }
        const licenseUrl = existingLicenseUrl;
        if (!licenseUrl && !imageFile) { alert("사업자등록증을 첨부해주세요."); return; }
        setSubmitting(true);
        try {
            const finalLicenseUrl = imageFile
                ? await uploadBusinessLicense(uid, categoryId, imageFile)
                : licenseUrl;
            const newPhotoUrls = activityPhotos.length > 0
                ? await uploadActivityPhotos(uid, categoryId, activityPhotos.map((p) => p.file))
                : [];
            const allPhotoUrls = [...existingPhotoUrls, ...newPhotoUrls];
            await registerProCategory(uid, categoryId, finalLicenseUrl, allPhotoUrls, {
                subcategories: selectedSubs,
                experience,
                intro,
                region,
                certs: certs.map((c) => ({ certName: c.certName })),
                ...extraFields,
            });
            alert("프로필이 수정되었습니다.");
            navigate(-1);
        } catch (err) {
            console.error("edit error:", err);
            alert("수정 중 오류가 발생했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    const totalPhotos = existingPhotoUrls.length + activityPhotos.length;
    const canSubmit = experience.trim() !== "" && intro.trim() !== "" && (!!imageFile || !!existingLicenseUrl) && !submitting;

    if (!cat) return null;
    if (loading) return <SimpleBackLayout NAME="수정" hideFooter><LoadingWrap>불러오는 중...</LoadingWrap></SimpleBackLayout>;

    return (
        <SimpleBackLayout NAME={`${cat.shortName} 수정`} hideFooter>
            <PageWrap>
                {hasSubcategories && (
                    <Section>
                        <SectionTitle>전문분야 선택 (복수 선택 가능)</SectionTitle>
                        <ChipWrap>
                            {cat.subcategories.map((sub) => (
                                <Chip key={sub} $active={selectedSubs.includes(sub)} onClick={() => toggleSub(sub)}>{sub}</Chip>
                            ))}
                        </ChipWrap>
                    </Section>
                )}

                {catDetailFields.map((field) => {
                    const isCertField = ["certifications", "licenseNumber", "permits"].includes(field.key);
                    return (
                    <Section key={field.key}>
                        <SectionTitle>{field.label}</SectionTitle>
                        {field.type === "text" && <StyledInput type="text" placeholder={field.placeholder} value={extraFields[field.key] || ""} onChange={(e) => updateExtra(field.key, e.target.value)} />}
                        {field.type === "number" && <StyledInput type="number" placeholder={field.placeholder} value={extraFields[field.key] || ""} onChange={(e) => updateExtra(field.key, e.target.value)} min="0" inputMode="numeric" />}
                        {field.type === "textarea" && <StyledTextarea placeholder={field.placeholder} value={extraFields[field.key] || ""} onChange={(e) => updateExtra(field.key, e.target.value)} rows={3} />}
                        {field.type === "chips" && (
                            <ChipWrap>
                                {field.options.map((opt) => (
                                    <Chip key={opt} $active={(extraFields[field.key] || []).includes(opt)} onClick={() => toggleExtraChip(field.key, opt)}>{opt}</Chip>
                                ))}
                            </ChipWrap>
                        )}
                        {isCertField && (
                            <CertSection>
                                {certs.map((cert) => (
                                    <CertCard key={cert.id}>
                                        <CertCardHeader>
                                            <CertNameInput type="text" placeholder={field.placeholder || "자격증명"} value={cert.certName} onChange={(e) => updateCertName(cert.id, e.target.value)} />
                                            <RemoveBtn onClick={() => removeCert(cert.id)}><IoCloseCircle size={22} color={THEME.danger} /></RemoveBtn>
                                        </CertCardHeader>
                                        <CertPhotoArea onClick={() => certFileRefs.current[cert.id]?.click()}>
                                            {cert.preview ? <CertPhotoPreview src={cert.preview} /> : <CertPlaceholder><IoCameraOutline size={28} color={THEME.muted} /><SmallText>사진 첨부</SmallText></CertPlaceholder>}
                                        </CertPhotoArea>
                                        <HiddenInput ref={(el) => (certFileRefs.current[cert.id] = el)} type="file" accept="image/*,.pdf" onChange={(e) => handleCertPhoto(cert.id, e)} />
                                    </CertCard>
                                ))}
                                <AddBtn onClick={addCert}><IoDocumentOutline size={20} color={THEME.primary} /><AddBtnText>자격증 추가하기</AddBtnText></AddBtn>
                            </CertSection>
                        )}
                    </Section>
                    );
                })}

                <Section>
                    <SectionTitle>경력 (년)</SectionTitle>
                    <StyledInput type="number" placeholder="예: 5" value={experience} onChange={(e) => setExperience(e.target.value)} min="0" inputMode="numeric" />
                </Section>

                <Section>
                    <SectionTitle>한줄 소개</SectionTitle>
                    <StyledTextarea placeholder="고객에게 보여질 한줄 소개를 입력하세요" value={intro} onChange={(e) => setIntro(e.target.value)} rows={3} maxLength={100} />
                    <CharCount>{intro.length}/100</CharCount>
                </Section>

                <Section>
                    <SectionTitle>활동 지역</SectionTitle>
                    <StyledInput type="text" placeholder="예: 서울 강남구, 서초구" value={region} onChange={(e) => setRegion(e.target.value)} />
                </Section>

                {/* 사업자등록증 */}
                <Section>
                    <SectionTitle>사업자등록증</SectionTitle>
                    <UploadBox onClick={() => fileRef.current?.click()}>
                        {imagePreview ? <PreviewImg src={imagePreview} /> : existingLicenseUrl ? <PreviewImg src={existingLicenseUrl} /> : (
                            <UploadPlaceholder><IoCameraOutline size={36} color={THEME.muted} /><SmallText>사진 첨부하기</SmallText></UploadPlaceholder>
                        )}
                    </UploadBox>
                    <HiddenInput ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} />
                </Section>

                {/* 활동 사진 */}
                <Section>
                    <SectionTitle>활동 사진 ({totalPhotos}/10)</SectionTitle>
                    <PhotoGrid>
                        {existingPhotoUrls.map((url, i) => (
                            <PhotoItem key={`ex-${i}`}>
                                <PhotoThumb src={url} />
                                <PhotoRemoveBtn onClick={() => removeExistingPhoto(i)}><IoCloseCircle size={22} color="#fff" /></PhotoRemoveBtn>
                            </PhotoItem>
                        ))}
                        {activityPhotos.map((photo) => (
                            <PhotoItem key={photo.id}>
                                <PhotoThumb src={photo.preview} />
                                <PhotoRemoveBtn onClick={() => removeActivityPhoto(photo.id)}><IoCloseCircle size={22} color="#fff" /></PhotoRemoveBtn>
                            </PhotoItem>
                        ))}
                        {totalPhotos < 10 && (
                            <PhotoAddBtn onClick={() => activityFileRef.current?.click()}>
                                <IoImageOutline size={28} color={THEME.muted} /><SmallText>추가</SmallText>
                            </PhotoAddBtn>
                        )}
                    </PhotoGrid>
                    <HiddenInput ref={activityFileRef} type="file" accept="image/*" multiple onChange={handleActivityPhotos} />
                </Section>

                <ActionBtn disabled={!canSubmit} $active={canSubmit} onClick={handleSubmit}>
                    {submitting ? "저장 중..." : "저장하기"}
                </ActionBtn>
            </PageWrap>
        </SimpleBackLayout>
    );
};

export default ProCategoryEditPage;

/* ===================== styles ===================== */
const PageWrap = styled.div`padding: 20px 16px 40px; display: flex; flex-direction: column; gap: 24px;`;
const LoadingWrap = styled.div`padding: 60px 0; text-align: center; color: ${THEME.muted}; font-size: 14px;`;
const Section = styled.div``;
const SectionTitle = styled.div`font-size: 17px; font-weight: 400; color: ${THEME.text}; letter-spacing: -0.03em; margin-bottom: 14px;`;
const ChipWrap = styled.div`display: flex; flex-wrap: wrap; gap: 8px;`;
const Chip = styled.div`padding: 8px 14px; border-radius: 20px; font-size: 13px; font-weight: 400; cursor: pointer; background: ${({ $active }) => ($active ? THEME.primary : THEME.surface)}; color: ${({ $active }) => ($active ? "#fff" : THEME.text)}; border: 1.5px solid ${({ $active }) => ($active ? THEME.primary : THEME.border)}; &:active { opacity: 0.8; }`;
const StyledInput = styled.input`width: 100%; padding: 14px 16px; border: 1.5px solid ${THEME.border}; border-radius: 4px; font-size: 15px; font-family: inherit; color: ${THEME.text}; background: ${THEME.surface}; outline: none; box-sizing: border-box; &:focus { border-color: ${THEME.primary}; } &::placeholder { color: ${THEME.muted}; }`;
const StyledTextarea = styled.textarea`width: 100%; padding: 14px 16px; border: 1.5px solid ${THEME.border}; border-radius: 4px; font-size: 15px; font-family: inherit; color: ${THEME.text}; background: ${THEME.surface}; outline: none; resize: none; box-sizing: border-box; &:focus { border-color: ${THEME.primary}; } &::placeholder { color: ${THEME.muted}; }`;
const CharCount = styled.div`text-align: right; font-size: 12px; color: ${THEME.muted}; margin-top: 6px;`;
const SmallText = styled.div`font-size: 13px; font-weight: 400; color: ${THEME.muted};`;

/* cert */
const CertSection = styled.div`margin-top: 14px; display: flex; flex-direction: column; gap: 10px;`;
const CertCard = styled.div`border: 1px solid ${THEME.border}; border-radius: 4px; padding: 12px; background: ${THEME.surface};`;
const CertCardHeader = styled.div`display: flex; align-items: center; gap: 8px; margin-bottom: 10px;`;
const CertNameInput = styled.input`flex: 1; padding: 10px 12px; border: 1.5px solid ${THEME.border}; border-radius: 4px; font-size: 14px; font-family: inherit; color: ${THEME.text}; background: #fff; outline: none; box-sizing: border-box; &:focus { border-color: ${THEME.primary}; } &::placeholder { color: ${THEME.muted}; }`;
const RemoveBtn = styled.button`background: none; border: none; padding: 2px; cursor: pointer; display: flex; align-items: center; &:active { opacity: 0.6; }`;
const CertPhotoArea = styled.div`width: 100%; min-height: 100px; border: 2px dashed ${THEME.border}; border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; background: ${THEME.background}; &:active { opacity: 0.8; }`;
const CertPhotoPreview = styled.img`width: 100%; height: auto; max-height: 200px; object-fit: contain;`;
const CertPlaceholder = styled.div`display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 16px;`;
const AddBtn = styled.div`display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; border: 2px dashed ${THEME.border}; border-radius: 4px; cursor: pointer; &:active { background: ${THEME.surface}; }`;
const AddBtnText = styled.div`font-size: 14px; font-weight: 400; color: ${THEME.primary};`;

/* upload */
const UploadBox = styled.div`width: 100%; min-height: 160px; border: 2px dashed ${THEME.border}; border-radius: 4px; background: ${THEME.surface}; display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; &:active { opacity: 0.8; }`;
const UploadPlaceholder = styled.div`display: flex; flex-direction: column; align-items: center; gap: 8px;`;
const PreviewImg = styled.img`width: 100%; height: auto; max-height: 300px; object-fit: contain;`;
const HiddenInput = styled.input`display: none;`;

/* photos */
const PhotoGrid = styled.div`display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;`;
const PhotoItem = styled.div`position: relative; aspect-ratio: 1; border-radius: 4px; overflow: hidden;`;
const PhotoThumb = styled.img`width: 100%; height: 100%; object-fit: cover;`;
const PhotoRemoveBtn = styled.button`position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.5); border: none; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; padding: 0; cursor: pointer;`;
const PhotoAddBtn = styled.div`aspect-ratio: 1; border: 2px dashed ${THEME.border}; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; cursor: pointer; &:active { background: ${THEME.surface}; }`;

/* action */
const ActionBtn = styled.button`width: 100%; padding: 16px; border: none; border-radius: 4px; background: ${({ $active }) => ($active ? THEME.primary : THEME.border)}; color: ${({ $active }) => ($active ? "#fff" : THEME.muted)}; font-size: 16px; font-weight: 400; font-family: inherit; cursor: ${({ $active }) => ($active ? "pointer" : "default")}; &:active { opacity: ${({ $active }) => ($active ? 0.9 : 1)}; }`;
