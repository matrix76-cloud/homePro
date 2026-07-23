/* eslint-disable */
// 공동중개 등록 — 손님 찾습니다(demand) / 매물 있습니다(listing, 보안·블라인드)
import React, { useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { UserContext } from "../../context/User";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { createBrokeragePost, DEAL_TYPES, CONTRACT_TYPES } from "../../service/BrokerageService";

const BrokerageCreatePage = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { user } = React.useContext(UserContext);
  const uid = userData?.uid || user?.USERS_ID;

  const [type, setType] = useState("demand"); // demand | listing
  const isListing = type === "listing";
  const [region, setRegion] = useState("");
  const [dealType, setDealType] = useState("");
  const [contractType, setContractType] = useState("");
  const [price, setPrice] = useState("");
  const [oneLine, setOneLine] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!region.trim()) return window.alert("지역을 입력해주세요.");
    if (!oneLine.trim()) return window.alert("한 줄 요약을 입력해주세요.");
    if (busy) return;
    setBusy(true);
    try {
      await createBrokeragePost({
        type,
        region: region.trim(),
        dealType: dealType || "",
        contractType: contractType || "",
        price: price.trim(),
        oneLine: oneLine.trim(),
        detail: detail.trim(),
        authorUid: uid || "",
        authorCompany: userData?.companyName || userData?.nickname || userData?.name || "중개사",
        authorRep: userData?.repName || userData?.name || "",
        authorPhone: userData?.phoneE164 || "",
      });
      window.alert("등록되었습니다.");
      navigate("/brokerage");
    } catch (e) {
      window.alert("등록에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SimpleBackLayout NAME="공동중개 등록">
      <Wrap>
        <Section>
          <Label>유형 선택</Label>
          <Row>
            <TypeBtn $active={!isListing} onClick={() => setType("demand")}>손님 찾습니다</TypeBtn>
            <TypeBtn $active={isListing} onClick={() => setType("listing")}>매물 있습니다</TypeBtn>
          </Row>
          <Hint>{isListing ? "공동매물 등록(보안형) — 상세 번지는 노출되지 않고 '○○시 ○○구 ○○동'까지만 표시됩니다." : "찾는 손님(수요)을 등록합니다. 매물 있는 중개사와 매칭됩니다."}</Hint>
        </Section>

        <Section>
          <Label>지역 <Req>*</Req></Label>
          <Input placeholder="예: 마포구 공덕동" value={region} onChange={(e) => setRegion(e.target.value)} />
          {isListing && <Hint>상세 번지수는 노출되지 않습니다.</Hint>}
        </Section>

        <Section>
          <Label>거래 유형</Label>
          <Chips>
            {DEAL_TYPES.map((t) => (
              <Chip key={t} $active={dealType === t} onClick={() => setDealType(dealType === t ? "" : t)}>{t}</Chip>
            ))}
          </Chips>
        </Section>

        <Section>
          <Label>계약 형태</Label>
          <Chips>
            {CONTRACT_TYPES.map((t) => (
              <Chip key={t} $active={contractType === t} onClick={() => setContractType(contractType === t ? "" : t)}>{t}</Chip>
            ))}
          </Chips>
        </Section>

        <Section>
          <Label>{isListing ? "가격 조건" : "예산 범위"}</Label>
          <Input placeholder="예: 보증금/매매가 · 월세 (만 원)" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Section>

        <Section>
          <Label>한 줄 요약 <Req>*</Req></Label>
          <Input
            placeholder={isListing ? "예: 역세권 코너자리 상가 임대" : "예: 카페 창업 예정 무권리 상가 찾는 손님 대기중"}
            value={oneLine}
            onChange={(e) => setOneLine(e.target.value)}
          />
        </Section>

        <Section>
          <Label>상세 내용</Label>
          <Area
            placeholder={isListing ? "현재 공실, 즉시 입주 가능 등. 상세 주소·내부 사진은 매수 손님 확보하신 중개사님께 채팅으로 오픈해 드립니다." : "실평수, 선호 라인, 렌트프리 협의 가능 여부 등. 매물 있으신 분 채팅 주세요."}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
        </Section>

        <SubmitBtn disabled={busy} onClick={submit}>{busy ? "등록 중..." : "등록하기"}</SubmitBtn>
      </Wrap>
    </SimpleBackLayout>
  );
};

export default BrokerageCreatePage;

const Wrap = styled.div` padding: 12px 12px 40px; background: ${THEME.background}; min-height: 100%; `;
const Section = styled.div` background: ${THEME.surface}; margin: 0 0 10px; padding: 16px; border-radius: 14px; box-shadow: ${THEME.cardShadow}; `;
const Label = styled.div` font-size: 14px; font-weight: 700; color: ${THEME.text}; margin-bottom: 10px; `;
const Req = styled.span` color: #ef4444; `;
const Hint = styled.div` margin-top: 8px; font-size: 12px; color: ${THEME.muted}; line-height: 1.5; `;
const Row = styled.div` display: flex; gap: 10px; `;
const TypeBtn = styled.button`
  flex: 1; height: 48px; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit;
  border: 1px solid ${({ $active }) => ($active ? THEME.primary : THEME.border)};
  background: ${({ $active }) => ($active ? THEME.primary : THEME.surface)};
  color: ${({ $active }) => ($active ? "#fff" : THEME.text)};
`;
const Chips = styled.div` display: flex; flex-wrap: wrap; gap: 8px; `;
const Chip = styled.button`
  padding: 8px 14px; border-radius: 20px; font-size: 13px; cursor: pointer; font-family: inherit; white-space: nowrap;
  border: 1px solid ${({ $active }) => ($active ? THEME.primary : THEME.border)};
  background: ${({ $active }) => ($active ? THEME.primary : THEME.surface)};
  color: ${({ $active }) => ($active ? "#fff" : THEME.text)};
`;
const Input = styled.input`
  width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid ${THEME.border}; border-radius: 10px;
  font-size: 14px; font-family: inherit; outline: none; &:focus { border-color: ${THEME.primary}; }
`;
const Area = styled.textarea`
  width: 100%; box-sizing: border-box; min-height: 96px; padding: 12px; border: 1px solid ${THEME.border}; border-radius: 10px;
  font-size: 14px; font-family: inherit; resize: vertical; outline: none; &:focus { border-color: ${THEME.primary}; }
`;
const SubmitBtn = styled.button`
  width: 100%; padding: 16px; margin-top: 6px; background: ${THEME.primary}; color: #fff; border: none; border-radius: 10px;
  font-size: 16px; font-weight: 600; cursor: pointer; font-family: inherit;
  &:disabled { background: #ccc; }
`;
