/* eslint-disable */
/**
 * 홈프로 1일 안심케어 (상해 + 배상책임 통합 미니보험)
 *
 * 대표님 지시(2026-08-04 리뷰 chat-list): 하단탭의 교육.장터 자리를 이 상품에 내주고,
 * 교육.장터는 마이 안으로 옮긴다.
 *
 * 주의 — 상품은 아직 인수(보험사) 협의 단계다. 보험료·보장금액을 확정된 것처럼 쓰면
 * 그 자체가 허위 안내가 되므로, 이 화면은 "출시 예정 안내 + 사전 신청 접수"까지만 한다.
 * 조건이 확정되면 COVERAGE 표와 안내 문구를 실제 약관 값으로 교체할 것.
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "../../api/config";
import { THEME } from "../../config/homeproConfig";
import MainListLayout from "../../screen/Layout/Layout/MainListLayout";
import { useAuth } from "../../context/AuthContext";
import {
  IoShieldCheckmarkOutline, IoCheckmarkCircle, IoTimeOutline,
  IoConstructOutline, IoHomeOutline,
} from "react-icons/io5";

const COLLECTION = "insurance_interests";

/** 협의 중인 보장 구성 — 확정 시 실제 약관 값으로 교체 */
const COVERAGE = [
  { key: "injury", title: "작업자 상해", desc: "작업 중 다쳤을 때의 치료비·입원비 보장", Icon: IoConstructOutline },
  { key: "liability", title: "배상책임", desc: "작업 중 고객의 재물을 파손했을 때의 배상 보장", Icon: IoHomeOutline },
];

const InsurancePage = () => {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const uid = userData?.uid || user?.uid;

  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [toast, setToast] = useState("");

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!uid) { setChecking(false); return; }
      try {
        const snap = await getDocs(query(collection(db, COLLECTION), where("uid", "==", uid)));
        if (alive) setApplied(!snap.empty);
      } catch (e) {
        console.warn("사전신청 조회 실패:", e.message);
      }
      if (alive) setChecking(false);
    })();
    return () => { alive = false; };
  }, [uid]);

  const apply = async () => {
    if (busy || applied) return;
    if (!uid) { showToast("로그인 후 신청할 수 있습니다"); return; }
    setBusy(true);
    try {
      await addDoc(collection(db, COLLECTION), {
        uid,
        name: userData?.nickname || userData?.name || "",
        phone: userData?.phone || "",
        companyName: userData?.companyName || "",
        createdAt: serverTimestamp(),
      });
      setApplied(true);
      showToast("사전 신청이 접수되었습니다");
    } catch (e) {
      showToast("신청에 실패했습니다. 잠시 후 다시 시도해 주세요");
    }
    setBusy(false);
  };

  return (
    <MainListLayout NAME="안심케어" footerType="insurance" hideBack>
      <Wrap>
        <Hero>
          <HeroBadgeRow>
            <IoShieldCheckmarkOutline size={19} color={THEME.primary} />
            출시 준비 중
          </HeroBadgeRow>
          <HeroTitle>홈프로 1일 안심케어</HeroTitle>
          <HeroSub>상해 + 배상책임을 하나로 묶은, 일한 날만 가입하는 하루짜리 보험</HeroSub>
        </Hero>

        <Card>
          <CardTitle>이런 걱정, 하루치만 덜어드립니다</CardTitle>
          <CardText>
            현장에서 다치거나 고객의 물건을 파손하면 그 부담이 온전히 사장님 몫으로 돌아옵니다.
            연 단위 보험은 부담스럽고, 안 드는 것도 불안한 상황을 겨냥해
            일한 날 하루만 가입하는 형태로 준비하고 있습니다.
          </CardText>
        </Card>

        <Card>
          <CardTitle>준비 중인 보장</CardTitle>
          <CoverList>
            {COVERAGE.map(({ key, title, desc, Icon }) => (
              <CoverRow key={key}>
                <CoverIcon><Icon size={20} color={THEME.primary} /></CoverIcon>
                <div>
                  <CoverTitle>{title}</CoverTitle>
                  <CoverDesc>{desc}</CoverDesc>
                </div>
              </CoverRow>
            ))}
          </CoverList>
          <CardNote>
            보험료는 건당 3,000~5,000원 수준으로 협의 중입니다.
            보장 한도와 최종 보험료는 보험사와의 계약이 확정되는 시점에 안내드립니다.
          </CardNote>
        </Card>

        <Card>
          <CardTitle>이용 방법 (예정)</CardTitle>
          <StepList>
            <StepRow><StepNo>1</StepNo><StepText>오더를 수락하면 그 작업일에 맞춰 가입 안내를 받습니다.</StepText></StepRow>
            <StepRow><StepNo>2</StepNo><StepText>가입은 건당 결제로 끝나고, 해당 작업일 하루 동안 보장됩니다.</StepText></StepRow>
            <StepRow><StepNo>3</StepNo><StepText>사고가 나면 현장기록의 사진·시각·위치가 그대로 청구 증빙이 됩니다.</StepText></StepRow>
          </StepList>
          <LinkLine onClick={() => navigate("/support")}>
            현장기록이 무엇인지 궁금하다면 고객센터에서 확인하세요
          </LinkLine>
        </Card>

        <ApplyArea>
          {checking ? (
            <ApplyBtn disabled>확인 중...</ApplyBtn>
          ) : applied ? (
            <AppliedBox>
              <IoCheckmarkCircle size={19} color={THEME.primary} />
              사전 신청이 접수되었습니다. 출시되면 가장 먼저 알려드릴게요.
            </AppliedBox>
          ) : (
            <>
              <ApplyBtn onClick={apply} disabled={busy}>
                {busy ? "접수 중..." : "출시 알림 사전 신청"}
              </ApplyBtn>
              <ApplyNote>
                <IoTimeOutline size={14} color={THEME.muted} />
                신청하시면 가입이 열리는 즉시 알려드립니다. 지금 결제되는 금액은 없습니다.
              </ApplyNote>
            </>
          )}
        </ApplyArea>

        <Disclaimer>
          본 화면은 준비 중인 상품에 대한 사전 안내이며, 보험 계약의 청약·체결이 아닙니다.
          보장 내용·보험료·인수 조건은 보험사 심사 결과에 따라 달라질 수 있습니다.
        </Disclaimer>
      </Wrap>
      {toast && <Toast>{toast}</Toast>}
    </MainListLayout>
  );
};

