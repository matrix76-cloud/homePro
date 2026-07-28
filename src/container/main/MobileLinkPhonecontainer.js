/* eslint-disable */
import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { initUserDoc } from "../../service/UserProfileService";
import { getLastSocialProvider } from "../../service/AuthService";
import {
    toE164KR,
    requestPhoneCode,
    verifyPhoneCode,
    linkPhoneToAccount,
    phoneAuthErrorMessage,
} from "../../service/recoveryService";
import { UserContext } from "../../context/User";
import { THEME } from "../../config/homeproConfig";

const TEST_RANGE_START = "01062141000";
const TEST_RANGE_END = "01062142000";

const onlyDigits = (s = "") => (s || "").replace(/\D+/g, "");
const leftPad11 = (d = "") => String(d || "").padStart(11, "0");
const inTestRange = (rawDigits = "") => {
    const d = leftPad11(onlyDigits(rawDigits));
    return d >= TEST_RANGE_START && d <= TEST_RANGE_END;
};
const formatKRPhone = (raw) => {
    let d = onlyDigits(raw);
    if (d.startsWith("82")) d = "0" + d.slice(2);
    if (d.length >= 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
    if (d.length >= 10)
        return d.startsWith("02")
            ? `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}`
            : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 10)}`;
    if (d.length > 7) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
    if (d.length > 3) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return d;
};

export default function MobileLinkPhonecontainer() {
    const nav = useNavigate();
    const { dispatch } = useContext(UserContext);
    const { currentUser, refreshUser } = useAuth();

    const uid = currentUser?.uid || "";
    const [busy, setBusy] = useState(false);

    const [phone, setPhone] = useState("");
    const [codeInput, setCodeInput] = useState("");
    const [sentToE164, setSentToE164] = useState("");
    const [codeSent, setCodeSent] = useState(false);
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [verificationToken, setVerificationToken] = useState(""); // 서버 인증 완료 증표
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [otpBusy, setOtpBusy] = useState(false);

    const digits = useMemo(() => onlyDigits(phone), [phone]);

    useEffect(() => {
        if (!currentUser?.uid) {
            nav("/MobileLogin", { replace: true });
        }
    }, [currentUser, nav]);

    const resetOtpState = () => {
        setCodeInput("");
        setSentToE164("");
        setCodeSent(false);
        setPhoneVerified(false);
        setVerificationToken("");
        setSecondsLeft(0);
    };

    const handlePhoneChange = (v) => {
        const d = onlyDigits(v).slice(0, 11);
        setPhone(formatKRPhone(d));
        resetOtpState();
    };

    useEffect(() => {
        if (secondsLeft <= 0) return;
        const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [secondsLeft]);

    const canSendOtp = useMemo(() => {
        const d = onlyDigits(phone);
        return (d.length === 10 || d.length === 11) && !otpBusy && !busy && secondsLeft <= 0;
    }, [phone, otpBusy, busy, secondsLeft]);

    const canVerifyOtp = useMemo(() => {
        return codeSent && !phoneVerified && codeInput.trim().length === 6 && !otpBusy && !busy;
    }, [codeSent, phoneVerified, codeInput, otpBusy, busy]);

    // 인증번호 요청 — 코드 생성·발송은 서버가 한다
    const handleSendOtp = async () => {
        if (!canSendOtp) return;
        setOtpBusy(true);
        try {
            const e164 = toE164KR(phone);
            const res = await requestPhoneCode(e164);
            setSentToE164(e164);
            setCodeSent(true);
            setPhoneVerified(false);
            setVerificationToken("");
            setCodeInput("");
            setSecondsLeft(res?.resendAfterSec || 30);
            window.alert("인증번호를 전송했습니다. 문자 메시지를 확인해 주세요.");
        } catch (err) {
            window.alert(phoneAuthErrorMessage(err));
        } finally {
            setOtpBusy(false);
        }
    };

    // 인증번호 검증 — 대조도 서버가 한다. 성공 시 짧은 수명의 토큰을 받는다.
    const handleVerifyOtp = async () => {
        if (!canVerifyOtp) return;
        setOtpBusy(true);
        try {
            if (!sentToE164 || toE164KR(phone) !== sentToE164) {
                window.alert("인증번호를 다시 요청해주세요.");
                resetOtpState();
                return;
            }
            const res = await verifyPhoneCode(sentToE164, codeInput.trim());
            setVerificationToken(res?.verificationToken || "");
            setPhoneVerified(true);
            window.alert("전화번호 인증이 완료되었습니다.");
        } catch (err) {
            window.alert(phoneAuthErrorMessage(err));
        } finally {
            setOtpBusy(false);
        }
    };

    const handleComplete = async () => {
        if (!uid) return;

        // 인증을 통과해야만 진행. (이전엔 자릿수만 맞으면 통과해서
        //  남의 번호 입력만으로 그 계정에 붙는 경로가 있었다)
        if (!phoneVerified || !verificationToken) {
            window.alert("전화번호 인증을 먼저 완료해주세요.");
            return;
        }

        const phoneE164 = sentToE164 || toE164KR(phone);
        if (!phoneE164) return;

        if (busy) return;
        setBusy(true);
        try {
            const provider = getLastSocialProvider() || currentUser?.providerData?.[0]?.providerId || "";
            try {
                await initUserDoc({ uid, email: currentUser?.email || "", provider });
            } catch (e) { /* 이미 있으면 무시 */ }

            // 전화번호 연결 + 기존 계정 통합을 서버가 처리 (인증 토큰 검사 포함)
            const result = await linkPhoneToAccount({
                phone: phoneE164,
                verificationToken,
                provider: (provider || "").replace(".com", "").toLowerCase(),
            });

            const resolvedPrimaryUid = result?.primaryUid || uid;
            dispatch({ primaryUid: resolvedPrimaryUid });
            try { localStorage.setItem("__primaryUid", resolvedPrimaryUid); } catch (e) {}

            await refreshUser();
            if (result?.merged) {
                window.alert("같은 번호로 가입된 계정이 있어 하나로 연결했습니다.");
                nav("/MobileMain", { replace: true });
            } else {
                nav("/ReferralInput", { replace: true });
            }
        } catch (e) {
            console.error("[LinkPhone] 전화번호 연결 실패:", e?.code, e?.message, e);
            window.alert(phoneAuthErrorMessage(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Wrap>
            <Title>전화번호 등록</Title>
            <Desc>연락 받을 전화번호를 입력해주세요.</Desc>

            <Card>
                <Field>
                    <LabelRow>
                        <Label htmlFor="phone">전화번호</Label>
                        <RequiredMark>*</RequiredMark>
                    </LabelRow>

                    <InlineRow>
                        <Input
                            id="phone"
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel"
                            placeholder="010-1234-5678"
                            value={phone}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            disabled={busy || phoneVerified}
                        />
                        <SmallBtn type="button" onClick={handleSendOtp} disabled={!canSendOtp || phoneVerified}>
                            {otpBusy && !codeSent ? "전송중..."
                                : secondsLeft > 0 ? `재전송 (${secondsLeft}s)`
                                : codeSent ? "재전송" : "인증번호 전송"}
                        </SmallBtn>
                    </InlineRow>
                    <HelperText>본인 명의의 휴대폰 번호를 입력해주세요.</HelperText>
                </Field>

                {/* 인증번호 입력 — 서버가 발급하고 서버가 대조한다 */}
                {codeSent && !phoneVerified && (
                    <Field>
                        <LabelRow>
                            <Label htmlFor="otp">인증번호</Label>
                            <RequiredMark>*</RequiredMark>
                        </LabelRow>
                        <InlineRow>
                            <Input
                                id="otp"
                                type="tel"
                                inputMode="numeric"
                                placeholder="인증번호 6자리"
                                value={codeInput}
                                onChange={(e) => setCodeInput(onlyDigits(e.target.value).slice(0, 6))}
                                disabled={busy || otpBusy}
                            />
                            <SmallBtn type="button" onClick={handleVerifyOtp} disabled={!canVerifyOtp}>
                                {otpBusy ? "확인중..." : "확인"}
                            </SmallBtn>
                        </InlineRow>
                        <HelperText>문자로 받은 인증번호를 입력해주세요. (3분 이내)</HelperText>
                    </Field>
                )}

                {phoneVerified && (
                    <VerifiedPill>전화번호 인증이 완료되었습니다.</VerifiedPill>
                )}

                <BtnRow>
                    <PrimaryBtn type="button" onClick={handleComplete} disabled={busy || !phoneVerified}>
                        {busy ? "처리중..." : "확인 완료"}
                    </PrimaryBtn>

                    {/* (검수 7/28 제거) "나중에 하기" — RequirePhone 가드가 /MobileMain 진입을
                        다시 이 화면으로 돌려보내 아무 일도 안 하는 죽은 버튼이었음.
                        전화번호는 계정 통합 기준키라 건너뛰기 자체를 허용하지 않는다. */}
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

const Card = styled.div`
  margin-top: 16px;
  width: 100%;
  max-width: 420px;
  box-sizing: border-box;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  box-shadow: ${THEME.cardShadow};
