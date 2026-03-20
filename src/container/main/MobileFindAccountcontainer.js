/* eslint-disable */
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getPrimaryUidByPhone, getUserProfileByUid } from "../../service/UserProfileService";
import { sendPasswordResetEmailByAddress } from "../../service/AuthService";
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

const maskId = (email) => {
    if (!email) return "";
    const local = email.includes("@") ? email.split("@")[0] : email;
    if (local.length <= 1) return "*";
    return `${local[0]}${"*".repeat(Math.min(local.length - 1, 3))}`;
};

const providerLabel = (profile) => {
    const p = String(profile?.provider || "").toLowerCase();
    if (p === "google" || p.includes("google")) return "Google 로그인";
    if (p === "kakao" || p.includes("kakao")) return "카카오 로그인";
    if (p === "apple" || p.includes("apple")) return "Apple 로그인";
    return "이메일 가입";
};

const TAB_FIND_ID = "find_id";
const TAB_RESET_PW = "reset_pw";

export default function MobileFindAccountcontainer() {
    const nav = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const activeTab = searchParams.get("tab") === "reset_pw" ? TAB_RESET_PW : TAB_FIND_ID;

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

    const [resultProfile, setResultProfile] = useState(null);
    const [resultMessage, setResultMessage] = useState("");
    const [resultError, setResultError] = useState("");

    const digits = useMemo(() => onlyDigits(phone), [phone]);
    const isDev = useMemo(() => inTestRange(digits), [digits]);

    const resetAll = () => {
        setPhone("");
        setCodeInput("");
        setDevCode("");
        setSentOtp("");
        setSentToE164("");
        setCodeSent(false);
        setPhoneVerified(false);
        setSecondsLeft(0);
        setResultProfile(null);
        setResultMessage("");
        setResultError("");
    };

    const resetOtpState = () => {
        setCodeInput("");
        setDevCode("");
        setSentOtp("");
        setSentToE164("");
        setCodeSent(false);
        setPhoneVerified(false);
        setSecondsLeft(0);
        setResultProfile(null);
        setResultMessage("");
        setResultError("");
    };

    const handleTabChange = (tab) => {
        resetAll();
        setSearchParams({ tab });
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
            setResultProfile(null);
            setResultMessage("");
            setResultError("");

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

            setBusy(true);
            const phoneE164 = sentToE164 || toE164KR(phone);
            const primaryUid = await getPrimaryUidByPhone(phoneE164);

            if (!primaryUid) {
                setResultError("이 전화번호로 가입된 계정이 없습니다.");
                setBusy(false);
                return;
            }

            const profile = await getUserProfileByUid(primaryUid);
            if (!profile) {
                setResultError("계정 정보를 찾을 수 없습니다.");
                setBusy(false);
                return;
            }

            setResultProfile(profile);

            if (activeTab === TAB_FIND_ID) {
                setResultMessage("");
            } else {
                const prov = String(profile.provider || "").toLowerCase();
                const isEmailAccount = !prov || prov === "email" || prov === "link";
                const email = profile.email;

                if (isEmailAccount && email) {
                    const res = await sendPasswordResetEmailByAddress(email);
                    if (res.success) {
                        setResultMessage("비밀번호 재설정 링크를 이메일로 보냈습니다.");
                    } else {
                        setResultError(res.error_message || "재설정 이메일 발송에 실패했습니다.");
                    }
                } else {
                    setResultMessage(`이 계정은 ${providerLabel(profile)}으로 가입되었습니다.\n해당 소셜 로그인을 이용해주세요.`);
                }
            }
        } catch (e) {
            setResultError("계정 조회 중 문제가 발생했습니다.");
        } finally {
            setOtpBusy(false);
            setBusy(false);
        }
    };

    const showResult = phoneVerified && (resultProfile || resultError);

    return (
        <Wrap>
            <BackBtn onClick={() => nav(-1)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke={THEME.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </BackBtn>

            <TabRow>
                <Tab $active={activeTab === TAB_FIND_ID} onClick={() => handleTabChange(TAB_FIND_ID)}>
                    아이디 찾기
                </Tab>
                <Tab $active={activeTab === TAB_RESET_PW} onClick={() => handleTabChange(TAB_RESET_PW)}>
                    비밀번호 찾기
                </Tab>
            </TabRow>

            <PageTitle>
                {activeTab === TAB_FIND_ID ? "가입된 아이디를 찾습니다" : "비밀번호를 재설정합니다"}
            </PageTitle>
            <PageDesc>가입 시 등록한 전화번호로 인증해주세요</PageDesc>

            <Card>
                {!showResult ? (
                    <>
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
                                <HelperText>테스트 번호에서는 인증번호가 화면에 표시됩니다.</HelperText>
                            ) : (
                                <HelperText>가입 시 등록한 전화번호를 입력해주세요.</HelperText>
                            )}

                            {isDev && codeSent && devCode ? (
                                <CodeBox>
                                    <div>
                                        <CodeLabel>개발모드 코드</CodeLabel>
                                        <CodeValue>{devCode}</CodeValue>
                                    </div>
                                    <div style={{ color: THEME.muted, fontSize: 12 }}>{sentToE164}</div>
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
                                            {otpBusy || busy ? "확인중..." : "확인"}
                                        </SmallBtn>
                                    </InlineRow>

                                    {!isDev && !phoneVerified ? (
                                        <WarnPill>문자로 받은 인증번호를 입력해주세요.</WarnPill>
                                    ) : null}
                                </>
                            ) : null}
                        </Field>
                    </>
                ) : (
                    <ResultSection>
                        {resultError ? (
                            <>
                                <ErrorPill>{resultError}</ErrorPill>
                                <BtnRow>
                                    <SecondaryBtn type="button" onClick={resetAll}>다시 시도</SecondaryBtn>
                                </BtnRow>
                            </>
                        ) : resultProfile ? (
                            <>
                                {activeTab === TAB_FIND_ID ? (
                                    <>
                                        <ResultTitle>가입된 계정을 찾았습니다</ResultTitle>
                                        <ResultCard>
                                            <ResultLabel>아이디</ResultLabel>
                                            <ResultValue>{maskId(resultProfile.email)}</ResultValue>
                                            <ResultSub>{providerLabel(resultProfile)}</ResultSub>
                                        </ResultCard>
                                    </>
                                ) : (
                                    <>
                                        <ResultTitle>
                                            {resultMessage?.includes("소셜") || resultMessage?.includes("로그인을 이용")
                                                ? "소셜 계정 안내"
                                                : "재설정 이메일 발송 완료"}
                                        </ResultTitle>
                                        <ResultCard>
                                            <ResultMessage>{resultMessage}</ResultMessage>
                                            {resultProfile.email && !resultMessage?.includes("소셜") && (
                                                <ResultSub>{maskId(resultProfile.email)}</ResultSub>
                                            )}
                                        </ResultCard>
                                    </>
                                )}

                                <BtnRow>
                                    <PrimaryBtn type="button" onClick={() => nav("/MobileLogin", { replace: true })}>
                                        로그인하러 가기
                                    </PrimaryBtn>
                                    <SecondaryBtn type="button" onClick={resetAll}>다시 찾기</SecondaryBtn>
                                </BtnRow>
                            </>
                        ) : null}
                    </ResultSection>
                )}
            </Card>
        </Wrap>
    );
}

