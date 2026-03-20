/* eslint-disable */
import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { IoImageOutline, IoCloseCircle } from "react-icons/io5";
import { THEME } from "../../config/homeproConfig";
import { UserContext } from "../../context/User";
import { createPost, uploadCommunityImages } from "../../service/CommunityService";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";

const CommunityWritePage = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const uid = user?.USERS_ID;
  const nickname = user?.USERINFO?.nickname || "익명";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - imageFiles.length;
    const toAdd = files.slice(0, remaining);
    setImageFiles((prev) => [...prev, ...toAdd]);

    toAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => setPreviews((prev) => [...prev, reader.result]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || submitting) return;
    setSubmitting(true);
    try {
      // 임시 postId 생성 (이미지 업로드 경로용)
      const tempId = `${Date.now()}_${uid}`;
      let imageUrls = [];
      if (imageFiles.length > 0) {
        imageUrls = await uploadCommunityImages(imageFiles, tempId);
      }
      await createPost({
        title: title.trim(),
        content: content.trim(),
        images: imageUrls,
        type: "free",
        authorUid: uid,
        authorName: nickname,
      });
      navigate("/community", { replace: true });
    } catch (err) {
      console.error(err);
      alert("등록에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SimpleBackLayout NAME="글쓰기" hideFooter>
      <PageWrap>
        <FormArea>
          <Label>제목</Label>
          <TitleInput
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />

          <Label>내용</Label>
          <ContentArea
            placeholder="내용을 입력하세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <ImageSection>
            <ImageHeader>
              <Label>이미지 ({imageFiles.length}/5)</Label>
              {imageFiles.length < 5 && (
                <ImageAddBtn as="label">
                  <IoImageOutline size={18} color={THEME.primary} />
                  추가
                  <HiddenInput type="file" accept="image/*" multiple onChange={handleImageChange} />
                </ImageAddBtn>
              )}
            </ImageHeader>
            {previews.length > 0 && (
              <PreviewRow>
                {previews.map((src, i) => (
                  <PreviewWrap key={i}>
                    <PreviewImg src={src} alt={`미리보기 ${i + 1}`} />
                    <RemoveBtn onClick={() => removeImage(i)}>
                      <IoCloseCircle size={22} color="#fff" />
                    </RemoveBtn>
                  </PreviewWrap>
                ))}
              </PreviewRow>
            )}
          </ImageSection>
        </FormArea>

        <SubmitBar>
          <SubmitBtn onClick={handleSubmit} disabled={!title.trim() || !content.trim() || submitting}>
            {submitting ? "등록 중..." : "등록"}
          </SubmitBtn>
        </SubmitBar>
      </PageWrap>
    </SimpleBackLayout>
  );
};

export default CommunityWritePage;

/* ===================== Styles ===================== */

const PageWrap = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: ${THEME.surface};
`;

const FormArea = styled.div`
  flex: 1;
  padding: 20px 16px;
  padding-bottom: 80px;
`;

const Label = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.text};
  margin-bottom: 8px;
  margin-top: 16px;
  &:first-child { margin-top: 0; }
`;

const TitleInput = styled.input`
  width: 100%;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1.5px solid ${THEME.border};
  background: ${THEME.background};
  font-size: 15px;
  font-weight: 400;
  font-family: inherit;
  color: ${THEME.text};
  outline: none;
  &::placeholder { color: ${THEME.muted}; }
  &:focus { border-color: ${THEME.primary}; }
`;

const ContentArea = styled.textarea`
  width: 100%;
  min-height: 200px;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1.5px solid ${THEME.border};
  background: ${THEME.background};
  font-size: 15px;
  font-weight: 400;
  font-family: inherit;
  color: ${THEME.text};
  outline: none;
  resize: vertical;
  line-height: 1.6;
  &::placeholder { color: ${THEME.muted}; }
  &:focus { border-color: ${THEME.primary}; }
`;

const ImageSection = styled.div`
  margin-top: 16px;
`;

const ImageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ImageAddBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 10px;
  border: none;
  background: ${THEME.purpleLight};
  color: ${THEME.primary};
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.8; }
`;

const HiddenInput = styled.input`
  display: none;
`;

const PreviewRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 12px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 4px;
  &::-webkit-scrollbar { display: none; }
`;

const PreviewWrap = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const PreviewImg = styled.img`
  width: 80px;
  height: 80px;
  border-radius: 10px;
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

const SubmitBar = styled.div`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 400px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
  background: ${THEME.surface};
  border-top: 1px solid ${THEME.border};
  z-index: 100;
`;

const SubmitBtn = styled.button`
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 10px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.85; }
  &:disabled { background: ${THEME.border}; color: ${THEME.muted}; cursor: default; }
`;
