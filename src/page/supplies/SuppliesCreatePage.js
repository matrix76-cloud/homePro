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

/* ─── styled ─── */

const Wrapper = styled.div`
  padding: 12px 12px 100px;
`;

const Section = styled.div`
  background: ${THEME.surface};
  padding: 20px;
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
  margin-bottom: 12px;
`;

const FieldGroup = styled.div`
  margin-bottom: 18px;
  &:last-child {
    margin-bottom: 0;
  }
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
  padding: 12px 14px;
  font-size: 14px;
  font-family: inherit;
  border: 1.5px solid ${THEME.border};
  border-radius: 10px;
  background: ${THEME.surface};
  color: ${THEME.text};
  box-sizing: border-box;
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
  padding: 12px 14px;
  font-size: 14px;
  font-family: inherit;
  border: 1.5px solid ${THEME.border};
  border-radius: 10px;
  background: ${THEME.surface};
  color: ${THEME.text};
  box-sizing: border-box;
  outline: none;
  resize: vertical;
  min-height: 100px;
  transition: border-color 0.2s;
  &:focus {
    border-color: ${THEME.primary};
  }
  &::placeholder {
    color: ${THEME.muted};
  }
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ToggleTrack = styled.div`
  width: 48px;
  height: 28px;
  border-radius: 14px;
  background: ${({ $on }) => ($on ? THEME.primary : THEME.border)};
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
`;

const ToggleThumb = styled.div`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  position: absolute;
  top: 3px;
  left: ${({ $on }) => ($on ? "23px" : "3px")};
  transition: left 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
`;

const SubmitButton = styled.button`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 400px;
  padding: 16px;
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  color: #fff;
  background: ${THEME.primary};
  border: none;
  cursor: pointer;
  z-index: 10;
  &:active {
    background: ${THEME.primaryDark};
  }
  &:disabled {
    background: ${THEME.muted};
    cursor: not-allowed;
  }
`;

const Toast = styled.div`
  position: fixed;
  bottom: 70px;
  left: 50%;
  transform: translateX(-50%);
  background: ${THEME.text};
  color: #fff;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 13px;
  z-index: 100;
  white-space: nowrap;
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

/* ─── component ─── */

const SuppliesCreatePage = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState(null);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [phone, setPhone] = useState("");
  const [hours, setHours] = useState("");
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);
  const [items, setItems] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return showToast("업체명을 입력해주세요");
    if (!description.trim()) return showToast("업체 소개를 입력해주세요");
    if (!region) return showToast("지역을 선택해주세요");
    if (!phone.trim()) return showToast("연락처를 입력해주세요");

    setSaving(true);
    try {
      const itemList = items
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      await addDoc(collection(db, "homepro_supplies"), {
        name: name.trim(),
        description: description.trim(),
        location: `${region.sido} ${region.gu}`,
        region,
        phone: phone.trim(),
        hours: hours.trim(),
        deliveryAvailable,
        items: itemList,
        createdAt: serverTimestamp(),
        createdBy: userData?.uid || null,
      });

      navigate(-1);
    } catch (e) {
      console.error("업체 등록 실패:", e);
      showToast("저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SimpleBackLayout NAME="업체 등록" hideFooter>
      <Wrapper>
        <Section>
          <FieldGroup>
            <Label>업체명<Required>*</Required></Label>
            <Input
              placeholder="업체명을 입력하세요"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FieldGroup>

          <FieldGroup>
            <Label>업체 소개<Required>*</Required></Label>
            <Textarea
              placeholder="업체를 소개해주세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FieldGroup>

          <FieldGroup>
            <Label>지역<Required>*</Required></Label>
            <RegionBtn onClick={() => setShowRegionModal(true)}>
              {region ? `${region.sido} ${region.gu}` : "지역 선택"}
            </RegionBtn>
          </FieldGroup>

          <FieldGroup>
            <Label>연락처<Required>*</Required></Label>
            <Input
              placeholder="예: 010-1234-5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </FieldGroup>

          <FieldGroup>
            <Label>영업시간</Label>
            <Input
              placeholder="예: 09:00~18:00"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </FieldGroup>

          <FieldGroup>
            <Label>배송 가능 여부</Label>
            <ToggleRow>
              <span style={{ fontSize: 14, color: THEME.textSecondary }}>
                {deliveryAvailable ? "가능" : "불가능"}
              </span>
              <ToggleTrack
                $on={deliveryAvailable}
                onClick={() => setDeliveryAvailable((v) => !v)}
              >
                <ToggleThumb $on={deliveryAvailable} />
              </ToggleTrack>
            </ToggleRow>
          </FieldGroup>

          <FieldGroup>
            <Label>취급 품목</Label>
            <Textarea
              placeholder={"품목을 줄바꿈으로 구분해 입력하세요\n예:\n시멘트\n페인트\n전동드릴"}
              value={items}
              onChange={(e) => setItems(e.target.value)}
              style={{ minHeight: 120 }}
            />
          </FieldGroup>
        </Section>
      </Wrapper>

      <SubmitButton onClick={handleSubmit} disabled={saving}>
        {saving ? "저장 중..." : "업체 등록"}
      </SubmitButton>

      <RegionSelectModal
        open={showRegionModal}
        onClose={() => setShowRegionModal(false)}
        onSelect={(r) => setRegion(r)}
        defaultValue={region}
      />

      {toast && <Toast>{toast}</Toast>}
    </SimpleBackLayout>
  );
};

export default SuppliesCreatePage;
