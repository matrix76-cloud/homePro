/* eslint-disable */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../api/config";
import { useAuth } from "../../context/AuthContext";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import RegionSelectModal from "../../modal/RegionSelectModal";

/* ─── Toast ─── */
const ToastWrap = styled.div`
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  background: ${THEME.text};
  color: #fff;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 13px;
  z-index: 9999;
  opacity: ${({ $show }) => ($show ? 1 : 0)};
  transition: opacity 0.25s;
  pointer-events: none;
  max-width: 320px;
  text-align: center;
`;

/* ─── Styled ─── */
const PageWrap = styled.div`
  padding: 12px 12px 100px;
`;

const Section = styled.div`
  background: ${THEME.surface};
  padding: 20px;
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
  margin-bottom: 12px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.text};
  margin-bottom: 8px;
`;

const Required = styled.span`
  color: ${THEME.danger};
  margin-left: 2px;
`;

const Input = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border: 1.5px solid ${THEME.border};
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  color: ${THEME.text};
  background: ${THEME.surface};
  outline: none;
  transition: border-color 0.2s;
  &:focus {
    border-color: ${THEME.primary};
  }
  &::placeholder {
    color: ${THEME.muted};
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border: 1.5px solid ${THEME.border};
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  color: ${THEME.text};
  background: ${THEME.surface};
  outline: none;
  min-height: 120px;
  resize: vertical;
  transition: border-color 0.2s;
  &:focus {
    border-color: ${THEME.primary};
  }
  &::placeholder {
    color: ${THEME.muted};
  }
`;

const RowGroup = styled.div`
  display: flex;
  gap: 10px;
  & > div { flex: 1; }
`;

const SubmitBar = styled.div`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 400px;
  padding: 12px;
  box-sizing: border-box;
  background: ${THEME.surface};
  box-shadow: 0 -1px 4px rgba(0,0,0,0.06);
  z-index: 100;
`;

const SubmitBtn = styled.button`
  width: 100%;
  padding: 14px 0;
  border: none;
  border-radius: 10px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
  &:active {
    opacity: 0.85;
  }
`;

const FieldGap = styled.div`
  margin-bottom: 16px;
  &:last-child { margin-bottom: 0; }
`;

const RegionBtn = styled.button`
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border: 1.5px solid ${THEME.border};
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  color: ${THEME.text};
  background: ${THEME.surface};
  text-align: left;
  cursor: pointer;
  &:active { border-color: ${THEME.primary}; }
`;

/* ─── Component ─── */
const TrainingCreatePage = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();

  const [form, setForm] = useState({
    title: "",
    description: "",
    instructor: "",
    startDate: "",
    endDate: "",
    capacity: "",
    price: "",
    contact: "",
  });
  const [region, setRegion] = useState(null);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  const handleChange = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return showToast("교육명을 입력해주세요");
    if (!form.description.trim()) return showToast("교육 내용을 입력해주세요");
    if (!form.instructor.trim()) return showToast("강사명을 입력해주세요");

    setSaving(true);
    try {
      await addDoc(collection(db, "homepro_trainings"), {
        title: form.title.trim(),
        description: form.description.trim(),
        instructor: form.instructor.trim(),
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        capacity: form.capacity ? Number(form.capacity) : null,
        price: form.price ? Number(form.price) : 0,
        location: region ? `${region.sido} ${region.gu}` : null,
        region: region || null,
        contact: form.contact.trim() || null,
        createdAt: serverTimestamp(),
        createdBy: userData?.uid || null,
        status: "모집중",
      });
      showToast("등록 완료!");
      setTimeout(() => navigate(-1), 600);
    } catch (err) {
      console.error("TrainingCreate error:", err);
      showToast("저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SimpleBackLayout NAME="기술전수교육 등록" hideFooter>
      <ToastWrap $show={!!toast}>{toast}</ToastWrap>

      <PageWrap>
        {/* 기본 정보 */}
        <Section>
          <FieldGap>
            <Label>교육명<Required>*</Required></Label>
            <Input
              placeholder="예: 인테리어 타일 시공 실습"
              value={form.title}
              onChange={handleChange("title")}
            />
          </FieldGap>

          <FieldGap>
            <Label>교육 내용<Required>*</Required></Label>
            <Textarea
              placeholder="교육 커리큘럼, 대상, 목표 등을 상세히 적어주세요"
              value={form.description}
              onChange={handleChange("description")}
            />
          </FieldGap>

          <FieldGap>
            <Label>강사명<Required>*</Required></Label>
            <Input
              placeholder="강사 이름"
              value={form.instructor}
              onChange={handleChange("instructor")}
            />
          </FieldGap>
        </Section>

        {/* 일정 */}
        <Section>
          <FieldGap>
            <Label>교육 기간</Label>
            <RowGroup>
              <div>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={handleChange("startDate")}
                />
              </div>
              <div>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={handleChange("endDate")}
                />
              </div>
            </RowGroup>
          </FieldGap>
        </Section>

        {/* 모집 / 비용 */}
        <Section>
          <FieldGap>
            <Label>모집 인원</Label>
            <Input
              type="number"
              placeholder="예: 10"
              value={form.capacity}
              onChange={handleChange("capacity")}
            />
          </FieldGap>

          <FieldGap>
            <Label>교육 비용</Label>
            <Input
              type="number"
              placeholder="0 입력 시 무료"
              value={form.price}
              onChange={handleChange("price")}
            />
          </FieldGap>
        </Section>

        {/* 장소 / 연락처 */}
        <Section>
          <FieldGap>
            <Label>교육 장소</Label>
            <RegionBtn onClick={() => setShowRegionModal(true)}>
              {region ? `${region.sido} ${region.gu}` : "지역 선택"}
            </RegionBtn>
          </FieldGap>

          <FieldGap>
            <Label>연락처</Label>
            <Input
              placeholder="전화번호 또는 이메일"
              value={form.contact}
              onChange={handleChange("contact")}
            />
          </FieldGap>
        </Section>
      </PageWrap>

      <RegionSelectModal
        open={showRegionModal}
        onClose={() => setShowRegionModal(false)}
        onSelect={(r) => setRegion(r)}
        defaultValue={region}
      />

      <SubmitBar>
        <SubmitBtn onClick={handleSubmit} disabled={saving}>
          {saving ? "저장 중..." : "등록하기"}
        </SubmitBtn>
      </SubmitBar>
    </SimpleBackLayout>
  );
};

export default TrainingCreatePage;
