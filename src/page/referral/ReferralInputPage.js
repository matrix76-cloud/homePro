/* eslint-disable */
import React, { useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { applyReferralCode } from "../../service/ReferralService";
import { THEME } from "../../config/homeproConfig";

export default function ReferralInputPage() {
    const nav = useNavigate();
    const { userData } = useAuth();
    const uid = userData?.uid || "";

    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [resultMsg, setResultMsg] = useState("");
    const [isError, setIsError] = useState(false);

    const handleApply = async () => {
        if (!code.trim() || !uid || busy) return;
        setBusy(true);
        setResultMsg("");
        try {
            const res = await applyReferralCode(uid, code.trim());
            if (res.success) {
                setResultMsg(res.message);
                setIsError(false);
                // 1.5초 후 닉네임 설정으로 이동
                setTimeout(() => nav("/MobileSetNickname", { replace: true }), 1500);
            } else {
                setResultMsg(res.message);
                setIsError(true);
            }
        } catch (e) {
            setResultMsg("추천코드 적용 중 오류가 발생했습니다.");
            setIsError(true);
        } finally {
            setBusy(false);
        }
    };

    const handleSkip = () => {
        nav("/MobileSetNickname", { replace: true });
    };

    return (
        <Wrap>
            <Title>추천코드 입력</Title>
            <Desc>추천코드가 있으면 입력해주세요. 없으면 넘어가도 됩니다.</Desc>

            <Card>
                {/* 혜택 안내 */}
                <BenefitBox>
                    <BenefitTitle>추천코드 혜택</BenefitTitle>
                    <BenefitRow>
                        <BenefitIcon>🎁</BenefitIcon>
                        <BenefitText>
                            <strong>나</strong> — 가입 축하 <Point>+100P</Point>
                        </BenefitText>
                    </BenefitRow>
                    <BenefitRow>
                        <BenefitIcon>🎉</BenefitIcon>
                        <BenefitText>
                            <strong>추천인</strong> — 추천 보상 <Point>+100P</Point>
                        </BenefitText>
                    </BenefitRow>
                </BenefitBox>

                <Field>
                    <Label>추천코드</Label>
                    <Input
                        type="text"
                        placeholder="예: AB123456"
                        value={code}
                        onChange={(e) => {
                            setCode(e.target.value.toUpperCase());
                            setResultMsg("");
                        }}
                        disabled={busy}
                        maxLength={8}
                    />
                </Field>

                {resultMsg && (
                    <ResultPill $isError={isError}>{resultMsg}</ResultPill>
                )}

                <BtnRow>
                    <PrimaryBtn onClick={handleApply} disabled={!code.trim() || busy}>
                        {busy ? "적용 중..." : "추천코드 적용"}
                    </PrimaryBtn>
                    <SkipBtn onClick={handleSkip} disabled={busy}>
                        넘어가기
                    </SkipBtn>
                </BtnRow>
            </Card>
        </Wrap>
    );
}

/* ===================== styles ===================== */

const Wrap = styled.div`
  min-height: 100vh;
  background: ${THEME.background};
  padding: 26px 20px;
  box-sizing: border-box;
`;

const Title = styled.div`
  font-size: 22px;
  font-weight: 400;
  letter-spacing: -0.04em;
  color: rgba(17, 24, 39, 0.92);
`;

const Desc = styled.div`
  margin-top: 6px;
  font-size: 13px;
  color: rgba(17, 24, 39, 0.55);
`;

const Card = styled.div`
  margin-top: 16px;
  max-width: 420px;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  box-shadow: ${THEME.cardShadow};
`;

const BenefitBox = styled.div`
  background: ${THEME.background};
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
`;

const BenefitTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.text};
  margin-bottom: 12px;
`;

const BenefitRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  &:last-child { margin-bottom: 0; }
`;

const BenefitIcon = styled.span`
  font-size: 20px;
`;

const BenefitText = styled.div`
  font-size: 14px;
  color: ${THEME.textSecondary};
  strong { color: ${THEME.text}; }
`;

const Point = styled.span`
  color: ${THEME.primary};
  font-weight: 600;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 14px;
  color: rgba(17, 24, 39, 0.92);
`;

const Input = styled.input`
  width: 100%;
  border: none;
  border-bottom: 1px solid rgba(15, 23, 42, 0.12);
  padding: 10px 0;
  font-size: 18px;
  font-weight: 500;
  letter-spacing: 2px;
  outline: none;
  background: transparent;
  box-sizing: border-box;
  &::placeholder { color: rgba(17, 24, 39, 0.38); font-weight: 400; letter-spacing: 0; }
  &:focus { border-bottom-color: ${THEME.primary}b3; }
`;

const ResultPill = styled.div`
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  background: ${({ $isError }) => $isError ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.12)"};
  color: ${({ $isError }) => $isError ? "#dc2626" : "#059669"};
`;

const BtnRow = styled.div`
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const BaseBtn = styled.button`
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
  border-radius: 10px;
  padding: 13px 14px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const PrimaryBtn = styled(BaseBtn)`
  border: none;
  background: ${THEME.primary};
  color: #fff;
`;

const SkipBtn = styled(BaseBtn)`
  border: 1px solid ${THEME.border};
  background: ${THEME.surface};
  color: ${THEME.textSecondary};
`;
