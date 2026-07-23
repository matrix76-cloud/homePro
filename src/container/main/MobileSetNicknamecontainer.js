/* eslint-disable */
import React, { useEffect, useState, useRef, useCallback } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { watchAuthState, getLastSocialProvider } from "../../service/AuthService";
import { getUserProfileByUid, upsertUserProfile, isNicknameTaken } from "../../service/UserProfileService";
import { UserContext } from "../../context/User";
import { THEME } from "../../config/homeproConfig";
import localforage from "localforage";
import { getAuth } from "firebase/auth";

const ADJ2 = ["밝은", "맑은", "고운", "푸른", "작은", "예쁜", "귀한", "깊은", "넓은", "높은"];
const ADJ3 = ["따뜻한", "든든한", "다정한", "씩씩한", "행복한", "소중한", "건강한", "활발한", "정직한", "용감한"];
const NOUN1 = ["별", "달", "꽃", "곰", "해", "숲", "빛", "새"];
const NOUN2 = ["하늘", "나무", "구름", "토끼", "바다", "사슴", "매화", "참새"];
const NOUN3 = ["고양이", "다람쥐", "강아지"];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function generateNickname() {
    const pairs = [
        [ADJ2, NOUN1], [ADJ2, NOUN2], [ADJ2, NOUN3],
        [ADJ3, NOUN1], [ADJ3, NOUN2], [ADJ3, NOUN3],
    ];
    const [adjArr, nounArr] = pick(pairs);
    const adj = pick(adjArr);
    const noun = pick(nounArr);
    if (adj.length + noun.length <= 6) return adj + noun;
    return pick(ADJ2) + pick(NOUN1);
}