`;

const Title = styled.div`
  font-size: 24px !important;
  font-weight: 400;
  letter-spacing: -0.04em;
  color: rgba(17, 24, 39, 0.92);
`;

const Desc = styled.div`
  margin-top: 6px;
  font-size: 15px !important;
  font-weight: 400;
  letter-spacing: -0.02em;
  color: rgba(17, 24, 39, 0.55);
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const LabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Label = styled.label`
  font-size: 16px !important;
  color: rgba(17, 24, 39, 0.92);
  font-weight: 400;
`;

const RequiredMark = styled.span`
  color: #ff4b4b;
  font-size: 16px !important;
  font-weight: 400;
`;

const Input = styled.input`
  width: 100%;
  border: none;
  border-bottom: 1px solid rgba(15, 23, 42, 0.12);
  padding: 10px 0;
  font-size: 18px !important;
  outline: none;
  background: transparent;
  box-sizing: border-box;

  &::placeholder { color: rgba(17, 24, 39, 0.38); }
  &:focus { border-bottom-color: ${THEME.primary}b3; }
`;

const InlineRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 10px;
`;

const SmallBtn = styled.button`
  border: 1px solid ${THEME.border};
  background: ${THEME.surface};
  border-radius: 10px;
  padding: 12px 12px;
  font-size: 16px !important;
  cursor: pointer;
  color: ${THEME.text};
  font-weight: 400;
  flex-shrink: 0;

  &:disabled { opacity: 0.6; cursor: not-allowed; }
  &:active { transform: translateY(1px); }