export default InsurancePage;

/* ===================== styles ===================== */

const Wrap = styled.div`
  padding: 12px;
  padding-bottom: 40px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 560px;
`;

const Hero = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 24px 20px;
  box-shadow: ${THEME.cardShadow};
`;

const HeroBadgeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.primaryDark};
`;

const HeroTitle = styled.div`
  margin-top: 10px;
  font-size: 23px;
  font-weight: 700;
  color: ${THEME.text};
  letter-spacing: -0.03em;
`;

const HeroSub = styled.div`
  margin-top: 8px;
  font-size: 16px;
  color: ${THEME.textSecondary};
  line-height: 1.6;
  word-break: keep-all;
`;

const Card = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  box-shadow: ${THEME.cardShadow};
`;

const CardTitle = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
`;

const CardText = styled.div`
  margin-top: 10px;
  font-size: 16px;
  line-height: 1.7;
  color: ${THEME.textSecondary};
  word-break: keep-all;
`;

const CardNote = styled.div`
  margin-top: 14px;
  font-size: 14px;
  line-height: 1.6;
  color: ${THEME.muted};
  word-break: keep-all;
`;

const CoverList = styled.div`
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const CoverRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const CoverIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: ${THEME.background};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const CoverTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${THEME.text};
`;

const CoverDesc = styled.div`
  margin-top: 3px;
  font-size: 15px;
  color: ${THEME.textSecondary};
  line-height: 1.5;
  word-break: keep-all;
`;

const StepList = styled.div`
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const StepRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
`;

const StepNo = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: ${THEME.background};
  color: ${THEME.textSecondary};
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const StepText = styled.div`
  flex: 1;
  font-size: 16px;
  line-height: 1.6;
  color: ${THEME.textSecondary};
  word-break: keep-all;
`;

const LinkLine = styled.div`
  margin-top: 16px;
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.primaryDark};
  cursor: pointer;
  &:active { opacity: 0.7; }
`;

const ApplyArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ApplyBtn = styled.button`
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 10px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  &:disabled { opacity: 0.5; }
  &:active { background: ${THEME.primaryDark}; }
`;

const ApplyNote = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  justify-content: center;
  font-size: 14px;
  color: ${THEME.muted};
  word-break: keep-all;
`;

const AppliedBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: ${THEME.surface};
  border-radius: 12px;
  box-shadow: ${THEME.cardShadow};
  font-size: 15px;
  color: ${THEME.textSecondary};
  line-height: 1.5;
  word-break: keep-all;
`;

const Disclaimer = styled.div`
  padding: 4px 6px;
  font-size: 13px;
  line-height: 1.6;
  color: ${THEME.muted};
  word-break: keep-all;
`;

const Toast = styled.div`
  position: fixed;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(20,24,31,0.92);
  color: #fff;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 15px;
  z-index: 1400;
  max-width: 320px;
  text-align: center;
  word-break: keep-all;
`;