/* ===================== styles ===================== */

const Wrap = styled.div`
  min-height: 100vh;
  background: ${THEME.background};
  padding: 16px 20px 40px;
  box-sizing: border-box;
`;

const BackBtn = styled.button`
  background: none;
  border: none;
  padding: 8px 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  &:active { opacity: 0.6; }
`;

const TabRow = styled.div`
  display: flex;
  gap: 0;
  margin-top: 12px;
  border-bottom: 1px solid ${THEME.border};
`;

const Tab = styled.button`
  flex: 1;
  padding: 14px 0;
  border: none;
  background: none;
  font-size: 15px;
  font-weight: 400;
  color: ${({ $active }) => ($active ? THEME.primary : THEME.muted)};
  border-bottom: 2px solid ${({ $active }) => ($active ? THEME.primary : "transparent")};
  cursor: pointer;
  font-family: inherit;
  &:active { opacity: 0.7; }
`;

const PageTitle = styled.div`
  font-size: 20px;
  font-weight: 400;
  color: ${THEME.text};
  margin-top: 24px;
  letter-spacing: -0.03em;
`;

const PageDesc = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 6px;
`;

const Card = styled.div`
  margin-top: 24px;
  width: 100%;
  max-width: 420px;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const LabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Label = styled.label`
  font-size: 14px;
  color: ${THEME.text};
  font-weight: 400;
`;