`;

const HelperText = styled.p`
  margin: 0;
  font-size: 15px !important;
  color: rgba(17, 24, 39, 0.48);
  font-weight: 400;
`;

const CodeBox = styled.div`
  margin-top: 10px;
  padding: 12px 14px;
  border: 1px dashed ${THEME.border};
  border-radius: 10px;
  background: ${THEME.background};
  font-size: 15px !important;
  color: rgba(17, 24, 39, 0.92);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

const CodeLabel = styled.div`
  color: rgba(17, 24, 39, 0.5);
  font-size: 14px !important;
  font-weight: 400;
`;

const CodeValue = styled.div`
  font-size: 17px !important;
  letter-spacing: 1px;
  font-weight: 400;
`;

const VerifiedPill = styled.div`
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  font-size: 15px !important;
  font-weight: 400;
`;

const WarnPill = styled.div`
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
  font-size: 15px !important;
  font-weight: 400;
`;

const BtnRow = styled.div`
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const BaseWideBtn = styled.button`
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
  border-radius: 10px;
  padding: 13px 14px;
  font-size: 18px !important;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:disabled { opacity: 0.6; cursor: not-allowed; }
  &:active { transform: translateY(1px); }
`;

const PrimaryBtn = styled(BaseWideBtn)`
  border: none;
  background: ${THEME.primary};
  color: #ffffff;
  font-weight: 400;
`;

const SecondaryBtn = styled(BaseWideBtn)`
  border: 1px solid ${THEME.border};
  background: ${THEME.surface};
  color: ${THEME.text};
  font-weight: 400;
`;
