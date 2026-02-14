/* eslint-disable */
import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { watchAuthState } from "../../service/AuthService";
import { linkPhoneToUid } from "../../service/UserProfileService";
import { UserContext } from "../../context/User";
import { THEME } from "../../config/homeproConfig";

const SMS_CF_URL = "https://asia-northeast3-homepro-43f7f.cloudfunctions.net/api/AuthCodeSend";
const SMS_LABEL = "홈프로";

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
const toE164KR = (raw) => {
    const d = onlyDigits(raw);
    if (!d) return "";
    const local = d.startsWith("0") ? d.slice(1) : d;
    return `+82${local}`;
};
const genOtp = () => String(Math.floor(100000 + Math.random() * 900000));

export default function MobileLinkPhonecontainer() {
    const nav = useNavigate();
    const { dispatch } = useContext(UserContext);

    const [uid, setUid] = useState("");
    const [busy, setBusy] = useState(false);

    const [phone, setPhone] = useState("");
    const [codeInput, setCodeInput] = useState("");
    const [devCode, setDevCode] = useState("");
    const [sentOtp, setSentOtp] = useState("");
    const [sentToE164, setSentToE164] = useState("");
    const [codeSent, setCodeSent] = useState(false);
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [otpBusy, setOtpBusy] = useState(false);

    const digits = useMemo(() => onlyDigits(phone), [phone]);
    const isDev = useMemo(() => inTestRange(digits), [digits]);

    useEffect(() => {
        const unsub = watchAuthState((user) => {
            if (!user?.uid) {
                nav("/MobileLogin", { replace: true });
                return;
            }
            setUid(user.uid);
        });
        return () => { try { unsub?.(); } catch (e) { } };
    }, [nav]);

    const resetOtpState = () => {
        setCodeInput("");
        setDevCode("");
        setSentOtp("");
        setSentToE164("");
        setCodeSent(false);
        setPhoneVerified(false);
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

    const handleSendOtp = async () => {
        if (!canSendOtp) return;

        setOtpBusy(true);
        try {
            const otp = genOtp();
            const e164 = toE164KR(phone);

            setSentToE164(e164);
            setCodeSent(true);
            setPhoneVerified(false);
            setCodeInput("");
            setSecondsLeft(60);
            setSentOtp(otp);

            if (isDev) {
                setDevCode(otp);
                return;
            }

            setDevCode("");

            const resp = await fetch(SMS_CF_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone: onlyDigits(phone),
                    authcode: otp,
                    label: SMS_LABEL,
                }),
            });

            if (!resp.ok) {
                window.alert(`인증 코드를 전송하지 못했습니다. 발송 실패(${resp.status})`);
                resetOtpState();
                return;
            }

            window.alert("인증번호를 전송했습니다. 문자 메시지를 확인해 주세요.");
        } catch (e) {
            window.alert("코드 전송 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
            resetOtpState();
        } finally {
            setOtpBusy(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!canVerifyOtp) return;

        setOtpBusy(true);
        try {
            if (!sentToE164 || toE164KR(phone) !== sentToE164) {
                window.alert("인증번호를 다시 요청해주세요.");
                resetOtpState();
                return;
            }

            const expected = String(sentOtp || devCode || "").trim();
            const got = String(codeInput || "").trim();
            if (!expected || got !== expected) {
                window.alert("인증번호가 올바르지 않습니다.");
                return;
            }

            setPhoneVerified(true);
            window.alert("전화번호 인증이 완료되었습니다.");
        } finally {
            setOtpBusy(false);
        }
    };

    const handleComplete = async () => {
        if (!uid) return;
        if (!phoneVerified) return;

        const phoneE164 = sentToE164 || toE164KR(phone);
        if (!phoneE164) return;

        if (busy) return;
        setBusy(true);
        try {
            const result = await linkPhoneToUid({ uid, phoneE164, provider: "link" });
            const resolvedPrimaryUid = result?.primaryUid || uid;

            dispatch({ primaryUid: resolvedPrimaryUid });

            try { localStorage.setItem("__primaryUid", resolvedPrimaryUid); } catch (e) { }

            nav("/MobileSetNickname", { replace: true });
        } catch (e) {
            window.alert("전화번호 저장에 실패했습니다. 다시 시도해주세요.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Wrap>
            <Title>전화번호 인증</Title>
            <Desc>안전한 이용을 위해 최초 1회 인증이 필요합니다.</Desc>

            <Card>
                <Field>
                    <LabelRow>
                        <Label htmlFor="phone">전화번호</Label>
                        <RequiredMark>*</RequiredMark>
                    </LabelRow>

                    <InlineRow>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <Input
                                id="phone"
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel"
                                placeholder="010-1234-5678"
                                value={phone}
                                onChange={(e) => handlePhoneChange(e.target.value)}
                                disabled={busy || otpBusy}
                            />
                        </div>

                        <SmallBtn type="button" onClick={handleSendOtp} disabled={!canSendOtp}>
                            {secondsLeft > 0 ? `재전송 (${secondsLeft}s)` : otpBusy ? "전송중..." : "인증번호 전송"}
                        </SmallBtn>
                    </InlineRow>

                    {isDev ? (
                        <HelperText>테스트 번호(01062141000~01062142000)에서는 인증번호가 화면에 표시됩니다.</HelperText>
                    ) : (
                        <HelperText>실번호는 문자로 인증번호가 발송됩니다.</HelperText>
                    )}

                    {isDev && codeSent && devCode ? (
                        <CodeBox>
                            <div>
                                <CodeLabel>개발모드 코드</CodeLabel>
                                <CodeValue>{devCode}</CodeValue>
                            </div>
                            <div style={{ color: "#6b7280", fontSize: 12 }}>{sentToE164}</div>
                        </CodeBox>
                    ) : null}

                    {codeSent ? (
                        <>
                            <InlineRow style={{ marginTop: 12 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <Input
                                        id="otp"
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="인증번호 6자리"
                                        value={codeInput}
                                        onChange={(e) => setCodeInput(onlyDigits(e.target.value).slice(0, 6))}
                                        disabled={busy || otpBusy || phoneVerified}
                                    />
                                </div>
                                <SmallBtn type="button" onClick={handleVerifyOtp} disabled={!canVerifyOtp}>
                                    {otpBusy ? "확인중..." : "확인"}
                                </SmallBtn>
                            </InlineRow>

                            {phoneVerified ? <VerifiedPill>전화번호 인증 완료</VerifiedPill> : null}

                            {!isDev && !phoneVerified ? <WarnPill>문자로 받은 인증번호를 입력해주세요.</WarnPill> : null}
                        </>
                    ) : null}
                </Field>

                <BtnRow>
                    <PrimaryBtn type="button" onClick={handleComplete} disabled={!phoneVerified || busy || otpBusy}>
                        {busy ? "처리중..." : "확인 완료"}
                    </PrimaryBtn>

                    <SecondaryBtn
                        type="button"
                        onClick={() => nav("/MobileMain", { replace: true })}
                        disabled={busy || otpBusy}
                    >
                        나중에 하기
                    </SecondaryBtn>
                </BtnRow>
            </Card>
        </Wrap>
    );
}

/* ===================== styles ===================== */

const Wrap = styled.div`
  min-height: 100vh;
  background: #EFF6FF;
  padding: 26px 20px;
  box-sizing: border-box;
`;

const Card = styled.div`
  margin-top: 16px;
  width: 100%;
  max-width: 420px;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 18px;
  padding: 16px;
`;

const Title = styled.div`
  font-size: 22px !important;
  font-weight: 400;
  letter-spacing: -0.04em;
  color: rgba(17, 24, 39, 0.92);
`;

const Desc = styled.div`
  margin-top: 6px;
  font-size: 13px !important;
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
  font-size: 14px !important;
  color: rgba(17, 24, 39, 0.92);
  font-weight: 400;
`;

const RequiredMark = styled.span`
  color: #ff4b4b;
  font-size: 14px !important;
  font-weight: 400;
`;

const Input = styled.input`
  width: 100%;
  border: none;
  border-bottom: 1px solid rgba(15, 23, 42, 0.12);
  padding: 10px 0;
  font-size: 16px !important;
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
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.9);
  border-radius: 14px;
  padding: 12px 12px;
  font-size: 14px !important;
  cursor: pointer;
  color: rgba(17, 24, 39, 0.92);
  font-weight: 400;
  flex-shrink: 0;

  &:disabled { opacity: 0.6; cursor: not-allowed; }
  &:active { transform: translateY(1px); }
`;

const HelperText = styled.p`
  margin: 0;
  font-size: 13px !important;
  color: rgba(17, 24, 39, 0.48);
  font-weight: 400;
`;

const CodeBox = styled.div`
  margin-top: 10px;
  padding: 12px 14px;
  border: 1px dashed rgba(15, 23, 42, 0.22);
  border-radius: 14px;
  background: rgba(249, 250, 251, 0.9);
  font-size: 13px !important;
  color: rgba(17, 24, 39, 0.92);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

const CodeLabel = styled.div`
  color: rgba(17, 24, 39, 0.5);
  font-size: 12px !important;
  font-weight: 400;
`;

const CodeValue = styled.div`
  font-size: 15px !important;
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
  font-size: 13px !important;
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
  font-size: 13px !important;
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
  border-radius: 14px;
  padding: 13px 14px;
  font-size: 16px !important;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:disabled { opacity: 0.6; cursor: not-allowed; }
  &:active { transform: translateY(1px); }
`;

const PrimaryBtn = styled(BaseWideBtn)`
  border: none;
  background: ${THEME.primary}eb;
  color: #ffffff;
  font-weight: 400;
`;

const SecondaryBtn = styled(BaseWideBtn)`
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.92);
  color: rgba(17, 24, 39, 0.9);
  font-weight: 400;
`;