export default function MobileSetNicknamecontainer() {
    const nav = useNavigate();
    const { dispatch } = React.useContext(UserContext);

    const [uid, setUid] = useState("");
    const [nickname, setNickname] = useState("");
    const [nickStatus, setNickStatus] = useState(""); // "", "checking", "ok", "taken"
    const [referralInput, setReferralInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [generating, setGenerating] = useState(false);
    const triedNames = useRef(new Set());
    const [userType, setUserType] = useState("customer"); // "customer" | "business"
    const [companyName, setCompanyName] = useState("");
    const isBiz = userType === "business";

    // 가입 단계에서 넘어온 회원유형/업체명 반영 (소셜은 여기서 선택)
    useEffect(() => {
        try {
            const t = localStorage.getItem("homepro.signup.userType");
            if (t === "business" || t === "customer") setUserType(t);
            const c = localStorage.getItem("homepro.signup.companyName");
            if (c) setCompanyName(c);
        } catch (e) { }
    }, []);

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

    // 중복 체크가 포함된 자동 생성
    const generateUniqueNickname = useCallback(async () => {
        setGenerating(true);
        let attempts = 0;
        while (attempts < 20) {
            const candidate = generateNickname();
            if (triedNames.current.has(candidate)) { attempts++; continue; }
            triedNames.current.add(candidate);
            const taken = await isNicknameTaken(candidate);
            if (!taken) {
                setNickname(candidate);
                setNickStatus("ok");
                setGenerating(false);
                return;
            }
            attempts++;
        }
        // 20번 시도 후에도 못 찾으면 숫자 붙여서 생성
        const fallback = generateNickname().slice(0, 4) + Math.floor(Math.random() * 90 + 10);
        setNickname(fallback);
        setNickStatus("ok");
        setGenerating(false);
    }, []);

    useEffect(() => {
        if (!isBiz) generateUniqueNickname(); // 대화명 자동생성은 일반고객만
    }, [generateUniqueNickname, isBiz]);

    const handleGenerate = () => {
        generateUniqueNickname();
    };

    // 수동 입력 시 중복 체크 (디바운스)
    const checkTimer = useRef(null);
    const checkNickname = useCallback((val) => {
        if (checkTimer.current) clearTimeout(checkTimer.current);
        const trimmed = val.trim();
        if (!trimmed) { setNickStatus(""); return; }
        setNickStatus("checking");
        checkTimer.current = setTimeout(async () => {
            const taken = await isNicknameTaken(trimmed);
            setNickStatus(taken ? "taken" : "ok");
        }, 500);
    }, []);

    const handleChange = (e) => {
        const v = e.target.value;
        if ([...v].length > 6) return;
        setNickname(v);
        checkNickname(v);
    };

    const handleComplete = async () => {
        // 사업자회원=업체명 / 일반고객=대화명
        const displayValue = isBiz ? companyName.trim() : nickname.trim();
        if (!displayValue) {
            window.alert(isBiz ? "업체명을 입력해주세요." : "대화명을 입력해주세요.");
            return;
        }
        if (!uid) return;
        if (busy) return;

        setBusy(true);
        try {
            // 대화명(일반고객)만 중복 검사 — 업체명은 중복 허용
            if (!isBiz) {
                const taken = await isNicknameTaken(displayValue);
                if (taken) {
                    setNickStatus("taken");
                    window.alert("이미 사용 중인 대화명입니다. 다른 대화명을 입력해주세요.");
                    setBusy(false);
                    return;
                }
            }
            // targetUid가 있으면 이미 계정 연결된 상태, 없으면 현재 uid 사용
            const targetUid = localStorage.getItem("__targetUid") || uid;

            // provider 판별: 소셜 provider 또는 이메일
            const auth = getAuth();
            const curUser = auth.currentUser;
            const socialProvider = getLastSocialProvider();
            let provider = "email";
            if (socialProvider) {
                provider = socialProvider;
            } else if (curUser?.providerData?.[0]?.providerId === "google.com") {
                provider = "google";
            }

            // 사업자회원: 업체명을 상호/표시명으로. 일반고객: 대화명.
            const patch = isBiz
                ? { nickname: displayValue, name: displayValue, companyName: displayValue, userType: "business", role: "user" }
                : { nickname: displayValue, name: displayValue, userType: "customer", role: "user" };
            // provider가 아직 없을 때만 설정
            const existingProfile = await getUserProfileByUid(targetUid);
            if (!existingProfile?.provider) {
                patch.provider = provider;
            }

            // 하나의 문서만 저장 (계정 연결은 LinkPhone에서 처리)
            await upsertUserProfile(targetUid, patch);
            try { localStorage.removeItem("homepro.signup.userType"); localStorage.removeItem("homepro.signup.companyName"); } catch (e) { }

            const profile = await getUserProfileByUid(targetUid);
            const phoneE164 = profile?.phoneE164 || "";

            if (phoneE164) {
                await localforage.setItem("user_phone", phoneE164);
            }

            dispatch({
                USERS_ID: targetUid,
                USERINFO: { nickname: displayValue, phone: phoneE164 },
            });

            // 추천인 코드 적용 (선택사항 — 실패해도 진행)
            if (referralInput.trim()) {
                try {
                    const { applyReferralCode } = await import("../../service/ReferralService");
                    await applyReferralCode(targetUid, referralInput.trim());
                } catch (e) {
                    console.warn("추천인 코드 적용 실패:", e.message);
                }
            }

            // SplashPage로 돌려서 전화번호 등 나머지 분기 처리
            nav("/MobileSplash", { replace: true });
        } catch (e) {
            window.alert("저장에 실패했습니다. 다시 시도해주세요.");
        } finally {
            setBusy(false);
        }
    };

    const charCount = [...nickname].length;

    return (
        <Wrap>
            <Title>{isBiz ? "업체 정보 설정" : "대화명 설정"}</Title>
            <Desc>{isBiz ? "다른 사용자에게 보여질 업체명이에요" : "다른 사용자에게 보여질 이름이에요"}</Desc>

            <Card>
                <Field style={{ marginBottom: 16 }}>
                    <Label>회원유형</Label>
                    <TypeRow>
                        <TypeBtn type="button" $active={!isBiz} onClick={() => setUserType("customer")} disabled={busy}>일반고객</TypeBtn>
                        <TypeBtn type="button" $active={isBiz} onClick={() => setUserType("business")} disabled={busy}>사업자회원</TypeBtn>
                    </TypeRow>
                </Field>

                {isBiz ? (
                    <Field>
                        <LabelRow>
                            <Label>업체명</Label>
                            <RequiredMark>*</RequiredMark>
                        </LabelRow>
                        <Input
                            type="text"
                            placeholder="사업자등록증 상호명"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            disabled={busy}
                        />
                        <HelperText>사업자(홈프로) 회원의 표시 업체명입니다</HelperText>
                        {companyName.trim() && (
                            <Preview>미리보기: <strong>{companyName.trim()}</strong></Preview>
                        )}
                    </Field>
                ) : (
                <Field>
                    <LabelRow>
                        <Label>대화명</Label>
                        <RequiredMark>*</RequiredMark>
                    </LabelRow>

                    <InlineRow>
                        <InputWrap>
                            <Input
                                type="text"
                                placeholder="대화명을 입력하세요"
                                value={nickname}
                                onChange={handleChange}
                                disabled={busy}
                                maxLength={6}
                            />
                            <CharCount $over={charCount > 5}>{charCount}/6</CharCount>
                        </InputWrap>

                        <SmallBtn type="button" onClick={handleGenerate} disabled={busy || generating}>
                            {generating ? "생성중..." : "자동 생성"}
                        </SmallBtn>
                    </InlineRow>

                    <HelperText>한글, 영문, 숫자 조합 최대 6자</HelperText>

                    {nickStatus === "checking" && (
                        <NickMsg $color={THEME.muted}>중복 확인 중...</NickMsg>
                    )}
                    {nickStatus === "taken" && (
                        <NickMsg $color="#ef4444">이미 사용 중인 대화명입니다</NickMsg>
                    )}
                    {nickStatus === "ok" && nickname.trim() && (
                        <NickMsg $color={THEME.success || "#16a34a"}>사용 가능한 대화명입니다</NickMsg>
                    )}

                    {nickname.trim() && (
                        <Preview>
                            미리보기: <strong>{nickname.trim()}</strong>
                        </Preview>
                    )}
                </Field>
                )}

                <Field style={{ marginTop: 16 }}>
                    <LabelRow>
                        <Label>추천인 코드 (선택)</Label>
                    </LabelRow>
                    <Input
                        type="text"
                        placeholder="추천인 코드가 있다면 입력하세요"
                        value={referralInput}
                        onChange={(e) => setReferralInput(e.target.value)}
                        disabled={busy}
                    />
                    <HelperText>추천인 코드 입력은 선택사항입니다</HelperText>
                </Field>

                <BtnRow>
                    <PrimaryBtn type="button" onClick={handleComplete} disabled={busy || (isBiz ? !companyName.trim() : (!nickname.trim() || nickStatus === "taken" || nickStatus === "checking"))}>
                        {busy ? "저장중..." : "완료"}
                    </PrimaryBtn>
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

const TypeRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 8px;
`;

const TypeBtn = styled.button`
  flex: 1;
  height: 46px;
  border-radius: 10px;
  font-size: 15px !important;
  font-weight: 400;
  cursor: pointer;
  font-family: inherit;
  border: 1px solid ${({ $active }) => ($active ? THEME.primary : THEME.border)};
  background: ${({ $active }) => ($active ? THEME.primary : THEME.surface)};
  color: ${({ $active }) => ($active ? "#fff" : "rgba(17,24,39,0.7)")};
  &:disabled { opacity: 0.6; cursor: not-allowed; }
  &:active { transform: translateY(1px); }
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

const InlineRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 10px;
`;

const InputWrap = styled.div`
  flex: 1;
  min-width: 0;
  position: relative;
`;

const Input = styled.input`
  width: 100%;
  border: none;
  border-bottom: 1px solid rgba(15, 23, 42, 0.12);
  padding: 10px 40px 10px 0;
  font-size: 16px !important;
  outline: none;
  background: transparent;
  box-sizing: border-box;

  &::placeholder { color: rgba(17, 24, 39, 0.38); }
  &:focus { border-bottom-color: ${THEME.primary}b3; }
`;

const CharCount = styled.span`
  position: absolute;
  right: 0;
  bottom: 12px;
  font-size: 12px !important;
  font-weight: 400;
  color: ${({ $over }) => ($over ? "#ef4444" : "rgba(17, 24, 39, 0.4)")};
`;

const SmallBtn = styled.button`
  border: 1px solid ${THEME.border};
  background: ${THEME.surface};
  border-radius: 10px;
  padding: 12px 12px;
  font-size: 14px !important;
  cursor: pointer;
  color: ${THEME.text};
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

const NickMsg = styled.div`
  font-size: 13px !important;
  font-weight: 400;
  color: ${({ $color }) => $color || "inherit"};
`;

const Preview = styled.div`
  margin-top: 4px;
  padding: 10px 14px;
  border-radius: 10px;
  background: ${THEME.background};
  border: 1px dashed ${THEME.border};
  font-size: 14px !important;
  color: rgba(17, 24, 39, 0.75);
  font-weight: 400;

  strong {
    color: ${THEME.primary};
    font-weight: 400;
  }
`;

const BtnRow = styled.div`
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const PrimaryBtn = styled.button`
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
  border-radius: 10px;
  padding: 13px 14px;
  font-size: 16px !important;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: ${THEME.primary};
  color: #ffffff;
  font-weight: 400;

  &:disabled { opacity: 0.6; cursor: not-allowed; }
  &:active { transform: translateY(1px); }
`;