const RequiredMark = styled.span`
  color: ${THEME.danger};
  font-size: 14px;
  font-weight: 400;
`;

const Input = styled.input`
  width: 100%;
  height: 50px;
  padding: 0 16px;
  border-radius: 10px;
  border: 1.5px solid ${THEME.border};
  background: ${THEME.surface};
  color: ${THEME.text};
  font-size: 15px;
  font-weight: 400;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
  &::placeholder { color: ${THEME.muted}; }
  &:focus { border-color: ${THEME.primary}; }
  &:disabled { opacity: 0.6; }
`;

const InlineRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 10px;
`;

const SmallBtn = styled.button`
  height: 50px;
  border: 1.5px solid ${THEME.border};
  background: ${THEME.surface};
  border-radius: 10px;
  padding: 0 14px;
  font-size: 14px;
  cursor: pointer;
  color: ${THEME.text};
  font-weight: 400;
  flex-shrink: 0;
  white-space: nowrap;
  font-family: inherit;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:active { transform: translateY(1px); }
`;

const HelperText = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${THEME.muted};
  font-weight: 400;
`;

const CodeBox = styled.div`
  margin-top: 4px;
  padding: 12px 14px;
  border: 1.5px dashed ${THEME.border};
  border-radius: 10px;
  background: ${THEME.surface};
  font-size: 13px;
  color: ${THEME.text};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

const CodeLabel = styled.div`
  color: ${THEME.muted};
  font-size: 12px;
  font-weight: 400;
`;

const CodeValue = styled.div`
  font-size: 15px;
  letter-spacing: 1px;
  font-weight: 400;
`;

const WarnPill = styled.div`
  margin-top: 4px;
  display: inline-flex;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.1);
  color: #B45309;
  font-size: 13px;
  font-weight: 400;
`;

const ErrorPill = styled.div`
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.08);
  color: ${THEME.danger};
  font-size: 14px;
  font-weight: 400;
  text-align: center;
`;

const ResultSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ResultTitle = styled.div`
  font-size: 17px;
  font-weight: 400;
  color: ${THEME.text};
  letter-spacing: -0.02em;
`;

const ResultCard = styled.div`
  padding: 20px;
  border-radius: 16px;
  background: ${THEME.surface};
  box-shadow: ${THEME.cardShadow};
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ResultLabel = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ResultValue = styled.div`
  font-size: 18px;
  font-weight: 400;
  color: ${THEME.text};
  letter-spacing: -0.02em;
`;

const ResultSub = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const ResultMessage = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  line-height: 1.6;
  white-space: pre-line;
`;

const BtnRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
`;

const BaseBtn = styled.button`
  width: 100%;
  height: 50px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 400;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: -0.02em;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:active { transform: translateY(1px); }
`;

const PrimaryBtn = styled(BaseBtn)`
  border: none;
  background: ${THEME.primary};
  color: #ffffff;
`;

const SecondaryBtn = styled(BaseBtn)`
  border: 1.5px solid ${THEME.border};
  background: ${THEME.surface};
  color: ${THEME.text};
`;
